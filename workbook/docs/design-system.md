# Design system: how to build a page

This is the reference for adding a page to the "Kennedi Is the Boss"
workbook system. Page 1 (`src/content/pages/page-01-cover.mjs`) is the
proven, rendered, verified reference implementation -- when in doubt, read
that file and copy its patterns rather than inventing new ones.

## The page module contract

Every page is a `.mjs` file in `src/content/pages/` that exports:

```js
export const meta = {
  pageNumber: 3,
  title: 'I Am The Boss!',        // must exactly match the <h1> text you render
  primarySkill: 'letter/word recognition: BOSS',
  correctAnswers: { bossMission: 'item 1 (Boss Kennedi with clipboard)' },
};

export function render() {
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body: `...` });
}
```

`correctAnswers` is documentation only -- a future answer key / the coloring
pack. **Never** render the answer differently from the wrong choices on the
page itself (no highlight color, no bold border, no different icon style).
All picture-choice cards must look identical in weight/size/border.

Then register the page in `src/content/book-1.mjs`:

```js
import * as page03 from './pages/page-03-i-am-the-boss.mjs';
// add it to the `pages` array
```

## Page shell

- Interior pages (2-6): `pageShell({ pageNumber, title, body })` from
  `src/components/layout.mjs`. It renders the kicker/title header and the
  "Page N" footer for you -- don't rebuild those.
- The cover only (page 1) uses `coverShell({ body })`. You will not need this.

`body` is one HTML string. Compose it from the components below joined with
plain template literals. `pageShell`'s `.sheet-body` is a flex column with
`gap: var(--space-3)` -- direct children stack top-to-bottom automatically.
Use `<div class="row">...</div>` (from components.css) to lay two things
side by side, `<div class="col">` to stack, `class="grow"` on a flex child
that should take remaining space.

## Reusable components (`src/components/`)

- `bossMissionBox({ instruction, body })` -- the bordered "Boss Mission"
  callout (badge + label + instruction + whatever markup you pass as body).
- `pictureChoiceRow({ instruction, items, columns })` -- `items` is
  `[{ svg }, ...]` in display order, `svg` is the output of an illustration
  function. 3 or 4 items both work (grid auto-sizes via `columns`, defaults
  to `items.length`).
- `tracingWord(word, { height })` -- large dashed-outline SVG text for one
  tracing target, e.g. `tracingWord('BOSS')`, `tracingWord('boss', { height: 120 })`.
  Use it exactly twice per word (once uppercase, once lowercase) per the
  content spec -- never more.
- `handwritingLine({ rows })` -- one or more blank preschool ruled rows
  (solid top, dashed mid, heavy solid baseline). `rows: 1` unless the spec
  calls for more room.
- `rewardStar({ caption })` -- the colorable outline star + caption, used on
  page 6 only.
- `illustrationFrame({ inner, className })` -- optional bordered frame
  around a hero illustration.
- `drawingBox({ className })` -- a large dashed-border open box for "draw
  yourself" style prompts. Give it `class="grow"` (via className) so it
  fills remaining vertical space rather than being a fixed small box.

CSS-only building blocks already available (no JS needed): `.instruction`
(bold instruction line), `.section-heading` (uppercase section label, e.g.
"READ WITH ME", "TRACE IT"), `.read-line` (large read-aloud sentence),
`.body-text`, `.word-display` (solid large word reveal, NOT tracing -- use
for "Large word: BOSS" style requirements; add class `word-display-sm` if
it needs to be smaller than the default 90pt).

## Illustrations (`src/illustrations/`)

Every illustration is bold black outline, white fill, no gray, no color.
**Reuse these; do not draw a one-off inline Boss Kennedi or animal SVG in a
page file.** If an existing pose truly doesn't fit, add a new pose/export to
the relevant module (following the existing stroke-width ~6-7 / rounded
cap+join / white-fill convention) so the next page can reuse it too.

- `bossKennedi(pose, { crown, label })` from `boss-kennedi.mjs`. Poses:
  `'hero'` (clipboard + raised pencil), `'wave'` (waving, other hand near
  chest badge), `'help'` (leaning down, arm reaching), `'walkAway'` (back
  turned, no face). `crown: true` adds her crown (used sparingly -- cover
  page only, unless a page has a specific reason).
- `puppy(pose)`, `bird(pose)`, `cat(pose)` from `animals.mjs`. Puppy poses:
  `'sit' | 'play' | 'reach' | 'happy'`. Bird poses: `'branch' | 'eat'`. Cat:
  `'sleep'`.
