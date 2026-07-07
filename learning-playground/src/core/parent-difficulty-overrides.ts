import type {
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../types/parent-actions';
import type { ParentAdaptiveRecommendation } from './recommendation-engine';

export interface ParentDifficultyOverrideHistoryItem {
  override_id: string;
  skill_label: string;
  override_label: string;
  recommendation_label: string;
  source_status: string;
  source_reason: string;
  created_at: string;
  timestamp_label: string;
}

const OVERRIDE_LABELS: Record<ParentDifficultyOverrideType, string> = {
  keep_current: 'Keep current',
  add_support: 'Add support',
  promote_gently: 'Promote gently',
  review_later: 'Review later',
};

export function formatParentDifficultyOverrideLabel(
  overrideType: ParentDifficultyOverrideType
): string {
  return OVERRIDE_LABELS[overrideType];
}

export function getParentDifficultyOverrideTypeForRecommendation(
  recommendation: ParentAdaptiveRecommendation
): ParentDifficultyOverrideType | undefined {
  if (recommendation === 'Promote gently') return 'promote_gently';
  if (recommendation === 'Add support') return 'add_support';
  if (recommendation === 'Review later') return 'review_later';
  if (recommendation === 'Keep stable') return 'keep_current';
  return undefined;
}

export function buildActiveParentDifficultyOverrideHistory(
  overrides: ParentDifficultyOverride[],
  limit = 5
): ParentDifficultyOverrideHistoryItem[] {
  return overrides
    .filter((override) => override.active)
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      a.skill_label.localeCompare(b.skill_label)
    ))
    .slice(0, limit)
    .map((override) => ({
      override_id: override.override_id,
      skill_label: override.skill_label,
      override_label: formatParentDifficultyOverrideLabel(
        override.override_type
      ),
      recommendation_label: override.source_recommendation,
      source_status: override.source_status,
      source_reason: override.source_reason,
      created_at: override.created_at,
      timestamp_label: formatOverrideTimestamp(override.created_at),
    }));
}

function formatOverrideTimestamp(timestamp: string): string {
  const [date = '', timeWithZone = ''] = timestamp.split('T');
  const time = timeWithZone.slice(0, 5);
  if (!date || !time) return timestamp;

  return `${date} ${time} UTC`;
}
