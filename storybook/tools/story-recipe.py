#!/usr/bin/env python3
"""The bedtime book's illustration recipe: character sheets from a licence-allowlisted Qwen-Image stack.

  python3 storybook/tools/story-recipe.py character pippa
      Render four seeds of Pippa's character sheet, a contact sheet and a draft recipe into
      design-source/characters/drafts/.
  python3 storybook/tools/story-recipe.py lock pippa --seed 72 [--force]
      Lock the pick as design-source/characters/locked/pippa.png, with a recipe recording each file's SHA-256.
  python3 storybook/tools/story-recipe.py selftest
      Check that every lock rebuilds from its recipe and the current canon, that its files match their digests,
      that every file in the locked folder has one owner, and that every model it names is on the licence
      allowlist. No ComfyUI needed.

The canon is storybook/canon/moon-berry-forest.json, a snapshot of bedtime_broadcast's WORLD_BIBLE. Renders
need a running ComfyUI (--server, default http://127.0.0.1:8188) that can see the allowlisted models. Needs
Pillow. One operator on one machine: the tool takes one lock on design-source while it commits,
and hardening against concurrent or adversarial use beyond that is out of scope.
"""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

STORYBOOK = Path(__file__).resolve().parents[1]
CANON = "canon/moon-berry-forest.json"
DRAFTS, LOCKED = "design-source/characters/drafts", "design-source/characters/locked"
SEEDS = (61, 72, 83, 94)

# Every model the book renders with, by role: its file, where it comes from and its licence, verified on the
# Hugging Face Hub 2026-10-04. Nothing else is loaded, so a lock is sell-safe by construction.
MODELS = {
    "unet": {"file": "qwen-image-Q8_0.gguf", "source": "city96/Qwen-Image-gguf", "license": "apache-2.0"},
    "clip": {"file": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
             "source": "Comfy-Org/Qwen-Image_ComfyUI (from Qwen/Qwen2.5-VL-7B-Instruct)", "license": "apache-2.0"},
    "vae": {"file": "qwen_image_vae.safetensors", "source": "Comfy-Org/Qwen-Image_ComfyUI", "license": "apache-2.0"},
}
LOADERS = {"unet": ("UnetLoaderGGUF", "unet_name"), "clip": ("CLIPLoader", "clip_name"), "vae": ("VAELoader", "vae_name")}

# Versions are never edited: a lock must keep rebuilding from its recipe, so a change is a new version.
SHEET_TEMPLATES = {"v1": {
    "style": ("soft storybook watercolor illustration, gentle warm moonlit palette, clean confident outlines, "
              "cozy picture-book style"),
    "text": ("{style}. A single {build} {species} standing in a relaxed three-quarter view, {base_colors}{garment}"
             "{props}, {accent}, plain soft cream background, full body, centered, no text"),
}}
# ComfyUI's own Qwen-Image defaults (its "Text to Image (Qwen-Image)" blueprint).
RENDERS = {"v1": {"size": 1328, "shift": 3.1, "steps": 20, "cfg": 4.0, "sampler": "euler", "scheduler": "simple"}}
TEMPLATE, RENDER = "v1", "v1"
# Keys a recipe gains outside draft_manifest(): the ComfyUI version noted at render time, and what `lock` adds.
ADDED_KEYS = {"comfyui_version", "chosen_seed", "source", "files"}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_canon():
    return json.loads((STORYBOOK / CANON).read_text())


def character(canon, name):
    """The canon character called name (any case), or exit: only canon characters have sheets."""
    found = [c for c in canon["characters"] if c["name"].lower() == str(name).lower()]
    if not found:
        sys.exit(f"{name!r} is not a character in {CANON}: {', '.join(c['name'] for c in canon['characters'])}")
    return found[0]


def sheet_prompt(template, appearance):
    props = appearance["signature_props"]
    listed = props[0] if len(props) == 1 else ", ".join(props[:-1]) + " and " + props[-1] if props else ""
    garment = appearance["signature_garment"]
    return template["text"].format(
        style=template["style"], build=appearance["build"], species=appearance["species"],
        base_colors=appearance["base_colors"], garment=f", wearing a {garment}" if garment else "",
        props=f", with {listed}" if listed else "", accent=appearance["accent_notes"])


