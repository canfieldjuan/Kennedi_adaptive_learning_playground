# Kennedi Workbook: Blender Line-Art Pipeline (Apple)

PR #136. This contract was written after the first push, in response to
Codex review round 1 (thread `PRRT_kwDOTPmar86kBpMe`). The original commit
(`c0b0a1c`) landed without one. The Before Code sections record the scope
that commit was built to; the amendments record the review fixes.

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

- **Round 1** (Codex on `c0b0a1c`, six findings, all confirmed and fixed in
  `c0adeb2`):
  - Engine identifier (`build_apple.py`). Blender 4.2-4.4 reject
    `BLENDER_EEVEE`, and 5.x rejects `BLENDER_EEVEE_NEXT` (probed on 5.2.2).
    Round 1 added a `BLENDER_EEVEE_NEXT` fallback. Round 2 replaced it with a
    version floor (see below).
  - Volatile render metadata (`build_apple.py`). The committed PNGs carried
    `Date` and `RenderTime` text chunks, so every rebuild rewrote them.
    All `use_stamp*` metadata flags are now turned off, and the tracked
    PNGs were regenerated without metadata, pixel-identical to before.
    Rebuilding also surfaced something outside the script's control:
    Freestyle's stroke order sometimes varies between runs. In 4 of 16
    runs this shifted 6-19 line-edge pixels by up to 16/255. That is
    Blender behaviour; pinning render threads to 1 didn't change it. It is
    documented in the script's docstring rather than hidden behind a
    tolerance.
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
- **Round 2** (Codex on `c0adeb2`, three findings, all confirmed; two fixed
  differently from what Codex suggested):
  - Workbench on Blender 4.x (`build_apple.py`). Codex found a second
    4.x-specific identifier, for the Workbench engine. That makes two rounds
    in a row finding one more incompatibility with a Blender version nobody
    has run the script on. Patching identifiers one at a time doesn't
    converge, so the root cause is claiming support for untested versions.
    The script now requires Blender 5.2 or later (`MIN_BLENDER`, the
    verified version) and exits before building anything on an older one.
    The round-1 `BLENDER_EEVEE_NEXT` fallback is removed, since it can no
    longer run. Wider support should come from actually running the script
    on that version.
  - Render dithering (`build_apple.py`). Blender's default dither (1.0)
    scattered 78,560 `(254, 254, 254)` pixels, some of them across the white
    background of the print art. `dither_intensity` is now 0. Both PNGs were
    regenerated. Every pixel changed by at most 1 level. The background is
    pure white, and the 1,167 pixels still at 254 are all within 3px of a
    line, so they are line anti-aliasing.
  - Spline candidate ranking (`silhouette.py smooth`). The threshold of 2
    flips is deliberate: the apple's outer surface really has two
    inflections (the shoulder and the bottom crater). Every fit with 2 or
    fewer flips has the right shape, so those fits compete on distortion
    alone. Ranking strictly by flip count, as Codex suggested, would
    over-smooth them away. The gaps Codex found were real, though:
    - Round 1 of this contract described the rule wrongly, as "fewest
      flips, then lowest RMS".
    - The 2 was hard-coded, so it would be wrong for a lathe object with a
      different number of inflections.
    - Ties above the threshold kept the first candidate instead of the one
      with the lower RMS.

    The rule is now one explicit ranking key, `(max(flips, --flips), rms)`.
    The new `--flips` flag defaults to 2 for the apple, and a surface with
    no inflections passes `--flips 0`.

## Cold Diff Audit

### Gaps

- change without contract trace: none.
- contract requirement not delivered: none.
- protected surface touched: none. The diff against `main` touches only
  `workbook/tools/blender/*.py`, `workbook/design-source/blender/apple/*`
  and this contract.

### Change By Change Reconstruction

- `build_apple.py:25` `MIN_BLENDER = (5, 2)`, checked first in `main()`
  (`:319-321`): exits with the found version before any output is written.
- `build_apple.py:50-73` `reset_scene()`: clears objects, selects EEVEE
  (`:54`), turns off every render metadata flag (`:55-58`), sets the Standard
  view transform, turns dithering off (`:62-63`), and sets 1000px square
  output with a pure white world.
- `build_apple.py:76-86` `flat_white_material()`: an emission-white fill, so
  lighting never greys it.
- `build_apple.py:96-127` `build_body()`: revolves the profile, adds the
  2-fold shoulder humps and the bottom lobes, and scales height to the
  reference aspect.
