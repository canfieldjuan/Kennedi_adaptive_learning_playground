#!/usr/bin/env python3
"""Reproducible coloring-book illustrations: the locked FLUX recipe as one tool.

  candidates animal bunny --pose sitting --shading "body and long ears" \
      --accent "fur texture accent lines on the ears and fluffy tail"
      Render the four standard seeds, a contact sheet, and a recipe manifest into drafts/.
  lock animal bunny --seed 83
      Vectorize the chosen candidate into the locked folder, with its recipe alongside recording each file's
      SHA-256. A lock replaces only the lock of its own kind at its name, never another asset's files.
  colorize design-source/animals/locked-poses/bunny-01-sitting.png \
      --colors "soft white fur with light warm-grey shading, pink inner ears and a pink nose" [--recipe v2]
      Render Mode A color candidates of a locked animal, guided by its line art so it stays the same character.
  lock animal bunny --seed 72 --color
      Lock a color candidate as <line-art-name>-color.png (raster, not vectorized).
  reproduce design-source/animals/locked-poses/dog-01-sitting.png
      Re-render a locked asset from the graph embedded in its PNG and compare pixels.
  selftest
      Check every file in the locked folders: each has one owner (a lock's recipe or a legacy entry), its bytes
      are the ones recorded, each recipe still rebuilds its render, and each legacy entry's rebuild route
      holds (no ComfyUI needed; the workbook CI gate runs it).

Needs numpy and Pillow; lock also needs ImageMagick and potrace (vectorize-line-art.sh). candidates, colorize
and reproduce render on a running ComfyUI (--server, default http://127.0.0.1:8188); selftest needs no ComfyUI.
"""
import argparse
import contextlib
import hashlib
import importlib.util
import json
import os
import re
import string
import subprocess
import sys
import tempfile
import urllib.request
import uuid
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

WORKBOOK = Path(__file__).resolve().parents[1]
SEEDS = (61, 72, 83, 94)
STEPS = 28
SIZE = 1024

TEMPLATES = {
    "animal": ("a single cute cartoon {subject} {pose}, children's coloring book clipart style, confident "
               "clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive "
               "eyes, soft airbrushed gray shading gradient for roundness on the {shading}, {accent} drawn with the "
               "same bold black line weight, centered on plain white background, simple flat 2D illustration, no "
               "text, no color"),
    "object": ("children's coloring book clipart of a single {subject}, one confident clean single-stroke black "
               "outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), {accent} "
               "drawn with the same bold black line weight, soft airbrushed gray shading gradient on {shading} for "
               "roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, "
               "no character, no text, no color"),
}
FOLDERS = {"animal": ("animals/drafts", "animals/locked-poses"), "object": ("objects/drafts", "objects/locked")}
# Every folder of approved art. Boss Kennedi has no drafts folder and is never written by this tool, but it is
# locked art all the same: reproductions must not land in it, and its PNGs must be accounted for.
LOCKED_ROOTS = [locked for _, locked in FOLDERS.values()] + ["boss-kennedi/locked-poses"]
SAFE_NAME = re.compile(r"[a-z0-9][a-z0-9-]*")        # names this tool builds file names from
SAFE_FILE = re.compile(r"[a-z0-9][a-z0-9.-]*")        # the file names themselves

# Mode A color, in the cover's style wording (design-source/scenes/cover-concept-c-final.png).
COLOR_TEMPLATE = ("Full color flat children's book illustration, warm soft palette, gentle shading and soft shadows, "
                  "a single cute cartoon {subject} {pose}, {colors}, big round expressive dark eyes, happy smile, "
                  "clean bold outlines, charming storybook illustration style, pure white background, centered "
                  "composition, no text")
GUIDE_INK = 180               # the print vectorizer's 70% threshold: what counts as a line
CONTROLNET = "diffusion_pytorch_model.safetensors"    # Shakker-Labs FLUX.1-dev-ControlNet-Union-Pro-2.0
# Color recipe versions are never edited: a locked asset must keep rebuilding from its recipe, so each version
# holds every setting its renders used. v1 blurred the guide, and the ControlNet copied that softness: most
# renders came out blurry (bunny, bear, turtle 3 of 4 seeds, penguin 4 of 4). Changing one factor at a time on
# penguin seed 83 showed the blur alone was the cause (edge sharpness 2.4 -> 134.7; lower strength or an earlier
# end changed nothing), so v2 only stops blurring it. 0.7 / 0.8 are Union-Pro 2.0's suggested soft-edge settings.
COLOR_RECIPES = {
    "v1": {"guide_blur": 1.5, "controlnet": CONTROLNET, "strength": 0.7, "end_percent": 0.8},
    "v2": {"guide_blur": 0.0, "controlnet": CONTROLNET, "strength": 0.7, "end_percent": 0.8},
}
COLOR_DEFAULT = "v2"
# Keys a recipe gains outside draft_manifest(): the ComfyUI version noted when it rendered, a color recipe's
# guide path, and what `lock` adds. Any other key must be one draft_manifest() records, with the same value.
ADDED_KEYS = {"comfyui_version", "chosen_seed", "source", "files"}

