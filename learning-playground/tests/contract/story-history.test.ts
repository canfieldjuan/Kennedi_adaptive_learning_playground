/**
 * Contract tests: story history (spec §21) — a narrowly scoped,
 * NON-EVALUATIVE local record. Persistence round-trips, malformed
 * entries are dropped, export and clear both include the store, the
 * Recent Stories formatter stays parent-readable and fact-only, and
 * the record shape carries no correctness or evaluation vocabulary.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import { buildRecentStories } from '../../src/core/story-history';
import { buildProgressExportPayload } from '../../src/core/export-data';
import { FIRST_STORY_PACK } from '../../src/modules/story-stage/first-tale';
import type { StoryHistoryRecord } from '../../src/types/story-history';

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

function record(overrides: Partial<StoryHistoryRecord> = {}): StoryHistoryRecord {
  return {
    story_session_id: 'story-1',
    mode: 'narrated',
    family_id: 'lost-friend',
    character_id: 'poppy',
    setting_id: 'enchanted-forest',
    problem_id: 'missing-friend',
    choice_path: ['sparkly-path', 'bubbles'],
    ending_id: 'found-with-bubbles',
    started_at: '2026-07-11T10:00:00.000Z',
    completed_at: '2026-07-11T10:05:00.000Z',
    status: 'completed',
    ...overrides,
  };
}

describe('story history persistence', () => {
  test('appends and reads back in order across service instances', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);
    expect(storage.getStoryHistory()).toEqual([]);

    storage.appendStoryHistory(record());
    storage.appendStoryHistory(
      record({ story_session_id: 'story-2', status: 'left_early', completed_at: undefined, ending_id: undefined })
    );

    const reread = new StorageService(store).getStoryHistory();
    expect(reread.map((entry) => entry.story_session_id)).toEqual(['story-1', 'story-2']);
    expect(reread[1].status).toBe('left_early');
    expect(reread[1].completed_at).toBeUndefined();
  });

  test('malformed entries are dropped on read', () => {
    const store = new MemoryKeyValueStorage();
    store.setItem(
      'lp_story_history',
      JSON.stringify([
        record(),
        { story_session_id: 42, status: 'completed' },
        { ...record({ story_session_id: 'story-3' }), status: 'graded_a_plus' },
        'junk',
      ])
    );
    const records = new StorageService(store).getStoryHistory();
    expect(records.map((entry) => entry.story_session_id)).toEqual(['story-1']);
  });

  test('extra keys on stored records are stripped by the allowlist rebuild', () => {
    const store = new MemoryKeyValueStorage();
    store.setItem(
      'lp_story_history',
      JSON.stringify([
        {
          ...record(),
          score: 5,
          narration: 'improvised words that must never persist',
          imagination_score: 9,
        },
      ])
    );
    const storage = new StorageService(store);
    const records = storage.getStoryHistory();
    expect(records).toHaveLength(1);
    expect(Object.keys(records[0]).sort()).toEqual([
      'character_id',
      'choice_path',
      'completed_at',
      'ending_id',
      'family_id',
      'mode',
      'problem_id',
      'setting_id',
      'started_at',
      'status',
      'story_session_id',
    ]);
    // Export never sees the forbidden keys either.
    const exported = storage.exportProgressData([]);
    expect(exported).not.toContain('imagination_score');
    expect(exported).not.toContain('improvised words');
    // And the next append persists the scrubbed form, not the original.
    storage.appendStoryHistory(record({ story_session_id: 'story-2' }));
    expect(store.getItem('lp_story_history')).not.toContain('imagination_score');
  });

  test('clearStoryHistory empties the store', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);
    storage.appendStoryHistory(record());
    storage.clearStoryHistory();
    expect(storage.getStoryHistory()).toEqual([]);
  });

  test('the record carries no correctness or evaluation vocabulary', () => {
    const keys = Object.keys(record());
    for (const banned of ['correct', 'incorrect', 'score', 'mastery', 'skill', 'hint', 'difficulty', 'evidence']) {
      expect(keys.some((key) => key.includes(banned))).toBe(false);
    }
  });
});

describe('story history in export', () => {
  test('the export payload includes story_history and lists the section', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);
    storage.appendStoryHistory(record());

    const payload = buildProgressExportPayload({
      settings: storage.getSettings(),
      childProfile: storage.getProgressProfile(),
      events: [],
      observations: [],
      storyHistory: storage.getStoryHistory(),
    });
    expect(payload.story_history).toHaveLength(1);
    expect(payload.story_history[0].story_session_id).toBe('story-1');
    expect(payload.export_metadata.data_sections_included).toContain('story_history');
  });

  test('exportProgressData carries the records end to end', () => {
    const store = new MemoryKeyValueStorage();
    const storage = new StorageService(store);
    storage.appendStoryHistory(record());
    const parsed = JSON.parse(storage.exportProgressData([]));
    expect(parsed.story_history).toHaveLength(1);
  });
});

describe('Recent Stories formatting', () => {
  test('labels resolve from the pack, newest first, fact-only wording', () => {
    const items = buildRecentStories(
      [
        record({ started_at: '2026-07-10T09:00:00.000Z' }),
        record({
          story_session_id: 'story-2',
          mode: 'together',
          family_id: 'special-delivery',
          character_id: 'milo',
          setting_id: 'cloud-village',
          problem_id: 'special-delivery',
          status: 'left_early',
          completed_at: undefined,
          ending_id: undefined,
          started_at: '2026-07-11T09:00:00.000Z',
        }),
      ],
      FIRST_STORY_PACK
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: 'Milo the Puppy at The Cloud Village',
      problemLabel: 'A Special Delivery',
      modeLabel: 'Tell It Together',
      statusLabel: 'Left early',
      startedOn: '2026-07-11',
    });
    expect(items[1].title).toBe('Princess Poppy at The Enchanted Forest');
    expect(items[1].modeLabel).toBe('Tell Me a Story');
    expect(items[1].statusLabel).toBe('Completed');
  });

  test('caps at the limit and unknown ids fall back to the raw id', () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      record({
        story_session_id: `story-${index}`,
        character_id: index === 0 ? 'ghost' : 'poppy',
        started_at: `2026-07-11T0${index % 10}:0${index % 6}:00.000Z`,
      })
    );
    const items = buildRecentStories(many, FIRST_STORY_PACK);
    expect(items).toHaveLength(10);
    const fallback = buildRecentStories(
      [record({ character_id: 'ghost' })],
      FIRST_STORY_PACK
    );
    expect(fallback[0].title).toBe('ghost at The Enchanted Forest');
  });
});
