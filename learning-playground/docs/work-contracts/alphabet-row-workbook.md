# Change Contract: illustrated alphabet row workbook

## Before Code

### Root Cause
The demonstrated separate-case alphabet mockup lives outside the repository.
The existing `workbook/src/components/letter-page.mjs` combines `Aa` in each
cell and `book-2.mjs` groups three letters per sheet. Neither builds the
requested A,a,B,b row sequence with five centerline tracing models and a try
space. This is an additive workbook format, not a defect in Book 2.

### Correct Fix Must Touch / Required change surface
- Add reusable monoline manuscript glyphs for A-Z/a-z, row/page components,
  and an illustrated alphabet content catalog using existing locked SVGs.
- Add a separate build/PDF/screenshots/rasterize/verify pipeline and package
  commands. Output must not collide with Book 1 or Book 2.
- Add tests for exact coverage/order, guide alignment, tracing repetitions,
  blank try cells, escaping, and invalid input. Verify every rendered sheet,
  source-hash freshness, PDF page count/dimensions, and safe margins.
- Document source locations, commands, illustration reuse and approval status.
- Commit source changes locally on `codex/alphabet-row-workbook`.

### Must Not Change / Explicit non-scope
Existing books, tracing components, shared styles, renderer, illustration
sources/recipes, dependencies and lockfile, learning playground app, other
branches/PRs, untracked illustration drafts. No new image generation, GPU
models, backend, curriculum expansion, push, PR update or merge.

### Assumptions/blockers
Use two letters/four separate-case rows per sheet, the demonstrated manuscript
stroke style, and existing animal SVGs as picture cues. These are letter-name
and handwriting cues, not a phonics assessment (X-ray fish and queen included).
Existing artwork is reused without claiming new owner approval. Worktree base:
`eb2b34dd2bc7095e51095e0d0ccfa362637e0dea`, preserving shared artwork work.

### Verification plan
Run targeted Node tests and syntax checks. Install pinned workbook dependencies
without changes. Build all sheets, export combined and individual PDFs,
capture screenshots, rasterize the actual PDF and visually inspect every page.
Verify order, all letter paths, writing dimensions including descenders,
no browser errors/overflow, 0.5in safe margins, US Letter, per-page count, source
freshness and required titles. Preserve durable output outside the worktree.
No fail-first defect test: this is a new format with no prior implementation.

## Contract Amendments
None.

## Implementation summary
Added a separate illustrated A-Z practice book: 13 sheets / 52 separate-case
rows, one model + five dotted-stroke copies + a blank try space per row.
All 26 picture cues reuse tracked line-art sources. No source art, old books,
shared renderer/styles, dependencies, or application code changed. New output
is portable/self-contained, with combined and individual PDFs, screenshots,
actual PDF rasters, a contact sheet and a verification record. The code and
commands are documented; layout/art pairing remains owner-review-required.

## Cold Diff Audit

### Gaps
No implementation gap found in the staged diff. Owner visual review is still
required before treating this layout/art pairing as approved for publication.
Physical home-printer output was not tested; PDF print output was inspected.
No remote checks, PR mutation, push or merge was performed or claimed.

### Change by change / Contract traceability
- `workbook/src/components/manuscript-glyphs.mjs:4`: shared guide coordinates
  and all manuscript paths; fulfills tracing geometry. Unit coverage and
  PDF glyph-bound/alignment checks cover it.
- `workbook/src/components/alphabet-practice.mjs:11`: separate-case SVG rows,
  picture cues, escaped text and reusable page composition; fulfills layout.
  Repetition/order/escaping/invalid-input tests and browser checks cover it.
- `workbook/src/content/alphabet-practice.mjs:21`: cue/asset catalog and page
  registration; fulfills exact A-Z sequence. Coverage/asset existence tests
  and manifest/art-source checks cover it.
- `workbook/src/styles/alphabet-practice.css:2`: scoped layout styles only;
  fulfills printable spacing. Every physical sheet was rasterized and viewed;
  browser measurements show .75in cap guides, safe margins and no overflow.
- `workbook/scripts/alphabet.mjs:54`: measured non-destructive artwork crops,
  exports and verification; fulfills separate output and print checks.
  Full pipeline passed; current-code/HTML/PDF/art-source comparisons passed.
- `workbook/tests/alphabet-practice.test.mjs:12`: targeted tests including
  both valid and invalid inputs, mixed/missing pairs and escaped labels.
  `npm run alphabet:test`: tests 7, pass 7, fail 0.
- `workbook/package.json:15`: additive commands only; fulfills repeatable
  builds without altering existing commands or dependency declarations.
- `workbook/.gitignore` (`dist-alphabet/` entry): ignores only new generated
  output; fulfills clean separate output. Old generated books are untouched.
- `workbook/README.md:13`: commands, outputs and editable content locations;
  fulfills handoff documentation, checked against exercised commands.
- `workbook/docs/design-system.md:16`: authoring rules for this format;
  fulfills reusable layout documentation, consistent with rendered proof.
- `workbook/docs/art/asset-provenance.md:7`: reuse, AI-assisted tracing source,
  proof path and approval gate; fulfills provenance, with no new art claims.
- This contract: records scope and actual verification; fulfills work log.

### Verification
- `npm ci`: pinned dependencies installed; no vulnerabilities reported.
- `npm run alphabet:test`: tests 7, pass 7, fail 0.
- `npm run alphabet:all -- --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/alphabet-a-z-2026-10-04`:
  build/PDF/screenshots/rasterize/verify passed. All 13 actual PDF pages viewed.
- After contact-sheet/freshness additions, `alphabet:rasterize` and
  `alphabet:verify` against that same directory passed. Contact sheet viewed.
  PASS: 13 US Letter pages; 52 correctly ordered rows; individual PDFs,
  artwork/source hashes, margins, glyph bounds and browser checks passed.
- `node --check scripts/alphabet.mjs` from workbook: passed.
- `git diff --cached --check`: clean.
- `node scripts/check-work-contract.mjs` from learning-playground:
  Change workflow contract check passed. The first invocation from the repo
  root failed ENOENT because the checker uses the current directory; corrected
  the invocation rather than changing its code.
- No diff in protected book registries, source art, renderer/shared print CSS
  or lockfile. No broad app tests rerun: application code is unchanged.

### Verification correction
The initial inspection referenced a nonexistent root `.gitignore` and older
`src/assets` locations. Both errors were reported; existing files were then
resolved explicitly. No implementation or cleanup targeted those paths.

## Gap audit
DONE for local generator and inspected printable preview. Owner visual
approval and any future publication/PR action remain separate, unperformed
steps, not missing local implementation.
