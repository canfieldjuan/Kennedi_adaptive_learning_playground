/**
 * Parent-only difficulty records.
 * Actions are decision history. Overrides are active parent-approved guidance.
 * Overrides are applied only after parent approval and remain local.
 */

import type { ParentAdaptiveRecommendation } from '../core/parent-interpretation';

export type ParentDifficultyActionType =
  | 'use_suggestion'
  | 'keep_stable'
  | 'add_support'
  | 'promote_gently'
  | 'review_later'
  | 'ignore_for_now';

export type ParentDifficultyOverrideType =
  | 'keep_current'
  | 'add_support'
  | 'promote_gently'
  | 'review_later';

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

export interface ParentDifficultyOverride {
  override_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  override_type: ParentDifficultyOverrideType;
  source_recommendation: ParentAdaptiveRecommendation;
  source_status: string;
  source_reason: string;
  active: boolean;
  created_at: string;
  deactivated_at?: string;
}
