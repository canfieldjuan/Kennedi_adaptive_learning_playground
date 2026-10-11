# Original coloring pack change contract

## Root Cause
Family-photo conversion failed the owner's likeness expectations. The workbook
already owns reusable animal SVGs and a recipe/print pipeline, but has no
full-page coloring template or data-only coloring recipe. Reprinting must not
depend on an image model, GPU, private photos, or new project.

## Correct Fix Must Touch
- Add a curated coloring catalog, art-first page renderer and scoped print CSS.
- Add a coloring recipe schema branch, fingerprint/freeze/resolve support and
  fixed CLI dispatch using the existing print-artifacts helpers.
- Add a small starter recipe, tests for bounds, unsafe input, locks and replay.
- Document exact commands, asset reuse/provenance and visual approval status.
- Render all starter pages to individual/combined Letter PDFs, browser images,
  grayscale PDF rasters and a labeled contact sheet. Keep durable review output
  outside disposable worktrees.

## Must Not Change
Existing artwork bytes, workbook curricula, alphabet/numbers/counting page
renderers, tracing, shared styles and print helpers, playground/storybook app,
model/runtime configuration, private photo proof. No image generation, remote
publication, PR mutation, merge, extra workbook pages or full pose library.

## Decisions / assumptions
Starter scope: four curated animal coloring pages, one large subject per page;
use existing genuinely colorable SVGs after visual inspection. Black and white,
quiet captions, no worksheet cards, half-inch safe margins. Recipes select
catalog IDs only; no paths, markup, arbitrary captions or executable prompts.
Existing locked recipes intentionally reject changed shared renderer inputs;
do not weaken locks. Existing unlocked content must remain byte-identical.
Reprint reproducibility means fixed content/art/source hashes, not identical
PDF metadata across browser versions or reproducible AI regeneration.
All new page layouts remain drafts pending owner visual approval.

## Verification
Run adjacent recipe/coloring tests including schema boundary/negative cases,
lock tampering and unchanged existing output hash fixtures. Run the new pack
through build/pdf/screenshots/rasterize/verify, inspect every final PDF raster,
check page count/dimensions, titles, asset hashes, margins and browser overflow/
errors/offline requests. Exercise saved-recipe replay and a single-page pack.
Cold audit the diff against this contract; do not push or merge this slice.

## Cold Diff Audit

### Gaps
No implementation gap against this draft starter-pack contract. Artwork is
reused unchanged, not claimed as newly polished: original bunny ear/tail and
whale cheek trace texture remains visible. Final visual acceptance and remote
publication are intentionally outside this slice. No physical printer test
was performed; actual grayscale PDF rasters were inspected instead.

### Change By Change Reconstruction / Contract Traceability
All paths below are repository-relative. Each entry traces to Correct Fix Must
Touch; none crosses Must Not Change.

- `workbook/src/content/coloring-pages.mjs:7`: fixed reviewed-use catalog;
  `:16` bounds and fixed-ID lookup; `:27` one art-first page per selection.
  Covered by catalog/schema, range, mixed-input, lock/replay and print tests.
- `workbook/src/styles/coloring-practice.css:2`: scoped half-inch shell,
  quiet captions and large drawing area; `:5` natural heading line height.
  Browser regression and final raster/margin/overflow measurements cover it.
- `workbook/recipes/coloring-starter.json:1`: deterministic ordered starter.
  Starter roundtrip and full print/replay runs cover it.
- `workbook/recipes/workbook.schema.json:7`: new strictly bounded data-only
  coloring branch; fixed IDs only. Negative/partial/falsy/cap tests cover it.
- `workbook/src/recipes.mjs:8`: imports fixed coloring owner; `:14` dispatch;
  `:82` catalog listing; `:96` fingerprint; `:115` ordered content freeze;
  `:129` resolution. Lock tampering/replay and original content hash fixtures
  cover these; unchanged locks still reject source/content/art drift.
- `workbook/scripts/workbook.mjs:37`: forwards recipe to fixed coloring
  executable mapping. No shell, arbitrary executable or model runtime.
  Single-page end-to-end test and starter/replay CLI runs cover it.
- `workbook/scripts/coloring.mjs:11`: strict CLI; `:51` bounded art-cropped
  self-contained build; `:61` Letter combined/individual PDFs; `:81` browser
  screenshots; `:95` actual grayscale PDF rasters and hash receipt; `:114`
  verification of source/art/output freshness, dimensions, margins, browser
  failures, offline rendering, large art and coarse nonwhite coverage.
  Full starter/replay pipelines and altered-raster rejection test cover it.
- `workbook/tests/coloring-pages.test.mjs:14`: catalog/starter replay;
  `:24` range/order/repetition; `:33` negatives; `:43` altered locks; `:53`
  invalid CLI; `:66` real-font regression; `:88` actual single-page printing,
  locked-recipe replay and corrupted-raster rejection/restoration. Temporary
  fixtures are cleaned after their tests.
- `workbook/package.json:8`: coloring build/test aliases; workbook test entry
  includes new tests. No dependency or lockfile change. npm ci succeeded.
- `workbook/README.md:13`: install, preview, PDF, verification, recipe editing,
  no-GPU reproduction and source-lock limitations. Commands exercised.
- `workbook/docs/design-system.md:3`: original coloring layout principles,
  fixed catalog/source flow, print constraints and draft approval boundary.
- `workbook/docs/art/asset-provenance.md:3`: original AI art reuse, unmodified
  source paths, source/export separation and known trace texture.
- This contract: scope, assumptions, verification and actual audit evidence.

### Verified defect: heading leading
Reproduced in the initial starter print verification: My bunny had safe margins
but header clientHeight 68 / scrollHeight 77. Origin was the new coloring CSS
font shorthand using 1.15 line-height; h1 was 46 / 55 pixels. A direct inline
natural-line-height experiment changed the header to 86 / 86. Fixed at
`coloring-practice.css:5` with normal leading, not by shrinking art or weakening
the overflow test. The heading test measures all catalog titles and deliberately
reintroduces 1.15 to prove the failing class. Full starter now passes.
This was introduced during this uncommitted slice, not inherited from main.

### Verification
- `npm ci`: installed existing dependencies; zero reported vulnerabilities.
- `node --test tests/coloring-pages.test.mjs tests/recipes.test.mjs`: PASS;
  includes existing content byte-identity fixtures, boundary/negative tests,
  source/content/art lock tampering and actual single-page printing.
- `node scripts/workbook.mjs all --recipe recipes/coloring-starter.json --out
  /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/original-coloring-pack-2026-10-07/starter`:
  PASS, four combined/individual Letter pages, 612 x 792 points, safe margins,
  no overflow/browser errors/external requests; actual grayscale 150-DPI rasters.
- Same command with `--recipe .../starter/recipe.json --out .../replay`: PASS.
  Compared preview HTML, recipe, manifest and every PDF raster: byte-identical.
- Every PDF raster and final contact sheet visually inspected; no clipped
  drawing or crowded activity. No source SVG art changes were needed.
- `git diff --check`: passed. Existing app/CI-wide suites intentionally not
  duplicated for this independent print template. No remote CI claim.
- Durable evidence root:
  `/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/original-coloring-pack-2026-10-07/`.
  `starter/verification.json`, `replay-verification.json`, actual raster pages
  and combined PDF are the evidence; not disposable-worktree-only artifacts.

### Gap audit
DONE for reproducible original coloring starter proof. Still draft for owner
visual approval. No commit/push/PR/merge or mass art-family rollout in this slice.
