/**
 * Pip's Word Workshop — the game-owned illustrated scene behind all three
 * Words modes (visual arc stage 3, issue #55): a cozy word workshop with a
 * soft wall, window, low bookshelf, pin-board, and floor band. Purely
 * decorative: aria-hidden, pointer-events disabled, lower contrast than the
 * cards and Pip. HARD GUARDRAIL: nothing in this scene may read as a letter,
 * word, tile, or choice — book spines are plain colors, the pin-board holds
 * abstract shapes, and there is no <text> anywhere.
 */

const INK = 'rgba(58, 36, 97, 0.5)';
const INK_SOFT = 'rgba(58, 36, 97, 0.3)';
const WALL = '#f6eee2';
const WALL_TRIM = '#ecdfc8';
const FLOOR = '#e7d3b3';
const RUG = '#e8b7c4';
const SKY = '#fff3d6';
const LEAF = '#a8c98a';

export const WORKSHOP_ENVIRONMENT_SVG = `<svg class="workshop-env__svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <rect x="0" y="0" width="800" height="500" fill="${WALL}"/>
  <rect x="0" y="14" width="800" height="8" fill="${WALL_TRIM}"/>

  <rect class="workshop-env__prop workshop-env__prop--minor" x="56" y="64" width="150" height="118" rx="14" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
  <circle class="workshop-env__prop workshop-env__prop--minor" cx="100" cy="102" r="16" fill="#ffd76e" stroke="${INK_SOFT}" stroke-width="3"/>
  <path class="workshop-env__prop workshop-env__prop--minor" d="M62 160 q36 -26 72 0 q36 -22 66 0 v16 h-138 Z" fill="${LEAF}" opacity="0.55"/>
  <line class="workshop-env__prop workshop-env__prop--minor" x1="131" y1="70" x2="131" y2="176" stroke="${INK_SOFT}" stroke-width="4"/>

  <rect class="workshop-env__prop workshop-env__prop--minor" x="236" y="58" width="136" height="104" rx="12" fill="#f9e2c6" stroke="${INK}" stroke-width="5"/>
  <circle class="workshop-env__prop workshop-env__prop--minor" cx="270" cy="92" r="12" fill="#f5a86b"/>
  <rect class="workshop-env__prop workshop-env__prop--minor" x="292" y="80" width="56" height="24" rx="8" fill="#cfe3f4" stroke="${INK_SOFT}" stroke-width="3"/>
  <path class="workshop-env__prop workshop-env__prop--minor" d="M268 128 q24 16 48 0" fill="none" stroke="${INK_SOFT}" stroke-width="4" stroke-linecap="round"/>

  <g class="workshop-env__prop workshop-env__prop--minor">
    <rect x="586" y="96" width="168" height="96" rx="10" fill="#e8c496" stroke="${INK}" stroke-width="5"/>
    <rect x="600" y="112" width="20" height="66" rx="4" fill="#e28f8f"/>
    <rect x="626" y="120" width="18" height="58" rx="4" fill="#8fb7e2"/>
    <rect x="650" y="108" width="22" height="70" rx="4" fill="#a8c98a"/>
    <rect x="678" y="118" width="18" height="60" rx="4" fill="#f0c65f"/>
    <rect x="702" y="112" width="20" height="66" rx="4" fill="#c39fd9"/>
    <rect x="586" y="184" width="168" height="10" rx="5" fill="#d9b083" stroke="${INK_SOFT}" stroke-width="3"/>
  </g>

  <rect x="0" y="368" width="800" height="132" fill="${FLOOR}"/>
  <rect x="0" y="360" width="800" height="12" rx="6" fill="${WALL_TRIM}" stroke="${INK_SOFT}" stroke-width="3"/>
  <ellipse class="workshop-env__prop" cx="400" cy="470" rx="270" ry="44" fill="${RUG}" opacity="0.55"/>

  <g class="workshop-env__prop workshop-env__prop--minor">
    <path d="M64 430 h58 l-8 44 h-42 Z" fill="#e8927c" stroke="${INK}" stroke-width="5"/>
    <path d="M82 428 q-22 -30 6 -46 q3 26 6 44 Z" fill="${LEAF}" stroke="${INK_SOFT}" stroke-width="3"/>
    <path d="M104 428 q24 -26 -2 -48 q-5 24 -8 46 Z" fill="${LEAF}" stroke="${INK_SOFT}" stroke-width="3"/>
  </g>

  <g class="workshop-env__prop workshop-env__prop--minor">
    <path d="M706 436 h44 l-6 38 h-32 Z" fill="#cfe3f4" stroke="${INK}" stroke-width="5"/>
    <line x1="718" y1="434" x2="710" y2="404" stroke="#f0c65f" stroke-width="7" stroke-linecap="round"/>
    <line x1="730" y1="434" x2="732" y2="400" stroke="#e28f8f" stroke-width="7" stroke-linecap="round"/>
    <line x1="742" y1="434" x2="750" y2="408" stroke="#8fb7e2" stroke-width="7" stroke-linecap="round"/>
  </g>
</svg>`;

/** The decorative workshop layer shared by all three Words modes. */
export function createWorkshopEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'workshop-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = WORKSHOP_ENVIRONMENT_SVG;
  return environment;
}
