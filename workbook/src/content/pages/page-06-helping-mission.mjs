import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { tracingWord } from '../../components/tracing.mjs';
import { pictureChoiceRow, rewardStar } from '../../components/activities.mjs';
import { svgWrap } from '../../illustrations/svg-utils.mjs';
import { inlineSvgFile, withSvgLabel } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_LOCKED = path.join(WORKBOOK, 'design-source/boss-kennedi/locked-poses');

// Character-lock locked-pose asset (Art Direction v2 -- see
// docs/art/asset-provenance.md). Full detail throughout: both the hero
// scene and the picture-choice card size this well above the ~1in floor
// where full-detail art stays crisp, so the simplified tier isn't needed.
//
// The hero scene is 04-helping.svg ALONE, not composed with a second,
// separate puppy asset -- an earlier draft paired it with
// design-source/animals/locked-poses/02-reaching.svg (a standalone puppy)
// to show a "before" beat, but 04-helping.svg already contains its OWN
// puppy (Kennedi is kneeling down to a puppy drawn into the same image).
// Compositing a second, visually distinct puppy alongside it read as two
// different puppies in one scene -- confirmed by looking at the actual
// render, not assumed -- confusing for a page whose whole job is a single
// clear "puppy needs help -> Kennedi helps" read. One asset, one puppy,
// one clear story.
// Unlabeled -- reused below to build the separately-labeled, separately
// cropped choice-card version; withSvgLabel() inserts an attribute rather
// than replacing one, so labeling this raw copy would leave the card
// version with two role/aria-label pairs on one <svg>.
const kennediHelpingRaw = inlineSvgFile(path.join(KENNEDI_LOCKED, '04-helping.svg'));
// Labeled on the SVG root, not the wrapping <div> -- a div's role/aria-label
// works for on-screen assistive tech but does not survive into the tagged
// PDF's structure tree (confirmed against the committed PDF's /Alt entries),
// so this hero illustration was silently losing its description in the one
// deliverable this book is actually printed from.
const kennediHelping = withSvgLabel(kennediHelpingRaw, 'Kennedi kneeling down to help a puppy');

/**
 * The locked-pose SVGs are potrace traces of a 1024x1024 canvas, but the
 * actual character only occupies the center ~50-65% of it per axis (lots of
 * headroom/footroom baked into the source raster) -- confirmed by measuring
 * the real content bbox with getBBox() in a headless browser. At the
 * default `.choice-card > svg { width:68%; height:68% }` sizing this reads
 * as noticeably SMALLER than a tightly-composed hand-drawn icon in the same
 * card (verified by rendering: see the structured report's
 * choice_row_at_full_size_verdict). Fix: re-window the same artwork with a
 * tighter, still-square viewBox (pure crop -- the path data is untouched,
 * so nothing is stretched or distorted) before handing it to
 * pictureChoiceRow, so the card-1 asset fills its card at roughly the same
 * density as the hand-drawn cards 2/3. Computed once via getBBox() on
 * 04-helping.svg (content bbox x=225.1 y=196.3 w=581.4 h=668.6 inside the
 * 0-1024 viewBox), padded 6% per axis, then squared off (shorter axis
 * padded to match the longer) so the square-aspect-ratio fallback this
 * page's sizing math depends on still holds. Reuse this same
 * measure-then-crop technique for any other locked pose going into a
 * pictureChoiceRow -- do not just eyeball a crop.
 */
function withViewBox(svgMarkup, viewBox) {
  return svgMarkup.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
}

// withSvgLabel() (src/content/asset-inline.mjs): without it, a raw
// inlineSvgFile() result dropped into a pictureChoiceRow card has no
// accessible name, so a screen-reader user reaches "What should Kennedi
// do?" with no name for this choice. Same gap page 3 has for the same
// reason.
const kennediHelpingCard = withSvgLabel(withViewBox(kennediHelpingRaw, '141 156 749 749'), 'Kennedi kneeling down to help the puppy');

export const meta = {
  pageNumber: 6,
  title: 'HELPING MISSION',
  primarySkill: 'understanding/expressing "help"',
  correctAnswers: {
    bossMission: 'item 1 (Kennedi kneeling down to help the puppy)',
  },
};

/**
 * Page-specific: a ball peeking out from behind a crate (the "hide the
 * ball" wrong choice). Reproduced inline from the old page-06-word-help.mjs
 * -- not imported from it, since that file is deleted once every
 * redesigned page is verified. Promote to icons.mjs only if a later page
 * needs the same composition.
 */
function ballBehindBoxIcon(label = 'a ball hidden behind a box') {
  const inner = `
    <circle cx="28" cy="58" r="20" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <path d="M10 58 Q28 48 46 58 Q28 68 10 58" stroke="#000" stroke-width="3" fill="none" />
    <rect x="32" y="26" width="58" height="60" rx="6" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <line x1="32" y1="44" x2="90" y2="44" stroke="#000" stroke-width="4" />
    <line x1="32" y1="62" x2="90" y2="62" stroke="#000" stroke-width="4" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

/**
 * Page-specific: an open door with an arrow leading away from it, for the
 * "walk away" wrong choice. No locked pose exists for a back-turned/walking
 * Kennedi (not one of the 8 required poses -- see
 * docs/art/asset-provenance.md), and the brief rules out reusing the old
 * primitive bossKennedi('walkAway') figure or inventing a new character
 * style, so this is a simple hand-drawn icon instead of a character pose.
 * Same stroke convention as ballBehindBoxIcon above.
 *
 * Two earlier drafts were tried and rejected after actually looking at the
 * render (not assumed clean): (1) an oval pad + 3 small round "toe" circles
 * per mark -- reads as an animal PAW print, wrong for a choice about what
 * KENNEDI does; (2) two plain stacked ellipses meant to simplify a human
 * footprint -- reads as an ambiguous figure-8/snowman blob at this icon
 * size, not recognizable as a foot. An open door + arrow sidesteps shape
 * literacy about feet entirely -- "the door is open and she's gone through
 * it" is a concept a preschooler already has, and door/arrow/knob are all
 * simple, unambiguous geometric shapes at small size.
 */
function walkingAwayIcon(label = 'an open door with an arrow leading away, meaning Kennedi leaves') {
  const inner = `
    <rect x="14" y="10" width="9" height="82" rx="2" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#000" />
    <path d="M23 12 L67 30 L67 84 L23 90 Z" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <circle cx="56" cy="58" r="4.5" fill="#000" />
    <path d="M74 51 L95 51 M95 51 L85 41 M95 51 L85 61" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function render() {
  const body = `
    <div class="col">
      <p class="read-line">The puppy needs help.</p>
      <p class="read-line">Kennedi can help.</p>
    </div>
    <div class="row" style="justify-content:center;">
      <div style="width:2.2in;">${kennediHelping}</div>
    </div>
    ${pictureChoiceRow({
      instruction: 'What should Kennedi do?',
      columns: 3,
      items: [
        { svg: kennediHelpingCard },
        { svg: walkingAwayIcon() },
        { svg: ballBehindBoxIcon() },
      ],
    })}
    <div class="row" style="justify-content:center; align-items:center; gap:0.2in;">
      <p class="read-line" style="margin:0;">I can</p>
      <div style="width:2.3in;">${tracingWord('help', { height: 130 })}</div>
      <p class="read-line" style="margin:0;">.</p>
    </div>
    <div class="row" style="justify-content:flex-end;">
      ${rewardStar({ caption: 'MISSION COMPLETE', size: '0.5in' })}
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
