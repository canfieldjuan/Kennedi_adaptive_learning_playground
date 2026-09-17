/**
 * Story Stage art — a compositional illustrated system (arc slice 4):
 * setting backdrops × character pose builders × per-beat scene props,
 * in the playground's illustrated standard (purple ink outlines, warm
 * flat fills, rounded forms, clear silhouettes). The picture must
 * communicate each scene before the narration does.
 *
 * Layering follows the spec's visual world: a low-contrast backdrop
 * (setting), the hero and story objects in the middle ground, and the
 * choice cards live outside the scene as real buttons. No text, no
 * emoji, no remote assets.
 */

const INK = '#3a2461';
const SKY = '#dcecf8';
const HILL = '#bcd9a8';
const HILL_DEEP = '#a3c98b';
const TRUNK = '#a5764a';
const LEAF = '#7cb98a';
const LEAF_DEEP = '#5da273';
const POPPY_DRESS = '#fd79a8';
const POPPY_SKIN = '#f6d3b3';
const POPPY_HAIR = '#8a5a34';
const BISCUIT_FUR = '#e8b04b';
const SPARKLE = '#f6c343';
const DRAGON = '#8fce9b';
const DRAGON_BELLY = '#e9f7e2';
const ROBOT = '#cdd7e6';
const ROBOT_DEEP = '#a9b8d0';
const UNICORN = '#fdf6fa';
const UNICORN_MANE = '#f2a3bd';
const MILO_FUR = '#c58a52';
const CASTLE_SKY = '#d8d4f2';
const CASTLE_WALL = '#f2ecfa';
const TOWN_SKY = '#fdeed7';
const TOWN_WALL = '#fbf3e4';
const CLOUD_SKY = '#d6ecfa';
const CLOUD_PUFF = '#f4faff';
const BOX_WOOD = '#d9a066';
const WAGON_RED = '#e98080';

interface ProductionSceneAsset {
  id: string;
  href: string;
}

const POPPY_FOREST_LOST_SCENE_ASSETS: Readonly<Record<string, ProductionSceneAsset>> = {
  'lost-intro': {
    id: 'story-stage-lost-intro-poppy-forest',
    href: '/assets/images/story-stage-lost-intro-poppy-forest.svg',
  },
  'lost-problem': {
    id: 'story-stage-lost-problem-poppy-forest',
    href: '/assets/images/story-stage-lost-problem-poppy-forest.svg',
  },
  'lost-where': {
    id: 'story-stage-lost-where-poppy-forest',
    href: '/assets/images/story-stage-lost-where-poppy-forest.svg',
  },
  'lost-bush': {
    id: 'story-stage-lost-bush-poppy-forest',
    href: '/assets/images/story-stage-lost-bush-poppy-forest.svg',
  },
  'lost-log': {
    id: 'story-stage-lost-log-proof',
    href: '/assets/images/story-stage-lost-log-proof.svg',
  },
  'lost-help': {
    id: 'story-stage-lost-help-poppy-forest',
    href: '/assets/images/story-stage-lost-help-poppy-forest.svg',
  },
  'lost-ending': {
    id: 'story-stage-lost-ending-poppy-forest',
    href: '/assets/images/story-stage-lost-ending-poppy-forest.svg',
  },
};

const POPPY_FOREST_DELIVERY_SCENE_ASSETS: Readonly<Record<string, ProductionSceneAsset>> = {
  'delivery-intro': {
    id: 'story-stage-delivery-intro-poppy-forest',
    href: '/assets/images/story-stage-delivery-intro-poppy-forest.svg',
  },
  'delivery-problem': {
    id: 'story-stage-delivery-problem-poppy-forest',
    href: '/assets/images/story-stage-delivery-problem-poppy-forest.svg',
  },
  'delivery-route': {
    id: 'story-stage-delivery-route-poppy-forest',
    href: '/assets/images/story-stage-delivery-route-poppy-forest.svg',
  },
  'delivery-bridge': {
    id: 'story-stage-delivery-bridge-poppy-forest',
    href: '/assets/images/story-stage-delivery-bridge-poppy-forest.svg',
  },
  'delivery-meadow': {
    id: 'story-stage-delivery-meadow-poppy-forest',
    href: '/assets/images/story-stage-delivery-meadow-poppy-forest.svg',
  },
  'delivery-protect': {
    id: 'story-stage-delivery-protect-poppy-forest',
    href: '/assets/images/story-stage-delivery-protect-poppy-forest.svg',
  },
  'delivery-ending-high': {
    id: 'story-stage-delivery-ending-high-poppy-forest',
    href: '/assets/images/story-stage-delivery-ending-high-poppy-forest.svg',
  },
  'delivery-ending-wagon': {
    id: 'story-stage-delivery-ending-wagon-poppy-forest',
    href: '/assets/images/story-stage-delivery-ending-wagon-poppy-forest.svg',
  },
};

const POPPY_COZY_TOWN_LOST_SCENE_ASSETS: Readonly<Record<string, ProductionSceneAsset>> = {
  'lost-intro': {
    id: 'story-stage-lost-intro-poppy-cozy-town',
    href: '/assets/images/story-stage-lost-intro-poppy-cozy-town.svg',
  },
  'lost-problem': {
    id: 'story-stage-lost-problem-poppy-cozy-town',
    href: '/assets/images/story-stage-lost-problem-poppy-cozy-town.svg',
  },
  'lost-where': {
    id: 'story-stage-lost-where-poppy-cozy-town',
    href: '/assets/images/story-stage-lost-where-poppy-cozy-town.svg',
  },
  'lost-bush': {
    id: 'story-stage-lost-bush-poppy-cozy-town',
    href: '/assets/images/story-stage-lost-bush-poppy-cozy-town.svg',
  },
  'lost-log': {
    id: 'story-stage-lost-log-poppy-cozy-town',
    href: '/assets/images/story-stage-lost-log-poppy-cozy-town.svg',
  },
  'lost-help': {
    id: 'story-stage-lost-help-poppy-cozy-town',
    href: '/assets/images/story-stage-lost-help-poppy-cozy-town.svg',
  },
  'lost-ending': {
    id: 'story-stage-lost-ending-poppy-cozy-town',
    href: '/assets/images/story-stage-lost-ending-poppy-cozy-town.svg',
  },
};

const POPPY_CLOUD_VILLAGE_DELIVERY_SCENE_ASSETS: Readonly<
  Record<string, ProductionSceneAsset>
