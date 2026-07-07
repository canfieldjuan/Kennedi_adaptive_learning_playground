import type { ActivityAttemptEvent } from '../types/events';
import type {
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../types/parent-actions';
import {
  type ActivityTitleLookup,
  resolveActivityTitle,
} from './parent-review-format';
import { formatParentDifficultyOverrideLabel } from './parent-difficulty-overrides';

export type ParentAppliedFitRecommendation =
  | 'Keep current guidance'
  | 'Consider resetting guidance'
  | 'Consider adding support'
  | 'Review after more play';

export interface ParentAppliedFitReview {
  override_id: string;
  skill_id: string;
  skill_label: string;
  override_label: string;
  active_since: string;
  activity_titles: string[];
  attempt_count: number;
  correct_attempts: number;
  accuracy: number;
  accuracy_label: string;
  hints_used: number;
  abandoned_count: number;
  latest_attempt_at?: string;
  recommendation: ParentAppliedFitRecommendation;
  reason: string;
}

type CountedOutcome = 'correct' | 'incorrect' | 'abandoned';

export function buildParentAppliedFitReviews(
  events: ActivityAttemptEvent[],
  overrides: ParentDifficultyOverride[],
  titleLookup: ActivityTitleLookup
): ParentAppliedFitReview[] {
  return overrides
    .filter((override) => override.active)
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      a.skill_label.localeCompare(b.skill_label)
    ))
    .map((override) => {
      const appliedEvents = getAppliedEventsForOverride(events, override);
      const countedEvents = appliedEvents.filter(hasCountedOutcome);
      const attemptCount = countedEvents.length;
      const correctAttempts = countedEvents.filter((event) => (
        event.outcome === 'correct'
      )).length;
      const hintsUsed = countHintsUsed(appliedEvents, countedEvents);
      const abandonedCount = countedEvents.filter((event) => (
        event.outcome === 'abandoned'
      )).length;
      const accuracy = attemptCount === 0 ? 0 : correctAttempts / attemptCount;
      const recommendation = getRecommendation({
        overrideType: override.override_type,
        attemptCount,
        accuracy,
        hintsUsed,
        abandonedCount,
      });

      return {
        override_id: override.override_id,
        skill_id: override.skill_id,
        skill_label: override.skill_label,
        override_label: formatParentDifficultyOverrideLabel(
          override.override_type
        ),
        active_since: override.created_at,
        activity_titles: getActivityTitles(appliedEvents, titleLookup),
        attempt_count: attemptCount,
        correct_attempts: correctAttempts,
        accuracy,
        accuracy_label: formatPercent(accuracy),
        hints_used: hintsUsed,
        abandoned_count: abandonedCount,
        latest_attempt_at: getLatestTimestamp(appliedEvents),
        recommendation,
        reason: getReason(recommendation, {
          attemptCount,
          correctAttempts,
          accuracy,
          hintsUsed,
          abandonedCount,
        }),
      };
    });
}

function getAppliedEventsForOverride(
  events: ActivityAttemptEvent[],
  override: ParentDifficultyOverride
): ActivityAttemptEvent[] {
  return events
    .filter((event) => (
      event.timestamp >= override.created_at &&
      event.metadata?.parent_guidance_applied === true &&
      event.metadata.parent_guidance_override_id === override.override_id
    ))
    .sort((a, b) => (
      a.timestamp.localeCompare(b.timestamp) ||
      a.event_id.localeCompare(b.event_id)
    ));
}

function getActivityTitles(
  events: ActivityAttemptEvent[],
  titleLookup: ActivityTitleLookup
): string[] {
  const activityIds = [...new Set(events.map((event) => event.activity_id))];
  return activityIds
    .map((activityId) => resolveActivityTitle(activityId, titleLookup))
    .sort((a, b) => a.localeCompare(b));
}

function countHintsUsed(
  appliedEvents: ActivityAttemptEvent[],
  countedEvents: ActivityAttemptEvent[]
): number {
  const explicitHintEvents = appliedEvents.filter((event) => (
    event.outcome === 'hint_used'
  )).length;

  if (explicitHintEvents > 0) return explicitHintEvents;

  return countedEvents.filter((event) => event.hint_shown).length;
}

function getLatestTimestamp(
  events: ActivityAttemptEvent[]
): string | undefined {
  return [...events]
    .sort((a, b) => (
      b.timestamp.localeCompare(a.timestamp) ||
      b.event_id.localeCompare(a.event_id)
    ))[0]?.timestamp;
}

function getRecommendation(params: {
  overrideType: ParentDifficultyOverrideType;
  attemptCount: number;
  accuracy: number;
  hintsUsed: number;
  abandonedCount: number;
}): ParentAppliedFitRecommendation {
  if (params.attemptCount < 2) return 'Review after more play';

  const needsSupport = (
    params.accuracy < 0.5 ||
    params.hintsUsed >= 2 ||
    params.abandonedCount > 0
  );

  if (needsSupport && params.overrideType === 'promote_gently') {
    return 'Consider resetting guidance';
  }

  if (needsSupport) return 'Consider adding support';

  if (
    params.accuracy >= 0.8 &&
    params.hintsUsed === 0 &&
    params.abandonedCount === 0
  ) {
    return 'Keep current guidance';
  }

  return 'Review after more play';
}

function getReason(
  recommendation: ParentAppliedFitRecommendation,
  params: {
    attemptCount: number;
    correctAttempts: number;
    accuracy: number;
    hintsUsed: number;
    abandonedCount: number;
  }
): string {
  if (recommendation === 'Review after more play') {
    return `${params.attemptCount} counted attempt(s) since this guidance affected an activity. Keep watching the fit.`;
  }

  if (recommendation === 'Consider resetting guidance') {
    return 'Recent attempts used hints, stops, or misses after a gentle challenge. A simpler fit may help next time.';
  }

  if (recommendation === 'Consider adding support') {
    return 'Recent attempts show the activity may still need a gentler setup or more adult support.';
  }

  return `${formatPercent(params.accuracy)} accuracy across ${params.attemptCount} counted attempt(s), with no hints or stops.`;
}

function hasCountedOutcome(
  event: ActivityAttemptEvent
): event is ActivityAttemptEvent & { outcome: CountedOutcome } {
  return (
    event.outcome === 'correct' ||
    event.outcome === 'incorrect' ||
    event.outcome === 'abandoned'
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
