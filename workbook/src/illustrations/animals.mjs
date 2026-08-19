/**
 * Friendly animal helpers. Each is viewBox "0 0 200 160", bold outline,
 * white fill. Poses are simple enough to read as small inline art too.
 */
import { svgWrap } from './svg-utils.mjs';

const S = 'stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const SF_WHITE = 'stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#fff"';
const SF_BLACK = 'stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#000"';

function ball(cx, cy, r = 16) {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" ${SF_WHITE} stroke-width="4" />
    <path d="M${cx - r} ${cy} Q${cx} ${cy - r * 0.6} ${cx + r} ${cy} Q${cx} ${cy + r * 0.6} ${cx - r} ${cy}"
      stroke="#000" stroke-width="3" fill="none" />
  `;
}

/**
 * @param {'sit'|'play'|'reach'|'happy'} pose
 */
export function puppy(pose = 'sit', opts = {}) {
  const { label = 'puppy' } = opts;
  const base = `
    <ellipse cx="100" cy="112" rx="46" ry="34" ${SF_WHITE} />
    <circle cx="60" cy="70" r="34" ${SF_WHITE} />
    <path d="M34 46 C 20 40, 16 60, 30 74" ${SF_WHITE} />
    <path d="M86 46 C 100 40, 104 60, 90 74" ${SF_WHITE} />
    <circle cx="50" cy="68" r="4" fill="#000" />
    <circle cx="70" cy="68" r="4" fill="#000" />
    <ellipse cx="60" cy="82" rx="7" ry="5" ${SF_BLACK} />
  `;
  let legsAndExtras = '';
  if (pose === 'reach') {
    legsAndExtras = `
      <path d="M70 138 L60 156" ${S} />
      <path d="M130 138 C 150 132, 168 120, 176 106" ${S} />
      <path d="M92 138 L88 156" ${S} />
      ${ball(184, 98, 14)}
    `;
  } else if (pose === 'play') {
    legsAndExtras = `
      <path d="M70 138 L64 156" ${S} />
      <path d="M92 140 L96 158" ${S} />
      <path d="M120 140 L128 156" ${S} />
      <path d="M140 132 L152 146" ${S} />
      ${ball(150, 130, 16)}
    `;
  } else if (pose === 'happy') {
    legsAndExtras = `
      <path d="M70 138 L64 156" ${S} />
      <path d="M92 140 L92 158" ${S} />
      <path d="M116 140 L116 158" ${S} />
      <path d="M138 138 L144 156" ${S} />
      <path d="M60 88 Q66 98 60 104" ${S} stroke-width="4" />
    `;
  } else {
    legsAndExtras = `
      <path d="M70 138 L64 156" ${S} />
      <path d="M92 140 L92 158" ${S} />
      <path d="M116 140 L116 158" ${S} />
      <path d="M138 138 L144 156" ${S} />
    `;
  }
  const tail = pose === 'reach'
    ? `<path d="M144 100 C 160 92, 166 76, 158 64" ${S} />`
    : `<path d="M144 104 C 158 100, 166 88, 160 76" ${S} />`;

  return svgWrap('0 0 200 160', base + legsAndExtras + tail, { label });
}

/**
 * @param {'branch'|'eat'} pose
 */
export function bird(pose = 'branch', opts = {}) {
  const { label = 'bird' } = opts;
  const body = `
    <ellipse cx="100" cy="90" rx="34" ry="28" ${SF_WHITE} />
    <circle cx="128" cy="66" r="18" ${SF_WHITE} />
    <path d="M144 64 L160 68 L144 74 Z" ${SF_WHITE} />
    <circle cx="132" cy="62" r="3" fill="#000" />
    <path d="M70 90 C 50 86, 38 96, 34 108" ${S} />
  `;
  if (pose === 'eat') {
    return svgWrap('0 0 200 160', `
      <line x1="20" y1="140" x2="180" y2="140" ${S} stroke-width="4" />
      <ellipse cx="100" cy="112" rx="34" ry="26" ${SF_WHITE} transform="rotate(18 100 112)" />
      <circle cx="118" cy="132" r="16" ${SF_WHITE} />
      <path d="M132 132 L148 136 L132 142 Z" ${SF_WHITE} />
      <circle cx="122" cy="128" r="3" fill="#000" />
      <path d="M62 110 C 44 108, 32 116, 28 126" ${S} />
      <circle cx="150" cy="150" r="4" ${SF_BLACK} />
    `, { label: 'bird eating' });
  }
  return svgWrap('0 0 200 160', `
    <line x1="10" y1="132" x2="190" y2="132" ${S} stroke-width="5" />
    ${body}
    <path d="M86 118 L80 134" ${S} stroke-width="4" />
    <path d="M110 118 L114 134" ${S} stroke-width="4" />
  `, { label });
}

export function cat(pose = 'sleep', opts = {}) {
  const { label = 'sleeping cat' } = opts;
  const inner = `
    <path d="M40 118 C 30 90, 46 62, 90 60 C 130 58, 160 78, 158 108 C 156 130, 130 138, 96 136 C 64 134, 46 132, 40 118 Z" ${SF_WHITE} />
    <path d="M64 62 L58 42 L78 56 Z" ${SF_WHITE} />
    <path d="M110 58 L116 38 L130 54 Z" ${SF_WHITE} />
    <path d="M80 96 Q86 92 92 96" ${S} stroke-width="4" />
    <path d="M108 96 Q114 92 120 96" ${S} stroke-width="4" />
    <path d="M96 104 Q100 108 104 104" ${S} stroke-width="4" />
    <path d="M150 100 C 168 96, 180 84, 176 68" ${S} />
    <text x="168" y="52" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="22" fill="#000">z z</text>
  `;
  return svgWrap('0 0 200 160', inner, { label });
}
