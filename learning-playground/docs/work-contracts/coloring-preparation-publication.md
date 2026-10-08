# Coloring preparation publication safety

Historical first fix, superseded by `coloring-review-proof-safety.md` after
review reproduced a post-snapshot edit race in 09456ff. The evidence below
records the earlier tested scope, not a current guarantee of conflict-free
live replacement. Current preparation publishes candidates only and does not
replace the artist's live inventory.

## Root Cause
Introducing commit: c4c73965079d788b592738495f68635112a601c0, authored in this
coding arc. Both prepare-coloring tools write the live SVG at line 23 before
Chrome crop measurement at line 24 and provenance receipt creation at line 34.
A later failure therefore mutates reviewed art without its matching receipt.
This is the same preparation/publication ownership defect copied into both
tools, not a PDF-renderer defect. Runtime reproduction is pending below.

## Correct Fix Must Touch
- Add an isolated CLI regression fixture exercising both existing entry points;
  induce Chrome failure after real threshold/Potrace steps and assert previous
  SVG/receipt/sibling files stay byte-identical. Run fail-first before the fix.
- Replace the duplicated exporters with one shared preparation owner and tiny
  fixed-character wrappers, preserving the proven inputs, threshold/Potrace
  arguments, crop producer, receipt shape, hashes and CLI argument rejection.
- Stage complete SVG/receipt preparation before publication, using the existing
  validated inventory publisher to preserve/rollback the previous directory.
  Copy sibling files without changing bytes; reject concurrent live changes.
- Exercise late metadata/receipt failures, publication rollback, successful
  byte parity and conflicting publishers. Load tests through the existing
  coloring test entry point so npm/CI exercise them without package edits.
- Narrowly ignore retained preparation inventories and document backup behavior.
- Record exact-head evidence, reply/resolve the owned finding after the complete
  class fix is verified and pushed. Commit/push once; subscribe and stop, no merge.

## Must Not Change
Approved SVGs/PNGs/scenes/receipts/PDFs, curriculum, UI, recipe schema/catalog or
source fingerprints, shared print helpers, dependencies, models or GPU. No new
artwork, broad local CI duplicate, other PRs/worktrees, force operations or merge.

## Assumptions / Verification Plan
Ordinary preparation errors must leave the live inventory unchanged. The existing
inventory publisher preserves previous contents and rolls back a failed final
rename; it does not promise uninterrupted multi-file reads or power-loss atomicity.
Source readers and frozen recipes retain existing fail-closed hash behavior.
All mutation probes run in fresh fixture copies, not reviewed source art.
Use the exact previously validated CPU tool/crop settings; verify successful
SVG/receipt byte parity before accepting the refactor. Keep raw probe/test logs
outside worktrees with private permissions. Run focused tests, adjacent coloring
tests and syntax checks; remote CI owns the duplicated broad workbook suite.

## Implementation summary
Both CLI wrappers now invoke one CPU preparation owner. It copies the current
regular-file inventory to staging, runs the unchanged trace/crop/export recipe,
prepares and checks the receipt, rejects input/live-inventory drift, then
publishes the complete directory through the existing rollback helper.
No PDF consumer workaround or new art is added. Early writes and duplicated
receipt logic in both entry points are removed rather than supplemented.

### Contract clarification from observed lock failure
`src/recipes.mjs:sourceFingerprint` includes package.json. Adding the test file
to npm scripts changed that input and correctly invalidated the frozen recipe.
Do not regenerate approved artifacts or weaken the lock: leave package.json
unchanged and import the preparation tests from coloring-pages.test.mjs, already
included in both coloring:test and workbook:test. Tests are not render inputs.

## Cold Diff Audit

### Gaps
No local implementation gap. Remote CI and independent exact-head re-review
remain pending after publication; no merge authority. Existing publisher does
not guarantee power-loss atomicity or uninterrupted reads during directory swap.

### Change by change / contract traceability
- `workbook/tools/prepare-coloring-character.mjs:22`: one fixed-character
  preparation owner, rejects unknown keys before writes. `:29` stages with
  existing directory validation; `:32` snapshots/copies sibling files; `:37`
  unchanged threshold/Potrace; `:41-53` SVG/crop/metadata/receipt only in staging;
  `:54-58` input/inventory drift rejection and complete rollback-capable publish;
  `:60` removes only its private temporary paths, retains previous inventory.
  Satisfies origin fix and proven-settings parity, covered by both CLI tests.
