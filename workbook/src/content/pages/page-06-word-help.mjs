import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { bossMissionBox, pictureChoiceRow, rewardStar } from '../../components/activities.mjs';
import { bossKennedi } from '../../illustrations/boss-kennedi.mjs';
import { puppy, bird, cat } from '../../illustrations/animals.mjs';
import { svgWrap } from '../../illustrations/svg-utils.mjs';

export const meta = {
  pageNumber: 6,
  title: 'MY BOSS WORD',
  primarySkill: 'word recognition/fluency: HELP',
  correctAnswers: {
    whoNeedsHelp: 'item 1 (puppy reaching for a ball it cannot reach)',
    bossMission: 'item 1 (Boss Kennedi helping the puppy)',
  },
};

/**
 * Page-specific: a ball peeking out from behind a crate (the "hide the
 * ball" wrong choice for the Boss Mission). One-off per the design system
 * -- promote to icons.mjs only if a later page needs the same composition.
 */
function ballBehindBoxIcon(label = 'a ball hidden behind a box') {
  const inner = `
    <circle cx="28" cy="58" r="20" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <path d="M10 58 Q28 48 46 58 Q28 68 10 58" stroke="#000" stroke-width="3" fill="none" />
    <rect x="32" y="26" width="58" height="60" rx="6" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff" />
    <line x1="32" y1="44" x2="90" y2="44" stroke="#000" stroke-width="4" />
    <line x1="32" y1="62" x2="90" y2="62" stroke="#000" stroke-width="4" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function render() {
  const body = `
    <div class="col grow" style="gap:0.01in;">
      <div class="row" style="justify-content:center; align-items:center; gap:var(--space-2);">
        <p class="word-display word-display-sm grow" style="font-size:26pt;">HELP</p>
        <div class="row" style="gap:0.08in; flex:0 0 auto;">
          <div style="width:0.4in;">${bossKennedi('help', { label: 'Boss Kennedi leaning down to help' })}</div>
          <div style="width:0.35in;">${puppy('reach', { label: 'puppy reaching for a ball it cannot reach' })}</div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:0.1in;">
        <p class="section-heading" style="margin-bottom:0;">SAY IT</p>
        <p class="read-line" style="font-size:19pt;">HELP &mdash; I can help.</p>
      </div>
      <div class="col" style="gap:0.02in;">
        <p class="section-heading">TRACE IT</p>
        <div style="width:0.95in; margin:0 auto;">${tracingWord('HELP', { height: 70 })}</div>
        <div style="width:0.78in; margin:0 auto;">${tracingWord('help', { height: 58 })}</div>
      </div>
      <div class="col" style="gap:0.02in;">
        <div class="row" style="justify-content:space-between; align-items:baseline;">
          <p class="section-heading" style="margin-bottom:0;">WRITE IT</p>
          <p class="body-text">Model: help</p>
        </div>
        ${handwritingLine({ rows: 1, compact: 'xs' })}
      </div>
      <div class="col" style="gap:0.02in;">
        <div class="row" style="justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:0.1in;">
          <p class="section-heading" style="margin-bottom:0;">WHO NEEDS HELP?</p>
          <p class="instruction" style="margin:0;">Circle who needs help.</p>
        </div>
        ${pictureChoiceRow({
          compact: 'xs',
          columns: 3,
          items: [
            { svg: puppy('reach', { label: 'puppy reaching for a ball it cannot reach' }) },
            { svg: cat('sleep', { label: 'cat sleeping comfortably' }) },
            { svg: bird('eat', { label: 'happy bird eating' }) },
          ],
        })}
      </div>
      ${bossMissionBox({
        compact: true,
        instruction: 'Circle the best choice.',
        body: pictureChoiceRow({
          compact: 'xs',
          items: [
            { svg: bossKennedi('help', { label: 'Boss Kennedi helping the puppy' }) },
            { svg: bossKennedi('walkAway', { label: 'Boss Kennedi walking away' }) },
            { svg: ballBehindBoxIcon() },
          ],
        }),
      })}
      <div class="col" style="gap:0.02in;">
        <p class="section-heading">FINISH THE SENTENCE</p>
        <div class="row" style="align-items:center; gap:0.15in;">
          <p class="read-line" style="margin:0;">I can</p>
          <div style="width:0.92in; flex:0 0 auto;">${tracingWord('help', { height: 65 })}</div>
          <p class="read-line" style="margin:0;">.</p>
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;">
        ${rewardStar({ caption: 'MISSION COMPLETE', size: '0.7in' })}
      </div>
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
