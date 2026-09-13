/**
 * Small single-color icon set, viewBox "0 0 100 100", bold black outlines.
 * Used inside picture-choice cards and as recurring motifs (badge, crown,
 * clipboard, pencil, star, checkmark). Keep every icon readable at ~1in.
 */
import { svgWrap, starPolygon } from './svg-utils.mjs';

const S = 'stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const SF = 'stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="#000"';

export function bossBadgeIcon(label = 'boss badge') {
  const inner = `
    <circle cx="50" cy="42" r="30" ${S} />
    ${starPolygon(50, 42, 17, 7, `${SF.replace('fill="#000"', 'fill="#fff"')}`)}
    <path d="M35 66 L28 92 L50 80 L72 92 L65 66" ${S} fill="#fff" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function crownIcon(label = 'crown') {
  const inner = `
    <path d="M18 70 L18 40 L36 56 L50 28 L64 56 L82 40 L82 70 Z" ${S} fill="#fff" />
    <line x1="18" y1="78" x2="82" y2="78" ${S} />
    <circle cx="50" cy="24" r="5" fill="#000" />
    <circle cx="20" cy="36" r="4" fill="#000" />
    <circle cx="80" cy="36" r="4" fill="#000" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function clipboardIcon(label = 'clipboard') {
  const inner = `
    <rect x="22" y="16" width="56" height="74" rx="8" ${S} fill="#fff" />
    <rect x="38" y="10" width="24" height="14" rx="5" ${S} fill="#fff" />
    <line x1="34" y1="42" x2="66" y2="42" ${S} />
    <line x1="34" y1="56" x2="66" y2="56" ${S} />
    <path d="M34 70 L44 78 L66 60" ${S} />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function pencilIcon(label = 'pencil') {
  const inner = `
    <path d="M22 78 L66 34 L82 50 L38 94 Z" ${S} fill="#fff" />
    <line x1="60" y1="40" x2="76" y2="56" ${S} />
    <path d="M22 78 L18 90 L30 86 Z" ${SF} />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function starIcon(label = 'star', filled = false) {
  const fill = filled ? '#000' : '#fff';
  const inner = starPolygon(50, 52, 40, 17, `stroke="#000" stroke-width="6" stroke-linejoin="round" fill="${fill}"`);
  return svgWrap('0 0 100 100', inner, { label });
}

export function checkmarkIcon(label = 'checkmark') {
  const inner = `<path d="M18 52 L42 76 L84 26" ${S} />`;
  return svgWrap('0 0 100 100', inner, { label });
}

export function heartIcon(label = 'heart') {
  const inner = `<path d="M50 88 C 10 62, 10 30, 34 22 C 46 18, 50 30, 50 30 C 50 30, 54 18, 66 22 C 90 30, 90 62, 50 88 Z" ${S} fill="#fff" />`;
  return svgWrap('0 0 100 100', inner, { label });
}

export function ballIcon(label = 'ball') {
  const inner = `
    <circle cx="50" cy="50" r="36" ${S} fill="#fff" />
    <path d="M50 14 V86 M14 50 H86 M23 23 Q50 50 23 77 M77 23 Q50 50 77 77" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function appleIcon(label = 'apple') {
  const inner = `
    <path d="M50 34 C 30 20, 10 34, 12 56 C 14 78, 34 90, 50 80 C 66 90, 86 78, 88 56 C 90 34, 70 20, 50 34 Z" ${S} fill="#fff" />
    <path d="M50 34 C 50 24, 46 18, 40 14" ${S} />
    <path d="M50 22 C 58 16, 66 18, 68 22" ${S} />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function shoeIcon(label = 'shoe') {
  const inner = `
    <path d="M12 84 L12 56 C 20 56, 26 52, 30 44 C 34 36, 44 34, 50 40 C 56 46, 66 50, 80 50 C 87 50, 90 55, 88 62 C 86 70, 88 77, 88 84 Z" ${S} fill="#fff" />
    <line x1="12" y1="70" x2="88" y2="70" ${S} />
    <path d="M40 40 Q44 46 42 52" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
    <path d="M52 42 Q56 48 54 54" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function teddyBearIcon(label = 'teddy bear') {
  const inner = `
    <circle cx="30" cy="26" r="11" ${S} fill="#fff" />
    <circle cx="70" cy="26" r="11" ${S} fill="#fff" />
    <circle cx="50" cy="46" r="28" ${S} fill="#fff" />
    <circle cx="50" cy="78" r="20" ${S} fill="#fff" />
    <circle cx="41" cy="42" r="3.5" fill="#000" />
    <circle cx="59" cy="42" r="3.5" fill="#000" />
    <circle cx="50" cy="52" r="5" ${S} fill="#fff" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function bananaIcon(label = 'banana') {
  const inner = `
    <path d="M20 82 C 8 56, 12 26, 42 13 C 57 6, 73 11, 80 22"
      stroke="#000" stroke-width="17" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M76 15 L86 7" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function sockIcon(label = 'sock') {
  const inner = `
    <path d="M40 12 L40 54 C 40 54, 36 66, 48 72 L82 84 C 90 87, 92 76, 86 70 L70 60 C 62 55, 60 48, 60 40 L60 12 Z" ${S} fill="#fff" />
    <line x1="40" y1="32" x2="60" y2="32" ${S} />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function paintbrushIcon(label = 'paintbrush') {
  const inner = `
    <path d="M64 16 L86 38 L52 72 L38 76 L42 62 Z" ${S} fill="#fff" />
    <path d="M38 76 L28 88" ${S} />
    <line x1="58" y1="22" x2="80" y2="44" stroke="#000" stroke-width="4" />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}

export function magnifyingGlassIcon(label = 'magnifying glass') {
  const inner = `
    <circle cx="42" cy="42" r="26" ${S} fill="#fff" />
    <line x1="61" y1="61" x2="86" y2="86" ${S} />
  `;
  return svgWrap('0 0 100 100', inner, { label });
}
