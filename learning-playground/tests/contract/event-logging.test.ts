/**
 * Contract tests: local event logging.
 */

import { describe, expect, test } from 'vitest';
import {
  appendEvent,
  clearEvents,
  exportEvents,
  getEvents,
  isValidEvent,
  type EventLogStorage,
} from '../../src/core/event-log';
import type { ActivityAttemptEvent } from '../../src/types/events';

class MemoryEventLogStorage implements EventLogStorage {
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

describe('event logging contract', () => {
  test('valid attempts store review-ready prompt and answer details', () => {
    const storage = new MemoryEventLogStorage();
    const event = makeEvent();

    expect(appendEvent(event, storage)).toBe(true);

    const stored = getEvents(storage);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      prompt_text: 'How many stars do you see?',
      selected_answer: '3',
      correct_answer: '3',
      response_time_ms: 1200,
      hint_shown: false,
      outcome: 'correct',
    });
  });

  test('attempts missing prompt or answer details are rejected', () => {
    const invalid = {
      ...makeEvent(),
      prompt_text: undefined,
    };

    expect(isValidEvent(invalid)).toBe(false);
  });

  test('export and clear use local event storage only', () => {
    const storage = new MemoryEventLogStorage();
    appendEvent(makeEvent(), storage);

    const exported = JSON.parse(exportEvents(storage)) as ActivityAttemptEvent[];
    expect(exported).toHaveLength(1);
    expect(exported[0].selected_answer).toBe('3');

    clearEvents(storage);
    expect(getEvents(storage)).toHaveLength(0);
  });

  test('pre-v0.1.1 tap-choice events are normalized instead of dropped', () => {
    const storage = new MemoryEventLogStorage();
    storage.setItem('lp_activity_events', JSON.stringify([
      makeLegacyEvent({
        selected_choice_id: 'three',
        correct_choice_id: 'three',
      }),
    ]));

    const events = getEvents(storage);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      prompt_text: 'math-count-stars-three',
      selected_answer: 'three',
      correct_answer: 'three',
      outcome: 'correct',
      metadata: {
        migrated_from_legacy: true,
      },
    });

    const migratedEvents = JSON.parse(
      storage.getItem('lp_activity_events') ?? '[]'
    ) as ActivityAttemptEvent[];
    expect(migratedEvents[0].prompt_text).toBe('math-count-stars-three');
    expect(migratedEvents[0].metadata?.migrated_from_legacy).toBe(true);
  });

  test('pre-v0.1.1 metadata-backed events keep parent-readable labels', () => {
    const storage = new MemoryEventLogStorage();
    storage.setItem('lp_activity_events', JSON.stringify([
      makeLegacyEvent({
        activity_id: 'art-color-circle',
        skill_ids: ['color_fill'],
        selected_choice_id: 'sky-blue',
        correct_choice_id: undefined,
        metadata: {
          prompt_text: 'Pick a color for the circle.',
          color_label: 'Blue',
          color_value: '#74b9ff',
        },
      }),
    ]));

    const events = getEvents(storage);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      prompt_text: 'Pick a color for the circle.',
      selected_answer: 'Blue',
      correct_answer: 'Blue',
      selected_choice_id: 'sky-blue',
    });
  });
});

function makeEvent(): ActivityAttemptEvent {
  return {
    event_id: 'event-1',
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting', 'subitizing'],
    timestamp: '2026-01-01T12:00:00.000Z',
    prompt_text: 'How many stars do you see?',
    outcome: 'correct',
    selected_choice_id: 'three',
    correct_choice_id: 'three',
    selected_answer: '3',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: 1200,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}

function makeLegacyEvent(
  overrides: Partial<ActivityAttemptEvent>
): Partial<ActivityAttemptEvent> {
  const {
    prompt_text: _promptText,
    selected_answer: _selectedAnswer,
    correct_answer: _correctAnswer,
    ...legacyEvent
  } = {
    ...makeEvent(),
    ...overrides,
  };

  return legacyEvent;
}
