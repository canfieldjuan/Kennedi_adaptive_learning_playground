import type {
  MasteryStatus,
  RecommendedMasteryAction,
} from '../core/mastery-engine';
import type { TransferCoverageStatus } from '../core/transfer-coverage';
import type { TransferContextStrength } from './activity';

export interface ParentMasterySnapshot {
  snapshot_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  previous_status: MasteryStatus;
  next_status: MasteryStatus;
  confidence: number;
  recommended_action: RecommendedMasteryAction;
  reason: string;
  evidence_summary: string;
  skill_graph_rule: string;
  source_event_ids: string[];
  source_observation_ids: string[];
  transfer_status?: TransferCoverageStatus;
  transfer_required_context_count?: number;
  transfer_approved_context_count?: number;
  transfer_successful_context_count?: number;
  transfer_successful_strengths?: TransferContextStrength[];
  transfer_strongest_context_strength?: TransferContextStrength;
  created_at: string;
}

export interface ParentReviewScheduleRecord {
  schedule_id: string;
  snapshot_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  mastery_status: MasteryStatus;
  interval_label: string;
  next_review_at?: string;
  status_after_review: MasteryStatus;
  recommended_action: RecommendedMasteryAction;
  created_at: string;
}
