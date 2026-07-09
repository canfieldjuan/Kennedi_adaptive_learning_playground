/**
 * Illustrated Bear Cafe decorations — local inline SVG matching the bear/food
 * style (flat, ink-outlined). The decorate step's toppings: bubbles, hearts,
 * sprinkles, stars. Unknown ids fall back to a small star.
 */

const INK = '#3a2461';

function svg(inner: string): string {
  return `<svg class="food-art" viewBox="13 15 74 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;
}

const DECORATION_ART: Record<string, string> = {
  stars: svg(`
    <path d="M50 24 L57 43 L77 43 L60 55 L66 75 L50 63 L34 75 L40 55 L23 43 L44 43 Z"
      fill="#ffd23e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`),

  hearts: svg(`
    <path d="M50 74 C 30 60, 20 46, 20 37 C 20 28, 28 24, 36 26 C 42 27, 47 32, 50 38 C 53 32, 58 27, 64 26 C 72 24, 80 28, 80 37 C 80 46, 70 60, 50 74 Z"
      fill="#f472b6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 34 C 30 36, 30 40, 32 43" fill="none" stroke="#ffd0e6" stroke-width="3" stroke-linecap="round"/>`),

  bubbles: svg(`
    <circle cx="43" cy="53" r="20" fill="#bfe3f5" stroke="${INK}" stroke-width="3"/>
    <circle cx="66" cy="40" r="12" fill="#d6eefb" stroke="${INK}" stroke-width="3"/>
    <circle cx="65" cy="64" r="9" fill="#cfe9f8" stroke="${INK}" stroke-width="3"/>
    <circle cx="37" cy="46" r="4.5" fill="#ffffff"/>
    <circle cx="62" cy="36" r="2.6" fill="#ffffff"/>`),

  sprinkles: svg(`
    <g stroke-linecap="round">
      <g stroke="${INK}" stroke-width="9">
        <line x1="28" y1="50" x2="41" y2="42"/>
        <line x1="52" y1="36" x2="66" y2="41"/>
        <line x1="57" y1="64" x2="71" y2="57"/>
        <line x1="30" y1="61" x2="41" y2="71"/>
        <line x1="44" y1="49" x2="59" y2="51"/>
      </g>
      <g stroke-width="5.5">
        <line x1="28" y1="50" x2="41" y2="42" stroke="#f472b6"/>
        <line x1="52" y1="36" x2="66" y2="41" stroke="#5b9bd5"/>
        <line x1="57" y1="64" x2="71" y2="57" stroke="#8ac249"/>
        <line x1="30" y1="61" x2="41" y2="71" stroke="#ffd23e"/>
        <line x1="44" y1="49" x2="59" y2="51" stroke="#f28b30"/>
      </g>
    </g>`),
};

export function renderDecorationArt(decorationId: string): string {
  return DECORATION_ART[decorationId] ?? DECORATION_ART.stars;
}
