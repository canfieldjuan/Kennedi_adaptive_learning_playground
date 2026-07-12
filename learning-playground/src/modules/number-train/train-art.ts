/**
 * Number Train art — local inline SVG in the illustrated standard (ink
 * `#3a2461`, warm flat fills), matching Pip and the Bear Cafe. No external
 * assets, no network. Kept to the two pieces the train visual actually needs:
 * the engine and the passenger face; the car and seats are DOM elements so
 * later slices can make seats tappable (Load the Train).
 */

const INK = '#3a2461';

export function trainEngineSvg(): string {
  return `<svg class="number-train__engine-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect x="10" y="42" width="52" height="34" rx="7" fill="#e05d5d" stroke="${INK}" stroke-width="3"/>
      <rect x="56" y="24" width="28" height="52" rx="7" fill="#f0a848" stroke="${INK}" stroke-width="3"/>
      <rect x="62" y="32" width="16" height="14" rx="4" fill="#fdf3d0" stroke="${INK}" stroke-width="2.6"/>
      <rect x="18" y="28" width="12" height="16" rx="3" fill="#7f8c9b" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="24" cy="22" rx="9" ry="5" fill="#cfd8e3" stroke="${INK}" stroke-width="2.4"/>
      <circle cx="20" cy="14" r="4.6" fill="#e3eaf2" stroke="${INK}" stroke-width="2" opacity="0.95"/>
      <circle cx="12" cy="8" r="6" fill="#eef3f9" stroke="${INK}" stroke-width="2" opacity="0.85"/>
      <circle cx="25" cy="4.5" r="3.6" fill="#f5f8fc" stroke="${INK}" stroke-width="1.8" opacity="0.75"/>
      <circle cx="28" cy="82" r="9" fill="#6b5aa0" stroke="${INK}" stroke-width="3"/>
      <circle cx="58" cy="82" r="9" fill="#6b5aa0" stroke="${INK}" stroke-width="3"/>
      <circle cx="28" cy="82" r="3" fill="#fdf3d0"/>
      <circle cx="58" cy="82" r="3" fill="#fdf3d0"/>
      <rect x="84" y="56" width="10" height="10" rx="3" fill="#e05d5d" stroke="${INK}" stroke-width="2.6"/>
    </svg>`;
}

/** A friendly passenger face for an occupied seat. */
export function passengerSvg(): string {
  return `<svg class="number-train__passenger-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle cx="50" cy="52" r="34" fill="#f5a86b" stroke="${INK}" stroke-width="4"/>
      <circle cx="40" cy="47" r="4.4" fill="${INK}"/>
      <circle cx="60" cy="47" r="4.4" fill="${INK}"/>
      <path d="M40 62 q10 8 20 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
}
