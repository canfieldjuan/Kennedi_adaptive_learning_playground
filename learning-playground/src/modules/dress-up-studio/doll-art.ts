/**
 * Luna — the Dress-Up Studio doll — as layered original inline SVG (illustrated
 * standard: purple ink #3a2461, warm flat fills, rounded child-friendly
 * geometry). Category A original project artwork; no <text>, no emoji, no
 * external assets.
 *
 * The doll is drawn front-facing in a fixed pose inside viewBox 0 0 200 340.
 * Clothing pieces in wardrobe-art.ts are authored against these same anchor
 * points, so any item snaps onto the body. Composition is fail-safe: an unknown
 * id simply contributes no layer, so a stale saved card can never crash.
 */

import type { StudioLook } from './dress-up-studio.types';
import type { FashionCardCompletion } from './fashion-cards';
import {
  ACCESSORY_BY_ID,
  FRAME_BY_ID,
  HAIR_COLOR_BY_ID,
  SCENE_BY_ID,
  CARD_STICKER_BY_ID,
  TONE_BY_ID,
  WARDROBE_BY_ID,
  DOLL_ID,
  HAIR_COLORS,
  TONES,
  SCENES,
  FRAMES,
} from './wardrobe-catalog';
import {
  INK,
  accessorySvg,
  bottomSvg,
  cardStickerSvg,
  dressSvg,
  frameSvg,
  jacketSvg,
  sceneBackdropSvg,
  shoesSvg,
  topSvg,
} from './wardrobe-art';

const CHEEK = '#f2a0a8';

// — Doll body (skin): legs, arms, torso, neck, ears, head —

function dollBodySvg(toneValue: string): string {
  return `<g class="du-body">
    <path d="M84,196 L82,300 Q82,308 89,308 L94,308 Q99,308 99,300 L99,196 Z" fill="${toneValue}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M101,196 L101,300 Q101,308 106,308 L111,308 Q118,308 118,300 L116,196 Z" fill="${toneValue}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M74,126 L58,150 L54,196 Q54,203 61,203 L67,203 Q72,201 71,194 L79,152 Z" fill="${toneValue}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M126,126 L142,150 L146,196 Q146,203 139,203 L133,203 Q128,201 129,194 L121,152 Z" fill="${toneValue}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M72,120 Q100,112 128,120 L124,198 Q100,206 76,198 Z" fill="${toneValue}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M92,102 L92,120 Q100,124 108,120 L108,102 Z" fill="${toneValue}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="62" cy="74" r="8" fill="${toneValue}" stroke="${INK}" stroke-width="4"/>
    <circle cx="138" cy="74" r="8" fill="${toneValue}" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="100" cy="70" rx="40" ry="42" fill="${toneValue}" stroke="${INK}" stroke-width="5"/>
  </g>`;
}

// — Hair (back layer behind the head, front layer over the forehead) —

function hairBackSvg(styleId: string, color: string): string {
  switch (styleId) {
    case 'hair-ponytails':
      return `<g class="du-hair-back"><circle cx="52" cy="78" r="18" fill="${color}" stroke="${INK}" stroke-width="4"/><circle cx="148" cy="78" r="18" fill="${color}" stroke="${INK}" stroke-width="4"/><path d="M60,44 Q100,20 140,44 L146,92 Q100,80 54,92 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
    case 'hair-puffs':
      return `<g class="du-hair-back"><circle cx="60" cy="42" r="24" fill="${color}" stroke="${INK}" stroke-width="4"/><circle cx="140" cy="42" r="24" fill="${color}" stroke="${INK}" stroke-width="4"/><path d="M58,44 Q100,14 142,44 L150,96 Q100,84 50,96 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
    case 'hair-long':
      return `<g class="du-hair-back"><path d="M56,52 Q100,18 144,52 L152,210 Q140,220 128,206 Q120,150 116,110 L84,110 Q80,150 72,206 Q60,220 48,210 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
    case 'hair-bob':
    default:
      return `<g class="du-hair-back"><path d="M56,52 Q100,18 144,52 L150,116 Q140,126 130,116 L128,96 L72,96 L70,116 Q60,126 50,116 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
  }
}