> = {
  'delivery-intro': {
    id: 'story-stage-delivery-intro-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-intro-poppy-cloud-village.svg',
  },
  'delivery-problem': {
    id: 'story-stage-delivery-problem-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-problem-poppy-cloud-village.svg',
  },
  'delivery-route': {
    id: 'story-stage-delivery-route-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-route-poppy-cloud-village.svg',
  },
  'delivery-bridge': {
    id: 'story-stage-delivery-bridge-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-bridge-poppy-cloud-village.svg',
  },
  'delivery-meadow': {
    id: 'story-stage-delivery-meadow-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-meadow-poppy-cloud-village.svg',
  },
  'delivery-protect': {
    id: 'story-stage-delivery-protect-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-protect-poppy-cloud-village.svg',
  },
  'delivery-ending-high': {
    id: 'story-stage-delivery-ending-high-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-ending-high-poppy-cloud-village.svg',
  },
  'delivery-ending-wagon': {
    id: 'story-stage-delivery-ending-wagon-poppy-cloud-village',
    href: '/assets/images/story-stage-delivery-ending-wagon-poppy-cloud-village.svg',
  },
};

export type StoryMood = 'happy' | 'worried' | 'curious' | 'celebrating';

/** Shared face marks so every character emotes in the same language. */
function faceMarks(mood: StoryMood, y: number, spread: number): string {
  const eyeL = -spread;
  const eyeR = spread;
  if (mood === 'worried') {
    return `<circle cx="${eyeL}" cy="${y}" r="1.8" fill="${INK}"/><circle cx="${eyeR}" cy="${y}" r="1.8" fill="${INK}"/><path d="M${eyeL - 1} ${y + 7} q${spread + 1} -3 ${spread * 2 + 2} 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M${eyeL - 4} ${y - 5} q4 -3 7 -1 M${eyeR + 4} ${y - 6} q-4 -2 -7 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  if (mood === 'curious') {
    return `<circle cx="${eyeL}" cy="${y}" r="2.2" fill="${INK}"/><circle cx="${eyeR}" cy="${y}" r="2.2" fill="${INK}"/><ellipse cx="${(eyeL + eyeR) / 2 + 1}" cy="${y + 8}" rx="2.6" ry="3.2" fill="${INK}"/>`;
  }
  if (mood === 'celebrating') {
    return `<path d="M${eyeL - 3} ${y - 1} q3 3 6 0 M${eyeR - 3} ${y - 1} q3 3 6 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M${eyeL} ${y + 7} q${spread} 6 ${spread * 2} 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><ellipse cx="${eyeL - 6}" cy="${y + 5}" rx="2.6" ry="1.8" fill="#f2a3bd" opacity="0.7"/><ellipse cx="${eyeR + 6}" cy="${y + 5}" rx="2.6" ry="1.8" fill="#f2a3bd" opacity="0.7"/>`;
  }
  return `<circle cx="${eyeL}" cy="${y}" r="2" fill="${INK}"/><circle cx="${eyeR}" cy="${y}" r="2" fill="${INK}"/><path d="M${eyeL + 1} ${y + 7} q${spread - 1} 4 ${spread * 2 - 2} 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
}

/** Princess Poppy the explorer, one flat group at (x, y), ~90 tall. */
function poppy(mood: StoryMood, x: number, y: number): string {
  const arms = mood === 'celebrating'
    ? `<path d="M-14 -34 q-8 -8 -10 -16 M16 -34 q8 -8 10 -16" fill="none" stroke="${POPPY_SKIN}" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M-14 -32 q-9 4 -11 12 M16 -32 q9 4 11 12" fill="none" stroke="${POPPY_SKIN}" stroke-width="6" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y})">
    ${arms}
    <path d="M-16 0 L-11 -38 h24 L18 0 Z" fill="${POPPY_DRESS}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="-11" y="2" width="9" height="7" rx="3" fill="${TRUNK}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="4" y="2" width="9" height="7" rx="3" fill="${TRUNK}" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="1" cy="-56" r="15" fill="${POPPY_SKIN}" stroke="${INK}" stroke-width="3"/>
    <path d="M-14 -60 q-3 12 3 16 M16 -60 q3 12 -3 16" fill="none" stroke="${POPPY_HAIR}" stroke-width="5" stroke-linecap="round"/>
    <path d="M-15 -62 a16 16 0 0 1 32 0 l-4 3 a13 13 0 0 0 -24 0 Z" fill="${POPPY_HAIR}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-19 -64 h40 l-5 -7 h-30 Z" fill="#e8c07a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-6 -71 l4 -6 3 4 3 -4 3 6 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="2"/>
    <g transform="translate(1 -58)">${faceMarks(mood, -2, 6)}</g>
  </g>`;
}

/** Finn the friendly dragon, ~90 tall at (x, y). */
function finn(mood: StoryMood, x: number, y: number): string {
  const wings = mood === 'celebrating'
    ? `<path d="M-20 -44 q-14 -12 -12 -24 q10 4 14 14 Z M22 -44 q14 -12 12 -24 q-10 4 -14 14 Z" fill="${DRAGON}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`
    : `<path d="M-20 -38 q-14 -4 -16 -14 q10 -2 18 6 Z M22 -38 q14 -4 16 -14 q-10 -2 -18 6 Z" fill="${DRAGON}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  return `<g transform="translate(${x} ${y})">
    ${wings}
    <path d="M20 -14 q14 4 18 -6 q4 -8 -4 -10 q2 10 -14 8 Z" fill="${DRAGON}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <ellipse cx="0" cy="-24" rx="22" ry="26" fill="${DRAGON}" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="0" cy="-18" rx="13" ry="17" fill="${DRAGON_BELLY}" stroke="${INK}" stroke-width="2.2"/>
    <rect x="-14" y="-2" width="10" height="9" rx="4" fill="${DRAGON}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="5" y="-2" width="10" height="9" rx="4" fill="${DRAGON}" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="0" cy="-58" r="16" fill="${DRAGON}" stroke="${INK}" stroke-width="3"/>
    <path d="M-9 -71 q-2 -8 5 -10 q1 6 -1 10 Z M9 -71 q2 -8 -5 -10 q-1 6 1 10 Z" fill="${DRAGON_BELLY}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <g transform="translate(0 -60)">${faceMarks(mood, -2, 6)}</g>
  </g>`;
}

/** Robo the helpful robot, ~88 tall at (x, y). */
function robo(mood: StoryMood, x: number, y: number): string {
  const arms = mood === 'celebrating'
    ? `<path d="M-16 -36 q-10 -8 -11 -18 M16 -36 q10 -8 11 -18" fill="none" stroke="${ROBOT_DEEP}" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M-16 -32 q-10 4 -11 12 M16 -32 q10 4 11 12" fill="none" stroke="${ROBOT_DEEP}" stroke-width="6" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y})">
    ${arms}
    <rect x="-17" y="-44" width="34" height="44" rx="10" fill="${ROBOT}" stroke="${INK}" stroke-width="3"/>
    <rect x="-9" y="-30" width="18" height="14" rx="4" fill="${SPARKLE}" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="-8" cy="4" r="6" fill="${ROBOT_DEEP}" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="8" cy="4" r="6" fill="${ROBOT_DEEP}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="-14" y="-76" width="28" height="26" rx="9" fill="${ROBOT}" stroke="${INK}" stroke-width="3"/>
    <path d="M0 -76 v-8" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="0" cy="-87" r="4" fill="${SPARKLE}" stroke="${INK}" stroke-width="2.2"/>
    <g transform="translate(0 -62)">${faceMarks(mood, -2, 6)}</g>
  </g>`;
}

/** Luna the gentle unicorn, ~86 tall at (x, y). */
function luna(mood: StoryMood, x: number, y: number): string {
  const forelegs = mood === 'celebrating'
    ? `<path d="M-12 -30 q-8 -10 -8 -18 M12 -30 q8 -10 8 -18" fill="none" stroke="${UNICORN}" stroke-width="7" stroke-linecap="round"/>`
    : `<path d="M-12 -26 q-6 10 -6 22 M12 -26 q6 10 6 22" fill="none" stroke="${UNICORN}" stroke-width="7" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y})">
    <path d="M-22 -38 q-12 4 -12 18 q0 12 10 16 q4 -8 0 -14 q8 -2 8 -12 Z" fill="${UNICORN_MANE}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    ${forelegs}
    <ellipse cx="0" cy="-26" rx="22" ry="20" fill="${UNICORN}" stroke="${INK}" stroke-width="3"/>
    <rect x="-16" y="-8" width="9" height="12" rx="4" fill="${UNICORN}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="8" y="-8" width="9" height="12" rx="4" fill="${UNICORN}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M12 -66 l7 -9 3 10 Z" fill="${UNICORN}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="2" cy="-56" r="15" fill="${UNICORN}" stroke="${INK}" stroke-width="3"/>
    <path d="M-14 -62 q-9 0 -13 7 q5 6 13 4 q-3 8 3 12 q6 -3 6 -10 Z" fill="${UNICORN_MANE}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M-4 -70 q-8 -3 -14 1 q4 7 12 5 Z" fill="${UNICORN_MANE}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M2 -70 l5 -16 6 15 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M4.5 -75 l6 -3 M5.5 -80 l4 -2" stroke="${INK}" stroke-width="1.2" opacity="0.6"/>
    <ellipse cx="9" cy="-49" rx="4.4" ry="3.4" fill="#fbe9f1" stroke="${INK}" stroke-width="1.6"/>
    <g transform="translate(2 -58)">${faceMarks(mood, -2, 5.5)}</g>
  </g>`;
}

/** Milo the playful puppy, ~74 tall at (x, y) — hero-sized, unlike Biscuit. */
function milo(mood: StoryMood, x: number, y: number): string {
  const tail = mood === 'celebrating' || mood === 'happy'
    ? `<path d="M20 -18 q12 -8 10 -20" fill="none" stroke="${MILO_FUR}" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M20 -14 q10 2 13 -4" fill="none" stroke="${MILO_FUR}" stroke-width="6" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y})">
    ${tail}
    <ellipse cx="0" cy="-18" rx="20" ry="20" fill="${MILO_FUR}" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="0" cy="-12" rx="11" ry="12" fill="#eed3ae" stroke="${INK}" stroke-width="2.2"/>
    <rect x="-14" y="-2" width="10" height="9" rx="4" fill="${MILO_FUR}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="4" y="-2" width="10" height="9" rx="4" fill="${MILO_FUR}" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="0" cy="-50" r="16" fill="${MILO_FUR}" stroke="${INK}" stroke-width="3"/>
    <path d="M-14 -60 q-8 4 -8 16 q7 2 11 -5 Z M14 -60 q8 4 8 16 q-7 2 -11 -5 Z" fill="${TRUNK}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <ellipse cx="0" cy="-45" rx="3" ry="2.4" fill="${INK}"/>
    <g transform="translate(0 -52)">${faceMarks(mood, -2, 6)}</g>
  </g>`;
}

/** Biscuit the golden puppy at (x, y), ~34 tall; peeking=true shows a peek. */
function biscuit(x: number, y: number, options: { peeking?: boolean; happy?: boolean } = {}): string {
  if (options.peeking) {
    return `<g transform="translate(${x} ${y})">
      <circle cx="0" cy="0" r="11" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="2.6"/>
      <path d="M-9 -7 q-4 8 1 10 Z M9 -7 q4 8 -1 10 Z" fill="${TRUNK}" stroke="${INK}" stroke-width="2"/>
      <circle cx="-3.5" cy="-1" r="1.8" fill="${INK}"/>
      <circle cx="3.5" cy="-1" r="1.8" fill="${INK}"/>
      <ellipse cx="0" cy="4" rx="2.4" ry="1.8" fill="${INK}"/>
      <path d="M0 5.4 q0 2.6 2.6 2.6" fill="none" stroke="${INK}" stroke-width="1.4"/>
      <ellipse cx="-6.5" cy="10.5" rx="3.4" ry="2.6" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="1.8"/>
      <ellipse cx="6.5" cy="10.5" rx="3.4" ry="2.6" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="1.8"/>
      <path d="M-7.5 10 v2 M-5.5 10 v2 M5.5 10 v2 M7.5 10 v2" stroke="${INK}" stroke-width="1"/>
    </g>`;
  }
  const tail = options.happy
    ? `<path d="M14 -4 q9 -7 7 -14" fill="none" stroke="${BISCUIT_FUR}" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M14 -2 q8 2 10 -3" fill="none" stroke="${BISCUIT_FUR}" stroke-width="5" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y})">
    ${tail}
    <ellipse cx="2" cy="0" rx="14" ry="10" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="-10" cy="-8" r="9" fill="${BISCUIT_FUR}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-17 -14 q-4 8 1 10 Z M-3 -14 q4 8 -1 10 Z" fill="${TRUNK}" stroke="${INK}" stroke-width="2"/>
    <circle cx="-13" cy="-9" r="1.6" fill="${INK}"/>
    <circle cx="-7" cy="-9" r="1.6" fill="${INK}"/>
    <ellipse cx="-10" cy="-5" rx="2" ry="1.6" fill="${INK}"/>
    <path d="M-4 8 v3 M6 8 v3" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}

