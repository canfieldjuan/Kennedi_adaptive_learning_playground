/**
 * Contract tests: the Story Stage narration mode is a parent-owned local
 * setting — default narrated, persisted through the storage service, and
 * backward compatible with settings saved before the key existed.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';

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

describe('story mode setting contract', () => {
  test('defaults to narrated', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    expect(storage.getSettings().story_mode).toBe('narrated');
  });

  test('persists together across service instances', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);
    storage.saveSettings({ ...storage.getSettings(), story_mode: 'together' });
    expect(new StorageService(store).getSettings().story_mode).toBe('together');
  });

  test('settings saved before the key existed fall back to narrated', () => {
    const store = new MemoryKeyValueStorage();
    store.setItem(
      'lp_parent_settings',
      JSON.stringify({ child_display_name: 'Explorer', speech_enabled: true })
    );
    expect(new StorageService(store).getSettings().story_mode).toBe('narrated');
  });

  test('switching back to narrated persists too', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);
    storage.saveSettings({ ...storage.getSettings(), story_mode: 'together' });
    storage.saveSettings({ ...storage.getSettings(), story_mode: 'narrated' });
    expect(new StorageService(store).getSettings().story_mode).toBe('narrated');
  });
});