function hairFrontSvg(styleId: string, color: string): string {
  const scalp = `<path d="M60,66 Q64,26 100,26 Q136,26 140,66 Q120,50 100,50 Q80,50 60,66 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  switch (styleId) {
    case 'hair-ponytails':
      return `<g class="du-hair-front">${scalp}<path d="M100,30 L100,52" stroke="${INK}" stroke-width="3"/><circle cx="52" cy="62" r="5" fill="#f6c85f" stroke="${INK}" stroke-width="2.5"/><circle cx="148" cy="62" r="5" fill="#f6c85f" stroke="${INK}" stroke-width="2.5"/></g>`;
    case 'hair-puffs':
      return `<g class="du-hair-front"><path d="M58,66 Q62,24 100,24 Q138,24 142,66 Q128,48 116,58 Q108,44 100,58 Q92,44 84,58 Q72,48 58,66 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
    case 'hair-long':
      return `<g class="du-hair-front"><path d="M60,66 Q64,26 100,26 Q136,26 140,66 Q118,46 96,52 Q76,56 60,66 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
    case 'hair-bob':
    default:
      return `<g class="du-hair-front">${scalp}<path d="M60,64 L60,70 M140,64 L140,70" stroke="${INK}" stroke-width="3"/></g>`;
  }
}

// — Face + optional glasses —

function faceSvg(): string {
  return `<g class="du-face">
    <ellipse cx="86" cy="68" rx="5.5" ry="7" fill="${INK}"/>
    <ellipse cx="114" cy="68" rx="5.5" ry="7" fill="${INK}"/>
    <circle cx="88" cy="66" r="1.8" fill="#ffffff"/>
    <circle cx="116" cy="66" r="1.8" fill="#ffffff"/>
    <circle cx="76" cy="82" r="6" fill="${CHEEK}" opacity="0.7"/>
    <circle cx="124" cy="82" r="6" fill="${CHEEK}" opacity="0.7"/>
    <path d="M88,86 Q100,96 112,86" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  </g>`;
}

function glassesSvg(): string {
  return `<g class="du-glasses"><circle cx="86" cy="68" r="13" fill="none" stroke="${INK}" stroke-width="3.5"/><circle cx="114" cy="68" r="13" fill="none" stroke="${INK}" stroke-width="3.5"/><line x1="99" y1="68" x2="101" y2="68" stroke="${INK}" stroke-width="3.5"/></g>`;
}

// — Layer composition (back to front). Exclusivity: a dress hides top+bottom —

function dollLayers(look: StudioLook): string {
  const tone = TONE_BY_ID.get(look.toneId)?.value ?? TONES[0].value;
  const hairColor = HAIR_COLOR_BY_ID.get(look.hairColorId)?.value ?? HAIR_COLORS[0].value;
  const hairId = look.hairId;

  const parts: string[] = [];
  parts.push(hairBackSvg(hairId, hairColor));
  parts.push(dollBodySvg(tone));

  const dress = look.dress ? WARDROBE_BY_ID.get(look.dress) : undefined;
  if (dress) {
    parts.push(dressSvg(dress));
  } else {
    const bottom = look.bottom ? WARDROBE_BY_ID.get(look.bottom) : undefined;
    if (bottom) parts.push(bottomSvg(bottom));
    const top = look.top ? WARDROBE_BY_ID.get(look.top) : undefined;
    if (top) parts.push(topSvg(top));
  }

  const jacket = look.jacket ? WARDROBE_BY_ID.get(look.jacket) : undefined;
  if (jacket) parts.push(jacketSvg(jacket));

  const shoes = look.shoes ? WARDROBE_BY_ID.get(look.shoes) : undefined;
  if (shoes) parts.push(shoesSvg(shoes));

  parts.push(faceSvg());
  parts.push(hairFrontSvg(hairId, hairColor));
  if (look.glasses) parts.push(glassesSvg());

  for (const accessoryId of look.accessoryIds) {
    const accessory = ACCESSORY_BY_ID.get(accessoryId);
    if (accessory) parts.push(accessorySvg(accessory));
  }

  return parts.join('');
}

/** The dressing-room preview: the doll only, no scene or frame. */
export function renderStudioDoll(look: StudioLook): string {
  return `<svg class="du-doll-svg" viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${DOLL_ID} doll" focusable="false">${dollLayers(look)}</svg>`;
}

/** The in-context dressing preview: the current scene behind the live doll,
 * but no frame or card sticker yet — those arrive as the finish reveal. */
export function renderStudioStageSvg(look: StudioLook): string {
  const scene = SCENE_BY_ID.get(look.sceneId) ?? SCENES[0];
  return `<svg class="du-stage-svg" viewBox="0 0 240 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${DOLL_ID} in the scene" focusable="false">${sceneBackdropSvg(scene)}<g transform="translate(20,14)">${dollLayers(look)}</g></svg>`;
}

/** Rebuild a StudioLook from a saved card so the revisit render is exact. */
export function lookFromCard(card: FashionCardCompletion): StudioLook {
  return {
    dollId: card.doll_id,
    toneId: card.tone_id,
    hairId: card.hair_id,
    hairColorId: card.hair_color_id,
    glasses: card.glasses,
    top: card.outfit.top ?? null,
    bottom: card.outfit.bottom ?? null,
    dress: card.outfit.dress ?? null,
    shoes: card.outfit.shoes ?? null,
    jacket: card.outfit.jacket ?? null,
    accessoryIds: [...card.accessory_ids],
    sceneId: card.scene_id,
    frameId: card.frame_id,
    stickerId: card.sticker_id ?? null,
  };
}

/**
 * The finished fashion card: scene backdrop + the doll wearing the exact look +
 * frame + optional sticker, all from one FashionCardCompletion. This same
 * function draws the just-finished payoff and every later revisit, so they can
 * never disagree (ownership-completion exact-choice continuity).
 */
export function renderFashionCardSvg(card: FashionCardCompletion): string {
  const look = lookFromCard(card);
  const scene = SCENE_BY_ID.get(card.scene_id) ?? SCENES[0];
  const frame = FRAME_BY_ID.get(card.frame_id) ?? FRAMES[0];
  const sticker = card.sticker_id ? CARD_STICKER_BY_ID.get(card.sticker_id) : undefined;
  return `<svg class="du-card-svg" viewBox="0 0 240 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fashion card" focusable="false">
    ${sceneBackdropSvg(scene)}
    <g transform="translate(20,14)">${dollLayers(look)}</g>
    ${frameSvg(frame)}
    ${sticker ? cardStickerSvg(sticker) : ''}
  </svg>`;
}
