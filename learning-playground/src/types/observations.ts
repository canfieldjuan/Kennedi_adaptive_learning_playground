/**
 * Parent-authored observations attached to local sessions.
 */

export type ParentObservationCategory =
  | 'general'
  | 'independent_success'
  | 'needed_support'
  | 'too_easy'
  | 'about_right'
  | 'too_hard'
  | 'frustration'
  | 'real_world_transfer';

export interface ParentObservation {
  observation_id: string;
  session_id: string;
  child_id: string;
  note: string;
  category?: ParentObservationCategory;
  skill_ids?: string[];
  created_at: string;
  updated_at?: string;
}
