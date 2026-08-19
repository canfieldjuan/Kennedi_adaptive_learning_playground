import { pageShell } from '../../components/layout.mjs';
import { bossMissionBox } from '../../components/activities.mjs';
import { bossKennedi } from '../../illustrations/boss-kennedi.mjs';
import { clipboardIcon } from '../../illustrations/icons.mjs';
import { practiceRow, curvedTracingPath } from '../../illustrations/pencil-practice.mjs';

export const meta = {
  pageNumber: 4,
  title: 'BOSS PENCIL TRAINING',
  primarySkill: 'pencil control / pre-writing strokes',
  correctAnswers: {},
};

export function render() {
  const rows = ['horizontal', 'vertical', 'wave', 'zigzag', 'loop'];
  const rowsHtml = rows.map((kind) => `<div>${practiceRow(kind)}</div>`).join('');

  const body = `
    <div class="col grow" style="gap:0.02in;">
      <p class="instruction">Follow the lines.</p>
      ${rowsHtml}
      ${bossMissionBox({
        instruction: 'Help Kennedi reach her clipboard.',
        compact: true,
        body: `
          <div class="row" style="justify-content:space-between; align-items:center;">
            <div style="width:0.55in; flex:0 0 auto;">${bossKennedi('hero', { label: 'Boss Kennedi reaching toward her clipboard' })}</div>
            <div style="width:1.5in; flex:0 0 auto;">${curvedTracingPath()}</div>
            <div style="width:0.35in; flex:0 0 auto;">${clipboardIcon('clipboard')}</div>
          </div>
        `,
      })}
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
