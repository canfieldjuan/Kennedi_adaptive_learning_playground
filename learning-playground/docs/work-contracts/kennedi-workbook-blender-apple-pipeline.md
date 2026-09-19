# Kennedi Workbook: Blender Line-Art Pipeline (Apple)

PR #136. This contract was written after the first push, in response to
Codex review round 1 (thread `PRRT_kwDOTPmar86kBpMe`). The original commit
(`c0b0a1c`) landed without one. The Before Code sections record the scope
that commit was built to; the amendment records the review fixes.

## Before Code

### Root Cause

Workbook illustrations are made by prompting FLUX once per asset. Each
asset is a separate generation, so an object's shape and line weight can't
be rebuilt exactly or reused across pages. The only way to change one is to
re-prompt and hope for a close match. For round, rotationally symmetric
objects, a 3D model built from a measured profile and rendered to line art
gives the same drawing every time, and a small edit changes only what was
edited. This slice tests that path on one object, the apple, before it is
used anywhere.

### Correct Fix Must Touch

- `workbook/tools/blender/build_apple.py`: builds the apple from a profile
  and renders the print line art plus a shaded form check, headless from a
  factory-fresh Blender.
- `workbook/tools/blender/silhouette.py`: measures a reference body's
  profile, compares a render against the reference row by row, and
  spline-refits a profile to remove lathe banding.
- `workbook/design-source/blender/apple/`: the profile (with its derivation),
  the reference raster it was measured from, and the generated outputs.
- `learning-playground/docs/work-contracts/`: this contract.

### Must Not Change

- `workbook/dist/**`, `workbook/src/**` and the page files. No page uses the
  Blender apple yet, so no rendered workbook output changes.
- `workbook/design-source/objects/locked/apple.*`: the locked FLUX apple.
  It is only read, as the rasterized reference.
- `workbook/tools/comfy-generate*.py`, `workbook/scripts/*.mjs` and
  `.github/workflows/*`. The FLUX pipeline, verification and CI are
  unrelated. These scripts aren't run in CI because the runner has no
  Blender.

## Contract Amendments

- **Round 1** (Codex on `c0b0a1c`, six findings, all confirmed and fixed):
  - Engine identifier (`build_apple.py`). Blender 4.2-4.4 reject
    `BLENDER_EEVEE`, and 5.x rejects `BLENDER_EEVEE_NEXT` (probed on 5.2.2).
    The script now tries `BLENDER_EEVEE` and falls back to
    `BLENDER_EEVEE_NEXT` on `TypeError`. Codex's "4.2 or later" is too
    broad, because 5.x accepts `BLENDER_EEVEE`, but the 4.2-4.4 failure is
    real.
  - Volatile render metadata (`build_apple.py`). The committed PNGs carried
    `Date` and `RenderTime` text chunks, so every rebuild rewrote them.
    All `use_stamp*` metadata flags are now turned off, and the tracked
    PNGs are regenerated without metadata. They are pixel-identical to the
    previous versions. Rebuilding also surfaced something outside the
    script's control: Freestyle's stroke order sometimes varies between
    runs. In 4 of 16 runs this shifted 6-19 line-edge pixels by up to 16/255.
    That is Blender behaviour; pinning render threads to 1 didn't change
    it. It is documented in the script's docstring rather than hidden
    behind a tolerance.
  - Worst difference over every row (`silhouette.py compare`). The
    reported worst difference covered only the 13 printed sample rows. It
    now covers every row of the taller body and reports where the worst
    row is. This corrects the PR's original verification claim. The
    silhouette is within 4.8% on 531 of 546 rows. The other 15 rows (the
    top 1.3% and bottom 1.1%) differ by up to 54%, because the reference's
    shoulder and bottom lobe are lopsided (one side peaks first), and a
    symmetric lathe can't reproduce that.
  - Locating the body (`silhouette.py`). A fixed seed pixel at 60% height
    and 50% width is replaced by the largest white region enclosed by ink.
    That region must surround the centre of the drawing, so a broken
    outline is still rejected instead of the leaf or highlight being
    measured.
  - Degenerate smoothing inputs (`silhouette.py smooth`). `--points` must
    be at least 2; with 1, the endpoint pinning collapsed the outer surface
    silently. `--rim` must leave the degree-5 spline at least 6
    outer-surface points; before this, a negative value was sliced
    silently and a late one crashed inside scipy.

## Cold Diff Audit

### Gaps

