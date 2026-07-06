/**
 * Adaptive difficulty engine.
 * Deterministic rules, no ML. Just enough to know when to
 * promote, hold, or add support.
 */

import type { SkillMasteryState } from '../types/progress';

/**
 * Promote skill level when mastery signals are strong.
 * - At least 5 attempts
 * - Recent accuracy >= 80%
 * - Confidence >= 70%
 * - Not flagged for review
 */
export function shouldPromoteSkill(state: SkillMasteryState): boolean {
  return (
    state.total_attempts >= 5 &&
    state.recent_accuracy >= 0.8 &&
    state.confidence >= 0.7 &&
    !state.needs_review
  );
}

/**
 * Add support/lower difficulty when the child is struggling.
 * - At least 3 attempts
 * - Recent accuracy < 50%
 */
export function shouldAddSupport(state: SkillMasteryState): boolean {
  return (
    state.total_attempts >= 3 &&
    state.recent_accuracy < 0.5
  );
}

/**
 * Determine the recommended difficulty adjustment.
 */
export function getDifficultyRecommendation(
  state: SkillMasteryState
): 'promote' | 'hold' | 'support' {
  if (shouldPromoteSkill(state)) return 'promote';
  if (shouldAddSupport(state)) return 'support';
  return 'hold';
}
