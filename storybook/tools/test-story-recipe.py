#!/usr/bin/env python3
"""Run story-recipe.py's commands against a copy of the storybook and a fake ComfyUI.

Each case runs the real command line (--storybook points it at the copy), so nothing here touches the real
art. ComfyUI is the external boundary and the only thing faked: no GPU, no models.

  python3 storybook/tools/test-story-recipe.py
"""
import hashlib
import http.server
import importlib.util
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
CHILD_DRAFTS, CHILD_LOCKED = "design-source/children/drafts", "design-source/children/locked"
FRIEND_DRAFTS, FRIEND_LOCKED = "design-source/friends/drafts", "design-source/friends/locked"
BOOK = "meeting-pippa"
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
    uploaded images, queues a graph (sent keeps each one as it arrived), "renders" an image of the requested size
    from the graph and the images it loads, and embeds the graph as ComfyUI does, with each LoadImage's is_changed
    fingerprint. rename_uploads stores uploads under another name, as ComfyUI
    does without overwrite; die_after=N drops the connection while the (N+1)th render is polled, as a ComfyUI that
    stops mid-set does; version is what /system_stats reports (None: no version); bad_history and bad_view map a
    render's index to the broken reply its /history poll or /view download gets instead (a job id string serves
    that job's image; a function gets the real image and returns what is served); upgrade_after=N reports
    another version once more than N renders have been queued, as a ComfyUI restarted on a new build does; stats
    replaces the whole /system_stats reply."""

    def __init__(self, models=MODEL_FILES, nodes=NODES, rename_uploads=False, die_after=None, version="fake",
                 bad_history=None, bad_view=None, upgrade_after=None, stats=None):
        self.images, self.uploads, self.sent, fake = {}, {}, [], self

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
                fake.sent.append(graph)
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
        # As ComfyUI does before it runs a job: each LoadImage gets is_changed, the SHA-256 of the file it loads,
        # unless the job sent one; the job is embedded with it.
        embedded = json.loads(json.dumps(graph))
        for node in embedded.values():
            if node["class_type"] == "LoadImage" and "is_changed" not in node:
                node["is_changed"] = [sha((uploads or {}).get(node["inputs"]["image"], b"missing"))]
        meta = PngInfo()
        meta.add_text("prompt", json.dumps(embedded))
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
    shutil.copytree(STORYBOOK / "children", root / "children")
    shutil.copytree(STORYBOOK / "friends", root / "friends")
    shutil.copytree(STORYBOOK / "personal-stories", root / "personal-stories")
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
    meta = PngInfo()
    meta.add_text("prompt", json.dumps({"8": {"class_type": "KSampler", "inputs": "seed 72"}}))
    Image.open(locked / "pippa.png").save(locked / "pippa.png", pnginfo=meta)
    recipe["files"] = {"pippa.png": hashlib.sha256((locked / "pippa.png").read_bytes()).hexdigest()}
    (locked / "pippa.recipe.json").write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("a lock whose embedded KSampler inputs aren't an object fails selftest with a problem, not a traceback",
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


def case_reference_fingerprints(root):
    """A page PNG embeds the sent graph plus ComfyUI's fingerprint of each reference it loaded: the locked sheet's
    SHA-256 on its LoadImage. A missing, wrong or misplaced fingerprint is not this recipe's render."""
    drawn(root, "pippa")
    pippa = sha((root / LOCKED / "pippa.png").read_bytes())
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        sent = [node for graph in comfy.sent for node in graph.values()]
    finally:
        comfy.close()
    candidate = root / PAGE_DRAFTS / "page-01-candidate-61.png"
    graph = json.loads(Image.open(candidate).info["prompt"]) if candidate.is_file() else {}
    fingerprints = [node.get("is_changed") for node in graph.values() if node["class_type"] == "LoadImage"]
    check("a page whose PNG carries Pippa's sheet's SHA-256 on its LoadImage is recorded",
          not code and fingerprints == [[pippa]], f"{out.strip()[-160:]} {fingerprints}")
    check("and the graphs the tool sent carry no fingerprint of their own",
          len(comfy.sent) == 4 and sent and not any("is_changed" in node for node in sent))
    shutil.rmtree(root / PAGE_DRAFTS, ignore_errors=True)

    def refingerprinted(change):                    # the real pixels, with the embedded graph's fingerprints changed
        def serve(real):
            image = Image.open(io.BytesIO(real))
            graph = json.loads(image.info["prompt"])
            for node in graph.values():
                change(node)
            meta, out = PngInfo(), io.BytesIO()
            meta.add_text("prompt", json.dumps(graph))
            image.save(out, "PNG", pnginfo=meta)
            return out.getvalue()
        return serve
    loads = lambda node: node["class_type"] == "LoadImage"
    for label, change in [
            ("no fingerprint", lambda node: node.pop("is_changed", None)),
            ("another file's fingerprint", lambda node: loads(node) and node.update(is_changed=[sha(b"another")])),
            ("the fingerprint ComfyUI writes when its check fails (NaN)",
             lambda node: loads(node) and node.update(is_changed=float("nan"))),
            ("the fingerprint twice", lambda node: loads(node) and node.update(is_changed=[pippa, pippa])),
            ("a fingerprint on the KSampler too", lambda node: node["class_type"] == "KSampler"
             and node.update(is_changed=[pippa]))]:
        comfy = FakeComfy(bad_view={0: refingerprinted(change)})
        try:
            code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        finally:
            comfy.close()
        check(f"a page PNG with {label} is refused, nothing recorded",
              code and "isn't this recipe's render" in out and "its embedded graph is not the one" in out
              and "nothing was written" in out and not list((root / PAGE_DRAFTS).glob("page-01-*")),
              out.strip()[-200:])
    friend_drawn(root, "maya")
    child_drawn(root, "kennedi")
    references = [sha((root / CHILD_LOCKED / "kennedi.png").read_bytes()), pippa,
                  sha((root / FRIEND_LOCKED / "maya.png").read_bytes())]
    comfy = FakeComfy(bad_view={0: refingerprinted(lambda node: node.pop("is_changed", None))})
    try:
        code, out = run(root, "--server", comfy.url, "book-page", BOOK, "kennedi", 3)
    finally:
        comfy.close()
    check("a book page PNG with no fingerprint is refused too",
          code and "its embedded graph is not the one" in out and "nothing was written" in out, out.strip()[-200:])
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "book-page", BOOK, "kennedi", 3)
    finally:
        comfy.close()
    candidate = root / book_folder("kennedi", "drafts") / "page-03-candidate-61.png"
    graph = json.loads(Image.open(candidate).info["prompt"]) if candidate.is_file() else {}
    loaded = {node_id: node.get("is_changed") for node_id, node in graph.items() if node["class_type"] == "LoadImage"}
    check("a book page carries Kennedi's, Pippa's and Maya's fingerprints, in picture order, and is recorded",
          not code and [loaded[node_id] for node_id in sorted(loaded)] == [[digest] for digest in references],
          f"{out.strip()[-160:]} {loaded}")


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
    recipe_path = root / PAGE_DRAFTS / "page-01-recipe.json"
    current = recipe_path.read_text()
    legacy = json.loads(current)
    del legacy["set_writer"]                        # as the writer before #151 recorded a set: after all four renders
    recipe_path.write_text(json.dumps(legacy))
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "page", STORY, 1)
        check("a set recorded by the earlier writer is never resumed: all four render fresh",
              not code and renders(comfy) == 4 and "kept" not in out, f"{renders(comfy)} renders")
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

    def regraphed(text):                            # the real pixels, with another embedded graph
        def serve(real):
            meta, out = PngInfo(), io.BytesIO()
            meta.add_text("prompt", text)
            Image.open(io.BytesIO(real)).save(out, "PNG", pnginfo=meta)
            return out.getvalue()
        return serve
    for label, broken in [("an HTTP 200 error page", b"<html>500 Internal Server Error</html>"), ("an empty body", b""),
                          ("a PNG of the wrong size", small.getvalue()), ("the real render cut off mid-file", cut),
                          ("a JPEG instead of SaveImage's PNG", jpeg.getvalue()),
                          ("seed 61's image served again for seed 72", "job0"),
                          ("the real render with a garbled embedded graph", regraphed("{")),
                          ("the real render with a KSampler whose inputs are a list",
                           regraphed(json.dumps({"11": {"class_type": "KSampler", "inputs": [72]}})))]:
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


