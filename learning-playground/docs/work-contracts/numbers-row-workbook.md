# Change contract: numbers 1-20 workbook

## Root Cause
The existing alphabet row workbook has no number practice. The operator requests a new numbers 1-20 workbook for a four-year-old, with illustrations to vary the pages. This is new printable content, not a defect repair.

## Correct Fix Must Touch
Add a separate number stroke catalog, content/page renderer, scoped styles and build/export/verification script under workbook. Add repeatable package commands and concise usage documentation. Reuse the self-contained page shell, fonts and existing animal SVG art. Build ten practice sheets (two numbers each, one solid model, three dotted models and one blank try cell per number) and two picture-counting/coloring breaks. Count panels show exact quantities in groups of five/ten; count-break answers remain within 1-20. Preserve 0.75-inch numeral height and half-inch print margins. Export combined and individual US Letter PDFs, actual PDF rasters, contact sheet and verification to durable storage outside the worktree.

## Must Not Change
Existing alphabet/book content, shared renderer/styles, source illustrations or approval status, dependencies/lockfile, application code, other worktrees or PRs. No new image generation, GPU work, remote publication, push or merge. Use an isolated numbers branch from the verified alphabet source. No claim of owner visual approval or physical-printer testing.

## Verification
Check generated numerical coverage, dot/picture quantities, solid/dotted/blank targets, one- and two-digit bounds, consistent handwriting height, source/PDF freshness, all physical PDF page sizes, no overflow or browser failures. Visually inspect the actual PDF pages, especially 10-20, and provide the finished printable artifact. New content has no fail-first defect requirement. Only add tests if inspection reveals a defect requiring regression proof.

## Cold diff audit / completion
No implementation gaps found against this content contract. The physical-printer result and owner visual approval remain unverified.

- `workbook/src/components/number-glyphs.mjs:16` composes bounded one- and two-digit centerline numerals for 1-20.
- `workbook/src/content/numbers-practice.mjs:30` creates solid, dotted and blank practice cells; `:46` supplies exact dot quantities; `:68` and `:82` render practice and picture-counting pages.
- `workbook/src/styles/numbers-practice.css:1` scopes the new page layout to number-book classes.
- `workbook/scripts/numbers.mjs:46` builds portable HTML; `:67` exports PDFs; `:100` rasterizes the actual PDF; `:121` verifies content, geometry and freshness.
- `workbook/package.json:22`, `workbook/.gitignore:3` and `workbook/README.md:252` add commands, generated-output exclusion and print instructions.

`numbers:all` passed: 12 US Letter pages, numbers 1-20 in order, exact dot/picture quantities, tracing and blank cells, 0.75-inch guides, safe margins, no overflow or browser errors. JavaScript syntax and diff whitespace checks passed. All PDF pages were inspected in the raster contact sheet, with detailed inspection of pages 1, 7, 11 and 12. Existing illustrations and shared rendering files were not changed.

Durable output: `/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/numbers-1-20-2026-10-04/`. The finished PDF is `pdf/kennedi-numbers-1-20.pdf`; measured proof is `verification.json`.
