import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { pictureChoiceRow, drawingBox } from '../../components/activities.mjs';
import { inlineSvgFile, withSvgLabel } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_LOCKED = path.join(WORKBOOK, 'design-source/boss-kennedi/locked-poses');
const PUPPY_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

// Character-lock locked-pose assets (Art Direction v2 -- see
// docs/art/asset-provenance.md). Hero scene uses the raw asset at generous
// scale -- no crop needed (see page-06-helping-mission.mjs's "hero-scene
// sizing" note: a square-canvas locked pose falls back to its own square
// intrinsic aspect at any width and reads clearly above ~1.5in uncropped).
//
// kennediSittingWritingRaw stays unlabeled -- it's reused below to build the
// separately-labeled, separately-cropped choice-card version, and
// withSvgLabel() just inserts an attribute (it doesn't replace one), so
// calling it twice on the same string would emit two role/aria-label pairs
// on one <svg>. The hero and card each get their own single label, applied
// once, on their own copy.
const kennediSittingWritingRaw = inlineSvgFile(path.join(KENNEDI_LOCKED, '06-sitting-writing.svg'));
// Labeled on the SVG root, not the wrapping <div> -- a div's role/aria-label
// works for on-screen assistive tech but does not survive into the tagged
// PDF's structure tree (confirmed against the committed PDF's /Alt entries),
// so this hero illustration was silently losing its description in the one
// deliverable this book is actually printed from.
const kennediSittingWriting = withSvgLabel(kennediSittingWritingRaw, 'Kennedi sitting cross-legged, writing on a clipboard to make a plan');
const puppySitting = withSvgLabel(inlineSvgFile(path.join(PUPPY_LOCKED, '01-sitting.svg')), 'puppy sitting beside Kennedi');

/**
 * Same measure-then-crop technique documented in page-06-helping-mission.mjs
 * (the pilot page). Locked-pose SVGs are potrace traces of a padded
 * 1024x1024 canvas where the real character only occupies the center part
 * of it per axis -- and how much varies a lot by pose (a seated pose uses
 * far less of the canvas than a standing, arms-raised pose). Dropped in raw
 * at pictureChoiceRow's `.choice-card > svg { width:68%; height:68% }`
 * sizing (which falls back to each SVG's own square intrinsic aspect), that
 * empty canvas margin reads as a visually smaller/weaker character than a
 * tightly-cropped neighbor -- and on this page specifically, the correct
 * answer (the seated pose, which is the most-padded of the three) is the
 * one that would read smallest if left uncropped, an unintentional "tell."
 * Fix: re-window each pose with a tighter, still-square viewBox (pure crop
 * -- path data untouched, so nothing is stretched or distorted). Computed
 * once per asset via getBBox() in a headless browser (root <svg>, not the
 * inner <g> -- the <g> carries potrace's own transform, so its bbox is
 * pre-transform and wrong/huge), padded 6% per axis, then squared off
 * (shorter axis padded to match the longer, centered) so the
 * square-aspect-ratio fallback math the card sizing depends on still holds.
 * Do this for every locked-pose character going into a pictureChoiceRow;
 * hand-drawn icons need no such treatment (already composed to fill their
 * own 100x100 viewBox tightly).
 *
 * Measured content bbox (of the 0-1024 viewBox), via getBBox():
 *   06-sitting-writing: x=199.2 y=218.2 w=605.5 h=665.6 (seated -- uses the
 *     least vertical canvas of the three, so this pose gets the most zoom)
 *   08-celebrating:     x=211.0 y=69.5  w=603.0 h=926.5 (arms raised high --
 *     already spans nearly the full canvas height, so squaring barely crops)
 *   03-waving:          x=235.2 y=88.1  w=557.7 h=897.4 (raised arm, same
 *     tall silhouette as celebrating)
 */
function withViewBox(svgMarkup, viewBox) {
  return svgMarkup.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
}

// withSvgLabel() (src/content/asset-inline.mjs) closes the same
// accessible-name gap page-06-helping-mission.mjs's choice card has --
// pictureChoiceRow wraps a raw inlineSvgFile() result in an unlabeled div,
// so a screen-reader user reached this page's primary question with no
// name for any of the three possible answers. Naming WHAT each picture
// shows, same as every hand-drawn icon's label elsewhere in this book, not
// whether it's the correct answer.
const kennediSittingWritingCard = withSvgLabel(
  withViewBox(kennediSittingWritingRaw, '129.2 178.3 745.5 745.5'),
  'Kennedi sitting and writing on a clipboard'
);
const kennediCelebratingCard = withSvgLabel(
  withViewBox(inlineSvgFile(path.join(KENNEDI_LOCKED, '08-celebrating.svg')), '-6.3 13.9 1037.7 1037.7'),
  'Kennedi celebrating with both arms raised'
);
const kennediWavingCard = withSvgLabel(
  withViewBox(inlineSvgFile(path.join(KENNEDI_LOCKED, '03-waving.svg')), '11.5 34.2 1005.1 1005.1'),
  'Kennedi waving hello'
);

export const meta = {
  pageNumber: 3,
  title: 'MEET BOSS KENNEDI',
  primarySkill: 'listening comprehension + identity language',
  correctAnswers: {
    bossMission: 'item 1 (Kennedi sitting and writing -- making a plan)',
  },
};

export function render() {
  const body = `
    <div class="col" style="gap:0.03in;">
      <p class="read-line">I am Kennedi.</p>
      <p class="read-line">I am kind.</p>
      <p class="read-line">I can make a plan.</p>
    </div>
    <div class="row" style="justify-content:center; align-items:flex-end; gap:var(--space-4);">
      <div style="width:2.2in;">${kennediSittingWriting}</div>
      <div style="width:1.4in;">${puppySitting}</div>
    </div>
    ${pictureChoiceRow({
      instruction: 'Circle the picture showing Kennedi making a plan.',
      columns: 3,
      items: [
        { svg: kennediSittingWritingCard },
        { svg: kennediCelebratingCard },
        { svg: kennediWavingCard },
      ],
    })}
    <p class="instruction">Draw one thing you would put in your plan.</p>
    ${drawingBox({ className: 'grow' })}
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
