/**
 * The child's Number Train world preference — a local UI preference, not
 * progress data. Reads are malformed-safe (any storage failure or non-string
 * value reads as "no preference"), and resolution through the registry is
 * fail-open, so a stale or garbage value can never break the game.
 *
 * Selection is expression, never progression: the preference only remembers
 * the child's last choice so her world greets her pre-selected next visit.
 */

const WORLD_PREFERENCE_KEY = 'lp_number_train_world';

export function readWorldPreference(): string | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const value = localStorage.getItem(WORLD_PREFERENCE_KEY);
    return typeof value === 'string' && value ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveWorldPreference(worldId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(WORLD_PREFERENCE_KEY, worldId);
  } catch {
    // Storage may be unavailable (private mode); the game plays on without
    // remembering — never an error the child can see.
  }
}

export function clearWorldPreference(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(WORLD_PREFERENCE_KEY);
  } catch {
    // Same fail-open rule as above.
  }
}
