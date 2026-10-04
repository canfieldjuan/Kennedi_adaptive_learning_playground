#!/usr/bin/env python3
"""Recolor Kennedi's skin in a color (Mode A) image to her approved palette.

  python3 workbook/tools/recolor-kennedi-skin.py workbook/design-source/scenes/cover-concept-c-final.recolor.json
      Write the spec's output from its source. (Paths inside a spec are relative to workbook/.)
  python3 workbook/tools/recolor-kennedi-skin.py SPEC.json --check
      Recompute the output and compare its pixels with the committed file; exit 1 on any difference.

The palette is design-source/boss-kennedi/palette.json. A spec names the source, the output, the source's own
skin color, the gates that match skin-colored pixels, and a seed point inside each region of her skin: the
gates alone also match things that aren't her (a pencil's wood, beige shading on her shirt), so only the
regions holding a seed change. Every other pixel is copied from the source. RGB images only. Needs numpy
and Pillow.
"""
import argparse
import json
import os
import sys
import tempfile
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

WORKBOOK = Path(__file__).resolve().parents[1]
LUMA = np.array([0.299, 0.587, 0.114])
SKIN_SHARE = 0.5           # a seeded region must be at least half flat skin, or the seed is misplaced
EDGE_SATURATION = 0.2      # the 1 px edge into the outline: anti-aliased skin, at least this saturated
LIT = 0.95                 # value above which a pixel is in full light (flat skin or blush, not shading)
CHEEK_RIM = 6              # px: the source blush's darker rim, flattened with it
CHEEK_RIM_VALUE = 0.6      # ...but never the black outline under it
CHEEK_SOFTEN = 4           # px: the blush fades into the skin over this radius
MAX_SHADE = 1.15           # a pixel brighter than the source skin brightens hers by at most this


def rgb(hex_color):
    return np.array([int(hex_color[i:i + 2], 16) for i in (1, 3, 5)], float)


def grow(mask, px):
    """Dilate by px steps of the 4-neighbour cross."""
    out = mask.copy()
    for _ in range(px):
        step = out.copy()
        step[1:] |= out[:-1]
        step[:-1] |= out[1:]
        step[:, 1:] |= out[:, :-1]
        step[:, :-1] |= out[:, 1:]
        out = step
    return out


def regions(mask):
    """4-connected regions of mask: (labels, count). Outlines separate regions."""
    labels = np.zeros(mask.shape, np.int32)
    count = 0
    height, width = mask.shape
    for y0, x0 in zip(*np.nonzero(mask)):
        if labels[y0, x0]:
            continue
        count += 1
        labels[y0, x0] = count
        queue = deque([(y0, x0)])
        while queue:
            y, x = queue.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = count
                    queue.append((ny, nx))
    return labels, count


