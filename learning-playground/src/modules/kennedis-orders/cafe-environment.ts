/**
 * Bear Cafe environment — the game-owned illustrated scene behind every stage
 * (visual arc stage 2, issue #55). One continuous cafe: wall, window, pendant
 * light, shelf, icon-only menu board, plant, counter, floor — plus a wall
 * phone station group that CSS shows only on the phone stage. The customer's
 * service window is deliberately NOT in this SVG: it is the styled DOM
 * element the delivery/handoff/complete stages already own, so the bear never
 * needs coordinate-coupling to scenery across responsive sizes. Purely
 * decorative: the layer is aria-hidden with pointer-events disabled; scene
 * colors stay lower contrast than the interactive cards per the game
 * environment contract. Local inline SVG only. No readable text in the scene.
 */

const INK = 'rgba(58, 36, 97, 0.5)';
const INK_SOFT = 'rgba(58, 36, 97, 0.32)';
const WALL = '#faf0e1';
const WALL_TRIM = '#f3e2c9';
const COUNTER = '#e5c29a';
const COUNTER_FRONT = '#d9b083';
const FLOOR = '#efdcc0';
const SKY = '#fff3d6';
const LEAF = '#a8c98a';
const CUP = '#fdf8ef';

export const CAFE_ENVIRONMENT_SVG = `<svg class="cafe-env__svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <rect x="0" y="0" width="800" height="500" fill="${WALL}"/>
  <rect x="0" y="16" width="800" height="10" fill="${WALL_TRIM}"/>

  <rect class="cafe-env__prop cafe-env__prop--minor" x="52" y="70" width="150" height="120" rx="14" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
  <line class="cafe-env__prop cafe-env__prop--minor" x1="127" y1="76" x2="127" y2="184" stroke="${INK_SOFT}" stroke-width="4"/>
  <line class="cafe-env__prop cafe-env__prop--minor" x1="58" y1="130" x2="196" y2="130" stroke="${INK_SOFT}" stroke-width="4"/>
  <ellipse class="cafe-env__prop cafe-env__prop--minor" cx="96" cy="104" rx="22" ry="9" fill="#ffffff" opacity="0.85"/>

  <line class="cafe-env__prop cafe-env__prop--minor" x1="400" y1="0" x2="400" y2="58" stroke="${INK_SOFT}" stroke-width="4"/>
  <path class="cafe-env__prop cafe-env__prop--minor" d="M372 58 h56 l-10 26 h-36 Z" fill="#f0a848" stroke="${INK}" stroke-width="4"/>
  <circle class="cafe-env__prop cafe-env__prop--minor" cx="400" cy="90" r="6" fill="#ffe9a8" stroke="${INK_SOFT}" stroke-width="3"/>

  <rect class="cafe-env__prop cafe-env__prop--minor" x="480" y="86" width="180" height="10" rx="5" fill="${COUNTER_FRONT}" stroke="${INK_SOFT}" stroke-width="3"/>
  <path class="cafe-env__prop cafe-env__prop--minor" d="M500 86 v-24 a10 10 0 0 1 10 -10 h16 a10 10 0 0 1 10 10 v24 Z" fill="${CUP}" stroke="${INK}" stroke-width="4"/>
  <path class="cafe-env__prop cafe-env__prop--minor" d="M560 86 v-30 a8 8 0 0 1 8 -8 h14 a8 8 0 0 1 8 8 v30 Z" fill="#f6cfd8" stroke="${INK}" stroke-width="4"/>
  <rect class="cafe-env__prop cafe-env__prop--minor" x="612" y="46" width="28" height="40" rx="8" fill="#cfe3f4" stroke="${INK}" stroke-width="4"/>

  <rect class="cafe-env__prop cafe-env__prop--minor" x="250" y="64" width="104" height="120" rx="12" fill="#f7e7d0" stroke="${INK}" stroke-width="5"/>
  <circle class="cafe-env__prop cafe-env__prop--minor" cx="278" cy="98" r="11" fill="#f5a86b"/>
  <circle class="cafe-env__prop cafe-env__prop--minor" cx="326" cy="98" r="11" fill="#f6cfd8"/>
  <rect class="cafe-env__prop cafe-env__prop--minor" x="268" y="124" width="68" height="7" rx="3.5" fill="${INK_SOFT}"/>
  <rect class="cafe-env__prop cafe-env__prop--minor" x="268" y="142" width="52" height="7" rx="3.5" fill="${INK_SOFT}"/>
  <rect class="cafe-env__prop cafe-env__prop--minor" x="268" y="160" width="60" height="7" rx="3.5" fill="${INK_SOFT}"/>

  <g class="cafe-env__phone-station">
    <rect x="565" y="120" width="70" height="104" rx="12" fill="#e05d5d" stroke="${INK}" stroke-width="5"/>
    <rect x="581" y="138" width="38" height="26" rx="7" fill="#fdf3d0" stroke="${INK_SOFT}" stroke-width="3"/>
    <circle cx="600" cy="192" r="14" fill="#fdf3d0" stroke="${INK_SOFT}" stroke-width="3"/>
    <path d="M563 150 q-24 34 4 66" fill="none" stroke="${INK}" stroke-width="4"/>
    <rect x="676" y="150" width="58" height="74" rx="8" fill="#ffffff" stroke="${INK}" stroke-width="4"/>
    <line x1="688" y1="170" x2="722" y2="170" stroke="${INK_SOFT}" stroke-width="4"/>
    <line x1="688" y1="188" x2="716" y2="188" stroke="${INK_SOFT}" stroke-width="4"/>
    <line x1="688" y1="206" x2="720" y2="206" stroke="${INK_SOFT}" stroke-width="4"/>
  </g>

  <rect x="0" y="330" width="800" height="34" rx="6" fill="${COUNTER}" stroke="${INK_SOFT}" stroke-width="4"/>
  <rect x="0" y="360" width="800" height="80" fill="${COUNTER_FRONT}"/>
  <rect x="0" y="440" width="800" height="60" fill="${FLOOR}"/>

  <g class="cafe-env__prop cafe-env__prop--minor">
    <path d="M62 440 h64 l-9 46 h-46 Z" fill="#e8927c" stroke="${INK}" stroke-width="5"/>
    <path d="M80 438 q-26 -34 6 -52 q4 30 8 50 Z" fill="${LEAF}" stroke="${INK_SOFT}" stroke-width="3"/>
    <path d="M108 438 q28 -30 -2 -54 q-6 28 -10 52 Z" fill="${LEAF}" stroke="${INK_SOFT}" stroke-width="3"/>
  </g>
</svg>`;

