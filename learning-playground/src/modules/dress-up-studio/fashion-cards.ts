/**
 * Fashion cards — the ownership record for Dress-Up Studio
 * (ownership-completion contract): the smallest NON-EVALUATIVE object that
 * preserves the child's EXACT doll, outfit, scene, and card choices through the
 * finish payoff and every later revisit.
 *
 * Deliberately excluded: scores, currency, unlock state, rarity, "best" looks,
 * or anything evidence-shaped. Expressive choices never touch mastery,
 * difficulty, transfer, or recommendations. This mirrors Number Train's
 * TrainTripCompletion and Story Stage's story history.
 */

export const FASHION_CARD_HISTORY_LIMIT = 12;

export interface FashionCardCompletion {
  /** Unique per completion (dedupe key on append). */
  completion_id: string;
  session_id: string;
  doll_id: string;
  tone_id: string;
  hair_id: string;
  hair_color_id: string;
  glasses: boolean;
  /** Single-select wardrobe: slot -> item id, exactly as the child left it.
   * Absent slots are simply omitted (e.g. a dress omits top and bottom). */
  outfit: Record<string, string>;
  /** Multi-select accessories, in the order chosen. */
  accessory_ids: string[];
  scene_id: string;
  frame_id: string;
  /** Present only when the child added a card sticker. */
  sticker_id?: string;
  created_at: string;
}

/**
 * Malformed-safe conversion: anything structurally wrong reads as null and is
 * dropped individually (one bad record never poisons the collection). Unknown
 * ids are allowed through structurally — the art layer renders them fail-safe
 * (an unknown id simply draws no layer), so a stale card can never crash.
 */
export function toFashionCardCompletion(value: unknown): FashionCardCompletion | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;

  if (
    !isNonEmptyString(record.completion_id) ||
    typeof record.session_id !== 'string' ||
    !isNonEmptyString(record.doll_id) ||
    !isNonEmptyString(record.tone_id) ||
    !isNonEmptyString(record.hair_id) ||
    !isNonEmptyString(record.hair_color_id) ||
    typeof record.glasses !== 'boolean' ||
    !isNonEmptyString(record.scene_id) ||
    !isNonEmptyString(record.frame_id) ||
    !isNonEmptyString(record.created_at) ||
    typeof record.outfit !== 'object' || record.outfit === null ||
    !Array.isArray(record.accessory_ids)
  ) {
    return null;
  }

  const outfit: Record<string, string> = {};
  for (const [slot, itemId] of Object.entries(
    record.outfit as Record<string, unknown>
  )) {
    if (typeof itemId !== 'string' || itemId.length === 0) return null;
    outfit[slot] = itemId;
  }

  const accessoryIds: string[] = [];
  for (const accessoryId of record.accessory_ids) {
    if (typeof accessoryId !== 'string' || accessoryId.length === 0) return null;
    accessoryIds.push(accessoryId);
  }

  if (record.sticker_id !== undefined && !isNonEmptyString(record.sticker_id)) {
    return null;
  }

  return {
    completion_id: record.completion_id,
    session_id: record.session_id,
    doll_id: record.doll_id,
    tone_id: record.tone_id,
    hair_id: record.hair_id,
    hair_color_id: record.hair_color_id,
    glasses: record.glasses,
    outfit,
    accessory_ids: accessoryIds,
    scene_id: record.scene_id,
    frame_id: record.frame_id,
    ...(record.sticker_id !== undefined
      ? { sticker_id: record.sticker_id as string }
      : {}),
    created_at: record.created_at,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
