/**
 * The friendly train station — the game-owned illustrated scene behind the
 * Number Train (visual arc stage 5, issue #55). Purely decorative:
 * aria-hidden, pointer-events disabled, no <text> anywhere.
 *
 * Hard guardrail: every Number Train round is a counting task, so the scenery
 * contains NO loose countable objects — hills and the town are continuous
 * silhouettes (no window rows), the rails have no discrete sleeper ties, and
 * there are no birds, clouds-in-groups, or repeated small props.
 */

const INK = 'rgba(58, 36, 97, 0.5)';
const INK_SOFT = 'rgba(58, 36, 97, 0.3)';
const SKY = '#ddeef8';
const SKY_LOW = '#eef6fb';
const HILL_FAR = '#dce8d0';
const HILL_NEAR = '#c8dbb4';
const TOWN = '#c5cfe0';
const STATION_WALL = '#f6e7c9';
const CANOPY = '#e0a18f';
const PLATFORM = '#d9cdb8';
const GRAVEL = '#cbbfae';
const RAIL = 'rgba(58, 36, 97, 0.4)';

export const STATION_ENVIRONMENT_SVG = `<svg class="station-env__svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <rect x="0" y="0" width="800" height="360" fill="${SKY}"/>

  <g class="station-env__prop station-env__prop--minor">
    <circle cx="656" cy="96" r="52" fill="${SKY_LOW}"/>
    <circle cx="656" cy="96" r="32" fill="#fdf3d0" stroke="${INK_SOFT}" stroke-width="4"/>
  </g>

  <path d="M0 300 q160 -70 340 -32 q220 46 460 -10 v102 h-800 Z" fill="${HILL_FAR}"/>

  <g class="station-env__prop station-env__prop--minor">
    <path d="M470 302 v-64 h34 v-18 h30 v18 h30 v-34 h38 v34 h26 v64 Z" fill="${TOWN}"/>
    <path d="M640 302 v-46 h28 v-16 h34 v16 h26 v46 Z" fill="${TOWN}"/>
  </g>

  <path d="M0 330 q220 -58 470 -18 q190 30 330 -8 v96 h-800 Z" fill="${HILL_NEAR}"/>

  <g class="station-env__prop station-env__prop--minor">
    <rect x="74" y="208" width="168" height="122" rx="8" fill="${STATION_WALL}" stroke="${INK}" stroke-width="5"/>
    <path d="M56 214 l102 -54 l102 54 Z" fill="${CANOPY}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="60" y="206" width="196" height="14" rx="7" fill="${CANOPY}" stroke="${INK}" stroke-width="4"/>
    <rect x="136" y="252" width="44" height="78" rx="6" fill="${GRAVEL}" stroke="${INK_SOFT}" stroke-width="4"/>
    <circle cx="158" cy="182" r="26" fill="#fdf3d0" stroke="${INK}" stroke-width="5"/>
    <rect x="144" y="176" width="22" height="12" rx="4" fill="${INK}"/>
    <rect x="166" y="172" width="8" height="16" rx="3" fill="${INK}"/>
  </g>

  <rect x="0" y="330" width="800" height="42" fill="${PLATFORM}"/>
  <rect x="0" y="326" width="800" height="10" rx="5" fill="#efe6d4" stroke="${INK_SOFT}" stroke-width="3"/>

  <rect x="0" y="372" width="800" height="128" fill="${GRAVEL}"/>
  <rect x="0" y="424" width="800" height="7" fill="${RAIL}"/>
  <rect x="0" y="452" width="800" height="7" fill="${RAIL}"/>
</svg>`;

/** The decorative station layer behind the Number Train. */
export function createStationEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'station-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = STATION_ENVIRONMENT_SVG;
  return environment;
}
