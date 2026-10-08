# Kennedi Is the Boss — Printable Workbook Builder

A small, dependency-light generator for **Kennedi Is the Boss**, a printable
preschool workbook series. It renders deterministic HTML/CSS/SVG pages,
exports a print-ready US Letter PDF, and screenshots/rasterizes everything so
you can inspect the actual output. No backend, no database, no accounts —
static files in, static files out.

Book 1 (`src/content/book-1.mjs`) currently has 6 pages. The `src/components/`
and `src/illustrations/` libraries are the reusable design system for every
future page/book in the series.

## Original coloring pages (no photos, no GPU needed)

The starter pack has four full-page coloring pictures: bunny, turtle, unicorn
and whale. It reuses tracked editable animal SVGs, not family photos or the
old programmatic character drawings. Owner accepted the starter and approved
the bunny garden and turtle pond scenes; this is not blanket art-family approval.
Some original trace texture remains visible
in the bunny's ears/tail and whale's cheeks; this is not newly polished art.

From `workbook/`:

```bash
npm ci
npm run coloring:all
npm run coloring:test
xdg-open dist-recipes/coloring-pages-v1/preview.html
```

The combined PDF is `dist-recipes/coloring-pages-v1/pdf/kennedi-coloring.pdf`.
Individual PDFs live in its `pdf/pages/` directory. `screenshots/` contains
browser images; `pdf-raster/` and `contact-sheet.png` show the actual grayscale
PDF output. Print US Letter at actual size / 100%, with no browser headers.
Half-inch safe margins are built in. No server or image model is involved.

### Owner-approved scene pair

[Preview](docs/art/coloring-approved/contact-sheet.png) and
[print the saved PDF](docs/art/coloring-approved/kennedi-coloring.pdf).
See [approval/provenance](docs/art/coloring-approved/README.md) for exact assets
and limits. Rebuild this pair locally:

```bash
node scripts/workbook.mjs all --recipe recipes/coloring-scenes.json --out dist-recipes/coloring-scenes
```

The frozen recipe beside the saved PDF requires this matching source version;
use the editable recipe above for a newly reviewed build after source changes.

Exact independent build/export/verification commands:

```bash
node scripts/workbook.mjs build --recipe recipes/coloring-starter.json
node scripts/workbook.mjs pdf --recipe recipes/coloring-starter.json
node scripts/workbook.mjs screenshots --recipe recipes/coloring-starter.json
node scripts/workbook.mjs rasterize --recipe recipes/coloring-starter.json
node scripts/workbook.mjs verify --recipe recipes/coloring-starter.json
```

All commands accept `--out /absolute/path/to/output`. Use a durable directory
outside disposable worktrees for review evidence. Generated output is ignored
by Git; the recipe, renderer and original SVG art are the source instead.

### Bunny garden scene proof

An additional fixed catalog ID, `bunny-garden`, layers the existing bunny with
large flowers, a carrot patch, clouds and a visiting butterfly. Owner visually
approved this scene; the original animal-only starter is unchanged.

```bash
node scripts/workbook.mjs all --recipe recipes/coloring-bunny-garden.json --out dist-recipes/bunny-garden
xdg-open dist-recipes/bunny-garden/preview.html
npm run coloring:test
```

The PDF is `dist-recipes/bunny-garden/pdf/kennedi-coloring.pdf`. Choose an
absolute `--out` directory outside worktrees to retain review proofs.

Edit `design-source/coloring/scenes/bunny-garden.svg` in Inkscape; its layers are
background, flowers, bunny reference, butterfly and foreground. The linked
`../characters/bunny-coloring-opaque.svg` is a derived editable export, not a
replacement for the original bunny. Keep its reference ID and layer order.
Publishing inlines the vector paths, so HTML/PDF have no linked-file dependency.
All selected scene/character files are hashed in the frozen recipe.

If the opaque bunny derivative needs rebuilding, this is CPU-only:

```bash
node tools/prepare-coloring-bunny.mjs
```

It uses the existing bunny PNG, ImageMagick at 70 percent threshold and
potrace `--opaque`. It writes the coloring derivative and its provenance
receipt; it never changes canonical art or calls an image model. The opaque
interiors hide background lines through the face/body while the exterior
remains transparent. Tests bound minor edge-antialias differences, verify
source/published scene parity, and preserve the starter's exact HTML hashes.
Reprinting uses the saved SVG, not this preparation tool. Dependencies for
derivative preparation are ImageMagick, potrace and the existing Chrome setup.

