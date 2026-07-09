/**
 * Pip — the recurring Word-game character. Local, inline SVG (no external
 * assets, no network), matching the Bear Cafe illustrated standard (ink-outline
 * `#3a2461`, viewBox 0 0 100 100, a mouth/eye swap per state). Pip mouths the
 * target sound so the child sees how the sound is made, and "comes alive"
 * (cheers) when the word is found. Not a reward loop — a single deterministic
 * reaction to a correct match.
 *
 * The mouth shapes are child-legible visemes, not phonetic precision:
 * - bilabial (/b/, /m/): lips pressed together
 * - sibilant (/s/): a narrow smile showing teeth
 * - open (/c/=/k/): an open rounded mouth
 * - tongue (/t/): an open mouth with the tongue tip up
 * - idle: a calm closed smile
 * - cheer: a wide open happy smile (the "word comes alive" beat)
 */

export type CharacterMouth =
  | 'idle'
  | 'bilabial'
  | 'sibilant'
  | 'open'
  | 'tongue'
  | 'cheer';

const INK = '#3a2461';
const FUR = '#f5a86b';
const FUR_STROKE = '#d9824a';
const INNER_EAR = '#f8cfe0';
const MUZZLE = '#ffe6cf';
const CHEEK = '#f5928a';
const TONGUE = '#f47a86';
const TEETH = '#ffffff';

/**
 * Map an activity's initial-sound letter to Pip's mouth shape. Unknown sounds
 * fall back to `idle` so a new activity never renders a broken face.
 */
export function mouthForSound(sound: string | undefined): CharacterMouth {
  switch ((sound ?? '').trim().toLowerCase()) {
    case 'b':
    case 'm':
    case 'p':
      return 'bilabial';
    case 's':
    case 'z':
      return 'sibilant';
    case 'c':
    case 'k':
    case 'g':
      return 'open';
    case 't':
    case 'd':
    case 'n':
      return 'tongue';
    default:
      return 'idle';
  }
}

function eyes(mouth: CharacterMouth): string {
  if (mouth === 'cheer') {
    // Upturned happy eyes.
    return `
      <path d="M34 46 q6 -7 12 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M54 46 q6 -7 12 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
    `;
  }
  if (mouth === 'idle') {
    // Calm round eyes.
    return `
      <circle cx="40" cy="47" r="4" fill="${INK}"/>
      <circle cx="60" cy="47" r="4" fill="${INK}"/>
    `;
  }
  // Bright, attentive eyes while sounding out.
  return `
    <circle cx="40" cy="47" r="5.2" fill="${INK}"/>
    <circle cx="60" cy="47" r="5.2" fill="${INK}"/>
    <circle cx="41.8" cy="45.2" r="1.7" fill="#ffffff"/>
    <circle cx="61.8" cy="45.2" r="1.7" fill="#ffffff"/>
  `;
}

function mouthShape(mouth: CharacterMouth): string {
  switch (mouth) {
    case 'bilabial':
      // Lips pressed together: a soft closed line with a centre seam.
      return `
        <path d="M41 68 q9 4 18 0" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M41 71 q9 3 18 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      `;
    case 'sibilant':
      // Narrow smile showing a teeth strip.
      return `
        <path d="M40 66 q10 8 20 0 q-10 4 -20 0 Z" fill="${INK}"/>
        <rect x="43" y="66.5" width="14" height="3.2" rx="1.4" fill="${TEETH}"/>
      `;
    case 'open':
      // Open rounded mouth (/k/), small tongue at the base.
      return `
        <ellipse cx="50" cy="69" rx="8" ry="9" fill="${INK}"/>
        <ellipse cx="50" cy="75" rx="5" ry="3.4" fill="${TONGUE}"/>
      `;
    case 'tongue':
      // Open mouth with the tongue tip lifted (/t/).
      return `
        <ellipse cx="50" cy="69" rx="7.5" ry="7.5" fill="${INK}"/>
        <ellipse cx="50" cy="65" rx="4.2" ry="3" fill="${TONGUE}"/>
      `;
    case 'cheer':
      // Wide open happy smile — the "word comes alive" beat.
      return `
        <path d="M37 64 q13 16 26 0 q-13 6 -26 0 Z" fill="${INK}"/>
        <path d="M40 65 q10 2 20 0" fill="none" stroke="${TEETH}" stroke-width="3.4" stroke-linecap="round"/>
        <ellipse cx="50" cy="73" rx="6" ry="3.6" fill="${TONGUE}"/>
      `;
    case 'idle':
    default:
      // Calm closed smile.
      return `
        <path d="M42 67 q8 6 16 0" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
      `;
  }
}

export function renderPhonicsCharacterArt(mouth: CharacterMouth): string {
  return `<svg class="phonics-character__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <g stroke="${FUR_STROKE}" stroke-width="2.5" stroke-linejoin="round">
        <circle cx="28" cy="26" r="12" fill="${FUR}"/>
        <circle cx="72" cy="26" r="12" fill="${FUR}"/>
        <circle cx="50" cy="55" r="35" fill="${FUR}"/>
      </g>
      <circle cx="28" cy="26" r="6" fill="${INNER_EAR}"/>
      <circle cx="72" cy="26" r="6" fill="${INNER_EAR}"/>
      <ellipse cx="30" cy="64" rx="6.4" ry="4.8" fill="${CHEEK}"/>
      <ellipse cx="70" cy="64" rx="6.4" ry="4.8" fill="${CHEEK}"/>
      <ellipse cx="50" cy="63" rx="20" ry="15" fill="${MUZZLE}"/>
      <ellipse cx="50" cy="55" rx="5.6" ry="4.4" fill="${INK}"/>
      ${eyes(mouth)}
      ${mouthShape(mouth)}
    </svg>`;
}
