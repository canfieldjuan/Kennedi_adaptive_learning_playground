/**
 * Core tests: mastery engine.
 */

import { describe, expect, test } from 'vitest';
import { evaluateSkillMastery } from '../../src/core/mastery-engine';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('mastery engine', () => {
  test('does not grant mastery from repeated success in one activity context', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
        makeEvent('event-4', 'correct', '2026-01-03T12:00:00.000Z'),
      ],
    });

    expect(evaluation.next_status).toBe('likely_mastered');
    expect(evaluation.recommended_action).toBe('test_transfer');
    expect(evaluation.reason).toContain('transfer');
  });

  test('does not count incorrect activity contexts as transfer evidence', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-03T12:00:00.000Z'),
        makeEvent('event-4', 'correct', '2026-01-03T12:01:00.000Z'),
        makeEvent('event-5', 'incorrect', '2026-01-03T12:02:00.000Z', {
          activityId: 'math-count-blocks-three',
        }),
      ],
    });

    expect(evaluation.next_status).toBe('likely_mastered');
    expect(evaluation.recommended_action).toBe('test_transfer');
    expect(evaluation.evidence.map((item) => item.type)).not.toContain(
      'transfer'
    );
  });

  test('requires transfer and retention before mastery', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z', {
          activityId: 'math-count-blocks-three',
        }),
        makeEvent('event-3', 'correct', '2026-01-03T12:00:00.000Z'),
      ],
    });

    expect(evaluation.next_status).toBe('mastered');
    expect(evaluation.recommended_action).toBe('schedule_review');
    expect(evaluation.evidence.map((item) => item.type)).toEqual(
      expect.arrayContaining(['accuracy', 'transfer', 'retention'])
    );
  });

  test('promotion requires enough evidence', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
      ],
    });

    expect(evaluation.next_status).toBe('introduced');
    expect(evaluation.recommended_action).toBe('practice');
    expect(evaluation.evidence.map((item) => item.type)).not.toContain(
      'accuracy'
    );
  });

  test('regression can lower a stronger previous status', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      previous_status: 'mastered',
      events: [
        makeEvent('event-1', 'incorrect', '2026-01-04T12:00:00.000Z'),
        makeEvent('event-2', 'incorrect', '2026-01-04T12:01:00.000Z'),
      ],
    });

    expect(evaluation.next_status).toBe('regressed');
    expect(evaluation.recommended_action).toBe('add_support');
  });

  test('mastery evidence cites source events', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
      ],
    });

    expect(evaluation.source_event_ids).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
    expect(evaluation.skill_graph_rule).toContain('Counting requires');
  });
});

function makeEvent(
  eventId: string,
  outcome: ActivityAttemptEvent['outcome'],
  timestamp: string,
  overrides: {
    activityId?: string;
  } = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: overrides.activityId ?? 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp,
    prompt_text: 'How many stars do you see?',
    outcome,
    selected_choice_id: outcome === 'correct' ? 'three' : 'two',
    correct_choice_id: 'three',
    selected_answer: outcome === 'correct' ? '3' : '2',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: 900,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}
