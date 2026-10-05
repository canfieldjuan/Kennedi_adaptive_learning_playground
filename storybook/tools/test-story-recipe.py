#!/usr/bin/env python3
"""Run story-recipe.py's commands against a copy of the storybook and a fake ComfyUI.

Each case runs the real command line (--storybook points it at the copy), so nothing here touches the real
art. ComfyUI is the external boundary and the only thing faked: no GPU, no models.

  python3 storybook/tools/test-story-recipe.py
"""
import hashlib
import http.server
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from urllib.parse import parse_qs

from PIL import Image
from PIL.PngImagePlugin import PngInfo

STORYBOOK = Path(__file__).resolve().parents[1]
TOOL = STORYBOOK / "tools/story-recipe.py"
DRAFTS, LOCKED = "design-source/characters/drafts", "design-source/characters/locked"
STORY = "pippa-and-the-whispering-moss"
PAGE_DRAFTS, PAGE_LOCKED = f"design-source/pages/{STORY}/drafts", f"design-source/pages/{STORY}/locked"
EDIT_MODEL = "qwen-image-edit-2511-Q4_K_S.gguf"
MODEL_FILES = {"UnetLoaderGGUF": ("unet_name", ["qwen-image-Q8_0.gguf", EDIT_MODEL]),
               "CLIPLoader": ("clip_name", ["qwen_2.5_vl_7b_fp8_scaled.safetensors"]),
               "VAELoader": ("vae_name", ["qwen_image_vae.safetensors"])}
# Every node the sheet and page graphs use, as a ComfyUI with ComfyUI-GGUF has them.
NODES = {"UnetLoaderGGUF", "CLIPLoader", "VAELoader", "ModelSamplingAuraFlow", "CLIPTextEncode", "EmptySD3LatentImage",
         "KSampler", "VAEDecode", "SaveImage", "CFGNorm", "TextEncodeQwenImageEditPlus",
         "FluxKontextMultiReferenceLatentMethod", "LoadImage"}
results = []


def check(label, ok, detail=""):
    results.append(bool(ok))
    detail = " | ".join(str(detail).splitlines())    # one line, so a tool's FAIL output can't pass for ours
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f": {detail[:180]}" if detail else ""))


def form_fields(content_type, body):
    """{field: (filename, bytes)} from a multipart/form-data body."""
    boundary = content_type.split("boundary=", 1)[1].encode()
    fields = {}
    for part in body.split(b"--" + boundary)[1:-1]:
        head, _, data = part[2:].partition(b"\r\n\r\n")
        name = re.search(rb'; name="([^"]*)"', head).group(1).decode()
        filename = re.search(rb'; filename="([^"]*)"', head)
        fields[name] = (filename.group(1).decode() if filename else None, data[:-2])
    return fields


class FakeComfy:
    """ComfyUI's HTTP API, as much of it as the tool uses: it lists the allowlisted models and its nodes, keeps
    uploaded images, queues a graph, "renders" an image of the requested size from the graph and the images it
    loads, and embeds the graph as ComfyUI does. rename_uploads stores uploads under another name, as ComfyUI
    does without overwrite; die_after=N drops the connection while the (N+1)th render is polled, as a ComfyUI that
    stops mid-set does; version is what /system_stats reports (None: no version); bad_history and bad_view map a
    render's index to the broken reply its /history poll or /view download gets instead (a job id string serves
    that job's image; a function gets the real image and returns what is served); upgrade_after=N reports
    another version once more than N renders have been queued, as a ComfyUI restarted on a new build does; stats
    replaces the whole /system_stats reply."""

    def __init__(self, models=MODEL_FILES, nodes=NODES, rename_uploads=False, die_after=None, version="fake",
                 bad_history=None, bad_view=None, upgrade_after=None, stats=None):
        self.images, self.uploads, fake = {}, {}, self

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def reply(self, body, kind="application/json"):
                body = json.dumps(body).encode() if kind == "application/json" else body
                self.send_response(200)
                self.send_header("Content-Type", kind)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                if self.path == "/upload/image":
                    fields = form_fields(self.headers["Content-Type"], body)
                    name, data = fields["image"]
                    if fields["overwrite"][1] != b"true" or fields["type"][1] != b"input":
                        self.send_error(400)
                        return
                    name = f"{name[:-4]} (1).png" if rename_uploads else name
                    fake.uploads[name] = data
                    return self.reply({"name": name, "subfolder": "", "type": "input"})
                graph = json.loads(body)["prompt"]
                prompt_id = f"job{len(fake.images)}"
                fake.images[prompt_id] = fake.render(graph, fake.uploads)
                self.reply({"prompt_id": prompt_id})

            def do_GET(self):
                path, _, query = self.path.partition("?")
                if path.startswith("/history/"):
                    pid = path.rsplit("/", 1)[1]
                    if die_after is not None and int(pid[3:]) >= die_after:
                        self.close_connection = True        # no reply at all: the client sees the server go away
                        return
                    if int(pid[3:]) in (bad_history or {}):
                        return self.reply(bad_history[int(pid[3:])], "application/json; charset=utf-8")  # raw bytes
                    return self.reply({pid: {"status": {"status_str": "success"}, "outputs": {
                        "10": {"images": [{"filename": f"{pid}.png", "subfolder": "", "type": "output"}]}}}})
                if path == "/view":
                    pid = parse_qs(query)["filename"][0][:-4]
                    served = (bad_view or {}).get(int(pid[3:]), fake.images[pid])
                    served = fake.images[served] if isinstance(served, str) else served
                    return self.reply(served(fake.images[pid]) if callable(served) else served, "image/png")
                if path == "/system_stats":
                    if stats is not None:
                        return self.reply(stats)
                    upgraded = upgrade_after is not None and len(fake.images) > upgrade_after
                    return self.reply({"system": {"comfyui_version": f"{version}-new" if upgraded else version}})
                if path.startswith("/object_info/"):
                    node = path.rsplit("/", 1)[1]
                    if node not in nodes:
                        return self.reply({})       # what ComfyUI answers for a node it doesn't have
                    field, names = models.get(node, (None, []))
                    required = {field: [[*names, "other.safetensors"]]} if field else {}
                    return self.reply({node: {"input": {"required": required}}})
                self.send_error(404)

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    @staticmethod
    def render(graph, uploads=None):
        nodes = {n["class_type"]: n["inputs"] for n in graph.values()}
        latent = nodes["EmptySD3LatentImage"]
        loaded = b"".join((uploads or {}).get(n["inputs"]["image"], b"missing") for n in graph.values()
                          if n["class_type"] == "LoadImage")
        digest = hashlib.sha256(json.dumps(graph, sort_keys=True).encode() + loaded).digest()
        image = Image.new("RGB", (latent["width"], latent["height"]), (250, 244, 230))
        image.paste((digest[0], digest[1], digest[2]), (200, 200, 600, 600))
        meta = PngInfo()
        meta.add_text("prompt", json.dumps(graph))
        out = io.BytesIO()
        image.save(out, "PNG", pnginfo=meta)
        return out.getvalue()

    def close(self):
        self.server.shutdown()


