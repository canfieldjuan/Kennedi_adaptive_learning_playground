import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { bossMissionBox, pictureChoiceRow, drawingBox } from '../../components/activities.mjs';
import { bossKennedi } from '../../illustrations/boss-kennedi.mjs';
import { puppy, bird } from '../../illustrations/animals.mjs';

export const meta = {
  pageNumber: 3,
  title: 'I AM THE BOSS!',
  primarySkill: 'letter/word recognition: BOSS',
  correctAnswers: { bossMission: 'item 1 (Boss Kennedi with clipboard)' },
};

export function render() {
  const body = `
    <div class="col grow" style="gap:0.03in;">
      <div class="row top">
        <div class="col grow" style="gap:0.05in;">
          <p class="section-heading">READ WITH ME</p>
          <p class="read-line">I am Kennedi.</p>
          <p class="read-line">I am the boss.</p>
        </div>
        <div style="width:1in; flex:0 0 auto;">${bossKennedi('hero', { label: 'Boss Kennedi holding a clipboard and pencil' })}</div>
      </div>
      <div class="col" style="gap:0.03in;">
        <p class="section-heading">TRACE THE WORD</p>
        <div style="width:1.6in; margin:0 auto;">${tracingWord('BOSS', { height: 130 })}</div>
        <div style="width:1.6in; margin:0 auto;">${tracingWord('boss', { height: 110 })}</div>
        ${handwritingLine({ rows: 1, compact: true })}
      </div>
      ${bossMissionBox({
        instruction: 'Circle the boss.',
        compact: true,
        body: pictureChoiceRow({
          compact: true,
          items: [
            { svg: `<div style="width:0.55in;">${bossKennedi('hero', { label: 'Boss Kennedi holding a clipboard' })}</div>` },
            { svg: `<div style="width:0.55in;">${puppy('play')}</div>` },
            { svg: `<div style="width:0.55in;">${bird('branch')}</div>` },
          ],
        }),
      })}
      <div class="col grow" style="gap:0.03in;">
        <p class="section-heading">CREATE</p>
        <p class="instruction">Draw yourself being the boss!</p>
        ${drawingBox({ className: 'grow drawing-box-compact' })}
      </div>
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
