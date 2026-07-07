/**
 * Contract tests: parent review formatting.
 */

import { describe, expect, test } from 'vitest';
import { ACTIVITY_TITLE_LOOKUP } from '../../src/content/activity-title-lookup';
import {
  formatRecentAttempts,
  resolveActivityTitle,
} from '../../src/core/parent-review-format';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('parent review formatting contract', () => {
  test('resolves MVP activity ids to titles and falls back to readable labels', () => {
    expect(resolveActivityTitle(
      'math-count-stars-three',
      ACTIVITY_TITLE_LOOKUP
    )).toBe('Count the Stars');
    expect(resolveActivityTitle(
      'mystery-practice-round',
      ACTIVITY_TITLE_LOOKUP
    )).toBe('Mystery Practice Round');
  });

  test('formats recent attempts with parent-readable details', () => {
    const recentAttempts = formatRecentAttempts([
      makeEvent({
        eventId: 'event-1',
        timestamp: '2026-01-01T12:00:00.000Z',
        outcome: 'correct',
        activityId: 'math-count-stars-three',
        skillIds: ['counting', 'subitizing'],
        promptText: 'How many stars do you see?',
        selectedAnswer: '3',
        correctAnswer: '3',
      }),
      makeEvent({
        eventId: 'event-2',
        timestamp: '2026-01-01T12:01:00.000Z',
        outcome: 'completed',
        activityId: 'math-count-stars-three',
        skillIds: ['counting'],
      }),
      makeEvent({
        eventId: 'event-3',
        timestamp: '2026-01-01T12:02:00.000Z',
        outcome: 'incorrect',
        activityId: 'phonics-find-b',
        skillIds: ['initial_sound'],
        promptText: 'Find the word that starts with b.',
        selectedAnswer: 'cat',
        correctAnswer: 'bear',
        responseTimeMs: 1450,
        metadata: {
          parent_guidance_applied: true,
          parent_guidance_label: 'Promote gently',
        },
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts).toHaveLength(2);
    expect(recentAttempts[0]).toMatchObject({
      activity_id: 'phonics-find-b',
      activity_title: 'Find the /b/ Sound',
      skill_labels: ['Initial Sound'],
      prompt_text: 'Find the word that starts with b.',
      selected_answer: 'cat',
      correct_answer: 'bear',
      outcome_label: 'Incorrect',
      response_time_label: '1.4 sec',
      parent_guidance_label: 'Applied: Promote gently',
    });
    expect(recentAttempts[1].activity_title).toBe('Count the Stars');
  });
});

function makeEvent(overrides: {
  eventId: string;
  timestamp: string;
  outcome: ActivityAttemptEvent['outcome'];
  activityId: string;
  skillIds: string[];
  promptText?: string;
  selectedAnswer?: string;
  correctAnswer?: string;
  responseTimeMs?: number;
  metadata?: ActivityAttemptEvent['metadata'];
}): ActivityAttemptEvent {
  return {
    event_id: overrides.eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: overrides.activityId,
    activity_version: 1,
    skill_ids: overrides.skillIds,
    timestamp: overrides.timestamp,
    prompt_text: overrides.promptText ?? 'Prompt',
    outcome: overrides.outcome,
    selected_choice_id: 'selected',
    correct_choice_id: 'correct',
    selected_answer: overrides.selectedAnswer ?? 'selected',
    correct_answer: overrides.correctAnswer ?? 'correct',
    attempt_number: 1,
    response_time_ms: overrides.responseTimeMs ?? 1200,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: overrides.outcome === 'hint_used',
    metadata: overrides.metadata,
  };
}
