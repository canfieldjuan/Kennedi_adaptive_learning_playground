# Kennedi Is the Boss — Printable Workbook Builder

A small, dependency-light generator for **Kennedi Is the Boss**, a printable
preschool workbook series. It renders deterministic HTML/CSS/SVG pages,
exports a print-ready US Letter PDF, and screenshots/rasterizes everything so
you can inspect the actual output. No backend, no database, no accounts —
static files in, static files out.

Book 1 (`src/content/book-1.mjs`) currently has 6 pages. The `src/components/`
and `src/illustrations/` libraries are the reusable design system for every
future page/book in the series.

## How it works

- **`src/illustrations/`** — SVG primitives, bold black-outline-on-white, no
  gray, no color. Boss Kennedi (`boss-kennedi.mjs`), animals (`animals.mjs`),
  a small icon set (`icons.mjs`), and pencil-control practice rows
  (`pencil-practice.mjs`).
- **`src/components/`** — layout/activity building blocks that pages compose:
  page shell, Boss Mission box, tracing words, handwriting lines,
  picture-choice rows, the reward star, etc.
- **`src/content/pages/*.mjs`** — one file per page. Each exports `meta`
  (page number, title, the correct answer for any picture-choice activity)
  and `render()` (the page's HTML, built from the components/illustrations
  above). This is where all book content lives.
- **`src/content/book-1.mjs`** — the ordered list of pages for Book 1.
- **`src/styles/`** — design tokens (`tokens.css`), base page/typography
  rules (`base.css`), component styles (`components.css`), print rules
  (`print.css`), and the two self-hosted variable fonts (`fonts.css` +
  `src/fonts/*.woff2` — Baloo 2 for display/headings, Nunito for body text;
  no network fetch at build or print time).
- **`src/render.mjs`** — wraps a page's HTML in a full, self-contained
  document (fonts inlined as base64) so every generated file works standalone.
- **`scripts/`** — the build pipeline (see below).

Full authoring reference (component APIs, hard rules like "pure black ink
only" and "never visually mark the correct answer"): **`docs/design-system.md`**.

## Install

```bash
cd workbook
npm install
```

Requires Node 18+, Google Chrome installed (Playwright drives it directly via
`channel: 'chrome'` — no browser download), and `poppler-utils` on PATH
(`pdfinfo`/`pdftoppm`, used only by `npm run verify` / `npm run rasterize`).
On Debian/Ubuntu: `sudo apt install poppler-utils`.

## Preview

```bash
npm run preview
```

Builds `dist/preview.html` (all pages, one after another, with an on-screen
label above each) and prints the path. Open it directly in a browser —
`xdg-open dist/preview.html` (Linux) or just double-click it. It's a fully
self-contained file (fonts included), so `file://` works fine, no server
needed.

Each page also gets its own standalone file at `dist/pages/page-01.html`,
`page-02.html`, etc. — open one directly to preview or print just that page.

## Build

```bash
npm run build
```

Renders `dist/preview.html`, `dist/pages/page-*.html`, and
`dist/manifest.json` (page metadata) from `src/content/book-1.mjs`.

## Export PDF

```bash
npm run pdf
```

Renders the combined, print-ready PDF to
`dist/pdf/kennedi-is-the-boss-book-1.pdf` — US Letter (8.5x11in), one page
per sheet, 0.5in margins baked into the page layout itself (the PDF page
margins are set to 0 so nothing is added on top). Run `npm run build` first
if you haven't already.

To also rasterize the PDF itself to PNGs (proof of exactly what a printer
would receive, not just the HTML source):

```bash
npm run rasterize
```

Writes `dist/pdf-raster/page-1.png` .. `page-6.png` (150 DPI).

## Run verification

```bash
npm run verify
```

Deterministic print-layout checks (fails with a non-zero exit code on any
problem):

- PDF page count matches the number of registered pages
- PDF page size is exactly US Letter (612 x 792 pt)
- every page's title renders in its HTML
- no browser console/page errors on load
- no horizontal or vertical content overflow on any page (measured via
  `scrollWidth`/`scrollHeight` vs `clientWidth`/`clientHeight`, so it still
  catches overflow even though `.sheet` clips visually for print safety)

Run `npm run build && npm run pdf` first so both the HTML and the PDF exist
to check.

Or run everything in order:

```bash
npm run all   # build -> pdf -> screenshots -> rasterize -> verify
```

(`npm run screenshots` writes `dist/screenshots/page-*.png` — full-page PNGs
of each standalone page, print-media-emulated, for visual inspection.)

## Add a new workbook page

1. Read `docs/design-system.md` and skim an existing page, e.g.
   `src/content/pages/page-03-i-am-the-boss.mjs`, for the pattern.
2. Create `src/content/pages/page-07-<slug>.mjs` exporting `meta` and
   `render()`, built from `pageShell` + the shared components/illustrations.
   Reuse existing illustration poses/icons before adding new ones; if you do
   add a new illustration or CSS class, add it to the shared module
   (`src/illustrations/*.mjs`, `src/styles/components.css`) so later pages
   can reuse it too.
3. Register it in `src/content/book-1.mjs` (import + add to the `pages`
   array, kept in page-number order) — or create a new `book-N.mjs` /
   `scripts/build.mjs` variant for a new book in the series.
4. `npm run build && npm run screenshots` — read the resulting
   `dist/screenshots/page-0N.png` and check it against the checklist in
   `docs/design-system.md` (text size, clutter, tracing/writing/choice size,
   obviousness of the task, no clipping).
5. `npm run verify` — fix anything that shows `FAIL`.
6. `npm run pdf && npm run rasterize` once the page is final, and spot-check
   `dist/pdf-raster/page-0N.png`.

## Project structure

```
workbook/
  src/
    content/
      book-1.mjs            # ordered page list for Book 1
      pages/                # one file per page: meta + render()
    components/             # layout.mjs, tracing.mjs, activities.mjs
    illustrations/          # boss-kennedi.mjs, animals.mjs, icons.mjs, pencil-practice.mjs, svg-utils.mjs
    styles/                 # tokens.css, base.css, components.css, print.css, fonts.css
    fonts/                  # self-hosted Baloo 2 + Nunito (woff2)
    render.mjs               # wraps a page's HTML into a self-contained document
  scripts/
    build.mjs                # content -> dist/preview.html + dist/pages/*.html
    export-pdf.mjs            # dist/preview.html -> dist/pdf/*.pdf (Playwright)
    screenshot.mjs             # dist/pages/*.html -> dist/screenshots/*.png (Playwright)
    rasterize-pdf.mjs          # dist/pdf/*.pdf -> dist/pdf-raster/*.png (poppler)
    verify.mjs                 # deterministic print-layout checks
  dist/                     # generated output (committed, so the finished book is inspectable without a build)
  docs/
    design-system.md        # component/illustration API + hard rules, for adding pages
```

## Coloring pack compatibility

The illustration primitives (`bossKennedi`, `puppy`/`bird`/`cat`, the icon
set) are built as parameterized SVG functions specifically so a future
**Kennedi Is the Boss — Coloring Pack** can reuse the same character/scene
library at full-page scale. Nothing in this build assumes it's the only
consumer of `src/illustrations/`.
