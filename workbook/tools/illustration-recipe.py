#!/usr/bin/env python3
"""Reproducible coloring-book illustrations: the locked FLUX recipe as one tool.

  candidates animal bunny --pose sitting --shading "body and long ears" \
      --accent "fur texture accent lines on the ears and fluffy tail"
      Render the four standard seeds, a contact sheet, and a recipe manifest into drafts/.
  lock animal bunny --seed 83
      Vectorize the chosen candidate into the locked folder, with its recipe alongside.
  colorize design-source/animals/locked-poses/bunny-01-sitting.png \
      --colors "soft white fur with light warm-grey shading, pink inner ears and a pink nose" [--recipe v2]
      Render Mode A color candidates of a locked animal, guided by its line art so it stays the same character.
  lock animal bunny --seed 72 --color
      Lock a color candidate as <line-art-name>-color.png (raster, not vectorized).
  reproduce design-source/animals/locked-poses/dog-01-sitting.png
      Re-render a locked asset from the graph embedded in its PNG and compare pixels.
  selftest
      Check the templates rebuild the exact prompts of existing locked assets.

Needs a running ComfyUI (--server, default http://127.0.0.1:8188) and Pillow.
"""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
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

# Mode A color, in the cover's style wording (design-source/scenes/cover-concept-c-final.png).
COLOR_TEMPLATE = ("Full color flat children's book illustration, warm soft palette, gentle shading and soft shadows, "
                  "a single cute cartoon {subject} {pose}, {colors}, big round expressive dark eyes, happy smile, "
                  "clean bold outlines, charming storybook illustration style, pure white background, centered "
                  "composition, no text")
# Color recipe versions are never edited: a locked asset must keep rebuilding from its recipe. v1 blurred the
# guide, and the ControlNet copied that softness: most renders came out blurry (bunny, bear, turtle 3 of 4 seeds,
# penguin 4 of 4). Changing one factor at a time on penguin seed 83 showed the blur alone was the cause (edge
# sharpness 2.4 -> 134.7; lower strength or an earlier end changed nothing), so v2 only stops blurring it.
COLOR_RECIPES = {"v1": {"guide_blur": 1.5}, "v2": {"guide_blur": 0.0}}
COLOR_DEFAULT = "v2"
GUIDE_INK = 180               # the print vectorizer's 70% threshold: what counts as a line
CONTROL_STRENGTH, CONTROL_END = 0.7, 0.8    # Union-Pro 2.0's suggested soft-edge settings
CONTROLNET = "diffusion_pytorch_model.safetensors"    # Shakker-Labs FLUX.1-dev-ControlNet-Union-Pro-2.0