def storybook_copy(root):
    (root / "tools").mkdir(parents=True)
    shutil.copy(TOOL, root / "tools")
    shutil.copytree(STORYBOOK / "canon", root / "canon")
    shutil.copytree(STORYBOOK / "stories", root / "stories")
    return root        # no design-source/: like the real tree, the tool makes it on first use


def run(root, *args):
    done = subprocess.run([sys.executable, "-B", str(root / "tools/story-recipe.py"), "--storybook", str(root),
                           *map(str, args)], capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


def locked_state(root):
    folder = root / LOCKED
    return {p.name: p.read_bytes() for p in folder.iterdir()} if folder.is_dir() else {}


def drawn(root, name="pippa", seed=72):
    """Render name's candidates and lock one; the state most cases start from."""
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "character", name)
        assert not code, out
        code, out = run(root, "lock", name, "--seed", seed)
        assert not code, out
    finally:
        comfy.close()


def case_fresh_storybook(root):
    """A storybook with no art yet, as it is in git, passes selftest without writing anything."""
    code, out = run(root, "selftest")
    check("selftest passes on a storybook with no design-source yet", not code and "0 character locks" in out,
          out.strip()[-160:])
    check("and leaves it without one", not (root / "design-source").exists())


def case_character_lock_selftest(root):
    """A character sheet renders, locks and checks out, end to end."""
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "character", "Pippa")
        drafts = sorted(p.name for p in (root / DRAFTS).iterdir())
        check("character renders four candidates, a contact sheet and a recipe", not code and drafts == [
            "pippa-candidate-61.png", "pippa-candidate-72.png", "pippa-candidate-83.png", "pippa-candidate-94.png",
            "pippa-contact-sheet.png", "pippa-recipe.json"], f"{out.strip()[-120:]} {drafts}")
        recipe = json.loads((root / DRAFTS / "pippa-recipe.json").read_text())
        check("the recipe records Pippa's canon and only apache-2.0 models",
              recipe["canon"]["species"] == "dormouse" and {m["license"] for m in recipe["models"]} == {"apache-2.0"})
        check("a new sheet is template v2: upright on two hind legs, never naming the moon",
              recipe["template_version"] == "v2" and "standing upright on two hind legs" in recipe["prompt"]
              and "moon" not in recipe["prompt"], recipe["prompt"])
        for name in ("bramble", "barnaby"):
            run(root, "--server", comfy.url, "character", name)
        prompts = [json.loads((root / DRAFTS / f"{n}-recipe.json").read_text())["prompt"]
                   for n in ("pippa", "bramble", "barnaby")]
        check("every character's sheet prompt stands it upright and never names the moon",
              all("standing upright on two hind legs" in p and "moon" not in p for p in prompts), prompts)
        check("a character recipe names exactly the three base-model files, never the edit model",
              [(m["role"], m["file"]) for m in recipe["models"]] == [
                  ("unet", "qwen-image-Q8_0.gguf"), ("clip", "qwen_2.5_vl_7b_fp8_scaled.safetensors"),
                  ("vae", "qwen_image_vae.safetensors")])
        code, out = run(root, "lock", "pippa", "--seed", 72)
        check("lock writes pippa.png and its recipe", not code and sorted(locked_state(root)) == [
            "pippa.png", "pippa.recipe.json"], out.strip()[-160:])
        code, out = run(root, "selftest")
        check("and selftest passes", not code, out.strip()[-160:])
    finally:
        comfy.close()


