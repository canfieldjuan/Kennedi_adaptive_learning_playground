/**
 * Contract tests: parent session review summary.
 */

import { describe, expect, test } from 'vitest';
import { buildParentSessionReview } from '../../src/core/session-review';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type { ParentObservation } from '../../src/types/observations';

describe('parent session review contract', () => {
  test('summarizes completed activities, skills, accuracy, hints, abandons, repeats, and notes', () => {
    const events: ActivityAttemptEvent[] = [
      makeEvent({ activityId: 'math-count-stars-three', outcome: 'correct', skillIds: ['counting'] }),
      makeEvent({ activityId: 'math-count-stars-three', outcome: 'hint_used', skillIds: ['counting'] }),
      makeEvent({ activityId: 'math-count-stars-three', outcome: 'completed', skillIds: ['counting'] }),
      makeEvent({ activityId: 'phonics-find-b', outcome: 'incorrect', skillIds: ['initial_sound'] }),
      makeEvent({ activityId: 'phonics-find-b', outcome: 'abandoned', skillIds: ['initial_sound'] }),
    ];
    const observations: ParentObservation[] = [
      {
        observation_id: 'observation-1',
        session_id: 'session-1',
        child_id: 'local-child',
        note: 'Needed a break after phonics.',
        created_at: '2026-01-01T12:05:00.000Z',
      },
    ];

    const review = buildParentSessionReview(events, observations, 'session-1');

    expect(review.completed_activities).toEqual(['math-count-stars-three']);
    expect(review.skills_touched).toEqual(['counting', 'initial_sound']);
    expect(review.hints_used).toBe(1);
    expect(review.abandoned_activities).toEqual(['phonics-find-b']);
    expect(review.most_repeated_activity).toBe('math-count-stars-three');
    expect(review.parent_notes[0].note).toBe('Needed a break after phonics.');
    expect(review.accuracy_by_skill).toEqual([
      {
        skill_id: 'counting',
        correct_attempts: 1,
        total_attempts: 1,
        accuracy: 1,
      },
      {
        skill_id: 'initial_sound',
        correct_attempts: 0,
        total_attempts: 2,
        accuracy: 0,
      },
    ]);
  });

  test('uses per-skill outcomes for compound activity accuracy', () => {
    const events: ActivityAttemptEvent[] = [
      makeEvent({
        activityId: 'kennedis-orders-pink-berries-001',
        outcome: 'incorrect',
        skillIds: ['counting', 'color_fill'],
        skillOutcomes: [
          {
            skill_id: 'counting',
            outcome: 'correct',
            reason: 'quantity_match',
          },
          {
            skill_id: 'color_fill',
            outcome: 'incorrect',
            reason: 'color_mismatch',
          },
        ],
      }),
    ];

    const review = buildParentSessionReview(events, [], 'session-1');

    expect(review.accuracy_by_skill).toEqual([
      {
        skill_id: 'color_fill',
        correct_attempts: 0,
        total_attempts: 1,
        accuracy: 0,
      },
      {
        skill_id: 'counting',
        correct_attempts: 1,
        total_attempts: 1,
        accuracy: 1,
      },
    ]);
  });
});

function makeEvent(params: {
  activityId: string;
  outcome: ActivityAttemptEvent['outcome'];
  skillIds: string[];
  skillOutcomes?: ActivityAttemptEvent['skill_outcomes'];
}): ActivityAttemptEvent {
  return {
    event_id: `event-${params.activityId}-${params.outcome}`,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: params.activityId,
    activity_version: 1,
    skill_ids: params.skillIds,
    timestamp: '2026-01-01T12:00:00.000Z',
    prompt_text: 'Prompt',
    outcome: params.outcome,
    skill_outcomes: params.skillOutcomes,
    selected_choice_id: 'selected',
    correct_choice_id: 'correct',
    selected_answer: 'selected',
    correct_answer: 'correct',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: params.outcome === 'hint_used',
  };
}
