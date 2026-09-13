import { pageShell } from '../../components/layout.mjs';
import { tracingWord, handwritingLine } from '../../components/tracing.mjs';
import { pictureChoiceRow } from '../../components/activities.mjs';
import { bossBadgeIcon, ballIcon, appleIcon } from '../../illustrations/icons.mjs';
import { bird } from '../../illustrations/animals.mjs';

/**
 * `bird('branch')` (animals.mjs) is a hand-composed illustration, not a
 * locked-pose potrace trace -- but it hits the exact same class of problem
 * the pilot page (page-06) found and fixed for locked-pose characters in a
 * pictureChoiceRow, just from a different root cause: its viewBox is a
 * non-square "0 0 200 160", and the actual ink (bird body + branch line)
 * only fills the CENTER ~54% of the canvas height (the branch line runs
 * near-full-width, but the bird itself sits in a vertically-compressed
 * band) -- measured via getBBox() in a headless page against this page's
 * own preview.html: content bbox x=10 y=48 w=180 h=86 (of 0-200 x 0-160).
 * Rendered plain inside this page's 4-column, non-compact pictureChoiceRow,
 * that measured as visibly thinner/weaker than the neighboring badge/ball/
 * apple icons -- confirmed objectively by cropping each rendered card to
 * its precise getBoundingClientRect() and PIL-scanning the real ink pixels
 * (border-clear inset, several inset sizes cross-checked for stability):
 * bird's real ink height came out 0.276-0.335in vs 0.464-0.531in for the
 * other three cards.
 *
 * IMPORTANT DEVIATION from the pilot's own recipe: the pilot's fix (for a
 * DIFFERENT scenario -- 3-column row, indefinite card height) pads the
 * measured bbox and SQUARES it off, because that row's `.choice-card > svg
 * {width:68%;height:68%}` falls back to the child SVG's own intrinsic
 * (square) aspect ratio. This page's row is 4-column with `.choice-card`
 * pinned to its `min-height:1.3in` floor -- measured directly
 * (getBoundingClientRect on every card's <svg>) to render EVERY card's svg
 * into an IDENTICAL, already-non-square viewport (0.902in x 0.623in, a
 * fixed ~1.448:1 aspect) *regardless of the child SVG's own viewBox aspect*
 * -- confirmed by getting the same 0.902x0.623 box for the square (100x100)
 * badge/ball/apple AND for a squared-off bird tried first. Squaring bird's
 * viewBox therefore made it render SMALLER (0.266in ink height, worse) --
 * "meet" scales a square source down further to fit a wider-than-tall
 * target box. The correct crop for THIS layout pads the bbox ~6% per axis
 * then fits it to the box's actual 1.448:1 aspect (not 1:1), so "meet"'s
 * uniform scale-to-fit isn't constrained by either axis more than the
 * other. Re-verified after with the same PIL scan: bird ink height went
 * 0.276in (squared, worse) -> 0.406in (aspect-fit), against 0.464-0.531in
 * for badge/ball/apple -- not perfect parity (a bird-on-a-branch silhouette
 * is naturally wider/leaner than a badge or a ball), but no longer the
 * stark mismatch the unfixed 0.276-0.335in read as. Applied ONLY to this
 * page's choice-row copy of the bird; the shared animals.mjs export is
 * untouched.
 */
function withViewBox(svgMarkup, viewBox) {
  return svgMarkup.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
}

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
        { svg: bossBadgeIcon('boss badge') },
        { svg: ballIcon('ball') },
        { svg: withViewBox(bird('branch', { label: 'bird on a branch' }), '-0.80 21.38 201.60 139.24') },
        { svg: appleIcon('apple') },
      ],
    })}
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