def case_refusals(root):
    """Each refusal exits before writing anything."""
    code, out = run(root, "--server", "http://127.0.0.1:9", "character", "gruffalo")
    check("an unknown character is refused", code and "is not a character" in out, out.strip())
    code, out = run(root, "--server", "http://127.0.0.1:9", "character", "pippa")
    check("ComfyUI unreachable is refused, nothing written",
          code and "unreachable" in out and not (root / DRAFTS).exists(), out.strip()[-160:])
    comfy = FakeComfy(models={**MODEL_FILES, "CLIPLoader": ("clip_name", ["clip_l.safetensors"])})
    try:
        code, out = run(root, "--server", comfy.url, "character", "pippa")
        check("a model ComfyUI can't see under its allowlisted name is refused before rendering",
              code and "can't see qwen_2.5_vl_7b_fp8_scaled" in out and not comfy.images, out.strip()[-160:])
    finally:
        comfy.close()
    drawn(root)
    before = locked_state(root)
    code, out = run(root, "lock", "pippa", "--seed", 50)
    check("a seed that wasn't rendered is refused", code and "not one of the rendered" in out, out.strip())
    code, out = run(root, "lock", "pippa", "--seed", 83)
    check("replacing a lock without --force is refused", code and "already locked" in out, out.strip())
    check("and those refusals changed nothing", locked_state(root) == before)
    code, out = run(root, "lock", "pippa", "--seed", 83, "--force")
    code2, out2 = run(root, "selftest")
    check("with --force the lock is replaced and checks out", not code and not code2, (out + out2).strip()[-160:])


def case_candidate_is_not_its_recipe(root):
    """lock validates the staged copy, so another seed's render under this seed's name is refused."""
    comfy = FakeComfy()
    try:
        run(root, "--server", comfy.url, "character", "bramble")
    finally:
        comfy.close()
    shutil.copy(root / DRAFTS / "bramble-candidate-83.png", root / DRAFTS / "bramble-candidate-61.png")
    code, out = run(root, "lock", "bramble", "--seed", 61)
    check("locking another seed's render under this seed's name is refused",
          code and "is not the bytes `character` rendered" in out and not locked_state(root), out.strip()[-160:])
    # Pixels retouched after rendering, with the original prompt chunk kept, look like a render but aren't one.
    candidate = root / DRAFTS / "bramble-candidate-72.png"
    image = Image.open(candidate)
    meta = PngInfo()
    meta.add_text("prompt", image.info["prompt"])
    retouched = image.convert("RGB")
    retouched.putpixel((10, 10), (0, 0, 0))
    retouched.save(candidate, pnginfo=meta)
    code, out = run(root, "lock", "bramble", "--seed", 72)
    check("locking a candidate retouched after rendering (metadata kept) is refused",
          code and "is not the bytes `character` rendered" in out and not locked_state(root), out.strip()[-160:])


def case_licence_allowlist(root):
    """A lock is sell-safe by construction: a model off the allowlist fails selftest."""
    drawn(root)
    recipe_path = root / LOCKED / "pippa.recipe.json"
    recipe = json.loads(recipe_path.read_text())
    recipe["models"][0] = {"role": "unet", "file": "flux1-dev-Q8_0.gguf", "source": "city96/FLUX.1-dev-gguf",
                           "license": "flux-1-dev-non-commercial-license"}
    recipe_path.write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("a recipe naming a non-commercial model fails selftest",
          code and "flux1-dev-Q8_0.gguf" in out and "not on the licence allowlist" in out, out.strip()[-200:])


def case_canon_change(root):
    """A recipe records the canon it was drawn from, so changing that canon fails the lock until it's redone."""
    drawn(root, "barnaby")
    canon_path = root / "canon/moon-berry-forest.json"
    canon = json.loads(canon_path.read_text())
    next(c for c in canon["characters"] if c["name"] == "Barnaby")["appearance"]["base_colors"] = "grey fur"
    canon_path.write_text(json.dumps(canon))
    code, out = run(root, "selftest")
    check("changing a character's canon fails the lock drawn from it", code and "recorded canon" in out,
          out.strip()[-200:])


def case_lock_is_its_character(root):
    """A lock's files are named for its character, and its seed is one that was rendered."""
    drawn(root, "bramble")
    locked = root / LOCKED
    recipe = json.loads((locked / "bramble.recipe.json").read_text())
    recipe["files"] = {"pippa.png": recipe["files"]["bramble.png"]}
    (locked / "bramble.png").rename(locked / "pippa.png")
    (locked / "bramble.recipe.json").unlink()
    (locked / "pippa.recipe.json").write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("Bramble's sheet saved as pippa.png fails selftest", code and "under another character's name" in out,
          out.strip()[-200:])
    drawn(root, "barnaby")
    # A consistent seed-50 lock: a real render at seed 50 (graph, size and digest all agree), never offered as a
    # candidate. Only the rendered-seed rule can tell it apart.
    recipe_path, png = locked / "barnaby.recipe.json", locked / "barnaby.png"
    graph = json.loads(Image.open(png).info["prompt"])
    next(n for n in graph.values() if n["class_type"] == "KSampler")["inputs"]["seed"] = 50
    png.write_bytes(FakeComfy.render(graph))
    recipe = json.loads(recipe_path.read_text())
    recipe.update(chosen_seed=50, source=f"{DRAFTS}/barnaby-candidate-50.png",
                  files={"barnaby.png": hashlib.sha256(png.read_bytes()).hexdigest()})
    recipe_path.write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("a lock claiming seed 50, never rendered, fails selftest", code and "not one of the rendered seeds" in out,
          out.strip()[-200:])