def child_drawn(root, child="kennedi", seed=72):
    """Render a child's sheet candidates and lock one."""
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "child", child)
        assert not code, out
        code, out = run(root, "lock-child", child, "--seed", seed)
        assert not code, out
    finally:
        comfy.close()


def friend_drawn(root, friend="maya", seed=72):
    """Render a friend's sheet candidates and lock one."""
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "friend", friend)
        assert not code, out
        code, out = run(root, "lock-friend", friend, "--seed", seed)
        assert not code, out
    finally:
        comfy.close()


def book_folder(child, kind):
    return f"design-source/books/{BOOK}/{child}/{kind}"


def book_paged(root, child, number, seed=83, force=False):
    """Render a page of the proof story for a child, and lock one candidate."""
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "book-page", BOOK, child, number)
        assert not code, out
        code, out = run(root, "lock-book-page", BOOK, child, number, "--seed", seed, *(["--force"] if force else []))
        assert not code, out
    finally:
        comfy.close()


def tool(root):
    """The tool as a module, for its pure functions; every command is still run through its command line."""
    spec = importlib.util.spec_from_file_location("story_recipe", root / "tools/story-recipe.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def case_child_sheets(root):
    """A child's sheet renders from their profile -- a young girl or a young boy -- locks and checks out."""
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "child", "kennedi")
        drafts = sorted(p.name for p in (root / CHILD_DRAFTS).iterdir()) if (root / CHILD_DRAFTS).is_dir() else []
        check("child renders four candidates, a contact sheet and a recipe", not code and drafts == [
            "kennedi-candidate-61.png", "kennedi-candidate-72.png", "kennedi-candidate-83.png",
            "kennedi-candidate-94.png", "kennedi-contact-sheet.png", "kennedi-recipe.json"], f"{out.strip()[-120:]} {drafts}")
        girl = json.loads((root / CHILD_DRAFTS / "kennedi-recipe.json").read_text())
        check("Kennedi's sheet is a young girl of 4, with her look in its own sentences and no glasses",
              girl["kind"] == "child-sheet" and "A single young girl, about 4 years old" in girl["prompt"]
              and "She has warm medium golden-tan skin" in girl["prompt"] and "She is wearing a cream collared polo" in
              girl["prompt"] and "glasses" not in girl["prompt"], girl["prompt"])
        check("a child's sheet names exactly the three base-model files",
              [m["file"] for m in girl["models"]] == ["qwen-image-Q8_0.gguf", "qwen_2.5_vl_7b_fp8_scaled.safetensors",
                                                      "qwen_image_vae.safetensors"])
        run(root, "--server", comfy.url, "child", "leo")
        boy = json.loads((root / CHILD_DRAFTS / "leo-recipe.json").read_text())
        check("Leo's sheet is a young boy of 5, with round glasses",
              "A single young boy, about 5 years old" in boy["prompt"] and "He has deep brown skin" in boy["prompt"]
              and "green sneakers, and round glasses." in boy["prompt"], boy["prompt"])
        code, out = run(root, "lock-child", "kennedi", "--seed", 72)
        code2, out2 = run(root, "lock-child", "leo", "--seed", 61)
        locked = sorted(p.name for p in (root / CHILD_LOCKED).iterdir())
        check("lock-child writes each child's sheet and recipe", not code and not code2 and locked == [
            "kennedi.png", "kennedi.recipe.json", "leo.png", "leo.recipe.json"], (out + out2).strip()[-160:])
        code, out = run(root, "selftest")
        check("and selftest passes", not code and "2 children, 2 child locks" in out, out.strip()[-200:])
    finally:
        comfy.close()
    locked = root / CHILD_LOCKED
    recipe = json.loads((locked / "leo.recipe.json").read_text())
    recipe["files"] = {"kennedi.png": recipe["files"]["leo.png"]}
    for name in ("kennedi.png", "kennedi.recipe.json", "leo.recipe.json"):
        (locked / name).unlink()
    (locked / "leo.png").rename(locked / "kennedi.png")
    (locked / "kennedi.recipe.json").write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("Leo's sheet saved as Kennedi's lock fails selftest", code and "under another child's name" in out,
          out.strip()[-200:])
    for args, why in [(("character", "kennedi"), "is not a character"), (("child", "pippa"), "is not a child"),
                      (("child", "Kennedi"), "is not a child"), (("book-page", BOOK, "pippa", 1), "is not a child"),
                      (("lock", "kennedi", "--seed", 72), "is not a character")]:
        code, out = run(root, "--server", "http://127.0.0.1:9", *args)
        check(f"{' '.join(map(str, args))} is refused: a child is never a canon character, nor the reverse",
              code and why in out, out.strip()[-160:])


