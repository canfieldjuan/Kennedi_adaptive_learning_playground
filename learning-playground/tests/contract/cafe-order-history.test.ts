import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import { CAFE_ORDER_HISTORY_LIMIT, type CafeOrderCompletion } from '../../src/types/cafe-order-completion';

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

function order(overrides: Partial<CafeOrderCompletion> = {}): CafeOrderCompletion {
  return {
    schema_version: 1,
    game: 'kennedis-orders',
    completion_id: 'cafe-order-1',
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'kennedis-orders-banana-001',
    activity_version: 1,
    caller_id: 'baby-polar-bear',
    food_items: [{ food_id: 'banana', count: 1 }],
    bag_color_id: 'pink',
    seal_id: 'heart',
    completed_at: '2026-07-13T12:00:00.000Z',
    ...overrides,
  };
}

describe('Bear Cafe order history contract', () => {
  test('round-trips valid orders and makes duplicate append idempotent', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);

    expect(storage.getCafeOrderHistory()).toEqual([]);
    storage.appendCafeOrderHistory(order());
    storage.appendCafeOrderHistory(order());

    const reread = new StorageService(store).getCafeOrderHistory();
    expect(reread).toEqual([order()]);
  });

  test('sorts chronologically and retains only the newest bounded history', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    for (let index = 49; index >= 0; index -= 1) {
      storage.appendCafeOrderHistory(order({
        completion_id: `cafe-order-${index}`,
        completed_at: new Date(Date.UTC(2026, 6, 13, 12, index)).toISOString(),
      }));
    }

    const records = storage.getCafeOrderHistory();
    expect(records).toHaveLength(CAFE_ORDER_HISTORY_LIMIT);
    expect(records[0].completion_id).toBe('cafe-order-2');
    expect(records.at(-1)?.completion_id).toBe('cafe-order-49');
  });

  test('drops malformed or unknown records and strips extra fields', () => {
    const store = new MemoryKeyValueStorage();
    const validWithExtras = {
      ...order(),
      score: 10,
      mastery: 'expert',
      food_items: [{ food_id: 'banana', count: 1, bonus: true }],
    };
    store.setItem('lp_cafe_order_history', JSON.stringify([
      validWithExtras,
      { ...order(), completion_id: 'bad-caller', caller_id: 'mystery-bear' },
      { ...order(), completion_id: 'bad-food', food_items: [{ food_id: 'pizza', count: 1 }] },
      { ...order(), completion_id: 'zero-food', food_items: [{ food_id: 'banana', count: 0 }] },
      {
        ...order(),
        completion_id: 'duplicate-food',
        food_items: [{ food_id: 'banana', count: 1 }, { food_id: 'banana', count: 1 }],
      },
      {
        ...order(),
        completion_id: 'too-many-foods',
        food_items: [
          { food_id: 'banana', count: 5 },
          { food_id: 'berry', count: 5 },
          { food_id: 'cookie', count: 3 },
        ],
      },
      { ...order(), completion_id: 'bad-bag', bag_color_id: 'gold' },
      { ...order(), completion_id: 'bad-seal', seal_id: 'prize' },
      { ...order(), completion_id: 'bad-date', completed_at: 'sometime' },
      'junk',
    ]));

    const records = new StorageService(store).getCafeOrderHistory();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(order());
    expect(JSON.stringify(records[0])).not.toMatch(/score|mastery|bonus/);
  });

  test('rejects an invalid typed append without damaging valid history', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    storage.appendCafeOrderHistory(order());
    storage.appendCafeOrderHistory({
      ...order({ completion_id: 'forged-order' }),
      seal_id: 'loot' as CafeOrderCompletion['seal_id'],
    });

    expect(storage.getCafeOrderHistory().map((item) => item.completion_id)).toEqual([
      'cafe-order-1',
    ]);
  });

  test('exports the safe records and clears them through the storage boundary', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    storage.appendCafeOrderHistory(order());

    const exported = JSON.parse(storage.exportProgressData([])) as {
      cafe_order_history: CafeOrderCompletion[];
      export_metadata: { data_sections_included: string[] };
    };
    expect(exported.cafe_order_history).toEqual([order()]);
    expect(exported.export_metadata.data_sections_included).toContain('cafe_order_history');

    storage.clearCafeOrderHistory();
    expect(storage.getCafeOrderHistory()).toEqual([]);
  });

  test('keeps ownership records free of correctness and reward fields', () => {
    const keys = Object.keys(order());
    for (const banned of [
      'correct',
      'incorrect',
      'score',
      'mastery',
      'skill',
      'hint',
      'difficulty',
      'points',
      'streak',
      'reward',
    ]) {
      expect(keys.some((key) => key.includes(banned))).toBe(false);
    }
  });
});
