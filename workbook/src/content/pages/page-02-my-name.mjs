import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { inlineSvgFile, withSvgLabel } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_LOCKED = path.join(WORKBOOK, 'design-source/boss-kennedi/locked-poses');

// Character-lock slice asset (see docs/art/asset-provenance.md). Waving
// reads as "hi, I'm Kennedi" -- the natural gesture for a name-introduction
// page, distinct from the clipboard/boss framing used on pages 3/6.
//
// Labeled here, on the SVG root, not on the wrapping <div> below -- a
// role="img"/aria-label on the div works for on-screen/HTML assistive tech,
// but does NOT survive into the tagged PDF's structure tree (the PDF's
// /Alt entries only picked up SVG-root labels, confirmed against the
// actual committed PDF); this hero illustration was silently losing its
// description in the one deliverable this book is actually printed from.
const kennediWaving = withSvgLabel(inlineSvgFile(path.join(KENNEDI_LOCKED, '03-waving.svg')), 'Kennedi waving hello');

export const meta = {
  pageNumber: 2,
  title: 'MY NAME IS KENNEDI',
  primarySkill: 'name recognition + early name writing: Kennedi',
  correctAnswers: { circleYourName: 'item 1 (Kennedi)' },
};

export function render() {
  const body = `
    <div class="col" style="gap:0.04in;">
      <p class="read-line">My name is Kennedi.</p>
      <p class="word-display word-display-sm">Kennedi</p>
    </div>
    <div style="width:5.5in; margin:0 auto;">${tracingWord('Kennedi', { height: 220 })}</div>
    ${handwritingLine({ rows: 2 })}
    <div class="col" style="gap:0.08in;">
      <div class="row" style="justify-content:center; gap:var(--space-4);">
        <div style="width:1.42in;">${kennediWaving}</div>
        <div style="display:inline-flex; align-items:center; border:var(--line-thick) solid var(--ink); border-radius:var(--radius-lg); padding:0.14in 0.32in;">
          <span style="font-family:var(--font-display); font-weight:800; font-size:var(--text-instruction); letter-spacing:0.05em; line-height:normal;">KENNEDI</span>
        </div>
      </div>
      <div class="choice-block" style="gap:0.05in;">
        <p class="instruction">Circle your name.</p>
        <div class="choice-row" style="--cols:3;">
          <div class="choice-card" style="min-height:0; padding:0.03in;"><p class="word-display word-display-sm">Kennedi</p></div>
          <div class="choice-card" style="min-height:0; padding:0.03in;"><p class="word-display word-display-sm">Maya</p></div>
          <div class="choice-card" style="min-height:0; padding:0.03in;"><p class="word-display word-display-sm">Sam</p></div>
        </div>
      </div>
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
