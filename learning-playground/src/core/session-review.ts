/**
 * Parent session review summary.
 * Derived locally from attempt events and parent observations.
 */

import type { ActivityAttemptEvent } from '../types/events';
import type { ParentObservation } from '../types/observations';
import {
  eventAppliesToSkill,
  hasCountedSkillOutcome,
  isCorrectForSkill,
} from './skill-outcomes';

export interface SkillAccuracySummary {
  skill_id: string;
  correct_attempts: number;
  total_attempts: number;
  accuracy: number;
}

export interface ActivityReviewReference {
  activity_id: string;
  activity_version: number;
}

export interface ParentSessionReview {
  session_id: string;
  completed_activities: string[];
  completed_activity_refs?: ActivityReviewReference[];
  skills_touched: string[];
  accuracy_by_skill: SkillAccuracySummary[];
  hints_used: number;
  abandoned_activities: string[];
  most_repeated_activity?: string;
  most_repeated_activity_ref?: ActivityReviewReference;
  parent_notes: ParentObservation[];
}

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
  const mostRepeatedActivityRef = getMostRepeatedActivityReference(sessionEvents);

  return {
    session_id: sessionId,
    completed_activities: getUniqueValues(
      sessionEvents
        .filter((event) => event.outcome === 'completed')
        .map((event) => event.activity_id)
    ),
    completed_activity_refs: getUniqueActivityReferences(
      sessionEvents.filter((event) => event.outcome === 'completed')
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
    most_repeated_activity: mostRepeatedActivityRef?.activity_id,
    most_repeated_activity_ref: mostRepeatedActivityRef,
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

  for (const event of events) {
    for (const skillId of getEventSkillIds(event)) {
      if (!hasCountedSkillOutcome(event, skillId)) continue;
      const skillEvents = grouped.get(skillId) ?? [];
      skillEvents.push(event);
      grouped.set(skillId, skillEvents);
    }
  }

  return [...grouped.entries()]
    .map(([skillId, skillEvents]) => {
      const correctAttempts = skillEvents.filter((event) => (
        isCorrectForSkill(event, skillId)
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

function getMostRepeatedActivityReference(
  events: ActivityAttemptEvent[]
): ActivityReviewReference | undefined {
  const counts = new Map<string, { reference: ActivityReviewReference; count: number }>();

  for (const event of events) {
    if (event.metadata?.event_name === 'food_selected') continue;
    const key = `${event.activity_id}\u0000${event.activity_version}`;
    const current = counts.get(key);
    counts.set(key, {
      reference: {
        activity_id: event.activity_id,
        activity_version: event.activity_version,
      },
      count: (current?.count ?? 0) + 1,
    });
  }

  return [...counts.values()]
    .sort((first, second) => (
      second.count - first.count ||
      first.reference.activity_id.localeCompare(second.reference.activity_id) ||
      first.reference.activity_version - second.reference.activity_version
    ))[0]?.reference;
}

function getUniqueActivityReferences(
  events: ActivityAttemptEvent[]
): ActivityReviewReference[] {
  const references = new Map<string, ActivityReviewReference>();

  for (const event of events) {
    const key = `${event.activity_id}\u0000${event.activity_version}`;
    references.set(key, {
      activity_id: event.activity_id,
      activity_version: event.activity_version,
    });
  }

  return [...references.values()].sort((first, second) => (
    first.activity_id.localeCompare(second.activity_id) ||
    first.activity_version - second.activity_version
  ));
}

function getUniqueValues(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function getEventSkillIds(event: ActivityAttemptEvent): string[] {
  if (event.skill_outcomes) {
    return [...new Set(
      event.skill_outcomes
        .map((item) => item.skill_id)
        .filter((skillId) => eventAppliesToSkill(event, skillId))
    )];
  }

  return event.skill_ids;
}