# Locked art the tool didn't render: made before it existed, or by a documented process (the Boss Kennedi face
# and hair composite). Each entry records the SHA-256 of its files and how they are rebuilt. Every file in a
# locked folder has exactly one owner, a lock's recipe or one of these entries, so a deleted recipe or a
# rewritten file can't slip past selftest.
LEGACY_BASELINE = "design-source/legacy-locked-assets.json"

# Locked before the tool wrote recipes: the templates must still rebuild their prompts.
LEGACY_TEMPLATE_CHECKS = [
    ("animal", "animals/locked-poses/dog-01-sitting.png",
     dict(subject="puppy", pose="sitting", shading="body and ears",
          accent="fur texture accent lines on the ears and tail")),
    ("object", "objects/locked/house.png",
     dict(subject="simple house with a triangular roof", shading="the roof",
          accent="a door, a window, and a chimney")),
]


def load_comfy(server):
    sys.dont_write_bytecode = True    # keep tools/ free of __pycache__
    spec = importlib.util.spec_from_file_location("comfy_generate", WORKBOOK / "tools/comfy-generate.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.COMFY = server.rstrip("/")
    return mod


def upload(comfy, path, name):
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + Path(path).read_bytes() + \
        f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"{comfy.COMFY}/upload/image", data=body,
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        stored = json.loads(r.read())
    if stored.get("name") != name or stored.get("subfolder"):
        sys.exit(f"ComfyUI stored the guide as {stored}, not as {name!r}")


def without_cache_keys(graph):
    # ComfyUI stamps each LoadImage node with is_changed = [sha256 of the image] when it saves the graph.
    return {k: {key: value for key, value in node.items() if key != "is_changed"} for k, node in graph.items()}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def check_guide(graph, guide):
    # The guide on disk must be the exact file the asset was rendered from, or a re-render is a different image.
    # No fingerprint is no evidence, so it fails rather than passes.
    digest = sha256(guide)
    return all(node.get("is_changed") == [digest] for node in graph.values() if node["class_type"] == "LoadImage")


def file_identity(path):
    # Symlinks and hard links to one file share an inode; a file that doesn't exist yet is its path.
    path = Path(path).resolve()
    try:
        stat = path.stat()
    except FileNotFoundError:
        return path
    return stat.st_dev, stat.st_ino


def locked_folders():
    return [WORKBOOK / "design-source" / rel for rel in LOCKED_ROOTS]


def safe_name(value, what):
    # File names are built from these, so anything but lowercase letters, digits and hyphens is refused:
    # a path fragment would put the output somewhere else entirely.
    if not SAFE_NAME.fullmatch(value or ""):
        sys.exit(f"{what} {value!r} must be lowercase letters, digits and hyphens; paths are built from it")
    return value


class Outputs:
    """The one place this tool writes files.

    A command says which folder it may write into and which files it read. Every write then goes to a
    validated name in that folder, never to a file the command read, and lands by rename from a staging
    folder beside it: a failure part-way leaves what was there untouched. Only `lock` may write into a
    locked folder. The checks each command used to carry live here instead, so a new command cannot
    quietly skip one.
    """

    def __init__(self, folder, inputs=(), into_locked=False):
        self.folder = Path(folder).resolve()
        locked = [f.resolve() for f in locked_folders()]
        inside_locked = self.folder in locked or any(f in self.folder.parents for f in locked)
        if into_locked and self.folder not in locked:
            sys.exit(f"{self.folder} is not a locked folder, so `lock` will not write there")
        if not into_locked and inside_locked:
            sys.exit(f"{self.folder} is a locked folder; only `lock` writes there")
        self.inputs = {file_identity(p) for p in inputs}

    def target(self, name, validate=True):
        if validate and not SAFE_FILE.fullmatch(name):
            sys.exit(f"{name!r} is not a file name this tool will write: lowercase letters, digits, - and .")
        target = self.folder / name
        if target.parent.resolve() != self.folder:
            sys.exit(f"{target} would fall outside {self.folder}")
        if file_identity(target) in self.inputs:
            sys.exit(f"{target} is an input of this command; writing it would destroy that input")
        return target

    @contextlib.contextmanager
    def staging(self):
        """Everything written in the block moves into place together when it ends without an exception."""
        self.folder.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=self.folder, prefix=".staging-") as tmp:
            batch = _Staging(self, Path(tmp))
            yield batch
            for name in batch.names:
                os.replace(Path(tmp) / name, self.folder / name)

    def write(self, name, write, validate=True):
        """One file, written atomically."""
        with self.staging() as batch:
            path = batch.file(name, validate)
            write(path)
        return self.folder / name


class _Staging:
    def __init__(self, outputs, tmp):
        self.outputs, self.tmp, self.names = outputs, tmp, []

    def file(self, name, validate=True):
        self.outputs.target(name, validate)      # refuses before anything is written
        self.names.append(name)
        return self.tmp / name


