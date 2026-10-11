# Unicorn Meadow coloring proof contract

## Root Cause
The owner approved a next Unicorn Meadow proof after PR 158 merged. The current
coloring system has a reusable unicorn but no meadow composition. Layering the
original transparent contours directly over hills/rainbow would show background
lines through the animal. Reuse the established fixed-scene and opaque-contour
owners, not a new publishing system or a new character design.

## Correct Fix Must Touch
- One Inkscape-editable meadow SVG: existing unicorn, rolling hills, a wide-band
  rainbow, a few large organic flowers and ample open coloring areas.
- Add unicorn to the existing CPU-only character preparation input map; a thin
  fixed wrapper calls that same owner. Preserve capture-once provenance and
  candidate-only publication. Adopt only the visually inspected candidate SVG
  and its receipt as separate source assets; no live-directory replacement.
- Fixed unicorn scene wrapper/dependencies, curated catalog entry and schema
  enum, one data-only recipe. Keep fixed-slot validation and frozen locks.
- Targeted selection/lock/negative/replay/layer/reference/opaque/parity tests;
  include that test in the existing coloring and workbook test commands.
- README, design-system and provenance docs with exact reproduction commands,
  source paths and draft / owner visual approval required status.
- Durable proof, PDF raster, frozen-recipe replay and source archive outside
  disposable worktrees; local implementation commit after inspection.

## Must Not Change
Canonical unicorn PNG/SVG, bunny garden and turtle pond sources/appearance,
the approved published pair, existing books/curriculum, renderer/print CSS,
output ownership/publication pipeline, schema shape/caps, dependencies/lockfile,
the playground or Story Stage. No new image-model calls, GPU use, family photos,
storybook cast, new poses or additional scenes. No production approval, remote
push, PR creation/mutation or merge before owner sees this proof.

## Assumptions / Design Plan
One draft printable page, US Letter with inherited half-inch margins and
Baloo/Nunito captions. Art uses black #000 contours and white #fff interiors;
existing UI gray levels are not added to the coloring art. The foreground
flower contours are softer than the rainbow's clean curves. Spend detail on
the established expressive unicorn; keep the setting simpler than the animal.

```text
                 quiet title
       cloud == broad rainbow == cloud
              distant rolling hill
                 UNICORN
          open meadow / grounded hooves
        large flower          large flower
```

Review against brief: this is not the garden frame reused with a new animal.
Use a sweeping rainbow in the upper scene, low hills and foreground blossoms
below/outside the unicorn's silhouette. Rainbow bands are broad enough for
preschool crayons. Opaque contours hide the distant hill behind the body, not
a rectangular white patch. No dense grass wallpaper, tiny stars or gray fills.

## Proven Pipeline Inventory / Port Differences
Existing preparation: tracked PNG, ImageMagick threshold 70 percent/alpha off,
Potrace SVG --opaque, Chrome-measured crop; captured bytes own input hash and
conversion; unique review candidate directory. This slice changes only the
fixed input basename/name. Existing scene publication inlines a validated linked
character; its coordinates remain the layout owner. No new renderer or model.
Canonical input hashes before edits:
- PNG: 15b80cfef3eaffc2156290d53e2d9b5b6a76859f74a2e01bebae16a24ad57256
- SVG: b3423310defd702e3fcd79e663d526d410bb41d4b7a187b3683558ec1b82d0ea

## Verification Plan
Run targeted scene/recipe/preparation siblings on Node 20, and syntax/diff
checks. Cover mixed/repeated/cap/false/path selections and both selected-asset
hashes; missing/duplicate/foreign links and invalid geometry; actual source to
inline raster parity with deliberate pose/scale mutations rejected. Compare the
derived character on white against the canonical line art using the existing
opaque-contour tolerance, verify white interior/exterior transparency and real
background occlusion. Do not relax a bound if it fails; investigate the origin.
Run existing all pipeline for this recipe, then frozen replay. Inspect browser
page and actual grayscale PDF raster for clipping, muddy detail, tangencies,
grounded feet, broad coloring spaces and margins. Verify one Letter page, no
browser errors/overflow/external requests and byte-identical replay raster.
No broad duplicate local CI suite or physical-printer claim.

## Durable Evidence / Ownership
Evidence: /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/unicorn-meadow-proof-2026-10-11-p40wU0/.
Base d1506733c28d2ec2fe56fb2cf5bc268d7778efad; owned branch
codex/coloring-unicorn-meadow in its isolated worktree. Other PRs/worktrees are
unowned. PR: none. Owner visual approval, remote CI and merge are separate gates.

## Implementation Summary / Cold Diff Audit / Gap Audit

### Implementation summary
Implemented the one fixed meadow selection, editable layered scene, opaque
unicorn derivative/receipt and thin preparation/publication wrappers. Shared
owners retain conversion, fixed-slot validation, recipe locks and printing.
Canonical artwork, accepted scene pair and other books are unchanged.
Local commands (from workbook/, Node 20):