def case_profile_check(root):
    """A profile is a boy or a girl and nothing else, aged 2 to 8, named in letters, with a look in short phrases."""
    base = json.loads((root / "children" / "leo.json").read_text())
    path = root / "children" / "testkid.json"
    unwritten = lambda: not (root / "design-source").exists()

    def profile(**changes):
        made = json.loads(json.dumps(base))
        for key, value in changes.items():
            if key in made["appearance"] or key == "extra_look":
                made["appearance"][key] = value
            elif value is KeyError:
                del made[key]
            else:
                made[key] = value
        return made

    for label, made, why in [
            ('child "Boy"', profile(child="Boy"), "its child"), ('child "girl " (trailing space)', profile(child="girl "),
                                                                  "its child"),
            ('child "other"', profile(child="other"), "its child"), ('child ""', profile(child=""), "its child"),
            ("child 1", profile(child=1), "its child"), ('child ["boy"]', profile(child=["boy"]), "its child"),
            ("no child", profile(child=KeyError), "is not exactly"),
            ("age 1", profile(age=1), "its age"), ("age 9", profile(age=9), "its age"),
            ('age "4"', profile(age="4"), "its age"), ("age true", profile(age=True), "its age"),
            ("age 4.0", profile(age=4.0), "its age"),
            ("a 25-letter name", profile(name="A" + "b" * 24), "its name"), ("an empty name", profile(name=""), "its name"),
            ("a name with a digit", profile(name="Leo2"), "its name"),
            ("two spaces in a name", profile(name="Mary  Jane"), "its name"),
            ("a 201-character phrase", profile(skin="s" * 201), "its skin is not"),
            ("a phrase with a newline", profile(skin="deep brown\nskin"), "its skin is not"),
            ("an empty phrase", profile(hair="   "), "its hair is not"),
            ('glasses "yes"', profile(glasses="yes"), "its glasses"),
            ("an extra key", {**base, "favourite": "dinosaurs"}, "is not exactly"),
            ("an extra look", profile(extra_look="freckles"), "its appearance is not exactly"),
            ("no source", profile(source=" "), "no source")]:
        path.write_text(json.dumps(made))
        code, out = run(root, "--server", "http://127.0.0.1:9", "child", "testkid")
        code2, out2 = run(root, "selftest")
        check(f"{label} is refused by child and fails selftest",
              code and "can't be drawn from" in out and why in out and code2 and why in out2 and unwritten(),
              (out + out2).strip()[-200:])
    for label, made in [("age 2", profile(age=2)), ("age 8", profile(age=8)), ('"Mary-Jane"', profile(name="Mary-Jane")),
                        ('"D\'Andre"', profile(name="D'Andre")), ("a 24-letter name", profile(name="A" + "b" * 23)),
                        ("a 200-character phrase", profile(outfit="o" * 200)), ("a girl", profile(child="girl"))]:
        path.write_text(json.dumps(made))
        code, out = run(root, "--server", "http://127.0.0.1:9", "child", "testkid")
        code2, out2 = run(root, "selftest")
        check(f"{label} passes the profile check (child goes on to ComfyUI) and selftest",
              code and "unreachable" in out and not code2, (out + out2).strip()[-200:])


