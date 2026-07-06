import type {
  ParentDifficultyAction,
  ParentDifficultyActionType,
} from '../types/parent-actions';

export interface ParentDifficultyActionHistoryItem {
  action_id: string;
  skill_label: string;
  action_label: string;
  recommendation_label: string;
  source_status: string;
  source_reason: string;
  created_at: string;
  timestamp_label: string;
}

const ACTION_LABELS: Record<ParentDifficultyActionType, string> = {
  use_suggestion: 'Use suggestion',
  keep_stable: 'Keep stable',
  add_support: 'Add support',
  promote_gently: 'Promote gently',
  review_later: 'Review later',
  ignore_for_now: 'Ignore for now',
};

export function formatParentDifficultyActionLabel(
  actionType: ParentDifficultyActionType
): string {
  return ACTION_LABELS[actionType];
}

export function buildParentDifficultyActionHistory(
  actions: ParentDifficultyAction[],
  limit = 5
): ParentDifficultyActionHistoryItem[] {
  return [...actions]
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      a.skill_label.localeCompare(b.skill_label)
    ))
    .slice(0, limit)
    .map((action) => ({
      action_id: action.action_id,
      skill_label: action.skill_label,
      action_label: formatParentDifficultyActionLabel(action.action_type),
      recommendation_label: action.source_recommendation,
      source_status: action.source_status,
      source_reason: action.source_reason,
      created_at: action.created_at,
      timestamp_label: formatActionTimestamp(action.created_at),
    }));
}

function formatActionTimestamp(timestamp: string): string {
  const [date = '', timeWithZone = ''] = timestamp.split('T');
  const time = timeWithZone.slice(0, 5);
  if (!date || !time) return timestamp;

  return `${date} ${time} UTC`;
}
