import { svgWrap } from '../illustrations/svg-utils.mjs';

/**
 * A large dashed-outline tracing target for one word/name, rendered as real
 * text (deterministic, not raster) so it always matches the system font.
 * Approximate glyph width keeps the viewBox from stretching the letterforms.
 */
export function tracingWord(word, opts = {}) {
  const { height = 150 } = opts;
  const fontSize = height * 0.82;
  const approxCharWidth = fontSize * 0.66;
  const vbWidth = Math.round(word.length * approxCharWidth + fontSize * 0.9);
  const baselineY = height * 0.72;
  const inner = `
    <line x1="4" y1="${height - 10}" x2="${vbWidth - 4}" y2="${height - 10}" stroke="#000" stroke-width="3" stroke-dasharray="3 10" />
    <!-- line-height:1 (not the UA default "normal") on the SVG <text> -- this
      doesn't affect glyph layout (SVG text position is x/y-driven, not line-
      box flow), but "normal" makes Chromium report the text node's own
      scrollHeight/clientHeight (measured in local viewBox user-space units)
      as mismatched, which reads as a false "vertical overflow" in
      scripts/verify.mjs even though nothing visibly clips. -->
    <text x="${vbWidth / 2}" y="${baselineY}" text-anchor="middle" style="line-height:1;"
      font-family="'Baloo 2', sans-serif" font-weight="800" font-size="${fontSize}"
      fill="none" stroke="#000" stroke-width="2.6" stroke-dasharray="7 6" stroke-linejoin="round">${word}</text>
  `;
  return `<div class="tracing-word" style="aspect-ratio:${vbWidth}/${height};">${svgWrap(`0 0 ${vbWidth} ${height}`, inner, { label: `trace the word ${word}` })}</div>`;
}

/**
 * One or more "sky-grass-ground" preschool handwriting rows: solid top,
 * dashed midline, solid heavy baseline. Generously tall for a not-yet-4
 * writer, not notebook-ruled ratios.
 *
 * `compact: true` applies `.hw-row-compact` (shorter row, see components.css)
 * for a content-dense page that still needs a real -- just smaller -- write
 * line. `compact: 'xs'` applies `.hw-row-compact-xs` on top (shorter still)
 * for a page with several other sections competing for room on the same
 * sheet. Default sizing for existing callers is unchanged.
 */
export function handwritingLine(opts = {}) {
  const { rows = 1, compact = false } = opts;
  const rowClass =
    compact === 'xs'
      ? 'hw-row hw-row-compact hw-row-compact-xs'
      : compact
      ? 'hw-row hw-row-compact'
      : 'hw-row';
  let out = '';
  for (let i = 0; i < rows; i++) {
    out += `<div class="${rowClass}"><span class="hw-top"></span><span class="hw-mid"></span><span class="hw-base"></span></div>`;
  }
  return `<div class="handwriting-block">${out}</div>`;
}
