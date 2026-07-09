/**
 * Illustrated Bear Cafe characters — local, inline SVG (no external assets, no
 * network), keeping the safety boundary. First slice of the illustrated art
 * standard (issue #3): one friendly bear with the three reaction expressions
 * (waiting / receiving / happy), tinted per caller. The SVG face expresses the
 * reaction, replacing the emoji glyph + emoji reaction accent.
 */

export type BearFace = 'waiting' | 'receiving' | 'happy';

interface BearPalette {
  fur: string;
  furStroke: string;
  innerEar: string;
  muzzle: string;
  cheek: string;
}

const INK = '#3a2461';

const BEAR_PALETTES: Record<string, BearPalette> = {
  'baby-polar-bear': {
    fur: '#ffffff',
    furStroke: '#b9c6d6',
    innerEar: '#f8cfe0',
    muzzle: '#eef3f9',
    cheek: '#f9c2d5',
  },
  'daddy-bear': {
    fur: '#b47c4f',
    furStroke: '#8a5c35',
    innerEar: '#e7b49a',
    muzzle: '#e9cca7',
    cheek: '#e59a86',
  },
  'mama-bear': {
    fur: '#c99d6d',
    furStroke: '#9c7546',
    innerEar: '#f4c8d8',
    muzzle: '#f2ddc2',
    cheek: '#f0a6bd',
  },
};

const DEFAULT_PALETTE = BEAR_PALETTES['daddy-bear'];

function faceFeatures(face: BearFace): string {
  switch (face) {
    case 'happy':
      // Upturned happy eyes + a wide open smile.
      return `
        <path d="M33 47 q6 -7 12 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M55 47 q6 -7 12 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M40 66 q10 13 20 0" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
      `;
    case 'receiving':
      // Wide, bright eyes + a small open "oh!" mouth.
      return `
        <circle cx="39" cy="47" r="5.4" fill="${INK}"/>
        <circle cx="61" cy="47" r="5.4" fill="${INK}"/>
        <circle cx="40.8" cy="45.2" r="1.7" fill="#ffffff"/>
        <circle cx="62.8" cy="45.2" r="1.7" fill="#ffffff"/>
        <ellipse cx="50" cy="69" rx="4.6" ry="5.6" fill="${INK}"/>
      `;
    case 'waiting':
    default:
      // Calm round eyes + a small gentle smile.
      return `
        <circle cx="39" cy="47" r="3.9" fill="${INK}"/>
        <circle cx="61" cy="47" r="3.9" fill="${INK}"/>
        <path d="M43 68 q7 5 14 0" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
      `;
  }
}

export function renderBearArt(characterId: string, face: BearFace): string {
  const p = BEAR_PALETTES[characterId] ?? DEFAULT_PALETTE;
  return `<svg class="bear-art" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <g stroke="${p.furStroke}" stroke-width="2.5" stroke-linejoin="round">
        <circle cx="27" cy="27" r="13" fill="${p.fur}"/>
        <circle cx="73" cy="27" r="13" fill="${p.fur}"/>
        <circle cx="50" cy="56" r="34" fill="${p.fur}"/>
      </g>
      <circle cx="27" cy="27" r="6.6" fill="${p.innerEar}"/>
      <circle cx="73" cy="27" r="6.6" fill="${p.innerEar}"/>
      <ellipse cx="30" cy="66" rx="6.2" ry="4.6" fill="${p.cheek}"/>
      <ellipse cx="70" cy="66" rx="6.2" ry="4.6" fill="${p.cheek}"/>
      <ellipse cx="50" cy="65" rx="19" ry="14.5" fill="${p.muzzle}"/>
      <ellipse cx="50" cy="57" rx="6.4" ry="4.8" fill="${INK}"/>
      ${faceFeatures(face)}
    </svg>`;
}
