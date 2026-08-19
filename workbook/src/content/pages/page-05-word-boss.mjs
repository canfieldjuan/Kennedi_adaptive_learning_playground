import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { bossMissionBox, pictureChoiceRow } from '../../components/activities.mjs';
import { bossKennedi } from '../../illustrations/boss-kennedi.mjs';
import {
  bossBadgeIcon,
  appleIcon,
  shoeIcon,
  teddyBearIcon,
  clipboardIcon,
  bananaIcon,
  sockIcon,
} from '../../illustrations/icons.mjs';

export const meta = {
  pageNumber: 5,
  title: 'MY BOSS WORD',
  primarySkill: 'word recognition/fluency: BOSS',
  correctAnswers: {
    findIt: 'item 1 (boss badge)',
    bossMission: 'item 1 (clipboard)',
  },
};

export function render() {
  const body = `
    <div class="col grow" style="gap:0.02in;">
      <div class="row" style="justify-content:center; align-items:center; gap:var(--space-3);">
        <p class="word-display word-display-sm grow">BOSS</p>
        <div style="width:0.55in; flex:0 0 auto;">${bossKennedi('hero', { label: 'Boss Kennedi with her boss badge' })}</div>
      </div>
      <div class="row" style="justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:0.1in;">
        <p class="section-heading" style="margin-bottom:0;">SAY IT</p>
        <p class="read-line">BOSS &mdash; I am the boss!</p>
      </div>
      <div class="col" style="gap:0.02in;">
        <p class="section-heading">TRACE IT</p>
        <div style="width:1.5in; margin:0 auto;">${tracingWord('BOSS', { height: 100 })}</div>
        <div style="width:1.2in; margin:0 auto;">${tracingWord('boss', { height: 85 })}</div>
      </div>
      <div class="col" style="gap:0.02in;">
        <div class="row" style="justify-content:space-between; align-items:baseline;">
          <p class="section-heading" style="margin-bottom:0;">WRITE IT</p>
          <p class="body-text">Model: boss</p>
        </div>
        ${handwritingLine({ rows: 1, compact: true })}
      </div>
      <div class="col" style="gap:0.02in;">
        <div class="row" style="justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:0.1in;">
          <p class="section-heading" style="margin-bottom:0;">FIND IT</p>
          <p class="instruction" style="margin:0;">Circle the boss badge.</p>
        </div>
        ${pictureChoiceRow({
          compact: 'sm',
          columns: 4,
          items: [
            { svg: bossBadgeIcon('boss badge') },
            { svg: appleIcon('apple') },
            { svg: shoeIcon('shoe') },
            { svg: teddyBearIcon('teddy bear') },
          ],
        })}
      </div>
      ${bossMissionBox({
        compact: true,
        instruction: 'What does a boss use to make a plan?',
        body: pictureChoiceRow({
          compact: 'sm',
          items: [
            { svg: clipboardIcon('clipboard') },
            { svg: bananaIcon('banana') },
            { svg: sockIcon('sock') },
          ],
        }),
      })}
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
