/**
 * Space Shuttle world art — owner look-approved (slice 3 proof, PR #124).
 *
 * Illustrated standard: purple ink (#3a2461), warm flat fills, rounded
 * friendly geometry, clear silhouettes. Counting guardrail (identical to the
 * station scene): the backdrop holds ZERO countable clusters — no discrete
 * stars, no window rows, no scattered planets; glows are continuous shapes,
 * the moon is one object, the launch tower is one silhouette. The countable
 * astronauts live ONLY in pods, high-contrast at the standard seat size.
 *
 * Editable design-source mirror: design-source/number-train/worlds/
 * space-shuttle.svg (provenance: docs/art/asset-provenance.md, Space
 * Shuttle world entry).
 */

const INK = '#3a2461';

/** The shuttle cockpit — the vehicle front (single object, nose right). */
export function shuttleFrontSvg(): string {
  return `<svg class="number-train__engine-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M14 42 h48 q20 0 26 17 q2 6 -4 8 l-70 0 q-7 0 -7 -7 v-11 q0 -7 7 -7 Z"
        fill="#eef3fb" stroke="${INK}" stroke-width="3"/>
      <path d="M62 42 q16 0 24 15" fill="none" stroke="#c9d6ea" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="55" r="8.5" fill="#bfe3f2" stroke="${INK}" stroke-width="3"/>
      <rect x="10" y="48" width="10" height="14" rx="4" fill="#e05d5d" stroke="${INK}" stroke-width="3"/>
      <path d="M10 50 q-8 5 -8 12 q6 -2 9 -5 Z" fill="#f0a848" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M4 62 q-4 4 -3 9 q5 -1 8 -5" fill="#ffe8a3" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M30 42 v-8 q0 -5 5 -5 h14 q5 0 5 5 v8" fill="#dfe9f7" stroke="${INK}" stroke-width="3"/>
      <rect x="26" y="67" width="44" height="8" rx="4" fill="#6b5aa0" stroke="${INK}" stroke-width="3"/>
      <circle cx="88" cy="60" r="4" fill="#ffe8a3" stroke="${INK}" stroke-width="2.4"/>
    </svg>`;
}

/** A friendly astronaut in a helmet — the occupied-pod token. Same figure
 * language as the train passenger (round face, dot eyes, smile) so counting
 * reads identically across worlds. */
export function astronautSvg(): string {
  return `<svg class="number-train__passenger-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle cx="50" cy="52" r="38" fill="#eef3fb" stroke="${INK}" stroke-width="4"/>
      <circle cx="50" cy="54" r="27" fill="#f5a86b" stroke="${INK}" stroke-width="3.4"/>
      <circle cx="42" cy="50" r="4" fill="${INK}"/>
      <circle cx="58" cy="50" r="4" fill="${INK}"/>
      <path d="M42 63 q8 7 16 0" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M26 34 a32 32 0 0 1 20 -14" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <line x1="50" y1="12" x2="50" y2="6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="4.5" r="2.6" fill="#e05d5d" stroke="${INK}" stroke-width="1.6"/>
    </svg>`;
}

/** The mission guide — a friendly bear in a space suit (one proof pose). */
export function missionGuideSvg(): string {
  return `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M35 138 v-26 q0 -22 25 -22 t25 22 v26 Z" fill="#eef3fb" stroke="${INK}" stroke-width="4"/>
      <rect x="52" y="96" width="16" height="10" rx="4" fill="#e05d5d" stroke="${INK}" stroke-width="3"/>
      <circle cx="60" cy="52" r="34" fill="none" stroke="${INK}" stroke-width="4"/>
      <circle cx="60" cy="52" r="34" fill="#dff2fb" opacity="0.35"/>
      <circle cx="60" cy="56" r="24" fill="#f7f3ec" stroke="${INK}" stroke-width="3.6"/>
      <circle cx="41" cy="34" r="8" fill="#f7f3ec" stroke="${INK}" stroke-width="3.4"/>
      <circle cx="79" cy="34" r="8" fill="#f7f3ec" stroke="${INK}" stroke-width="3.4"/>
      <circle cx="52" cy="53" r="3.6" fill="${INK}"/>
      <circle cx="68" cy="53" r="3.6" fill="${INK}"/>
      <ellipse cx="60" cy="65" rx="7.4" ry="5.6" fill="#fdf3d0"/>
      <circle cx="60" cy="62.5" r="1.8" fill="${INK}"/>
      <path d="M55 67.5 q5 4.4 10 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    </svg>`;
}

