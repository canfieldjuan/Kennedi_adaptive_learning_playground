/**
 * Story history (spec §21) — a narrowly scoped, NON-EVALUATIVE local
 * record of story sessions. Deliberately not an ActivityAttemptEvent:
 * creative decisions have no correct answer, so this type carries no
 * correctness, no mastery, no scores, no interpretations — only the
 * facts of which story was told and how far it went.
 */

export type StoryHistoryStatus = 'completed' | 'left_early';

export interface StoryHistoryRecord {
  story_session_id: string;
  mode: 'narrated' | 'together';
  family_id: string;
  character_id: string;
  setting_id: string;
  problem_id: string;
  /** Choice ids in the order the child picked them. */
  choice_path: string[];
  /** Present only when an ending was reached. */
  ending_id?: string;
  started_at: string;
  /** Present only when status is 'completed'. */
  completed_at?: string;
  status: StoryHistoryStatus;
}