const CHARACTER_ART: Record<string, (mood: StoryMood, x: number, y: number) => string> = {
  poppy,
  finn,
  robo,
  luna,
  milo,
};

function heroAt(ctx: SceneArtContext, mood: StoryMood, x: number, y: number): string {
  const builder = CHARACTER_ART[ctx.characterArt] ?? poppy;
  return builder(mood, x, y);
}

function tree(x: number, y: number, scale: number): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="-5" y="-6" width="10" height="26" rx="4" fill="${TRUNK}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="0" cy="-26" r="24" fill="${LEAF}" stroke="${INK}" stroke-width="3"/>
    <circle cx="-16" cy="-14" r="14" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="16" cy="-14" r="14" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
  </g>`;
}

function sparkleStar(x: number, y: number, size: number): string {
  const s = size;
  return `<path d="M${x} ${y - s} l${s * 0.3} ${s * 0.7} ${s * 0.7} ${s * 0.3} -${s * 0.7} ${s * 0.3} -${s * 0.3} ${s * 0.7} -${s * 0.3} -${s * 0.7} -${s * 0.7} -${s * 0.3} ${s * 0.7} -${s * 0.3} Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.6"/>`;
}

function owl(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="0" rx="13" ry="16" fill="#b98ac9" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-11 -13 l5 -7 4 5 4 -5 5 7" fill="#b98ac9" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M-10 -8 q5 -4 10 -1 M0 -9 q5 -3 10 1" fill="#d3b3de" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="-5" cy="-4" r="4.6" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <circle cx="5" cy="-4" r="4.6" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <circle cx="-4.4" cy="-3.6" r="2" fill="${INK}"/>
    <circle cx="5.6" cy="-3.6" r="2" fill="${INK}"/>
    <circle cx="-3.6" cy="-4.4" r="0.7" fill="#ffffff"/>
    <circle cx="6.4" cy="-4.4" r="0.7" fill="#ffffff"/>
    <path d="M-2 2 l2 3.4 2 -3.4 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-12 2 q-3 6 1 10 M12 2 q3 6 -1 10" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M-8 8 q8 5 16 0" fill="none" stroke="${INK}" stroke-width="1.8" opacity="0.55"/>
  </g>`;
}

