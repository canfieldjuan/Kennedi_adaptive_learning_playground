/**
 * Illustrated Bear Cafe foods — local inline SVG (no external assets), matching
 * the illustrated bear's flat, rounded, ink-outlined style. Second surface of
 * the illustrated art standard (issue #3). Recognizability matters (this is a
 * learning game), so shapes are kept simple and iconic. Unknown ids fall back to
 * a neutral plate so nothing renders blank.
 */

const INK = '#3a2461';

function svg(inner: string): string {
  // Cropped viewBox (not 0 0 100 100): the food art is drawn with padding, so a
  // tight box makes it fill its container like the emoji glyph it replaced.
  return `<svg class="food-art" viewBox="13 15 74 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;
}

const FOOD_ART: Record<string, string> = {
  banana: svg(`
    <path d="M33 25 C 20 45, 25 68, 48 77 C 63 82, 79 76, 83 65 C 73 70, 61 69, 51 62 C 36 52, 32 39, 39 27 C 37 24, 34 22, 33 25 Z"
      fill="#ffd23e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 30 C 35 44, 39 58, 51 66" fill="none" stroke="#ffe27a" stroke-width="3" stroke-linecap="round"/>
    <path d="M33 25 q-2 -6 5 -7" fill="none" stroke="#8a5a34" stroke-width="4" stroke-linecap="round"/>
    <circle cx="82" cy="66" r="2.8" fill="#6b4a2a"/>`),

  apple: svg(`
    <path d="M50 34 q22 -8 26 16 q3 22 -12 32 q-8 5 -14 -1 q-6 6 -14 1 q-15 -10 -12 -32 q4 -24 26 -16 z"
      fill="#ef5b62" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 34 q-1 -8 2 -13" fill="none" stroke="#7a4a2a" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M52 24 q10 -6 15 1 q-9 5 -15 -1 z" fill="#7bc47f" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`),

  berry: svg(`
    <circle cx="38" cy="55" r="17" fill="#5b74d6" stroke="${INK}" stroke-width="3"/>
    <circle cx="64" cy="46" r="15" fill="#6f86e0" stroke="${INK}" stroke-width="3"/>
    <circle cx="60" cy="66" r="13" fill="#4d64c6" stroke="${INK}" stroke-width="3"/>
    <path d="M34 51 l-3 -3 M60 42 l-3 -3 M56 62 l-3 -3" stroke="#cdd7f7" stroke-width="3" stroke-linecap="round"/>`),

  bread: svg(`
    <path d="M20 60 q0 -26 30 -26 q30 0 30 26 q0 6 -6 6 h-48 q-6 0 -6 -6 z"
      fill="#e0a86a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="18" y="60" width="64" height="14" rx="6" fill="#c98a4c" stroke="${INK}" stroke-width="3"/>
    <path d="M36 48 q3 -5 6 0 M50 45 q3 -5 6 0 M64 48 q3 -5 6 0" fill="none" stroke="#a9702f" stroke-width="2.6" stroke-linecap="round"/>`),

  cookie: svg(`
    <circle cx="50" cy="52" r="30" fill="#d8a45e" stroke="${INK}" stroke-width="3"/>
    <circle cx="40" cy="44" r="4" fill="#5a3620"/>
    <circle cx="60" cy="41" r="3.4" fill="#5a3620"/>
    <circle cx="63" cy="60" r="4" fill="#5a3620"/>
    <circle cx="43" cy="63" r="3.4" fill="#5a3620"/>
    <circle cx="51" cy="52" r="3" fill="#5a3620"/>`),

  cupcake: svg(`
    <path d="M30 52 q20 -22 40 0 z" fill="#f6a5c0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M34 54 q16 -14 32 0 q3 6 -2 8 q-14 -8 -28 0 q-5 -2 -2 -8 z" fill="#f6a5c0" stroke="${INK}" stroke-width="2.4"/>
    <path d="M32 56 h36 l-5 24 q-1 4 -5 4 h-16 q-4 0 -5 -4 z"
      fill="#f6d06a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 56 l-3 28 M50 56 v28 M60 56 l3 28" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="50" cy="34" r="4.5" fill="#e0495c" stroke="${INK}" stroke-width="2.2"/>`),

  soup: svg(`
    <path d="M20 54 h60 q0 24 -30 24 q-30 0 -30 -24 z"
      fill="#f0e2c0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="50" cy="54" rx="30" ry="8" fill="#f4a24b" stroke="${INK}" stroke-width="3"/>
    <path d="M40 40 q4 -6 0 -12 M52 38 q4 -6 0 -12 M64 40 q4 -6 0 -12"
      fill="none" stroke="#c9b48a" stroke-width="3" stroke-linecap="round"/>`),
};

export function renderFoodArt(foodId: string): string {
  return (
    FOOD_ART[foodId] ??
    svg(`<circle cx="50" cy="54" r="26" fill="#f0e2c0" stroke="${INK}" stroke-width="3"/>`)
  );
}
