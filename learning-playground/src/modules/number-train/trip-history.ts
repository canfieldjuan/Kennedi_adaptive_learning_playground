/**
 * Train trip completions — the ownership record (ownership-completion
 * contract): the smallest non-evaluative object that preserves the child's
 * EXACT world and decoration choices through the payoff and revisit.
 *
 * Deliberately excluded: scores, currency, unlock state, rarity,
 * performance, or anything evidence-shaped. Expressive choices never touch
 * mastery, difficulty, or recommendations.
 */

export const TRAIN_TRIP_HISTORY_LIMIT = 12;

export interface TrainTripCompletion {
  /** Unique per completion (dedupe key on append). */
  completion_id: string;
  session_id: string;
  world_id: string;
  world_version: number;
  /** slot id -> choice id, exactly as the child picked. */
  customization: Record<string, string>;
  destination_label: string;
  created_at: string;
}

/** Malformed-safe conversion: anything structurally wrong reads as null and
 * is dropped individually (one bad record never poisons the history). */
export function toTrainTripCompletion(value: unknown): TrainTripCompletion | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.completion_id !== 'string' || !record.completion_id ||
    typeof record.session_id !== 'string' ||
    typeof record.world_id !== 'string' || !record.world_id ||
    typeof record.world_version !== 'number' ||
    typeof record.destination_label !== 'string' ||
    typeof record.created_at !== 'string' ||
    typeof record.customization !== 'object' || record.customization === null
  ) {
    return null;
  }
  const customization: Record<string, string> = {};
  for (const [slot, choice] of Object.entries(
    record.customization as Record<string, unknown>
  )) {
    if (typeof choice !== 'string') return null;
    customization[slot] = choice;
  }
  return {
    completion_id: record.completion_id,
    session_id: record.session_id,
    world_id: record.world_id,
    world_version: record.world_version,
    customization,
    destination_label: record.destination_label,
    created_at: record.created_at,
  };
}
