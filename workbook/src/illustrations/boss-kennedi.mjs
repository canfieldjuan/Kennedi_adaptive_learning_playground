/**
 * Boss Kennedi: the one recurring character. viewBox "0 0 200 240".
 * Built from shared head/hair/body/legs parts so every pose stays
 * recognizable (same silhouette, same badge, same puffs) even though
 * the arms/props change per scene.
 *
 * Poses:
 *  - 'hero'      standing tall, clipboard in one arm, pencil raised
 *  - 'wave'      waving hello, other hand pointing at her name badge
 *  - 'help'      leaning down, one arm reaching toward the ground
 *  - 'walkAway'  back turned, walking off (no face)
 */
import { svgWrap, starPolygon } from './svg-utils.mjs';

const S = 'stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const SF_WHITE = 'stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="#fff"';
const SF_BLACK = 'stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="#000"';

function hair() {
  return `
    <circle cx="60" cy="58" r="22" ${SF_BLACK} />
    <circle cx="140" cy="58" r="22" ${SF_BLACK} />
  `;
}

function head({ face = true } = {}) {
  const eyes = face
    ? `<circle cx="88" cy="70" r="4.5" fill="#000" />
       <circle cx="112" cy="70" r="4.5" fill="#000" />
       <path d="M86 86 Q100 96 114 86" ${S} stroke-width="5" />`
    : '';
  return `
    <circle cx="100" cy="72" r="40" ${SF_WHITE} />
    ${eyes}
  `;
}

function badge() {
  return starPolygon(100, 150, 12, 5, `stroke="#000" stroke-width="4" stroke-linejoin="round" fill="#fff"`) +
    `<circle cx="100" cy="150" r="15" stroke="#000" stroke-width="4" fill="none" />`;
}

function body() {
  return `
    <path d="M70 128 C 70 118, 130 118, 130 128 L 140 210 C 140 222, 60 222, 60 210 Z" ${SF_WHITE} />
    ${badge()}
    <path d="M78 210 L74 234 L92 234 L94 210" ${SF_WHITE} />
    <path d="M122 210 L126 234 L108 234 L106 210" ${SF_WHITE} />
    <rect x="70" y="230" width="24" height="10" rx="4" ${SF_BLACK} />
    <rect x="106" y="230" width="24" height="10" rx="4" ${SF_BLACK} />
  `;
}

function clipboardProp(x, y, rotate = -8) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate})">
      <rect x="0" y="0" width="46" height="58" rx="6" ${SF_WHITE} />
      <rect x="12" y="-7" width="22" height="12" rx="4" ${SF_WHITE} />
      <line x1="10" y1="22" x2="36" y2="22" stroke="#000" stroke-width="4" />
      <line x1="10" y1="34" x2="36" y2="34" stroke="#000" stroke-width="4" />
      <path d="M10 45 L18 51 L36 38" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  `;
}

function pencilProp(x, y, rotate = -40, scale = 1) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
      <path d="M0 0 L46 0 L58 11 L12 22 Z" ${SF_WHITE} stroke-width="5" />
      <rect x="45" y="-3" width="14" height="17" rx="3" transform="rotate(13 52 5.5)" ${SF_WHITE} stroke-width="4" />
      <path d="M0 0 L-11 -3 L-9 9 Z" ${SF_BLACK} stroke-width="5" />
    </g>
  `;
}

function armsHero() {
  return `
    <path d="M72 132 C 48 140, 40 168, 46 190" ${SF_WHITE} />
    <path d="M130 130 C 156 116, 168 84, 168 54" ${SF_WHITE} />
    <circle cx="168" cy="50" r="11" ${SF_WHITE} />
    ${clipboardProp(30, 176, -10)}
    ${pencilProp(168, 50, -50, 1.25)}
  `;
}

function armsWave() {
  return `
    <path d="M70 134 C 50 150, 46 172, 54 190" ${SF_WHITE} />
    <path d="M130 134 C 152 118, 160 92, 150 68" ${SF_WHITE} />
    <circle cx="150" cy="66" r="13" ${SF_WHITE} />
    <circle cx="100" cy="150" r="18" fill="none" stroke="#000" stroke-width="3" stroke-dasharray="4 4" />
  `;
}

function armsHelp() {
  return `
    <path d="M74 136 C 50 150, 34 168, 26 192" ${SF_WHITE} />
    <circle cx="24" cy="196" r="12" ${SF_WHITE} />
    <path d="M126 136 C 146 142, 156 156, 154 172" ${SF_WHITE} />
    <circle cx="154" cy="176" r="12" ${SF_WHITE} />
  `;
}

function legsBend() {
  return `
    <path d="M78 210 L70 232 L88 232 L92 212" ${SF_WHITE} />
    <path d="M122 210 L130 232 L112 232 L108 212" ${SF_WHITE} />
    <rect x="66" y="228" width="24" height="10" rx="4" ${SF_BLACK} />
    <rect x="106" y="228" width="24" height="10" rx="4" ${SF_BLACK} />
  `;
}

function walkAwayFigure() {
  return `
    <g transform="rotate(4 100 130)">
      <circle cx="60" cy="58" r="20" ${SF_BLACK} />
      <circle cx="140" cy="58" r="20" ${SF_BLACK} />
      <circle cx="100" cy="70" r="38" ${SF_WHITE} />
      <path d="M70 126 C 70 116, 130 116, 130 126 L 138 206 C 138 218, 62 218, 62 206 Z" ${SF_WHITE} />
      <path d="M78 206 L74 230 L92 230 L94 206" ${SF_WHITE} />
      <path d="M122 206 L126 230 L108 230 L106 206" ${SF_WHITE} />
      <rect x="70" y="226" width="24" height="10" rx="4" ${SF_BLACK} />
      <rect x="106" y="226" width="24" height="10" rx="4" ${SF_BLACK} />
      <path d="M72 130 C 54 140, 48 160, 54 176" ${SF_WHITE} />
      <path d="M128 130 C 146 140, 152 160, 146 176" ${SF_WHITE} />
    </g>
  `;
}

/**
 * @param {'hero'|'wave'|'help'|'walkAway'} pose
 * @param {{ crown?: boolean, label?: string }} opts
 */
export function bossKennedi(pose = 'hero', opts = {}) {
  const { crown = false, label = 'Boss Kennedi' } = opts;
  if (pose === 'walkAway') {
    return svgWrap('-15 -15 230 270', walkAwayFigure(), { label: 'Boss Kennedi walking away' });
  }

  const armSets = { hero: armsHero, wave: armsWave, help: armsHelp };
  const legs = pose === 'help' ? legsBend : legsBend;
  const crownMark = crown
    ? `<path d="M78 34 L78 18 L90 28 L100 12 L110 28 L122 18 L122 34 Z" ${SF_WHITE} stroke-width="5" />`
    : '';

  const inner = `
    ${hair()}
    ${head({ face: true })}
    ${crownMark}
    ${body()}
    ${armSets[pose] ? armSets[pose]() : armsHero()}
    ${legs()}
  `;
  return svgWrap('-15 -15 230 270', inner, { label });
}
