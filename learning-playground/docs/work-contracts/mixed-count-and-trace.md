# Change Contract: mixed animal count-and-trace practice

## Before Code

### Root Cause / Requested outcome
The numbers workbook has two counting breaks with solid multiple-choice
answers. The owner wants more animal-counting pages with quantities from 1-20
in mixed order, and dotted answers to combine counting and handwriting.
This is an additive guided-practice format, not a defect in the original book.

### Correct Fix Must Touch / Required change surface
- Add a seeded counting content definition using existing animal assets.
  Cover every quantity 1-20, with three groups per sheet and mixed orders.
- Add a reusable count-and-trace activity with one large centerline dotted
  answer per group, reusing the existing number glyphs unchanged.
- Add scoped print styles and a separate export/verification script, package
  commands, tests, output ignore entry and README instructions.
- Export combined/individual US Letter PDFs, self-contained previews,
  screenshots, actual PDF rasters, contact sheet and deterministic evidence.
- Inspect every rasterized PDF page, audit the diff and commit locally.

### Must Not Change / Explicit non-scope
Original numbers/alphabet books, Book 1/2, shared renderer/styles, existing
number glyphs, illustration sources/recipes, dependencies/lockfile, application
code, other branches or untracked work. No new art generation or GPU loading.
No remote push, PR creation/update, merge, subscription or subagents.

### Assumptions / blockers
Build eight sheets of three groups: all quantities 1-20 plus four repeated
practice quantities. A seed makes shuffled variants reproducible. Each group
has one animal species, with different species within a page. Dotted correct
answers are intentionally visible: count first, trace second; not a blind
assessment. Reuse current line art without granting it new art approval.
Base: aa6a9c413240efb4931683bc1e6800dd6144ba41 (existing numbers workbook).
Physical printer output is unavailable; inspect the actual PDF rasters.

### Verification plan
Targeted Node tests for quantities, seed behavior/boundaries, mixed orders,
animal selection, exact answer paths and invalid inputs. Fresh build/PDF/
screenshots/rasterize/verify, including source/art/PDF freshness, every PDF
page's dimensions/count, exact visible quantities/trace answers, minimum
print sizes, safe margins and no browser errors or overflow. No app suite:
the app is unchanged. Preserve durable artifacts outside the worktree under
/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/mixed-count-and-trace-2026-10-04/.
No fail-first defect probe: no implementation of this format exists yet.

## Contract Amendments
None.

## Implementation summary
Added eight guided counting sheets / 24 groups, covering all quantities 1-20
plus four repeated quantities. Each group reuses one tracked animal SVG and
has one .75-inch-tall centerline dotted answer. Picture tiles are .75 inch,
with padded non-destructive artwork crops. A deterministic seed controls the
mixed quantities and species. Original books, strokes, art and app are intact.
Combined/individual PDFs, portable previews, screenshots, grayscale PDF rasters,
contact sheet, source/art/PDF hashes and a verification record are preserved
in the durable output directory named above. Publication/visual approval is
not inferred from technical verification.

## Cold Diff Audit

### Gaps
No unresolved implementation gap found. Physical paper printing is unavailable;
all actual grayscale PDF pages were inspected. Owner layout review is separate
from this local implementation. No new art approval, remote CI, PR mutation,
push or merge is claimed. The full app suite was not run: app code is unchanged.

### Change By Change Reconstruction / Contract Traceability
- `workbook/src/components/count-and-trace.mjs:7` (`traceAnswer`,
  `countAndTrace`): the same range-validated count creates both picture copies
  and the dotted answer. Escaped labels, existing manuscript glyphs, large
  guides. Fulfills counting + writing. Unit range/label/quantity tests and
  browser path/size checks cover this.
- `workbook/src/content/counting-practice.mjs:44` (`createCountingBook`):
  seeded count/species selection, all 1-20 covered, distinct species per page,
  non-monotonic quantity order, original animal catalog reused. Fulfills mixed
  content without new art. Seed/range/coverage tests and manifest checks cover
  it. `describeGroup` at line 13 provides singular/plural proof captions.
- `workbook/src/styles/counting-practice.css:8`: scoped three-group layout,
  fixed print tile/guide sizes and ink-light separators. Fulfills preschool
  ergonomics and US Letter. Every raster viewed; safe margins, overflow and
  maximum-density stress checks passed.
