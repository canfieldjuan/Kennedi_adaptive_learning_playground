/**
 * Contract tests: parent interpretation layer.
 */

import { describe, expect, test } from 'vitest';
import {
  buildParentSkillInterpretations,
  type ParentSkillInterpretation,
} from '../../src/core/parent-interpretation';
import type { ParentSessionReview } from '../../src/core/session-review';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('parent interpretation contract', () => {
  test('recommends transfer practice when approved variants exist and signals are strong', () => {
    const events = [
      makeEvent('event-1', 'correct'),
      makeEvent('event-2', 'correct'),
      makeEvent('event-3', 'correct'),
      makeEvent('event-4', 'correct'),
    ];
    const review = makeReview({
      totalAttempts: 4,
      correctAttempts: 4,
      accuracy: 1,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);

    expect(interpretation).toMatchObject({
      skill_label: 'Counting',
      status: 'Ready for next challenge',
      recommendation: 'Try transfer activity',
      attempts: 4,
      recent_accuracy: 1,
      mastery_status: 'transfer_ready',
      mastery_recommended_action: 'test_transfer',
      transfer_coverage_status: 'ready_for_transfer',
    });
    expect(interpretation.recommendation_reason).toContain('approved context');
    expect(interpretation.skill_graph_rule).toContain('Counting requires');
    expect(interpretation.transfer_missing_context_types).toContain(
      'different_prompt_mode'
    );
  });

  test('detects repeated incorrect answers and recommends support', () => {
    const events = [
      makeEvent('event-1', 'incorrect', { selectedAnswer: '2' }),
      makeEvent('event-2', 'incorrect', { selectedAnswer: '2' }),
      makeEvent('event-3', 'incorrect', { selectedAnswer: '4' }),
    ];
    const review = makeReview({
      totalAttempts: 3,
      correctAttempts: 0,
      accuracy: 0,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);

    expect(interpretation).toMatchObject({
      status: 'Needs more support',
      recommendation: 'Add support',
      repeated_error_pattern: '2',
    });
    expect(interpretation.status_reason).toContain('Repeated answer: 2');
  });

  test('uses not-enough-data when the session has too little evidence', () => {
    const events = [makeEvent('event-1', 'correct')];
    const review = makeReview({
      totalAttempts: 1,
      correctAttempts: 1,
      accuracy: 1,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);

    expect(interpretation.status).toBe('Not enough data yet');
    expect(interpretation.recommendation).toBe('Not enough data');
  });

  test('keeps guidance language non-comparative and non-pressure-based', () => {
    const events = [
      makeEvent('event-1', 'incorrect', { hintShown: true }),
      makeEvent('event-2', 'hint_used', { hintShown: true }),
      makeEvent('event-3', 'incorrect'),
    ];
    const review = makeReview({
      totalAttempts: 3,
      correctAttempts: 0,
      accuracy: 0,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);
    const text = serializeInterpretation(interpretation).toLowerCase();

    expect(interpretation.recommendation).toBe('Add support');
    expect(text).not.toMatch(/streak|rank|behind|score|faster|shame/);
  });
});

function makeReview(params: {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}): ParentSessionReview {
  return {
    session_id: 'session-1',
    completed_activities: ['math-count-stars-three'],
    skills_touched: ['counting'],
    accuracy_by_skill: [
      {
        skill_id: 'counting',
        correct_attempts: params.correctAttempts,
        total_attempts: params.totalAttempts,
        accuracy: params.accuracy,
      },
    ],
    hints_used: 0,
    abandoned_activities: [],
    most_repeated_activity: 'math-count-stars-three',
    parent_notes: [],
  };
}

function makeEvent(
  eventId: string,
  outcome: ActivityAttemptEvent['outcome'],
  overrides: {
    selectedAnswer?: string;
    hintShown?: boolean;
  } = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'How many stars do you see?',
    outcome,
    selected_choice_id: 'selected',
    correct_choice_id: 'three',
    selected_answer: overrides.selectedAnswer ?? '3',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: overrides.hintShown ?? outcome === 'hint_used',
  };
}

function serializeInterpretation(
  interpretation: ParentSkillInterpretation
): string {
  return [
    interpretation.status,
    interpretation.status_reason,
    interpretation.recommendation,
    interpretation.recommendation_reason,
  ].join(' ');
}