Pippa, Kennedi and other storybook guests remain a later expansion: preserve
their established identity, create/review print-ready line-art exports, and
register a fixed scene ID plus all dependencies. No cast integration is built
or promised complete by this proof.

### Turtle pond companion proof

The fixed ID `turtle-pond` uses the existing walking turtle on a bank beside
lily pads, a water lily, reeds/cattails and a dragonfly. Owner visually approved
this scene. The bunny garden and animal-only pages are
unchanged.

```bash
node scripts/workbook.mjs all --recipe recipes/coloring-turtle-pond.json --out dist-recipes/turtle-pond
xdg-open dist-recipes/turtle-pond/preview.html
npm run coloring:test
```

The PDF is `dist-recipes/turtle-pond/pdf/kennedi-coloring.pdf`. Edit the layers
in `design-source/coloring/scenes/turtle-pond.svg`, keeping its linked
`../characters/turtle-coloring-opaque.svg` alongside it. Publishing embeds
editable vector paths, not raster pictures or external links. The scene and
character are both hashed in the frozen recipe. Reprint from that saved recipe
using its matching source checkout; catalog/source edits intentionally invalidate
older locks. Existing durable source overlays retain earlier proof versions.

CPU-only derivative preparation, if needed: `node tools/prepare-coloring-turtle.mjs`.
Uses the same validated 70 percent threshold/opaque Potrace export as the bunny.
No GPU or model is required to prepare this export or reproduce the page.
Both canonical turtle PNG/SVG remain unchanged. Tests measure white interior
occlusion, outline preservation, artist/publication parity and rejected drift.

### Make another coloring pack

Copy `recipes/coloring-starter.json` and change only the ordered `pages` list:

```json
{"schemaVersion":1,"template":"coloring-pages-v1","pages":["whale","bunny","turtle"]}
```

Choose 1-24 entries from `bunny`, `turtle`, `unicorn`, `whale`, `bunny-garden`, `turtle-pond`. Repeated entries
are allowed; each gets its own page. No file paths, HTML, prompts or arbitrary
captions are accepted. A local language model only needs to emit this JSON;
no model runtime integration is required. List choices with
`npm run workbook:catalog`, then validate with
`node scripts/workbook.mjs validate --recipe recipes/my-coloring-pack.json`.
Build using the same command above with that recipe filename.

Build writes a resolved `recipe.json` containing hashes of selected art,
ordered content and source inputs, plus `render-environment.json`. Reprint
using that saved recipe with this exact source checkout. Renderer/source/art
changes fail closed; keep the original checkout or create a new reviewed
recipe. Adding this template also changes shared renderer fingerprints for
older locked workbook recipes; their original checkouts remain necessary.
Unlocked alphabet/numbers/counting content is unchanged. PDF byte identity
across Chrome versions is not promised (metadata/rendering can vary).

To add a subject later, add a reviewed line-art SVG and its provenance, then
register its fixed ID/title/path in `src/content/coloring-pages.mjs` and the
schema enum in `recipes/workbook.schema.json`. Run tests and render/inspect the
actual PDF before admitting it. Do not accept arbitrary model-generated paths.
Page layout lives in that content module; styling is scoped to
`src/styles/coloring-practice.css`; `scripts/coloring.mjs` reuses the existing
Chrome/Poppler print helpers. No original workbook page is replaced.

## Illustrated alphabet practice: separate uppercase/lowercase rows

The new row-format workbook follows A, a, B, b through Z, z. It has two
letters per US Letter sheet (13 sheets), a solid manuscript model followed
by five dotted-stroke copies and a blank try space on each row. Capital
guides are 0.75in high; descenders have their own space below the baseline.
The existing animal line-art SVGs provide small picture cues, not quizzes.
These are letter-name/handwriting cues, not phonics instruction: for example
X-ray fish illustrates the letter X, not an initial /ks/ sound lesson.

From this directory, after `npm ci`:

```bash
npm run alphabet:all       # build + PDF + screenshots + PDF rasters + verify
npm run alphabet:test      # targeted source tests
```

For individual steps:

```bash
npm run alphabet:build
npm run alphabet:pdf
npm run alphabet:screenshots
npm run alphabet:rasterize
npm run alphabet:verify
```

Open `dist-alphabet/preview.html` directly in a browser. The combined PDF is
`dist-alphabet/pdf/kennedi-alphabet-practice-a-z.pdf`. Standalone HTML and
PDF pages live in `dist-alphabet/pages/` and `dist-alphabet/pdf/pages/`.
`pdf-raster/` contains actual 150-DPI PDF images; `contact-sheet.png` is the
whole-set overview. Print at **actual size / 100%** on US Letter paper.
The 0.5in safe margins are built into the layout.

To put all outputs somewhere durable outside a disposable checkout:

```bash
npm run alphabet:all -- --out /absolute/path/to/alphabet-output
npm run alphabet:verify -- --out /absolute/path/to/alphabet-output
```

Code and editable content:

- `src/content/alphabet-practice.mjs`: ordered A-Z cue words and SVG paths.
- `src/components/manuscript-glyphs.mjs`: shared letter strokes and guides.
- `src/components/alphabet-practice.mjs`: row and page composition.
- `src/styles/alphabet-practice.css`: styles scoped to this format only.
- `scripts/alphabet.mjs`: exports and verification using the existing
  self-contained document renderer, Chrome/Playwright and Poppler.

Change a cue/asset in the content catalog, then regenerate. The build crops
empty SVG canvas with measured bounds and padding; it never edits the art
itself. Artwork paths and source SHA256 hashes are recorded in the manifest.
No color-candidate drafts are consumed. The layout/art pairing awaits owner
visual review; reuse does not newly approve any artwork family.

Verification checks exact A-Z/a-z order, four rows per sheet, five trace
copies, blank try cells, actual glyph bounds and lowercase guide alignment,
0.75in cap guides, safe margins, horizontal/vertical overflow, browser
errors, PDF count/dimensions (including individual PDFs), current artwork,
and current code/content/styles versus generated HTML and PDF hashes.
It requires the screenshots and raster stages first. Browser screenshots
are supplementary; inspect the actual PDF rasters before approving prints.

This format leaves Book 1, Book 2 and all source illustrations unchanged.

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

Requires Node 20+ (Playwright and playwright-core both declare `"node": ">=20"`;
an npm install on Node 18 pulls in an explicitly-unsupported runtime for the
PDF/screenshot/verify commands), Google Chrome installed (Playwright drives it directly via
`channel: 'chrome'` — no browser download), and `poppler-utils` on PATH
(`pdfinfo`/`pdftoppm`, used only by `npm run verify` / `npm run rasterize`).
The recipe pipelines use the same installed Chrome channel and resolve Poppler
commands through PATH, without requiring `/usr/bin` executable locations.
Their render-environment record gets Chrome's version from the launched browser.
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
   `src/content/pages/page-06-helping-mission.mjs`, for the pattern.
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
5. `npm run pdf` — regenerate the PDF so it reflects the new page. Do this
   *before* step 6: `npm run verify` checks the PDF's page count against the
   current manifest, so running it against a stale (or missing) PDF fails or
   gives a false pass either way.
6. `npm run verify` — fix anything that shows `FAIL`.
7. `npm run rasterize` and spot-check `dist/pdf-raster/page-0N.png` — proof
   of exactly what a printer would receive, not just the HTML source.

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

## Numbers 1-20

`npm run numbers:all -- --out /absolute/output/directory` builds ten number-practice sheets and two counting/coloring breaks for a four-year-old. Each number has a solid model, three dotted copies and a blank try space, plus an exact dot quantity and reused animal line art. The output includes a combined US Letter PDF, individual pages, actual PDF rasters, contact sheet and verification. Print at Actual size / 100%.

Edit numbers and activities in `src/content/numbers-practice.mjs`, numeral strokes in `src/components/number-glyphs.mjs`, and scoped styles in `src/styles/numbers-practice.css`. Existing books and illustration files are unchanged. This layout awaits owner visual review; it is not a new illustration-approval claim.

## Mixed animal counting with three traceable choices

From this checkout's `workbook/` directory:

```bash
npm ci
npm run counting:test
npm run counting:all
```

