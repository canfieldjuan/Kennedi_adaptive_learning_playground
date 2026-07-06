/**
 * Contract tests: parent observations stay local and exportable.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type { ParentObservation } from '../../src/types/observations';

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

describe('parent observation storage contract', () => {
  test('parent observations save, update, list, export, and clear locally', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    const observation: ParentObservation = {
      observation_id: 'observation-1',
      session_id: 'session-1',
      child_id: 'local-child',
      note: 'Stayed focused and liked counting.',
      created_at: '2026-01-01T12:00:00.000Z',
    };

    storage.saveParentObservation(observation);
    storage.saveParentObservation({
      ...observation,
      note: 'Stayed focused and asked to count again.',
      updated_at: '2026-01-01T12:05:00.000Z',
    });

    const observations = storage.getParentObservations();
    expect(observations).toHaveLength(1);
    expect(observations[0].note).toBe('Stayed focused and asked to count again.');

    const exported = JSON.parse(storage.exportProgressData([])) as {
      export_metadata: { export_version: string };
      data_health: { total_observations: number };
      parent_observations: ParentObservation[];
      activity_events: ActivityAttemptEvent[];
    };
    expect(exported.export_metadata.export_version).toBe('1');
    expect(exported.data_health.total_observations).toBe(1);
    expect(exported.parent_observations).toHaveLength(1);
    expect(exported.activity_events).toHaveLength(0);

    storage.clearParentObservations();
    expect(storage.getParentObservations()).toHaveLength(0);
  });

  test('distinct parent observations are preserved and exported as history', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    storage.saveParentObservation({
      observation_id: 'observation-1',
      session_id: 'session-1',
      child_id: 'local-child',
      note: 'First note.',
      created_at: '2026-01-01T12:00:00.000Z',
    });
    storage.saveParentObservation({
      observation_id: 'observation-2',
      session_id: 'session-1',
      child_id: 'local-child',
      note: 'Second note.',
      created_at: '2026-01-01T12:05:00.000Z',
    });

    const observations = storage.getParentObservations();
    expect(observations).toHaveLength(2);
    expect(observations.map((observation) => observation.note)).toEqual([
      'First note.',
      'Second note.',
    ]);

    const exported = JSON.parse(storage.exportProgressData([])) as {
      parent_observations: ParentObservation[];
      data_health: { total_observations: number };
    };
    expect(exported.parent_observations).toHaveLength(2);
    expect(exported.data_health.total_observations).toBe(2);
  });
});