def case_real_folders_only(root):
    """Drafts and locks are written only into the storybook's own folders, never through a symlink."""
    outside = root.parent / "elsewhere"
    outside.mkdir()
    (root / "design-source/characters").mkdir(parents=True)
    (root / LOCKED).symlink_to(outside, target_is_directory=True)
    (root / DRAFTS).symlink_to(outside, target_is_directory=True)
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "character", "pippa")
        check("character into a symlinked drafts folder is refused before rendering",
              code and "goes through a symlink" in out and not comfy.images, out.strip()[-160:])
    finally:
        comfy.close()
    code, out = run(root, "lock", "pippa", "--seed", 72)
    check("lock into a symlinked locked folder is refused", code and "goes through a symlink" in out, out.strip()[-160:])
    code, out = run(root, "selftest")
    check("and a symlinked locked folder fails selftest", code and "goes through a symlink" in out, out.strip()[-160:])
    check("nothing was written outside the storybook", not any(outside.iterdir()))


def case_locked_folder_holds_only_records(root):
    """Every file in the locked folder is a lock's, and its bytes are the ones it locked."""
    drawn(root)
    locked = root / LOCKED
    original = (locked / "pippa.png").read_bytes(), (locked / "pippa.recipe.json").read_text()
    meta = PngInfo()
    meta.add_text("prompt", "{")
    Image.open(locked / "pippa.png").save(locked / "pippa.png", pnginfo=meta)
    recipe = json.loads(original[1])
    recipe["files"] = {"pippa.png": hashlib.sha256((locked / "pippa.png").read_bytes()).hexdigest()}
    (locked / "pippa.recipe.json").write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("a lock whose embedded graph isn't JSON fails selftest with a problem, not a traceback",
          code and "embedded graph isn't a ComfyUI graph" in out and "Traceback" not in out, out.strip()[-200:])
    (locked / "pippa.png").write_bytes(original[0])
    (locked / "pippa.recipe.json").write_text(original[1])
    Image.open(locked / "pippa.png").convert("RGB").save(locked / "pippa.png")    # same pixels, graph dropped
    code, out = run(root, "selftest")
    check("a lock whose PNG was re-saved fails selftest", code and "changed since it was locked" in out,
          out.strip()[-200:])
    code, out = run(root, "lock", "pippa", "--seed", 72, "--force")
    code2, out2 = run(root, "selftest")
    check("re-locked, it checks out again", not code and not code2, (out + out2).strip()[-160:])
    (locked / "stray.png").write_bytes(b"stray")
    (locked / "alias.png").symlink_to("pippa.png")
    (locked / "nested").mkdir()
    code, out = run(root, "selftest")
    check("a stray file, a symlink and a folder each fail selftest",
          code and "stray.png: no recipe owns it" in out and "alias.png: is not a regular file" in out
          and "nested: is not a regular file" in out, out.strip()[-300:])


def sha(data):
    return hashlib.sha256(data).hexdigest()


def page_locked_state(root):
    folder = root / PAGE_LOCKED
    return {p.name: p.read_bytes() for p in folder.iterdir()} if folder.is_dir() else {}


def paged(root, number, seed=83, force=False):
    """Render a page of the story and lock one candidate."""
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, number)
        assert not code, out
        code, out = run(root, "lock-page", STORY, number, "--seed", seed, *(["--force"] if force else []))
        assert not code, out
    finally:
        comfy.close()


