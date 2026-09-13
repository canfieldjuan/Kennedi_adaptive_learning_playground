import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { practiceRow } from '../../illustrations/pencil-practice.mjs';
import { pencilIcon, ballIcon, clipboardIcon } from '../../illustrations/icons.mjs';
import { bird, puppy, cat } from '../../illustrations/animals.mjs';
import { svgWrap } from '../../illustrations/svg-utils.mjs';
import { inlineSvgFile, withSvgLabel } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_SIMPLIFIED = path.join(WORKBOOK, 'design-source/boss-kennedi/simplified-tier');

// Character-lock simplified-tier asset (Art Direction v2 -- see
// docs/art/asset-provenance.md). This row's icon slot is sized under 1in
// (see ICON_W below), which is exactly the regime asset-provenance.md's
// print-size test validated the simplified tier for ("1.0in: clean";
// "0.75in: borderline but survives") -- the full-detail locked pose is only
// specified for hero-scale (~1.5in+) use elsewhere, not here.
//
// Labeled here, on the SVG root -- unlike every other icon on this page
// (pencilIcon(), bird(), puppy(), ballIcon(), clipboardIcon(), cat(),
// nestIcon()/bedIcon()/paperIcon() all self-label via svgWrap()'s own
// label param), a raw inlineSvgFile() result has no label of its own.
const kennediPointing = withSvgLabel(
  inlineSvgFile(path.join(KENNEDI_SIMPLIFIED, '05-pointing-simplified.svg')),
  'Boss Kennedi pointing the way'
);

export const meta = {
  pageNumber: 4,
  title: 'PENCIL ADVENTURE',
  primarySkill: 'pencil control',
  correctAnswers: {},
};

/**
 * Page-local hand-drawn icons for the two destinations with no existing
 * icon (paper, nest, cozy bed). Same stroke convention as icons.mjs:
 * stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"
 * fill="#fff" for the primary shape, thinner stroke-width 4-5 OK for small
 * secondary detail (matches page 6's ballBehindBoxIcon/walkingAwayIcon
 * pattern). Reproduced inline rather than promoted to icons.mjs -- promote
 * only if a later page needs the same composition.
 */
function paperIcon(label = 'a piece of paper with lines of writing') {
  const inner = `
    <rect x="26" y="10" width="48" height="80" rx="6" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <line x1="36" y1="32" x2="64" y2="32" stroke="#000" stroke-width="5" stroke-linecap="round" />
    <line x1="36" y1="48" x2="64" y2="48" stroke="#000" stroke-width="5" stroke-linecap="round" />
    <line x1="36" y1="64" x2="56" y2="64" stroke="#000" stroke-width="5" stroke-linecap="round" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

function nestIcon(label = 'a bird nest') {
  const inner = `
    <path d="M12 58 Q50 34 88 58 Q88 78 50 84 Q12 78 12 58 Z" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <path d="M20 56 Q50 44 80 56" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
    <path d="M18 65 Q50 55 82 65" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
    <path d="M24 74 Q50 66 76 74" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

function bedIcon(label = 'a cozy bed') {
  const inner = `
    <rect x="12" y="42" width="76" height="38" rx="10" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <path d="M12 58 Q50 48 88 58" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
    <rect x="16" y="30" width="26" height="18" rx="7" stroke="#000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

// Shared icon-slot width for every row (both start and destination) so the
// five rows read as one consistent treatment. Kept under 1in specifically
// because the Kennedi row's simplified-tier asset needs to stay under 1in
// (see note above) -- the other four rows' icons don't strictly need the
// cap, but using the same width everywhere is what makes this read as "one
// journey, one treatment" rather than "4 generic rows + 1 special row"
// (the exact problem this page replaces).
const ICON_W = '0.9in';

/**
 * One journey row: a small start icon, the pencil-control practice path
 * (flex-grow, so it fills all the width the two icons don't need), and a
 * small destination icon. Same layout for all five rows.
 *
 * The wrapping divs are plain layout/sizing boxes, not role="img" -- every
 * `start`/`end` value passed in is already self-labeled on its own SVG root
 * (either via svgWrap()'s own label param, which every icon/animal helper
 * here uses, or via withSvgLabel() for the one locked-pose exception,
 * kennediPointing). Wrapping an already-labeled SVG in a second
 * role="img"/aria-label here duplicated every announcement -- a screen
 * reader traversing this page's primary exercise heard "pencil" / "a
 * pencil", "a bird nest" / "a nest", and so on for every one of the 10
 * icons, confirmed against the committed tagged PDF's actual structure.
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
    journeyRow({ kind: 'horizontal', start: pencilIcon(), end: paperIcon() }),
    // bird -> nest: flying up.
    journeyRow({ kind: 'vertical', start: bird('branch'), end: nestIcon() }),
    // puppy -> ball: bouncy, playful motion.
    journeyRow({ kind: 'wave', start: puppy('reach'), end: ballIcon() }),
    // Kennedi -> clipboard: the brief's named "Kennedi to clipboard" pair,
    // an energetic "boss" dash.
    journeyRow({ kind: 'zigzag', start: kennediPointing, end: clipboardIcon() }),
    // cat -> cozy bed: a curled sleeping cat visually rhymes with a loop.
    journeyRow({ kind: 'loop', start: cat('sleep'), end: bedIcon() }),
  ].join('');

  const body = `
    <p class="instruction">Start at the star. Follow the path.</p>
    ${rows}
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
