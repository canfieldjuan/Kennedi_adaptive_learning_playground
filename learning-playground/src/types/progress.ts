/**
 * Progress tracking types.
 * Track mastery signals, not raw engagement metrics.
 */

export interface ChildProgressProfile {
  child_id: string;
  profile_version: number;
  created_at: string;
  updated_at: string;
  skill_mastery: Record<string, SkillMasteryState>;
  session_summary: SessionSummary[];
}

export interface SkillMasteryState {
  skill_id: string;
  current_level: number;
  confidence: number;
  total_attempts: number;
  correct_attempts: number;
  recent_accuracy: number;
  recent_average_response_ms: number;
  last_seen_at: string;
  last_promoted_at?: string;
  needs_review: boolean;
}

export interface SessionSummary {
  session_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  activities_completed: number;
  skills_touched: string[];
  parent_notes?: string;
}
