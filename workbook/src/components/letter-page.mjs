import { dottedLetterRow } from './letter-tracing.mjs';
import { inlineSvgFile, withSvgLabel, withViewBox } from '../content/asset-inline.mjs';

// ROW_HEIGHT is dottedLetterRow's own internal proportions number
// (fontSize = height*0.82 etc, purely relative -- NOT a CSS size, since
// the component is height-driven: its wrapping div's real CSS height is
// what actually sizes it on the page, see components.css). ROW_HEIGHT_IN
// is that real CSS height. Both, and every other measurement here, come
// directly from scripts/mockup-alphabet-layout.mjs -- the owner-approved
// mockup this function replaces the ad-hoc version of ("that looks
// good"), carried over as-is rather than re-derived.
const ROW_HEIGHT = 140;
const ROW_HEIGHT_IN = 1.15;

// Simple sky/mid-dashed/baseline guide lines behind the letters --
// approximates the owner's reference worksheet image's ruled handwriting
// line. Top near the row's own top (generous cap-height headroom,
// matching the reference), midline at a rough x-height fraction, baseline
// at the SAME 0.72 fraction dottedLetterRow uses internally for its own
// text baseline, so the guide line and the actual glyph baseline coincide
// without extra math.
function guideLines() {
  return `
    <div style="position:absolute; inset:0;">
      <div style="position:absolute; left:0; right:0; top:6%; border-top:1.5px solid #999;"></div>
      <div style="position:absolute; left:0; right:0; top:45%; border-top:1.5px dashed #999;"></div>
      <div style="position:absolute; left:0; right:0; top:72%; border-top:2.5px solid #000;"></div>
    </div>
  `;
}

/**
 * One letter's block within an alphabet page: a guide-lined "Aa" row
 * (solid model + 3 dotted copies to trace -- dottedLetterRow(chars,
 * {reps:4}) alone gives exactly this, no separate solid-letter call
 * needed, its own first cell IS the solid demo), then the "[Letter] is
 * for [Word]" illustration underneath.
 */
function letterBlock({ upper, lower, word, illustrationPath, illustrationLabel, illustrationViewBox }) {
  const chars = upper + lower;
  let illustrationSvg = inlineSvgFile(illustrationPath);
  // Some locked assets carry a lot of headroom in their native 1024x1024
  // canvas (see withViewBox()'s own doc comment) and read visibly
  // smaller/sparser than others at this page's fixed illo-frame size --
  // confirmed by rendering, not assumed. `illustrationViewBox` lets a
  // per-letter page pass a pre-measured, padded-and-squared crop; letters
  // whose asset already fills its frame (apple, ball, zebra) pass nothing.
  if (illustrationViewBox) illustrationSvg = withViewBox(illustrationSvg, illustrationViewBox);
  const illustration = withSvgLabel(illustrationSvg, illustrationLabel);

  return `
    <div class="col" style="gap:0.12in;">
      <div style="position:relative; height:${ROW_HEIGHT_IN}in;">
        ${guideLines()}
        <div style="position:relative; height:100%; text-align:center;">${dottedLetterRow(chars, { height: ROW_HEIGHT, reps: 4 })}</div>
      </div>
      <div class="row" style="align-items:center; gap:0.25in;">
        <div class="illo-frame" style="width:1.1in; height:1.1in; flex:0 0 auto;">${illustration}</div>
        <p class="read-line" style="margin:0;">${chars} is for ${word}.</p>
      </div>
    </div>
  `;
}

/**
 * One full alphabet-tracing page, multiple letters (2-3) grouped
 * together, matching the owner-approved layout mockup: a page title
 * ("Kennedi's Workbook", not a per-letter title -- the whole book is one
 * continuous workbook, not 26 standalone worksheets), each letter's
 * guide-lined trace-and-illustrate block in sequence, and a footer
 * reading "Alphabet Page N".
 */
export function alphabetPage({ pageNumber, letters }) {
  const body = `
    <h1 class="sheet-title" style="margin:0; border-bottom:2px solid #000; padding-bottom:0.15in;">Kennedi's Workbook</h1>
    <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:0.3in; padding-top:0.3in;">
      ${letters.map(letterBlock).join('')}
    </div>
    <p class="sheet-footer" style="justify-content:center;">Alphabet Page ${pageNumber}</p>
  `;
  return `<section class="sheet" data-page="${pageNumber}">${body}</section>`;
}