// ——— Setting backdrops (400×250 stages, low-contrast, ground strip) ———

function forest(extra = ''): string {
  return `<rect x="0" y="0" width="400" height="250" fill="${SKY}"/>
  <path d="M0 150 q100 -34 200 -16 q110 20 200 -8 v124 h-400 Z" fill="${HILL}"/>
  <path d="M0 190 q120 -26 240 -8 q90 12 160 -4 v72 h-400 Z" fill="${HILL_DEEP}"/>
  ${tree(52, 158, 0.9)}
  ${tree(352, 150, 1.05)}
  ${sparkleStar(120, 52, 7)}
  ${sparkleStar(300, 38, 5)}
  ${sparkleStar(210, 70, 4)}
  ${extra}
  <rect x="0" y="228" width="400" height="22" fill="#9dbb84"/>`;
}

function moonCastle(extra = ''): string {
  const tower = (x: number, w: number, h: number) => `
    <rect x="${x}" y="${210 - h}" width="${w}" height="${h}" rx="6" fill="${CASTLE_WALL}" stroke="${INK}" stroke-width="2.6" opacity="0.9"/>
    <path d="M${x - 4} ${210 - h} h${w + 8} l-${w / 2 + 4} -${w * 0.7} Z" fill="#cbbcf0" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" opacity="0.9"/>
    <rect x="${x + w / 2 - 4} " y="${226 - h}" width="8" height="11" rx="4" fill="${SPARKLE}" opacity="0.85"/>`;
  return `<rect x="0" y="0" width="400" height="250" fill="${CASTLE_SKY}"/>
  <path d="M298 44 a20 20 0 1 0 12 36 a16 16 0 1 1 -12 -36 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="2" opacity="0.9"/>
  ${sparkleStar(80, 40, 5)}${sparkleStar(180, 28, 4)}${sparkleStar(348, 96, 4)}
  ${tower(40, 40, 92)}
  ${tower(140, 32, 66)}
  ${tower(322, 38, 84)}
  <path d="M0 196 q120 -18 240 -6 q90 8 160 -6 v66 h-400 Z" fill="#cbbfe8"/>
  ${extra}
  <rect x="0" y="228" width="400" height="22" fill="#bcaede"/>`;
}

function cozyTown(extra = ''): string {
  const house = (x: number, w: number, h: number, roof: string) => `
    <rect x="${x}" y="${206 - h}" width="${w}" height="${h}" rx="5" fill="${TOWN_WALL}" stroke="${INK}" stroke-width="2.6" opacity="0.92"/>
    <path d="M${x - 5} ${206 - h} h${w + 10} l-${w / 2 + 5} -${h * 0.45} Z" fill="${roof}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" opacity="0.92"/>
    <rect x="${x + w / 2 - 5}" y="${222 - h}" width="10" height="10" rx="3" fill="${SPARKLE}" opacity="0.85"/>`;
  return `<rect x="0" y="0" width="400" height="250" fill="${TOWN_SKY}"/>
  <circle cx="330" cy="52" r="18" fill="${SPARKLE}" stroke="${INK}" stroke-width="2" opacity="0.85"/>
  ${house(30, 52, 60, '#e8a1a1')}
  ${house(122, 44, 46, '#9fc7e8')}
  ${house(316, 50, 56, '#b0d9a5')}
  <path d="M0 200 q140 -16 280 -4 q70 6 120 -4 v58 h-400 Z" fill="#e8d7b4"/>
  ${extra}
  <rect x="0" y="228" width="400" height="22" fill="#d9c294"/>`;
}

