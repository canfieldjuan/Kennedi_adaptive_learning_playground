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
    <path d="M22 60 C 26 47, 45 38, 61 36 C 69 35, 77 37, 77 43 C 78 49, 70 52, 59 54 C 44 57, 31 62, 26 71 C 23 68, 20 64, 22 60 Z"
      fill="#ffd23e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M31 57 C 35 48, 48 42, 60 42" fill="none" stroke="#ffe887" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 42 q5 -8 10 -4 q0 7 -7 8 z" fill="#8ac249" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M24 66 q-6 1 -6 6 q6 1 8 -4 z" fill="#8ac249" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`),

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
    <path d="M28 72 L28 50 C28 34 40 30 50 30 C60 30 72 34 72 50 L72 72 Q72 74 70 74 L30 74 Q28 74 28 72 Z"
      fill="#e6a55e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M33 69 L33 51 C33 40 42 36 50 36 C58 36 67 40 67 51 L67 69 Z" fill="#f8ecc8"/>
    <circle cx="43" cy="54" r="1.9" fill="#e6cf9e"/>
    <circle cx="55" cy="60" r="1.9" fill="#e6cf9e"/>
    <circle cx="49" cy="49" r="1.6" fill="#e6cf9e"/>`),

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
