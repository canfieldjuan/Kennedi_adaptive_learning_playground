# Kennedi Workbook: Refresh the 8-Pose Kennedi Consistency Sheet

Follow-up to PR #139, which replaced locked pose `04-helping`. That PR left
`docs/art/kennedi-consistency-sheet.png` showing the old pose, and said so in
`design-system.md`.

## Before Code

### Root Cause

`workbook/docs/art/kennedi-consistency-sheet.png` is the reference image of
the eight locked Boss Kennedi poses. It still shows the pre-#139
`04-helping`. Nothing in the repo records how the sheet was made, so it
could not simply be re-run when a pose changed.

The recipe was recovered by reproduction: ImageMagick `montage` of the eight
locked PNGs as of commit e1f2fce (where the sheet was created), with
`-tile 4x2 -geometry 400x400+15+15 -border 1 -bordercolor gray
-background white -font DejaVu-Sans-Bold -pointsize 20` and the labels
printed on the sheet, reproduces the committed sheet with 0 differing pixels
(`compare -metric AE`).

### Correct Fix Must Touch

- `workbook/tools/make-kennedi-consistency-sheet.sh` -- new; the recovered
  montage command, reading the current `locked-poses/0[1-8]-*.png`, so the
  sheet can be rebuilt whenever a locked pose changes.
- `workbook/docs/art/kennedi-consistency-sheet.png` -- regenerated with that
  script from the current locked poses.
- `workbook/docs/design-system.md` -- drop the "predates the 2026-09-23
  04-helping replacement" note on the sheet reference; point to the script.
- `workbook/docs/art/asset-provenance.md` -- record that the sheet is built
  by the script and was regenerated after the 04 replacement.
- `learning-playground/docs/work-contracts/` -- this contract.

### Must Not Change

- Every locked pose PNG/SVG, the simplified tier, all animal assets.
- `docs/art/puppy-consistency-sheet.png` and `docs/art/concept-contact-sheet.png`.
- The sheet's layout, tile order, labels, font and colors -- only tile 4's
  image content may differ.
- `workbook/src/**`, `scripts/**`, other `tools/**`, `dist/**`,
  `dist-proof/**`, `dist-book-2/**`, CI workflows.
- The "Known exceptions" text in `design-system.md` (03/08 collars, 04
  deviations) -- still accurate.
- Everything under `learning-playground/` except this contract file.

## Contract Amendments

None yet.

## Cold Diff Audit

### Gaps

- change without contract trace:
- contract requirement not delivered:
- protected surface touched:

Do not declare done while any gap stands.

### Change By Change Reconstruction

### Contract Traceability

### Verification