def case_page_lock_selftest(root):
    """A page renders from the cast's locked sheets, locks and checks out, end to end."""
    drawn(root, "pippa")
    drawn(root, "bramble", seed=61)
    sheets = {name: (root / LOCKED / f"{name}.png").read_bytes() for name in ("pippa", "bramble")}
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 4)
        drafts = sorted(p.name for p in (root / PAGE_DRAFTS).iterdir()) if (root / PAGE_DRAFTS).is_dir() else []
        check("page renders four candidates, a contact sheet and a recipe", not code and drafts == [
            "page-04-candidate-61.png", "page-04-candidate-72.png", "page-04-candidate-83.png",
            "page-04-candidate-94.png", "page-04-contact-sheet.png", "page-04-recipe.json"],
            f"{out.strip()[-160:]} {drafts}")
        check("and reports each seed's render time", re.search(r"rendered seed 61 in \d+s", out), out.strip()[-160:])
        check("ComfyUI received exactly the locked sheets' bytes, each named by its SHA-256",
              comfy.uploads == {f"storybook-{sha(data)}.png": data for data in sheets.values()}, sorted(comfy.uploads))
        graph = json.loads(Image.open(root / PAGE_DRAFTS / "page-04-candidate-61.png").info["prompt"])
        loads = {node_id: node["inputs"]["image"] for node_id, node in graph.items() if node["class_type"] == "LoadImage"}
        encoders = [node["inputs"] for node in graph.values() if node["class_type"] == "TextEncodeQwenImageEditPlus"]
        in_order = [f"storybook-{sha(sheets['pippa'])}.png", f"storybook-{sha(sheets['bramble'])}.png"]
        check("both encoders get Pippa's sheet as image1 and Bramble's as image2, and no image3",
              len(encoders) == 2 and all([loads[e["image1"][0]], loads[e["image2"][0]]] == in_order
                                         and "image3" not in e for e in encoders), encoders)
        unets = [node["inputs"]["unet_name"] for node in graph.values() if node["class_type"] == "UnetLoaderGGUF"]
        check("the page loads the apache-2.0 edit model, and only it", unets == [EDIT_MODEL], unets)
        recipe = json.loads((root / PAGE_DRAFTS / "page-04-recipe.json").read_text())
        check("the prompt names each cast member's picture and the page's light",
              "Pippa is the dormouse in picture 1 and Bramble is the badger in picture 2, each drawn exactly as in "
              "their picture. Bramble steps out from behind a willow" in recipe["prompt"]
              and "in gentle autumn, warm golden late-afternoon light through the trees" in recipe["prompt"],
              recipe["prompt"])
        check("a new page is template v2, with no 'moonlit' in its style",
              recipe["template_version"] == "v2" and "moonlit" not in recipe["prompt"], recipe["prompt"])
        check("the recipe records the references it drew on",
              recipe["references"] == [{"name": "pippa", "sha256": sha(sheets["pippa"])},
                                       {"name": "bramble", "sha256": sha(sheets["bramble"])}])
        code, out = run(root, "lock-page", STORY, 4, "--seed", 83)
        check("lock-page writes page-04.png and its recipe",
              not code and sorted(page_locked_state(root)) == ["page-04.png", "page-04.recipe.json"],
              out.strip()[-160:])
        code, out = run(root, "selftest")
        check("and selftest passes", not code and "1 page locks" in out, out.strip()[-200:])
    finally:
        comfy.close()


def case_page_refusals(root):
    """Each refusal exits before writing anything into the storybook, and before rendering."""
    unwritten = lambda: not (root / "design-source/pages").exists()
    for story, number, why in [("the-gruffalo", 1, "is not a story"), ("../canon/moon-berry-forest", 1, "is not a story"),
                               (STORY, 0, "there is no page 0"), (STORY, 8, "there is no page 8")]:
        code, out = run(root, "--server", "http://127.0.0.1:9", "page", story, number)
        check(f"page {story} {number} is refused", code and why in out and unwritten(), out.strip()[-160:])
    drawn(root, "pippa")
    code, out = run(root, "--server", "http://127.0.0.1:9", "page", STORY, 4)
    check("a page whose cast has no locked sheet (Bramble) is refused",
          code and "bramble has no locked sheet" in out and unwritten(), out.strip()[-160:])
    code, out = run(root, "--server", "http://127.0.0.1:9", "page", STORY, 1)
    check("ComfyUI unreachable is refused, nothing written", code and "unreachable" in out and unwritten(),
          out.strip()[-160:])
    for label, comfy, why in [
            ("a ComfyUI without CFGNorm", FakeComfy(nodes=NODES - {"CFGNorm"}), "has no CFGNorm node"),
            ("a ComfyUI that can't see the edit model",
             FakeComfy(models={**MODEL_FILES, "UnetLoaderGGUF": ("unet_name", ["qwen-image-Q8_0.gguf"])}),
             f"can't see {EDIT_MODEL}"),
            ("an upload ComfyUI stores under another name", FakeComfy(rename_uploads=True), "stored the reference")]:
        try:
            code, out = run(root, "--server", comfy.url, "page", STORY, 1)
            check(f"{label} is refused before rendering", code and why in out and not comfy.images and unwritten(),
                  out.strip()[-160:])
        finally:
            comfy.close()
    symlinked = root / PAGE_DRAFTS
    symlinked.parent.mkdir(parents=True)
    (root.parent / "elsewhere").mkdir()
    symlinked.symlink_to(root.parent / "elsewhere", target_is_directory=True)
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        check("page into a symlinked drafts folder is refused before uploading or rendering",
              code and "goes through a symlink" in out and not comfy.images and not comfy.uploads, out.strip()[-160:])
    finally:
        comfy.close()
    symlinked.unlink()
    paged(root, 1, seed=72)
    before = page_locked_state(root)
    code, out = run(root, "lock-page", STORY, 1, "--seed", 50)
    check("a seed that wasn't rendered is refused", code and "not one of the rendered" in out, out.strip())
    code, out = run(root, "lock-page", STORY, 1, "--seed", 83)
    check("replacing a page lock without --force is refused", code and "page-01 is already locked" in out, out.strip())
    candidate = root / PAGE_DRAFTS / "page-01-candidate-94.png"
    image = Image.open(candidate)
    meta = PngInfo()
    meta.add_text("prompt", image.info["prompt"])
    retouched = image.convert("RGB")
    retouched.putpixel((10, 10), (0, 0, 0))
    retouched.save(candidate, pnginfo=meta)
    code, out = run(root, "lock-page", STORY, 1, "--seed", 94, "--force")
    check("a candidate retouched after rendering is refused", code and "is not the bytes `page` rendered" in out,
          out.strip()[-160:])
    check("and those refusals changed nothing", page_locked_state(root) == before)
    code, out = run(root, "lock-page", STORY, 1, "--seed", 83, "--force")
    code2, out2 = run(root, "selftest")
    check("with --force the page lock is replaced and checks out", not code and not code2, (out + out2).strip()[-160:])


