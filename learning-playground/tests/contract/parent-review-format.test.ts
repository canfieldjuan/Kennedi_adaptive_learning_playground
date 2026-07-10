/**
 * Contract tests: parent review formatting.
 */

import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { ACTIVITY_TITLE_LOOKUP } from '../../src/content/activity-title-lookup';
import {
  formatRecentAttempts,
  resolveActivityTitle,
} from '../../src/core/parent-review-format';
import {
  createKennedisOrdersEvent,
  getBearCafeContent,
} from '../../src/modules/kennedis-orders/KennedisOrdersActivity';
import type { LearningActivity } from '../../src/types/activity';
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

  test('keeps legacy shipped activity titles for older local events', () => {
    expect(resolveActivityTitle(
      'kennedis-orders-pink-berries-001',
      ACTIVITY_TITLE_LOOKUP,
      1
    )).toBe('Three Pink Berries Order');
    expect(resolveActivityTitle(
      'kennedis-orders-pink-berries-001',
      ACTIVITY_TITLE_LOOKUP,
      2
    )).toBe('Banana Cookie Order');

    const recentAttempts = formatRecentAttempts([
      makeEvent({
        eventId: 'legacy-cafe-event',
        timestamp: '2026-01-01T12:00:00.000Z',
        outcome: 'correct',
        activityId: 'kennedis-orders-pink-berries-001',
        activityVersion: 1,
        skillIds: ['counting', 'color_fill'],
        promptText: 'Mama Bear wants 3 pink berries.',
        selectedAnswer: '3 berry, pink',
        correctAnswer: '3 pink berry',
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts[0]).toMatchObject({
      activity_title: 'Three Pink Berries Order',
      prompt_text: 'Mama Bear wants 3 pink berries.',
      correct_answer: '3 pink berry',
      skill_labels: ['Counting', 'Color Fill'],
    });
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
    expect(recentAttempts.some((attempt) => attempt.outcome === 'completed')).toBe(false);
  });

  test('formats Bear Cafe delivered orders as parent-readable recent attempts', () => {
    const activity = getActivity('kennedis-orders-pink-berries-001');
    const content = getBearCafeContent(activity);
    if (!content) throw new Error('Expected Bear Cafe content');

    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'completed',
      tray: { foodCounts: { banana: 2, cookie: 1 } },
      attemptNumber: 1,
      responseTimeMs: 2600,
      hintShown: false,
      replayCount: 1,
      eventName: 'order_delivered',
    });

    const recentAttempts = formatRecentAttempts([event], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts).toHaveLength(1);
    expect(recentAttempts[0]).toMatchObject({
      activity_id: 'kennedis-orders-pink-berries-001',
      activity_title: 'Banana Cookie Order',
      skill_labels: ['Counting'],
      prompt_text: 'Mama Bear wants 2 bananas and 1 cookie.',
      selected_answer: '2 banana, cookie',
      correct_answer: '2 banana, cookie',
      outcome_label: 'Completed',
      hint_used: false,
      response_time_label: '2.6 sec',
    });
  });

  test('does not show Bear Cafe food-selection telemetry as recent attempts', () => {
    const activity = getActivity('kennedis-orders-two-cookies-001');
    const content = getBearCafeContent(activity);
    if (!content) throw new Error('Expected Bear Cafe content');

    const selectionEvent = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      tray: { foodCounts: { cookie: 1 } },
      attemptNumber: 1,
      responseTimeMs: 500,
      hintShown: false,
      eventName: 'food_selected',
      selectedChoiceId: 'cookie',
      selectedAnswer: 'cookie',
      extraMetadata: {
        selected_food_id: 'cookie',
        selected_food_count: 1,
      },
    });

    expect(formatRecentAttempts([selectionEvent], ACTIVITY_TITLE_LOOKUP)).toEqual([]);
  });

  test('collapses Bear Cafe tray check success when a matching delivery is present', () => {
    const activity = getActivity('kennedis-orders-banana-001');
    const content = getBearCafeContent(activity);
    if (!content) throw new Error('Expected Bear Cafe content');

    const tray = { foodCounts: { banana: 1 } };
    const trayChecked = {
      ...createKennedisOrdersEvent({
        activity,
        content,
        sessionId: 'session-1',
        childId: 'local-child',
        outcome: 'correct',
        tray,
        attemptNumber: 1,
        responseTimeMs: 1800,
        hintShown: false,
        replayCount: 0,
        eventName: 'tray_checked',
      }),
      event_id: 'bear-cafe-tray-checked',
      timestamp: '2026-01-01T12:00:00.000Z',
    };
    const delivered = {
      ...createKennedisOrdersEvent({
        activity,
        content,
        sessionId: 'session-1',
        childId: 'local-child',
        outcome: 'completed',
        tray,
        attemptNumber: 1,
        responseTimeMs: 2600,
        hintShown: false,
        replayCount: 0,
        eventName: 'order_delivered',
      }),
      event_id: 'bear-cafe-delivered',
      timestamp: '2026-01-01T12:00:05.000Z',
    };

    const recentAttempts = formatRecentAttempts([
      trayChecked,
      delivered,
    ], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts).toHaveLength(1);
    expect(recentAttempts[0]).toMatchObject({
      event_id: 'bear-cafe-delivered',
      activity_id: 'kennedis-orders-banana-001',
      activity_title: 'Banana Order',
      outcome_label: 'Completed',
    });
  });

  test('keeps Bear Cafe tray check success when the order was not delivered', () => {
    const activity = getActivity('kennedis-orders-banana-001');
    const content = getBearCafeContent(activity);
    if (!content) throw new Error('Expected Bear Cafe content');

    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      tray: { foodCounts: { banana: 1 } },
      attemptNumber: 1,
      responseTimeMs: 1800,
      hintShown: false,
      replayCount: 0,
      eventName: 'tray_checked',
    });

    const recentAttempts = formatRecentAttempts([event], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts).toHaveLength(1);
    expect(recentAttempts[0]).toMatchObject({
      activity_id: 'kennedis-orders-banana-001',
      activity_title: 'Banana Order',
      outcome_label: 'Correct',
    });
  });

  test('keeps later identical Bear Cafe tray check success after an earlier delivery', () => {
    const activity = getActivity('kennedis-orders-banana-001');
    const content = getBearCafeContent(activity);
    if (!content) throw new Error('Expected Bear Cafe content');

    const tray = { foodCounts: { banana: 1 } };
    const firstTrayChecked = {
      ...createKennedisOrdersEvent({
        activity,
        content,
        sessionId: 'session-1',
        childId: 'local-child',
        outcome: 'correct',
        tray,
        attemptNumber: 1,
        responseTimeMs: 1800,
        hintShown: false,
        replayCount: 0,
        eventName: 'tray_checked',
      }),
      event_id: 'first-banana-tray-checked',
      timestamp: '2026-01-01T12:00:00.000Z',
    };
    const firstDelivered = {
      ...createKennedisOrdersEvent({
        activity,
        content,
        sessionId: 'session-1',
        childId: 'local-child',
        outcome: 'completed',
        tray,
        attemptNumber: 1,
        responseTimeMs: 2600,
        hintShown: false,
        replayCount: 0,
        eventName: 'order_delivered',
      }),
      event_id: 'first-banana-delivered',
      timestamp: '2026-01-01T12:00:05.000Z',
    };
    const secondTrayChecked = {
      ...createKennedisOrdersEvent({
        activity,
        content,
        sessionId: 'session-1',
        childId: 'local-child',
        outcome: 'correct',
        tray,
        attemptNumber: 1,
        responseTimeMs: 1700,
        hintShown: false,
        replayCount: 0,
        eventName: 'tray_checked',
      }),
      event_id: 'second-banana-tray-checked',
      timestamp: '2026-01-01T12:03:00.000Z',
    };

    const recentAttempts = formatRecentAttempts([
      firstTrayChecked,
      firstDelivered,
      secondTrayChecked,
    ], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts).toHaveLength(2);
    expect(recentAttempts.map((attempt) => attempt.event_id)).toEqual([
      'second-banana-tray-checked',
      'first-banana-delivered',
    ]);
    expect(recentAttempts.map((attempt) => attempt.outcome_label)).toEqual([
      'Correct',
      'Completed',
    ]);
  });

  test('delivered Bear Cafe orders do not crowd out earlier struggle evidence', () => {
    const activity = getActivity('kennedis-orders-banana-001');
    const content = getBearCafeContent(activity);
    if (!content) throw new Error('Expected Bear Cafe content');

    const cafeEvents = [1, 2, 3].flatMap((orderNumber) => {
      const tray = { foodCounts: { banana: 1 } };
      const trayChecked = {
        ...createKennedisOrdersEvent({
          activity,
          content,
          sessionId: 'session-1',
          childId: 'local-child',
          outcome: 'correct',
          tray,
          attemptNumber: 1,
          responseTimeMs: 1800,
          hintShown: false,
          replayCount: 0,
          eventName: 'tray_checked',
        }),
        event_id: `banana-${orderNumber}-tray-checked`,
        timestamp: `2026-01-01T12:0${orderNumber}:00.000Z`,
      };
      const delivered = {
        ...createKennedisOrdersEvent({
          activity,
          content,
          sessionId: 'session-1',
          childId: 'local-child',
          outcome: 'completed',
          tray,
          attemptNumber: 1,
          responseTimeMs: 2600,
          hintShown: false,
          replayCount: 0,
          eventName: 'order_delivered',
        }),
        event_id: `banana-${orderNumber}-delivered`,
        timestamp: `2026-01-01T12:0${orderNumber}:05.000Z`,
      };

      return [trayChecked, delivered];
    });

    const recentAttempts = formatRecentAttempts([
      makeEvent({
        eventId: 'earlier-incorrect',
        timestamp: '2026-01-01T12:00:00.000Z',
        outcome: 'incorrect',
        activityId: 'phonics-find-b',
        skillIds: ['initial_sound'],
        promptText: 'Find the word that starts with b.',
        selectedAnswer: 'cat',
        correctAnswer: 'bear',
      }),
      ...cafeEvents,
    ], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts).toHaveLength(4);
    expect(recentAttempts.map((attempt) => attempt.event_id)).toEqual([
      'banana-3-delivered',
      'banana-2-delivered',
      'banana-1-delivered',
      'earlier-incorrect',
    ]);
    expect(recentAttempts.map((attempt) => attempt.outcome_label)).toEqual([
      'Completed',
      'Completed',
      'Completed',
      'Incorrect',
    ]);
  });

  test('does not duplicate ordinary success with immediate completion events', () => {
    const recentAttempts = formatRecentAttempts([
      makeEvent({
        eventId: 'event-1',
        timestamp: '2026-01-01T12:00:00.000Z',
        outcome: 'correct',
        activityId: 'math-count-stars-three',
        skillIds: ['counting'],
        promptText: 'How many stars do you see?',
        selectedAnswer: '3',
        correctAnswer: '3',
      }),
      makeEvent({
        eventId: 'event-2',
        timestamp: '2026-01-01T12:00:01.000Z',
        outcome: 'completed',
        activityId: 'math-count-stars-three',
        skillIds: ['counting'],
        promptText: 'How many stars do you see?',
        selectedAnswer: '3',
        correctAnswer: '3',
      }),
      makeEvent({
        eventId: 'event-3',
        timestamp: '2026-01-01T12:01:00.000Z',
        outcome: 'correct',
        activityId: 'art-color-circle',
        skillIds: ['color_fill'],
        promptText: 'Pick a color for the circle.',
        selectedAnswer: 'Blue',
        correctAnswer: 'Blue',
      }),
      makeEvent({
        eventId: 'event-4',
        timestamp: '2026-01-01T12:01:01.000Z',
        outcome: 'completed',
        activityId: 'art-color-circle',
        skillIds: ['color_fill'],
        promptText: 'Pick a color for the circle.',
        selectedAnswer: 'Blue',
        correctAnswer: 'Blue',
      }),
    ], ACTIVITY_TITLE_LOOKUP);

    expect(recentAttempts).toHaveLength(2);
    expect(recentAttempts.map((attempt) => attempt.outcome_label)).toEqual([
      'Correct',
      'Correct',
    ]);
    expect(recentAttempts.map((attempt) => attempt.activity_title)).toEqual([
      'Color the Circle',
      'Count the Stars',
    ]);
  });
});

function getActivity(activityId: string): LearningActivity {
  const activity = APPROVED_ACTIVITIES.find((activity) => activity.id === activityId);
  if (!activity) throw new Error(`Missing activity ${activityId}`);
  return activity;
}

function makeEvent(overrides: {
  eventId: string;
  timestamp: string;
  outcome: ActivityAttemptEvent['outcome'];
  activityId: string;
  activityVersion?: number;
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
    activity_version: overrides.activityVersion ?? 1,
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
