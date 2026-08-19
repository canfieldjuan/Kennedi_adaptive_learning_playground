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