def case_personal_story_check(root):
    """A personal story fills in only the child's name and pronouns, and the child is in its cast."""
    story_path = root / "personal-stories" / f"{BOOK}.json"
    original = json.loads(story_path.read_text())

    def text(old, new):
        def mutate(story):
            story["text"] = story["text"].replace(old, new, 1)
            story["source"]["content_sha256"] = sha(story["text"].encode())
        return mutate

    def page_one(key, value):
        return lambda story: story["pages"][0].__setitem__(key, value)

    def page_cast_scene(number, cast, scene):
        def mutate(story):
            story["pages"][number - 1].update(cast=cast, scene=scene)
        return mutate

    def no_child(story):
        for page in story["pages"]:
            page["cast"] = ["Pippa"]

    for label, mutate, why in [
            ("an unknown slot", text("{subject} crouched", "{they} crouched"), "its text uses {they}"),
            ("an empty slot", text("{subject} crouched", "{} crouched"), "its text uses {}"),
            ("a format spec", text("{name} followed", "{name:>5} followed"), "its text uses {name:>5}"),
            ("a conversion", text("{name} followed", "{name!r} followed"), "its text uses {name!r}"),
            ("an attribute", text("{name} followed", "{name.upper} followed"), "its text uses {name.upper}"),
            ("a stray brace", text("{name} followed", "{name followed"), "its text has a stray brace"),
            ("an escaped brace in the text", text("{name} followed", "{{name}} followed"), "its text has an escaped brace"),
            ("an escaped brace in a scene", page_one("scene", "{{name}} crouches on the path"),
             "page 1's scene has an escaped brace"),
            ("a page that names the child but has no {child}", page_cast_scene(2, ["Pippa"], "{name} hugs tiny Pippa"),
             "page 2's scene fills in name but its cast has no {child}"),
            ("a page that calls the child by a pronoun but has no {child}",
             page_cast_scene(2, ["Pippa"], "tiny Pippa waves at {object}"), "page 2's scene fills in object but"),
            ("a page whose place is the child's but has no {child}",
             lambda s: (page_cast_scene(4, ["Pippa"], "tiny Pippa sleeps on soft moss")(s),
                        s["pages"][3].__setitem__("place", "{possessive} bed of moss")),
             "page 4's place fills in possessive but"),
            ("the child in the season", lambda s: s.__setitem__("season", "{name}'s autumn"),
             "its season fills in name, but it is the story's"),
            ("an escaped brace in the season", lambda s: s.__setitem__("season", "gentle {{name}} autumn"),
             "its season has an escaped brace"),
            ("a stray brace in the season", lambda s: s.__setitem__("season", "gentle autumn {"),
             "its season has a stray brace"),
            ("an unknown slot in the season", lambda s: s.__setitem__("season", "{weather} autumn"),
             "its season uses {weather}"),
            ("an unknown slot in the title", lambda s: s.__setitem__("title", "{kid} Meets Pippa"),
             "its title uses {kid}"),
            ("an unknown slot in a scene", page_one("scene", "{Name} crouches on the path"), "page 1's scene uses {Name}"),
            ("a cast member who is neither the child nor canon", page_one("cast", ["{kid}"]), "names someone who is not"),
            ("a cast of four", lambda s: s["pages"][2].__setitem__("cast", ["{child}", "Pippa", "Bramble", "Barnaby"]),
             "one to three different"),
            ("no child in any cast", no_child, "no page's cast has {child}"),
            ("text that doesn't hash to its record", lambda s: s.__setitem__("text", s["text"] + " Extra."),
             "does not hash")]:
        story = json.loads(json.dumps(original))
        mutate(story)
        story_path.write_text(json.dumps(story))
        code, out = run(root, "selftest")
        code2, out2 = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "kennedi", 1)
        check(f"{label} fails selftest, and book-page refuses it",
              code and why in out and code2 and "can't be drawn from" in out2 and why in out2, (out + out2).strip()[-200:])
    story = json.loads(json.dumps(original))
    page_cast_scene(2, ["Pippa"], "tiny Pippa waves hello from a big fern")(story)
    story_path.write_text(json.dumps(story))
    code, out = run(root, "selftest")
    check("a page without the child passes when nothing in it is the child", not code, out.strip()[-200:])
    story_path.write_text(json.dumps(original))
    clash = {**json.loads((root / "children" / "kennedi.json").read_text()), "name": "Pippa"}
    (root / "children" / "pippa-kid.json").write_text(json.dumps(clash))
    code, out = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "pippa-kid", 1)
    check("a child named Pippa can't be the hero of a book with Pippa in it",
          code and "can't be the hero" in out and not (root / "design-source").exists(), out.strip()[-160:])
    (root / "children" / "pippa-kid.json").unlink()
    code, out = run(root, "selftest")
    check("the proof story as committed passes", not code and "1 personal stories" in out, out.strip()[-200:])


def case_filling(root):
    """Boy fills in he, him, his, himself; girl fills in she, her, her, herself."""
    module = tool(root)
    story = json.loads((root / "personal-stories" / f"{BOOK}.json").read_text())
    kennedi, leo = (json.loads((root / "children" / f"{c}.json").read_text()) for c in ("kennedi", "leo"))
    slots = "{subject} {object} {possessive} {reflexive} / {Subject} {Object} {Possessive} {Reflexive}"
    check("a girl's slots", module.fill(slots, kennedi) == "she her her herself / She Her Her Herself",
          module.fill(slots, kennedi))
    check("a boy's slots", module.fill(slots, leo) == "he him his himself / He Him His Himself", module.fill(slots, leo))
    for profile, expected in [
            (kennedi, ["Kennedi Meets Pippa", "so she crouched down", "hopped onto Kennedi's open hand. She held very "
                       "still and smiled to herself. Her new friend", "Pippa giggled beside her.", "And she drifted"]),
            (leo, ["Leo Meets Pippa", "so he crouched down", "hopped onto Leo's open hand. He held very still and "
                   "smiled to himself. His new friend", "Pippa giggled beside him.", "And he drifted"])]:
        filled = module.fill(story["title"], profile) + " | " + module.fill(story["text"], profile)
        check(f"the proof story filled for {profile['name']}", all(part in filled for part in expected)
              and "{" not in filled, filled[:200])