def render(comfy, graph, out, timeout=600):
    import time
    import urllib.parse
    res = comfy.api("/prompt", {"prompt": graph, "client_id": "illustration-recipe"})
    if "prompt_id" not in res:
        sys.exit(f"ComfyUI rejected the graph: {json.dumps(res)[:800]}")
    pid, start = res["prompt_id"], time.time()
    while time.time() - start < timeout:
        entry = comfy.api(f"/history/{pid}", timeout=10).get(pid)
        if entry:
            if entry.get("status", {}).get("status_str") == "error":
                sys.exit(f"render failed: {json.dumps(entry['status'])[:800]}")
            item = next(i for o in entry["outputs"].values() for i in o.get("images", []))
            q = urllib.parse.urlencode({"filename": item["filename"], "subfolder": item.get("subfolder", ""),
                                        "type": "output"})
            comfy.download(f"{comfy.COMFY}/view?{q}", str(out))
            return
        time.sleep(2)
    sys.exit(f"timed out after {timeout}s")


def recipe_graph(recipe, comfy, seed, guide_name=None, prefix=None):
    """The graph a recipe renders at a seed, built from what the recipe records and nothing else.

    The guide's name and the output prefix decide which file is loaded and what the output is called, not its
    pixels: the guide's content is bound by its fingerprint instead.
    """
    if recipe["kind"] != "animal-color":
        return comfy.build_graph(recipe["prompt"], recipe["size"], recipe["size"], seed, recipe["steps"], None)
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "flux1-dev-Q8_0.gguf"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
                                                         "clip_name2": "clip_l.safetensors", "type": "flux"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": recipe["prompt"]}},
        "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["4", 0], "guidance": 3.5}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": ""}},
        "10": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": recipe["controlnet"]}},
        "11": {"class_type": "LoadImage", "inputs": {"image": guide_name}},
        "12": {"class_type": "ControlNetApplyAdvanced", "inputs": {
            "positive": ["5", 0], "negative": ["6", 0], "control_net": ["10", 0], "image": ["11", 0],
            "strength": recipe["strength"], "start_percent": 0.0, "end_percent": recipe["end_percent"],
            "vae": ["3", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": recipe["size"], "height": recipe["size"],
                                                               "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["12", 0], "negative": ["12", 1],
                                                   "latent_image": ["7", 0], "seed": seed, "steps": recipe["steps"],
                                                   "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple",
                                                   "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "13": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


def color_guide_name(name):
    return f"{name}-color-guide.png"


def guide_recipe(blur):
    return f"line art grey < {GUIDE_INK} -> white lines on black" + (f", Gaussian blur {blur}" if blur else ", not blurred")


def draft_manifest(kind, name, fields, comfy, recipe_version=None, source_line_art=None):
    """Everything a recipe records about how its candidates render, built from its inputs alone.

    `candidates` and `colorize` write what this returns, and `embedded_problems()` rebuilds it from a recipe's
    inputs and compares every key, so no recorded value can say something its render doesn't.
    """
    if kind != "animal-color":
        manifest = {"kind": kind, "name": name, "template": TEMPLATES[kind], "fields": fields,
                    "prompt": TEMPLATES[kind].format(**fields), "seeds": list(SEEDS), "steps": STEPS, "size": SIZE}
        manifest["graph"] = recipe_graph(manifest, comfy, 0)
        return manifest
    version = COLOR_RECIPES[recipe_version]
    manifest = {"kind": kind, "name": name, "recipe_version": recipe_version, "template": COLOR_TEMPLATE,
                "fields": fields, "prompt": COLOR_TEMPLATE.format(**fields), "source_line_art": source_line_art,
                "guide_recipe": guide_recipe(version["guide_blur"]), "controlnet": version["controlnet"],
                "strength": version["strength"], "end_percent": version["end_percent"],
                "seeds": list(SEEDS), "steps": STEPS, "size": SIZE}
    manifest["graph"] = recipe_graph(manifest, comfy, 0, color_guide_name(name), f"{name}-color")
    return manifest


def recipe_inputs(manifest):
    """The inputs `draft_manifest()` rebuilds a recipe from, or the reason it can't."""
    kind = manifest.get("kind")
    template = COLOR_TEMPLATE if kind == "animal-color" else TEMPLATES.get(kind)
    if template is None:
        return None, f"its kind {kind!r} is not one the tool renders"
    fields = manifest.get("fields")
    wanted = {f for _, f, _, _ in string.Formatter().parse(template) if f}
    if not isinstance(fields, dict) or set(fields) != wanted:
        return None, f"its fields must be exactly {sorted(wanted)}"
    inputs = dict(kind=kind, name=manifest.get("name"), fields=fields)
    if kind == "animal-color":
        if manifest.get("recipe_version") not in COLOR_RECIPES:
            return None, f"its recipe_version {manifest.get('recipe_version')!r} is not one of {sorted(COLOR_RECIPES)}"
        inputs.update(recipe_version=manifest["recipe_version"], source_line_art=manifest.get("source_line_art"))
    return inputs, None


def make_guide(line_art, blur, out):
    # Soft-edge guides are white lines on black: the locked art's print lines.
    grey = np.array(Image.open(line_art).convert("L"))
    lines = Image.fromarray(np.where(grey < GUIDE_INK, 255, 0).astype(np.uint8))
    (lines.filter(ImageFilter.GaussianBlur(blur)) if blur else lines).convert("RGB").save(out)


def contact_sheet(tiles, out, tile=480):
    sheet = Image.new("RGB", (tile * len(tiles), tile + 30), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(tiles):
        sheet.paste(Image.open(path).convert("RGB").resize((tile, tile)), (i * tile, 30))
        draw.text((i * tile + 8, 8), label, fill="black")
    sheet.save(out)


def fields(args):
    f = dict(subject=args.subject or args.name, shading=args.shading, accent=args.accent)
    if args.kind == "animal":
        if not args.pose:
            sys.exit("animals need --pose")
        f["pose"] = args.pose
    return f


def cmd_candidates(args):
    safe_name(args.name, "the name")
    outputs = Outputs(WORKBOOK / "design-source" / FOLDERS[args.kind][0])
    comfy = load_comfy(args.server)
    manifest = draft_manifest(args.kind, args.name, fields(args), comfy)
    paths = []
    for seed in SEEDS:
        graph = recipe_graph(manifest, comfy, seed)
        out = outputs.write(f"{args.name}-candidate-{seed}.png", lambda p, g=graph: render(comfy, g, p))
        paths.append(out)
        print(f"wrote {out.relative_to(WORKBOOK)}")

    sheet_path = outputs.write(f"{args.name}-contact-sheet.png",
                               lambda p: contact_sheet([(f"seed {s}", c) for s, c in zip(SEEDS, paths)], p))

    stats = comfy.api("/system_stats", timeout=10).get("system", {})
    manifest["comfyui_version"] = stats.get("comfyui_version")
    outputs.write(f"{args.name}-recipe.json", lambda p: p.write_text(json.dumps(manifest, indent=1)))
    print(f"wrote {sheet_path.relative_to(WORKBOOK)} and {args.name}-recipe.json -- pick a seed, then `lock`")


def cmd_colorize(args):
    line_art = Path(args.png).resolve()
    if WORKBOOK not in line_art.parents:
        sys.exit(f"{line_art} is outside {WORKBOOK}; the recipe records workbook-relative paths")
    source_recipe = line_art.with_suffix(".recipe.json")
    if not source_recipe.exists():
        sys.exit(f"{source_recipe} not found -- colorize works from an asset locked by this tool")
    source = json.loads(source_recipe.read_text())
    if source["kind"] != "animal":
        sys.exit(f"colorize supports animals only (the color template needs a pose); this is {source['kind']!r}")
    name = safe_name(source["name"], f"the name in {source_recipe.name}")
    color_fields = dict(subject=source["fields"]["subject"], pose=source["fields"]["pose"], colors=args.colors)
    drafts = WORKBOOK / "design-source" / FOLDERS["animal"][0]
    outputs = Outputs(drafts, inputs=[line_art])
    comfy = load_comfy(args.server)
    manifest = draft_manifest("animal-color", name, color_fields, comfy, args.recipe,
                              str(line_art.relative_to(WORKBOOK)))
    controlnets = comfy.api("/object_info/ControlNetLoader")["ControlNetLoader"]["input"]["required"]
    if manifest["controlnet"] not in controlnets["control_net_name"][0]:
        sys.exit(f"ControlNet {manifest['controlnet']} is not visible to ComfyUI -- check extra_model_paths.yaml")

    blur = COLOR_RECIPES[args.recipe]["guide_blur"]
    guide = outputs.write(color_guide_name(name), lambda p: make_guide(line_art, blur, p))
    upload(comfy, guide, guide.name)

    paths = []
    for seed in SEEDS:
        graph = recipe_graph(manifest, comfy, seed, guide.name, f"{name}-color-{seed}")
        out = outputs.write(f"{name}-color-candidate-{seed}.png", lambda p, g=graph: render(comfy, g, p))
        paths.append(out)
        print(f"wrote {out.relative_to(WORKBOOK)}")

    sheet_path = outputs.write(f"{name}-color-contact-sheet.png", lambda p: contact_sheet(
        [("locked line art", line_art)] + [(f"color seed {s}", c) for s, c in zip(SEEDS, paths)], p))
    stats = comfy.api("/system_stats", timeout=10).get("system", {})
    manifest.update(guide=str(guide.relative_to(WORKBOOK)), comfyui_version=stats.get("comfyui_version"))
    outputs.write(f"{name}-color-recipe.json", lambda p: p.write_text(json.dumps(manifest, indent=1)))
    print(f"wrote {sheet_path.relative_to(WORKBOOK)} and {name}-color-recipe.json -- pick a seed, "
          f"then `lock animal {name} --seed N --color`")


def cmd_lock(args):
    if args.color and args.kind != "animal":
        sys.exit("--color locks come from colorize, which supports animals only")
    drafts_rel, locked_rel = FOLDERS[args.kind]
    drafts, locked = WORKBOOK / "design-source" / drafts_rel, WORKBOOK / "design-source" / locked_rel
    tag = f"{args.name}-color" if args.color else args.name
    manifest = json.loads((drafts / f"{tag}-recipe.json").read_text())
    if args.seed not in manifest["seeds"]:
        sys.exit(f"seed {args.seed} is not one of the rendered candidates {manifest['seeds']}")
    src = drafts / f"{tag}-candidate-{args.seed}.png"
    safe_name(args.name, "the name")
    if args.locked_name:
        stem = safe_name(args.locked_name, "--locked-name")
    elif args.color:
        stem = f"{Path(manifest['source_line_art']).stem}-color"
    elif args.kind == "animal":
        # The pose is free text ("swimming, large and ..."), so only its first word's letters name the file.
        word = re.sub(r"[^a-z0-9]", "", manifest["fields"]["pose"].split()[0].lower())
        stem = safe_name(f"{args.name}-01-{word}", f"the name built from pose {manifest['fields']['pose']!r}")
    else:
        stem = args.name
    outputs = Outputs(locked, inputs=[src], into_locked=True)
    png = outputs.target(f"{stem}.png")
    if png.exists() and not args.force:
        sys.exit(f"{png.relative_to(WORKBOOK)} already exists (use --force to replace)")
    # A lock replaces only the lock of its own kind at this name. Any other file there belongs to another
    # asset: line art, a color lock, its guide, or legacy art. --force does not reach those.
    recipe = locked / f"{stem}.recipe.json"
    own = recipe if recipe.exists() and json.loads(recipe.read_text()).get("kind") == manifest["kind"] else None
    owners = locked_owners()
    for name in [png.name, f"{stem}-guide.png" if args.color else f"{stem}.svg", recipe.name]:
        target = outputs.target(name)
        claims = owners.get(target.resolve(), [])
        if (target.exists() or claims) and (own is None or claims != [own]):
            held_by = ", ".join(owner_label(c) for c in claims) or "nothing (it has no owner)"
            sys.exit(f"{target.relative_to(WORKBOOK)} belongs to {held_by}, not to a {manifest['kind']} lock at "
                     f"{stem}; a lock replaces only its own files -- choose another --locked-name")
    if png.exists() and not args.color:
        # A colour lock's guide is rebuilt from this line art, so replacing it would break that lock.
        rel = str(png.relative_to(WORKBOOK))
        dependents = [r.name for r in sorted(locked.glob("*.recipe.json"))
                      if json.loads(r.read_text()).get("source_line_art") == rel]
        if dependents:
            sys.exit(f"{rel} is the source of {', '.join(dependents)}; re-run colorize and lock those after "
                     f"replacing it, or delete them first")
    if not src.exists():
        sys.exit(f"{src.relative_to(WORKBOOK)} is missing -- re-run the candidates")
    manifest.update(chosen_seed=args.seed, source=str(src.relative_to(WORKBOOK)))
    # The candidate must be exactly the render this recipe describes: a re-render, a stale manifest or a
    # rewritten draft guide would otherwise lock an asset its recipe can't reproduce.
    draft_guide = WORKBOOK / manifest["guide"] if args.color else None
    problems = embedded_problems(src, manifest, args.seed, load_comfy(args.server), draft_guide)
    if problems:
        sys.exit(f"{src.name} is not the render its recipe describes: " + "; ".join(problems))
    # The whole lock set is built aside and moves into place together, so a failed vectorizer or write
    # never leaves an approved lock half-replaced.
    with outputs.staging() as batch:
        batch.file(f"{stem}.png").write_bytes(src.read_bytes())
        if args.color:
            # The lock owns an exact copy of its guide: colorize rewrites the draft guide on every run.
            batch.file(f"{stem}-guide.png").write_bytes(draft_guide.read_bytes())
            manifest["guide"] = str((locked / f"{stem}-guide.png").relative_to(WORKBOOK))
        # Mode A color art is used as a raster; only print line art is vectorized.
        if not args.color:
            subprocess.run(["bash", str(WORKBOOK / "tools/vectorize-line-art.sh"), str(batch.tmp / f"{stem}.png"),
                            str(batch.file(f"{stem}.svg")), "70"], check=True)
        # The recipe owns exactly the files written beside it, and records their bytes.
        manifest["files"] = {name: sha256(batch.tmp / name) for name in batch.names}
        batch.file(recipe.name).write_text(json.dumps(manifest, indent=1))
    extras = " + .svg" if not args.color else " + guide"
    print(f"locked {png.relative_to(WORKBOOK)}{extras} + .recipe.json")


def reproduce_inputs(png):
    """(graph, guide, None) when `reproduce` can re-render png, or (None, None, why it can't).

    `selftest` asks the same question of every legacy asset recorded as rebuilt by `reproduce`.
    """
    info = Image.open(png).info
    if "prompt" not in info:
        return None, None, "it has no embedded graph to re-render (made by a process outside this tool?)"
    graph = json.loads(info["prompt"])
    # A guided (color) render loads its guide image, which ComfyUI must have under the name in the graph:
    # without the recipe naming it, the server could silently use a stale file of that name.
    recipe = png.with_suffix(".recipe.json")
    guide = json.loads(recipe.read_text()).get("guide") if recipe.exists() else None
    guided = any(node["class_type"] == "LoadImage" for node in graph.values())
    if guided and not guide:
        return None, None, f"it loads a guide image, but no {recipe.name} names it"
    if guide:
        if not (WORKBOOK / guide).exists():
            return None, None, f"its guide image {guide} is missing"
        if not check_guide(graph, WORKBOOK / guide):
            return None, None, f"guide image {guide} is not the file it was rendered from (sha256 differs)"
    return graph, guide, None


def cmd_reproduce(args):
    original = Path(args.png).resolve()
    graph, guide, refused = reproduce_inputs(original)
    if refused:
        sys.exit(f"{original.name}: {refused} -- refusing to render")

    # A locked asset's reproduction belongs in that kind's drafts folder: Outputs refuses a locked one.
    drafts = next((WORKBOOK / "design-source" / d for d, l in FOLDERS.values()
                   if original.parent == WORKBOOK / "design-source" / l), original.parent)
    out = (Path(args.out) if args.out else drafts / f"{original.stem}.reproduced.png").resolve()
    outputs = Outputs(out.parent, inputs=[original] + ([WORKBOOK / guide] if guide else []))

    comfy = load_comfy(args.server)
    if guide:
        for node in graph.values():
            if node["class_type"] == "LoadImage":
                upload(comfy, WORKBOOK / guide, node["inputs"]["image"])
    outputs.write(out.name, lambda p: render(comfy, without_cache_keys(graph), p), validate=False)
    a = np.asarray(Image.open(original).convert("RGBA"), dtype=int)
    b = np.asarray(Image.open(out).convert("RGBA"), dtype=int)
    diff = np.abs(a - b).max(axis=-1)    # every channel, so a hue change that keeps brightness still counts
    ink_a = np.asarray(Image.open(original).convert("L")) < 180    # the vectorizer's 70% threshold
    ink_b = np.asarray(Image.open(out).convert("L")) < 180
    print(f"wrote {out}")
    print(f"pixels differing: {100 * (diff > 0).mean():.3f}% | max diff {diff.max()} | mean diff {diff.mean():.3f}")
    print(f"print ink (after threshold) differing: {100 * (ink_a ^ ink_b).mean():.3f}% of pixels")


def embedded_graph(png):
    graph = json.loads(Image.open(png).info["prompt"])
    prompt = next(n["inputs"]["text"] for n in graph.values()
                  if n["class_type"] == "CLIPTextEncode" and n["inputs"]["text"])
    sampler = next(n["inputs"] for n in graph.values() if n["class_type"] == "KSampler")
    return graph, prompt, sampler


def embedded_problems(png, manifest, seed, comfy, guide=None):
    """Why png is not the render its recipe describes at this seed; an empty list when it is.

    The recipe is rebuilt from its inputs by draft_manifest(), the function that writes recipes, and compared
    key by key, so everything a recipe records is checked, including what a later version starts recording.
    The PNG's embedded graph must then be the one that rebuilt recipe renders at this seed.
    """
    inputs, refused = recipe_inputs(manifest)
    if refused:
        return [refused]
    expected = draft_manifest(comfy=comfy, **inputs)
    color = manifest["kind"] == "animal-color"
    added = ADDED_KEYS | ({"guide"} if color else set())
    problems = []
    for key in sorted(set(manifest) | set(expected)):
        if key in expected and key not in manifest:
            problems.append(f"it does not record {key}")
        elif key in expected and manifest[key] != expected[key]:
            problems.append(f"its recorded {key} is not what the tool records for these inputs")
        elif key not in expected and key not in added:
            problems.append(f"it records {key}, which the tool does not")
    if "prompt" not in Image.open(png).info:
        return problems + [f"{png.name} has no embedded graph"]
    graph = json.loads(Image.open(png).info["prompt"])
    nodes = {node["class_type"]: node["inputs"] for node in graph.values()}
    if nodes.get("KSampler", {}).get("seed") != seed:
        problems.append(f"it was rendered at seed {nodes.get('KSampler', {}).get('seed')}, not {seed}")
    rendered = recipe_graph(expected, comfy, seed, nodes.get("LoadImage", {}).get("image"),
                            nodes.get("SaveImage", {}).get("filename_prefix"))
    if without_cache_keys(graph) != without_cache_keys(rendered):
        problems.append(f"its embedded graph is not the one its recipe renders at seed {seed}")
    if color:
        if guide is None or not guide.exists():
            problems.append(f"its guide {manifest.get('guide')} is missing")
        elif not check_guide(graph, guide):
            problems.append(f"guide {guide.relative_to(WORKBOOK)} is not the file it was rendered from")
    return problems


def file_problems(folder, files, owns):
    """Where the files a manifest records differ from the ones it should own, or from their bytes on disk."""
    if not isinstance(files, dict):
        return ["it records no files and their SHA-256"]
    problems = [] if set(files) == owns else [f"it records files {sorted(files)}; it should own {sorted(owns)}"]
    for name in sorted(set(files) & owns):
        if not (folder / name).exists():
            problems.append(f"{name} is not on disk")
        elif sha256(folder / name) != files[name]:
            problems.append(f"{name} has changed since it was recorded (sha256 differs)")
    return problems


def check_locked(recipe_path, comfy):
    """What stops a locked asset rebuilding from its recipe, or its files being the ones it wrote."""
    manifest = json.loads(recipe_path.read_text())
    folder, stem = recipe_path.parent, recipe_path.name.removesuffix(".recipe.json")
    png = folder / f"{stem}.png"
    color = manifest.get("kind") == "animal-color"
    guide = WORKBOOK / manifest["guide"] if color and manifest.get("guide") else None
    if color and (guide is None or guide.parent != folder):
        return [f"its guide {manifest.get('guide')} is outside the lock folder, where colorize can overwrite it"]
    problems = file_problems(folder, manifest.get("files"), {png.name, guide.name if color else f"{stem}.svg"})
    if not png.exists():
        return problems
    if manifest.get("chosen_seed") not in SEEDS:
        problems.append(f"its chosen_seed {manifest.get('chosen_seed')!r} is not one of the rendered seeds")
    problems += embedded_problems(png, manifest, manifest.get("chosen_seed"), comfy, guide)
    if not color or not guide.exists() or manifest.get("recipe_version") not in COLOR_RECIPES:
        return problems
    # The guide itself must come back from the line art, by the recipe version's own rule.
    line_art = WORKBOOK / str(manifest.get("source_line_art"))
    if not line_art.is_file():
        return problems + [f"its source line art {manifest.get('source_line_art')} is missing"]
    # Pixels, not bytes: the guide's bytes are already bound by its fingerprint and its recorded digest, and a
    # PNG encoder on another machine can write the same pixels differently.
    version = manifest["recipe_version"]
    with tempfile.TemporaryDirectory() as tmp:
        rebuilt = Path(tmp) / "guide.png"
        make_guide(line_art, COLOR_RECIPES[version]["guide_blur"], rebuilt)
        a, b = Image.open(rebuilt), Image.open(guide)
        if (a.mode, a.size) != (b.mode, b.size) or not np.array_equal(np.asarray(a), np.asarray(b)):
            problems.append(f"recipe {version} no longer rebuilds its guide from {manifest['source_line_art']}")
    return problems


def legacy_entries():
    path = WORKBOOK / LEGACY_BASELINE
    return json.loads(path.read_text()) if path.exists() else None


def legacy_problems(key, entry):
    """What is wrong with one legacy entry: its files, or the way it says they are rebuilt."""
    png = WORKBOOK / "design-source" / key
    if png.suffix != ".png" or png.parent.resolve() not in {f.resolve() for f in locked_folders()}:
        return [f"{key} is not a PNG in a locked folder"]
    if not isinstance(entry, dict) or set(entry) - {"files", "rebuild", "record"}:
        return ["an entry records only files, rebuild and, when documented, record"]
    svg = png.with_suffix(".svg")
    owns = {png.name} | ({svg.name} if svg.exists() or svg.name in (entry.get("files") or {}) else set())
    problems = file_problems(png.parent, entry.get("files"), owns)
    rebuild, record = entry.get("rebuild"), entry.get("record")
    if rebuild == "reproduce":
        if record is not None:
            problems.append("record applies only to rebuild: documented")
        _, _, refused = reproduce_inputs(png) if png.exists() else (None, None, None)
        if refused:
            problems.append(f"it is recorded as rebuilt by `reproduce`, but reproduce refuses it: {refused}")
    elif rebuild == "documented":
        path = (WORKBOOK / record).resolve() if isinstance(record, str) and record else None
        if path is None or WORKBOOK not in path.parents or not path.is_file():
            problems.append(f"its rebuild record {record!r} is not a file in the workbook")
    else:
        problems.append(f"its rebuild is {rebuild!r}; it must be 'reproduce' or 'documented'")
    return problems


def locked_owners():
    """{file: [owners]} for every file a manifest claims in the locked folders.

    An owner is a lock's recipe (as a path) or a legacy entry (as its key). A lock owns its recipe and the
    files the recipe records; a legacy entry owns the files it records. selftest needs exactly one owner for
    every file in a locked folder, and `lock` writes only files the lock it replaces owns.
    """
    claims = {}
    for folder in locked_folders():
        for recipe in sorted(folder.glob("*.recipe.json")):
            files = json.loads(recipe.read_text()).get("files")
            for path in [recipe] + [folder / name for name in (files if isinstance(files, dict) else {})]:
                claims.setdefault(path.resolve(), []).append(recipe)
    entries = legacy_entries()
    for key, entry in sorted(entries.items() if isinstance(entries, dict) else []):
        files = entry.get("files") if isinstance(entry, dict) else None
        for name in files if isinstance(files, dict) else {}:
            claims.setdefault(((WORKBOOK / "design-source" / key).parent / name).resolve(), []).append(key)
    return claims


def owner_label(owner):
    return str(owner.relative_to(WORKBOOK)) if isinstance(owner, Path) else f"the legacy entry {owner}"


def cmd_selftest(args):
    ok = True
    for kind, rel, f in LEGACY_TEMPLATE_CHECKS:
        png = WORKBOOK / "design-source" / rel
        if not png.exists():
            ok = False
            print(f"FAIL template {rel}: missing, so the {kind} template has nothing to check against")
            continue
        if "prompt" not in Image.open(png).info:
            ok = False
            print(f"FAIL template {rel}: it has no embedded graph, so the {kind} template has nothing to check against")
            continue
        _, prompt, sampler = embedded_graph(png)
        match = TEMPLATES[kind].format(**f) == prompt and sampler["seed"] in SEEDS and sampler["steps"] == STEPS
        ok &= match
        print(f"{'OK  ' if match else 'FAIL'} template {rel} (seed {sampler['seed']}, made before recipes)")

    comfy = load_comfy(args.server)     # only for its graph builder; nothing is sent to ComfyUI
    source = WORKBOOK / "design-source"
    for recipe in sorted(r for folder in locked_folders() for r in folder.glob("*.recipe.json")):
        problems = check_locked(recipe, comfy)
        ok &= not problems
        print(f"{'FAIL' if problems else 'OK  '} recipe   {recipe.relative_to(source)}"
              + (": " + "; ".join(problems) if problems else ""))

    entries = legacy_entries()
    if not isinstance(entries, dict):
        ok = False
        print(f"FAIL {LEGACY_BASELINE} is {'missing' if entries is None else 'not an object keyed by PNG path'}, "
              f"so no legacy asset is accounted for")
        entries = {}
    for key, entry in sorted(entries.items()):
        problems = legacy_problems(key, entry)
        ok &= not problems
        if problems:
            print(f"FAIL legacy   {key}: " + "; ".join(problems))

    owners = locked_owners()
    for path in sorted(p for folder in locked_folders() if folder.is_dir() for p in folder.iterdir() if p.is_file()):
        claims = owners.get(path.resolve(), [])
        if len(claims) != 1:
            ok = False
            print(f"FAIL locked   {path.relative_to(source)}: " + (
                "no recipe or legacy entry owns it -- was its recipe deleted?" if not claims
                else "claimed by " + " and ".join(owner_label(c) for c in claims)))
    print(f"{len(entries)} legacy assets in {LEGACY_BASELINE}: their bytes and rebuild route are checked, "
          f"their renders are not")
    sys.exit(0 if ok else 1)


def main():
    global WORKBOOK
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--workbook", type=Path, default=WORKBOOK,
                    help="workbook root to work in (the tests point this at a copy)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("candidates")
    c.add_argument("kind", choices=TEMPLATES)
    c.add_argument("name")
    c.add_argument("--subject", help="defaults to NAME")
    c.add_argument("--pose", help="animals only, e.g. 'sitting'")
    c.add_argument("--shading", required=True, help="where the gray roundness shading goes")
    c.add_argument("--accent", required=True, help="detail lines drawn at the same bold weight")
    col = sub.add_parser("colorize")
    col.add_argument("png", help="a locked line-art PNG with its .recipe.json alongside")
    col.add_argument("--colors", required=True, help="fur and feature colors, e.g. 'soft white fur, pink inner ears'")
    col.add_argument("--recipe", choices=COLOR_RECIPES, default=COLOR_DEFAULT,
                     help=f"color recipe version (default {COLOR_DEFAULT}); v1 blurred the guide")
    lk = sub.add_parser("lock")
    lk.add_argument("kind", choices=TEMPLATES)
    lk.add_argument("name")
    lk.add_argument("--seed", type=int, required=True)
    lk.add_argument("--color", action="store_true", help="lock a colorize candidate instead of line art")
    lk.add_argument("--locked-name")
    lk.add_argument("--force", action="store_true")
    r = sub.add_parser("reproduce")
    r.add_argument("png")
    r.add_argument("--out")
    sub.add_parser("selftest")
    args = ap.parse_args()
    WORKBOOK = args.workbook.resolve()
    {"candidates": cmd_candidates, "colorize": cmd_colorize, "lock": cmd_lock, "reproduce": cmd_reproduce,
     "selftest": cmd_selftest}[args.cmd](args)


if __name__ == "__main__":
    main()
