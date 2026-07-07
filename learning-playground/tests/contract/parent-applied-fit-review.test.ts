/**
 * Contract tests: parent review of applied guidance fit.
 */

import { describe, expect, test } from 'vitest';
import { ACTIVITY_TITLE_LOOKUP } from '../../src/content/activity-title-lookup';
import {
  buildParentAppliedFitReviews,
  type ParentAppliedFitReview,
} from '../../src/core/parent-applied-fit-review';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../../src/types/parent-actions';

describe('parent applied fit review contract', () => {
  test('summarizes attempts that used the active parent guidance', () => {
    const reviews = buildParentAppliedFitReviews([
      makeEvent('before', 'correct', {
        timestamp: '2026-01-01T11:59:00.000Z',
      }),
      makeEvent('correct', 'correct', {
        timestamp: '2026-01-01T12:01:00.000Z',
      }),
      makeEvent('hint', 'hint_used', {
        timestamp: '2026-01-01T12:02:00.000Z',
      }),
      makeEvent('incorrect', 'incorrect', {
        timestamp: '2026-01-01T12:03:00.000Z',
        selectedAnswer: '2',
      }),
      makeEvent('other-override', 'correct', {
        timestamp: '2026-01-01T12:04:00.000Z',
        overrideId: 'other-override',
      }),
    ], [
      makeOverride({
        overrideId: 'override-counting',
        overrideType: 'add_support',
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      override_id: 'override-counting',
      skill_label: 'Counting',
      override_label: 'Add support',
      activity_titles: ['Count the Stars'],
      attempt_count: 2,
      correct_attempts: 1,
      accuracy: 0.5,
      accuracy_label: '50%',
      hints_used: 1,
      abandoned_count: 0,
      latest_attempt_at: '2026-01-01T12:03:00.000Z',
      recommendation: 'Review after more play',
    });
  });

  test('recommends keeping guidance when the applied fit looks steady', () => {
    const reviews = buildParentAppliedFitReviews([
      makeEvent('correct-1', 'correct', {
        timestamp: '2026-01-01T12:01:00.000Z',
      }),
      makeEvent('correct-2', 'correct', {
        timestamp: '2026-01-01T12:02:00.000Z',
      }),
      makeEvent('correct-3', 'correct', {
        timestamp: '2026-01-01T12:03:00.000Z',
      }),
    ], [
      makeOverride({
        overrideId: 'override-counting',
        overrideType: 'keep_current',
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    expect(reviews[0]).toMatchObject({
      recommendation: 'Keep current guidance',
      reason: '100% accuracy across 3 counted attempt(s), with no hints or stops.',
    });
  });

  test('suggests reset when a gentle promotion no longer fits', () => {
    const reviews = buildParentAppliedFitReviews([
      makeEvent('incorrect-1', 'incorrect', {
        timestamp: '2026-01-01T12:01:00.000Z',
      }),
      makeEvent('stop-1', 'abandoned', {
        timestamp: '2026-01-01T12:02:00.000Z',
      }),
    ], [
      makeOverride({
        overrideId: 'override-counting',
        overrideType: 'promote_gently',
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    expect(reviews[0]).toMatchObject({
      recommendation: 'Consider resetting guidance',
      abandoned_count: 1,
    });
  });

  test('keeps active guidance visible even before it affects an activity', () => {
    const reviews = buildParentAppliedFitReviews([], [
      makeOverride({
        overrideId: 'override-counting',
        overrideType: 'add_support',
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    expect(reviews[0]).toMatchObject({
      attempt_count: 0,
      activity_titles: [],
      recommendation: 'Review after more play',
    });
    expect(reviews[0].reason).toContain('0 counted attempt');
  });

  test('keeps applied fit language non-comparative and non-pressure-based', () => {
    const reviews = buildParentAppliedFitReviews([
      makeEvent('incorrect-1', 'incorrect', {
        timestamp: '2026-01-01T12:01:00.000Z',
      }),
      makeEvent('incorrect-2', 'incorrect', {
        timestamp: '2026-01-01T12:02:00.000Z',
      }),
    ], [
      makeOverride({
        overrideId: 'override-counting',
        overrideType: 'add_support',
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    const text = serializeReview(reviews[0]).toLowerCase();
    expect(reviews[0].recommendation).toBe('Consider adding support');
    expect(text).not.toMatch(/streak|rank|behind|score|faster|shame|gifted|age/);
  });
});

function makeOverride(params: {
  overrideId: string;
  overrideType: ParentDifficultyOverrideType;
}): ParentDifficultyOverride {
  return {
    override_id: params.overrideId,
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    override_type: params.overrideType,
    source_recommendation: 'Add support',
    source_status: 'Needs more support',
    source_reason: 'Recent activity fit suggested a parent-approved change.',
    active: true,
    created_at: '2026-01-01T12:00:00.000Z',
  };
}

function makeEvent(
  eventId: string,
  outcome: ActivityAttemptEvent['outcome'],
  overrides: {
    timestamp: string;
    overrideId?: string;
    selectedAnswer?: string;
  }
): ActivityAttemptEvent {
  const overrideId = overrides.overrideId ?? 'override-counting';

  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp: overrides.timestamp,
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
    hint_shown: outcome === 'hint_used',
    metadata: {
      parent_guidance_applied: true,
      parent_guidance_override_id: overrideId,
      parent_guidance_override_type: 'add_support',
      parent_guidance_label: 'Add support',
      parent_guidance_skill_id: 'counting',
      parent_guidance_skill_label: 'Counting',
    },
  };
}

function serializeReview(review: ParentAppliedFitReview): string {
  return [
    review.recommendation,
    review.reason,
    review.override_label,
  ].join(' ');
}
