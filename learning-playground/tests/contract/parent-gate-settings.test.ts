/**
 * Contract tests: configurable local parent gate settings.
 */

import { describe, expect, test } from 'vitest';
import {
  DEFAULT_PARENT_GATE_PHRASE,
  getParentGatePhrase,
  isParentGateAnswerCorrect,
} from '../../src/core/parent-gate';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type { ParentSettings } from '../../src/types/storage';

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

describe('parent gate settings contract', () => {
  test('defaults, saves, exports, and applies the local gate phrase', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    expect(storage.getSettings().parent_gate_phrase).toBe(
      DEFAULT_PARENT_GATE_PHRASE
    );

    storage.saveSettings({
      ...storage.getSettings(),
      parent_gate_phrase: 'Moon 7',
    });

    expect(storage.getSettings().parent_gate_phrase).toBe('Moon 7');
    expect(isParentGateAnswerCorrect(
      ' moon 7 ',
      getParentGatePhrase(storage.getSettings())
    )).toBe(true);

    const exported = JSON.parse(storage.exportProgressData([])) as {
      settings: ParentSettings;
    };
    expect(exported.settings.parent_gate_phrase).toBe('Moon 7');
  });

  test('blank saved phrases apply the default gate phrase', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    storage.saveSettings({
      ...storage.getSettings(),
      parent_gate_phrase: '   ',
    });

    expect(getParentGatePhrase(storage.getSettings())).toBe(
      DEFAULT_PARENT_GATE_PHRASE
    );
    expect(isParentGateAnswerCorrect(
      DEFAULT_PARENT_GATE_PHRASE,
      getParentGatePhrase(storage.getSettings())
    )).toBe(true);
  });
});
