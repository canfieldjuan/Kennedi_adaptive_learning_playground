import type { ActivityAttemptEvent } from '../types/events';
import type { ParentObservation } from '../types/observations';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from '../types/parent-actions';
import type { ParentTransferDecision } from '../types/transfer';
import type { ChildProgressProfile } from '../types/progress';
import type { ParentSettings } from '../types/storage';

const EXPORT_VERSION = '1';
const APP_BASELINE = 'v0.2.3';

export interface LocalDataHealth {
  total_events: number;
  total_sessions: number;
  total_observations: number;
  total_parent_actions: number;
  total_transfer_decisions: number;
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
}

export function buildProgressExportPayload(params: {
  settings: ParentSettings;
  childProfile: ChildProgressProfile;
  events: ActivityAttemptEvent[];
  observations: ParentObservation[];
  actions?: ParentDifficultyAction[];
  overrides?: ParentDifficultyOverride[];
  transferDecisions?: ParentTransferDecision[];
  exportedAt?: string;
}): ProgressExportPayload {
  const exportedAt = params.exportedAt ?? new Date().toISOString();
  const actions = params.actions ?? [];
  const overrides = params.overrides ?? [];
  const transferDecisions = params.transferDecisions ?? [];

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
      ],
    },
    data_health: buildLocalDataHealth(
      params.events,
      params.observations,
      actions,
      transferDecisions
    ),
    settings: params.settings,
    child_profile: params.childProfile,
    activity_events: params.events,
    parent_observations: params.observations,
    parent_difficulty_actions: actions,
    parent_difficulty_overrides: overrides,
    parent_transfer_decisions: transferDecisions,
  };
}

export function buildLocalDataHealth(
  events: ActivityAttemptEvent[],
  observations: ParentObservation[],
  actions: ParentDifficultyAction[] = [],
  transferDecisions: ParentTransferDecision[] = []
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
  exportedAt?: string;
}): string {
  return JSON.stringify(buildProgressExportPayload(params), null, 2);
}