def recipe_graph(recipe, seed, prefix):
    """The graph a recipe renders at a seed, built from what the recipe records and nothing else."""
    settings, files = recipe["settings"], {m["role"]: m["file"] for m in recipe["models"]}
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": files["unet"]}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": files["clip"], "type": "qwen_image",
                                                     "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": files["vae"]}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": settings["shift"]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": recipe["prompt"]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": ""}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": settings["size"], "height": settings["size"],
                                                               "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {
            "model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0], "seed": seed,
            "steps": settings["steps"], "cfg": settings["cfg"], "sampler_name": settings["sampler"],
            "scheduler": settings["scheduler"], "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


def draft_manifest(name, template_version, render_version, canon):
    """Everything a character-sheet recipe records about how it renders, built from its inputs alone.

    `character` writes what this returns; `lock` and `selftest` rebuild it from a recipe's inputs and compare
    every key, so a recorded value can't say something its render doesn't, and a canon change fails the locks
    it described.
    """
    appearance = character(canon, name)["appearance"]
    template = SHEET_TEMPLATES[template_version]
    manifest = {"kind": "character-sheet", "name": name, "template_version": template_version,
                "render_version": render_version, "canon": appearance, "template": template,
                "prompt": sheet_prompt(template, appearance), "settings": RENDERS[render_version],
                "models": [{"role": role, **MODELS[role]} for role in ("unet", "clip", "vae")],
                "seeds": list(SEEDS)}
    manifest["graph"] = recipe_graph(manifest, 0, f"storybook/{name}")
    return manifest


def embedded_problems(png, manifest, seed, canon):
    """Why png is not the render its recipe describes at this seed; an empty list when it is."""
    problems = []
    allowed = {m["file"] for m in MODELS.values()}
    for model in manifest.get("models") if isinstance(manifest.get("models"), list) else []:
        if not isinstance(model, dict) or model.get("file") not in allowed:
            problems.append(f"model {model!r} is not on the licence allowlist")
    if (manifest.get("template_version") not in SHEET_TEMPLATES or manifest.get("render_version") not in RENDERS
            or not any(c["name"].lower() == str(manifest.get("name")).lower() for c in canon["characters"])):
        return problems + ["its name, template_version or render_version is not one the tool knows"]
    expected = draft_manifest(manifest["name"], manifest["template_version"], manifest["render_version"], canon)
    for key in sorted(set(manifest) | set(expected)):
        if key in expected and key not in manifest:
            problems.append(f"it does not record {key}")
        elif key in expected and manifest[key] != expected[key]:
            problems.append(f"its recorded {key} is not what the tool records for this character and canon")
        elif key not in expected and key not in ADDED_KEYS:
            problems.append(f"it records {key}, which the tool does not")
    image = Image.open(png)
    if "prompt" not in image.info:
        return problems + [f"{png.name} has no embedded graph"]
    if image.size != (expected["settings"]["size"],) * 2:
        problems.append(f"{png.name} is {image.size[0]}x{image.size[1]}, not the recipe's size")
    graph = json.loads(image.info["prompt"])
    nodes = {node["class_type"]: node["inputs"] for node in graph.values()}
    if nodes.get("KSampler", {}).get("seed") != seed:
        problems.append(f"it was rendered at seed {nodes.get('KSampler', {}).get('seed')}, not {seed}")
    if graph != recipe_graph(expected, seed, nodes.get("SaveImage", {}).get("filename_prefix")):
        problems.append(f"its embedded graph is not the one its recipe renders at seed {seed}")
    return problems


@contextlib.contextmanager
def art_lock():
    """Commits into design-source happen one at a time. The lock is on the storybook folder itself, which
    always exists; design-source is made on first use, since git doesn't keep empty folders."""
    folder = os.open(STORYBOOK, os.O_RDONLY)
    try:
        fcntl.flock(folder, fcntl.LOCK_EX)
        yield
    finally:
        os.close(folder)


@contextlib.contextmanager
def staging(folder):
    """Files written to the yielded folder move into `folder` together, under the art lock, if the block ends
    without an exception; otherwise none of them do."""
    folder.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=folder, prefix=".staging-") as tmp:
        yield Path(tmp)
        with art_lock():
            for path in sorted(Path(tmp).iterdir()):
                os.replace(path, folder / path.name)