def case_book_page_lock_selftest(root):
    """A book page renders for one child, from the child's, a friend's and an animal's locked sheets, locks and
    checks out."""
    drawn(root, "pippa")
    friend_drawn(root, "maya")
    child_drawn(root, "kennedi")
    sheets = {"kennedi": (root / CHILD_LOCKED / "kennedi.png").read_bytes(),
              "pippa": (root / LOCKED / "pippa.png").read_bytes(), "maya": (root / FRIEND_LOCKED / "maya.png").read_bytes()}
    drafts_rel = book_folder("kennedi", "drafts")
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "book-page", BOOK, "kennedi", 3)
        drafts = sorted(p.name for p in (root / drafts_rel).iterdir()) if (root / drafts_rel).is_dir() else []
        check("book-page renders four candidates, a contact sheet and a recipe", not code and drafts == [
            "page-03-candidate-61.png", "page-03-candidate-72.png", "page-03-candidate-83.png",
            "page-03-candidate-94.png", "page-03-contact-sheet.png", "page-03-recipe.json"], f"{out.strip()[-160:]} {drafts}")
        check("ComfyUI received exactly the three locked sheets' bytes",
              comfy.uploads == {f"storybook-{sha(data)}.png": data for data in sheets.values()}, sorted(comfy.uploads))
        graph = json.loads(Image.open(root / drafts_rel / "page-03-candidate-61.png").info["prompt"])
        loads = {node_id: node["inputs"]["image"] for node_id, node in graph.items() if node["class_type"] == "LoadImage"}
        encoders = [node["inputs"] for node in graph.values() if node["class_type"] == "TextEncodeQwenImageEditPlus"]
        in_order = [f"storybook-{sha(sheets[name])}.png" for name in ("kennedi", "pippa", "maya")]
        check("both encoders get Kennedi's sheet as image1, then Pippa's and Maya's",
              len(encoders) == 2 and all([loads[e[f"image{i}"][0]] for i in (1, 2, 3)] == in_order for e in encoders),
              encoders)
        recipe = json.loads((root / drafts_rel / "page-03-recipe.json").read_text())
        check("the prompt calls her and Maya each the girl in their picture, and fills her name and pronouns in",
              "Kennedi is the girl in picture 1, Pippa is the dormouse in picture 2 and Maya is the girl in "
              "picture 3, each drawn exactly as in their picture. Kennedi kneels at a mossy rock" in recipe["prompt"]
              and "sitting on the rock beside her and Maya standing" in recipe["prompt"] and "{" not in recipe["prompt"],
              recipe["prompt"])
        maya = json.loads((root / "friends/maya.json").read_text())
        check("the recipe records the page entry as written, the profiles and the references by kind",
              "{name}" in recipe["entry"]["scene"] and recipe["profile"]["child"] == "girl"
              and recipe["friends"] == {"maya": maya} and recipe["references"] == [
                  {"kind": "child", "name": "kennedi", "sha256": sha(sheets["kennedi"])},
                  {"kind": "character", "name": "pippa", "sha256": sha(sheets["pippa"])},
                  {"kind": "friend", "name": "maya", "sha256": sha(sheets["maya"])}], recipe["references"])
        code, out = run(root, "lock-book-page", BOOK, "kennedi", 3, "--seed", 83)
        locked = sorted(p.name for p in (root / book_folder("kennedi", "locked")).iterdir())
        check("lock-book-page writes page-03.png and its recipe", not code and locked == ["page-03.png",
                                                                                          "page-03.recipe.json"],
              out.strip()[-160:])
        code, out = run(root, "selftest")
        check("and selftest passes", not code and "1 book page locks" in out, out.strip()[-200:])
    finally:
        comfy.close()
    child_drawn(root, "leo", seed=61)
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "book-page", BOOK, "leo", 1)
        recipe = json.loads((root / book_folder("leo", "drafts") / "page-01-recipe.json").read_text())
        check("for Leo, page 1 is the boy alone, with him in its scene",
              not code and "Leo is the boy in picture 1, each drawn" in recipe["prompt"]
              and "the leaves around him glowing" in recipe["prompt"] and len(comfy.uploads) == 1, recipe["prompt"])
    finally:
        comfy.close()


def case_book_lock_follows_its_inputs(root):
    """A book page lock is drawn from the profile, the story and the sheets as they were: changing any fails it."""
    drawn(root, "pippa")
    child_drawn(root, "kennedi")
    book_paged(root, "kennedi", 2)
    code, out = run(root, "selftest")
    check("the book page lock checks out to begin with", not code, out.strip()[-160:])
    profile_path, story_path = root / "children/kennedi.json", root / f"personal-stories/{BOOK}.json"
    profile, story = profile_path.read_text(), story_path.read_text()

    def edited(path, change):
        data = json.loads(path.read_text())
        change(data)
        path.write_text(json.dumps(data))

    def new_text(s):
        s["text"] = s["text"].replace("golden autumn", "crisp autumn", 1)
        s["source"]["content_sha256"] = sha(s["text"].encode())

    for label, change, whys, restore in [
            ("editing her profile", lambda: edited(profile_path, lambda p: p.__setitem__("age", 5)),
             ["page-02.recipe.json: its recorded profile", "kennedi.recipe.json: its recorded profile"],
             lambda: profile_path.write_text(profile)),
            ("re-locking her sheet", lambda: run(root, "lock-child", "kennedi", "--seed", 94, "--force"),
             ["page-02.recipe.json: its recorded references"],
             lambda: run(root, "lock-child", "kennedi", "--seed", 72, "--force")),
            ("editing the story text", lambda: edited(story_path, new_text),
             ["page-02.recipe.json: its recorded story_sha256"], lambda: story_path.write_text(story)),
            ("editing the page's entry",
             lambda: edited(story_path, lambda s: s["pages"][1].__setitem__("scene", "{name} waves at tiny Pippa")),
             ["page-02.recipe.json: its recorded entry"], lambda: story_path.write_text(story)),
            ("re-locking Pippa", lambda: run(root, "lock", "pippa", "--seed", 94, "--force"),
             ["page-02.recipe.json: its recorded references"],
             lambda: run(root, "lock", "pippa", "--seed", 72, "--force"))]:
        change()
        code, out = run(root, "selftest")
        check(f"{label} fails the book page lock", code and all(why in out for why in whys), out.strip()[-300:])
        restore()
        code, out = run(root, "selftest")
        check("and putting it back makes it check out again", not code, out.strip()[-160:])


