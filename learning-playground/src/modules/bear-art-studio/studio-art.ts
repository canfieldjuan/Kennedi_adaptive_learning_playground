/**
 * Bear Art Studio art — the sticker and subject shapes the child works with,
 * as local inline SVG in the illustrated standard (ink #3a2461, warm flat
 * fills). Every shape accepts an override fill so the same star can be a
 * gold sticker, a paintable subject, or a wrongly-painted region to fix.
 * No <text>, no emoji, no external assets.
 */

const INK = '#3a2461';

export type StudioShapeId = 'star' | 'heart' | 'flower' | 'sun' | 'bubble' | 'moon';

/** Natural sticker fills, used when no paint color is applied. */
export const STUDIO_SHAPE_DEFAULT_FILLS: Record<StudioShapeId, string> = {
  star: '#f6c343',
  heart: '#f6a5c0',
  flower: '#e78fb3',
  sun: '#f6c343',
  bubble: '#a8d8f0',
  moon: '#f0e6c8',
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
    case 'moon':
      return `<path d="M64 10 a40 40 0 1 0 24 66 a34 34 0 0 1 -24 -66 Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
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
    ['star', 'heart', 'flower', 'sun', 'bubble', 'moon'].includes(value);
}

/**
 * The dress-up surface: Baby Polar Bear's shirt, paintable via the main
 * body fill. Rendered behind the decoration slots in free-decorate's
 * shirt variant.
 */
export function shirtSurfaceSvg(fill: string): string {
  return `<svg class="studio-shirt-svg" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
    <path d="M66 14 L28 34 L10 74 L40 88 L46 70 L46 146 a8 8 0 0 0 8 8 h92 a8 8 0 0 0 8 -8 V70 l6 18 L190 74 L172 34 L134 14 a34 20 0 0 1 -68 0 Z" fill="${fill}" stroke="#3a2461" stroke-width="6" stroke-linejoin="round"/>
    <path d="M66 14 a34 20 0 0 0 68 0" fill="none" stroke="#3a2461" stroke-width="5"/>
  </svg>`;
}

/**
 * The performing surface: a stage poster with a curtain header and a blank
 * banner (never letters). The poster body takes the paint fill.
 */
export function posterSurfaceSvg(fill: string): string {
  return `<svg class="studio-poster-svg" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
    <rect x="6" y="6" width="148" height="188" rx="10" fill="${fill}" stroke="#3a2461" stroke-width="6"/>
    <path d="M6 12 q37 26 74 0 q37 26 74 0 v-2 a10 10 0 0 0 -10 -10 h-128 a10 10 0 0 0 -10 10 Z" fill="#e05d5d" stroke="#3a2461" stroke-width="5" stroke-linejoin="round"/>
    <rect x="30" y="158" width="100" height="22" rx="8" fill="#fdf3d0" stroke="#3a2461" stroke-width="4"/>
  </svg>`;
}

/**
 * The bear-house wall surface: a landscape canvas in a wood frame. The
 * canvas inside the frame takes the paint fill.
 */
export function wallFrameSurfaceSvg(fill: string): string {
  return `<svg class="studio-wall-frame-svg" viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
    <rect x="4" y="14" width="212" height="132" rx="12" fill="#c9a06b" stroke="#3a2461" stroke-width="6"/>
    <rect x="22" y="32" width="176" height="96" rx="6" fill="${fill}" stroke="#3a2461" stroke-width="4"/>
    <circle cx="110" cy="10" r="6" fill="#b98a52" stroke="#3a2461" stroke-width="3"/>
  </svg>`;
}

/** All shapes on one sheet, for render checks only. */
export const STUDIO_ART_SHEET_SVG = `<svg viewBox="0 0 680 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="680" height="120" fill="#f4efe6"/>
  ${(['star', 'heart', 'flower', 'sun', 'bubble', 'moon'] as StudioShapeId[])
    .map((shape, index) => `<g transform="translate(${16 + index * 110}, 10)">${shapeBody(shape, STUDIO_SHAPE_DEFAULT_FILLS[shape])}</g>`)
    .join('\n  ')}
</svg>`;