def api(server, path, payload=None, timeout=30):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(server + path, data=data,
                                     headers={"Content-Type": "application/json"} if data else {})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read()
        return json.loads(body) if body else {}


def render(server, graph, out, timeout=1800):
    pid = api(server, "/prompt", {"prompt": graph, "client_id": "story-recipe"}).get("prompt_id")
    if not pid:
        sys.exit("ComfyUI rejected the graph")
    start = time.time()
    while time.time() - start < timeout:
        entry = api(server, f"/history/{pid}", timeout=10).get(pid)
        if entry:
            if entry.get("status", {}).get("status_str") == "error":
                sys.exit(f"render failed: {json.dumps(entry['status'])[:600]}")
            item = next(i for o in entry["outputs"].values() for i in o.get("images", []))
            query = urllib.parse.urlencode({"filename": item["filename"], "subfolder": item.get("subfolder", ""),
                                            "type": "output"})
            with urllib.request.urlopen(f"{server}/view?{query}", timeout=60) as response:
                out.write_bytes(response.read())
            return
        time.sleep(2)
    sys.exit(f"timed out after {timeout}s")


def contact_sheet(tiles, out, tile=480):
    sheet = Image.new("RGB", (tile * len(tiles), tile + 30), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(tiles):
        sheet.paste(Image.open(path).convert("RGB").resize((tile, tile)), (i * tile, 30))
        draw.text((i * tile + 8, 8), label, fill="black")
    sheet.save(out)


def cmd_character(args):
    canon = load_canon()
    name = character(canon, args.name)["name"].lower()
    manifest = draft_manifest(name, TEMPLATE, RENDER, canon)
    # Every model must be one ComfyUI actually loads under the allowlisted name, or the render isn't the recipe.
    for role, (node, field) in LOADERS.items():
        options = api(args.server, f"/object_info/{node}")[node]["input"]["required"][field][0]
        if MODELS[role]["file"] not in options:
            sys.exit(f"ComfyUI can't see {MODELS[role]['file']} ({node}) -- check extra_model_paths.yaml")
    drafts = STORYBOOK / DRAFTS
    with staging(drafts) as tmp:
        paths = []
        for seed in SEEDS:
            paths.append(tmp / f"{name}-candidate-{seed}.png")
            render(args.server, recipe_graph(manifest, seed, f"storybook/{name}-{seed}"), paths[-1])
            print(f"rendered seed {seed}")
        contact_sheet([(f"seed {s}", p) for s, p in zip(SEEDS, paths)], tmp / f"{name}-contact-sheet.png")
        manifest["comfyui_version"] = api(args.server, "/system_stats", timeout=10).get("system", {}).get(
            "comfyui_version")
        (tmp / f"{name}-recipe.json").write_text(json.dumps(manifest, indent=1))
    print(f"wrote {name}'s candidates, contact sheet and recipe to {DRAFTS} -- pick a seed, then `lock {name}`")


def cmd_lock(args):
    canon = load_canon()
    name = character(canon, args.name)["name"].lower()
    drafts, locked = STORYBOOK / DRAFTS, STORYBOOK / LOCKED
    with art_lock():
        # The draft set is read under the lock, so the recipe and the candidate come from one committed set.
        draft_recipe = drafts / f"{name}-recipe.json"
        if not draft_recipe.is_file():
            sys.exit(f"{DRAFTS}/{draft_recipe.name} is missing -- run `character {name}` first")
        manifest = json.loads(draft_recipe.read_text())
        if args.seed not in manifest.get("seeds", []):
            sys.exit(f"seed {args.seed} is not one of the rendered candidates {manifest.get('seeds')}")
        candidate = drafts / f"{name}-candidate-{args.seed}.png"
        if not candidate.is_file():
            sys.exit(f"{DRAFTS}/{candidate.name} is missing -- run `character {name}` again")
        targets = [locked / f"{name}.png", locked / f"{name}.recipe.json"]
        if any(os.path.lexists(t) for t in targets) and not args.force:
            sys.exit(f"{name} is already locked (use --force to replace it)")
        if any(t.is_symlink() for t in targets):
            sys.exit(f"{name}'s lock is a symlink; a lock writes only real files")
        manifest.update(chosen_seed=args.seed, source=f"{DRAFTS}/{candidate.name}")
        locked.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=locked, prefix=".staging-") as tmp:
            # The candidate is read once, into staging, and the staged copy is what gets validated and committed.
            staged = Path(tmp) / f"{name}.png"
            staged.write_bytes(candidate.read_bytes())
            problems = embedded_problems(staged, manifest, args.seed, canon)
            if problems:
                sys.exit(f"{candidate.name} is not the render its recipe describes: " + "; ".join(problems))
            manifest["files"] = {staged.name: sha256(staged)}
            (Path(tmp) / f"{name}.recipe.json").write_text(json.dumps(manifest, indent=1))
            for path in sorted(Path(tmp).iterdir()):
                os.replace(path, locked / path.name)
    print(f"locked {LOCKED}/{name}.png + .recipe.json")


