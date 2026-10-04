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
MODEL_FILES = {"UnetLoaderGGUF": ("unet_name", "qwen-image-Q8_0.gguf"),
               "CLIPLoader": ("clip_name", "qwen_2.5_vl_7b_fp8_scaled.safetensors"),
               "VAELoader": ("vae_name", "qwen_image_vae.safetensors")}
results = []


def check(label, ok, detail=""):
    results.append(bool(ok))
    detail = " | ".join(str(detail).splitlines())    # one line, so a tool's FAIL output can't pass for ours
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f": {detail[:180]}" if detail else ""))


class FakeComfy:
    """ComfyUI's HTTP API, as much of it as the tool uses: it lists the allowlisted models, queues a graph,
    "renders" an image of the requested size from the seed and prompt, and embeds the graph as ComfyUI does."""

    def __init__(self, models=MODEL_FILES):
        self.images, fake = {}, self

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
                graph = json.loads(self.rfile.read(int(self.headers["Content-Length"])))["prompt"]
                prompt_id = f"job{len(fake.images)}"
                fake.images[prompt_id] = fake.render(graph)
                self.reply({"prompt_id": prompt_id})

            def do_GET(self):
                path, _, query = self.path.partition("?")
                if path.startswith("/history/"):
                    pid = path.rsplit("/", 1)[1]
                    return self.reply({pid: {"status": {"status_str": "success"}, "outputs": {
                        "10": {"images": [{"filename": f"{pid}.png", "subfolder": "", "type": "output"}]}}}})
                if path == "/view":
                    return self.reply(fake.images[parse_qs(query)["filename"][0][:-4]], "image/png")
                if path == "/system_stats":
                    return self.reply({"system": {"comfyui_version": "fake"}})
                if path.startswith("/object_info/"):
                    node = path.rsplit("/", 1)[1]
                    field, name = models[node]
                    return self.reply({node: {"input": {"required": {field: [[name, "other.safetensors"]]}}}})
                self.send_error(404)

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    @staticmethod
    def render(graph):
        nodes = {n["class_type"]: n["inputs"] for n in graph.values()}
        latent = nodes["EmptySD3LatentImage"]
        digest = hashlib.sha256(json.dumps(graph, sort_keys=True).encode()).digest()
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
    comfy = FakeComfy(models={**MODEL_FILES, "CLIPLoader": ("clip_name", "clip_l.safetensors")})
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


def main():
    cases = [case_fresh_storybook, case_character_lock_selftest, case_refusals, case_candidate_is_not_its_recipe, case_licence_allowlist,
             case_canon_change, case_lock_is_its_character, case_real_folders_only,
             case_locked_folder_holds_only_records]
    for case in cases:
        print(f"\n== {case.__name__}: {case.__doc__}")
        with tempfile.TemporaryDirectory(prefix="story-test-") as tmp:
            case(storybook_copy(Path(tmp) / "storybook"))
    print(f"\n{sum(results)} of {len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
