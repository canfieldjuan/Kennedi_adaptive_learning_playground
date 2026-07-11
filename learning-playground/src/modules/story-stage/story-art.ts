/**
 * Story Stage art — the first tale's illustrated scenes and choice cards,
 * local inline SVG in the playground's illustrated standard (ink outlines,
 * warm flat fills, rounded forms, clear silhouettes). The picture must
 * communicate each scene before the narration does.
 *
 * Composed from shared part-builders (Poppy, Biscuit, forest) so poses and
 * expressions stay consistent across scenes. No text, no emoji, no
 * external assets.
 */

const INK = '#3a2461';
const SKY = '#dcecf8';
const HILL = '#bcd9a8';
const HILL_DEEP = '#a3c98b';
const TRUNK = '#a5764a';
const LEAF = '#7cb98a';
const LEAF_DEEP = '#5da273';
const POPPY_DRESS = '#fd79a8';
const POPPY_SKIN = '#f6d3b3';
const POPPY_HAIR = '#8a5a34';
const BISCUIT_FUR = '#e8b04b';
const SPARKLE = '#f6c343';

export type PoppyMood = 'happy' | 'worried' | 'curious' | 'celebrating';

/** Princess Poppy the explorer, one flat group at (x, y), ~90 tall. */
function poppy(mood: PoppyMood, x: number, y: number): string {
  const face = mood === 'worried'
    ? `<circle cx="-5" cy="-58" r="1.8" fill="${INK}"/><circle cx="7" cy="-58" r="1.8" fill="${INK}"/><path d="M-4 -51 q5 -3 10 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M-9 -63 q4 -3 7 -1 M12 -64 q-4 -2 -7 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`
    : mood === 'curious'
      ? `<circle cx="-5" cy="-58" r="2.2" fill="${INK}"/><circle cx="7" cy="-58" r="2.2" fill="${INK}"/><ellipse cx="1" cy="-50" rx="2.6" ry="3.2" fill="${INK}"/>`
      : mood === 'celebrating'
        ? `<path d="M-8 -59 q3 3 6 0 M4 -59 q3 3 6 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M-5 -51 q6 6 12 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><ellipse cx="-11" cy="-53" rx="2.6" ry="1.8" fill="#f2a3bd" opacity="0.7"/><ellipse cx="13" cy="-53" rx="2.6" ry="1.8" fill="#f2a3bd" opacity="0.7"/>`
        : `<circle cx="-5" cy="-58" r="2" fill="${INK}"/><circle cx="7" cy="-58" r="2" fill="${INK}"/><path d="M-4 -51 q5 4 10 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  const arms = mood === 'celebrating'
    ? `<path d="M-14 -34 q-8 -8 -10 -16 M16 -34 q8 -8 10 -16" fill="none" stroke="${POPPY_SKIN}" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M-14 -32 q-9 4 -11 12 M16 -32 q9 4 11 12" fill="none" stroke="${POPPY_SKIN}" stroke-width="6" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y})">
    ${arms}
    <path d="M-16 0 L-11 -38 h24 L18 0 Z" fill="${POPPY_DRESS}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="-11" y="2" width="9" height="7" rx="3" fill="${TRUNK}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="4" y="2" width="9" height="7" rx="3" fill="${TRUNK}" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="1" cy="-56" r="15" fill="${POPPY_SKIN}" stroke="${INK}" stroke-width="3"/>
    <path d="M-14 -60 q-3 12 3 16 M16 -60 q3 12 -3 16" fill="none" stroke="${POPPY_HAIR}" stroke-width="5" stroke-linecap="round"/>
    <path d="M-15 -62 a16 16 0 0 1 32 0 l-4 3 a13 13 0 0 0 -24 0 Z" fill="${POPPY_HAIR}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-19 -64 h40 l-5 -7 h-30 Z" fill="#e8c07a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-6 -71 l4 -6 3 4 3 -4 3 6 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="2"/>
    ${face}
  </g>`;
}

/** Biscuit the golden puppy at (x, y), ~34 tall; hidden=true shows a peek. */
function biscuit(x: number, y: number, options: { peeking?: boolean; happy?: boolean } = {}): string {
  if (options.peeking) {
    return `<g transform="translate(${x} ${y})">
      <circle cx="0" cy="0" r="11" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="2.6"/>
      <path d="M-9 -7 q-4 8 1 10 Z M9 -7 q4 8 -1 10 Z" fill="${TRUNK}" stroke="${INK}" stroke-width="2"/>
      <circle cx="-3.5" cy="-1" r="1.8" fill="${INK}"/>
      <circle cx="3.5" cy="-1" r="1.8" fill="${INK}"/>
      <ellipse cx="0" cy="4" rx="2.4" ry="1.8" fill="${INK}"/>
    </g>`;
  }
  const tail = options.happy
    ? `<path d="M14 -4 q9 -7 7 -14" fill="none" stroke="${BISCUIT_FUR}" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M14 -2 q8 2 10 -3" fill="none" stroke="${BISCUIT_FUR}" stroke-width="5" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y})">
    ${tail}
    <ellipse cx="2" cy="0" rx="14" ry="10" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="-10" cy="-8" r="9" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-17 -14 q-4 8 1 10 Z M-3 -14 q4 8 -1 10 Z" fill="${TRUNK}" stroke="${INK}" stroke-width="2"/>
    <circle cx="-13" cy="-9" r="1.6" fill="${INK}"/>
    <circle cx="-7" cy="-9" r="1.6" fill="${INK}"/>
    <ellipse cx="-10" cy="-5" rx="2" ry="1.6" fill="${INK}"/>
    <path d="M-4 8 v3 M6 8 v3" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}

