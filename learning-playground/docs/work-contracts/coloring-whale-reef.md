# Change contract: Whale Reef coloring proof

## Root Cause
The coloring system has an established whale but no reviewed reef composition. The original transparent trace allows background lines to show through its body in layered scenes. This is a missing fixed scene, not a need for a new character, model or page architecture.

## Correct Fix Must Touch
- One editable named-layer scene: workbook/design-source/coloring/scenes/whale-reef.svg.
- One coloring-only opaque derivative and CPU recipe receipt; preserve the established source PNG/SVG.
- Existing preparation owner fixed mapping plus thin prepare-coloring-whale wrapper; existing fixed-slot scene wrapper/catalog/schema, one data-only recipe and scoped tests/package test registration.
- README, design-system and provenance: draft status, reproduction route and proof evidence.
- Durable proof/replay/source receipts outside worktrees.

## Must Not Change
Original whale/other accepted art; existing scenes or renderer/preparation/publication owners; tracing, curriculum, Book1/Book2, fonts, page dimensions, print pipeline, dependencies, GPU/model state, other worktrees/PRs. No new cast, photos, extra scenes, full coloring book or remote publication before owner visual approval.

## Validated Inventory
Existing canonical PNG/SVG: design-source/animals/locked-poses/whale-01-swimming.
PNG SHA256 e5834ec2e58c6a07919a6485986c444b7f0b866a8bf5d2bc017ef627281609b0.
SVG SHA256 302babb8d7f8ca139f5dc28e05f25cdbdbed6e455c83e5c9e3209b02ba88d880.
Prior original AI generation: local ComfyUI/FLUX.1-dev, embedded PNG graph/prompt/seed retained. No inference in this slice.
Reuse CPU ImageMagick 70-percent threshold, Potrace opaque contours and browser-measured crop; saved vectors suffice for reprints. Prior Unicorn uses same owner and passed fixed-slot/source parity tests.

## Differences From Inventory
Add only opaque interior contour representation and measured crop, not pose or anatomy changes. Native editable setting paths add broad coral, sparse bubbles and one foreground starfish. No model/generation/prompt deviations. Local exports used the available Node v26.7.0 rather than the earlier Node20 CLI; export metadata records the environment and frozen replay proves same-environment parity. Rendering, conversion and source-lock owners/settings are unchanged.

## Design Plan
Palette: ink #000000, paper #ffffff only; screen chrome unchanged.
Typography: existing Baloo2 title and Nunito caption, no additional labels.
Composition: whale large in upper-middle open water; asymmetrical broad branched coral at lower sides, gently rolling seabed and large five-arm starfish low center-right. Bubbles sit clear of eyes, spout and tail. No dense scales, tiny stones, sea wallpaper or decorative border.
Keep the existing spout as playful storybook shorthand, not a science diagram. No floating ground shadow added.
Brief review: broad coral regions and flowing water/ground differ materially from a copied flower-garden layout; quiet setting supports the already expressive whale. One memorable character, spacious coloring regions.

## Verification
Run cheapest new scene/recipe tests plus adjacent owners where the new catalog mapping exercises them. Test valid mixed/repeated/max24 and bad selections/locks, source hashes, layered self-contained vectors, valid/invalid fixed slot, contour identity, actual source/runtime raster parity with shifted/resized negatives and opaque interior/background samples.
Render browser screenshots, Letter PDF and actual PDF raster using the unchanged pipeline into durable proof/. Inspect and correct visible conflicts. Freeze/replay recipe into replay/ and compare deterministic exports.
Record exact tests/hashes at each milestone; do not claim physical printing.

## Owner Approval Gate
Operator ordered Whale Reef. Final composition remains draft / owner visual approval required. Commit locally only; no push, PR or merge for this new slice before visual acceptance.

## Cold Diff / Gap Audit

Gaps: none within the implemented local proof contract. Owner visual approval,
physical printing and remote publication are intentionally NOT DONE.

Change-by-change reconstruction:
- `workbook/design-source/coloring/scenes/whale-reef.svg:6`: named water,
  seabed, whale, coral and starfish layers. `:21` fixed linked whale slot;
  `:25` original broad coral paths; `:36` broad starfish.
- `workbook/design-source/coloring/characters/whale-coloring-opaque.svg:11`
  and receipt: opaque contour representation/crop of the unchanged original.
  Tests prove exact normalized curve identity, not just plausible resemblance.
- `workbook/src/components/coloring-scene.mjs:18,32`: fixed assets/thin
  wrapper only; shared embedding owner unchanged.
- `workbook/src/content/coloring-pages.mjs:23`,
  `workbook/recipes/workbook.schema.json:14` and
  `workbook/recipes/coloring-whale-reef.json:1`: one fixed selection and recipe,
  both scene dependencies locked. No arbitrary paths/HTML/cast.
- `workbook/tools/prepare-coloring-character.mjs:13` and
  `workbook/tools/prepare-coloring-whale.mjs:1`: fixed input added to the
  existing capture-once/candidate-only owner; no alternative publication owner.
- `workbook/tests/coloring-whale-reef.test.mjs:33,57,85,107`: recipe/locks,
  immutable canonical/sibling sources, invalid references, contour identity
  and actual source/runtime/opacity comparisons with shift/resize mutations.
- `workbook/package.json:9`: test registration only, no dependency change.
- `workbook/README.md:204`, `workbook/docs/design-system.md:5`,
  `workbook/docs/art/asset-provenance.md:20`: reproduction/editing/provenance
  and explicit draft visual gate; no approval of a wider art family.
All files trace to Correct Fix Must Touch; protected surfaces remain unchanged.

Verification:
- New scene tests: 4 pass, 0 fail.
- Adjacent scene/recipe/preparation regressions: 86 pass, 0 fail.
- Full local coloring pipeline and frozen replay PASS: 1 page, 612 x 792 points,
  safe margins, no overflow/browser errors/external render requests, grayscale.
- Browser screenshot and actual PDF raster visually inspected after refinements.
- Replay byte-identical: preview, frozen recipe, browser image, PDF raster,
  contact sheet. PDF bytes not compared because export metadata can differ.
- Actual scene parity: zero threshold crossings, max 2 gray levels, mean
  0.00002264808362369338. Shifted/resized variants fail. Original contours exact;
  white interior samples cover black backing, exterior remains transparent.
- Initial cactus-like coral and floating plate shelves corrected at scene source;
  face-adjacent stroke shortened. Canonical cheek trace texture preserved and
  documented as inherited risk, not called new polished artwork.
- `git diff --check`: exit 0.
- CI and independent PR review for Whale Reef: not run, no PR/publication yet.

Durable evidence: `/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/whale-reef-proof-2026-10-11-PxLYju/`.
Runtime: local Node v26.7.0, recorded by exports; no model invocation.
Final PDF SHA256 9e55a3f46a7f513afffe3dcafface4094baff70e117480fb162a78f1d9ed2bf6.
Final PDF raster SHA256 95e6a8ca72d73861906f97c705296db975a1668756c46d8102e9885142006594.
