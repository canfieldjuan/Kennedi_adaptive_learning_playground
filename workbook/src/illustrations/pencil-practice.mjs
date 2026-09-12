/**
 * Pencil-control practice rows and tracing paths, generated deterministically
 * (no raster art). Each row is viewBox "0 0 640 100": one solid demonstration
 * cell followed by dashed cells the child traces. This is the standard
 * preschool OT pattern (show once, repeat-trace), distinct from word tracing
 * which intentionally avoids repetition.
 */
import { svgWrap, starPolygon } from './svg-utils.mjs';

const WIDTH = 640;
const HEIGHT = 100;

function cellPath(kind, x0, x1, midY) {
  const w = x1 - x0;
  switch (kind) {
    case 'horizontal':
      return `M${x0 + 6} ${midY} H${x1 - 6}`;
    case 'vertical':
      return `M${x0 + w / 2} ${midY - 34} V${midY + 34}`;
    case 'wave':
      return `M${x0 + 6} ${midY} C ${x0 + w * 0.25} ${midY - 34}, ${x0 + w * 0.25} ${midY - 34}, ${x0 + w * 0.5} ${midY} C ${x0 + w * 0.75} ${midY + 34}, ${x0 + w * 0.75} ${midY + 34}, ${x1 - 6} ${midY}`;
    case 'zigzag':
      return `M${x0 + 6} ${midY + 30} L${x0 + w * 0.3} ${midY - 30} L${x0 + w * 0.6} ${midY + 30} L${x1 - 6} ${midY - 30}`;
    case 'loop':
      return `M${x0 + 6} ${midY + 20} C ${x0 + 6} ${midY - 40}, ${x0 + w * 0.85} ${midY - 40}, ${x0 + w * 0.85} ${midY} C ${x0 + w * 0.85} ${midY + 30}, ${x0 + w * 0.4} ${midY + 30}, ${x0 + w * 0.55} ${midY - 4} L${x1 - 6} ${midY - 22}`;
    default:
      return `M${x0 + 6} ${midY} H${x1 - 6}`;
  }
}

/** The literal first coordinate of cellPath's "M" command per kind -- kept in
 * sync with cellPath above so an opt-in start-star (see `startMark` on
 * practiceRow) lands exactly on the path's true start, not an approximation. */
function cellStart(kind, x0, w, midY) {
  switch (kind) {
    case 'vertical':
      return [x0 + w / 2, midY - 34];
    case 'zigzag':
      return [x0 + 6, midY + 30];
    case 'loop':
      return [x0 + 6, midY + 20];
    case 'horizontal':
    case 'wave':
    default:
      return [x0 + 6, midY];
  }
}

/**
 * @param {'horizontal'|'vertical'|'wave'|'zigzag'|'loop'} kind
 * @param {object} [opts]
 * @param {number} [opts.reps]
 * @param {string} [opts.label]
 * @param {boolean} [opts.startMark] - opt-in: draw a small star (via
 *   starPolygon) at the literal start point of the first (solid, demo)
 *   cell, replacing the plain "where do I begin" guesswork with an explicit
 *   marker -- e.g. for a page whose instruction is "Start at the star."
 *   Omit (default false) to keep the original plain-start behavior for
 *   existing/future callers that don't need it.
 * @param {string} [opts.className] - overrides the wrapping <svg>'s class
 *   (default 'illo'). Pass e.g. 'illo grow' so the row can be dropped
 *   directly into a flex `.row` as the flexible middle element between two
 *   fixed-width start/end icons.
 */
export function practiceRow(kind, opts = {}) {
  const { reps = 5, label = `${kind} pencil practice row`, startMark = false, className } = opts;
  const midY = HEIGHT / 2;
  const cellW = WIDTH / reps;
  let cells = '';
  for (let i = 0; i < reps; i++) {
    const x0 = i * cellW;
    const x1 = x0 + cellW;
    const d = cellPath(kind, x0, x1, midY);
    if (i === 0) {
      cells += `<path d="${d}" stroke="#000" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
      if (startMark) {
        const [sx, sy] = cellStart(kind, x0, cellW, midY);
        cells += starPolygon(sx, sy, 13, 5.5, 'stroke="#000" stroke-width="5" stroke-linejoin="round" fill="#fff"');
      }
    } else {
      cells += `<path d="${d}" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 10" opacity="0.85" />`;
    }
  }
  const wrapOpts = { label };
  if (className) wrapOpts.className = className;
  return svgWrap(`0 0 ${WIDTH} ${HEIGHT}`, cells, wrapOpts);
}

/**
 * A gentle dashed curve from a start point to an end point -- a single open
 * path, not a maze. Originally built for the pre-redesign page 4's
 * "Kennedi to clipboard" bonus row; that page now expresses every
 * start-to-destination pair as a practiceRow({startMark:true}) instead (see
 * page-04-pencil-adventure.mjs), so nothing currently calls this, but it's
 * left in place as a general-purpose export for a future page that wants
 * one free-form curved path rather than the repeating-cell practiceRow
 * pattern.
 */
export function curvedTracingPath(opts = {}) {
  const { label = 'dotted path from Kennedi to her clipboard' } = opts;
  const d = 'M40 150 C 160 40, 320 260, 460 110 C 540 30, 600 60, 600 150';
  const inner = `
    <path d="${d}" stroke="#000" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="2 22" />
    <circle cx="40" cy="150" r="10" fill="#000" />
    <path d="M585 130 L610 150 L585 172" stroke="#000" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  `;
  return svgWrap('0 0 640 260', inner, { label });
}
