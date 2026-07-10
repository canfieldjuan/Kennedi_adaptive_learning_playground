/**
 * Home card icons — the four child choices as local inline SVG in the arc
 * standard (ink #3a2461, warm flat fills), replacing the emoji icons of the
 * old dark system (visual arc stage 6, issue #55). The cafe phone and train
 * engine reuse the games' own art so the card previews what the child will
 * actually see inside; the book and palette are drawn here in the same style.
 */

import { cafePhoneSvg } from '../kennedis-orders/cafe-environment';
import { trainEngineSvg } from '../number-train/train-art';

const INK = '#3a2461';

function bookSvg(): string {
  return `<svg class="home-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M50 26 q-14 -10 -32 -6 v54 q18 -4 32 6 Z" fill="#f6a5c0" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M50 26 q14 -10 32 -6 v54 q-18 -4 -32 6 Z" fill="#fdf3d0" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <line x1="50" y1="26" x2="50" y2="80" stroke="${INK}" stroke-width="4"/>
      <path d="M28 38 q10 -2 16 1 M28 50 q10 -2 16 1 M56 39 q10 -3 16 -1 M56 51 q10 -3 16 -1" fill="none" stroke="rgba(58, 36, 97, 0.35)" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
}

function paletteSvg(): string {
  return `<svg class="home-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M50 18 q34 0 34 30 q0 14 -12 14 h-10 q-8 0 -8 8 q0 12 -10 12 q-28 0 -28 -32 q0 -32 34 -32 Z" fill="#fdf3d0" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="36" cy="38" r="6" fill="#f6c343" stroke="${INK}" stroke-width="3"/>
      <circle cx="58" cy="34" r="6" fill="#74b9ff" stroke="${INK}" stroke-width="3"/>
      <circle cx="30" cy="58" r="6" fill="#00b894" stroke="${INK}" stroke-width="3"/>
      <circle cx="52" cy="56" r="6" fill="#f6a5c0" stroke="${INK}" stroke-width="3"/>
    </svg>`;
}

/** Icon markup per home card id; each is a self-contained inline SVG. */
export const HOME_CARD_ICONS: Record<string, string> = {
  'home-words': bookSvg(),
  'home-cafe': cafePhoneSvg(),
  'home-math': trainEngineSvg(),
  'home-art': paletteSvg(),
};
