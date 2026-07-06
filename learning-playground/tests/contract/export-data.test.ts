/**
 * Contract tests: local progress export polish.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type { ParentDifficultyAction } from '../../src/types/parent-actions';

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

describe('progress export contract', () => {
  test('adds metadata and data health while preserving raw local sections', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    const events = [
      makeEvent('event-1', 'session-1', '2026-01-01T12:00:00.000Z'),
      makeEvent('event-2', 'session-2', '2026-01-01T12:05:00.000Z', {
        migrated_from_legacy: true,
      }),
    ];
    storage.saveParentDifficultyAction(makeAction());

    const exported = JSON.parse(storage.exportProgressData(events)) as {
      exported_at: string;
      export_metadata: {
        export_version: string;
        app_baseline: string;
        export_timestamp: string;
        data_sections_included: string[];
      };
      data_health: {
        total_events: number;
        total_sessions: number;
        total_observations: number;
        total_parent_actions: number;
        first_event_timestamp: string;
        latest_event_timestamp: string;
        migrated_event_count: number;
      };
      activity_events: ActivityAttemptEvent[];
      parent_difficulty_actions: ParentDifficultyAction[];
    };

    expect(exported.exported_at).toBe(exported.export_metadata.export_timestamp);
    expect(exported.export_metadata).toMatchObject({
      export_version: '1',
      app_baseline: 'v0.1.3',
    });
    expect(exported.export_metadata.data_sections_included).toEqual([
      'settings',
      'child_profile',
      'activity_events',
      'parent_observations',
      'parent_difficulty_actions',
    ]);
    expect(exported.data_health).toMatchObject({
      total_events: 2,
      total_sessions: 2,
      total_observations: 0,
      total_parent_actions: 1,
      first_event_timestamp: '2026-01-01T12:00:00.000Z',
      latest_event_timestamp: '2026-01-01T12:05:00.000Z',
      migrated_event_count: 1,
    });
    expect(exported.activity_events[0].activity_id).toBe('math-count-stars-three');
    expect(exported.parent_difficulty_actions[0].action_type).toBe('keep_stable');
  });
});

function makeEvent(
  eventId: string,
  sessionId: string,
  timestamp: string,
  metadata: ActivityAttemptEvent['metadata'] = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: sessionId,
    child_id: 'local-child',
    activity_id: 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp,
    prompt_text: 'How many stars do you see?',
    outcome: 'correct',
    selected_choice_id: 'three',
    correct_choice_id: 'three',
    selected_answer: '3',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
    metadata,
  };
}

function makeAction(): ParentDifficultyAction {
  return {
    action_id: 'action-1',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    action_type: 'keep_stable',
    source_recommendation: 'Keep stable',
    source_status: 'Keep practicing here',
    source_reason: 'Stay with this level and watch the next few attempts.',
    created_at: '2026-01-01T12:08:00.000Z',
  };
}
