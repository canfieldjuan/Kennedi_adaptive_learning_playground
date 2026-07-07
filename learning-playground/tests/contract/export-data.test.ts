/**
 * Contract tests: local progress export polish.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from '../../src/types/parent-actions';
import type { ParentTransferDecision } from '../../src/types/transfer';

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
    storage.saveParentDifficultyOverride(makeOverride());
    storage.saveParentTransferDecision(makeTransferDecision());

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
        total_transfer_decisions: number;
        first_event_timestamp: string;
        latest_event_timestamp: string;
        migrated_event_count: number;
      };
      settings: { parent_gate_phrase: string };
      activity_events: ActivityAttemptEvent[];
      parent_difficulty_actions: ParentDifficultyAction[];
      parent_difficulty_overrides: ParentDifficultyOverride[];
      parent_transfer_decisions: ParentTransferDecision[];
    };

    expect(exported.exported_at).toBe(exported.export_metadata.export_timestamp);
    expect(exported.export_metadata).toMatchObject({
      export_version: '1',
      app_baseline: 'v0.2.4',
    });
    expect(exported.export_metadata.data_sections_included).toEqual([
      'settings',
      'child_profile',
      'activity_events',
      'parent_observations',
      'parent_difficulty_actions',
      'parent_difficulty_overrides',
      'parent_transfer_decisions',
    ]);
    expect(exported.data_health).toMatchObject({
      total_events: 2,
      total_sessions: 2,
      total_observations: 0,
      total_parent_actions: 1,
      total_transfer_decisions: 1,
      first_event_timestamp: '2026-01-01T12:00:00.000Z',
      latest_event_timestamp: '2026-01-01T12:05:00.000Z',
      migrated_event_count: 1,
    });
    expect(exported.settings.parent_gate_phrase).toBe('PARENT');
    expect(exported.activity_events[0].activity_id).toBe('math-count-stars-three');
    expect(exported.parent_difficulty_actions[0].action_type).toBe('keep_stable');
    expect(exported.parent_difficulty_overrides[0].override_type).toBe(
      'promote_gently'
    );
    expect(exported.parent_transfer_decisions[0].decision_type).toBe(
      'approve_transfer_activity'
    );
    expect(exported.parent_transfer_decisions[0].transfer_activity_id).toBe(
      'math-count-hearts-three'
    );

    storage.clearParentTransferDecisions();
    expect(storage.getParentTransferDecisions()).toHaveLength(0);
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

function makeOverride(): ParentDifficultyOverride {
  return {
    override_id: 'override-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    override_type: 'promote_gently',
    source_recommendation: 'Promote gently',
    source_status: 'Ready for next challenge',
    source_reason: '100% accuracy with no hints or stops.',
    active: true,
    created_at: '2026-01-01T12:09:00.000Z',
  };
}

function makeTransferDecision(): ParentTransferDecision {
  return {
    decision_id: 'transfer-decision-1',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    decision_type: 'approve_transfer_activity',
    source_recommendation: 'Add transfer activity',
    source_status: 'single_context_fluent',
    source_reason: 'Single-context fluency needs transfer coverage.',
    missing_context_type: 'same_format_new_examples',
    suggested_activity_template: 'same_quantity_new_layout',
    transfer_activity_id: 'math-count-hearts-three',
    transfer_activity_title: 'Count the Hearts',
    created_at: '2026-01-01T12:10:00.000Z',
  };
}
