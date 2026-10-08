# Bunny garden coloring proof contract

## Before Code

### Root Cause
The accepted coloring starter has isolated animal portraits. Its catalog only
maps an ID to one transparent-outline SVG, so it cannot compose a little scene
or stop background lines showing through the animal's white interior holes.

### Correct Fix Must Touch
- Add one editable, layered bunny-garden SVG with flowers, carrots, butterfly,
  airy background and foreground; retain the established bunny's identity.
- Add a derived opaque-interior bunny SVG and CPU-only reproducible preparation
  tool using the existing source PNG, threshold and potrace. Check black-on-white
  visual parity with the existing SVG; never regenerate or edit canonical art.
- Extend the coloring catalog/renderer and recipe enum with fixed bunny-garden
  selection; lock all scene dependencies and fingerprint new rendering code.
- Add an example recipe, targeted composition/replay/negative tests and print
  proof, using the existing build/PDF/raster/verification pipeline.
- Document provenance, layer ownership, reproduction, later character support,
  and owner-review gate. Retain source snapshot and proof outside the worktree.

### Must Not Change
Original bunny/animal/character artwork, the starter's page HTML or pixel
appearance, other workbook templates/curriculum, shared print helpers/CSS,
existing app/storybook, private photos, model/GPU configuration and dependencies.
No Pippa/Kennedi scene yet, no other backgrounds, no remote actions or merge.

### Assumptions / Design Plan
This is one owner-review proof, not a mass rollout. Local, vector-native assets
are appropriate; no bitmap generation or GPU model is required. Ink black
#000 and paper white #fff, existing Baloo/Nunito captions. Broad organic curves,
large coloring regions, quiet title. Center bunny with asymmetrical flower
clusters at the sides, butterfly near its gaze, carrots in the foreground,
few background clouds. Avoid a dense all-over pattern or worksheet frames.
New title: Bunny's garden. Plain animal pages remain available and unchanged.

```text
          quiet caption
     clouds         butterfly
 flowers      BUNNY       flower
       carrots / broad ground shapes
```

Review against the brief: a generic floral wallpaper would obscure the child’s
coloring subject. Keep visible white space; use the visiting butterfly as the
story moment, not equal-sized competing characters. Background lines can pass
behind the bunny only with tested white-interior occlusion.

### Verification Plan
Targeted coloring and adjacent recipe tests; curated ID/dependency agreement,
reject unknown/mixed IDs, unchanged starter HTML against saved proof, dependency
lock tampering, scene layering, background occlusion and black-on-white bunny
parity. Run scene build/PDF/screenshots/rasterize/verify, inspect actual raster,
correct genuine defects at their source, repeat if needed. Replay saved recipe
and compare pixels. Retain hashes and exact source outside worktree. No physical
printer available; raster print inspection is the substitute.

## Cold Diff Audit

### Gaps
No implementation gap in this one-scene proof. Owner visual approval and a
physical printer trial remain outside implementation completion. Original
bunny ear/tail trace texture is inherited, not newly cleaned canonical art.
No other scene or storybook character was added. This is local uncommitted
work on top of the earlier coloring-starter slice, not a published PR change.

### Change By Change Reconstruction / Contract Traceability
All paths are repository-relative. This audit covers the garden delta; the
earlier coloring template/CLI/CSS/test work remains documented in
`coloring-recipe-pack.md`. Those pipeline and CSS files were not changed again.
Every entry below traces to Correct Fix Must Touch; protected original animal
SVGs, curricula, app, shared print helpers and model configuration are untouched.

- `workbook/design-source/coloring/scenes/bunny-garden.svg:6`: reusable organic
  blossom/carrot definitions; `:18` ordered editable background, flower,
  linked bunny, butterfly and foreground layers; `:37` single canonical slot;
  `:41` butterfly offset avoids ear contact. Layer and source/publication parity
  tests plus final actual PDF raster inspection cover this composition.
- `workbook/design-source/coloring/characters/bunny-coloring-opaque.svg:1`:
  Potrace derivative of the existing PNG, same outline/crop with opaque white
  negative contours, transparent exterior. Browser silhouette/gray-delta and
  face/body/outside alpha probes cover it; original art is unchanged.
- `workbook/design-source/coloring/characters/bunny-coloring-opaque.recipe.json:2`:
  explicit AI source, derived-vector modification, fixed input/output hashes,
  threshold, observed tool versions, crop and draft approval. Repeated CPU
  preparation produced the same derivative SHA256.
- `workbook/tools/prepare-coloring-bunny.mjs:11`: fixed local source/output;
  `:18` ImageMagick/Potrace opaque export; `:24` measured crop; `:27` provenance;
  `:36` cleanup of owned temporary directory. Executed successfully; no model,
  download or canonical overwrite. Reprinting does not execute this tool.
- `workbook/src/components/coloring-scene.mjs:6`: fixed trusted dependencies;
  `:13` exactly one source slot; `:17` source-owned coordinates; `:23` inline
  editable vector derivative; `:27` rejects remaining image dependencies.
  Actual source/published parity and deliberately shifted/resized fixtures
  prove that publication follows the artist composition rather than new code
  positions. Recipe input never supplies a path or executable markup.
