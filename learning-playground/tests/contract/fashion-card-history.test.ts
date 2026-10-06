/**
 * Fashion card history — storage-seam integration (Dress-Up Studio ownership
 * record). Exercises the real StorageService path: round-trip, dedupe by
 * completion_id, bounded cap, malformed-drop, export inclusion, and clear.
 * Mirrors the Bear Cafe / Number Train history contracts.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import {
  FASHION_CARD_HISTORY_LIMIT,
  type FashionCardCompletion,
} from '../../src/modules/dress-up-studio/fashion-cards';

class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

function card(overrides: Partial<FashionCardCompletion> = {}): FashionCardCompletion {
  return {
    completion_id: 'fc-1',
    session_id: 'session-1',
    doll_id: 'luna',
    tone_id: 'tone-light',
    hair_id: 'hair-ponytails',
    hair_color_id: 'haircolor-brown',
    glasses: false,
    outfit: { top: 'top-star-tee', shoes: 'shoes-sneakers' },
    accessory_ids: ['acc-bow'],
    scene_id: 'scene-park',
    frame_id: 'frame-gold-stars',
    created_at: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('fashion card history contract', () => {
  test('round-trips valid cards and makes a duplicate append idempotent', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);

    expect(storage.getFashionCardHistory()).toEqual([]);
    storage.appendFashionCardHistory(card());
    storage.appendFashionCardHistory(card());

    expect(new StorageService(store).getFashionCardHistory()).toEqual([card()]);
  });

  test('retains only the newest bounded history', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    for (let index = 0; index < 20; index += 1) {
      storage.appendFashionCardHistory(card({ completion_id: `fc-${index}` }));
    }
    const records = storage.getFashionCardHistory();
    expect(records).toHaveLength(FASHION_CARD_HISTORY_LIMIT);
    expect(records[0].completion_id).toBe('fc-8');
    expect(records.at(-1)?.completion_id).toBe('fc-19');
  });

  test('drops malformed records and strips extra fields', () => {
    const store = new MemoryKeyValueStorage();
    store.setItem('lp_fashion_card_history', JSON.stringify([
      { ...card(), score: 10, mastery: 'expert' },
      { ...card(), completion_id: 'no-glasses', glasses: 'yes' },
      { ...card(), completion_id: 'bad-outfit', outfit: { top: 7 } },
      { ...card(), completion_id: 'bad-accessory', accessory_ids: ['ok', 3] },
      { ...card(), completion_id: '' },
      'junk',
    ]));

    const records = new StorageService(store).getFashionCardHistory();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(card());
    expect(JSON.stringify(records[0])).not.toMatch(/score|mastery/);
  });

  test('exports the safe records and clears them through the boundary', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    storage.appendFashionCardHistory(card());

    const exported = JSON.parse(storage.exportProgressData([])) as {
      fashion_card_history: FashionCardCompletion[];
      export_metadata: { data_sections_included: string[] };
    };
    expect(exported.fashion_card_history).toEqual([card()]);
    expect(exported.export_metadata.data_sections_included).toContain('fashion_card_history');

    storage.clearFashionCardHistory();
    expect(storage.getFashionCardHistory()).toEqual([]);
  });

  test('keeps the ownership record free of correctness and reward fields', () => {
    const keys = Object.keys(card());
    for (const banned of [
      'correct', 'incorrect', 'score', 'mastery', 'skill', 'hint',
      'difficulty', 'points', 'streak', 'reward',
    ]) {
      expect(keys.some((key) => key.includes(banned))).toBe(false);
    }
  });
});
