import { svgWrap } from '../illustrations/svg-utils.mjs';

/**
 * A large hollow-ring tracing target for one word or letter, rendered as
 * real text (deterministic, not raster) so it always matches the system
 * font. Approximate glyph width keeps the viewBox from stretching the
 * letterforms.
 *
 * NOT a stroked/dashed outline -- that was the original technique here, and
 * it has a real bug: Chromium's stroke-based text rendering (SVG
 * stroke-dasharray, plain stroke, -webkit-text-stroke, and paint-order:stroke
 * were all tested) exposes a genuine redundant/overlapping contour baked
 * into Baloo 2 weight-800's outlines for several letters (confirmed: B, b,
 * K, e, p), which shows up as a tangled, self-intersecting mess instead of a
 * clean traceable line. It's easy to miss at a glance -- small enough at
 * some sizes to read as "probably fine" -- but it's real: it shipped once on
 * page 2's "Kennedi" (the K) and once more on page 6's "help" (the e and p),
 * both caught only by zooming into the actual rendered output, not by
 * reading the source or a quick look at the full page. Confirmed gone
 * completely when the glyph is drawn with `fill` instead of any stroke
 * technique -- so this renders a ring from two DIFFERENT fill techniques
 * layered together, never stroke:
 *
 * 1. An outer "halo": the SAME word/letter, at the SAME font size, drawn
 *    `directions` times in black, each copy pure-TRANSLATED (never scaled)
 *    by a fixed radius in one of N evenly-spaced directions around a circle.
 * 2. One more copy on top, undisplaced, in white.
 *
 * A pure translation shifts every point of a glyph's outline by the exact
 * same (dx, dy) no matter where that point sits -- unlike scaling a copy
 * down around one shared anchor (the first technique tried here, before
 * this comment), which visibly thins or collapses the ring on whichever
 * letter sits farthest from that anchor in a multi-letter word, and (found
 * later, on a single huge letter) still leaves a faint stray line inside the
 * glyph if the two copies' true ink-centers aren't measured and offset
 * exactly right. Pure translation needs no per-word or per-letter
 * measurement at all -- ring thickness comes out uniform by construction,
 * for a single letter or a seven-letter word, at any size. `ringFrac` sets
 * that ring's thickness as a fraction of font-size; `directions` is how many
 * copies form the halo (16 shows no visible faceting on any letter's curves
 * at print scale).
 *
 * ringFrac has a real ceiling, not just a look-and-feel dial: dilation grows
 * ink inward at a counter (an enclosed hole, like the two loops in "B" or
 * the one in "b"/"e"/"p") the exact same way it grows ink outward at the
 * glyph's silhouette. Push the radius `fontSize * ringFrac` past roughly
 * half a counter's narrowest neck and the halo bridges across it -- not
 * erasing the counter outright, but splitting it with a spurious stray line
 * (confirmed with an objective pixel cross-section, not just a look: a
 * clean counter shows exactly 2 dark runs across it; a bridged one shows
 * 3+). 0.07 does this on "B"/"b" specifically -- their counters pinch
 * narrower than any other letter this component draws. Verified via the
 * real render pipeline at several values: 0.05 is clean on every letter
 * tested (including B/b), with no perceptible thinning on multi-letter
 * words like "Kennedi" or "help" where the bridging risk doesn't arise
 * (their counters are wider relative to fontSize). Re-verify with the same
 * cross-section technique before raising this default again.
 */
export function tracingWord(word, opts = {}) {
  const { height = 150, ringFrac = 0.05, directions = 16 } = opts;
  const fontSize = height * 0.82;
  const approxCharWidth = fontSize * 0.66;
  const vbWidth = Math.round(word.length * approxCharWidth + fontSize * 0.9);
  const anchorX = vbWidth / 2;
  const anchorY = height * 0.72;
  const r = fontSize * ringFrac;

  // line-height:1 (not the UA default "normal") on the SVG <text> -- this
  // doesn't affect glyph layout (SVG text position is x/y-driven, not
  // line-box flow), but "normal" makes Chromium report the text node's own
  // scrollHeight/clientHeight (measured in local viewBox user-space units)
  // as mismatched, which reads as a false "vertical overflow" in
  // scripts/verify.mjs even though nothing visibly clips.
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
