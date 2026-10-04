# Change Contract: three traceable counting choices

## Before Code

### Root Cause
The owner approved the animal-counting layout and now wants three smaller
dotted answer choices per group, with the correct answer in a mixed position.
`countAndTrace` currently renders only the correct number. The content catalog
has no distractors/answer positions, and the verifier expects one answer.
This is a requested format change, not a defect in the approved guided pack.

### Correct Fix Must Touch
- Extend counting content to generate three unique choices from 1-20, exactly
  one correct, with seeded shuffled positions balanced across the pack.
- Extend the activity component with strict choice validation and identical
  small dotted numeral cards; no visible correct-answer styling.
- Add scoped choice styles, two animal groups per page so art stays .75 inch
  and answer tracing remains about .47 inch tall, with safe Letter margins.
- Extend the existing counting pipeline with choice/guided modes and separate
  output names/default directories. Retain the original guided format.
- Expand existing targeted tests and print verification rather than weakening
  original quantity, range, size, freshness, overflow or page-dimension checks.
- Update README/output ignore entry. Export, rasterize and visually inspect
  the new complete pack; audit and commit the change locally.

### Must Not Change
Existing original guided proof files, number/alphabet books, number glyphs,
shared renderer/styles, source illustrations, dependencies/lockfile, app,
other worktrees/branches and untracked assets. No art generation/GPU loading,
remote writes, PR/merge actions, subagents or unrelated refactoring.

### Assumptions / blockers
The child counts, circles the number, then traces that choice. All choices
must look equally traceable. Keep the same 24 animal/count tasks, regrouped
into 12 two-activity pages. Choice is the new default; `--mode guided` retains
the old single-answer format. Different species within a page. Quantities
remain mixed across the pack; a two-item page cannot itself be non-monotonic.
Build on local commit 01f63662168658de119793a4330afa28eb5bea76 in the owned
codex/mixed-counting-workbook checkout. No physical printer is available.

### Verification plan
Targeted Node tests for seeded repeatability, all 1-20 counts, three distinct
in-range choices, correct answer once, all three positions, valid and invalid
choices including falsy/missing/mixed values, original guided regression.
Actual new PDF pipeline: combined and individual Letter PDFs, screenshots,
grayscale rasters/contact sheet. Check all visible choices and dotted paths,
no revealed answer styling, .75-inch animal tiles, smaller but usable numeral
guides, safe margins, no errors/overflow, maximum-density cases and hashes.
Visually inspect every new PDF page. Exercise guided mode separately outside
the old output directory; prove unchanged old guided output bytes. No broad
app tests: application code is protected and unchanged.
Durable artifacts: /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/counting-three-choices-2026-10-04/.
No fail-first defect probe planned: this adds a requested format.

## Contract Amendments
None.

## Implementation summary
Added a separate choice mode to the existing counting generator. Each group
has three equally styled dotted choices, with exactly one correct answer.
The existing 24 tasks now occupy 12 two-group sheets; illustrations retain
their original .75-inch size. Correct positions are seeded and balanced:
8 left, 8 middle, 8 right. Numeral guide height is .46875 inch.
The original guided format is available explicitly with `--mode guided`.
No dependencies, source art, number glyphs, original books or app changed.
Updated targeted tests cover both modes and malformed choice data.

## Cold Diff Audit

### Gaps
No implementation gaps found. Physical paper/toner quality was not tested:
verification uses actual grayscale PDF rasters and measured print geometry.
Remote CI was not run because this is a local-only workbook change. Broad
application suites were not run because application code is unchanged.

### Change By Change Reconstruction
- `workbook/src/content/counting-practice.mjs:21,48,91`: validates modes;
  derives deterministic distractors/answer positions using a separate RNG;
  preserves the existing task sequence, then groups choice pages in pairs.
  Extends page instructions and exports the real layout for density probes.
  Contract: content, mixed positions, retained guided format. Covered by both
  mode/seed tests, exact rendered-choice checks and guided raster comparison.
- `workbook/src/components/count-and-trace.mjs:22`: optional three-choice
  rendering, strict uniqueness/range/correct-once validation, five-column
  animal layout in choice mode, identical dotted cards. `traceAnswer` and
  absent-choice behavior remain unchanged. Contract: usable equal choices.
  Covered by valid/invalid boundary tests and rendered path/style checks.