def case_book_refusals(root):
    """Each refusal exits before writing a book page, and before rendering."""
    unwritten = lambda: not (root / "design-source/books").exists()
    for args, why in [(("the-gruffalo", "kennedi", 1), "is not a personal story"),
                      ((STORY, "kennedi", 1), "is not a personal story"),
                      ((BOOK, "nobody", 1), "is not a child"), ((BOOK, "kennedi", 0), "there is no page 0"),
                      ((BOOK, "kennedi", 5), "there is no page 5")]:
        code, out = run(root, "--server", "http://127.0.0.1:9", "book-page", *args)
        check(f"book-page {' '.join(map(str, args))} is refused", code and why in out and unwritten(), out.strip()[-160:])
    code, out = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "kennedi", 1)
    check("a child with no locked sheet is refused", code and "kennedi has no locked sheet" in out and unwritten(),
          out.strip()[-160:])
    child_drawn(root, "kennedi")
    code, out = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "kennedi", 2)
    check("an animal in the cast with no locked sheet is refused", code and "pippa has no locked sheet" in out
          and unwritten(), out.strip()[-160:])
    code, out = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "kennedi", 1)
    check("ComfyUI unreachable is refused, nothing written", code and "unreachable" in out and unwritten(),
          out.strip()[-160:])
    book_paged(root, "kennedi", 1, seed=72)
    locked = root / book_folder("kennedi", "locked")
    before = {p.name: p.read_bytes() for p in locked.iterdir()}
    code, out = run(root, "lock-book-page", BOOK, "kennedi", 1, "--seed", 50)
    check("a seed that wasn't rendered is refused", code and "not one of the rendered" in out, out.strip())
    code, out = run(root, "lock-book-page", BOOK, "kennedi", 1, "--seed", 83)
    check("replacing a book page lock without --force is refused", code and "page-01 is already locked" in out,
          out.strip())
    check("and those refusals changed nothing", {p.name: p.read_bytes() for p in locked.iterdir()} == before)
    elsewhere = root / book_folder("leo", "locked")
    shutil.copytree(locked, elsewhere)
    code, out = run(root, "selftest")
    check("Kennedi's page lock copied under Leo's book fails selftest",
          code and "'kennedi''s recipe under meeting-pippa/leo/page-01" in out, out.strip()[-200:])
    shutil.rmtree(elsewhere)
    sheet = root / CHILD_LOCKED / "kennedi.png"
    Image.open(sheet).convert("RGB").save(sheet)          # same pixels, graph dropped: the lock no longer holds
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "book-page", BOOK, "kennedi", 3)
        check("a child whose sheet fails its lock checks is refused before uploading",
              code and "fail their checks" in out and "kennedi.recipe.json" in out and not comfy.uploads,
              out.strip()[-200:])
    finally:
        comfy.close()


def case_friend_sheets(root):
    """A friend's sheet renders from their profile with the child template, locks and checks out; a friend is never a
    hero, and a hero is never a friend."""
    module = tool(root)
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "friend", "maya")
        drafts = sorted(p.name for p in (root / FRIEND_DRAFTS).iterdir()) if (root / FRIEND_DRAFTS).is_dir() else []
        check("friend renders four candidates, a contact sheet and a recipe", not code and drafts == [
            "maya-candidate-61.png", "maya-candidate-72.png", "maya-candidate-83.png", "maya-candidate-94.png",
            "maya-contact-sheet.png", "maya-recipe.json"], f"{out.strip()[-120:]} {drafts}")
        maya = json.loads((root / "friends/maya.json").read_text())
        girl = json.loads((root / FRIEND_DRAFTS / "maya-recipe.json").read_text())
        check("Maya's sheet is the child template's prompt for her look: a young girl of 5",
              girl["kind"] == "friend-sheet" and girl["friend"] == "maya" and girl["template_version"] == "v1"
              and girl["prompt"] == module.child_prompt(module.CHILD_TEMPLATES["v1"], maya)
              and "A single young girl, about 5 years old" in girl["prompt"]
              and "She has deep brown skin, dark brown eyes, and black hair in two round puffs" in girl["prompt"],
              girl["prompt"])
        check("her recipe records her whole profile, and her personality and role never reach the prompt",
              girl["profile"] == maya and maya["personality"] not in girl["prompt"]
              and "friend" not in girl["prompt"].lower(), girl["prompt"])
        run(root, "--server", comfy.url, "friend", "theo")
        boy = json.loads((root / FRIEND_DRAFTS / "theo-recipe.json").read_text())
        check("Theo's sheet is a young boy of 4, with no glasses",
              "A single young boy, about 4 years old" in boy["prompt"] and "He has fair skin with light freckles"
              in boy["prompt"] and "glasses" not in boy["prompt"], boy["prompt"])
        run(root, "--server", comfy.url, "friend", "sora")
        sora = json.loads((root / FRIEND_DRAFTS / "sora-recipe.json").read_text())
        check("Sora's sheet has the template's round glasses", "white sneakers, and round glasses." in sora["prompt"],
              sora["prompt"])
        code, out = run(root, "lock-friend", "maya", "--seed", 72)
        code2, out2 = run(root, "lock-friend", "theo", "--seed", 61)
        locked = sorted(p.name for p in (root / FRIEND_LOCKED).iterdir())
        check("lock-friend writes each friend's sheet and recipe", not code and not code2 and locked == [
            "maya.png", "maya.recipe.json", "theo.png", "theo.recipe.json"], (out + out2).strip()[-160:])
        code, out = run(root, "selftest")
        check("and selftest passes", not code and "4 friends, 2 friend locks" in out, out.strip()[-200:])
    finally:
        comfy.close()
    locked = root / FRIEND_LOCKED
    recipe = json.loads((locked / "theo.recipe.json").read_text())
    recipe["files"] = {"maya.png": recipe["files"]["theo.png"]}
    for name in ("maya.png", "maya.recipe.json", "theo.recipe.json"):
        (locked / name).unlink()
    (locked / "theo.png").rename(locked / "maya.png")
    (locked / "maya.recipe.json").write_text(json.dumps(recipe))
    code, out = run(root, "selftest")
    check("Theo's sheet saved as Maya's lock fails selftest", code and "under another friend's name" in out,
          out.strip()[-200:])
    for args, why in [(("friend", "kennedi"), "is not a friend"), (("lock-friend", "leo", "--seed", 72), "is not a friend"),
                      (("child", "maya"), "is not a child"), (("lock-child", "maya", "--seed", 72), "is not a child"),
                      (("book-page", BOOK, "maya", 1), "is not a child"), (("character", "maya"), "is not a character")]:
        code, out = run(root, "--server", "http://127.0.0.1:9", *args)
        check(f"{' '.join(map(str, args))} is refused: a friend is never a hero or a canon character, nor the reverse",
              code and why in out, out.strip()[-160:])


