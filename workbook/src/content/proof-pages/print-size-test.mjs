import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inlineSvgFile } from './asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_SIMPLE = path.join(WORKBOOK, 'design-source/boss-kennedi/simplified-tier');
const PUPPY_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 'size-test',
  title: 'Character Lock: Real Print-Size Test',
  primarySkill: 'print legibility validation, NOT a workbook page -- draft/owner-approval-required proof artifact only',
};

const SIZES = [0.75, 1.0, 1.5];

const ROWS = [
  { label: 'Kennedi -- Hero + Clipboard (simplified tier)', svg: inlineSvgFile(path.join(KENNEDI_SIMPLE, '02-hero-clipboard-simplified.svg')) },
  { label: 'Kennedi -- Helping (simplified tier)', svg: inlineSvgFile(path.join(KENNEDI_SIMPLE, '04-helping-simplified.svg')) },
  { label: 'Kennedi -- Pointing (simplified tier)', svg: inlineSvgFile(path.join(KENNEDI_SIMPLE, '05-pointing-simplified.svg')) },
  { label: 'Puppy -- Sitting (canonical base)', svg: inlineSvgFile(path.join(PUPPY_LOCKED, '01-sitting.svg')) },
  { label: 'Puppy -- Playing', svg: inlineSvgFile(path.join(PUPPY_LOCKED, '04-playing.svg')) },
];

export function render() {
  const rows = ROWS.map((row) => {
    const cells = SIZES.map((size) => `
      <div class="size-cell">
        <div class="size-label">${size}in</div>
        <div class="size-box" style="width:${size}in;height:${size}in;">${row.svg}</div>
      </div>
    `).join('');
    return `
      <div class="size-row">
        <div class="row-label">${row.label}</div>
        <div class="row-cells">${cells}</div>
      </div>
    `;
  }).join('');

  const body = `
    <section class="size-test-page" data-page="size-test" style="padding:0.5in; width:8.5in; background:#fff; box-sizing:border-box;">
      <header class="sheet-header">
        <p class="sheet-kicker">CHARACTER LOCK PROOF</p>
        <h1 class="sheet-title" style="font-size:24pt;">Real Print-Size Test</h1>
      </header>
      <div style="display:flex; flex-direction:column; gap:0.22in; margin-top:0.22in;">
        <p class="body-text" style="margin:0;">Simplified-tier assets shown at actual print size. Judge: identity retention, print clarity, line clutter, whether hatching clogs, whether the silhouette still reads.</p>
        ${rows}
      </div>
    </section>
    <style>
      .size-row { display: flex; align-items: center; gap: 0.3in; border-bottom: 1.5px solid #ccc; padding-bottom: 0.18in; }
      .row-label { width: 2.6in; flex: 0 0 auto; font-family: var(--font-body); font-weight: 700; font-size: 11pt; }
      .row-cells { display: flex; align-items: flex-end; gap: 0.5in; flex: 1 1 auto; }
      .size-cell { display: flex; flex-direction: column; align-items: center; gap: 0.05in; }
      .size-label { font-family: var(--font-display); font-weight: 700; font-size: 9pt; color: #444; }
      .size-box { border: 0.5px dashed #999; display: flex; align-items: center; justify-content: center; }
      .size-box svg { width: 100%; height: 100%; }
    </style>
  `;
  return body;
}