/**
 * The decorative environment layer. Mounted once per Bear Cafe render;
 * `data-stage` (phone | make | plating | delivery | handoff | complete)
 * reframes the scene via CSS, and the one-shot `is-open` state lifts the
 * service-window shutter during delivery.
 */
export function createCafeEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'bear-cafe-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.dataset.stage = 'phone';
  environment.innerHTML = CAFE_ENVIRONMENT_SVG;
  return environment;
}

/** Illustrated pickup bell (replaces the 🔔 emoji). */
export function pickupBellSvg(): string {
  return `<svg class="bear-cafe-bell-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle cx="50" cy="26" r="7" fill="#f0a848" stroke="#3a2461" stroke-width="4"/>
      <path d="M18 74 a32 32 0 0 1 64 0 Z" fill="#f6c343" stroke="#3a2461" stroke-width="5" stroke-linejoin="round"/>
      <rect x="10" y="74" width="80" height="12" rx="6" fill="#e5c29a" stroke="#3a2461" stroke-width="4"/>
      <path d="M34 52 a20 20 0 0 1 12 -12" fill="none" stroke="#fdf3d0" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
}

/** Illustrated serving tray (replaces the 🧺 emoji, incl. the Deliver control). */
export function deliveryTraySvg(): string {
  return `<svg class="bear-cafe-tray-svg" viewBox="0 26 100 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <ellipse cx="50" cy="62" rx="40" ry="12" fill="#d9b083" stroke="#3a2461" stroke-width="5"/>
      <ellipse cx="50" cy="55" rx="40" ry="12" fill="#fdf3d0" stroke="#3a2461" stroke-width="5"/>
      <path d="M22 50 q-10 -12 8 -16" fill="none" stroke="#3a2461" stroke-width="5" stroke-linecap="round"/>
      <path d="M78 50 q10 -12 -8 -16" fill="none" stroke="#3a2461" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
}

/** Small illustrated cafe phone (replaces the ☎ glyph in the phone button). */
export function cafePhoneSvg(): string {
  return `<svg class="bear-cafe-phone-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect x="24" y="30" width="52" height="52" rx="12" fill="#e05d5d" stroke="#3a2461" stroke-width="5"/>
      <path d="M20 30 q30 -22 60 0 l-8 12 q-22 -14 -44 0 Z" fill="#f6c343" stroke="#3a2461" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="50" cy="58" r="11" fill="#fdf3d0" stroke="#3a2461" stroke-width="4"/>
      <circle cx="50" cy="58" r="3.5" fill="#3a2461"/>
    </svg>`;
}
