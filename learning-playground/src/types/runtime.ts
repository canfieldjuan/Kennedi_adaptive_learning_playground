/**
 * Activity runtime interface.
 * Every activity (DOM, Canvas, or library-based) implements this contract.
 */

import type { LearningActivity } from './activity';
import type { ActivityAttemptEvent } from './events';
import type { ParentObservation } from './observations';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from './parent-actions';
import type { ParentTransferDecision } from './transfer';
import type { ParentActivityBriefDecision } from './activity-briefs';
import type {
  ParentMasterySnapshot,
  ParentReviewScheduleRecord,
} from './mastery-records';
import type { ParentSettings } from './storage';
import type { ChildProgressProfile, SkillMasteryState } from './progress';

export interface SpeechServiceInterface {
  enabled: boolean;
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): void;
  repeatLast(): void;
}

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  interrupt?: boolean;
}

export interface AudioServiceInterface {
  play(soundId: string): void;
  stop(): void;
}

export interface StorageServiceInterface {
  getSettings(): ParentSettings;
  saveSettings(settings: ParentSettings): void;
  getProgressProfile(childId?: string): ChildProgressProfile;
  saveProgressProfile(profile: ChildProgressProfile): void;
  updateProgressFromEvents(
    childId: string,
    events: ActivityAttemptEvent[]
  ): ChildProgressProfile;
  resetProgress(): void;
  getParentObservations(): ParentObservation[];
  saveParentObservation(observation: ParentObservation): void;
  clearParentObservations(): void;
  getParentDifficultyActions(): ParentDifficultyAction[];
  saveParentDifficultyAction(action: ParentDifficultyAction): void;
  clearParentDifficultyActions(): void;
  getParentDifficultyOverrides(): ParentDifficultyOverride[];
  saveParentDifficultyOverride(override: ParentDifficultyOverride): void;
  clearParentDifficultyOverrides(): void;
  getParentTransferDecisions(): ParentTransferDecision[];
  saveParentTransferDecision(decision: ParentTransferDecision): void;
  clearParentTransferDecisions(): void;
  getParentActivityBriefDecisions(): ParentActivityBriefDecision[];
  saveParentActivityBriefDecision(decision: ParentActivityBriefDecision): void;
  clearParentActivityBriefDecisions(): void;
  getParentMasterySnapshots(): ParentMasterySnapshot[];
  saveParentMasterySnapshot(snapshot: ParentMasterySnapshot): void;
  clearParentMasterySnapshots(): void;
  getParentReviewScheduleRecords(): ParentReviewScheduleRecord[];
  saveParentReviewScheduleRecord(record: ParentReviewScheduleRecord): void;
  clearParentReviewScheduleRecords(): void;
  exportProgressData(events: ActivityAttemptEvent[]): string;
}

export interface ActivityContext {
  child_id: string;
  session_id: string;
  parent_settings: ParentSettings;
  current_skill_states: Record<string, SkillMasteryState>;
  audio: AudioServiceInterface;
  speech: SpeechServiceInterface;
  storage: StorageServiceInterface;
}

export interface ActivityCompletionSummary {
  activity_id: string;
  completed: boolean;
  duration_seconds: number;
  attempts: number;
  correct: number;
  hints_used: number;
  skill_updates: SkillMasteryState[];
}

export interface ActivityRuntime {
  activity_id: string;
  load(activity: LearningActivity, context: ActivityContext): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  onAttempt(handler: (event: ActivityAttemptEvent) => void): void;
  onComplete(handler: (summary: ActivityCompletionSummary) => void): void;
}