def case_relocked_sheet(root):
    """A page is drawn from its cast's sheets as they were: re-locking a character fails it until it's redrawn."""
    drawn(root, "pippa")
    paged(root, 1)
    code, out = run(root, "lock", "pippa", "--seed", 94, "--force")
    code2, out2 = run(root, "selftest")
    check("re-locking Pippa fails the page lock drawn from her old sheet",
          not code and code2 and "page-01.recipe.json: its recorded references" in out2, out2.strip()[-240:])
    paged(root, 1, force=True)
    code, out = run(root, "selftest")
    check("redrawn and re-locked from the new sheet, it checks out", not code, out.strip()[-160:])
    sheet = root / LOCKED / "pippa.png"
    Image.open(sheet).convert("RGB").save(sheet)          # same pixels, graph dropped: the lock no longer holds
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 2)
        check("a page whose cast's sheet fails its lock checks is refused before uploading",
              code and "fail their checks" in out and "pippa.recipe.json" in out and not comfy.uploads,
              out.strip()[-200:])
    finally:
        comfy.close()


def case_story_edits(root):
    """A story snapshot is the published text, and a page lock is its page entry as planned."""
    drawn(root, "pippa")
    paged(root, 1)
    story_path = root / "stories" / f"{STORY}.json"
    original = story_path.read_text()
    story = json.loads(original)
    story["text"] = story["text"].replace("golden light", "silver light", 1)
    story_path.write_text(json.dumps(story))
    code, out = run(root, "selftest")
    check("editing the story text fails selftest", code and "does not hash to its recorded content_sha256" in out
          and "which has no story" in out, out.strip()[-240:])
    code, out = run(root, "--server", "http://127.0.0.1:9", "page", STORY, 2)
    check("and page refuses to draw from it", code and "can't be drawn from" in out, out.strip()[-160:])
    story = json.loads(original)
    story["pages"][0]["scene"] = "Pippa naps on a fallen log"
    story_path.write_text(json.dumps(story))
    code, out = run(root, "selftest")
    check("editing a locked page's entry fails that page lock", code and "page-01.recipe.json: its recorded entry" in out,
          out.strip()[-240:])


def case_page_lock_is_its_page(root):
    """A page lock's files are named for its page: page 1's picture can't pass as page 2's."""
    drawn(root, "pippa")
    paged(root, 1)
    locked = root / PAGE_LOCKED
    recipe = json.loads((locked / "page-01.recipe.json").read_text())
    recipe["files"] = {"page-02.png": recipe["files"]["page-01.png"]}
    recipe["source"] = f"{PAGE_DRAFTS}/page-02-candidate-83.png"
    (locked / "page-01.png").rename(locked / "page-02.png")
    (locked / "page-01.recipe.json").unlink()
    (locked / "page-02.recipe.json").write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("page 1's lock saved as page-02 fails selftest", code and "page 1's recipe under" in out, out.strip()[-200:])


def case_plan_check(root):
    """A page plan has one page per paragraph, casts of one to three canon characters, and times from the set."""
    story_path = root / "stories" / f"{STORY}.json"
    original = json.loads(story_path.read_text())

    def longer(story):
        story["text"] += "\n\nOne more paragraph."
        story["source"]["content_sha256"] = sha(story["text"].encode())

    def page_one(key, value):
        return lambda story: story["pages"][0].__setitem__(key, value)

    for label, mutate, why in [
            ("a paragraph more than there are pages", longer, "plans 7 pages for 8 paragraphs"),
            ("a cast member who isn't in the canon", page_one("cast", ["Gruffalo"]), "names someone who is not"),
            ("a cast of four", page_one("cast", ["Pippa", "Bramble", "Barnaby", "Bramble"]), "one to three different"),
            ("a time outside the set", page_one("time", "midnight"), "'midnight' is not one of"),
            ("a page with no scene", page_one("scene", " "), "page 1 has no scene")]:
        story = json.loads(json.dumps(original))
        mutate(story)
        story_path.write_text(json.dumps(story))
        code, out = run(root, "selftest")
        code2, out2 = run(root, "--server", "http://127.0.0.1:9", "page", STORY, 1)
        check(f"{label} fails selftest, and page refuses it", code and why in out and code2 and why in out2,
              (out + out2).strip()[-200:])
    story_path.write_text(json.dumps(original))
    code, out = run(root, "selftest")
    check("the plan as committed passes", not code and "1 stories" in out, out.strip()[-160:])


def renders(comfy):
    return len(comfy.images)


def page_drafts(root):
    folder = root / PAGE_DRAFTS
    return sorted(p.name for p in folder.iterdir()) if folder.is_dir() else []