- Icon set in `icons.mjs` (all `(label?)` or `(label?, filled?)`, viewBox
  0-100, drop into a `pictureChoiceRow` item or an inline `<span
  class="icon-inline" style="width:0.4in;height:0.4in;">...</span>`):
  `bossBadgeIcon`, `crownIcon`, `clipboardIcon`, `pencilIcon`, `starIcon`,
  `checkmarkIcon`, `heartIcon`, `ballIcon`, `appleIcon`, `shoeIcon`,
  `teddyBearIcon`, `bananaIcon`, `sockIcon`, `paintbrushIcon`,
  `magnifyingGlassIcon`.
- `pencil-practice.mjs`: `practiceRow(kind, { reps })` for the pencil-control
  rows (`kind`: `'horizontal' | 'vertical' | 'wave' | 'zigzag' | 'loop'`) --
  one solid demo cell + dashed cells to trace. `curvedTracingPath()` for the
  single open dotted path (page 4's Kennedi-to-clipboard mission; NOT a
  maze -- one path, no branches).

If a page needs a genuinely new small icon not listed above (e.g. page 6's
"hide the ball behind something"), it's fine to compose it inline in the
page file using the same stroke convention (`stroke="#000" stroke-width="6"
stroke-linecap="round" stroke-linejoin="round" fill="#fff"` for filled
shapes) -- promote it to `icons.mjs` only if you think a later page will
reuse it.

## Hard rules (do not violate)

1. Pure black ink only (`#000`). No gray fills or gray strokes anywhere in
   printed content -- thin gray lines disappear on cheap home printers.
2. One primary skill per page, one optional small reinforcement. Don't fill
   space for its own sake; whitespace is fine.
3. Nothing renders outside the page's built-in 0.5in safe margin. Don't use
   negative margins or absolute positioning that escapes `.sheet`.
4. Text sizes: use the existing classes/tokens (`.instruction` = 20pt bold,
   `.read-line` = 24pt bold, `.body-text` = 16pt) rather than inventing new
   font sizes inline. If you must set a custom size for something like a
   large word, use `var(--text-word-lg)` / `var(--text-heading)` tokens from
   `src/styles/tokens.css`.
5. **Any element that will hold headline-weight text needs `line-height:
   normal`** (not a numeric ratio). Baloo 2 and Nunito both need their
   natural (`normal`) line-height at large sizes or the browser reports
   vertical overflow even though nothing visibly clips -- this bit page 1
   during build and the fix was switching every heading-ish class to
   `line-height: normal`. Follow that pattern for any new text class.
6. Do not run any `git` commands. Only create/edit files under `workbook/`.
   Do not edit another page's file in `src/content/pages/`.

## Verifying your page

From `workbook/`:

```bash
npm run build   # renders dist/pages/*.html + dist/preview.html + dist/manifest.json
npm run verify  # pdfinfo + console-error + overflow checks (build+pdf must have run first for the PDF check to matter)
```

`npm run verify`'s browser checks (console errors, horizontal/vertical
overflow per page) work off `dist/pages/*.html` alone, so `npm run build`
is enough to exercise them -- you do not need to regenerate the PDF while
iterating. Fix every `FAIL` line before considering the page done.

---

## Art Direction v2 (DRAFT -- owner visual approval required, 2026-08-19)

**This section proposes a replacement for the illustration approach above.
It is NOT yet approved and NOT wired into `book-1.mjs` / the real 6 pages.**
Everything below exists only as `design-source/*/concepts/` comparison
material and a `dist-proof/` integration proof (2 pages). Until an owner
picks a direction, page authors should keep following the hand-authored SVG
component/illustration system described earlier in this file. See
`docs/art/asset-provenance.md` for the full asset table, tooling notes, and
known issues (character-consistency-across-poses is NOT solved yet, a badge
artifact needs a fix, small-icon legibility needs a second tier -- read it
before building on this).

### Why v1 needs replacing

The programmatic SVG in `src/illustrations/` (circles + rectangles + basic
bezier paths, uniform 6-7px stroke) reads as assembled-from-primitives:
simplistic faces, stiff poses, flat silhouettes, no depth. Reference: PR
#133's original Boss Kennedi/animal/icon set.

### Two modes (unchanged concept, now with a concrete asset source)

- **Mode A (color hero art)** -- cover, certificates, any large/promotional
  use. Full color, gentle shading/soft shadows OK. Source: FLUX.1-dev raster
  PNG, used as-is (no vectorization needed -- richness is the point).