def recolor(source, spec, palette):
    """The recolored pixels of source (an RGB image), and the mask of what changed."""
    a = np.asarray(source).astype(float)
    hsv = np.asarray(source.convert("HSV")).astype(float)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    above_ground = np.arange(a.shape[0])[:, None] < spec["ground_row"]

    def gate(g):
        return ((h >= g["hue"][0]) & (h <= g["hue"][1]) & (s >= g["saturation"][0]) & (s <= g["saturation"][1])
                & (v > g["value_min"]) & above_ground)

    # Her skin is the regions of flat skin and its own shading that an outline doesn't separate from it.
    flat, shading = gate(spec["skin_gate"]), gate(spec["shading_gate"])
    labels, count = regions(flat | shading)
    size = np.bincount(labels.ravel(), minlength=count + 1)
    flat_share = np.bincount(labels.ravel(), weights=flat.ravel(), minlength=count + 1) / np.maximum(size, 1)
    keep = np.zeros(count + 1, bool)
    for seed in spec["skin_seeds"]:
        x, y = seed["x"], seed["y"]
        inside = 0 <= y < labels.shape[0] and 0 <= x < labels.shape[1]
        region = labels[y, x] if inside else 0
        if not region or flat_share[region] < SKIN_SHARE:
            sys.exit(f"skin seed {seed.get('where', '')!r} at ({x}, {y}) is not on her skin under these gates")
        keep[region] = True
    body = keep[labels]
    hue = spec["shading_gate"]["hue"]
    mask = body | (grow(body, 1) & (h >= hue[0]) & (h <= hue[1]) & (s >= EDGE_SATURATION))

    skin, rose = rgb(palette["skin"]), rgb(palette["blush"])
    # Shading keeps her hue and takes only the source's darkness, so shadows are golden brown, not salmon.
    shaded = skin * np.clip((a @ LUMA) / (rgb(spec["source_skin"]) @ LUMA), 0, MAX_SHADE)[..., None]
    # The cheeks, with their darker rim, become skin, then a soft-edged faint blush is laid back over them.
    blush = mask & (v > LIT) & (h <= spec["blush_hue_max"])
    cheeks = grow(blush, CHEEK_RIM) & mask & (v > CHEEK_RIM_VALUE)
    weight = np.asarray(Image.fromarray((blush * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(CHEEK_SOFTEN))) / 255
    out = np.where(cheeks[..., None], skin + (rose - skin) * (weight * palette["blush_strength"])[..., None], shaded)
    return np.where(mask[..., None], np.clip(out, 0, 255), a).astype(np.uint8), mask


def load(spec_path):
    try:
        spec = json.loads(Path(spec_path).read_text())
    except (OSError, ValueError) as error:
        sys.exit(f"{spec_path}: {error}")
    required = {"source", "output", "palette", "source_skin", "skin_gate", "shading_gate", "ground_row",
                "blush_hue_max", "skin_seeds"}
    if missing := sorted(required - set(spec)):
        sys.exit(f"{spec_path} is missing {', '.join(missing)}")
    paths = {key: (WORKBOOK / spec[key]).resolve() for key in ("source", "output", "palette")}
    for key, path in paths.items():
        if WORKBOOK not in path.parents:
            sys.exit(f"{spec_path}: {key} {spec[key]} is outside the workbook")
    if paths["output"] in (paths["source"], paths["palette"], Path(spec_path).resolve()):
        sys.exit(f"{spec_path}: the output {spec['output']} is one of the recolor's inputs (the source, the palette "
                 f"or this spec); writing it would destroy that input")
    for key in ("source", "palette"):
        if not paths[key].is_file():
            sys.exit(f"{spec_path}: {key} {spec[key]} is missing")
    return spec, paths


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec")
    ap.add_argument("--check", action="store_true", help="compare the committed output instead of writing it")
    args = ap.parse_args()
    spec, paths = load(args.spec)
    source = Image.open(paths["source"])
    if source.mode != "RGB":
        sys.exit(f"{spec['source']} is {source.mode}; the recolor handles RGB images only and would drop the rest")
    pixels, mask = recolor(source, spec, json.loads(paths["palette"].read_text()))
    changed = (pixels != np.asarray(source)).any(axis=-1)
    rel = paths["output"].relative_to(WORKBOOK)
    # A spec that selects none of her skin would replace the approved output with a copy of the source.
    if not changed.any():
        sys.exit(f"{args.spec} recolors nothing in {spec['source']} -- check its gates; nothing was written")
    if args.check:
        if not paths["output"].is_file():
            sys.exit(f"{rel} is missing -- run without --check to write it")
        committed = Image.open(paths["output"])
        differs = committed.mode != "RGB" or committed.size != source.size or not np.array_equal(
            np.asarray(committed), pixels)
        if differs:
            sys.exit(f"{rel} is not what its palette and spec produce -- re-run without --check")
        print(f"OK   {rel}: {int(changed.sum())} skin pixels recolored, the rest identical to the source")
        return
    fd, tmp = tempfile.mkstemp(dir=paths["output"].parent, prefix=f".{paths['output'].name}.", suffix=".part")
    os.close(fd)
    try:
        Image.fromarray(pixels).save(tmp, "PNG")
        os.replace(tmp, paths["output"])
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    rows, cols = np.nonzero(changed)
    print(f"wrote {rel}: {int(changed.sum())} pixels recolored (mask {int(mask.sum())}), rows {rows.min()}-{rows.max()}, "
          f"columns {cols.min()}-{cols.max()}")


if __name__ == "__main__":
    main()
