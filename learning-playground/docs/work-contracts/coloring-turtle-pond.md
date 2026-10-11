# Turtle pond coloring proof contract

## Root Cause
The coloring catalog has a bunny garden but no turtle setting. The existing
walking turtle is colorable, yet its transparent interior contours would let
scene lines show through. Reuse the proven garden pipeline, not a new project.

## Correct Fix Must Touch
- Add one layered Inkscape-editable pond source with existing turtle on a bank,
  lily pads, a large water lily, reeds/cattails and a dragonfly visitor.
- Produce a coloring-only opaque-interior turtle derivative from the saved PNG
  with the same CPU threshold/Potrace pipeline; preserve canonical animal art.
- Share the existing fixed-slot SVG publication logic between the two scenes,
  while retaining byte-identical bunny output and fixed trusted dependencies.
- Add turtle-pond catalog/schema selection, recipe, negative/replay/occlusion
  and source/publication parity tests. Preserve existing recipe lock enforcement.
- Update README, design/provenance docs and test scripts; retain source overlay
  and render evidence outside the disposable worktree.

## Must Not Change
Original animal art, bunny garden source/appearance, original four coloring
pages, curriculum, shared CSS/print helpers, playground/storybook, GPU/models,
dependency versions or recipe schema shape/caps. No photo conversion, new
storybook cast, other scenes, remote push, PR mutation, commit or merge.

## Assumptions / Design Plan
One print proof for owner review. Black #000 outlines, white #fff coloring
spaces; inherited Baloo/Nunito captions and half-inch Letter margins.
The turtle is the hero on a small bank, not floating with walking feet. A
dragonfly near its gaze supplies a story moment; asymmetrical reeds and broad
lily pads identify the pond. Use organic curved outlines and sparse ripples,
not repeated scenery wallpaper, full gray fills or microscopic details.

```text
              quiet title
      cloud                  cloud
   dragonfly                 tall reeds
            TURTLE ON BANK
      pond ripples      lily pads + flower
```

Review against brief: do not reuse the garden's tall flower framing verbatim;
the turtle's wider silhouette needs a broad, lower water composition. Keep
large colorable water/lily regions and make bank/water separation explicit.

## Verification Plan
Before edits, save source hashes and the approved bunny HTML hash. Targeted
coloring/scene/recipe tests must cover fixed ID and dependency locks, invalid
mixed/path/falsy inputs, source/publication parity, white interior/exterior
alpha and original turtle outline preservation; deliberate pose/scale drift
must fail parity. Run the existing full print pipeline for turtle pond and
frozen recipe replay, inspect actual grayscale PDF raster, correct defects at
the source and re-render. Check Letter dimensions/margins/clipping/error/ink
invariants and byte-identical replay image. No physical printer available.

## Cold Diff Audit

### Gaps
No implementation gap for this single companion proof. Physical printing and
owner approval of this new composition remain outstanding, explicitly outside
proof completion. No new model image was generated or canonical art edited.
Shared source/catalog changes invalidate older frozen recipes as designed;
the earlier durable source overlays retain their matching checkout versions.

### Implementation summary / Change By Change Reconstruction
All paths are repository-relative. This is a delta on the earlier uncommitted
coloring starter and bunny garden, whose audits remain in their own contracts.
Every entry traces to Correct Fix Must Touch; none crosses Must Not Change.

- `workbook/design-source/coloring/scenes/turtle-pond.svg:6`: reusable broad
  lily-pad/flower paths; `:21` ordered sky/water/reeds/bank/turtle/dragonfly/lily
  layers; `:50` linked fixed turtle slot. A bank grounds the walking pose and
  opaque interiors block pond lines. Actual final PDF raster inspected; ordered
  layer and source/publication parity tests cover the editable composition.
- `workbook/design-source/coloring/characters/turtle-coloring-opaque.svg`,
  root/contour groups: same established turtle/crop, white interior contours,
  transparent outside. Original black-on-white appearance retained within the
  existing tightly bounded opaque-trace tolerance. Face/shell/outside samples
  and outline/gray-delta test cover it. No canonical SVG overwrite.
- `workbook/design-source/coloring/characters/turtle-coloring-opaque.recipe.json:2`:
  existing AI source and CPU-derived export labeled honestly, exact source/output
  hashes, threshold, tools, crop, draft approval. Repeated preparation hashes
  match. New scene is assistant-authored native SVG, not claimed human-drawn.
- `workbook/tools/prepare-coloring-turtle.mjs`, fixed input/output and try block:
  ports the validated bunny threshold/Potrace opaque workflow without changing
  behavior or chasing new models. Only the source basename, derivative paths,
  temp prefix and receipt basename differ. Runs succeeded with identical SVG
  SHA256; known original PNG/SVG hashes remain unchanged. Reprint never runs it.