- `workbook/scripts/counting.mjs:60` (`build`, `pdf`, `screenshots`,
  `rasterize`, `verify`): separate self-contained output; measured art crops;
  source snapshot/PDF hashes; combined/individual Letter PDFs; screenshots;
  actual grayscale rasters/contact sheet; exact visible quantity/answer paths,
  seed/source/art freshness, page dimensions, browser/layout and stress checks.
  Fulfills generation/inspection/verification; the entire new pipeline passed.
- `workbook/tests/counting-practice.test.mjs:12`: coverage, deterministic and
  boundary seeds, animal uniqueness/existence, valid/invalid counts, missing
  content, escaping, shuffle and caption regressions. Fulfills lightweight
  repeatability checks. Tests 8, pass 8, fail 0.
- `workbook/package.json` (new `counting:*` entries): additive commands only,
  no dependency or existing command changes. Fulfills regeneration; commands
  exercised as documented.
- `workbook/.gitignore` (`dist-counting/`): ignores only the new generated
  default output. Fulfills clean separate output.
- `workbook/README.md:256`: preview/print/build/stage/seed commands, source
  paths, guided-practice explanation, reused-art and visual-approval boundary.
  Fulfills handoff; checked against executed pipeline and output files.
- This contract: records the requested scope, verification and audit. No
  protected source/lockfile/other book diff against the numbers-book base.

### Verification
- `npm ci`: pinned dependencies installed, no vulnerabilities reported.
- `npm run counting:test`: tests 8, pass 8, fail 0.
- `npm run counting:all -- --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/mixed-count-and-trace-2026-10-04`:
  build, PDF, screenshots, rasterization and verification passed after the
  spacing correction. Eight combined pages and eight individual PDFs;
  every PDF sheet 612 x 792 points. Exact pictures and dotted paths checked.
- `counting:rasterize` rerun after proof-caption correction, then
  `counting:verify` against the same output passed. Only contact rendering
  changed; workbook HTML/PDF bytes still match the current generated source.
- Actual `pdf-raster/page-1.png` through `page-8.png` and the contact sheet
  viewed. No clipped art/answers, crowding or ambiguous groups found.
- `node --check workbook/scripts/counting.mjs`: passed.
- `git diff --cached --check`: passed.
- `node scripts/check-work-contract.mjs` from `learning-playground/`:
  Change workflow contract check passed.
- No diff in original number/alphabet content, shared renderer, number strokes,
  number pipeline/styles, illustration sources or lockfile against base.

### Issues reproduced, isolated, explained, fixed and regression-checked
1. My initial shuffle repair produced seed 2 / page 7 / [12,12,3]. The first
   targeted run reported tests 6, pass 5, fail 1. Origin was the fixed
   middle/high/low rearrangement in `createCountingBook`, which left duplicate
   maxima adjacent. Changed that case to [12,3,12]; the same case and broader
   seed tests pass. A pinned regression prevents recurrence; no downstream
   filter or retry compensates for the generator.
2. My initial group padding caused a maximum-density layout failure: main
   clientHeight 829 versus scrollHeight 839. Origin: `.ct-group` padding, not
   artwork size. Three group heights were 273.25/273.25/272.25px. Reduced
   vertical padding from 8px to 4px without shrinking art or answer strokes.
   Direct same-fixture browser comparison: old padding gives 829/839 and
   noOverflow false; corrected padding gives 829/829 and noOverflow true,
   heights 265.25/265.25/264.25px. Original full pipeline now passes. The
   committed maximum-density check prevents recurrence.
3. Contact-sheet inspection showed "1 foxes" (the worksheet itself was correct).
   Origin: caption composition always used the plural field. `describeGroup`
   now selects singular for one; targeted regression checks "1 fox" and
   "5 foxes". Contact sheet was rerendered, caption checked and viewed.

### Diagnostic corrections
Initial inspection guessed `renderer.mjs` instead of the resolved `render.mjs`;
a follow-up read used `page-1.html` instead of generated `page-01.html`.
Reported both and corrected reads, without edits to those files. A later
negative-control probe falsely failed to reproduce old padding because
Playwright added its same-specificity test style to HEAD while the real
stylesheet appears later in BODY. Observed effective padding remained 4px;
source-style replacement in independent test pages reproduced fail-before /
pass-after exactly. This was a diagnostic-probe error, not an output defect.

## Gap audit
DONE for local implementation, tested generator and inspected printable proof.
Owner visual review and publication/remote actions remain intentionally separate.
