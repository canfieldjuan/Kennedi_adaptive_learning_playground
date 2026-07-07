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
  compact_metrics: ParentDataHealthMetric[];
  metrics: ParentDataHealthMetric[];
}

const EMPTY_STATE_MESSAGES: Record<ParentEmptyStateKind, string> = {
  progress: 'No local attempts recorded yet.',
  accuracy: 'No counted attempts in this session yet.',
  recent_attempts: 'No attempts in this session yet. After an activity, this will show the prompt, answer, hint use, outcome, and response time.',
  guidance: 'Guidance appears after a skill has enough local attempts. The child flow stays unchanged while the parent reviews the fit.',
  parent_notes: 'No parent notes for this session yet. Add anything you noticed; notes stay local and export with progress data.',
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
  const compactMetrics = [
    { label: 'Events', value: String(health.total_events) },
    { label: 'Sessions', value: String(health.total_sessions) },
    { label: 'Parent Notes', value: String(health.total_observations) },
    { label: 'Parent Actions', value: String(health.total_parent_actions) },
    { label: 'Transfer Choices', value: String(health.total_transfer_decisions) },
    {
      label: 'Latest Event',
      value: formatHealthTimestamp(health.latest_event_timestamp),
    },
  ];

  return {
    status_label: hasEvents ? 'Local data ready' : 'Waiting for first activity',
    status_detail: hasEvents
      ? `Latest activity: ${formatHealthTimestamp(health.latest_event_timestamp)}.`
      : 'No local activity data has been recorded yet.',
    compact_metrics: compactMetrics,
    metrics: [
      ...compactMetrics.slice(0, 5),
      {
        label: 'First Event',
        value: formatHealthTimestamp(health.first_event_timestamp),
      },
      compactMetrics[5],
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