- `workbook/src/components/coloring-scene.mjs:10`: fixed turtle dependencies;
  `:19` turtle wrapper; `:23` shares prior one-slot embedding internally. Scene
  coordinates still control publication; href must match the exact fixed export,
  size must be positive, missing/duplicate/extra links fail. Good zero/negative
  positions and malformed/foreign/zero-size cases exercised. Existing bunny
  output hash remains identical; no recipe-selected paths or code evaluation.
- `workbook/src/content/coloring-pages.mjs:16`: adds one fixed turtle scene;
  `:17` lists its dependent character and trusted renderer; `:38` uses catalog
  scene renderer instead of one bunny-only conditional. Labels moved into the
  fixed scene entries without changing previous HTML. Assets remain deduplicated
  and locked at their existing owner. Tests cover mixed/repeated selection and
  exact prior bunny/starter HTML hashes.
- `workbook/recipes/workbook.schema.json`, coloring enum: adds only turtle-pond,
  no new schema shape, free-form cast, paths, caps or lock relaxation. Existing
  catalog/schema agreement and invalid/partial/mixed/falsy/cap tests pass.
- `workbook/recipes/coloring-turtle-pond.json:1`: one data-only fixed scene ID;
  full build/export/rasterize/verify plus frozen recipe replay exercised it.
- `workbook/tests/coloring-turtle-pond.test.mjs:16`: selection/dependencies/
  repetition/locks; `:40` editable layer order; `:51` slot boundary probes;
  `:75` preserved originals and accepted bunny HTML; `:90` actual source versus
  inline publication, deliberately shifted/resized negatives and opaque turtle
  alpha/appearance. No shared verification or old test was weakened.
- `workbook/package.json`, coloring:test and workbook:test: add the new test
  file, no dependency/lockfile update. Targeted command passed all tests.
- `workbook/README.md:92`: exact preview/PDF/build/test commands, linked-source
  editing, CPU export, matching source lock requirement; `:127` adds catalog ID.
- `workbook/docs/design-system.md:5`: pond-specific layout, layer ownership,
  print discipline, reproducibility, proof location and deferred storybook cast.
- `workbook/docs/art/asset-provenance.md:3`: dates, AI/source/edit labels,
  editable/export paths, CPU tooling and draft approval status.
- This contract: scope/assumptions, observed results and cold audit. Before/after
  diff, raw targeted test output, replay receipt and source overlay are durable.

### Parity with proven export
Inventory: prior `tools/prepare-coloring-bunny.mjs` uses the tracked animal PNG,
ImageMagick threshold 70 percent/alpha off, Potrace SVG opaque contours, Chrome
measured crop and saved hashes/tool versions. Turtle uses those identical
settings. Its approved walking PNG and existing canonical SVG are the input
oracle; no prompt/template/model/seed change or new inference occurred.

Observed original/opaque turtle: 121 differing binary edge pixels on a
1024-square canvas, mean gray delta 0.021289825439453125, below the same
pre-existing tolerance as the bunny. Face/shell now white alpha-255, exterior
still alpha-zero. Scene source versus publication: zero binary silhouette
differences, bounded linked-versus-nested edge smoothing (max 14 gray levels,
mean 0.00012369337979094077). Deliberate shifted/resized fixtures produce
5991/3039 silhouette differences and are rejected. No downstream masking patch
or weakened print invariant was added. No obvious final visual defect required
an art rewrite; initial and final actual PDF rasters were both inspected.

### Verification
- `node --test tests/coloring-turtle-pond.test.mjs`: 5 pass, 0 fail.
- `node --test tests/coloring-pages.test.mjs tests/coloring-scenes.test.mjs
  tests/coloring-turtle-pond.test.mjs tests/recipes.test.mjs`: 28 pass, 0 fail.
  Includes existing curriculum byte-identity fixtures, original starter and
  accepted bunny exact HTML checks, actual print/raster tampering negatives.
- `node tools/prepare-coloring-turtle.mjs`: repeated successful CPU export,
  SHA256 `065f5c955b5bf31d59984dbd6fdc27d7d99fc71f41a4d917ffcabf089e46df1e`.
- `node scripts/workbook.mjs all --recipe recipes/coloring-turtle-pond.json
  --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/turtle-pond-proof-2026-10-07/proof`:
  PASS after final source changes. One Letter page, 612 x 792 points, combined/
  individual PDF, screenshot, 150-DPI grayscale PDF raster, no overflow/errors/
  network requests, safe margins/current hashes/bounded ink. Final raster viewed.
- Same pipeline with `--recipe .../proof/recipe.json --out .../replay`: PASS.
  Preview/page HTML, recipe, manifest and actual raster byte-identical.
  PDF metadata byte equality is not claimed. `replay-verification.json` records
  proof/replay measurements, hashes and preserved source checks.
- `git diff --check`: PASS. App-wide/remote CI not run for this local print
  proof; physical printer unavailable. Source overlay matches by tar comparison.
- Durable evidence root:
  `/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/turtle-pond-proof-2026-10-07/`.

### Gap audit
DONE for turtle pond companion proof. Owner visual approval remains; no
additional scenes/cast, commit, push, PR mutation or merge in this slice.
