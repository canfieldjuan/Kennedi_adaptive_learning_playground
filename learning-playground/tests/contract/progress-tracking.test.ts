/**
 * Contract tests: local progress tracking.
 *
 * Progress must be derived from mastery signals, not raw engagement.
 */

import { describe, expect, test } from 'vitest';
import {
  buildProgressProfileFromEvents,
} from '../../src/core/progress';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type { ActivityAttemptEvent } from '../../src/types/events';

const CHILD_ID = 'local-child';

class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('progress tracking contract', () => {
  test('correct attempts update mastery and promote after five strong attempts', () => {
    const events = Array.from({ length: 5 }, (_, index) => (
      makeEvent({
        outcome: 'correct',
        timestamp: timestamp(index),
        responseTimeMs: 900 + index * 10,
      })
    ));

    const profile = buildProgressProfileFromEvents(CHILD_ID, events);
    const state = profile.skill_mastery.counting;

    expect(state.total_attempts).toBe(5);
    expect(state.correct_attempts).toBe(5);
    expect(state.recent_accuracy).toBe(1);
    expect(state.recent_average_response_ms).toBe(920);
    expect(state.confidence).toBe(1);
    expect(state.current_level).toBe(2);
    expect(state.last_promoted_at).toBe(timestamp(4));
    expect(state.needs_review).toBe(false);
  });

  test('hints and completion events do not inflate attempt counts', () => {
    const events = [
      makeEvent({ outcome: 'incorrect', timestamp: timestamp(0) }),
      makeEvent({ outcome: 'hint_used', timestamp: timestamp(1) }),
      makeEvent({ outcome: 'incorrect', timestamp: timestamp(2) }),
      makeEvent({ outcome: 'hint_used', timestamp: timestamp(3) }),
      makeEvent({ outcome: 'correct', timestamp: timestamp(4) }),
      makeEvent({ outcome: 'completed', timestamp: timestamp(5) }),
    ];

    const profile = buildProgressProfileFromEvents(CHILD_ID, events);
    const state = profile.skill_mastery.counting;

    expect(state.total_attempts).toBe(3);
    expect(state.correct_attempts).toBe(1);
    expect(state.recent_accuracy).toBeCloseTo(1 / 3);
    expect(state.needs_review).toBe(true);
    expect(state.last_seen_at).toBe(timestamp(5));
  });

  test('completion-only media events touch the skill without counting mastery attempts', () => {
    const events = [
      makeEvent({
        outcome: 'completed',
        inputType: 'video',
        timestamp: timestamp(0),
      }),
    ];

    const profile = buildProgressProfileFromEvents(CHILD_ID, events);
    const state = profile.skill_mastery.counting;

    expect(state.total_attempts).toBe(0);
    expect(state.correct_attempts).toBe(0);
    expect(state.recent_accuracy).toBe(0);
    expect(state.confidence).toBe(0);
    expect(state.current_level).toBe(1);
    expect(state.needs_review).toBe(false);
  });

  test('storage persists, exports, and resets progress profile separately from settings', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    const events = [
      makeEvent({ outcome: 'correct', timestamp: timestamp(0) }),
      makeEvent({ outcome: 'incorrect', timestamp: timestamp(1) }),
    ];

    storage.updateProgressFromEvents(CHILD_ID, events);

    const savedProfile = storage.getProgressProfile(CHILD_ID);
    expect(savedProfile.skill_mastery.counting.total_attempts).toBe(2);

    const exported = JSON.parse(storage.exportProgressData(events)) as {
      child_profile: {
        skill_mastery: Record<string, { total_attempts: number }>;
      };
      activity_events: ActivityAttemptEvent[];
    };
    expect(exported.child_profile.skill_mastery.counting.total_attempts).toBe(2);
    expect(exported.activity_events).toHaveLength(2);

    storage.resetProgress();
    expect(Object.keys(storage.getProgressProfile(CHILD_ID).skill_mastery)).toHaveLength(0);
  });
});

function makeEvent(params: {
  outcome: ActivityAttemptEvent['outcome'];
  timestamp: string;
  responseTimeMs?: number;
  inputType?: ActivityAttemptEvent['input_type'];
}): ActivityAttemptEvent {
  return {
    event_id: `event-${params.timestamp}`,
    session_id: 'session-1',
    child_id: CHILD_ID,
    activity_id: 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp: params.timestamp,
    prompt_text: 'How many stars do you see?',
    outcome: params.outcome,
    selected_choice_id: 'three',
    correct_choice_id: 'three',
    selected_answer: '3',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: params.responseTimeMs ?? 1000,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: params.inputType ?? 'tap',
    hint_shown: params.outcome === 'hint_used',
  };
}

function timestamp(index: number): string {
  return new Date(Date.UTC(2026, 0, 1, 12, 0, index)).toISOString();
}