```bash
node --test tests/coloring-unicorn-meadow.test.mjs tests/coloring-pages.test.mjs tests/coloring-scenes.test.mjs tests/coloring-turtle-pond.test.mjs tests/recipes.test.mjs tests/coloring-preparation.test.mjs
node scripts/workbook.mjs all --recipe recipes/coloring-unicorn-meadow.json --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/unicorn-meadow-proof-2026-10-11-p40wU0/proof
node scripts/workbook.mjs all --recipe /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/unicorn-meadow-proof-2026-10-11-p40wU0/proof/recipe.json --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/unicorn-meadow-proof-2026-10-11-p40wU0/replay
```

Adjacent regression result: 82 pass, 0 fail. Both print pipelines PASS. Final
browser screenshot and actual grayscale PDF raster visually inspected. Output:
one page, 612 x 792 points, safe margins/no overflow, no browser errors/external
requests; raster inkFraction 0.069483541295306. Byte-identical frozen replay:
preview HTML, recipe, browser image, PDF raster and contact sheet. No PDF-byte
identity or physical-printer claim.

### Cold diff audit
One fixed whitelist entry maps to trusted scene/character paths; recipes cannot
choose arbitrary files, inject a cast or exceed the existing cap. All selected
dependencies remain locked. Preparation changes only its fixed input map;
capture-once provenance and candidate-only publication are untouched.
`src/components/coloring-scene.mjs:30` still owns reference/geometry validation;
`tools/prepare-coloring-character.mjs:16` still owns preparation. No duplicated
guard, downstream filter or new output-owner path. No dependency or workflow
change; CI's existing workbook:test includes the new test file.

boundary-probe: valid single/mixed/repeated/max selections replay; empty,
over-cap, falsy/path selections and missing/duplicate/tampered locks reject.
Finite artist coordinates, including zero/negative origins, retain layout;
missing/duplicate/foreign slots and invalid dimensions reject. Existing output
ownership and concurrent-preparation siblings pass without changing their tests.

effect-trace: background stays behind the unicorn | opaque contour derivative
embedded by the shared fixed-slot owner | white face/body samples cover an
actual black backdrop, exterior remains transparent, and final PDF raster
shows no backdrop bleed. Scene source paths own flower/hill/ground placement;
actual before/after print images demonstrate grounded hooves and contour gaps.

### Verification-origin correction
The initial new unicorn test incorrectly reused turtle-specific raster bounds.
Reproduced failure: one linked/inline edge threshold crossing; canonical/opaque
comparison has 264 edge crossings. Isolated to rasterization representation,
not changed shape: all 6,625 normalized contour tokens match; every changed
threshold pixel is an intermediate antialiased edge. Corrected this new test
at its origin with exact geometry equality plus measured unicorn edge bounds.
Existing bunny/turtle bounds are untouched. The original scene comparison now
passes; position/scale mutations still reject, and a contour mutation fails
exact geometry. Raw first failure, diagnostic and passing run are retained
under the durable root. No production renderer/artwork fix was invented for
a test-assumption defect.

### Gap audit
DONE locally: contracted implementation, adjacent tests, PDF/screenshot/raster
inspection, frozen replay, documentation and durable artifacts. Renderer, print
CSS, schema shape/caps, dependencies, canonical art and accepted outputs were
not changed. Source fingerprint changes from catalog/schema/package entries
intentionally invalidate old frozen recipes; keep their matching source.
At the local-proof handoff, NOT DONE: owner visual approval, physical printing, remote publication, CI,
independent PR review or merge. Those remain separate gates. No next scene,
storybook-cast rollout, new workbook pages or GPU/model call occurred.

## Owner Approval / Publication Follow-up: 2026-10-11

Owner reviewed the final rendered Unicorn Meadow and replied "looks good".
Record approval for this exact composition/derivative only, not future scenes,
the cast, physical printing or merge. Approved implementation:
85bb0f14a4667a15f9494eb36fa19f5949639994. Approved PDF SHA256:
85d3e56fa81bf6ac89b737b20c60354815453462fbf9effc09d08591ccd7d11c;
raster SHA256: c4a3fbd1c1deef24602ce553dae5940957f06ced4696870504bdfcd437863b84.

Required follow-up surface: this contract plus README, design-system and current
provenance approval wording; persist head/ownership, publish the scoped branch,
open one PR, subscribe and stop. Original creation-stage derivative receipt and
proof receipt remain unchanged; current docs own the subsequent approval status.
No artwork, recipe, renderer, tests, dependencies, saved approved pair or
curriculum changes. No merge authority is inferred from visual approval.

Verification: inspect documentation diff, git diff --check, and prove no
non-document diff from the tested implementation. Reuse its recorded 82-pass
adjacent test and PASS print/replay evidence; do not rerun code tests for this
documentation-only follow-up. Current main remains the implementation base.
Live branch protection requires quality-gate; workbook-quality-gate must also
be green before readiness. Exact-head CI and independent review remain pending.

Cold audit trace: README's Unicorn Meadow and pack-selection sections describe
the accepted scene; design-system's Unicorn Meadow section records composition
approval; provenance's current-approval/Unicorn Meadow sections bind the decision
to the tested source and final artifact hashes. No rendered bytes change.
