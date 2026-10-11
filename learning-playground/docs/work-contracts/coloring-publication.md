# Publish owner-approved coloring system

## Root Cause
The starter coloring template, bunny garden and turtle pond are verified but
still uncommitted in the isolated coloring worktree. Owner approved the rendered
scenes and authorized committing the system and opening a PR. Historical draft
labels need a current approval record, and a reviewer needs viewable artifacts.

## Correct Fix Must Touch
- Commit only the existing coloring implementation, tests, editable sources,
  recipes and contracts documented in the three completed coloring contracts.
- Add a paired data-only scene recipe and publish its rendered contact sheet,
  Letter PDF, frozen recipe and provenance/verification receipt under docs/art.
- Update README/design/provenance with the owner's scene-specific approval;
  do not represent the whole animal/character library as approved.
- Record durable publication state, exact head, evidence hashes and review timer;
  push the owned branch, create/attach the PR, subscribe and stop.

## Must Not Change
No new scenes, Unicorn Meadow, Whale Cove, Pippa/Kennedi adaptations, original
animal art, curriculum, app, model configuration, dependency versions, shared
print helpers/CSS or previous approved page appearance. No merge, force push,
other PR mutation or worktree cleanup. Generated workbook/dist remains untouched.

## Assumptions / Verification Plan
Owner's approval is for these rendered compositions: "Nice" for bunny garden,
"love it" for turtle pond; not physical-printer qualification or a new art family.
The original animal starter was also accepted previously. Preserve historical
draft receipts as creation provenance; add an explicit current scene approval.
Run adjacent coloring/recipe tests and paired build/PDF/screenshots/raster/verify;
visually inspect the paired contact sheet and compare its art to approved proofs.
Cold-audit the full staged change against prior contracts. No duplicated app-wide
local CI suites. Keep private photos and session ledger out of Git. No remote
CI/review readiness claim before a later permitted exact-head check.

## Cold Diff Audit

### Implementation summary
Publish the existing coloring template and owner-approved bunny/turtle scenes;
no renderer behavior or artwork changed during publication preparation.
The complete implementation reconstruction remains in coloring-recipe-pack.md,
coloring-bunny-garden.md and coloring-turtle-pond.md. Re-read final source,
tests, fixed-slot publisher, CPU export tools and scene masters against those
contracts before staging. Existing canonical art and workbook/dist are untouched.

### Change by change
- `workbook/recipes/coloring-scenes.json`: ordered, data-only pair. Resolves to
  exactly the same frozen content/asset/source lock as the published recipe.
- `workbook/docs/art/coloring-approved/`: actual grayscale PDF contact sheet,
  combined Letter PDF, frozen recipe, verified hash/approval receipt and short
  reproduce/source README. Artifact copies are hash-checked against the durable
  paired print output, not screenshots claimed to represent a PDF.
- `workbook/README.md`: printable pair links and exact rebuild command; current
  scene-specific approval wording, original derivative limits and locked-source
  requirements. No blanket new-cast or art-family approval.
- `workbook/docs/design-system.md`: owner decisions for bunny garden and turtle
  pond; physical-printer qualification and future scenes remain outside scope.
- `workbook/docs/art/asset-provenance.md`: current approval section supersedes
  dated creation-stage draft labels without erasing historical provenance.
- This publication contract records the bounded packaging/remote workflow;
  prior contracts record the original source changes and regression evidence.

### Verification
Targeted coloring/pages/scenes/turtle and adjacent recipe tests: 28 pass, 0 fail.
Paired build/PDF/screenshots/rasterize/verify: PASS, 2 US Letter pages, 612 x 792
points, current source/asset hashes, safe margins, no overflow/errors/network,
actual grayscale PDF rasters and bounded ink. Final paired contact sheet viewed;
approved composition retained, turtle footer now 2. Publication artifact hashes
and editable/frozen recipe parity PASS. `git diff --check` PASS.
Later changes in this publication pass are documentation only; code tests are
not rerun unnecessarily. Remote CI and independent PR review remain pending.

### Gap audit
No gap in local publication scope. Physical printing is untested; inherited
bunny/whale trace texture is documented. Future cast/scenes, model-runtime
integration, full art-family approval and merge are deferred. Historical frozen
recipes require their matching source revision, intentionally unchanged policy.
Remote publication will be recorded by exact head in durable session state;
no local green result substitutes for later exact-head CI/review readiness.
