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

## Art Direction v2 (DRAFT -- owner visual approval required, updated 2026-08-19)

**This section proposes a replacement for the illustration approach above.
It is NOT yet approved and NOT wired into `book-1.mjs` / the real 6 pages.**
Everything below exists only as `design-source/*/concepts/` +
`design-source/*/locked-poses/` + `design-source/*/simplified-tier/`
comparison material and a `dist-proof/` integration proof (2 pages + a
print-size test sheet). Until an owner approves this and Pages 1-6 are
actually converted, page authors should keep following the hand-authored
SVG component/illustration system described earlier in this file.

**Status: Concept C is owner-approved as the direction. Character-lock
slice (multi-pose consistency, badge-artifact fix, simplified tier, puppy
canon, print-size validation) is complete and believed ready for the next
gate: replacing the art on Pages 1-6 and preparing PR #133 for merge.**
See `docs/art/asset-provenance.md` for the full asset table, the exact
mechanism that made cross-pose consistency work, and remaining minor risks
-- read it before generating any further poses.

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

Two puppy directions were compared; **A "Floppy-Ear Classic"** (sitting,
calm-happy) is the **owner-approved canonical puppy base** -- not B.

### Character lock (2026-08-19 slice) -- Concept C, multi-pose

Concept C is approved as the direction. This slice turned it into an actual
8-pose consistency proof + a simplified small-print tier + a 4-pose puppy
canon. Full mechanism writeup, per-pose generation notes, and a "what didn't
work" list (so it isn't relitigated) are in `docs/art/asset-provenance.md`
-- read that before generating any new pose. Summary:

- **Mechanism**: plain repeated text prompts do NOT lock identity across
  FLUX generations (confirmed by direct comparison of the previous slice's
  two Concept C images -- different bangs, different skirt cut on close
  inspection). The fix is **FLUX.1 Redux** (style/subject transfer from a
  reference image, already installed in this ComfyUI setup), from a single
  **clean neutral reference** (`design-source/boss-kennedi/locked-poses/01-neutral.png`
  -- plain standing pose, empty hands, no held props), at a tuned strength:
  **0.08** for anything changing body posture or held objects (sitting,
  kneeling, clipboard), **0.15-0.2** for arm-gesture-only changes on a
  standing body (waving, pointing, celebrating).
- **Locked identity traits** (preserved across all 8 poses): face shape,
  pigtail hairstyle with two small hair ties, big eyes with eyelashes, a
  round badge with a plain star (explicitly re-described in every prompt --
  Redux alone doesn't reliably carry small details), collared shirt +
  knee-length pleated skirt + socks + sneakers, consistent short/round
  preschooler proportions, consistent bold-outline print-line-art style.
  Sheet: `docs/art/kennedi-consistency-sheet.png`.
- **Simplified small-scale tier**: NOT a distinct generated art style
  (prompting FLUX to "simplify" didn't reliably work -- see
  asset-provenance.md). Instead, the already-correct locked hero/helping/
  pointing poses are re-vectorized with looser potrace parameters
  (`-t 20 -O 1.0 -a 1.2`), which measurably reduces path complexity
  (~25% smaller SVGs) while keeping the same identity and pose. Files:
  `design-source/boss-kennedi/simplified-tier/`.
- **Canonical puppy**: 4 poses (sitting/reaching/happy-alert/playing) off
  the Concept A "Floppy-Ear Classic" base, same Redux mechanism. Sheet:
  `docs/art/puppy-consistency-sheet.png`.
- **Badge artifact -- fixed**: the previous-slice help-pose's stray "6" is
  gone (asset superseded, not referenced anywhere). A second,
  previously-unreported artifact was also found and fixed this slice: the
  cover image's badge had a stray "Y"-like glyph; regenerating with
  explicit "plain round badge, simple star only, no letters/numbers"
  language fixed it. Both fixes came from being explicit about the badge
  contents in every prompt, not from post-hoc raster editing.

### Print test findings

**Page-6 integration** (previous slice, still true): fitting a full-detail
hero illustration into page 6 -- the most content-dense page in the book --
required shrinking it to ~0.5in before the page stopped overflowing
(`npm run verify`'s overflow check caught this correctly). At that size a
full-detail illustration's extra hatching barely reads.

**Real print-size test** (this slice, `dist-proof/print-size-test.pdf`,
rasterized at 300dpi -- a realistic home-inkjet resolution, not just the
150dpi used for the page proofs): the simplified-tier Kennedi assets and
the canonical puppy were rendered at 0.75in / 1.0in / 1.5in in actual
dashed-border boxes and inspected at true print resolution.
- **1.5in and 1.0in**: clean at both. Face, hair, badge, and pose all read
  clearly; no muddiness.
- **0.75in**: borderline but survives -- silhouette and facial expression
  stay legible, but fine detail (the badge's star, individual hair
  strands) compresses to "a small decoration" rather than a crisply
  resolved shape. Usable for a small supporting icon, not ideal for
  anything the child needs to visually distinguish in detail.
- The puppy (full detail, NOT simplified-tier) held up cleanly even at
  0.75in -- floppy ears and expression stayed clear, no muddiness. Not
  every asset needs the simplified tier; it matters most for Kennedi's
  denser hair/clothing detail.

### What's still open (minor, not blocking)

- The "thinking" pose (#7) ended up arms-crossed rather than the literal
  hand-on-chin gesture originally specified -- a hand-on-chin version was
  generated successfully but had a stray badge glyph; the clean
  arms-crossed version was kept instead of spending further generation
  budget chasing the exact gesture. Still reads clearly as "thinking."
- No LoRA/ControlNet training was done. Redux is a strong practical fix but
  is probabilistic, not a hard guarantee -- expect to occasionally need a
  regeneration (with the strength/reference guidance above) when producing
  further new poses for Pages 7+.
- The page-6 integration proof's "walk away" choice-card icon is still the
  OLD programmatic `bossKennedi('walkAway')` SVG -- intentional (that pose
  wasn't one of the 8 required this slice), not an oversight, but it means
  that one proof page still mixes old and new styles in one spot.
- Pages 1-6 have not actually been converted yet -- everything above is
  proof/comparison material in `dist-proof/` and `design-source/`. Owner
  approval of this character-lock slice is the last gate before that
  conversion work happens.