function tree(x: number, y: number, scale: number): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="-5" y="-6" width="10" height="26" rx="4" fill="${TRUNK}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="0" cy="-26" r="24" fill="${LEAF}" stroke="${INK}" stroke-width="3"/>
    <circle cx="-16" cy="-14" r="14" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="16" cy="-14" r="14" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
  </g>`;
}

function sparkleStar(x: number, y: number, size: number): string {
  const s = size;
  return `<path d="M${x} ${y - s} l${s * 0.3} ${s * 0.7} ${s * 0.7} ${s * 0.3} -${s * 0.7} ${s * 0.3} -${s * 0.3} ${s * 0.7} -${s * 0.3} -${s * 0.7} -${s * 0.7} -${s * 0.3} ${s * 0.7} -${s * 0.3} Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.6"/>`;
}

function owl(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="0" rx="13" ry="16" fill="#b98ac9" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-11 -13 l5 -7 4 5 4 -5 5 7" fill="#b98ac9" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="-5" cy="-4" r="4.4" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <circle cx="5" cy="-4" r="4.4" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <circle cx="-5" cy="-4" r="1.8" fill="${INK}"/>
    <circle cx="5" cy="-4" r="1.8" fill="${INK}"/>
    <path d="M-2 2 l2 3 2 -3 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-13 4 q6 6 13 6 q7 0 13 -6" fill="none" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

/** The forest stage: sky, hills, trees, ground. */
function forest(extra = ''): string {
  return `<rect x="0" y="0" width="400" height="250" fill="${SKY}"/>
  <path d="M0 150 q100 -34 200 -16 q110 20 200 -8 v124 h-400 Z" fill="${HILL}"/>
  <path d="M0 190 q120 -26 240 -8 q90 12 160 -4 v72 h-400 Z" fill="${HILL_DEEP}"/>
  ${tree(52, 158, 0.9)}
  ${tree(352, 150, 1.05)}
  ${sparkleStar(120, 52, 7)}
  ${sparkleStar(300, 38, 5)}
  ${sparkleStar(210, 70, 4)}
  ${extra}
  <rect x="0" y="228" width="400" height="22" fill="#9dbb84"/>`;
}

function pawPrints(): string {
  const paw = (x: number, y: number) =>
    `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="2" rx="3.4" ry="2.8" fill="${TRUNK}"/><circle cx="-3" cy="-2.4" r="1.3" fill="${TRUNK}"/><circle cx="0" cy="-3.4" r="1.3" fill="${TRUNK}"/><circle cx="3" cy="-2.4" r="1.3" fill="${TRUNK}"/></g>`;
  return paw(210, 208) + paw(238, 198) + paw(266, 206) + paw(294, 194);
}

const SCENES: Record<string, string> = {
  intro: forest(`${poppy('happy', 140, 218)}${biscuit(230, 208, { happy: true })}`),
  problem: forest(`${poppy('worried', 120, 218)}${pawPrints()}`),
  where: forest(`
    <path d="M150 232 q40 -24 34 -60 q-5 -28 18 -44" fill="none" stroke="#f4e6b8" stroke-width="12" stroke-linecap="round" opacity="0.9"/>
    ${sparkleStar(176, 176, 6)}${sparkleStar(196, 140, 5)}
    <rect x="292" y="128" width="52" height="9" rx="4" fill="${TRUNK}" stroke="${INK}" stroke-width="2.4"/>
    ${owl(318, 108)}
    ${poppy('curious', 90, 218)}`),
  bush: forest(`
    <circle cx="300" cy="196" r="34" fill="${LEAF}" stroke="${INK}" stroke-width="3"/>
    <circle cx="272" cy="206" r="22" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="328" cy="206" r="22" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M318 168 q9 -8 8 -16" fill="none" stroke="${BISCUIT_FUR}" stroke-width="6" stroke-linecap="round"/>
    ${poppy('curious', 120, 218)}`),
  log: forest(`
    <rect x="258" y="182" width="98" height="40" rx="20" fill="${TRUNK}" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="270" cy="202" rx="13" ry="17" fill="#5e4026" stroke="${INK}" stroke-width="2.6"/>
    ${biscuit(272, 202, { peeking: true })}
    <rect x="296" y="136" width="44" height="8" rx="4" fill="${TRUNK}" stroke="${INK}" stroke-width="2.2"/>
    ${owl(318, 118)}
    ${poppy('curious', 130, 218)}`),
  help: forest(`
    <path d="M282 226 q-10 -34 14 -44 q26 -10 36 12 q8 20 -12 30 Z" fill="${LEAF}" stroke="${INK}" stroke-width="3"/>
    ${biscuit(304, 200, { peeking: true })}
    ${poppy('curious', 150, 218)}`),
  ending: forest(`
    ${sparkleStar(180, 120, 6)}${sparkleStar(252, 104, 5)}${sparkleStar(216, 88, 4)}
    ${poppy('celebrating', 160, 218)}
    ${biscuit(240, 208, { happy: true })}
    <path d="M206 150 q-6 -10 4 -12 q4 -8 11 -2 q10 -2 8 8 q0 8 -11 10 q-9 2 -12 -4 Z" fill="#f6a5c0" stroke="${INK}" stroke-width="2.4"/>`),
};

/** One illustrated story scene (viewBox 400x250). */
export function storySceneSvg(artKey: string): string {
  const body = SCENES[artKey] ?? SCENES.intro;
  return `<svg class="story-stage__scene-svg" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${body}</svg>`;
}

const CHOICE_ART: Record<string, string> = {
  sparkle: `<path d="M30 86 q28 -18 22 -42 q-4 -18 14 -30" fill="none" stroke="#f4e6b8" stroke-width="12" stroke-linecap="round"/>${sparkleStar(44, 58, 8)}${sparkleStar(62, 28, 7)}${sparkleStar(28, 30, 5)}`,
  owl: owl(50, 52).replace('translate(50 52)', 'translate(50 52) scale(1.9)'),
  bubbles: `<rect x="44" y="52" width="10" height="34" rx="5" fill="${TRUNK}" stroke="${INK}" stroke-width="2.6"/><circle cx="49" cy="40" r="15" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="72" cy="26" r="9" fill="#a8d8f0" opacity="0.85" stroke="${INK}" stroke-width="2.4"/><circle cx="28" cy="20" r="6" fill="#a8d8f0" opacity="0.85" stroke="${INK}" stroke-width="2.2"/><circle cx="62" cy="10" r="4.6" fill="#a8d8f0" opacity="0.85" stroke="${INK}" stroke-width="2"/>`,
  song: `<path d="M36 70 V26 l30 -8 v44" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="29" cy="71" rx="9" ry="7" fill="${POPPY_DRESS}" stroke="${INK}" stroke-width="2.6"/><ellipse cx="59" cy="63" rx="9" ry="7" fill="${SPARKLE}" stroke="${INK}" stroke-width="2.6"/>${sparkleStar(78, 32, 5)}`,
};

/** One illustrated choice card image (viewBox 100x100). */
export function storyChoiceSvg(artKey: string): string {
  const body = CHOICE_ART[artKey] ?? CHOICE_ART.sparkle;
  return `<svg class="story-stage__choice-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}
