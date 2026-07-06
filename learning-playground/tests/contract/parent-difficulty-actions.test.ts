/**
 * Contract tests: parent-approved difficulty action records.
 */

import { describe, expect, test } from 'vitest';
import {
  buildParentDifficultyActionHistory,
  formatParentDifficultyActionLabel,
} from '../../src/core/parent-difficulty-actions';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
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

describe('parent difficulty action contract', () => {
  test('stores, exports, and clears parent action records locally', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    storage.saveParentDifficultyAction(makeAction({
      actionId: 'action-1',
      actionType: 'add_support',
      createdAt: '2026-01-01T12:00:00.000Z',
    }));

    expect(storage.getParentDifficultyActions()).toHaveLength(1);
    expect(Object.keys(
      storage.getProgressProfile('local-child').skill_mastery
    )).toHaveLength(0);

    const exported = JSON.parse(storage.exportProgressData([])) as {
      data_health: { total_parent_actions: number };
      parent_difficulty_actions: ParentDifficultyAction[];
    };

    expect(exported.data_health.total_parent_actions).toBe(1);
    expect(exported.parent_difficulty_actions).toHaveLength(1);
    expect(exported.parent_difficulty_actions[0].action_type).toBe('add_support');

    storage.clearParentDifficultyActions();
    expect(storage.getParentDifficultyActions()).toHaveLength(0);
  });

  test('formats parent action labels and newest-first history', () => {
    const history = buildParentDifficultyActionHistory([
      makeAction({
        actionId: 'action-1',
        actionType: 'ignore_for_now',
        createdAt: '2026-01-01T12:00:00.000Z',
      }),
      makeAction({
        actionId: 'action-2',
        actionType: 'promote_gently',
        createdAt: '2026-01-01T12:05:00.000Z',
      }),
    ]);

    expect(formatParentDifficultyActionLabel('use_suggestion')).toBe(
      'Use suggestion'
    );
    expect(formatParentDifficultyActionLabel('ignore_for_now')).toBe(
      'Ignore for now'
    );
    expect(history.map((item) => item.action_label)).toEqual([
      'Promote gently',
      'Ignore for now',
    ]);
    expect(history[0]).toMatchObject({
      action_id: 'action-2',
      timestamp_label: '2026-01-01 12:05 UTC',
      recommendation_label: 'Promote gently',
    });
  });
});

function makeAction(params: {
  actionId: string;
  actionType: ParentDifficultyAction['action_type'];
  createdAt: string;
}): ParentDifficultyAction {
  return {
    action_id: params.actionId,
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    action_type: params.actionType,
    source_recommendation: 'Promote gently',
    source_status: 'Ready for next challenge',
    source_reason: '100% accuracy with no hints or stops.',
    created_at: params.createdAt,
  };
}
