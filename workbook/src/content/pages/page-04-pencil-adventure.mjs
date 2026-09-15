import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { practiceRow } from '../../illustrations/pencil-practice.mjs';
import { inlineSvgFile, withSvgLabel } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_SIMPLIFIED = path.join(WORKBOOK, 'design-source/boss-kennedi/simplified-tier');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');

// Every icon on this page is now a locked, textured FLUX-generated asset
// (Art Direction v2 continued, 2026-09-13) -- was a mix of programmatic
// icons.mjs/animals.mjs primitives and page-local hand-coded SVGs, the
// older "assembled from primitives" style docs/design-system.md itself
// flags as visually flat next to the locked character art. Each asset
// below was picked from a 4-candidate batch generated from one prompt
// recipe (not single-thread prompt iteration -- see
// ~/.claude memory "kennedi-asset-generation-method" / this page's own
// git history) and vectorized via tools/vectorize-line-art.sh, same
// pipeline as the character-lock assets.
//
// Labeled here, on the SVG root -- withSvgLabel() inserts role="img"
// aria-label into a raw inlineSvgFile() result, which has no label of
// its own (unlike the old svgWrap()-based icons, which self-labeled).
const kennediPointing = withSvgLabel(
  inlineSvgFile(path.join(KENNEDI_SIMPLIFIED, '05-pointing-simplified.svg')),
  'Boss Kennedi pointing the way'
);
// "happy-alert" (ears perked, no ball in the pose itself) chosen over
// "reaching"/"playing" specifically because this row's destination is
// its own ball icon -- a puppy pose that already holds a ball would
// visually pre-empt the "puppy travels to the ball" journey this row
// illustrates.
const puppyHappy = withSvgLabel(
  inlineSvgFile(path.join(ANIMALS_LOCKED, '03-happy-alert.svg')),
  'a happy puppy with ears perked up, ready to play'
);
const birdPerched = withSvgLabel(
  inlineSvgFile(path.join(ANIMALS_LOCKED, 'bird-01-perched.svg')),
  'a bird perched on a branch'
);
const catSleeping = withSvgLabel(
  inlineSvgFile(path.join(ANIMALS_LOCKED, 'cat-01-sleeping.svg')),
  'a cat curled up sleeping'
);
const pencilLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'pencil.svg')), 'a pencil');
// The generated asset's own writing lines are drawn at the same bold
// weight as its outline (see the objects-locked generation notes) --
// unlike an earlier attempt that lost soft-gray lines to the print
// threshold entirely, these survive vectorization intact.
const paperLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'paper.svg')), 'a piece of paper with lines of writing');
const nestLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'nest.svg')), 'a bird nest with eggs');
const ballLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'ball.svg')), 'a basketball');
const clipboardLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'clipboard.svg')), 'a clipboard');
const bedLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'bed.svg')), 'a cozy pet bed');

export const meta = {
  pageNumber: 4,
  title: 'PENCIL ADVENTURE',
  primarySkill: 'pencil control',
  correctAnswers: {},
};

// Shared icon-slot width for every row (both start and destination) so the
// five rows read as one consistent treatment. Kept under 1in specifically
// because the Kennedi row's simplified-tier asset needs to stay under 1in
// (docs/art/asset-provenance.md's print-size test: "1.0in: clean"; "0.75in:
// borderline but survives") -- the other rows' generated assets sit inside
// that same validated range (2 puppy poses were tested at the same three
// sizes; the new bird/cat/object assets weren't individually re-tested at
// print but use the identical bold-outline, vectorize-at-threshold-70
// pipeline, so the same size ceiling applies). Using the same width
// everywhere is what makes this read as "one journey, one treatment"
// rather than "5 generic rows" with inconsistent icon scale.
const ICON_W = '0.9in';

/**
 * One journey row: a small start icon, the pencil-control practice path
 * (flex-grow, so it fills all the width the two icons don't need), and a
 * small destination icon. Same layout for all five rows.
 *
 * The wrapping divs are plain layout/sizing boxes, not role="img" -- every
 * `start`/`end` value passed in is already self-labeled on its own SVG root
 * via withSvgLabel(). Wrapping an already-labeled SVG in a second
 * role="img"/aria-label here duplicated every announcement -- a screen
 * reader traversing this page's primary exercise heard "pencil" / "a
 * pencil" for every icon, confirmed against the committed tagged PDF's
 * actual structure.
 */
function journeyRow({ kind, start, end }) {
  // margin-top (on top of .sheet-body's own default gap) spaces the five
  // rows generously down the page's real available height instead of
  // leaving them packed at the top with dead space below -- measured via
  // a throwaway Playwright pass (getBoundingClientRect on every row), not
  // guessed: at the default gap alone, 5 rows at this icon/path size only
  // used ~73% of .sheet-body's height.
  return `
<div class="row" style="justify-content:center; margin-top:0.34in;">
  <div style="width:${ICON_W}; flex:0 0 auto;">${start}</div>
  ${practiceRow(kind, { startMark: true, className: 'illo grow' })}
  <div style="width:${ICON_W}; flex:0 0 auto;">${end}</div>
</div>`;
}

export function render() {
  const rows = [
    // pencil -> paper: the literal real-world horizontal writing motion.
    journeyRow({ kind: 'horizontal', start: pencilLocked, end: paperLocked }),
    // bird -> nest: flying up.
    journeyRow({ kind: 'vertical', start: birdPerched, end: nestLocked }),
    // puppy -> ball: bouncy, playful motion.
    journeyRow({ kind: 'wave', start: puppyHappy, end: ballLocked }),
    // Kennedi -> clipboard: the brief's named "Kennedi to clipboard" pair,
    // an energetic "boss" dash.
    journeyRow({ kind: 'zigzag', start: kennediPointing, end: clipboardLocked }),
    // cat -> cozy bed: a curled sleeping cat visually rhymes with a loop.
    journeyRow({ kind: 'loop', start: catSleeping, end: bedLocked }),
  ].join('');

  const body = `
    <p class="instruction">Start at the star. Follow the path.</p>
    ${rows}
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
