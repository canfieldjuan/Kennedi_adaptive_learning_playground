/**
 * Kennedi's Dress-Up Studio types.
 *
 * This is a CREATIVE-PLAY game, not a LearningActivity: dressing a doll has no
 * correct answer, so nothing here is scored, and the module emits no attempt
 * events. The only durable output is a FashionCardCompletion (see
 * ./fashion-cards) — the smallest structured record that reproduces the child's
 * exact look, in the spirit of Number Train's TrainTripCompletion.
 */

/** A palette entry: a stable id plus a display label and a fill value. */
export interface StudioSwatch {
  id: string;
  label: string;
  value: string;
}

/** Single-select wardrobe slots (a dress is exclusive with top + bottom). */
export type OutfitSlot = 'top' | 'bottom' | 'dress' | 'shoes' | 'jacket';

/** Every wardrobe piece the child can put on the doll. */
export interface WardrobeItem {
  id: string;
  label: string;
  slot: OutfitSlot;
  /** The main fabric fill, so tests and the card can cite the exact choice. */
  value: string;
}

/** A multi-select accessory (bow, bag, necklace, hat). */
export interface AccessoryItem {
  id: string;
  label: string;
  value: string;
}

/** A finished-card backdrop: the place the look "goes" to. */
export interface StudioScene {
  id: string;
  label: string;
  /** The dominant scene tone, cited by the card and tests. */
  value: string;
}

/** A card frame — one bounded ownership flourish on the finished card. */
export interface StudioFrame {
  id: string;
  label: string;
  value: string;
}

/** An optional single card sticker — the second bounded ownership flourish. */
export interface StudioSticker {
  id: string;
  label: string;
}

/**
 * The live, in-progress look the child is building. Every field is a choice id
 * (or null / empty) — never a rendered asset, so the completion object and the
 * revisit render always agree.
 */
export interface StudioLook {
  dollId: string;
  toneId: string;
  hairId: string;
  hairColorId: string;
  glasses: boolean;
  top: string | null;
  bottom: string | null;
  dress: string | null;
  shoes: string | null;
  jacket: string | null;
  accessoryIds: string[];
  sceneId: string;
  frameId: string;
  stickerId: string | null;
}
