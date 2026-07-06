import type { LocalDataHealth } from './export-data';

export type ParentEmptyStateKind =
  | 'progress'
  | 'accuracy'
  | 'recent_attempts'
  | 'guidance'
  | 'parent_notes';

export interface ParentDataHealthMetric {
  label: string;
  value: string;
}

export interface ParentDataHealthSummary {
  status_label: string;
  status_detail: string;
  metrics: ParentDataHealthMetric[];
}

const EMPTY_STATE_MESSAGES: Record<ParentEmptyStateKind, string> = {
  progress: 'No local attempts recorded yet.',
  accuracy: 'No counted attempts in this session yet.',
  recent_attempts: 'No recent attempts for this session yet.',
  guidance: 'Guidance appears after there is review data for a skill.',
  parent_notes: 'No parent note saved for this session yet.',
};

export function getParentEmptyStateMessage(
  kind: ParentEmptyStateKind
): string {
  return EMPTY_STATE_MESSAGES[kind];
}

export function formatParentDataHealth(
  health: LocalDataHealth
): ParentDataHealthSummary {
  const hasEvents = health.total_events > 0;

  return {
    status_label: hasEvents ? 'Local data ready' : 'Waiting for first activity',
    status_detail: hasEvents
      ? `Latest activity: ${formatHealthTimestamp(health.latest_event_timestamp)}.`
      : 'No local activity data has been recorded yet.',
    metrics: [
      { label: 'Events', value: String(health.total_events) },
      { label: 'Sessions', value: String(health.total_sessions) },
      { label: 'Parent Notes', value: String(health.total_observations) },
      {
        label: 'First Event',
        value: formatHealthTimestamp(health.first_event_timestamp),
      },
      {
        label: 'Latest Event',
        value: formatHealthTimestamp(health.latest_event_timestamp),
      },
      {
        label: 'Migrated Events',
        value: String(health.migrated_event_count),
      },
    ],
  };
}

function formatHealthTimestamp(timestamp?: string): string {
  if (!timestamp) return 'None yet';

  const [date = '', timeWithZone = ''] = timestamp.split('T');
  const time = timeWithZone.slice(0, 5);
  if (!date || !time) return timestamp;

  return `${date} ${time} UTC`;
}