/**
 * The launch-site scene bands (proof form, inline): deep-space sky, one moon,
 * continuous glow waves, the launch tower as a single silhouette, and the
 * pad band as ground. No discrete stars anywhere — glows are continuous.
 */
export function spaceSceneSvg(): string {
  return `<svg class="station-env__svg" viewBox="0 0 1370 900" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax slice">
      <rect x="0" y="0" width="1370" height="900" fill="#232a52"/>
      <path d="M 0 210 q 340 -70 700 -30 q 380 42 670 -20 v 720 h -1370 Z" fill="#2d3563" opacity="0.9"/>
      <path d="M 0 330 q 420 -60 800 -10 q 320 40 570 -14 v 604 h -1370 Z" fill="#38406f" opacity="0.9"/>
      <ellipse cx="1150" cy="130" rx="150" ry="60" fill="#4a5388" opacity="0.45"/>
      <ellipse cx="260" cy="90" rx="190" ry="48" fill="#4a5388" opacity="0.35"/>
      <circle cx="985" cy="235" r="78" fill="#fdf3d0" stroke="#e8dcae" stroke-width="6"/>
      <ellipse cx="962" cy="217" rx="16" ry="11" fill="#efe4bb"/>
      <ellipse cx="1008" cy="257" rx="21" ry="14" fill="#efe4bb"/>
      <path d="M 96 560 v -300 l 44 -38 v 338 M 96 330 h 44 M 96 420 h 44 M 96 510 h 44"
        fill="none" stroke="#141936" stroke-width="16" stroke-linecap="round" opacity="0.85"/>
      <rect x="0" y="560" width="1370" height="24" rx="10" fill="#565f92"/>
      <rect x="0" y="584" width="1370" height="196" fill="#454e80"/>
      <rect x="0" y="780" width="1370" height="120" fill="#39416c"/>
      <line x1="0" y1="812" x2="1370" y2="812" stroke="#232a52" stroke-width="8"/>
      <line x1="0" y1="866" x2="1370" y2="866" stroke="#232a52" stroke-width="8"/>
    </svg>`;
}

/** Customization preview strip for the look call: the shuttle accent in three
 * colors plus the two badge shapes (star pennant, moon roundel). */
export function customizationPreviewSvg(): string {
  const accents = ['#e05d5d', '#74b9ff', '#a29bfe'];
  const shuttles = accents
    .map(
      (accent, index) => `<g transform="translate(${30 + index * 200} 26)">
        <path d="M14 42 h48 q20 0 26 17 q2 6 -4 8 l-70 0 q-7 0 -7 -7 v-11 q0 -7 7 -7 Z"
          fill="#eef3fb" stroke="${INK}" stroke-width="3"/>
        <rect x="10" y="48" width="10" height="14" rx="4" fill="${accent}" stroke="${INK}" stroke-width="3"/>
        <circle cx="40" cy="55" r="8.5" fill="#bfe3f2" stroke="${INK}" stroke-width="3"/>
        <rect x="26" y="67" width="44" height="8" rx="4" fill="${accent}" stroke="${INK}" stroke-width="3"/>
      </g>`
    )
    .join('');
  return `<svg viewBox="0 0 660 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="660" height="190" rx="18" fill="#f6f0ff" stroke="${INK}" stroke-width="3"/>
      ${shuttles}
      <path d="M150 140 l10 6 -3 -11 9 -8 -12 -1 -4 -11 -4 11 -12 1 9 8 -3 11 Z" fill="#f6c343" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <g transform="translate(330 130)">
        <circle cx="0" cy="10" r="14" fill="#fdf3d0" stroke="${INK}" stroke-width="2.8"/>
        <ellipse cx="-5" cy="6" rx="4" ry="2.8" fill="#efe4bb"/>
      </g>
    </svg>`;
}
