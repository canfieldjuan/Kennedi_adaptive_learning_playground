#!/usr/bin/env python3
"""Reproducible coloring-book illustrations: the locked FLUX recipe as one tool.

  candidates animal bunny --pose sitting --shading "body and long ears" \
      --accent "fur texture accent lines on the ears and fluffy tail"
      Render the four standard seeds, a contact sheet, and a recipe manifest into drafts/.
  lock animal bunny --seed 83
      Vectorize the chosen candidate into the locked folder, with its recipe alongside.
  reproduce design-source/animals/locked-poses/dog-01-sitting.png
      Re-render a locked asset from the graph embedded in its PNG and compare pixels.
  selftest
      Check the templates rebuild the exact prompts of existing locked assets.

Needs a running ComfyUI (--server, default http://127.0.0.1:8188) and Pillow.
"""
import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

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

SELFTEST = [
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

    tile = 480
    sheet = Image.new("RGB", (tile * len(paths), tile + 30), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (seed, p) in enumerate(zip(SEEDS, paths)):
        sheet.paste(Image.open(p).convert("RGB").resize((tile, tile)), (i * tile, 30))
        draw.text((i * tile + 8, 8), f"seed {seed}", fill="black")
    sheet_path = drafts / f"{args.name}-contact-sheet.png"
    sheet.save(sheet_path)

    stats = comfy.api("/system_stats", timeout=10).get("system", {})
    manifest = {"kind": args.kind, "name": args.name, "template": TEMPLATES[args.kind], "fields": fields(args),
                "prompt": prompt, "seeds": list(SEEDS), "steps": STEPS, "size": SIZE,
                "graph": comfy.build_graph(prompt, SIZE, SIZE, 0, STEPS, None),
                "comfyui_version": stats.get("comfyui_version")}
    (drafts / f"{args.name}-recipe.json").write_text(json.dumps(manifest, indent=1))
    print(f"wrote {sheet_path.relative_to(WORKBOOK)} and {args.name}-recipe.json -- pick a seed, then `lock`")


def cmd_lock(args):
    drafts_rel, locked_rel = FOLDERS[args.kind]
    drafts, locked = WORKBOOK / "design-source" / drafts_rel, WORKBOOK / "design-source" / locked_rel
    manifest_path = drafts / f"{args.name}-recipe.json"
    manifest = json.loads(manifest_path.read_text())
    if args.seed not in manifest["seeds"]:
        sys.exit(f"seed {args.seed} is not one of the rendered candidates {manifest['seeds']}")
    src = drafts / f"{args.name}-candidate-{args.seed}.png"
    stem = args.locked_name or (f"{args.name}-01-{manifest['fields']['pose'].split()[0]}"
                                if args.kind == "animal" else args.name)
    locked.mkdir(parents=True, exist_ok=True)
    png, svg = locked / f"{stem}.png", locked / f"{stem}.svg"
    if png.exists() and not args.force:
        sys.exit(f"{png.relative_to(WORKBOOK)} already exists (use --force to replace)")
    png.write_bytes(src.read_bytes())
    subprocess.run(["bash", str(WORKBOOK / "tools/vectorize-line-art.sh"), str(png), str(svg), "70"], check=True)
    manifest.update(chosen_seed=args.seed, source=str(src.relative_to(WORKBOOK)))
    (locked / f"{stem}.recipe.json").write_text(json.dumps(manifest, indent=1))
    print(f"locked {png.relative_to(WORKBOOK)} + .svg + .recipe.json")


def cmd_reproduce(args):
    original = Path(args.png).resolve()
    graph = json.loads(Image.open(original).info["prompt"])
    out = Path(args.out) if args.out else original.with_name(f"{original.stem}.reproduced.png")
    render(load_comfy(args.server), graph, out)
    a = np.asarray(Image.open(original).convert("L"), dtype=int)
    b = np.asarray(Image.open(out).convert("L"), dtype=int)
    diff = np.abs(a - b)
    ink_a, ink_b = a < 180, b < 180    # the vectorizer's 70% threshold
    print(f"wrote {out}")
    print(f"pixels differing: {100 * (diff > 0).mean():.3f}% | max diff {diff.max()} | mean diff {diff.mean():.3f}")
    print(f"print ink (after threshold) differing: {100 * (ink_a ^ ink_b).mean():.3f}% of pixels")


def cmd_selftest(_args):
    ok = True
    for kind, rel, f in SELFTEST:
        graph = json.loads(Image.open(WORKBOOK / "design-source" / rel).info["prompt"])
        embedded = next(n["inputs"]["text"] for n in graph.values()
                        if n["class_type"] == "CLIPTextEncode" and n["inputs"]["text"])
        seed = next(n["inputs"]["seed"] for n in graph.values() if n["class_type"] == "KSampler")
        steps = next(n["inputs"]["steps"] for n in graph.values() if n["class_type"] == "KSampler")
        match = TEMPLATES[kind].format(**f) == embedded and seed in SEEDS and steps == STEPS
        ok &= match
        print(f"{'OK  ' if match else 'FAIL'} {kind:6s} {rel} (seed {seed}, steps {steps})")
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
    lk = sub.add_parser("lock")
    lk.add_argument("kind", choices=TEMPLATES)
    lk.add_argument("name")
    lk.add_argument("--seed", type=int, required=True)
    lk.add_argument("--locked-name")
    lk.add_argument("--force", action="store_true")
    r = sub.add_parser("reproduce")
    r.add_argument("png")
    r.add_argument("--out")
    sub.add_parser("selftest")
    args = ap.parse_args()
    {"candidates": cmd_candidates, "lock": cmd_lock, "reproduce": cmd_reproduce, "selftest": cmd_selftest}[args.cmd](args)


if __name__ == "__main__":
    main()