SELFTEST = [
    ("animal", TEMPLATES["animal"], "animals/locked-poses/dog-01-sitting.png",
     dict(subject="puppy", pose="sitting", shading="body and ears",
          accent="fur texture accent lines on the ears and tail")),
    ("object", TEMPLATES["object"], "objects/locked/house.png",
     dict(subject="simple house with a triangular roof", shading="the roof",
          accent="a door, a window, and a chimney")),
    ("color", COLOR_TEMPLATE, "animals/locked-poses/bunny-01-sitting-color.png",
     dict(subject="bunny", pose="sitting",
          colors="soft white fur with light warm-grey shading, pink inner ears and a pink nose")),
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


def check_guide(graph, guide):
    # The guide on disk must be the exact file the asset was rendered from, or a re-render is a different image.
    digest = hashlib.sha256(Path(guide).read_bytes()).hexdigest()
    for node in graph.values():
        if node["class_type"] == "LoadImage" and node.get("is_changed", [digest]) != [digest]:
            return False
    return True


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


def color_graph(prompt, seed, guide_name, prefix):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "flux1-dev-Q8_0.gguf"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
                                                         "clip_name2": "clip_l.safetensors", "type": "flux"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["4", 0], "guidance": 3.5}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": ""}},
        "10": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": CONTROLNET}},
        "11": {"class_type": "LoadImage", "inputs": {"image": guide_name}},
        "12": {"class_type": "ControlNetApplyAdvanced", "inputs": {
            "positive": ["5", 0], "negative": ["6", 0], "control_net": ["10", 0], "image": ["11", 0],
            "strength": CONTROL_STRENGTH, "start_percent": 0.0, "end_percent": CONTROL_END, "vae": ["3", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": SIZE, "height": SIZE, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["12", 0], "negative": ["12", 1],
                                                   "latent_image": ["7", 0], "seed": seed, "steps": STEPS, "cfg": 1.0,
                                                   "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "13": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


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
    prompt = TEMPLATES[args.kind].format(**fields(args))
    drafts = WORKBOOK / "design-source" / FOLDERS[args.kind][0]
    drafts.mkdir(parents=True, exist_ok=True)
    comfy = load_comfy(args.server)
    paths = []
    for seed in SEEDS:
        out = drafts / f"{args.name}-candidate-{seed}.png"
        render(comfy, comfy.build_graph(prompt, SIZE, SIZE, seed, STEPS, None), out)
        paths.append(out)
        print(f"wrote {out.relative_to(WORKBOOK)}")

    sheet_path = drafts / f"{args.name}-contact-sheet.png"
    contact_sheet([(f"seed {seed}", p) for seed, p in zip(SEEDS, paths)], sheet_path)

    stats = comfy.api("/system_stats", timeout=10).get("system", {})
    manifest = {"kind": args.kind, "name": args.name, "template": TEMPLATES[args.kind], "fields": fields(args),
                "prompt": prompt, "seeds": list(SEEDS), "steps": STEPS, "size": SIZE,
                "graph": comfy.build_graph(prompt, SIZE, SIZE, 0, STEPS, None),
                "comfyui_version": stats.get("comfyui_version")}
    (drafts / f"{args.name}-recipe.json").write_text(json.dumps(manifest, indent=1))
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
    name = source["name"]
    color_fields = dict(subject=source["fields"]["subject"], pose=source["fields"]["pose"], colors=args.colors)
    prompt = COLOR_TEMPLATE.format(**color_fields)
    blur = COLOR_RECIPES[args.recipe]["guide_blur"]
    drafts = WORKBOOK / "design-source" / FOLDERS["animal"][0]
    comfy = load_comfy(args.server)
    controlnets = comfy.api("/object_info/ControlNetLoader")["ControlNetLoader"]["input"]["required"]
    if CONTROLNET not in controlnets["control_net_name"][0]:
        sys.exit(f"ControlNet {CONTROLNET} is not visible to ComfyUI -- check extra_model_paths.yaml")

    guide = drafts / f"{name}-color-guide.png"
    make_guide(line_art, blur, guide)
    upload(comfy, guide, guide.name)

    paths = []
    for seed in SEEDS:
        out = drafts / f"{name}-color-candidate-{seed}.png"
        render(comfy, color_graph(prompt, seed, guide.name, f"{name}-color-{seed}"), out)
        paths.append(out)
        print(f"wrote {out.relative_to(WORKBOOK)}")

    sheet_path = drafts / f"{name}-color-contact-sheet.png"
    contact_sheet([("locked line art", line_art)] + [(f"color seed {s}", p) for s, p in zip(SEEDS, paths)],
                  sheet_path)
    stats = comfy.api("/system_stats", timeout=10).get("system", {})
    manifest = {"kind": "animal-color", "name": name, "recipe_version": args.recipe, "template": COLOR_TEMPLATE,
                "fields": color_fields,
                "prompt": prompt, "source_line_art": str(line_art.relative_to(WORKBOOK)),
                "guide": str(guide.relative_to(WORKBOOK)),
                "guide_recipe": f"line art grey < {GUIDE_INK} -> white lines on black"
                                + (f", Gaussian blur {blur}" if blur else ", not blurred"),
                "controlnet": CONTROLNET, "strength": CONTROL_STRENGTH, "end_percent": CONTROL_END,
                "seeds": list(SEEDS), "steps": STEPS, "size": SIZE,
                "graph": color_graph(prompt, 0, guide.name, f"{name}-color"),
                "comfyui_version": stats.get("comfyui_version")}
    (drafts / f"{name}-color-recipe.json").write_text(json.dumps(manifest, indent=1))
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
    if args.locked_name:
        stem = args.locked_name
    elif args.color:
        stem = f"{Path(manifest['source_line_art']).stem}-color"
    else:
        stem = f"{args.name}-01-{manifest['fields']['pose'].split()[0]}" if args.kind == "animal" else args.name
    locked.mkdir(parents=True, exist_ok=True)
    png = locked / f"{stem}.png"
    if png.exists() and not args.force:
        sys.exit(f"{png.relative_to(WORKBOOK)} already exists (use --force to replace)")
    png.write_bytes(src.read_bytes())
    # Mode A color art is used as a raster; only print line art is vectorized.
    if not args.color:
        subprocess.run(["bash", str(WORKBOOK / "tools/vectorize-line-art.sh"), str(png),
                        str(locked / f"{stem}.svg"), "70"], check=True)
    manifest.update(chosen_seed=args.seed, source=str(src.relative_to(WORKBOOK)))
    (locked / f"{stem}.recipe.json").write_text(json.dumps(manifest, indent=1))
    print(f"locked {png.relative_to(WORKBOOK)}{'' if args.color else ' + .svg'} + .recipe.json")


def cmd_reproduce(args):
    original = Path(args.png).resolve()
    graph = json.loads(Image.open(original).info["prompt"])
    out = Path(args.out) if args.out else original.with_name(f"{original.stem}.reproduced.png")
    comfy = load_comfy(args.server)
    # A guided (color) render loads its guide image, which ComfyUI must have under the name in the graph.
    recipe = original.with_suffix(".recipe.json")
    guide = json.loads(recipe.read_text()).get("guide") if recipe.exists() else None
    if guide:
        if not (WORKBOOK / guide).exists():
            sys.exit(f"guide image {guide} is missing -- this asset can't be re-rendered without it")
        if not check_guide(graph, WORKBOOK / guide):
            sys.exit(f"guide image {guide} is not the file this asset was rendered from (sha256 differs)")
        for node in graph.values():
            if node["class_type"] == "LoadImage":
                upload(comfy, WORKBOOK / guide, node["inputs"]["image"])
    render(comfy, without_cache_keys(graph), out)
    a = np.asarray(Image.open(original).convert("L"), dtype=int)
    b = np.asarray(Image.open(out).convert("L"), dtype=int)
    diff = np.abs(a - b)
    ink_a, ink_b = a < 180, b < 180    # the vectorizer's 70% threshold
    print(f"wrote {out}")
    print(f"pixels differing: {100 * (diff > 0).mean():.3f}% | max diff {diff.max()} | mean diff {diff.mean():.3f}")
    print(f"print ink (after threshold) differing: {100 * (ink_a ^ ink_b).mean():.3f}% of pixels")


def cmd_selftest(_args):
    ok = True
    for label, template, rel, f in SELFTEST:
        graph = json.loads(Image.open(WORKBOOK / "design-source" / rel).info["prompt"])
        embedded = next(n["inputs"]["text"] for n in graph.values()
                        if n["class_type"] == "CLIPTextEncode" and n["inputs"]["text"])
        sampler = next(n["inputs"] for n in graph.values() if n["class_type"] == "KSampler")
        match = template.format(**f) == embedded and sampler["seed"] in SEEDS and sampler["steps"] == STEPS
        if label == "color":
            # The whole guided graph must be the one this tool builds, apart from the output name,
            # and the committed guide must be the exact file it was rendered from.
            guide = next(n["inputs"]["image"] for n in graph.values() if n["class_type"] == "LoadImage")
            prefix = next(n["inputs"]["filename_prefix"] for n in graph.values() if n["class_type"] == "SaveImage")
            recipe = json.loads((WORKBOOK / "design-source" / rel).with_suffix(".recipe.json").read_text())
            match = (match and color_graph(embedded, sampler["seed"], guide, prefix) == without_cache_keys(graph)
                     and check_guide(graph, WORKBOOK / recipe["guide"]))
        ok &= match
        print(f"{'OK  ' if match else 'FAIL'} {label:6s} {rel} (seed {sampler['seed']}, steps {sampler['steps']})")
    sys.exit(0 if ok else 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://127.0.0.1:8188")
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
    {"candidates": cmd_candidates, "colorize": cmd_colorize, "lock": cmd_lock, "reproduce": cmd_reproduce,
     "selftest": cmd_selftest}[args.cmd](args)


if __name__ == "__main__":
    main()
