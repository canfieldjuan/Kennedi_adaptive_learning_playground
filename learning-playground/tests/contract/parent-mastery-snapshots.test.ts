/**
 * Contract tests: parent mastery snapshots and review schedules.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type {
  ParentMasterySnapshot,
  ParentReviewScheduleRecord,
} from '../../src/types/mastery-records';

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

describe('parent mastery snapshot contract', () => {
  test('stores, exports, and clears mastery snapshots and review schedules locally', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    storage.saveParentMasterySnapshot(makeSnapshot());
    storage.saveParentReviewScheduleRecord(makeSchedule());

    expect(storage.getParentMasterySnapshots()).toHaveLength(1);
    expect(storage.getParentReviewScheduleRecords()).toHaveLength(1);
    expect(Object.keys(
      storage.getProgressProfile('local-child').skill_mastery
    )).toHaveLength(0);

    const exported = JSON.parse(storage.exportProgressData([])) as {
      data_health: {
        total_mastery_snapshots: number;
        total_review_schedule_records: number;
      };
      parent_mastery_snapshots: ParentMasterySnapshot[];
      parent_review_schedule_records: ParentReviewScheduleRecord[];
    };

    expect(exported.data_health.total_mastery_snapshots).toBe(1);
    expect(exported.data_health.total_review_schedule_records).toBe(1);
    expect(exported.parent_mastery_snapshots[0]).toMatchObject({
      snapshot_id: 'mastery-snapshot-counting',
      next_status: 'likely_mastered',
      source_event_ids: ['event-1', 'event-2'],
    });
    expect(exported.parent_review_schedule_records[0]).toMatchObject({
      schedule_id: 'review-schedule-counting',
      next_review_at: '2026-01-02T12:00:00.000Z',
    });

    storage.clearParentMasterySnapshots();
    storage.clearParentReviewScheduleRecords();

    expect(storage.getParentMasterySnapshots()).toHaveLength(0);
    expect(storage.getParentReviewScheduleRecords()).toHaveLength(0);
  });

  test('filters malformed snapshot and schedule records', () => {
    const store = new MemoryKeyValueStorage();
    store.setItem('lp_parent_mastery_snapshots', JSON.stringify([
      makeSnapshot(),
      {
        ...makeSnapshot(),
        next_status: 'gifted_badge',
      },
    ]));
    store.setItem('lp_parent_review_schedule_records', JSON.stringify([
      makeSchedule(),
      {
        ...makeSchedule(),
        recommended_action: 'auto_route_child',
      },
    ]));

    const storage = new StorageService(store);

    expect(storage.getParentMasterySnapshots()).toHaveLength(1);
    expect(storage.getParentReviewScheduleRecords()).toHaveLength(1);
  });
});

function makeSnapshot(): ParentMasterySnapshot {
  return {
    snapshot_id: 'mastery-snapshot-counting',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    previous_status: 'practicing',
    next_status: 'likely_mastered',
    confidence: 0.85,
    recommended_action: 'schedule_review',
    reason: 'Counting has enough transfer evidence for likely mastery.',
    evidence_summary: '3/3 counted attempt(s) correct; transfer evidence present',
    skill_graph_rule: 'Counting requires transfer and retention.',
    source_event_ids: ['event-1', 'event-2'],
    source_observation_ids: [],
    transfer_status: 'covered',
    transfer_required_context_count: 2,
    transfer_approved_context_count: 2,
    transfer_successful_context_count: 2,
    transfer_successful_strengths: ['weak', 'medium'],
    transfer_strongest_context_strength: 'medium',
    created_at: '2026-01-01T12:00:00.000Z',
  };
}

function makeSchedule(): ParentReviewScheduleRecord {
  return {
    schedule_id: 'review-schedule-counting',
    snapshot_id: 'mastery-snapshot-counting',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    mastery_status: 'likely_mastered',
    interval_label: 'Review after 24 hours',
    next_review_at: '2026-01-02T12:00:00.000Z',
    status_after_review: 'likely_mastered',
    recommended_action: 'schedule_review',
    created_at: '2026-01-01T12:00:00.000Z',
  };
}
