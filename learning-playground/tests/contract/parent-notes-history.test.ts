/**
 * Contract tests: parent note history formatting.
 */

import { describe, expect, test } from 'vitest';
import { buildParentNoteHistory } from '../../src/core/parent-notes-history';
import type { ParentObservation } from '../../src/types/observations';

describe('parent notes history contract', () => {
  test('orders session notes newest first and formats timestamps', () => {
    const history = buildParentNoteHistory([
      makeObservation({
        observationId: 'observation-1',
        note: 'First note.',
        createdAt: '2026-01-01T12:00:00.000Z',
      }),
      makeObservation({
        observationId: 'observation-2',
        note: 'Second note.',
        createdAt: '2026-01-01T12:05:00.000Z',
      }),
    ]);

    expect(history).toEqual([
      {
        observation_id: 'observation-2',
        note: 'Second note.',
        created_at: '2026-01-01T12:05:00.000Z',
        updated_at: undefined,
        timestamp_label: '2026-01-01 12:05 UTC',
      },
      {
        observation_id: 'observation-1',
        note: 'First note.',
        created_at: '2026-01-01T12:00:00.000Z',
        updated_at: undefined,
        timestamp_label: '2026-01-01 12:00 UTC',
      },
    ]);
  });

  test('uses updated timestamp label when an existing note was edited elsewhere', () => {
    const [historyItem] = buildParentNoteHistory([
      makeObservation({
        observationId: 'observation-1',
        note: 'Edited note.',
        createdAt: '2026-01-01T12:00:00.000Z',
        updatedAt: '2026-01-01T12:10:00.000Z',
      }),
    ]);

    expect(historyItem.timestamp_label).toBe('2026-01-01 12:10 UTC');
  });
});

function makeObservation(params: {
  observationId: string;
  note: string;
  createdAt: string;
  updatedAt?: string;
}): ParentObservation {
  return {
    observation_id: params.observationId,
    session_id: 'session-1',
    child_id: 'local-child',
    note: params.note,
    created_at: params.createdAt,
    updated_at: params.updatedAt,
  };
}
