import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { bossMissionBox, pictureChoiceRow, rewardStar } from '../../components/activities.mjs';
import { bird, cat } from '../../illustrations/animals.mjs';
import { bossKennedi } from '../../illustrations/boss-kennedi.mjs';
import { svgWrap } from '../../illustrations/svg-utils.mjs';
import { inlineSvgFile } from './asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_DIR = path.join(WORKBOOK, 'design-source/boss-kennedi/concepts');
const PUPPY_DIR = path.join(WORKBOOK, 'design-source/animals/puppy-concepts');

const kennediHelp = inlineSvgFile(path.join(KENNEDI_DIR, 'kennedi-c-help-pose.svg'));
const puppyFloppy = inlineSvgFile(path.join(PUPPY_DIR, 'concept-a-floppy-classic.svg'));

export const meta = {
  pageNumber: 6,
  title: 'MY BOSS WORD',
  primarySkill: 'word recognition/fluency: HELP -- art-direction integration proof, Mode B (print interior)',
  correctAnswers: {
    whoNeedsHelp: 'item 1 (puppy)',
    bossMission: 'item 1 (Boss Kennedi helping the puppy)',
  },
  artNote: 'Kennedi + puppy illustrations are FLUX.1-dev generated (Concept C direction) then potrace-vectorized, NOT the PR #133 programmatic SVG. All other components (tracing, handwriting, mission box, choice-row chrome) are UNCHANGED from the approved page 6. Owner-approval-required draft.',
};

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
        <div style="width:0.5in;">${kennediHelp}</div>
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
            { svg: puppyFloppy },
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
            { svg: kennediHelp },
            { svg: bossKennedi('walkAway', { label: 'Boss Kennedi walking away (old programmatic art, for comparison)' }) },
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
        ${rewardStar({ caption: 'MISSION COMPLETE', size: '0.58in' })}
      </div>
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
