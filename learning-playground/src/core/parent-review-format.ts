import type { ActivityAttemptEvent, AttemptOutcome } from '../types/events';
import { eventAppliesToSkill } from './skill-outcomes';

export interface ActivityTitleEntry {
  current: string;
  versions?: Record<number, string>;
}

export type ActivityTitleLookup = Record<string, string | ActivityTitleEntry>;

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
  titleLookup: ActivityTitleLookup,
  activityVersion?: number
): string {
  const entry = titleLookup[activityId];
  if (typeof entry === 'string') return entry;
  if (entry) {
    if (activityVersion !== undefined) {
      const versionedTitle = entry.versions?.[activityVersion];
      if (versionedTitle) return versionedTitle;
    }
    return entry.current;
  }

  return formatInternalName(activityId);
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
  const supersededBearCafeTrayCheckIds = getSupersededBearCafeTrayCheckIds(events);

  return [...events]
    .filter((event) => isReviewAttemptEvent(event, supersededBearCafeTrayCheckIds))
    .sort(compareNewestFirst)
    .slice(0, Math.max(0, limit))
    .map((event) => {
      const skillIds = getEventSkillIds(event);
      return {
        event_id: event.event_id,
        activity_id: event.activity_id,
        activity_title: resolveActivityTitle(event.activity_id, titleLookup, event.activity_version),
        skill_ids: skillIds,
        skill_labels: skillIds.map(formatSkillLabel),
        prompt_text: event.prompt_text,
        selected_answer: event.selected_answer,
        correct_answer: event.correct_answer,
        outcome: event.outcome,
        outcome_label: formatOutcomeLabel(event.outcome),
        hint_used: event.hint_shown || event.outcome === 'hint_used',
        response_time_ms: event.response_time_ms,
        response_time_label: formatResponseTime(event.response_time_ms),
        parent_guidance_label: formatParentGuidanceLabel(event.metadata),
      };
    });
}

function getEventSkillIds(event: ActivityAttemptEvent): string[] {
  if (!event.skill_outcomes) return event.skill_ids;

  return [...new Set(
    event.skill_outcomes
      .map((item) => item.skill_id)
      .filter((skillId) => eventAppliesToSkill(event, skillId))
  )];
}

function isReviewAttemptEvent(
  event: ActivityAttemptEvent,
  supersededBearCafeTrayCheckIds: Set<string>
): boolean {
  if (event.metadata?.event_name === 'food_selected') return false;

  if (isBearCafeTrayCheckSuccess(event)) {
    return !supersededBearCafeTrayCheckIds.has(event.event_id);
  }

  if (REVIEW_ATTEMPT_OUTCOMES.has(event.outcome)) return true;
  return isBearCafeDeliveredOrder(event);
}

function isBearCafeDeliveredOrder(event: ActivityAttemptEvent): boolean {
  return (
    event.outcome === 'completed' &&
    event.activity_id.startsWith('kennedis-orders-') &&
    event.metadata?.event_name === 'order_delivered'
  );
}

function getSupersededBearCafeTrayCheckIds(
  events: ActivityAttemptEvent[]
): Set<string> {
  const pendingTrayChecksByOrderKey = new Map<string, ActivityAttemptEvent[]>();
  const supersededTrayCheckIds = new Set<string>();

  [...events].sort(compareOldestFirst).forEach((event) => {
    const orderKey = getBearCafeOrderKey(event);

    if (isBearCafeTrayCheckSuccess(event)) {
      const pendingTrayChecks = pendingTrayChecksByOrderKey.get(orderKey) ?? [];
      pendingTrayChecks.push(event);
      pendingTrayChecksByOrderKey.set(orderKey, pendingTrayChecks);
      return;
    }

    if (!isBearCafeDeliveredOrder(event)) return;

    const pendingTrayChecks = pendingTrayChecksByOrderKey.get(orderKey);
    const supersededTrayCheck = pendingTrayChecks?.pop();
    if (supersededTrayCheck) {
      supersededTrayCheckIds.add(supersededTrayCheck.event_id);
    }
  });

  return supersededTrayCheckIds;
}

function isBearCafeTrayCheckSuccess(event: ActivityAttemptEvent): boolean {
  return (
    event.outcome === 'correct' &&
    event.activity_id.startsWith('kennedis-orders-') &&
    event.metadata?.event_name === 'tray_checked'
  );
}

function getBearCafeOrderKey(event: ActivityAttemptEvent): string {
  const metadata = event.metadata;

  return [
    event.session_id,
    event.activity_id,
    event.attempt_number,
    event.prompt_text,
    event.selected_choice_id ?? '',
    event.correct_choice_id ?? '',
    event.selected_answer,
    event.correct_answer,
    String(metadata?.selected_food_ids ?? ''),
    String(metadata?.selected_quantity ?? ''),
    String(metadata?.selected_color_id ?? ''),
    String(metadata?.selected_decoration_id ?? ''),
  ].join('|');
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

function compareOldestFirst(
  a: ActivityAttemptEvent,
  b: ActivityAttemptEvent
): number {
  return (
    a.timestamp.localeCompare(b.timestamp) ||
    a.event_id.localeCompare(b.event_id)
  );
}
