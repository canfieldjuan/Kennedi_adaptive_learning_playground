/**
 * Parent session review summary.
 * Derived locally from attempt events and parent observations.
 */

import type { ActivityAttemptEvent } from '../types/events';
import type { ParentObservation } from '../types/observations';

export interface SkillAccuracySummary {
  skill_id: string;
  correct_attempts: number;
  total_attempts: number;
  accuracy: number;
}

export interface ParentSessionReview {
  session_id: string;
  completed_activities: string[];
  skills_touched: string[];
  accuracy_by_skill: SkillAccuracySummary[];
  hints_used: number;
  abandoned_activities: string[];
  most_repeated_activity?: string;
  parent_notes: ParentObservation[];
}

type CountedOutcome = 'correct' | 'incorrect' | 'abandoned';

export function buildParentSessionReview(
  events: ActivityAttemptEvent[],
  observations: ParentObservation[],
  fallbackSessionId: string
): ParentSessionReview {
  const sessionId = getLatestSessionId(events) ?? fallbackSessionId;
  const sessionEvents = events.filter((event) => event.session_id === sessionId);
  const sessionObservations = observations
    .filter((observation) => observation.session_id === sessionId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return {
    session_id: sessionId,
    completed_activities: getUniqueValues(
      sessionEvents
        .filter((event) => event.outcome === 'completed')
        .map((event) => event.activity_id)
    ),
    skills_touched: getUniqueValues(
      sessionEvents.flatMap((event) => event.skill_ids)
    ),
    accuracy_by_skill: buildAccuracyBySkill(sessionEvents),
    hints_used: sessionEvents.filter((event) => event.outcome === 'hint_used').length,
    abandoned_activities: getUniqueValues(
      sessionEvents
        .filter((event) => event.outcome === 'abandoned')
        .map((event) => event.activity_id)
    ),
    most_repeated_activity: getMostRepeatedActivity(sessionEvents),
    parent_notes: sessionObservations,
  };
}

function getLatestSessionId(events: ActivityAttemptEvent[]): string | undefined {
  const latestEvent = [...events].sort((a, b) => (
    b.timestamp.localeCompare(a.timestamp)
  ))[0];
  return latestEvent?.session_id;
}

function buildAccuracyBySkill(
  events: ActivityAttemptEvent[]
): SkillAccuracySummary[] {
  const grouped = new Map<string, ActivityAttemptEvent[]>();

  for (const event of events.filter(hasCountedOutcome)) {
    for (const skillId of event.skill_ids) {
      const skillEvents = grouped.get(skillId) ?? [];
      skillEvents.push(event);
      grouped.set(skillId, skillEvents);
    }
  }

  return [...grouped.entries()]
    .map(([skillId, skillEvents]) => {
      const correctAttempts = skillEvents.filter((event) => (
        event.outcome === 'correct'
      )).length;

      return {
        skill_id: skillId,
        correct_attempts: correctAttempts,
        total_attempts: skillEvents.length,
        accuracy: skillEvents.length === 0 ? 0 : correctAttempts / skillEvents.length,
      };
    })
    .sort((a, b) => a.skill_id.localeCompare(b.skill_id));
}

function getMostRepeatedActivity(
  events: ActivityAttemptEvent[]
): string | undefined {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.activity_id, (counts.get(event.activity_id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([activityA, countA], [activityB, countB]) => (
      countB - countA || activityA.localeCompare(activityB)
    ))[0]?.[0];
}

function getUniqueValues(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
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