def locked_problems(canon):
    """[(path, why)] for everything wrong in the locked folder: recipes that don't check out, and files that
    aren't exactly one recipe's."""
    locked, problems, owners = STORYBOOK / LOCKED, [], {}
    if not locked.is_dir():
        return problems
    entries = sorted(locked.iterdir())
    for entry in entries:
        if entry.is_symlink() or not entry.is_file():
            problems.append((entry, "is not a regular file; the locked folder holds only files with a record"))
    for recipe in (e for e in entries if e.name.endswith(".recipe.json") and e.is_file() and not e.is_symlink()):
        owners.setdefault(recipe, []).append(recipe)
        manifest = json.loads(recipe.read_text())
        files = manifest.get("files") if isinstance(manifest.get("files"), dict) else {}
        png = locked / f"{recipe.name.removesuffix('.recipe.json')}.png"
        if set(files) != {png.name}:
            problems.append((recipe, f"it records files {sorted(files)}; a character lock owns {png.name}"))
        for file_name, digest in files.items():
            owners.setdefault(locked / file_name, []).append(recipe)
            if (locked / file_name).is_file() and sha256(locked / file_name) != digest:
                problems.append((recipe, f"{file_name} has changed since it was locked (sha256 differs)"))
        if not png.is_file():
            problems.append((recipe, f"{png.name} is not on disk"))
            continue
        for why in embedded_problems(png, manifest, manifest.get("chosen_seed"), canon):
            problems.append((recipe, why))
        expected_source = f"{DRAFTS}/{manifest.get('name')}-candidate-{manifest.get('chosen_seed')}.png"
        if manifest.get("source") != expected_source:
            problems.append((recipe, "its recorded source is not the draft lock copies for it"))
    for entry in entries:
        claims = owners.get(entry, [])
        if entry.is_file() and not entry.is_symlink() and len(claims) != 1:
            problems.append((entry, "no recipe owns it" if not claims else "more than one recipe claims it"))
    return problems


def cmd_selftest(args):
    canon = load_canon()
    with art_lock():
        problems = locked_problems(canon)
    for path, why in problems:
        print(f"FAIL {path.relative_to(STORYBOOK)}: {why}")
    locks = sorted((STORYBOOK / LOCKED).glob("*.recipe.json")) if (STORYBOOK / LOCKED).is_dir() else []
    print(f"{len(locks)} character locks checked against {CANON}; {len(problems)} problems")
    sys.exit(1 if problems else 0)


def main():
    global STORYBOOK
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--storybook", type=Path, default=STORYBOOK, help="storybook root (the tests use a copy)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("character").add_argument("name")
    lk = sub.add_parser("lock")
    lk.add_argument("name")
    lk.add_argument("--seed", type=int, required=True)
    lk.add_argument("--force", action="store_true")
    sub.add_parser("selftest")
    args = ap.parse_args()
    STORYBOOK = args.storybook.resolve()
    args.server = args.server.rstrip("/")
    try:
        {"character": cmd_character, "lock": cmd_lock, "selftest": cmd_selftest}[args.cmd](args)
    except urllib.error.URLError as error:
        sys.exit(f"ComfyUI at {args.server} is unreachable ({error.reason}); nothing was written")


if __name__ == "__main__":
    main()
