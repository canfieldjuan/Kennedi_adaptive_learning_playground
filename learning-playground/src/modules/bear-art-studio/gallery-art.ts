/**
 * Gallery mini-card art — renders a GalleryPiece descriptor as a tiny
 * framed card for the studio's gallery shelf. Pieces re-render from their
 * descriptors (no screenshots, no image files); the palette map is the
 * closed set of studio color ids with a neutral fallback.
 */

import type { GalleryPiece } from '../../core/art-gallery';
import {
  isStudioShapeId,
  studioShapeSvg,
  STUDIO_SHAPE_DEFAULT_FILLS,
} from './studio-art';

const INK = '#3a2461';
const PAPER = '#fbf8f1';

const PALETTE_HEX: Record<string, string> = {
  'berry-pink': '#fd79a8',
  'sunny-yellow': '#fdcb6e',
  'tangerine-orange': '#f0932b',
  'sky-blue': '#74b9ff',
  'leaf-green': '#00b894',
  'tomato-red': '#e05d5d',
};

function colorHex(colorId: string | undefined): string {
  return (colorId && PALETTE_HEX[colorId]) ?? PAPER;
}

function miniSticker(shapeId: string, x: number, y: number, size: number): string {
  if (!isStudioShapeId(shapeId)) return '';
  const body = studioShapeSvg(shapeId, STUDIO_SHAPE_DEFAULT_FILLS[shapeId])
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');
  const scale = size / 100;
  return `<g transform="translate(${x} ${y}) scale(${scale})">${body}</g>`;
}

/** One finished piece as a tiny framed card (viewBox 100x76). */
export function galleryMiniSvg(piece: GalleryPiece): string {
  const cardFill = piece.kind === 'stickers' && piece.color_ids.length > 0
    ? colorHex(piece.color_ids[0])
    : PAPER;

  let content = '';
  switch (piece.kind) {
    case 'painted_subject': {
      const shape = piece.surface_id.replace(/-card$/, '');
      content = miniSticker(shape, 26, 14, 48) ||
        `<circle cx="50" cy="38" r="20" fill="${colorHex(piece.color_ids[0])}" stroke="${INK}" stroke-width="3"/>`;
      if (isStudioShapeId(shape)) {
        content = `<g>${studioShapeSvg(shape, colorHex(piece.color_ids[0]))
          .replace(/^<svg[^>]*>/, '')
          .replace(/<\/svg>$/, '')
          .replace(/stroke-width="5"/g, 'stroke-width="6"')}</g>`;
        content = `<g transform="translate(26 14) scale(0.48)">${content}</g>`;
      }
      break;
    }
    case 'pattern': {
      const stripes = piece.color_ids.slice(0, 6);
      content = stripes
        .map((id, index) => `<rect x="${12 + index * 13}" y="22" width="11" height="32" rx="2" fill="${colorHex(id)}" stroke="${INK}" stroke-width="1.6"/>`)
        .join('');
      break;
    }
    default: {
      const stickers = piece.sticker_ids.slice(0, 4);
      const positions: Array<[number, number]> = stickers.length <= 2
        ? [[22, 22], [52, 22]]
        : [[14, 10], [54, 10], [14, 42], [54, 42]];
      const size = stickers.length <= 2 ? 30 : 26;
      content = stickers
        .map((id, index) => {
          const [x, y] = positions[index] ?? [38, 24];
          return miniSticker(id, x, y, size);
        })
        .join('');
      break;
    }
  }

  return `<svg class="bear-art-studio__mini-svg" viewBox="0 0 100 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect x="3" y="3" width="94" height="70" rx="8" fill="${cardFill}" stroke="${INK}" stroke-width="4"/>
    ${content}
  </svg>`;
}