def case_friend_profile_check(root):
    """A friend profile is a child profile plus a personality phrase and a role, "friend" or "met"."""
    base = {**json.loads((root / "friends" / "maya.json").read_text()), "name": "Zuri"}
    path = root / "friends" / "testpal.json"
    unwritten = lambda: not (root / "design-source").exists()

    def profile(**changes):
        made = json.loads(json.dumps(base))
        for key, value in changes.items():
            if value is KeyError:
                del made[key]
            else:
                made[key] = value
        return made

    for label, made, why in [
            ('role "Friend"', profile(role="Friend"), "its role"), ('role "hero"', profile(role="hero"), "its role"),
            ('role ""', profile(role=""), "its role"), ("role 1", profile(role=1), "its role"),
            ("no role", profile(role=KeyError), "is not exactly"),
            ("no personality", profile(personality=KeyError), "is not exactly"),
            ("an empty personality", profile(personality="  "), "its personality is not"),
            ("a personality with a newline", profile(personality="bold\nand brave"), "its personality is not"),
            ("a 201-character personality", profile(personality="p" * 201), "its personality is not"),
            ("an extra key", {**base, "favourite": "kites"}, "is not exactly"),
            ('child "Boy" (the child rules apply)', profile(child="Boy"), "its child"),
            ("age 9 (the child rules apply)", profile(age=9), "its age"),
            ("no source (the child rules apply)", profile(source=""), "no source")]:
        path.write_text(json.dumps(made))
        code, out = run(root, "--server", "http://127.0.0.1:9", "friend", "testpal")
        code2, out2 = run(root, "selftest")
        check(f"{label} is refused by friend and fails selftest",
              code and "can't be drawn from" in out and why in out and code2 and why in out2 and unwritten(),
              (out + out2).strip()[-200:])
    for label, made in [('role "met"', profile(role="met")), ('role "friend"', profile(role="friend")),
                        ("a 200-character personality", profile(personality="p" * 200)), ("a boy", profile(child="boy"))]:
        path.write_text(json.dumps(made))
        code, out = run(root, "--server", "http://127.0.0.1:9", "friend", "testpal")
        code2, out2 = run(root, "selftest")
        check(f"{label} passes the friend check (friend goes on to ComfyUI) and selftest",
              code and "unreachable" in out and not code2, (out + out2).strip()[-200:])


def case_friend_names(root):
    """One name, one character: no friend shares a name with a canon character or another friend, in any case."""
    maya = json.loads((root / "friends" / "maya.json").read_text())
    for file_name, name, why in [("pippa-pal", "Pippa", "is also the name of the canon character Pippa"),
                                 ("maya-two", "maya", "is also the name of the friend maya"),
                                 ("bramble-pal", "BRAMBLE", "is also the name of the canon character Bramble")]:
        path = root / "friends" / f"{file_name}.json"
        path.write_text(json.dumps({**maya, "name": name}))
        code, out = run(root, "selftest")
        code2, out2 = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "kennedi", 1)
        code3, out3 = run(root, "--server", "http://127.0.0.1:9", "friend", "theo")
        check(f"a friend named {name!r} fails selftest, and book-page and friend refuse the roster",
              code and why in out and code2 and "the friends can't be drawn from" in out2 and why in out2
              and code3 and "the friends can't be drawn from" in out3, (out + out2 + out3).strip()[-240:])
        path.unlink()
    code, out = run(root, "selftest")
    check("the roster as committed passes", not code and "4 friends" in out, out.strip()[-200:])


