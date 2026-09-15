import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { pictureChoiceRow } from '../../components/activities.mjs';
import { inlineSvgFile, withSvgLabel } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

// Locked, textured FLUX-generated assets (Art Direction v2 continued,
// 2026-09-13) -- replaces the old icons.mjs/animals.mjs primitives. All
// four are potrace-vectorized from a square 1024x1024 source (same as
// every other locked asset in this book), so unlike the old
// animals.mjs bird() this page previously used, none of them need the
// non-square-viewBox crop/pad workaround that used to live here (see git
// history if that problem recurs for a future non-square asset).
const badgeLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'badge.svg')), 'boss badge');
const ballLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'ball.svg')), 'ball');
const birdLocked = withSvgLabel(inlineSvgFile(path.join(ANIMALS_LOCKED, 'bird-01-perched.svg')), 'bird on a branch');
const appleLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'apple.svg')), 'apple');

export const meta = {
  pageNumber: 5,
  title: 'BOSS BEGINS WITH B',
  primarySkill: 'uppercase/lowercase letter recognition: B',
  correctAnswers: {
    bWords: 'items 1, 2, 3 (badge, ball, bird) -- NOT item 4 (apple)',
  },
};

/**
 * The book's first real phonics page: recognize uppercase B and lowercase b
 * (reveal -> trace -> write), then apply it by picking every picture that
 * starts with the /b/ sound. One skill, taught four ways, plus the one
 * reinforcement -- no second, unrelated quiz bolted on (see
 * docs/pages-1-6-redesign-plan.md, Page 5 section).
 */
export function render() {
  const body = `
    <p class="read-line">B is for Boss.</p>
    <div class="row" style="justify-content:center; gap:var(--space-5);">
      <p class="word-display" style="margin:0;">B</p>
      <p class="word-display" style="margin:0;">b</p>
    </div>
    <div class="row" style="justify-content:center; gap:var(--space-4);">
      <div style="width:2.3in;">${tracingWord('B', { height: 140 })}</div>
      <div style="width:2.3in;">${tracingWord('b', { height: 130 })}</div>
    </div>
    ${handwritingLine({ rows: 1 })}
    ${pictureChoiceRow({
      instruction: 'Circle the pictures that begin with B.',
      columns: 4,
      items: [
        { svg: badgeLocked },
        { svg: ballLocked },
        { svg: birdLocked },
        { svg: appleLocked },
      ],
    })}
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
