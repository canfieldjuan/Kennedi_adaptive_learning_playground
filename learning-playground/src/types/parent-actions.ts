/**
 * Parent-only action records.
 * These record decisions; they do not change child-facing routing or difficulty.
 */

import type { ParentAdaptiveRecommendation } from '../core/parent-interpretation';

export type ParentDifficultyActionType =
  | 'use_suggestion'
  | 'keep_stable'
  | 'add_support'
  | 'promote_gently'
  | 'review_later'
  | 'ignore_for_now';

export interface ParentDifficultyAction {
  action_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  action_type: ParentDifficultyActionType;
  source_recommendation: ParentAdaptiveRecommendation;
  source_status: string;
  source_reason: string;
  created_at: string;
}