Open `dist-counting-choice/preview.html` in a browser. Print
`dist-counting-choice/pdf/kennedi-count-circle-and-trace.pdf` at Actual size / 100%.
The default is 12 US Letter sheets, two animal groups per sheet, covering
every quantity 1-20 with four extra practice groups. Each group has three
different dotted choices, with exactly one correct answer. Count, circle the
number, then trace it. Correct positions are seed-shuffled and balanced across
the pack (eight left, eight middle, eight right); no answer is visibly marked.
Animal tiles remain .75 inch. Numeral guides are about .47 inch tall, smaller
than the single-answer format but still traceable, in roughly 1-inch cards.

The original single-answer layout is still available, with separate defaults:

```bash
npm run counting:all -- --mode guided
```

That builds eight three-group pages into `dist-counting/`, with the original
`pdf/kennedi-mixed-count-and-trace.pdf` filename. These are guided practice,
not a hidden-answer assessment. Existing exported proofs are left untouched.

To make another reproducible mix without overwriting the first:

```bash
npm run counting:all -- --seed 42 --out /absolute/path/to/another-pack
```

Seeds are integers from 0 through 4294967295. Use the same seed, mode and
output directory for each separate stage:

```bash
npm run counting:build
npm run counting:pdf
npm run counting:screenshots
npm run counting:rasterize
npm run counting:verify
```

`--out /absolute/path`, `--seed 42` and `--mode choice|guided` work on every
stage. Verification rejects stale output from a different seed/mode, changed
art, changed rendered content/styles or altered PDF.
Outputs include individual HTML/PDF pages, screenshots, actual grayscale PDF
rasters, contact sheet, manifest (seed/mode/groups/choices/art hashes) and
`verification.json`. Keep each mode/variant in a separate output directory.
Chromium/Chrome, `pdfinfo` and `pdftoppm` are required, as in the numbers book.

Edit `src/content/counting-practice.mjs` for group selection; the animal catalog
reuses the original numbers book's tracked SVG paths. The reusable activity is
`src/components/count-and-trace.mjs`, the unchanged numeral strokes are in
`src/components/number-glyphs.mjs`, the scoped print styles are in
`src/styles/counting-practice.css`, and the export/check pipeline is
`scripts/counting.mjs`. No new illustrations were generated. This layout is
ready for owner visual review, not a new art-approval claim. The original
numbers workbook and all other books remain unchanged.

## Rebuild from a recipe file

Recipes are ordinary UTF-8 JSON data, not code. No model runtime, network,
ComfyUI or image-generation GPU is needed. Run from this checkout's `workbook/`:

`workbook:test` also checks imported-art records using Python 3 with Pillow
and NumPy, the existing CPU-only art-check dependencies installed by CI.
These checks do not contact ComfyUI or load image models.
The print regression tests use the tools specified under [Install](#install).
They build isolated fixtures, never edit source artwork, and check PDF bytes,
live crop freshness, shorter rebuilds and absence of fixed Linux tool paths.

Alphabet and numbers exports save `.sha256` alongside `.sourcehash`; direct
verification rejects a changed PDF even if its Letter dimensions still match.
Direct verification measures live illustration crops instead of trusting a
previous manifest. Older exports need to be regenerated to create the new
PDF-byte sidecars. Saved recipe locks include the shared print-artifact code.

Each recipe generator stages fresh inventories for `pages/`, `pdf/pages/`
(including hash sidecars), `screenshots/` and `pdf-raster/`, then publishes each
only after its expected files have been generated. Old directories and their
annotations are retained in sibling `.<folder>-*.previous` backups, not deleted.
This permits a shorter recipe in the same output directory without retaining
old individual pages. Keep backups until no longer needed; use separate output
directories to preserve complete earlier books, including their root manifests,
combined PDF, recipe, preview and render-environment record. A failed stage keeps
its former live inventory; an entire multi-stage build is not one transaction.
Use distinct output directories for simultaneous builds.

```bash
npm ci
npm run workbook:test
npm run workbook:catalog
npm run workbook:validate -- --recipe recipes/counting-custom.json
npm run workbook:all -- --recipe recipes/counting-custom.json
```

The custom example makes three pages: 3 turtles, 5 elephants, 1 fox,
12 penguins, 20 whales and 8 cats. Open
`dist-recipes/count-and-trace-v1/preview.html`; print
`dist-recipes/count-and-trace-v1/pdf/kennedi-count-circle-and-trace.pdf`
at Actual size / 100%. Individual pages, screenshots, actual PDF rasters,
contact sheet and `verification.json` are generated by the existing pipeline.

Other ready-to-use recipes:

```bash
npm run workbook:all -- --recipe recipes/counting-mixed.json
npm run workbook:all -- --recipe recipes/alphabet-a-z.json
npm run workbook:all -- --recipe recipes/numbers-1-20.json
```

Use a different output directory for each variation so earlier exports are
preserved. The default directory is `dist-recipes/<template>/`:

```bash
npm run workbook:all -- --recipe recipes/counting-custom.json --out /absolute/path/to/my-counting-book
```

### Write a counting recipe

```json
{
  "schemaVersion": 1,
  "template": "count-and-trace-v1",
  "seed": 42,
  "mode": "choice",
  "groups": [
    {"animal": "turtle", "count": 3},
    {"animal": "elephant", "count": 5},
    {"animal": "fox", "count": 1, "choices": [2, 1, 3]}
  ]
}
```

- `seed` is an integer from 0 through 4294967295; zero is not replaced.
- `mode` is `choice` (three smaller dotted choices) or `guided` (one larger
  dotted answer). Choice pages have two groups; guided pages have three.
- Omit `groups` to make the existing complete seeded mix covering 1-20.
  Supply 1-60 groups to set the exact order and quantities. Partial final
  pages are allowed. Animals must differ within each page.
- Each `count` is an integer 1-20. `workbook:catalog` lists allowed animals.
  A frog is not yet in this counting catalog; unknown animals are rejected.
- In choice mode, omitted `choices` are generated deterministically with
  balanced shuffled answer positions. Optional explicit choices retain their
  exact order and must be three distinct integers 1-20 containing the count
  once. Explicit choices can override the generated position balance.
  Guided groups must not include choices.
- JSON must match `recipes/workbook.schema.json`. Extra fields, raw artwork
  paths, HTML/code, invalid choices and files above 64 KiB are rejected before
  output is created. Layout, instructions, tracing and assets come from the
  existing templates, not from model-authored markup.

The fixed `alphabet-rows-v1` recipe uses the existing A-Z/a-z book and
`numbers-1-20-v1` uses the existing number book, including its counting breaks.
These recipes need only `schemaVersion` and `template`; subsets, new page
layouts and other book types are deliberately not implemented in this slice.

### Save and replay the exact accepted workbook

Every recipe build writes `recipe.json` in its output directory. It includes
resolved counting groups/choices and a lock recording content, selected art
and renderer-source SHA256 values. Rebuild from that saved recipe, not from
another model response:

```bash
npm run workbook:all -- --recipe /absolute/path/to/my-counting-book/recipe.json --out /absolute/path/to/reprinted-book
```

Replays refuse changed content, selected art or renderer inputs. Preserve the
source checkout and assets with the recipe. A source/template/dependency
change needs the original checkout or a newly reviewed build from an unlocked
author recipe; do not edit a lock to claim the old workbook was reproduced.
`render-environment.json` records Node and Chrome versions. Use the same render
environment for exact page-image comparison. PDF metadata/timestamps can
differ between exports; compare page content/rasters, not only PDF bytes.

The generic wrapper checks the saved recipe before later stages:

```bash
npm run workbook:build -- --recipe recipes/counting-custom.json --out /absolute/path/to/my-counting-book
npm run workbook:pdf -- --recipe recipes/counting-custom.json --out /absolute/path/to/my-counting-book
npm run workbook:screenshots -- --recipe recipes/counting-custom.json --out /absolute/path/to/my-counting-book
npm run workbook:rasterize -- --recipe recipes/counting-custom.json --out /absolute/path/to/my-counting-book
npm run workbook:verify -- --recipe recipes/counting-custom.json --out /absolute/path/to/my-counting-book
```

Existing `alphabet:*`, `numbers:*` and `counting:*` commands remain supported.
Counting also accepts `--recipe FILE` directly on each stage; it cannot be
combined with `--seed` or `--mode`. Counting builds now also save a replayable
recipe. The shared schema/resolver is `src/recipes.mjs`, and the thin fixed
generator dispatcher is `scripts/workbook.mjs`. Model-runtime integration,
new illustrations and coloring recipes remain deferred.
