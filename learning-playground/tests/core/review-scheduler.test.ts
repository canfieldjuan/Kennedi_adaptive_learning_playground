/**
 * Core tests: review scheduler.
 */

import { describe, expect, test } from 'vitest';
import { scheduleReview } from '../../src/core/review-scheduler';

describe('review scheduler', () => {
  test('schedules likely mastered skills after 24 hours', () => {
    expect(scheduleReview({
      skill_id: 'counting',
      status: 'likely_mastered',
      now_iso: '2026-01-01T12:00:00.000Z',
    })).toMatchObject({
      next_review_at: '2026-01-02T12:00:00.000Z',
      interval_label: 'Review after 24 hours',
      recommended_action: 'schedule_review',
    });
  });

  test('schedules successful first review after 3 days', () => {
    expect(scheduleReview({
      skill_id: 'counting',
      status: 'mastered',
      successful_review_count: 1,
      now_iso: '2026-01-01T12:00:00.000Z',
    })).toMatchObject({
      next_review_at: '2026-01-04T12:00:00.000Z',
      interval_label: 'Review after 3 days',
    });
  });

  test('schedules successful second review after 7 days', () => {
    expect(scheduleReview({
      skill_id: 'counting',
      status: 'mastered',
      successful_review_count: 2,
      now_iso: '2026-01-01T12:00:00.000Z',
    })).toMatchObject({
      next_review_at: '2026-01-08T12:00:00.000Z',
      interval_label: 'Review after 7 days',
    });
  });

  test('returns regression to practice', () => {
    const schedule = scheduleReview({
      skill_id: 'counting',
      status: 'regressed',
      regression: true,
      now_iso: '2026-01-01T12:00:00.000Z',
    });

    expect(schedule.next_review_at).toBeUndefined();
    expect(schedule).toMatchObject({
      interval_label: 'Return to practice now',
      status_after_review: 'practicing',
      recommended_action: 'practice',
    });
  });
});
