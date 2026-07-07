import type {
  ActivityVariantBrief,
  ActivityVariantBriefContextType,
  ActivityVariantBriefStrength,
  SuggestedGameFamily,
} from '../core/content-gap-engine';

export type ParentActivityBriefDecisionType =
  | 'approve_brief'
  | 'hold_brief'
  | 'archive_brief';

export interface ParentActivityBriefDecision {
  decision_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  decision_type: ParentActivityBriefDecisionType;
  brief_id: string;
  required_context_type: ActivityVariantBriefContextType;
  required_strength: ActivityVariantBriefStrength;
  suggested_game_family: SuggestedGameFamily;
  suggested_activity_pattern: string;
  reason: string;
  status_at_decision: ActivityVariantBrief['status'];
  created_at: string;
}