function cloudVillage(extra = ''): string {
  const puff = (x: number, y: number, r: number) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2.4" opacity="0.9"/>
    <circle cx="${x - r * 0.8}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2.2" opacity="0.9"/>
    <circle cx="${x + r * 0.8}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2.2" opacity="0.9"/>`;
  return `<rect x="0" y="0" width="400" height="250" fill="${CLOUD_SKY}"/>
  <circle cx="70" cy="46" r="16" fill="${SPARKLE}" stroke="${INK}" stroke-width="2" opacity="0.85"/>
  ${puff(120, 90, 16)}
  ${puff(310, 66, 13)}
  ${puff(60, 150, 20)}
  <rect x="286" y="120" width="44" height="52" rx="14" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2.6" opacity="0.92"/>
  <path d="M280 122 h56 l-28 -26 Z" fill="#9fc7e8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" opacity="0.92"/>
  <rect x="302" y="146" width="12" height="12" rx="4" fill="${SPARKLE}" opacity="0.85"/>
  <path d="M0 196 q120 -22 250 -8 q90 8 150 -4 v66 h-400 Z" fill="#e6f2fb"/>
  ${extra}
  <rect x="0" y="228" width="400" height="22" fill="#cfe4f4"/>`;
}

const SETTING_BACKDROPS: Record<string, (extra?: string) => string> = {
  forest,
  'moon-castle': moonCastle,
  'cozy-town': cozyTown,
  'cloud-village': cloudVillage,
};

function backdropFor(ctx: SceneArtContext, extra: string): string {
  const builder = SETTING_BACKDROPS[ctx.settingArt] ?? forest;
  return builder(extra);
}

// ——— Story props ———

function pawPrints(): string {
  const paw = (x: number, y: number) =>
    `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="2" rx="3.4" ry="2.8" fill="${TRUNK}"/><circle cx="-3" cy="-2.4" r="1.3" fill="${TRUNK}"/><circle cx="0" cy="-3.4" r="1.3" fill="${TRUNK}"/><circle cx="3" cy="-2.4" r="1.3" fill="${TRUNK}"/></g>`;
  return paw(210, 208) + paw(238, 198) + paw(266, 206) + paw(294, 194);
}

function musicBox(x: number, y: number, state: 'quiet' | 'open' | 'singing'): string {
  const lid = state === 'quiet'
    ? `<rect x="-20" y="-34" width="40" height="10" rx="4" fill="${BOX_WOOD}" stroke="${INK}" stroke-width="2.4"/>`
    : `<path d="M-20 -26 l38 -16 4 8 -38 16 Z" fill="${BOX_WOOD}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  const notes = state === 'singing'
    ? `<path d="M26 -46 v-14 l10 -3 v14" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
       <ellipse cx="23" cy="-45" rx="3.6" ry="2.8" fill="${POPPY_DRESS}" stroke="${INK}" stroke-width="1.8"/>
       <ellipse cx="33" cy="-48" rx="3.6" ry="2.8" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.8"/>
       ${sparkleStar(-28, -44, 5)}`
    : state === 'open'
      ? `<circle cx="0" cy="-14" r="5" fill="${SPARKLE}" stroke="${INK}" stroke-width="2"/><path d="M0 -14 l3 -3" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`
      : `<path d="M26 -40 q4 6 0 10" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
  return `<g transform="translate(${x} ${y})">
    <rect x="-22" y="-26" width="44" height="26" rx="5" fill="${BOX_WOOD}" stroke="${INK}" stroke-width="2.6"/>
    <rect x="-14" y="-20" width="28" height="14" rx="3" fill="#f4e6b8" stroke="${INK}" stroke-width="2"/>
    ${lid}
    <path d="M22 -16 h8 M30 -16 a5 5 0 1 1 0 0.1" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
    ${notes}
    <rect x="-26" y="0" width="52" height="8" rx="3" fill="${TRUNK}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M-20 8 v8 M20 8 v8" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}

function toolkit(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})">
    <rect x="-16" y="-12" width="32" height="16" rx="4" fill="${WAGON_RED}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M-6 -12 v-4 h12 v4" fill="none" stroke="${INK}" stroke-width="2.4"/>
    <path d="M-26 -18 a7 7 0 1 0 5 -8 l6 6 -4 4 -6 -6 Z" fill="${ROBOT}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  </g>`;
}

function berryBasket(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})">
    <path d="M-16 -10 a16 10 0 0 0 32 0" fill="none" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-16 -10 h32 l-4 14 h-24 Z" fill="${TRUNK}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-13 -6 h26 M-12 -1 h24" stroke="${INK}" stroke-width="1.6" opacity="0.5"/>
    <circle cx="-8" cy="-13" r="4.6" fill="${SPARKLE}" stroke="${INK}" stroke-width="2"/>
    <circle cx="1" cy="-16" r="4.6" fill="#f0a35e" stroke="${INK}" stroke-width="2"/>
    <circle cx="9" cy="-12" r="4.6" fill="${SPARKLE}" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

function woodenBridge(): string {
  return `<g>
    <path d="M136 226 q64 -30 128 0" fill="none" stroke="${TRUNK}" stroke-width="12" stroke-linecap="round"/>
    <path d="M138 224 q62 -28 124 0" fill="none" stroke="${INK}" stroke-width="2" opacity="0.4"/>
    <path d="M150 222 v-16 M200 208 v-16 M250 222 v-16" stroke="${TRUNK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M150 206 q50 -22 100 0" fill="none" stroke="${INK}" stroke-width="2.4"/>
  </g>`;
}

function butterflies(): string {
  const fly = (x: number, y: number, tone: string) =>
    `<g transform="translate(${x} ${y})"><path d="M0 0 q-6 -7 -9 -1 q3 6 9 1 q6 -7 9 -1 q-3 6 -9 1" fill="${tone}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0 -2 v4" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/></g>`;
  return fly(180, 150, UNICORN_MANE) + fly(260, 126, '#9fc7e8') + fly(310, 168, SPARKLE);
}

function meadowFlowers(): string {
  const flower = (x: number, y: number, tone: string) =>
    `<g transform="translate(${x} ${y})"><path d="M0 10 v-8" stroke="${LEAF_DEEP}" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-4" r="3" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.6"/><circle cx="-4" cy="-6" r="2.6" fill="${tone}" stroke="${INK}" stroke-width="1.4"/><circle cx="4" cy="-6" r="2.6" fill="${tone}" stroke="${INK}" stroke-width="1.4"/><circle cx="0" cy="-9" r="2.6" fill="${tone}" stroke="${INK}" stroke-width="1.4"/></g>`;
  return flower(170, 216, UNICORN_MANE) + flower(230, 208, '#9fc7e8') + flower(290, 218, WAGON_RED) + flower(330, 206, UNICORN_MANE);
}

function wagon(x: number, y: number, loaded: boolean): string {
  return `<g transform="translate(${x} ${y})">
    ${loaded ? berryBasket(0, -12) : ''}
    <rect x="-24" y="-12" width="48" height="14" rx="4" fill="${WAGON_RED}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="-13" cy="6" r="7" fill="${INK}"/>
    <circle cx="-13" cy="6" r="3" fill="${ROBOT}"/>
    <circle cx="13" cy="6" r="7" fill="${INK}"/>
    <circle cx="13" cy="6" r="3" fill="${ROBOT}"/>
    <path d="M24 -6 q12 -4 16 -12" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
  </g>`;
}