- `workbook/tools/prepare-coloring-bunny.mjs:2` and
  `workbook/tools/prepare-coloring-turtle.mjs:2`: fixed wrappers preserve no-args
  contract and stdout record, delegate all preparation/publication to one owner.
  Removes both early-write defects introduced by c4c73965079d788b592738495f68635112a601c0.
- `workbook/tests/coloring-preparation.test.mjs:12`: isolated actual CLI fixtures;
  `:48` crop injection after real trace; `:49-67` late metadata/receipt/rename
  and concurrent artist-edit injections; `:80` failure hashes; `:91` successful
  complete byte parity and previous backup; `:105` conflict rejection; `:113`
  CLI argument rejection; `:123` unknown/falsy/path/prototype ID rejection.
  No reviewed repo files are modified by probes. Fresh copies retain oracle
  settings/exports and evidence can be retained durably outside worktrees.
- `workbook/tests/coloring-pages.test.mjs`, preparation-test import: existing
  npm/CI entry points run the new regression without changing fingerprinted
  package.json. No existing test or verification assertion weakened.
- `workbook/.gitignore`, preparation inventory rule: ignores only hidden
  generated/retained character inventories, not actual artist sources.
- `workbook/README.md:102`: documents shared preparation, failed-step safety,
  retained rollback inventory and limits; no claim of crash atomicity.
- This contract: introducing commit, observed fail-first hashes, shared origin
  repair, parity inventory, targeted verification and scope boundary.

### Reproduce / isolate / explain / fix / prove / prevent
1. Original-commit isolated crop-interruption regression: 2 tests, 0 pass,
   2 fail; both fail exactly because reviewed inventory changed. Bunny SVG
   changed from 4ef14fb662335a2a41e74d735c2b1100333a1a4f99962b707b60ef00655c6818
   to c1d19b67dc1a0aaa96a995feca9ead90748b004d022accc6cd18331bf1934a54;
   turtle from 065f5c955b5bf31d59984dbd6fdc27d7d99fc71f41a4d917ffcabf089e46df1e
   to 9e9f5c7c00939330a007999698bdc5c574a75bc39f80a68ac7cbc9bbc021ade0.
2. Isolated first divergence: each old tool line 23 writes live uncropped SVG;
   line 24 then throws. Receipt unchanged. Minimal fixture uses real traced
   inputs plus one injected Chrome failure, without model/GPU or PDF work.
3. Cause: preparation and publication were interleaved in two copied owners.
   Both came from my introducing commit, confirmed by git blame.
4. Fix: shared preparation owner stages complete outputs before existing
   inventory publication; both copied early writes removed.
5. Proof: original crop probes now pass; late metadata/receipt/publication
   failures preserve SVG/receipt/siblings; successful exports/receipts remain
   byte-identical to the previous proven settings; concurrent edit preserved.
6. Prevention: CLI regression tests imported into existing npm/CI entry point;
   both animals and original failure class covered, not just one site.

### Verification
- Focused preparation tests: 12 pass, 0 fail before adding argument/ID guards.
- Final preparation plus adjacent coloring/recipe command: 43 pass, 0 fail
  (15 preparation tests); raw result in durable after-final.log.
- `node --check` on shared preparation, both wrappers and preparation tests:
  PASS. `git diff --check` PASS.
- Approved PDF/contact/recipe hashes and frozen source lock unchanged: PASS
  after restoring package.json and routing tests through the existing entry.
  No render input/art/generated-output change; no full book rerender required.
- Broad workbook suite left to required remote CI, not duplicated locally.
- Durable evidence alias root: coloring-preparation-fix-2026-10-07 under the
  operator's codex-evidence/kennedi-workbook directory. Contains before/after
  raw logs, isolated fixture/source copies and reproduction receipt.

## Gap Audit
DONE for local reproduction, class fix, regression verification and cold audit;
remote publication/review reconciliation recorded in session state. PR remains
unmerged; new-head CI/re-review must be assessed separately, not inferred green.
