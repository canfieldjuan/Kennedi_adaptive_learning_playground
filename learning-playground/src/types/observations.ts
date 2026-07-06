/**
 * Parent-authored observations attached to local sessions.
 */

export interface ParentObservation {
  observation_id: string;
  session_id: string;
  child_id: string;
  note: string;
  created_at: string;
  updated_at?: string;
}
