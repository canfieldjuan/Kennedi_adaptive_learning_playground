import type { TransferContextType } from './activity';
import type { ParentAdaptiveRecommendation } from '../core/recommendation-engine';

export type ParentTransferDecisionType =
  | 'approve_transfer_activity'
  | 'hold_transfer_activity';

export interface ParentTransferDecision {
  decision_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  decision_type: ParentTransferDecisionType;
  source_recommendation: ParentAdaptiveRecommendation;
  source_status: string;
  source_reason: string;
  missing_context_type: TransferContextType;
  suggested_activity_template: string;
  transfer_activity_id?: string;
  transfer_activity_title?: string;
  created_at: string;
}
