/**
 * Contract tests: parent activity brief decisions.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type { ParentActivityBriefDecision } from '../../src/types/activity-briefs';

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

describe('parent activity brief decision contract', () => {
  test('stores, exports, and clears parent activity brief decisions locally', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    storage.saveParentActivityBriefDecision(makeDecision('approve_brief'));

    expect(storage.getParentActivityBriefDecisions()).toHaveLength(1);
    expect(Object.keys(
      storage.getProgressProfile('local-child').skill_mastery
    )).toHaveLength(0);

    const exported = JSON.parse(storage.exportProgressData([])) as {
      data_health: { total_activity_brief_decisions: number };
      parent_activity_brief_decisions: ParentActivityBriefDecision[];
    };

    expect(exported.data_health.total_activity_brief_decisions).toBe(1);
    expect(exported.parent_activity_brief_decisions[0]).toMatchObject({
      decision_type: 'approve_brief',
      brief_id: 'brief-counting-different_prompt_mode',
    });

    storage.clearParentActivityBriefDecisions();
    expect(storage.getParentActivityBriefDecisions()).toHaveLength(0);
  });

  test('filters malformed parent activity brief decisions', () => {
    const store = new MemoryKeyValueStorage();
    store.setItem('lp_parent_activity_brief_decisions', JSON.stringify([
      makeDecision('hold_brief'),
      {
        ...makeDecision('archive_brief'),
        required_strength: 'weak',
      },
    ]));

    const storage = new StorageService(store);

    expect(storage.getParentActivityBriefDecisions()).toHaveLength(1);
    expect(storage.getParentActivityBriefDecisions()[0].decision_type).toBe(
      'hold_brief'
    );
  });
});

function makeDecision(
  decisionType: ParentActivityBriefDecision['decision_type']
): ParentActivityBriefDecision {
  return {
    decision_id: `brief-decision-${decisionType}`,
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    decision_type: decisionType,
    brief_id: 'brief-counting-different_prompt_mode',
    required_context_type: 'different_prompt_mode',
    required_strength: 'medium',
    suggested_game_family: 'delivery_race',
    suggested_activity_pattern: 'Picture Quantity Order Card',
    reason: 'Counting needs medium transfer evidence.',
    status_at_decision: 'ready_for_design',
    created_at: '2026-01-01T12:00:00.000Z',
  };
}
