/**
 * Bear Art Studio art — the sticker and subject shapes the child works with,
 * as local inline SVG in the illustrated standard (ink #3a2461, warm flat
 * fills). Every shape accepts an override fill so the same star can be a
 * gold sticker, a paintable subject, or a wrongly-painted region to fix.
 * No <text>, no emoji, no external assets.
 */

const INK = '#3a2461';

export type StudioShapeId = 'star' | 'heart' | 'flower' | 'sun' | 'bubble';

/** Natural sticker fills, used when no paint color is applied. */
export const STUDIO_SHAPE_DEFAULT_FILLS: Record<StudioShapeId, string> = {
  star: '#f6c343',
  heart: '#f6a5c0',
  flower: '#e78fb3',
  sun: '#f6c343',
  bubble: '#a8d8f0',
};

function shapeBody(shape: StudioShapeId, fill: string): string {
  switch (shape) {
    case 'star':
      return `<path d="M50 8 l12 27 l30 3 l-22 20 l6 30 l-26 -15 l-26 15 l6 -30 l-22 -20 l30 -3 Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    case 'heart':
      return `<path d="M50 86 q-36 -26 -36 -48 q0 -18 18 -18 q12 0 18 11 q6 -11 18 -11 q18 0 18 18 q0 22 -36 48 Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    case 'flower':
      return `<g stroke="${INK}" stroke-width="4">
        <circle cx="50" cy="26" r="15" fill="${fill}"/>
        <circle cx="74" cy="44" r="15" fill="${fill}"/>
        <circle cx="65" cy="72" r="15" fill="${fill}"/>
        <circle cx="35" cy="72" r="15" fill="${fill}"/>
        <circle cx="26" cy="44" r="15" fill="${fill}"/>
        <circle cx="50" cy="50" r="13" fill="#fdf3d0"/>
      </g>`;
    case 'sun':
      return `<g stroke="${INK}" stroke-width="4" stroke-linecap="round">
        <line x1="50" y1="4" x2="50" y2="18"/><line x1="50" y1="82" x2="50" y2="96"/>
        <line x1="4" y1="50" x2="18" y2="50"/><line x1="82" y1="50" x2="96" y2="50"/>
        <line x1="18" y1="18" x2="28" y2="28"/><line x1="72" y1="72" x2="82" y2="82"/>
        <line x1="82" y1="18" x2="72" y2="28"/><line x1="28" y1="72" x2="18" y2="82"/>
        <circle cx="50" cy="50" r="26" fill="${fill}" stroke-width="5"/>
      </g>`;
    case 'bubble':
      return `<g>
        <circle cx="50" cy="50" r="38" fill="${fill}" opacity="0.85" stroke="${INK}" stroke-width="5"/>
        <path d="M30 38 q6 -12 20 -14" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
      </g>`;
  }
}

/**
 * One studio shape as a self-contained SVG. `fill` overrides the natural
 * sticker color (paint modes); omit it for the sticker's own color.
 */
export function studioShapeSvg(shape: StudioShapeId, fill?: string): string {
  const body = shapeBody(shape, fill ?? STUDIO_SHAPE_DEFAULT_FILLS[shape]);
  return `<svg class="studio-shape-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function isStudioShapeId(value: unknown): value is StudioShapeId {
  return typeof value === 'string' &&
    ['star', 'heart', 'flower', 'sun', 'bubble'].includes(value);
}

/** All shapes on one sheet, for render checks only. */
export const STUDIO_ART_SHEET_SVG = `<svg viewBox="0 0 560 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="560" height="120" fill="#f4efe6"/>
  ${(['star', 'heart', 'flower', 'sun', 'bubble'] as StudioShapeId[])
    .map((shape, index) => `<g transform="translate(${16 + index * 110}, 10)">${shapeBody(shape, STUDIO_SHAPE_DEFAULT_FILLS[shape])}</g>`)
    .join('\n  ')}
</svg>`;