- `workbook/src/styles/counting-practice.css:21`: scoped choice layout,
  three answer cards, smaller tracing guides and two spacious activity rows.
  Original guided rules remain unchanged. Contract: print fit without smaller
  animals. Covered by physical-size, margin, overflow and density checks;
  every actual choice PDF raster was visually inspected.
- `workbook/scripts/counting.mjs:60,81,115,141,168,179`: retains the existing
  build/export/raster pipeline, adds explicit modes and separated output
  paths, verifies all three choices and equal styling, balanced positions,
  mode-specific sizes and actual rendered maximum-density layouts.
  Contract: separate artifacts and deterministic print verification. Covered
  by complete choice and guided pipelines. Per-page non-monotonic checks
  remain for guided triples; choice checks mixed order across the full pack
  because any pair is necessarily ascending or descending. All real print
  invariants remain enforced in both modes.
- `workbook/tests/counting-practice.test.mjs:12,84,101,112`: retains guided
  regression coverage and extends mode/seed, choice, appearance, invalid-data
  and range-edge tests. Contract: prevent invalid or answer-revealing output.
  Covered by `npm run counting:test`: 11 tests, 11 pass, 0 fail.
- `workbook/README.md:256`: exact regeneration commands, choice default,
  preserved guided mode, output locations and tracing-size explanation.
  Contract: copy-pasteable usage. Both documented pipeline modes exercised.
- `workbook/.gitignore:5`: ignores only the new default choice output
  directory. Contract: keep generated artifacts separate from source.
  Verified by final changed-file audit and durable external artifact paths.
- `learning-playground/docs/work-contracts/counting-three-traceable-choices.md`:
  before-code contract and this outcome/audit. Contract: documented narrow
  change and explicit non-scope. Change-workflow contract check passed.

### Contract Traceability
Every edited file serves a declared required change. The final source diff
does not touch protected books, shared components/styles, numeral glyphs,
illustration sources, dependency files or application code.
The original guided PDF was not overwritten: its SHA256 remains
`d5abc070742cd769d9e1788627ed4ef5b87ce29f7250ec59362131f5348dd7cd`.
All 8 newly regenerated guided PDF rasters are byte-identical to the approved
original rasters. New proof files are stored in their own durable directory.

boundary-probe: choice validator accepts correct counts at 1 and 20; rejects
null, false, empty strings/arrays, wrong lengths, duplicate choices, missing
correct answers, zero, 21, fractional/string values and sparse arrays.
Validated choices are the values passed to the tracing renderer.

effect-trace: three smaller mixed-position tracing choices | separate seeded
content RNG, optional choice component and scoped SVG width | exact PDF-page
choice/path checks, [8,8,8] correct positions, .46875-inch measured guides,
all raster pages inspected; original guided rasters unchanged.

### Verification
From `workbook/`:

```bash
npm run counting:test
npm run counting:all -- --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/counting-three-choices-2026-10-04
npm run counting:all -- --mode guided --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/counting-three-choices-2026-10-04/guided-regression
node --check scripts/counting.mjs
```

Results: 11 tests pass; choice verification PASS for 12 Letter pages/24 groups;
guided verification PASS for 8 Letter pages/24 groups. PDFs measure 612 x 792
points. No browser errors/overflow, safe margins, exact pictures/choices,
identical choice appearance and maximum-density stress layouts pass.
Choice PDF SHA256:
`65a0e24d677e02c7701a109df11475876f8ffe8c25ce07a39e9a8f460d7da435`.
Choice grayscale PDF rasters `page-01.png` through `page-12.png` and contact
sheet inspected visually. No clipping, cramped animal groups, hidden answer
cues or illegible tracing found. Original raster byte comparison passed.
`node scripts/check-work-contract.mjs` from `learning-playground/` passed;
`git diff --check` passed. No broad app suite or remote CI claim.

Durable machine evidence: `verification.json`, guided-regression verification,
PDFs, browser screenshots, grayscale rasters, contact sheet and verification
notes under the artifact directory declared above.

## Gap audit
DONE for the requested local build. Final commit/hash is recorded in the
durable verification notes. No push, PR mutation or merge is authorized.