def case_mixing_rule(root):
    """A personal story casts at least one friend and at least one canon character, so a book mixes children and
    animals; the hero can't share a friend's name."""
    story_path = root / "personal-stories" / f"{BOOK}.json"
    original = json.loads(story_path.read_text())

    def bramble_not_maya(story):
        story["pages"][2]["cast"] = ["{child}", "Pippa", "Bramble"]
        story["pages"][2]["scene"] = story["pages"][2]["scene"].replace("Maya standing nearby holding her",
                                                                        "Bramble standing nearby holding his")

    def theo_not_pippa(story):
        for page in story["pages"]:
            page["cast"] = ["Theo" if member == "Pippa" else member for member in page["cast"]]

    for label, mutate, why in [
            ("no friend in any cast (a kid and animals)", bramble_not_maya, "no page's cast has a friend"),
            ("no canon character in any cast", theo_not_pippa, "no page's cast has a character from"),
            ("a cast naming someone who is no character, child or friend",
             lambda s: s["pages"][2].__setitem__("cast", ["{child}", "Pippa", "Zara"]), "names someone who is not")]:
        story = json.loads(json.dumps(original))
        mutate(story)
        story_path.write_text(json.dumps(story))
        code, out = run(root, "selftest")
        code2, out2 = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "kennedi", 1)
        check(f"{label} fails selftest, and book-page refuses it",
              code and why in out and code2 and "can't be drawn from" in out2 and why in out2, (out + out2).strip()[-200:])
    story = json.loads(json.dumps(original))
    story["pages"][1]["cast"] = ["{child}", "Pippa", "Theo"]
    story_path.write_text(json.dumps(story))
    code, out = run(root, "selftest")
    check("a story with two friends and an animal passes", not code, out.strip()[-200:])
    story_path.write_text(json.dumps(original))
    clash = {**json.loads((root / "children" / "kennedi.json").read_text()), "name": "Maya"}
    (root / "children" / "maya-kid.json").write_text(json.dumps(clash))
    code, out = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "maya-kid", 1)
    check("a child named Maya can't be the hero of a book with Maya in it",
          code and "can't be the hero" in out and "called Maya" in out and not (root / "design-source").exists(),
          out.strip()[-160:])
    (root / "children" / "maya-kid.json").unlink()
    code, out = run(root, "selftest")
    check("the revised proof story as committed passes", not code and "1 personal stories" in out, out.strip()[-200:])


def case_book_lock_follows_friends(root):
    """A book page draws on a friend's locked sheet: re-locking the friend or editing their profile fails the page
    lock, and a friend with no sound sheet is refused before rendering."""
    drawn(root, "pippa")
    child_drawn(root, "kennedi")
    code, out = run(root, "--server", "http://127.0.0.1:9", "book-page", BOOK, "kennedi", 3)
    check("a friend in the cast with no locked sheet is refused",
          code and "maya has no locked sheet -- run `friend maya`, then `lock-friend maya`, first" in out
          and not (root / "design-source/books").exists(), out.strip()[-160:])
    friend_drawn(root, "maya")
    book_paged(root, "kennedi", 3)
    code, out = run(root, "selftest")
    check("the book page lock with Maya checks out", not code and "1 book page locks" in out, out.strip()[-160:])
    profile_path = root / "friends/maya.json"
    profile = profile_path.read_text()

    def edit_maya():
        data = json.loads(profile)
        data["appearance"]["outfit"] = "a red raincoat over a teal dress, and red rain boots"
        profile_path.write_text(json.dumps(data))

    for label, change, whys, restore in [
            ("re-locking Maya", lambda: run(root, "lock-friend", "maya", "--seed", 94, "--force"),
             ["page-03.recipe.json: its recorded references"],
             lambda: run(root, "lock-friend", "maya", "--seed", 72, "--force")),
            ("editing Maya's profile", edit_maya,
             ["page-03.recipe.json: its recorded friends", "maya.recipe.json: its recorded profile"],
             lambda: profile_path.write_text(profile))]:
        change()
        code, out = run(root, "selftest")
        check(f"{label} fails the book page lock", code and all(why in out for why in whys), out.strip()[-300:])
        restore()
        code, out = run(root, "selftest")
        check("and putting it back makes it check out again", not code, out.strip()[-160:])
    sheet = root / FRIEND_LOCKED / "maya.png"
    Image.open(sheet).convert("RGB").save(sheet)          # same pixels, graph dropped: the lock no longer holds
    comfy = FakeComfy()
    try:
        code, out = run(root, "--server", comfy.url, "book-page", BOOK, "kennedi", 3)
        check("a friend whose sheet fails its lock checks is refused before uploading",
              code and "fail their checks" in out and "maya.recipe.json" in out and not comfy.uploads,
              out.strip()[-200:])
    finally:
        comfy.close()


def main():
    cases = [case_fresh_storybook, case_character_lock_selftest, case_refusals, case_candidate_is_not_its_recipe, case_licence_allowlist,
             case_canon_change, case_lock_is_its_character, case_real_folders_only,
             case_locked_folder_holds_only_records, case_page_lock_selftest, case_page_refusals,
             case_reference_fingerprints, case_relocked_sheet, case_story_edits, case_page_lock_is_its_page, case_plan_check,
             case_lost_comfy_keeps_finished_seeds, case_resume_needs_the_same_recipe, case_character_sets_resume_too,
             case_bad_replies_are_not_kept, case_child_sheets, case_profile_check, case_personal_story_check,
             case_filling, case_book_page_lock_selftest, case_book_lock_follows_its_inputs, case_book_refusals,
             case_friend_sheets, case_friend_profile_check, case_friend_names, case_mixing_rule,
             case_book_lock_follows_friends]
    for case in cases:
        print(f"\n== {case.__name__}: {case.__doc__}")
        with tempfile.TemporaryDirectory(prefix="story-test-") as tmp:
            case(storybook_copy(Path(tmp) / "storybook"))
    print(f"\n{sum(results)} of {len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
