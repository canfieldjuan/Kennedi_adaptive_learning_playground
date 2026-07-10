/**
 * The Art studio — the game-owned illustrated scene behind the coloring
 * activity (visual arc stage 4, issue #55). Deliberately ALL-NEUTRAL: creams,
 * wood tones, and gray-beige only, so color on this screen belongs
 * exclusively to the palette swatches and the child's filled shape — no
 * decoration can ever be confused with a color choice. Purely decorative:
 * aria-hidden, pointer-events disabled, no <text> anywhere.
 */

const INK = 'rgba(58, 36, 97, 0.45)';
const INK_SOFT = 'rgba(58, 36, 97, 0.28)';
const WALL = '#f4efe6';
const WALL_TRIM = '#e9e1d2';
const WOOD = '#d9c4a3';
const WOOD_DEEP = '#c9b28d';
const PAPER = '#fbf8f1';
const NEUTRAL = '#d8d0c2';

export const STUDIO_ENVIRONMENT_SVG = `<svg class="studio-env__svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <rect x="0" y="0" width="800" height="500" fill="${WALL}"/>
  <rect x="0" y="14" width="800" height="8" fill="${WALL_TRIM}"/>

  <g class="studio-env__prop studio-env__prop--minor">
    <rect x="58" y="60" width="104" height="88" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
    <circle cx="110" cy="98" r="22" fill="${NEUTRAL}"/>
    <circle cx="110" cy="56" r="6" fill="${WOOD_DEEP}" stroke="${INK_SOFT}" stroke-width="3"/>
  </g>

  <g class="studio-env__prop studio-env__prop--minor">
    <rect x="196" y="84" width="88" height="72" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
    <path d="M212 138 l22 -26 l16 16 l14 -20 l14 30 Z" fill="${NEUTRAL}"/>
    <circle cx="240" cy="80" r="6" fill="${WOOD_DEEP}" stroke="${INK_SOFT}" stroke-width="3"/>
  </g>

  <rect class="studio-env__prop studio-env__prop--minor" x="622" y="56" width="126" height="112" rx="13" fill="#f7f3e9" stroke="${INK}" stroke-width="5"/>
  <line class="studio-env__prop studio-env__prop--minor" x1="685" y1="62" x2="685" y2="162" stroke="${INK_SOFT}" stroke-width="4"/>
  <line class="studio-env__prop studio-env__prop--minor" x1="628" y1="112" x2="742" y2="112" stroke="${INK_SOFT}" stroke-width="4"/>

  <g class="studio-env__prop studio-env__prop--minor">
    <rect x="576" y="212" width="180" height="12" rx="6" fill="${WOOD}" stroke="${INK_SOFT}" stroke-width="3"/>
    <path d="M600 212 v-26 a8 8 0 0 1 8 -8 h14 a8 8 0 0 1 8 8 v26 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
    <line x1="644" y1="210" x2="638" y2="172" stroke="${WOOD_DEEP}" stroke-width="6" stroke-linecap="round"/>
    <line x1="658" y1="210" x2="662" y2="168" stroke="${WOOD_DEEP}" stroke-width="6" stroke-linecap="round"/>
    <path d="M634 176 q4 -10 10 -2 Z" fill="${NEUTRAL}" stroke="${INK_SOFT}" stroke-width="2"/>
    <path d="M658 170 q6 -9 11 0 Z" fill="${NEUTRAL}" stroke="${INK_SOFT}" stroke-width="2"/>
    <rect x="690" y="180" width="30" height="32" rx="6" fill="${NEUTRAL}" stroke="${INK}" stroke-width="4"/>
  </g>

  <rect x="0" y="372" width="800" height="128" fill="${WOOD}"/>
  <rect x="0" y="364" width="800" height="12" rx="6" fill="${WALL_TRIM}" stroke="${INK_SOFT}" stroke-width="3"/>
  <ellipse class="studio-env__prop" cx="400" cy="474" rx="280" ry="42" fill="${PAPER}" opacity="0.6"/>

  <g class="studio-env__prop studio-env__prop--minor">
    <path d="M70 434 h52 l-7 42 h-38 Z" fill="${NEUTRAL}" stroke="${INK}" stroke-width="5"/>
    <line x1="84" y1="432" x2="76" y2="398" stroke="${WOOD_DEEP}" stroke-width="7" stroke-linecap="round"/>
    <line x1="98" y1="432" x2="100" y2="394" stroke="${WOOD_DEEP}" stroke-width="7" stroke-linecap="round"/>
    <line x1="110" y1="432" x2="118" y2="402" stroke="${WOOD_DEEP}" stroke-width="7" stroke-linecap="round"/>
  </g>
</svg>`;

/** The decorative studio layer behind the coloring activity. */
export function createStudioEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'studio-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = STUDIO_ENVIRONMENT_SVG;
  return environment;
}
