#!/usr/bin/env python3
"""Measure, compare and smooth lathe profiles against a line-art reference.

  silhouette.py measure REFERENCE.png OUT.json
      Outer profile [(radius, z)] of the reference body, max radius 1.0, true aspect.
  silhouette.py compare REFERENCE.png RENDER.png [--overlay OUT.png]
      Row-by-row width difference of the two bodies, normalised to the same height.
  silhouette.py smooth PROFILE.json OUT.json --rim INDEX
      Refit the outer surface (rim to lowest point) with arc-length smoothing splines.

Requires numpy, scipy and Pillow (system python, not Blender's).
"""
import argparse
import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.interpolate import UnivariateSpline

SAMPLE_T = (0.02, 0.05, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.88, 0.94, 0.98)    # printed rows
SPLINE_K = 5


def body_mask(path):
    # The body is the largest white region enclosed by ink: leaf, stem and highlight
    # interiors are separate, smaller regions, so they can't leak into the measurement.
    white = np.array(Image.open(path).convert("L")) >= 128
    labels, count = ndimage.label(white)
    border = set(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]).tolist())
    sizes = ndimage.sum(white, labels, index=np.arange(1, count + 1))
    enclosed = [(size, label) for label, size in enumerate(sizes, start=1) if label not in border]
    if not enclosed:
        sys.exit(f"{path}: no white region is enclosed by ink -- outline broken")
    region = labels == max(enclosed)[1]
    # With a broken outline the body joins the background, and the largest enclosed region is then
    # the leaf or the highlight. The body surrounds the middle of the drawing; those don't.
    ys, xs = np.where(~white)
    if not ndimage.binary_fill_holes(region)[(ys.min() + ys.max()) // 2, (xs.min() + xs.max()) // 2]:
        sys.exit(f"{path}: the largest enclosed region is off-centre, not the body -- outline broken")
    return region


def row_widths(mask):
    ys = np.where(mask.any(axis=1))[0]
    y0, y1 = int(ys.min()), int(ys.max())
    half = np.array([np.ptp(np.where(mask[y])[0]) / 2.0 for y in range(y0, y1 + 1)])
    return half, (y1 - y0) / (2.0 * half.max())


def normalised(mask):
    half, aspect = row_widths(mask)
    t = np.linspace(0.0, 1.0, len(half))
    return t, half / half.max(), aspect


def cmd_measure(args):
    half, aspect = row_widths(body_mask(args.reference))
    r = np.convolve(np.pad(half / half.max(), 4, mode="edge"), np.ones(9) / 9, mode="valid")
    z = (0.5 - np.linspace(0.0, 1.0, len(r))) * 2.0 * aspect
    idx = np.linspace(0, len(r) - 1, 64).astype(int)
    profile = [(round(float(r[i]), 4), round(float(z[i]), 4)) for i in idx]
    json.dump({"aspect": round(float(aspect), 4), "profile": profile}, open(args.out, "w"))
    print(f"aspect {aspect:.3f} (height/width), {len(profile)} points -> {args.out}")


def cmd_compare(args):
    ref_mask, mine_mask = body_mask(args.reference), body_mask(args.render)
    rt, rw, ra = normalised(ref_mask)
    mt, mw, ma = normalised(mine_mask)
    print(f"aspect  reference {ra:.3f} | render {ma:.3f}")
    for t in SAMPLE_T:
        a, b = np.interp(t, rt, rw), np.interp(t, mt, mw)
        print(f"  t={t:.2f}  reference {a:.3f}  render {b:.3f}  diff {b - a:+.3f}")
    # The worst case covers every row of the taller body, not only the rows printed above.
    t = np.linspace(0.0, 1.0, max(len(rt), len(mt)))
    diff = np.abs(np.interp(t, mt, mw) - np.interp(t, rt, rw))
    worst = int(np.argmax(diff))
    print(f"worst |diff| {diff[worst]:.3f} at t={t[worst]:.3f} (all {len(t)} rows)")
    if args.overlay:
        write_overlay(ref_mask, mine_mask, args.overlay)
        print(f"overlay (reference red, render blue) -> {args.overlay}")


def write_overlay(ref_mask, mine_mask, path, height=500):
    def crop(mask):
        ys, xs = np.where(mask.any(axis=1))[0], np.where(mask.any(axis=0))[0]
        img = Image.fromarray((mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255).astype(np.uint8))
        return img.resize((int(img.width * height / img.height), height))

    ref, mine = crop(ref_mask), crop(mine_mask)
    width = max(ref.width, mine.width) + 40
    canvas = np.full((height + 40, width, 3), 255, np.uint8)
    for img, colour in ((ref, (230, 60, 60)), (mine, (60, 90, 230))):
        filled = np.array(img) > 128
        edge = filled & ~ndimage.binary_erosion(filled, iterations=3)
        ox = (width - img.width) // 2
        canvas[20:20 + height, ox:ox + img.width][edge] = colour
    Image.fromarray(canvas).save(path)


def curvature_flips(points):
    v = np.diff(points, axis=0)
    cross = v[:-1, 0] * v[1:, 1] - v[:-1, 1] * v[1:, 0]
    signs = np.sign(cross[np.abs(cross) > 1e-9])
    return int(np.sum(np.diff(signs) != 0))


def cmd_smooth(args):
    data = json.load(open(args.profile))
    profile = np.array(data["profile"], dtype=float)
    lowest = int(np.argmin(profile[:, 1]))
    if not 0 <= args.rim <= lowest - SPLINE_K:
        sys.exit(f"--rim must be 0..{lowest - SPLINE_K}: the spline needs at least {SPLINE_K + 1} "
                 f"outer-surface points up to the lowest point (index {lowest})")
    head, outer, tail = profile[:args.rim], profile[args.rim:lowest + 1], profile[lowest + 1:]
    # Arc-length parametrisation: r(z) goes near-vertical across a flat top, which breaks a z-based fit.
    s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(outer, axis=0), axis=1))])
    best = None
    for smoothing in (2e-4, 5e-4, 1e-3, 2e-3, 4e-3):
        fr = UnivariateSpline(s, outer[:, 0], k=SPLINE_K, s=smoothing)
        fz = UnivariateSpline(s, outer[:, 1], k=SPLINE_K, s=smoothing)
        ss = np.linspace(0.0, s[-1], args.points)
        fit = np.column_stack([fr(ss), fz(ss)])
        fit[0], fit[-1] = outer[0], outer[-1]
        rms = float(np.sqrt(np.mean((np.column_stack([fr(s), fz(s)]) - outer) ** 2)))
        flips = curvature_flips(fit)
        print(f"  smoothing {smoothing:g}: {flips} curvature flips, rms shift {rms:.4f}")
        if best is None or (flips <= 2 and rms < best[2]) or (best[1] > 2 and flips < best[1]):
            best = (smoothing, flips, rms, fit)
    smoothing, flips, rms, fit = best
    out = np.vstack([head, fit, tail])
    data["profile"] = [(round(float(r), 5), round(float(z), 5)) for r, z in out]
    json.dump(data, open(args.out, "w"), indent=1)
    print(f"raw outer surface had {curvature_flips(outer)} flips; kept smoothing {smoothing:g} "
          f"({flips} flips, rms shift {rms:.4f}) -> {args.out}")


def point_count(value):
    count = int(value)
    if count < 2:    # both ends of the outer surface are pinned to the original rim and lowest point
        raise argparse.ArgumentTypeError(f"needs at least 2 points, got {count}")
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("measure")
    m.add_argument("reference")
    m.add_argument("out")
    c = sub.add_parser("compare")
    c.add_argument("reference")
    c.add_argument("render")
    c.add_argument("--overlay")
    s = sub.add_parser("smooth")
    s.add_argument("profile")
    s.add_argument("out")
    s.add_argument("--rim", type=int, required=True, help="index of the cavity rim in the profile")
    s.add_argument("--points", type=point_count, default=96)
    args = parser.parse_args()
    {"measure": cmd_measure, "compare": cmd_compare, "smooth": cmd_smooth}[args.cmd](args)


if __name__ == "__main__":
    main()