- **Mode B (print interior art)** -- everything on a learning page. Must
  stay home-printer-safe: bold black outlines, white background, no color,
  selective mid-gray/hatching only where it earns its ink. Source:
  FLUX.1-dev generated as B&W line art, then vectorized via
  `workbook/tools/vectorize-line-art.sh` (potrace) into a real scalable SVG
  -- confirmed print-faithful via PDF rasterization in the page-6 proof.

### Generation pipeline (see asset-provenance.md for full detail)

1. `workbook/tools/comfy-generate.py "<prompt>" --out <file.png>` -- talks
   to a locally running ComfyUI (FLUX.1-dev) at `http://127.0.0.1:8188`.
   Start it with `~/Desktop/ComfyUI-master/start_comfyui.sh` if not running.
2. For Mode B assets: `workbook/tools/vectorize-line-art.sh in.png out.svg`
   to get a clean traced SVG (single compound path, prints crisply at any
   size -- verified, not assumed).
3. Inkscape 1.2.2 is installed and available as the canonical
   cleanup/export tool for hand-editing a trace afterward (node
   simplification, manual fixes like the badge-artifact issue below) --
   available but not yet used in this slice.
4. Recraft was NOT available (no MCP connection, no API key) -- this
   pipeline is the documented fallback, not the originally-requested one.
   See asset-provenance.md's "Tooling note."

### Canonical character: Boss Kennedi

Four concept directions were generated and compared (contact sheet:
`docs/art/concept-contact-sheet.png`):

- **A -- Soft Modern**: soft wavy loose pigtails, big expressive eyes, open
  smile, pinafore dress, varied line weight.
- **B -- Bold Graphic**: uniform bold outline, short ponytail, overalls,
  hands-on-hips confident stance, minimal interior detail -- most legible at
  small print size, but no visible badge in this draft and least distinctive.
- **C -- Textured Detailed** (recommended, see below): pigtails with visible
  hair ties, round badge on the chest, holding a clipboard, fine hair/fabric
  hatching, rosy cheeks. Most storybook-polished, most faithful to the
  original "confident boss holding a clipboard" character brief.
- **D -- Dynamic Athletic**: curly/coily pigtails with organic spiral
  linework, mid-stride running pose, star badge, most kinetic/energetic --
  but a running pose is the least reusable base for the many static
  educational poses the series actually needs (holding a pencil, pointing,
  sitting to write, etc).

**Recommendation: Concept C ("Textured Detailed") as the primary/canonical
direction.** It's the most polished, most emotionally expressive, and the
only one that already matches the original character brief (clipboard in
hand). Runner-up: **Concept B ("Bold Graphic")** -- not as the canonical
full-detail character, but as the basis for a *simplified icon-scale tier*
of the same character (same hairstyle/outfit language, reduced interior
linework) for anything printed under ~1in, where C's fine hatching risks
clogging into gray mush on a cheap inkjet. This two-tier approach (C for
hero-scale, B-style-simplified for icon-scale) is a proposal, not yet built
or tested -- the page-6 proof reused full-detail C at small scale as an
expedient, and it holds up fine at 150dpi PDF rasterization, but a real
production pass should still build the simplified tier rather than relying
on shrinking the detailed one indefinitely.

Two puppy directions were also generated: **A "Floppy-Ear Classic"**
(sitting, calm-happy, recommended as the versatile base pose) and **B
"Perky Energetic"** (mid-jump, better reserved for specific
playing/excited narrative beats than as a general-purpose base).

### Print test finding (from the page-6 integration proof)

Fitting Concept C's hero illustration into page 6 -- already the most
content-dense page in the book -- required shrinking it to ~0.5in before
the page stopped overflowing (`npm run verify`'s overflow check caught this
exactly the way it's supposed to). At that size the illustration's extra
detail barely reads; the practical benefit on a dense page is mostly in the
picture-choice icons, not the small hero portrait. Pages with more
whitespace budget (the cover, or lighter pages like 2-4) will show off the
richer art much better. This is the concrete case for the two-tier
(detailed/simplified) proposal above, not just a hypothetical concern.

### What's still unapproved / not done

- No pose has gone through Inkscape cleanup.
- Character consistency across poses is unverified beyond two same-prompt
  generations (standing + helping) -- no ControlNet/IP-Adapter/LoRA lock.
- The helping-pose badge has a stray "6" glyph artifact (FLUX hallucination)
  that needs fixing before that specific asset is production-eligible.
- The B-style "simplified icon tier" of Concept C is a proposal only, not
  built.
- Pages 2-5 have not been touched and still use v1 art -- this whole
  section is pending an owner decision before ANY page is converted.
