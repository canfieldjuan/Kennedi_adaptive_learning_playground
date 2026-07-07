import type { MasteryEvaluation, RecommendedMasteryAction } from './mastery-engine';

export type ParentAdaptiveRecommendation =
  | 'Promote gently'
  | 'Keep stable'
  | 'Add support'
  | 'Review later'
  | 'Not enough data'
  | 'Add transfer activity'
  | 'Try transfer activity';

export function getMasteryRecommendation(
  mastery: MasteryEvaluation
): ParentAdaptiveRecommendation | undefined {
  if (
    mastery.transfer_coverage.status === 'blocked_by_content_gap' &&
    (
      mastery.next_status === 'single_context_fluent' ||
      mastery.next_status === 'blocked_by_content_gap'
    )
  ) {
    return 'Add transfer activity';
  }

  if (mastery.next_status === 'transfer_ready') return 'Try transfer activity';
  if (mastery.recommended_action === 'introduce') return 'Not enough data';
  if (
    mastery.recommended_action === 'practice' &&
    mastery.next_status !== 'introduced'
  ) {
    return 'Keep stable';
  }
  if (mastery.recommended_action === 'add_support') return 'Add support';
  if (mastery.recommended_action === 'increase_difficulty') return 'Promote gently';
  if (
    mastery.recommended_action === 'test_transfer' ||
    mastery.recommended_action === 'schedule_review' ||
    mastery.recommended_action === 'pause_skill'
  ) {
    return 'Review later';
  }

  return undefined;
}

export function formatRecommendedAction(action: RecommendedMasteryAction): string {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
