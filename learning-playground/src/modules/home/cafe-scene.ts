/**
 * Bear Cafe environment — a local inline-SVG backdrop for the child home screen
 * (no external assets). Sits softened behind the activity cards to set the cafe
 * mood without competing with the play. Illustrated in the same style as the
 * bear, foods, and decorations.
 */

const CAFE_SCENE_SVG = `<svg viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <rect width="480" height="340" fill="#fcefdd"/>
  <rect y="212" width="480" height="128" fill="#f5dcc0"/>
  <rect y="208" width="480" height="6" fill="#e6c39c"/>
  <g>
    <rect x="42" y="52" width="150" height="132" rx="14" fill="#b3743e"/>
    <rect x="50" y="60" width="134" height="116" rx="9" fill="#ffcf9a"/>
    <rect x="50" y="60" width="134" height="46" rx="9" fill="#ffe1a8"/>
    <circle cx="150" cy="92" r="15" fill="#fff3c4"/>
    <rect x="119" y="60" width="8" height="116" fill="#b3743e"/>
    <rect x="50" y="114" width="134" height="8" fill="#b3743e"/>
    <rect x="36" y="180" width="162" height="12" rx="4" fill="#c88a52"/>
    <path d="M96 180 q-10 -22 -2 -34 q8 8 4 34 z" fill="#7cb342" stroke="#3a2461" stroke-width="2"/>
    <path d="M104 180 q12 -18 24 -18 q-4 14 -22 18 z" fill="#8bc34a" stroke="#3a2461" stroke-width="2"/>
    <path d="M92 180 h30 l-4 -14 h-22 z" fill="#e07a5f" stroke="#3a2461" stroke-width="2.4" stroke-linejoin="round"/>
  </g>
  <g>
    <line x1="250" y1="20" x2="262" y2="52" stroke="#8a5a34" stroke-width="3"/>
    <line x1="370" y1="20" x2="358" y2="52" stroke="#8a5a34" stroke-width="3"/>
    <rect x="238" y="50" width="144" height="60" rx="12" fill="#c88a52" stroke="#8a5a34" stroke-width="3"/>
    <rect x="246" y="58" width="128" height="44" rx="8" fill="#fbe4c8"/>
    <text x="310" y="88" font-family="'Comic Sans MS','Segoe UI',sans-serif" font-size="24" font-weight="800" fill="#3a2461" text-anchor="middle">Bear Cafe</text>
  </g>
  <g>
    <line x1="430" y1="20" x2="430" y2="58" stroke="#8a5a34" stroke-width="3"/>
    <path d="M414 58 h32 l-6 16 h-20 z" fill="#3a2461"/>
    <circle cx="430" cy="80" r="9" fill="#ffe27a" stroke="#3a2461" stroke-width="2"/>
    <circle cx="430" cy="80" r="18" fill="#ffe27a" opacity="0.22"/>
  </g>
  <rect x="0" y="238" width="480" height="20" fill="#c88a52" stroke="#3a2461" stroke-width="3"/>
  <rect x="0" y="256" width="480" height="84" fill="#b3743e"/>
  <g transform="translate(70,206)">
    <path d="M0 6 q10 -3 8 4 q-1 6 -8 4" fill="none" stroke="#3a2461" stroke-width="3"/>
    <path d="M-16 0 h30 l-3 26 q-1 6 -7 6 h-10 q-6 0 -7 -6 z" fill="#ffffff" stroke="#3a2461" stroke-width="3" stroke-linejoin="round"/>
    <path d="M-14 6 h26" stroke="#f2c6d6" stroke-width="4" stroke-linecap="round"/>
    <path d="M-6 -12 q4 -6 0 -12 M2 -12 q4 -6 0 -12" fill="none" stroke="#e6c39c" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g transform="translate(240,190)">
    <ellipse cx="0" cy="46" rx="34" ry="7" fill="#e9c48f" stroke="#3a2461" stroke-width="3"/>
    <rect x="-3" y="30" width="6" height="16" fill="#c88a52"/>
    <ellipse cx="0" cy="30" rx="30" ry="6" fill="#f6e3b8" stroke="#3a2461" stroke-width="3"/>
    <path d="M-16 30 q16 -30 32 0 z" fill="#f6d06a" stroke="#3a2461" stroke-width="3" stroke-linejoin="round"/>
    <path d="M-13 22 q13 -20 26 0 q2 5 -3 7 q-11 -7 -20 0 q-5 -2 -3 -7 z" fill="#f6a5c0" stroke="#3a2461" stroke-width="2.4"/>
    <circle cx="0" cy="2" r="4" fill="#e0495c" stroke="#3a2461" stroke-width="2"/>
  </g>
  <g transform="translate(400,196)">
    <rect x="-22" y="0" width="44" height="42" rx="12" fill="#cfe9f8" stroke="#3a2461" stroke-width="3" opacity="0.92"/>
    <rect x="-26" y="-8" width="52" height="12" rx="6" fill="#b3743e" stroke="#3a2461" stroke-width="3"/>
    <circle cx="-8" cy="18" r="6" fill="#d8a45e" stroke="#3a2461" stroke-width="2"/>
    <circle cx="8" cy="26" r="6" fill="#d8a45e" stroke="#3a2461" stroke-width="2"/>
    <circle cx="6" cy="12" r="5" fill="#d8a45e" stroke="#3a2461" stroke-width="2"/>
  </g>
</svg>`;

export function createCafeBackdrop(): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'cafe-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML = CAFE_SCENE_SVG;
  return backdrop;
}