- change without contract trace: none.
- contract requirement not delivered: none.
- protected surface touched: none. The diff against `main` touches only
  `workbook/tools/blender/*.py`, `workbook/design-source/blender/apple/*`
  and this contract.

### Change By Change Reconstruction

- `build_apple.py:47-73` `reset_scene()`: clears objects, selects EEVEE with
  the 4.2-4.4 fallback (`:51-54`), turns off every render metadata flag
  (`:55-58`), and sets the Standard view transform, 1000px square output and
  a pure white world.
- `build_apple.py:74-86` `flat_white_material()`: an emission-white fill, so
  lighting never greys it.
- `build_apple.py:94-127` `build_body()`: revolves the profile, adds the
  2-fold shoulder humps and the bottom lobes, and scales height to the
  reference aspect.
- `build_apple.py:128-235`: `build_stem()` and `build_leaf()`. Leaf veins are
  Freestyle edge marks on faced edges, and the mirrored halves share one
  winding.
- `build_apple.py:236-272`: `build_camera()` (10 degree tilt) and
  `seat_highlight()`.
- `build_apple.py:273-309` `setup_linesets()`: an Outline set with a
  calligraphy nib, and a Veins set with a taper.
- `build_apple.py:316-349` `main()`: renders `apple-lineart.png`, an optional
  body-only silhouette, and then `apple-shaded.png` in Workbench.
- `silhouette.py:26-42` `body_mask()`: the largest enclosed white region,
  rejected if it doesn't surround the drawing's centre.
- `silhouette.py:58-65` `measure`: row half-widths, a 9-row moving average
  and 64 profile points at the true aspect.
- `silhouette.py:68-83` `compare`: the sample-row table plus the worst
  difference over every row (`:76-80`), and an optional overlay.
- `silhouette.py:110-137` `smooth`: validates `--rim` (`:114-116`), then fits
  arc-length splines over five smoothing levels and keeps the fewest
  curvature flips at the lowest RMS shift.
- `silhouette.py:140-144` `point_count()`: the `--points` argument type,
  at least 2.
- `design-source/blender/apple/`: `profile.json` (104 points, rim index 4,
  derivation recorded), `reference.png`, and `apple-lineart.png` plus
  `apple-shaded.png` as generated by the script.

### Contract Traceability

- `build_apple.py`: Correct Fix Must Touch (the build and render). Round 1
  covers the engine fallback and the metadata.
- `silhouette.py`: Correct Fix Must Touch (measure, compare, smooth). Round 1
  covers compare, body_mask and the smooth validation.
- `design-source/blender/apple/*`: Correct Fix Must Touch (profile,
  reference, generated outputs).
- This file: Correct Fix Must Touch (contract).

### Verification

All runs used Blender 5.2.2 LTS headless (`--background --factory-startup`)
and system Python.

- Build: exits 0 on every run. `apple-shaded.png` is byte-identical across
  16 runs. `apple-lineart.png` is byte-identical in 12 of 16 runs, and the
  other 4 are the Freestyle stroke-order jitter described above. The
  committed PNGs are the majority output, pixel-identical to the previous
  commit, with no `Date` or `RenderTime` chunks.
- Engine probe: `BLENDER_EEVEE` accepted and `BLENDER_EEVEE_NEXT` rejected on
  5.2.2. Could not run on 4.2-4.4 because no install is available. The
  fallback there is the documented identifier, but other API differences on
  4.x are untested.
- `compare` against the rebuilt body: `worst |diff| 0.541 at t=0.000 (all
  546 rows)`. The sample-row table is unchanged from before.
- `measure` on `reference.png`: new code output is byte-identical to old
  code output. The body masks are identical for the reference and the
  rendered body.
- `smooth profile.json --rim 4`: new code output is byte-identical to old
  code output.
- Boundary probes for `body_mask`:
  - Apple moved into the corner of a 2000px canvas: old code rejected it;
    new code gives a measurement identical to the reference's.
  - Closed ring drawn around the old seed pixel: old code silently measured
    the ring (aspect 1.000); new code measures the body, identical to the
    reference.
  - Outline cut open: both reject it.
  - Blank image and a single open line: new code rejects both.
- Boundary probes for `smooth`:
  - `--points`: 0 and 1 rejected (old code with 1 wrote a 9-point profile
    from 104 input points), `abc` rejected, 2 accepted.
  - `--rim` (lowest point at index 99): -1, 95 and 999 rejected, while 0
    and 94 are accepted. Old code at 95 crashed with scipy's
    `(m>k) failed`.
