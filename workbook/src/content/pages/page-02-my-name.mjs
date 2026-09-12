import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { handwritingLine } from '../../components/tracing.mjs';
import { inlineSvgFile } from '../asset-inline.mjs';
import { svgWrap } from '../../illustrations/svg-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_LOCKED = path.join(WORKBOOK, 'design-source/boss-kennedi/locked-poses');

// Character-lock slice asset (see docs/art/asset-provenance.md). Waving
// reads as "hi, I'm Kennedi" -- the natural gesture for a name-introduction
// page, distinct from the clipboard/boss framing used on pages 3/6.
const kennediWaving = inlineSvgFile(path.join(KENNEDI_LOCKED, '03-waving.svg'));

/**
 * A large fill-only hollow "ring" outline for the word "Kennedi" -- the
 * word-level adaptation of page-05-letter-b.mjs's letterRing() fix (see that
 * file's top-of-file comment for the full root-cause writeup: Chromium's
 * stroke-based text rendering -- SVG stroke-dasharray, plain stroke,
 * -webkit-text-stroke, paint-order:stroke, all tested -- exposes a genuine
 * redundant/overlapping contour baked into Baloo 2 weight-800's glyph
 * outlines, invisible at small scale, gone completely when the glyph is
 * drawn with `fill` instead of any stroke technique). The shared
 * tracingWord() component (src/components/tracing.mjs, used by this page and
 * page 6) still uses stroke-dasharray, so it carries the same latent defect
 * everywhere -- confirmed here specifically: capital K rendered via
 * tracingWord('Kennedi', { height: 220 }) at this page's 5.5in width is a
 * tangled, self-intersecting loop, not a traceable letter. tracingWord()
 * itself is left untouched by this fix -- page 6's `tracingWord('help', ...)`
 * renders clean at its much smaller scale, and changing the shared component
 * risks regressing it. Page 5 is also untouched.
 *
 * Fix, first attempt (rejected -- kept here because the reason it failed is
 * the whole reason the surviving technique looks the way it does): letterRing
 * builds its ring from exactly TWO filled copies of one letter -- a full-size
 * black one plus a smaller white one, re-anchored to the glyph's own true ink
 * center via one hand-measured (dx,dy). Porting that directly (one shrunk +
 * re-centered copy of the whole "Kennedi" string) was tried first and
 * verified by rendering: the ink-bbox center of the two copies matched (via
 * SVG getBBox AND a Python/PIL pixel-bbox scan, both to within ~1 unit of a
 * 220-tall box), but the actual PRINTED ring was visibly uneven -- thick and
 * clean around the middle letters (e/n/n), but thin-to-collapsed on the K and
 * the final i. Cause: shrinking an entire multi-glyph string around ONE
 * shared anchor is a single scale transform for the whole word, so a glyph
 * far from that anchor (K at the far left, i at the far right of a 7-letter,
 * ~4.6:1-aspect string) gets displaced by the scale far more than a glyph
 * near the anchor -- matching the *overall* bounding-box center is not
 * enough to keep every individual letter's ring concentric. letterRing never
 * hits this because a single letter's own bounding box IS its anchor
 * neighborhood. That distance-from-anchor growth is exactly what breaks for
 * a word and does not for one letter.
 *
 * Fix, as shipped: an N-directional filled "halo". Render the SAME word at
 * the SAME font size `directions` times, each copy translated (not scaled)
 * by a fixed radius `r = fontSize * ringFrac` in one of N evenly-spaced
 * directions around a circle, all in black; then one undisplaced white copy
 * of the word on top at the original anchor. A pure translation shifts every
 * point of a glyph's outline by the exact same (dx,dy) regardless of the
 * glyph's position in the string, so ring thickness is uniform along the
 * whole word by construction -- no per-word measured centering constant
 * needed at all (each offset is an exact trig value; the earlier hand-fitted
 * ink-center dx/dy is gone). Still strictly fill-only (never stroke), so it
 * never touches the buggy code path either. Verified by rendering both
 * ringFrac=0.05 and ringFrac=0.07 at directions=12 and 16 via the same
 * throwaway Playwright script (project root, deleted via `rm` after use,
 * never git-added) and inspecting the PNGs directly: 16 directions showed no
 * visible faceting on any letter's curves at this print scale, and
 * ringFrac=0.07 (~12.6 viewBox units, vs. fontSize 180.4) reads as a bold,
 * even-thickness ring across all 7 letters -- K reads as two clean diagonal
 * strokes meeting a vertical stem (no tangle), the i's dot rings cleanly, and
 * the middle letters are unchanged from the first attempt's already-clean
 * appearance. Re-verified again on the real page-02 preview render.
 *
 * Keeps tracingWord's dashed baseline guide line -- a plain SVG <line>
 * stroke (not text), so it never touches the buggy code path, and dropping
 * it would be an unnecessary visual change beyond what fixing the glyph
 * rendering requires.
 */
function wordRing(word, opts = {}) {
  const { height = 150, ringFrac = 0.07, directions = 16 } = opts;

  // Same proportions tracingWord uses, so this drops into the same
  // width-in/aspect-ratio-out sizing pattern page authors already use.
  const fontSize = height * 0.82;
  const approxCharWidth = fontSize * 0.66;
  const vbWidth = Math.round(word.length * approxCharWidth + fontSize * 0.9);
  const anchorX = vbWidth / 2;
  const anchorY = height * 0.72;
  const r = fontSize * ringFrac;

  const glyphText = (x, y, fill) =>
    `<text x="${x}" y="${y}" text-anchor="middle" style="line-height:1;"
      font-family="'Baloo 2', sans-serif" font-weight="800" font-size="${fontSize}" fill="${fill}">${word}</text>`;

  let halo = '';
  for (let i = 0; i < directions; i++) {
    const theta = (2 * Math.PI * i) / directions;
    const ox = (anchorX + r * Math.cos(theta)).toFixed(2);
    const oy = (anchorY + r * Math.sin(theta)).toFixed(2);
    halo += glyphText(ox, oy, '#000');
  }

  const inner = `
    <line x1="4" y1="${height - 10}" x2="${vbWidth - 4}" y2="${height - 10}" stroke="#000" stroke-width="3" stroke-dasharray="3 10" />
    ${halo}
    ${glyphText(anchorX, anchorY, '#fff')}
  `;
  return `<div class="tracing-word" style="aspect-ratio:${vbWidth}/${height};">${svgWrap(`0 0 ${vbWidth} ${height}`, inner, { label: `trace the word ${word}` })}</div>`;
}

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
    <div style="width:5.5in; margin:0 auto;">${wordRing('Kennedi', { height: 220 })}</div>
    ${handwritingLine({ rows: 2 })}
    <div class="col" style="gap:0.08in;">
      <div class="row" style="justify-content:center; gap:var(--space-4);">
        <div role="img" aria-label="Kennedi waving hello" style="width:1.42in;">${kennediWaving}</div>
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
