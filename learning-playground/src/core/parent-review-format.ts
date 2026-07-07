import type { ActivityAttemptEvent, AttemptOutcome } from '../types/events';

export type ActivityTitleLookup = Record<string, string>;

export interface ParentRecentAttempt {
  event_id: string;
  activity_id: string;
  activity_title: string;
  skill_ids: string[];
  skill_labels: string[];
  prompt_text: string;
  selected_answer: string;
  correct_answer: string;
  outcome: AttemptOutcome;
  outcome_label: string;
  hint_used: boolean;
  response_time_ms: number;
  response_time_label: string;
  parent_guidance_label?: string;
}

const REVIEW_ATTEMPT_OUTCOMES = new Set<AttemptOutcome>([
  'correct',
  'incorrect',
  'hint_used',
  'abandoned',
]);

export function resolveActivityTitle(
  activityId: string,
  titleLookup: ActivityTitleLookup
): string {
  return titleLookup[activityId] ?? formatInternalName(activityId);
}

export function formatActivityTitleList(
  activityIds: string[],
  titleLookup: ActivityTitleLookup
): string[] {
  return activityIds.map((activityId) => (
    resolveActivityTitle(activityId, titleLookup)
  ));
}

export function formatSkillLabel(skillId: string): string {
  return formatInternalName(skillId);
}

export function formatOutcomeLabel(outcome: AttemptOutcome): string {
  switch (outcome) {
    case 'correct':
      return 'Correct';
    case 'incorrect':
      return 'Incorrect';
    case 'hint_used':
      return 'Hint used';
    case 'abandoned':
      return 'Stopped before finishing';
    case 'completed':
      return 'Completed';
  }
}

export function formatRecentAttempts(
  events: ActivityAttemptEvent[],
  titleLookup: ActivityTitleLookup,
  limit = 6
): ParentRecentAttempt[] {
  return [...events]
    .filter((event) => REVIEW_ATTEMPT_OUTCOMES.has(event.outcome))
    .sort(compareNewestFirst)
    .slice(0, Math.max(0, limit))
    .map((event) => ({
      event_id: event.event_id,
      activity_id: event.activity_id,
      activity_title: resolveActivityTitle(event.activity_id, titleLookup),
      skill_ids: event.skill_ids,
      skill_labels: event.skill_ids.map(formatSkillLabel),
      prompt_text: event.prompt_text,
      selected_answer: event.selected_answer,
      correct_answer: event.correct_answer,
      outcome: event.outcome,
      outcome_label: formatOutcomeLabel(event.outcome),
      hint_used: event.hint_shown || event.outcome === 'hint_used',
      response_time_ms: event.response_time_ms,
      response_time_label: formatResponseTime(event.response_time_ms),
      parent_guidance_label: formatParentGuidanceLabel(event.metadata),
    }));
}

export function formatInternalName(value: string): string {
  return value
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatResponseTime(responseTimeMs: number): string {
  if (responseTimeMs < 1000) return `${responseTimeMs} ms`;

  const seconds = responseTimeMs / 1000;
  const roundedSeconds = Number.isInteger(seconds)
    ? seconds.toFixed(0)
    : seconds.toFixed(1);
  return `${roundedSeconds} sec`;
}

function formatParentGuidanceLabel(
  metadata: ActivityAttemptEvent['metadata']
): string | undefined {
  if (metadata?.parent_guidance_applied !== true) return undefined;

  if (typeof metadata.parent_guidance_label === 'string') {
    return `Applied: ${metadata.parent_guidance_label}`;
  }

  if (typeof metadata.parent_guidance_override_type === 'string') {
    return `Applied: ${formatInternalName(metadata.parent_guidance_override_type)}`;
  }

  return 'Applied';
}

function compareNewestFirst(
  a: ActivityAttemptEvent,
  b: ActivityAttemptEvent
): number {
  return (
    b.timestamp.localeCompare(a.timestamp) ||
    b.event_id.localeCompare(a.event_id)
  );
}