- `workbook/src/content/coloring-pages.mjs:13`: adds only bunny-garden to the
  existing fixed catalog; `:29` locks both scene and character dependencies;
  `:34` selects the scene compositor only for that ID. The original starter's
  complete page HTML hashes remain identical; selection/repetition tests pass.
- `workbook/recipes/workbook.schema.json:13`: adds one fixed scene enum value,
  leaving the existing data-only bounds and forbidden extra keys intact.
  Mixed/unknown ID, path, markup and lock-tampering tests exercise both sides.
- `workbook/src/recipes.mjs:96`: coloring source fingerprint includes the new
  compositor. No lock bypass or alternative stale-source acceptance added.
  Dependency/source/content tampering and saved-recipe replay tests cover it.
- `workbook/recipes/coloring-bunny-garden.json:1`: one ordered, data-only page;
  used directly for the print proof and resolved/frozen recipe roundtrip.
- `workbook/tests/coloring-scenes.test.mjs:13`: dependencies/replay/repetition;
  `:24` negative inputs/locks; `:35` vector layering; `:44` accepted starter
  HTML preservation; `:62` opaque-interior appearance/alpha; `:94` actual
  source/publication silhouette parity and shifted/resized rejection.
- `workbook/package.json:9` and `:45`: include new scene tests in coloring and
  workbook test commands. No dependencies/lockfile changes in the garden delta.
- `workbook/README.md:50`: exercised recipe/PDF/preview commands and editable
  scene/derivative workflow; `:87` future cast explicitly deferred.
- `workbook/docs/design-system.md:5`: layering, line clarity, source ownership,
  bounded print parity, reproduction, proof path and owner-review gate.
- `workbook/docs/art/asset-provenance.md:3`: assistant-authored garden and
  existing AI bunny derivative are labeled honestly; no new image inference;
  source/export paths, known trace texture and approval gate preserved.
- This contract records the original scope, inspection findings, exact
  verification and cold reconstruction. Durable evidence is outside worktrees.

### Issues reproduced, isolated, explained and corrected
1. Transparent white regions: existing outline SVG leaves face/body alpha zero
   at sampled interior points, so a backdrop would show through. Origin is the
   original transparent-contour export. A coloring-only opaque derivative
   retains original identity while producing white alpha-255 interiors and
   alpha-zero exterior. Regression compares outline/gray deltas and all three
   regions. No downstream white rectangle or canonical asset edit.
2. Butterfly/ear contact: the first actual PDF raster showed overlapping
   contours. Origin was the new garden SVG butterfly transform. Adjusted that
   transform at the source and inspected the regenerated PDF: visible gap,
   unchanged large coloring regions. This was introduced in this uncommitted
   slice, not inherited from main.
3. Overstrict parity assertion: my newly added test expected linked SVG image
   and nested inline-vector RGBA bytes to be identical. Reproduced 27 changed
   bytes, isolated to 9 edge pixels, maximum 3 gray levels, zero binary
   silhouette changes on a 700 x 820 canvas. Fixed that test's false assumption
   at its origin: exact binary silhouette equality plus tightly bounded gray
   difference, not deleting the parity guard. Positive case passes; deliberately
   shifted/resized cases differ by 5649/2847 silhouette pixels and are rejected.
   No rendering workaround or changes to shared verification were needed.

### Verification
- `node --test tests/coloring-pages.test.mjs tests/coloring-scenes.test.mjs
  tests/recipes.test.mjs`: 23 tests, 23 pass, 0 fail. Covers prior curriculum
  output hash fixtures and the complete new coloring/scene input and print path.
- `node tools/prepare-coloring-bunny.mjs`: repeated successful runs, same SVG
  SHA256 `4ef14fb662335a2a41e74d735c2b1100333a1a4f99962b707b60ef00655c6818`.
- `node scripts/workbook.mjs all --recipe recipes/coloring-bunny-garden.json
  --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/bunny-garden-proof-2026-10-07/proof`:
  PASS. Combined/individual PDF, screenshot, 150-DPI grayscale PDF raster;
  one US Letter page, 612 x 792 points, safe margins, no errors, overflow or
  network requests, current source/art/output hashes and bounded ink coverage.
- Same pipeline using `--recipe .../proof/recipe.json --out .../replay`: PASS.
  Preview/page HTML, recipe, manifest and actual PDF raster are byte-identical;
  `replay-verification.json` records hashes. PDF metadata byte equality is not
  claimed. Final proof raster visually inspected after butterfly adjustment.
- `git diff --check`: PASS. Shared print pipeline is unchanged; no duplicated
  app-wide CI suite or remote CI claim. No physical printer available.
- Durable root:
  `/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/bunny-garden-proof-2026-10-07/`.
  Includes proof/replay, verification receipts and source snapshot/receipt.

### Gap audit
DONE for the limited reproducible layered garden proof. New composition still
requires owner visual approval. Pippa/Kennedi coloring adaptations and additional
backgrounds remain future scope. No commit, push, PR mutation or merge.