def case_lost_comfy_keeps_finished_seeds(root):
    """A ComfyUI lost mid-set keeps the seeds that finished, and a re-run renders only the rest."""
    drawn(root, "pippa")
    comfy = FakeComfy(die_after=2)
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
    finally:
        comfy.close()
    check("losing ComfyUI after two seeds exits non-zero with a plain message, not a traceback",
          code and "Traceback" not in out and "lost the render of seed 83" in out
          and "kept page-01-candidate-61.png, page-01-candidate-72.png" in out, out.strip()[-240:])
    recipe = json.loads((root / PAGE_DRAFTS / "page-01-recipe.json").read_text())
    check("the two finished candidates and a recipe recording exactly them are in drafts",
          page_drafts(root) == ["page-01-candidate-61.png", "page-01-candidate-72.png", "page-01-recipe.json"]
          and sorted(recipe["candidates"]) == ["page-01-candidate-61.png", "page-01-candidate-72.png"]
          and all(recipe["candidates"][n] == sha((root / PAGE_DRAFTS / n).read_bytes()) for n in recipe["candidates"]),
          page_drafts(root))
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        check("a re-run renders only seeds 83 and 94, and writes the contact sheet",
              not code and renders(comfy) == 2 and "kept page-01-candidate-61.png from an earlier run" in out
              and "nothing to render" not in out and "page-01-contact-sheet.png" in page_drafts(root),
              f"{renders(comfy)} renders: {out.strip()[-200:]}")
    finally:
        comfy.close()
    code, out = run(root, "lock-page", STORY, 1, "--seed", 61)
    code2, out2 = run(root, "selftest")
    check("a seed kept from the first run locks, and selftest passes", not code and not code2,
          (out + out2).strip()[-200:])


def case_resume_needs_the_same_recipe(root):
    """A set is resumed only for the same recipe and ComfyUI version; otherwise every seed renders fresh."""
    drawn(root, "pippa")
    comfy = FakeComfy()
    try:
        run(root, "--server", comfy.url, "page", STORY, 1)
    finally:
        comfy.close()
    before = {name: (root / PAGE_DRAFTS / name).read_bytes() for name in page_drafts(root)}
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        check("with all four seeds in for this recipe, a re-run renders nothing and says so",
              not code and renders(comfy) == 0 and "nothing to render" in out, out.strip()[-160:])
    finally:
        comfy.close()
    comfy = FakeComfy(die_after=0, version="other")     # another version means a fresh set, which dies at once
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
    finally:
        comfy.close()
    after = {name: (root / PAGE_DRAFTS / name).read_bytes() for name in page_drafts(root)}
    comfy = FakeComfy(version="other")
    try:
        code2, out2 = run(root, "--server", comfy.url, "page", STORY, 1)
        check("a run that fails before its first seed leaves the earlier set as it was; another ComfyUI version "
              "renders all four fresh", code and after == before and not code2 and renders(comfy) == 4
              and "nothing to render" not in out2,
              f"{out.strip()[-120:]} | {renders(comfy)} renders")
    finally:
        comfy.close()
    story_path = root / "stories" / f"{STORY}.json"
    story = json.loads(story_path.read_text())
    story["pages"][0]["scene"] = "Pippa hops along a fallen log, her paws empty"
    story_path.write_text(json.dumps(story))
    comfy = FakeComfy(die_after=1, version="other")     # the same version as the set on disk: only the plan changed
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        check("after a plan change the set starts fresh: one new seed, and the old contact sheet is gone",
              code and renders(comfy) >= 1 and "kept page-01-candidate-61.png in" in out
              and "page-01-contact-sheet.png" not in page_drafts(root), out.strip()[-200:])
    finally:
        comfy.close()
    code, out = run(root, "lock-page", STORY, 1, "--seed", 72)
    check("a stale candidate from the old set is refused by lock-page",
          code and "is not the bytes `page` rendered" in out, out.strip()[-160:])


def case_character_sets_resume_too(root):
    """character writes and resumes its sets through the same writer as page."""
    comfy = FakeComfy(die_after=1)
    try:
        code, out = run(root, "--server", comfy.url, "character", "barnaby")
    finally:
        comfy.close()
    comfy = FakeComfy()
    try:
        code2, out2 = run(root, "--server", comfy.url, "character", "barnaby")
        drafts = sorted(p.name for p in (root / DRAFTS).iterdir())
        check("a character set lost after one seed keeps it, and a re-run renders the other three",
              code and "kept barnaby-candidate-61.png" in out and not code2 and renders(comfy) == 3
              and "barnaby-contact-sheet.png" in drafts, f"{out.strip()[-120:]} | {out2.strip()[-120:]}")
    finally:
        comfy.close()
    comfy = FakeComfy(die_after=1)
    try:
        run(root, "--server", comfy.url, "character", "bramble")
    finally:
        comfy.close()
    kept = root / DRAFTS / "bramble-candidate-61.png"
    Image.open(kept).convert("RGB").save(kept)              # edited after rendering: no longer the recorded bytes
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "character", "bramble")
        check("a kept candidate edited since it rendered isn't kept: the re-run renders all four fresh",
              not code and renders(comfy) == 4 and "kept" not in out, out.strip()[-160:])
    finally:
        comfy.close()