- `build_apple.py:130-235`: `build_stem()` and `build_leaf()`. Leaf veins are
  Freestyle edge marks on faced edges, and the mirrored halves share one
  winding.
- `build_apple.py:238-272`: `build_camera()` (10 degree tilt) and
  `seat_highlight()`.
- `build_apple.py:275-309` `setup_linesets()`: an Outline set with a
  calligraphy nib, and a Veins set with a taper.
- `build_apple.py:318-352` `main()`: after the version check, renders
  `apple-lineart.png`, an optional body-only silhouette, and then
  `apple-shaded.png` in Workbench.
- `silhouette.py:27-43` `body_mask()`: the largest enclosed white region,
  rejected if it doesn't surround the drawing's centre.
- `silhouette.py:59-66` `measure`: row half-widths, a 9-row moving average
  and 64 profile points at the true aspect.
- `silhouette.py:69-84` `compare`: the sample-row table plus the worst
  difference over every row (`:77-81`), and an optional overlay.
- `silhouette.py:111-140` `smooth`:
  - Validates `--rim` (`:115-117`).
  - Fits arc-length splines at five smoothing levels.
  - Ranks the candidates by `(max(flips, --flips), rms)` (`:132-134`): any
    fit with no more flips than the real surface qualifies, and the least
    distorted of those wins.
- `silhouette.py:142-149` `at_least()`: the integer argument type behind
  `--points` (at least 2) and `--flips` (at least 0), registered at
  `:166-169`.
- `design-source/blender/apple/`: `profile.json` (104 points, rim index 4,
  derivation recorded), `reference.png`, and `apple-lineart.png` plus
  `apple-shaded.png` as generated by the script.

### Contract Traceability

- `build_apple.py`: Correct Fix Must Touch (the build and render). Round 1
  covers the metadata. Round 2 covers the version floor and the dithering.
- `silhouette.py`: Correct Fix Must Touch (measure, compare, smooth). Round 1
  covers compare, body_mask and the smooth validation. Round 2 covers the
  ranking and `--flips`.
- `design-source/blender/apple/*`: Correct Fix Must Touch (profile,
  reference, generated outputs).
- This file: Correct Fix Must Touch (contract).

### Verification

All runs used Blender 5.2.2 LTS headless (`--background --factory-startup`)
and system Python.

- Build, as of round 2: exits 0 on every run. `apple-shaded.png` was
  byte-identical in 8 of 8 runs. `apple-lineart.png` was byte-identical in
  7 of 8; the other run is the Freestyle stroke-order jitter described
  above. The committed PNGs are the majority output: no metadata chunks,
  and no dither in the background.
- Version floor: a copy with `MIN_BLENDER = (99, 0)` exits 1 with
  `build_apple.py needs Blender 99.0 or later; this is 5.2.2 LTS` and
  writes no files. It was not run on 4.x (no install is available), which
  is why the floor sits at the verified version.
- `compare` against the rebuilt body: `worst |diff| 0.541 at t=0.000 (all
  546 rows)`. The sample-row table is unchanged from before.
- `measure` on `reference.png`: new code output is byte-identical to old
  code output. The body masks are identical for the reference and the
  rendered body.
- `smooth`: output from the round-2 code is byte-identical to the round-1
  code for `profile.json` with `--rim` 0, 4, 50 and 94, and for the
  64-point measured profile with `--rim` 0, 10 and 30.
- Ranking probes (flip counts scripted, and RMS scripted where needed):
  - A 0-flip fit against a later 2-flip fit with lower RMS: the 2-flip fit
    is kept with `--flips 2`, the 0-flip fit with `--flips 0`.
  - All fits above the threshold, with two tied at 4 flips: the lower-RMS
    one is kept. Round-1 code kept the first one.
  - A single fit within the threshold is kept despite higher RMS.
- Boundary probes for `body_mask`:
  - Apple moved into the corner of a 2000px canvas: old code rejected it;
    new code gives a measurement identical to the reference's.
  - Closed ring drawn around the old seed pixel: old code silently measured
    the ring (aspect 1.000); new code measures the body, identical to the
    reference.
  - Outline cut open: both reject it.
  - Blank image and a single open line: new code rejects both.
- Boundary probes for `smooth` arguments:
  - `--points`: 1 rejected (old code wrote a 9-point profile from 104 input
    points), `abc` rejected, 2 accepted.
  - `--flips`: -1 and `abc` rejected; 0 and 5 accepted.
  - `--rim` (lowest point at index 99): -1, 95 and 999 rejected, while 0
    and 94 are accepted. Old code at 95 crashed with scipy's
    `(m>k) failed`.
