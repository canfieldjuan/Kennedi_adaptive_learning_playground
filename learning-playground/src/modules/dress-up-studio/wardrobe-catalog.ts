/**
 * Dress-Up Studio catalog — DATA, not behavior.
 *
 * The doll character, skin tones, hair, wardrobe layers, scenes, frames, and
 * card stickers the child can choose from. Ids are stable and semantic so a
 * saved FashionCardCompletion can be re-rendered exactly. Nothing here is
 * ranked or "correct"; a color or item is never worth more than another.
 *
 * First release ("best first release" scope): one original doll, three tones,
 * four hairstyles, three hair colors, optional glasses, a small wardrobe across
 * five single-select slots plus multi-select accessories, four scenes, three
 * card frames, and three optional card stickers.
 */

import type {
  AccessoryItem,
  StudioFrame,
  StudioScene,
  StudioSticker,
  StudioSwatch,
  StudioLook,
  WardrobeItem,
} from './dress-up-studio.types';

export const DOLL_ID = 'luna';
export const DOLL_NAME = 'Luna';

/** Skin tones. None is a default "good" one; order is not preference. */
export const TONES: StudioSwatch[] = [
  { id: 'tone-light', label: 'Light', value: '#f2c7a3' },
  { id: 'tone-warm', label: 'Warm', value: '#c98a5c' },
  { id: 'tone-deep', label: 'Deep', value: '#8a5636' },
];

export const HAIR_STYLES: StudioSwatch[] = [
  { id: 'hair-ponytails', label: 'Ponytails', value: '' },
  { id: 'hair-puffs', label: 'Curly Puffs', value: '' },
  { id: 'hair-long', label: 'Long Waves', value: '' },
  { id: 'hair-bob', label: 'Short Bob', value: '' },
];

export const HAIR_COLORS: StudioSwatch[] = [
  { id: 'haircolor-brown', label: 'Brown', value: '#5a3a21' },
  { id: 'haircolor-black', label: 'Black', value: '#241d29' },
  { id: 'haircolor-honey', label: 'Honey', value: '#b9762e' },
];

export const WARDROBE: WardrobeItem[] = [
  // Tops
  { id: 'top-star-tee', label: 'Star Tee', slot: 'top', value: '#f48fb3' },
  { id: 'top-stripe-tee', label: 'Stripe Tee', slot: 'top', value: '#7fb4e6' },
  { id: 'top-heart-sweater', label: 'Heart Sweater', slot: 'top', value: '#b79ae0' },
  { id: 'top-ruffle', label: 'Ruffle Top', slot: 'top', value: '#f6c85f' },
  // Bottoms
  { id: 'bottom-denim-skirt', label: 'Denim Skirt', slot: 'bottom', value: '#6b8fc0' },
  { id: 'bottom-leggings', label: 'Leggings', slot: 'bottom', value: '#3fb6a8' },
  { id: 'bottom-flare-pants', label: 'Flare Pants', slot: 'bottom', value: '#ef9445' },
  // Dresses (exclusive with top + bottom)
  { id: 'dress-party', label: 'Party Dress', slot: 'dress', value: '#e0559f' },
  { id: 'dress-sun', label: 'Sun Dress', slot: 'dress', value: '#f6c85f' },
  { id: 'dress-tutu', label: 'Tutu', slot: 'dress', value: '#f7a8cf' },
  { id: 'dress-rainbow', label: 'Rainbow Dress', slot: 'dress', value: '#8ecae6' },
  // Shoes
  { id: 'shoes-sneakers', label: 'Sneakers', slot: 'shoes', value: '#e05d5d' },
  { id: 'shoes-flats', label: 'Ballet Flats', slot: 'shoes', value: '#f28fb3' },
  { id: 'shoes-boots', label: 'Boots', slot: 'shoes', value: '#8a5a3c' },
  { id: 'shoes-rain-boots', label: 'Rain Boots', slot: 'shoes', value: '#f6c343' },
  // Jackets
  { id: 'jacket-denim', label: 'Denim Jacket', slot: 'jacket', value: '#6b8fc0' },
  { id: 'jacket-raincoat', label: 'Raincoat', slot: 'jacket', value: '#f6c343' },
  { id: 'jacket-puffer', label: 'Puffer', slot: 'jacket', value: '#5ec5b6' },
];

export const ACCESSORIES: AccessoryItem[] = [
  { id: 'acc-bow', label: 'Hair Bow', value: '#f06fa6' },
  { id: 'acc-bag', label: 'Bag', value: '#a97fd0' },
  { id: 'acc-necklace', label: 'Necklace', value: '#f6c343' },
  { id: 'acc-sun-hat', label: 'Sun Hat', value: '#f2b84b' },
];

export const SCENES: StudioScene[] = [
  { id: 'scene-birthday', label: 'Birthday Party', value: '#ffd6e8' },
  { id: 'scene-park', label: 'Park', value: '#cdeccb' },
  { id: 'scene-dance', label: 'Dance Stage', value: '#e5d4f5' },
  { id: 'scene-rainy', label: 'Rainy Day', value: '#cfe0ef' },
];

export const FRAMES: StudioFrame[] = [
  { id: 'frame-gold-stars', label: 'Gold Stars', value: '#f6c343' },
  { id: 'frame-pink-hearts', label: 'Pink Hearts', value: '#f06fa6' },
  { id: 'frame-rainbow', label: 'Rainbow', value: '#8ecae6' },
];

export const CARD_STICKERS: StudioSticker[] = [
  { id: 'sticker-heart', label: 'Heart' },
  { id: 'sticker-star', label: 'Star' },
  { id: 'sticker-flower', label: 'Flower' },
];

/** Lookups by id (used by the art layer; unknown ids fail safe to undefined). */
export const TONE_BY_ID = new Map(TONES.map((t) => [t.id, t]));
export const HAIR_STYLE_BY_ID = new Map(HAIR_STYLES.map((h) => [h.id, h]));
export const HAIR_COLOR_BY_ID = new Map(HAIR_COLORS.map((h) => [h.id, h]));
export const WARDROBE_BY_ID = new Map(WARDROBE.map((w) => [w.id, w]));
export const ACCESSORY_BY_ID = new Map(ACCESSORIES.map((a) => [a.id, a]));
export const SCENE_BY_ID = new Map(SCENES.map((s) => [s.id, s]));
export const FRAME_BY_ID = new Map(FRAMES.map((f) => [f.id, f]));
export const CARD_STICKER_BY_ID = new Map(CARD_STICKERS.map((s) => [s.id, s]));

export function wardrobeForSlot(slot: WardrobeItem['slot']): WardrobeItem[] {
  return WARDROBE.filter((item) => item.slot === slot);
}

/** The opening look: a dressed default so the doll is never naked on screen,
 * while every one of these is still a real, freely changeable child choice. */
export function defaultLook(): StudioLook {
  return {
    dollId: DOLL_ID,
    toneId: TONES[0].id,
    hairId: HAIR_STYLES[0].id,
    hairColorId: HAIR_COLORS[0].id,
    glasses: false,
    top: 'top-star-tee',
    bottom: 'bottom-denim-skirt',
    dress: null,
    shoes: 'shoes-sneakers',
    jacket: null,
    accessoryIds: [],
    sceneId: SCENES[0].id,
    frameId: FRAMES[0].id,
    stickerId: null,
  };
}
