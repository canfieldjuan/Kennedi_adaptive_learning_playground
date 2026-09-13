import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { pictureChoiceRow, drawingBox } from '../../components/activities.mjs';
import { inlineSvgFile } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_LOCKED = path.join(WORKBOOK, 'design-source/boss-kennedi/locked-poses');
const PUPPY_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

// Character-lock locked-pose assets (Art Direction v2 -- see
// docs/art/asset-provenance.md). Hero scene uses the raw asset at generous
// scale -- no crop needed (see page-06-helping-mission.mjs's "hero-scene
// sizing" note: a square-canvas locked pose falls back to its own square
// intrinsic aspect at any width and reads clearly above ~1.5in uncropped).
const kennediSittingWriting = inlineSvgFile(path.join(KENNEDI_LOCKED, '06-sitting-writing.svg'));
const puppySitting = inlineSvgFile(path.join(PUPPY_LOCKED, '01-sitting.svg'));

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
 *   06-sitting-writing: x=199.2 y=223.1 w=609.7 h=660.7 (seated -- uses the
 *     least vertical canvas of the three, so this pose gets the most zoom)
 *   08-celebrating:     x=211.0 y=55.9  w=603.0 h=940.1 (arms raised high --
 *     already spans nearly the full canvas height, so squaring barely crops)
 *   03-waving:          x=229.1 y=81.2  w=558.0 h=904.3 (raised arm, same
 *     tall silhouette as celebrating)
 */
function withViewBox(svgMarkup, viewBox) {
  return svgMarkup.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
}

/**
 * inlineSvgFile() returns the potrace SVG root exactly as traced -- no
 * role/title/aria-label of its own (unlike svgWrap()'s own output, which
 * adds one whenever a label is given). Dropped straight into a
 * pictureChoiceRow card (which just wraps whatever `{svg}` it's given in an
 * unlabeled div), a screen-reader user reached this page's primary question
 * but got no name for any of the three possible answers. Inject the label
 * onto the SVG root the same way svgWrap does, so each card is independently
 * identifiable -- naming WHAT the picture shows, same as every hand-drawn
 * icon's label elsewhere in this book, not whether it's the correct answer.
 */
function withLabel(svgMarkup, label) {
  return svgMarkup.replace(/^<svg /, `<svg role="img" aria-label="${label}" `);
}

const kennediSittingWritingCard = withLabel(
  withViewBox(kennediSittingWriting, '134.0 183.5 740.0 740.0'),
  'Kennedi sitting and writing on a clipboard'
);
const kennediCelebratingCard = withLabel(
  withViewBox(inlineSvgFile(path.join(KENNEDI_LOCKED, '08-celebrating.svg')), '-13.9 -0.5 1052.9 1052.9'),
  'Kennedi celebrating with both arms raised'
);
const kennediWavingCard = withLabel(
  withViewBox(inlineSvgFile(path.join(KENNEDI_LOCKED, '03-waving.svg')), '1.7 27.0 1012.8 1012.8'),
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
      <div role="img" aria-label="Kennedi sitting cross-legged, writing on a clipboard to make a plan" style="width:2.2in;">${kennediSittingWriting}</div>
      <div role="img" aria-label="puppy sitting beside Kennedi" style="width:1.4in;">${puppySitting}</div>
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
