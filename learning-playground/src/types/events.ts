/**
 * Event types for tracking activity attempts.
 * Stored locally, never sent to a server without explicit parent action.
 */

import type { DistractorStrength } from './domains';

export type AttemptOutcome =
  | "correct"
  | "incorrect"
  | "hint_used"
  | "abandoned"
  | "completed";

export type InputType = "tap" | "drag" | "draw" | "video" | "speech";

export interface SkillAttemptOutcome {
  skill_id: string;
  outcome: AttemptOutcome;
  reason?: string;
}

export interface ActivityAttemptEvent {
  event_id: string;
  session_id: string;
  child_id: string;
  activity_id: string;
  activity_version: number;
  skill_ids: string[];
  timestamp: string;
  prompt_text: string;
  outcome: AttemptOutcome;
  skill_outcomes?: SkillAttemptOutcome[];
  selected_choice_id?: string;
  correct_choice_id?: string;
  selected_answer: string;
  correct_answer: string;
  attempt_number: number;
  response_time_ms: number;
  difficulty_level: number;
  choice_count: number;
  distractor_strength: DistractorStrength;
  input_type: InputType;
  hint_shown: boolean;
  metadata?: Record<string, string | number | boolean>;
}
