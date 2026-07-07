import type { ActivityAttemptEvent } from '../types/events';
import type { ParentObservation } from '../types/observations';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from '../types/parent-actions';
import type { ParentTransferDecision } from '../types/transfer';
import type { ParentActivityBriefDecision } from '../types/activity-briefs';
import type {
  ParentMasterySnapshot,
  ParentReviewScheduleRecord,
} from '../types/mastery-records';
import type { ChildProgressProfile } from '../types/progress';
import type { ParentSettings } from '../types/storage';

const EXPORT_VERSION = '1';
const APP_BASELINE = 'v0.2.8';

export interface LocalDataHealth {
  total_events: number;
  total_sessions: number;
  total_observations: number;
  total_parent_actions: number;
  total_transfer_decisions: number;
  total_activity_brief_decisions: number;
  total_mastery_snapshots: number;
  total_review_schedule_records: number;
  first_event_timestamp?: string;
  latest_event_timestamp?: string;
  migrated_event_count: number;
}

export interface ProgressExportPayload {
  exported_at: string;
  export_metadata: {
    export_version: string;
    app_baseline: string;
    export_timestamp: string;
    data_sections_included: string[];
  };
  data_health: LocalDataHealth;
  settings: ParentSettings;
  child_profile: ChildProgressProfile;
  activity_events: ActivityAttemptEvent[];
  parent_observations: ParentObservation[];
  parent_difficulty_actions: ParentDifficultyAction[];
  parent_difficulty_overrides: ParentDifficultyOverride[];
  parent_transfer_decisions: ParentTransferDecision[];
  parent_activity_brief_decisions: ParentActivityBriefDecision[];
  parent_mastery_snapshots: ParentMasterySnapshot[];
  parent_review_schedule_records: ParentReviewScheduleRecord[];
}

export function buildProgressExportPayload(params: {
  settings: ParentSettings;
  childProfile: ChildProgressProfile;
  events: ActivityAttemptEvent[];
  observations: ParentObservation[];
  actions?: ParentDifficultyAction[];
  overrides?: ParentDifficultyOverride[];
  transferDecisions?: ParentTransferDecision[];
  activityBriefDecisions?: ParentActivityBriefDecision[];
  masterySnapshots?: ParentMasterySnapshot[];
  reviewScheduleRecords?: ParentReviewScheduleRecord[];
  exportedAt?: string;
}): ProgressExportPayload {
  const exportedAt = params.exportedAt ?? new Date().toISOString();
  const actions = params.actions ?? [];
  const overrides = params.overrides ?? [];
  const transferDecisions = params.transferDecisions ?? [];
  const activityBriefDecisions = params.activityBriefDecisions ?? [];
  const masterySnapshots = params.masterySnapshots ?? [];
  const reviewScheduleRecords = params.reviewScheduleRecords ?? [];

  return {
    exported_at: exportedAt,
    export_metadata: {
      export_version: EXPORT_VERSION,
      app_baseline: APP_BASELINE,
      export_timestamp: exportedAt,
      data_sections_included: [
        'settings',
        'child_profile',
        'activity_events',
        'parent_observations',
        'parent_difficulty_actions',
        'parent_difficulty_overrides',
        'parent_transfer_decisions',
        'parent_activity_brief_decisions',
        'parent_mastery_snapshots',
        'parent_review_schedule_records',
      ],
    },
    data_health: buildLocalDataHealth(
      params.events,
      params.observations,
      actions,
      transferDecisions,
      activityBriefDecisions,
      masterySnapshots,
      reviewScheduleRecords
    ),
    settings: params.settings,
    child_profile: params.childProfile,
    activity_events: params.events,
    parent_observations: params.observations,
    parent_difficulty_actions: actions,
    parent_difficulty_overrides: overrides,
    parent_transfer_decisions: transferDecisions,
    parent_activity_brief_decisions: activityBriefDecisions,
    parent_mastery_snapshots: masterySnapshots,
    parent_review_schedule_records: reviewScheduleRecords,
  };
}

export function buildLocalDataHealth(
  events: ActivityAttemptEvent[],
  observations: ParentObservation[],
  actions: ParentDifficultyAction[] = [],
  transferDecisions: ParentTransferDecision[] = [],
  activityBriefDecisions: ParentActivityBriefDecision[] = [],
  masterySnapshots: ParentMasterySnapshot[] = [],
  reviewScheduleRecords: ParentReviewScheduleRecord[] = []
): LocalDataHealth {
  const eventTimestamps = events
    .map((event) => event.timestamp)
    .sort((a, b) => a.localeCompare(b));

  return {
    total_events: events.length,
    total_sessions: new Set(events.map((event) => event.session_id)).size,
    total_observations: observations.length,
    total_parent_actions: actions.length,
    total_transfer_decisions: transferDecisions.length,
    total_activity_brief_decisions: activityBriefDecisions.length,
    total_mastery_snapshots: masterySnapshots.length,
    total_review_schedule_records: reviewScheduleRecords.length,
    first_event_timestamp: eventTimestamps[0],
    latest_event_timestamp: eventTimestamps[eventTimestamps.length - 1],
    migrated_event_count: events.filter((event) => (
      event.metadata?.migrated_from_legacy === true
    )).length,
  };
}

export function buildProgressExportJson(params: {
  settings: ParentSettings;
  childProfile: ChildProgressProfile;
  events: ActivityAttemptEvent[];
  observations: ParentObservation[];
  actions?: ParentDifficultyAction[];
  overrides?: ParentDifficultyOverride[];
  transferDecisions?: ParentTransferDecision[];
  activityBriefDecisions?: ParentActivityBriefDecision[];
  masterySnapshots?: ParentMasterySnapshot[];
  reviewScheduleRecords?: ParentReviewScheduleRecord[];
  exportedAt?: string;
}): string {
  return JSON.stringify(buildProgressExportPayload(params), null, 2);
}