function partyFlags(): string {
  const flag = (x: number, tone: string) =>
    `<path d="M${x} 34 l7 12 7 -12 Z" fill="${tone}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
  return `<g>
    <path d="M120 40 q80 24 160 0" fill="none" stroke="${INK}" stroke-width="2.4"/>
    ${flag(130, WAGON_RED)}${flag(162, SPARKLE)}${flag(194, '#9fc7e8')}${flag(226, UNICORN_MANE)}${flag(258, LEAF)}
  </g>`;
}

// ——— Scene builders: one per family beat, composed over the selection ———

export interface SceneArtContext {
  characterArt: string;
  settingArt: string;
}

const SCENE_BUILDERS: Record<string, (ctx: SceneArtContext) => string> = {
  // — The Lost Friend —
  'lost-intro': (ctx) =>
    backdropFor(ctx, `${heroAt(ctx, 'happy', 140, 218)}${biscuit(230, 208, { happy: true })}`),
  'lost-problem': (ctx) =>
    backdropFor(ctx, `${heroAt(ctx, 'worried', 120, 218)}${pawPrints()}`),
  'lost-where': (ctx) =>
    backdropFor(ctx, `
    <path d="M150 232 q40 -24 34 -60 q-5 -28 18 -44" fill="none" stroke="#f4e6b8" stroke-width="12" stroke-linecap="round" opacity="0.9"/>
    ${sparkleStar(176, 176, 6)}${sparkleStar(196, 140, 5)}
    <rect x="292" y="128" width="52" height="9" rx="4" fill="${TRUNK}" stroke="${INK}" stroke-width="2.4"/>
    ${owl(318, 108)}
    ${heroAt(ctx, 'curious', 90, 218)}`),
  'lost-bush': (ctx) =>
    backdropFor(ctx, `
    <circle cx="300" cy="196" r="34" fill="${LEAF}" stroke="${INK}" stroke-width="3"/>
    <circle cx="272" cy="206" r="22" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="328" cy="206" r="22" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M318 168 q9 -8 8 -16" fill="none" stroke="${BISCUIT_FUR}" stroke-width="6" stroke-linecap="round"/>
    ${heroAt(ctx, 'curious', 120, 218)}`),
  'lost-log': (ctx) =>
    backdropFor(ctx, `
    <rect x="258" y="182" width="98" height="40" rx="20" fill="${TRUNK}" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="270" cy="202" rx="13" ry="17" fill="#5e4026" stroke="${INK}" stroke-width="2.6"/>
    ${biscuit(272, 202, { peeking: true })}
    <rect x="296" y="136" width="44" height="8" rx="4" fill="${TRUNK}" stroke="${INK}" stroke-width="2.2"/>
    ${owl(318, 118)}
    ${heroAt(ctx, 'curious', 130, 218)}`),
  'lost-help': (ctx) =>
    backdropFor(ctx, `
    <path d="M282 226 q-10 -34 14 -44 q26 -10 36 12 q8 20 -12 30 Z" fill="${LEAF}" stroke="${INK}" stroke-width="3"/>
    ${biscuit(304, 200, { peeking: true })}
    ${heroAt(ctx, 'curious', 150, 218)}`),
  'lost-ending': (ctx) =>
    backdropFor(ctx, `
    ${sparkleStar(180, 120, 6)}${sparkleStar(252, 104, 5)}${sparkleStar(216, 88, 4)}
    ${heroAt(ctx, 'celebrating', 160, 218)}
    ${biscuit(240, 208, { happy: true })}
    <path d="M206 150 q-6 -10 4 -12 q4 -8 11 -2 q10 -2 8 8 q0 8 -11 10 q-9 2 -12 -4 Z" fill="#f6a5c0" stroke="${INK}" stroke-width="2.4"/>`),

  // — The Broken Thing —
  'fix-intro': (ctx) =>
    backdropFor(ctx, `${musicBox(288, 210, 'quiet')}${heroAt(ctx, 'happy', 140, 218)}`),
  'fix-problem': (ctx) =>
    backdropFor(ctx, `${musicBox(288, 210, 'quiet')}
    <path d="M310 158 q6 8 0 14" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>
    ${heroAt(ctx, 'worried', 150, 218)}`),
  'fix-how': (ctx) =>
    backdropFor(ctx, `${musicBox(250, 210, 'quiet')}${sparkleStar(250, 154, 6)}${heroAt(ctx, 'curious', 130, 218)}`),
  'fix-wind': (ctx) =>
    backdropFor(ctx, `${musicBox(270, 210, 'quiet')}
    <path d="M300 168 q6 10 -2 16" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="296" cy="166" rx="3.6" ry="2.8" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.8"/>
    ${heroAt(ctx, 'curious', 150, 218)}`),
  'fix-inside': (ctx) =>
    backdropFor(ctx, `${musicBox(270, 210, 'open')}
    <path d="M212 168 l40 22" stroke="${SPARKLE}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
    ${heroAt(ctx, 'curious', 160, 218)}`),
  'fix-finish': (ctx) =>
    backdropFor(ctx, `${musicBox(270, 210, 'open')}${toolkit(190, 216)}${heroAt(ctx, 'curious', 120, 218)}`),
  'fix-ending-toolkit': (ctx) =>
    backdropFor(ctx, `${musicBox(260, 210, 'singing')}${toolkit(330, 216)}
    ${sparkleStar(200, 110, 6)}${sparkleStar(300, 96, 5)}
    ${heroAt(ctx, 'celebrating', 140, 218)}`),
  'fix-ending-helper': (ctx) =>
    backdropFor(ctx, `${musicBox(260, 210, 'singing')}${owl(330, 190)}
    ${sparkleStar(200, 110, 6)}${sparkleStar(300, 96, 5)}
    ${heroAt(ctx, 'celebrating', 140, 218)}`),

  // — The Special Delivery —
  'delivery-intro': (ctx) =>
    backdropFor(ctx, `${berryBasket(260, 222)}${heroAt(ctx, 'happy', 150, 218)}`),
  'delivery-problem': (ctx) =>
    backdropFor(ctx, `${partyFlags()}${berryBasket(250, 222)}${heroAt(ctx, 'curious', 140, 218)}`),
  'delivery-route': (ctx) =>
    backdropFor(ctx, `
    <path d="M200 232 q-30 -30 -24 -64" fill="none" stroke="#f4e6b8" stroke-width="11" stroke-linecap="round" opacity="0.9"/>
    <path d="M200 232 q36 -26 44 -60" fill="none" stroke="#cfe0b4" stroke-width="11" stroke-linecap="round" opacity="0.9"/>
    ${berryBasket(258, 222)}${heroAt(ctx, 'curious', 132, 218)}`),
  'delivery-bridge': (ctx) =>
    backdropFor(ctx, `${woodenBridge()}${berryBasket(258, 200)}${heroAt(ctx, 'curious', 190, 214)}`),
  'delivery-meadow': (ctx) =>
    backdropFor(ctx, `${meadowFlowers()}${butterflies()}${berryBasket(262, 222)}${heroAt(ctx, 'curious', 150, 218)}`),
  'delivery-protect': (ctx) =>
    backdropFor(ctx, `${partyFlags()}${berryBasket(250, 222)}${wagon(320, 218, false)}${heroAt(ctx, 'curious', 140, 218)}`),
  'delivery-ending-high': (ctx) =>
    backdropFor(ctx, `${partyFlags()}
    ${heroAt(ctx, 'celebrating', 170, 218)}
    ${berryBasket(170, 128)}
    ${biscuit(258, 208, { happy: true })}${owl(320, 190)}
    ${sparkleStar(120, 100, 5)}${sparkleStar(300, 88, 5)}`),
  'delivery-ending-wagon': (ctx) =>
    backdropFor(ctx, `${partyFlags()}
    ${heroAt(ctx, 'celebrating', 150, 218)}
    ${wagon(250, 218, true)}
    ${biscuit(320, 208, { happy: true })}
    ${sparkleStar(120, 100, 5)}${sparkleStar(310, 92, 5)}`),
};

/** One illustrated story scene (viewBox 400x250), composed for the selection. */
export function storySceneSvg(artKey: string, ctx: SceneArtContext): string {
  const productionAsset =
    ctx.characterArt === 'poppy'
      ? ctx.settingArt === 'forest'
        ? POPPY_FOREST_LOST_SCENE_ASSETS[artKey] ??
          POPPY_FOREST_DELIVERY_SCENE_ASSETS[artKey]
        : ctx.settingArt === 'cozy-town'
          ? POPPY_COZY_TOWN_LOST_SCENE_ASSETS[artKey]
          : ctx.settingArt === 'cloud-village'
            ? POPPY_CLOUD_VILLAGE_DELIVERY_SCENE_ASSETS[artKey]
            : undefined
      : undefined;
  if (productionAsset) {
    return `<svg class="story-stage__scene-svg" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><image data-production-art="${productionAsset.id}" href="${productionAsset.href}" width="400" height="250" preserveAspectRatio="xMidYMid slice"/></svg>`;
  }
  const builder = SCENE_BUILDERS[artKey] ?? SCENE_BUILDERS['lost-intro'];
  return `<svg class="story-stage__scene-svg" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${builder(ctx)}</svg>`;
}

// ——— Choice cards ———

const CHOICE_ART: Record<string, string> = {
  sparkle: `<path d="M30 86 q28 -18 22 -42 q-4 -18 14 -30" fill="none" stroke="#f4e6b8" stroke-width="12" stroke-linecap="round"/>${sparkleStar(44, 58, 8)}${sparkleStar(62, 28, 7)}${sparkleStar(28, 30, 5)}`,
  owl: owl(50, 52).replace('translate(50 52)', 'translate(50 52) scale(1.9)'),
  bubbles: `<rect x="44" y="52" width="10" height="34" rx="5" fill="${TRUNK}" stroke="${INK}" stroke-width="2.6"/><circle cx="49" cy="40" r="15" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="72" cy="26" r="9" fill="#a8d8f0" opacity="0.85" stroke="${INK}" stroke-width="2.4"/><circle cx="28" cy="20" r="6" fill="#a8d8f0" opacity="0.85" stroke="${INK}" stroke-width="2.2"/><circle cx="62" cy="10" r="4.6" fill="#a8d8f0" opacity="0.85" stroke="${INK}" stroke-width="2"/>`,
  song: `<path d="M36 70 V26 l30 -8 v44" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="29" cy="71" rx="9" ry="7" fill="${POPPY_DRESS}" stroke="${INK}" stroke-width="2.6"/><ellipse cx="59" cy="63" rx="9" ry="7" fill="${SPARKLE}" stroke="${INK}" stroke-width="2.6"/>${sparkleStar(78, 32, 5)}`,
  wind: `<path d="M50 54 a20 20 0 1 1 20 -20" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M70 22 l0 14 -12 -6 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><rect x="42" y="54" width="16" height="26" rx="6" fill="${BOX_WOOD}" stroke="${INK}" stroke-width="2.6"/>`,
  peek: `<rect x="38" y="30" width="24" height="34" rx="7" fill="${SPARKLE}" stroke="${INK}" stroke-width="2.6"/><path d="M42 30 q8 -12 16 0" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M50 64 v14" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M26 84 q24 -10 48 0" fill="none" stroke="${SPARKLE}" stroke-width="7" stroke-linecap="round" opacity="0.7"/>`,
  toolkit: `${toolkit(50, 58).replace('translate(50 58)', 'translate(54 60) scale(1.7)')}`,
  helper: `${owl(50, 48).replace('translate(50 48)', 'translate(50 48) scale(1.6)')}<path d="M22 82 q28 -12 56 0" fill="none" stroke="${UNICORN_MANE}" stroke-width="6" stroke-linecap="round" opacity="0.8"/>`,
  bridge: `<path d="M14 74 q36 -34 72 0" fill="none" stroke="${TRUNK}" stroke-width="10" stroke-linecap="round"/><path d="M26 70 v-12 M50 58 v-12 M74 70 v-12" stroke="${TRUNK}" stroke-width="4.6" stroke-linecap="round"/><path d="M26 58 q24 -18 48 0" fill="none" stroke="${INK}" stroke-width="2.6"/>`,
  meadow: `<path d="M14 84 q36 -8 72 0" fill="none" stroke="${LEAF}" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
    <g transform="translate(-140 -140)">${meadowFlowers()}</g>
    <g transform="translate(30 34)"><path d="M0 0 q-7 -8 -11 -1 q4 7 11 1 q7 -8 11 -1 q-4 7 -11 1" fill="${UNICORN_MANE}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M0 -2 v5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g>
    <g transform="translate(72 22)"><path d="M0 0 q-6 -7 -9 -1 q3 6 9 1 q6 -7 9 -1 q-3 6 -9 1" fill="#9fc7e8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0 -2 v4" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/></g>`,
  carry: `${berryBasket(50, 44)}<path d="M30 78 q-6 -18 8 -26 M70 78 q6 -18 -8 -26" fill="none" stroke="${POPPY_SKIN}" stroke-width="6" stroke-linecap="round"/>`,
  wagon: wagon(50, 60, true).replace('translate(50 60)', 'translate(50 62) scale(1.25)'),
};

/** One illustrated choice card image (viewBox 100x100). */
export function storyChoiceSvg(artKey: string): string {
  const body = CHOICE_ART[artKey] ?? CHOICE_ART.sparkle;
  return `<svg class="story-stage__choice-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}

// ——— Pick Three setup cards ———

/** A character portrait card: sky, soft hill, the character front and center. */
function characterCard(builder: (mood: StoryMood, x: number, y: number) => string): string {
  return `<rect x="0" y="0" width="160" height="120" fill="${SKY}"/>
    <path d="M0 92 q60 -18 160 -6 v34 h-160 Z" fill="${HILL}"/>
    ${sparkleStar(34, 30, 6)}${sparkleStar(128, 22, 5)}
    ${builder('happy', 80, 108)}`;
}

const CARD_ART: Record<string, string> = {
  poppy: characterCard(poppy),
  finn: characterCard(finn),
  robo: characterCard(robo),
  luna: characterCard(luna),
  milo: characterCard(milo),
  forest: `<rect x="0" y="0" width="160" height="120" fill="${SKY}"/>
    <path d="M0 78 q50 -18 100 -8 q40 8 60 -4 v54 h-160 Z" fill="${HILL}"/>
    <path d="M0 98 q60 -14 160 -4 v26 h-160 Z" fill="${HILL_DEEP}"/>
    ${tree(44, 88, 0.8)}
    ${tree(120, 82, 0.95)}
    ${sparkleStar(80, 26, 6)}${sparkleStar(28, 44, 4)}${sparkleStar(140, 38, 4)}`,
  'moon-castle': `<rect x="0" y="0" width="160" height="120" fill="${CASTLE_SKY}"/>
    <path d="M118 18 a14 14 0 1 0 9 26 a11 11 0 1 1 -9 -26 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.8"/>
    ${sparkleStar(36, 24, 4)}${sparkleStar(76, 14, 3.4)}
    <rect x="26" y="52" width="26" height="52" rx="5" fill="${CASTLE_WALL}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M22 52 h34 l-17 -18 Z" fill="#cbbcf0" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="86" y="64" width="22" height="40" rx="5" fill="${CASTLE_WALL}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M82 64 h30 l-15 -15 Z" fill="#cbbcf0" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="35" y="66" width="8" height="10" rx="3" fill="${SPARKLE}"/>
    <path d="M0 104 q80 -10 160 0 v16 h-160 Z" fill="#cbbfe8"/>`,
  'cozy-town': `<rect x="0" y="0" width="160" height="120" fill="${TOWN_SKY}"/>
    <circle cx="130" cy="24" r="11" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.8"/>
    <rect x="20" y="60" width="34" height="44" rx="4" fill="${TOWN_WALL}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M16 60 h42 l-21 -20 Z" fill="#e8a1a1" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="76" y="70" width="28" height="34" rx="4" fill="${TOWN_WALL}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M72 70 h36 l-18 -16 Z" fill="#9fc7e8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="31" y="74" width="9" height="9" rx="2.6" fill="${SPARKLE}"/>
    <rect x="86" y="80" width="8" height="8" rx="2.6" fill="${SPARKLE}"/>
    <path d="M0 104 q80 -8 160 0 v16 h-160 Z" fill="#e8d7b4"/>`,
  'cloud-village': `<rect x="0" y="0" width="160" height="120" fill="${CLOUD_SKY}"/>
    <circle cx="30" cy="22" r="10" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="56" cy="58" r="13" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="44" cy="63" r="9" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2"/>
    <circle cx="68" cy="63" r="9" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2"/>
    <rect x="94" y="48" width="30" height="38" rx="9" fill="${CLOUD_PUFF}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M90 50 h38 l-19 -18 Z" fill="#9fc7e8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="105" y="64" width="9" height="9" rx="3" fill="${SPARKLE}"/>
    <path d="M0 102 q80 -12 160 0 v18 h-160 Z" fill="#e6f2fb"/>`,
  'paw-prints': `<rect x="0" y="0" width="160" height="120" fill="${SKY}"/>
    <path d="M0 84 q70 -18 160 -6 v42 h-160 Z" fill="${HILL}"/>
    <circle cx="122" cy="86" r="24" fill="${LEAF}" stroke="${INK}" stroke-width="2.8"/>
    <circle cx="102" cy="94" r="15" fill="${LEAF_DEEP}" stroke="${INK}" stroke-width="2.4"/>
    ${biscuit(122, 84, { peeking: true })}
    <g transform="translate(-182 -104)">${pawPrints()}</g>`,
  'music-box': `<rect x="0" y="0" width="160" height="120" fill="${TOWN_SKY}"/>
    <path d="M0 92 q70 -12 160 -4 v32 h-160 Z" fill="#e8d7b4"/>
    ${musicBox(80, 96, 'quiet')}
    <path d="M116 44 q6 8 0 14" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity="0.6"/>
    ${sparkleStar(38, 34, 5)}`,
  'berry-basket': `<rect x="0" y="0" width="160" height="120" fill="${SKY}"/>
    <path d="M0 92 q70 -14 160 -4 v32 h-160 Z" fill="${HILL}"/>
    <path d="M18 18 q62 20 124 0" fill="none" stroke="${INK}" stroke-width="2.2"/>
    <path d="M30 22 l6 10 6 -10 Z" fill="${WAGON_RED}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M62 27 l6 10 6 -10 Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M94 27 l6 10 6 -10 Z" fill="#9fc7e8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M124 22 l6 10 6 -10 Z" fill="${UNICORN_MANE}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    ${berryBasket(80, 100)}
    ${sparkleStar(34, 60, 5)}${sparkleStar(126, 54, 5)}`,
};

/**
 * The story-room valance (arc slice 7): a short curtain strip that gives
 * the setup screen its §16 story-room feel without becoming a massive
 * theater header (§23). Purely decorative — always aria-hidden and never
 * an interaction target.
 */
export function storyRoomValanceSvg(): string {
  const swag = (x: number) => `
    <path d="M${x} 6 q30 26 60 0 l0 -6 l-60 0 Z" fill="#b98ac9" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="${x + 30}" cy="20" r="3.4" fill="${SPARKLE}" stroke="${INK}" stroke-width="1.6"/>`;
  return `<svg class="story-stage__valance-svg" viewBox="0 0 360 34" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false">
    <rect x="0" y="0" width="360" height="7" rx="3" fill="#8a5fae" stroke="${INK}" stroke-width="2"/>
    ${swag(0)}${swag(60)}${swag(120)}${swag(180)}${swag(240)}${swag(300)}
  </svg>`;
}

/** One illustrated setup card image (viewBox 160x120). */
export function storyCardSvg(artKey: string): string {
  const body = CARD_ART[artKey] ?? CARD_ART.poppy;
  return `<svg class="story-stage__card-svg" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}
