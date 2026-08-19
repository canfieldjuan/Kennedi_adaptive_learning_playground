import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { pictureChoiceRow } from '../../components/activities.mjs';
import { bossKennedi } from '../../illustrations/boss-kennedi.mjs';
import { bossBadgeIcon, heartIcon, ballIcon } from '../../illustrations/icons.mjs';

export const meta = {
  pageNumber: 2,
  title: 'This Book Belongs To',
  primarySkill: 'name recognition & writing: Kennedi',
  correctAnswers: { bossBadge: 'item 1 (boss badge star)' },
};

export function render() {
  const body = `
    <div class="row top">
      <p class="body-text grow">My name is Kennedi.</p>
      <div style="width:0.8in; flex:0 0 auto;">${bossKennedi('wave', { label: 'Boss Kennedi waving and pointing at her name badge' })}</div>
    </div>
    ${handwritingLine({ rows: 1 })}
    ${tracingWord('Kennedi', { height: 170 })}
    ${handwritingLine({ rows: 1 })}
    ${pictureChoiceRow({
      instruction: 'Circle your boss badge.',
      items: [
        { svg: bossBadgeIcon('boss badge') },
        { svg: heartIcon('heart') },
        { svg: ballIcon('ball') },
      ],
    })}
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
