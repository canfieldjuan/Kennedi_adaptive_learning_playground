/**
 * Quick mockup, NOT wired into book-2.mjs / the real build -- owner asked
 * to see the new page layout direction (multiple letters per page,
 * combined "Aa" tracing rows with handwriting guide lines, matching a
 * reference worksheet image, illustration added under each row) before
 * any real page files change. Renders one representative page (A, B, C)
 * to dist-book-2/mockup.png for review.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { renderDocument } from '../src/render.mjs';
import { dottedLetterRow } from '../src/components/letter-tracing.mjs';
import { inlineSvgFile, withSvgLabel } from '../src/content/asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const OBJECTS_LOCKED = path.join(root, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(root, 'design-source/animals/locked-poses');

const LETTERS = [
  { upper: 'A', lower: 'a', word: 'Apple', svg: path.join(OBJECTS_LOCKED, 'apple.svg'), label: 'an apple' },
  { upper: 'B', lower: 'b', word: 'Ball', svg: path.join(OBJECTS_LOCKED, 'ball.svg'), label: 'a ball' },
  { upper: 'C', lower: 'c', word: 'Cat', svg: path.join(ANIMALS_LOCKED, 'cat-01-sleeping.svg'), label: 'a sleeping cat' },
];

// ROW_HEIGHT is soloLetter/dottedLetterRow's own internal proportions
// number (fontSize = height*0.82 etc, purely relative -- NOT a CSS size,
// since these components are height-driven: their wrapping div's real
// CSS height is what actually sizes them on the page, see components.css).
// ROW_HEIGHT_IN is that real CSS height. Using the same 0.72 baseline
// fraction for both is what makes the guide lines' 72%-from-top baseline
// line up with the components' own text baseline -- they don't need to
// share a literal number, only that fraction.
const ROW_HEIGHT = 140;
const ROW_HEIGHT_IN = 1.15;

// Simple sky/mid-dashed/baseline guide lines behind the letters -- approximates
// the reference worksheet's ruled handwriting line. Top near the row's own
// top (generous cap-height headroom, matching the reference), midline at a
// rough x-height fraction, baseline at the SAME 0.72 fraction soloLetter/
// dottedLetterRow use internally for their own text baseline, so the guide
// line and the actual glyph baseline coincide without extra math.
function guideLines() {
  return `
    <div style="position:absolute; inset:0;">
      <div style="position:absolute; left:0; right:0; top:6%; border-top:1.5px solid #999;"></div>
      <div style="position:absolute; left:0; right:0; top:45%; border-top:1.5px dashed #999;"></div>
      <div style="position:absolute; left:0; right:0; top:72%; border-top:2.5px solid #000;"></div>
    </div>
  `;
}

function letterBlock({ upper, lower, word, svg, label }) {
  const chars = upper + lower;
  const illustration = withSvgLabel(inlineSvgFile(svg), label);
  return `
    <div class="col" style="gap:0.12in;">
      <div style="position:relative; height:${ROW_HEIGHT_IN}in;">
        ${guideLines()}
        <div style="position:relative; height:100%;">${dottedLetterRow(chars, { height: ROW_HEIGHT, reps: 4 })}</div>
      </div>
      <div class="row" style="align-items:center; gap:0.25in;">
        <div class="illo-frame" style="width:1.1in; height:1.1in; flex:0 0 auto;">${illustration}</div>
        <p class="read-line" style="margin:0;">${chars} is for ${word}.</p>
      </div>
    </div>
  `;
}

const PAGE_NUMBER = 1;

const body = `
  <div style="height:11in; box-sizing:border-box; padding:0.5in; display:flex; flex-direction:column;">
    <h1 class="sheet-title" style="margin:0; border-bottom:2px solid #000; padding-bottom:0.15in;">Kennedi's Workbook</h1>
    <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:0.3in; padding-top:0.3in;">
      ${LETTERS.map(letterBlock).join('')}
    </div>
    <p class="sheet-footer" style="justify-content:center;">Alphabet Page ${PAGE_NUMBER}</p>
  </div>
`;

const outPath = path.join(root, 'dist-book-2', 'mockup.html');
writeFileSync(outPath, renderDocument({ title: 'alphabet page mockup', bodyHtml: body }), 'utf8');
const pdfPath = path.join(root, 'dist-book-2', 'mockup.pdf');
const pngPath = path.join(root, 'dist-book-2', 'mockup.png');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto(`file://${outPath}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
// live page.screenshot() hit a real, reproducible Chromium compositor
// glitch on this page (dense with inline SVGs -- dozens of <circle> dots
// per letter, several potrace-traced illustrations): a fragment of the
// LAST illustration (the cat, bottom of the page) got painted into the
// TOP-left corner of the captured PNG -- confirmed NOT a duplicate
// DOM/HTML bug (the cat's SVG markup appears exactly once in the page
// source) and not fixed reliably by waiting extra paint frames first
// (flaky: clean on some runs, reproduced again on others). Matching this
// project's OWN established reliable pattern for "get a trustworthy PNG
// of a page" (export-pdf.mjs + rasterize-pdf.mjs, used for the real book)
// sidesteps it entirely: page.pdf() goes through Chromium's print
// pipeline, a different and more deterministic code path than live
// on-screen compositing, then poppler's pdftoppm rasterizes that PDF.
await page.pdf({
  path: pdfPath,
  width: '8.5in',
  height: '11in',
  printBackground: true,
  margin: { top: '0in', bottom: '0in', left: '0in', right: '0in' },
});
await browser.close();

// Check the page count explicitly rather than rasterizing with
// `-singlefile` and trusting it -- confirmed directly this content once
// silently overflowed to a second PDF page (a row/gap sizing issue, since
// fixed), and `-singlefile` on a multi-page PDF rasterizes only the
// first page with no error, which would have silently dropped the
// overflow content from review instead of surfacing it.
const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
const pageCount = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
if (pageCount !== 1) {
  console.error(`mockup overflowed to ${pageCount} PDF pages -- tighten row/gap sizing so it fits on 1`);
  process.exit(1);
}

execFileSync('pdftoppm', ['-png', '-r', '150', '-singlefile', pdfPath, pngPath.replace(/\.png$/, '')]);
console.log('wrote dist-book-2/mockup.png');