def case_bad_replies_are_not_kept(root):
    """Resume needs a known ComfyUI version; a reply that isn't JSON is a lost server; a render must be a PNG of the
    recipe's size before it is recorded."""
    drawn(root, "pippa")
    comfy = FakeComfy(version=None)
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        check("a ComfyUI that doesn't report its version renders nothing: a set needs one known build",
              code and "doesn't report its version" in out and renders(comfy) == 0 and not page_drafts(root),
              f"{renders(comfy)} renders: {out.strip()[-160:]}")
    finally:
        comfy.close()
    for label, comfy in [("an empty version", FakeComfy(version="")),
                         ("a system field that isn't an object", FakeComfy(stats={"system": "broken"}))]:
        try:
            code, out = run(root, "--server", comfy.url, "page", STORY, 1)
            check(f"{label} in /system_stats is no known build: nothing renders, no traceback",
                  code and "doesn't report its version" in out and "Traceback" not in out and renders(comfy) == 0,
                  out.strip()[-160:])
        finally:
            comfy.close()
    comfy = FakeComfy(models={**MODEL_FILES, "CLIPLoader": (None, [])})
    try:
        code, out = run(root, "--server", comfy.url, "character", "bramble")
        check("an /object_info reply of an unknown shape exits plainly before rendering",
              code and "Traceback" not in out and "doesn't list clip_name" in out and renders(comfy) == 0,
              out.strip()[-160:])
    finally:
        comfy.close()
    comfy = FakeComfy(bad_history={1: b'{"job1": {"status": {}, "outputs": {"10": {"images": [{}]}}}}'})
    try:
        code, out = run(root, "--server", comfy.url, "character", "bramble")
        check("a /history entry without an image file exits plainly, keeping the seed that finished",
              code and "Traceback" not in out and "isn't a finished job with an image" in out
              and "kept bramble-candidate-61.png" in out, out.strip()[-200:])
    finally:
        comfy.close()
    for leftover in (root / DRAFTS).glob("bramble-*"):
        leftover.unlink()
    comfy = FakeComfy(upgrade_after=1)
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 2)
        recipe = json.loads((root / PAGE_DRAFTS / "page-02-recipe.json").read_text())
        check("a ComfyUI upgraded between seeds: the new build's seed isn't recorded, the run exits plainly",
              code and "changed from 'fake' to 'fake-new'" in out and "Traceback" not in out
              and sorted(recipe["candidates"]) == ["page-02-candidate-61.png"] and recipe["comfyui_version"] == "fake",
              out.strip()[-200:])
    finally:
        comfy.close()
    comfy = FakeComfy(bad_history={1: b"{"})
    try:
        code, out = run(root, "--server", comfy.url, "character", "bramble")
        check("a /history reply cut off mid-set exits plainly, keeping the seed that finished",
              code and "Traceback" not in out and "isn't JSON" in out and "kept bramble-candidate-61.png" in out,
              out.strip()[-200:])
    finally:
        comfy.close()
    small, jpeg = io.BytesIO(), io.BytesIO()
    Image.new("RGB", (64, 64), "white").save(small, "PNG")
    Image.new("RGB", (1328, 1328), "white").save(jpeg, "JPEG")
    cut = lambda real: real[:len(real) - 200]       # the real render, its embedded graph intact, the pixels cut off

    def garbled(real):                              # the real pixels, with an embedded graph that isn't JSON
        meta, out = PngInfo(), io.BytesIO()
        meta.add_text("prompt", "{")
        Image.open(io.BytesIO(real)).save(out, "PNG", pnginfo=meta)
        return out.getvalue()
    for label, broken in [("an HTTP 200 error page", b"<html>500 Internal Server Error</html>"), ("an empty body", b""),
                          ("a PNG of the wrong size", small.getvalue()), ("the real render cut off mid-file", cut),
                          ("a JPEG instead of SaveImage's PNG", jpeg.getvalue()),
                          ("seed 61's image served again for seed 72", "job0"),
                          ("the real render with a garbled embedded graph", garbled)]:
        drafts = root / DRAFTS
        for leftover in drafts.glob("barnaby-*"):
            leftover.unlink()
        comfy = FakeComfy(bad_view={1: broken})
        try:
            code, out = run(root, "--server", comfy.url, "character", "barnaby")
        finally:
            comfy.close()
        recipe = json.loads((drafts / "barnaby-recipe.json").read_text())
        comfy = FakeComfy()
        try:
            code2, out2 = run(root, "--server", comfy.url, "character", "barnaby")
            check(f"{label} from /view is never recorded, and a re-run renders that seed",
                  code and "Traceback" not in out and sorted(recipe["candidates"]) == ["barnaby-candidate-61.png"]
                  and not code2 and renders(comfy) == 3, f"{out.strip()[-140:]} | {renders(comfy)} renders")
        finally:
            comfy.close()


def main():
    cases = [case_fresh_storybook, case_character_lock_selftest, case_refusals, case_candidate_is_not_its_recipe, case_licence_allowlist,
             case_canon_change, case_lock_is_its_character, case_real_folders_only,
             case_locked_folder_holds_only_records, case_page_lock_selftest, case_page_refusals,
             case_relocked_sheet, case_story_edits, case_page_lock_is_its_page, case_plan_check,
             case_lost_comfy_keeps_finished_seeds, case_resume_needs_the_same_recipe, case_character_sets_resume_too,
             case_bad_replies_are_not_kept]
    for case in cases:
        print(f"\n== {case.__name__}: {case.__doc__}")
        with tempfile.TemporaryDirectory(prefix="story-test-") as tmp:
            case(storybook_copy(Path(tmp) / "storybook"))
    print(f"\n{sum(results)} of {len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
