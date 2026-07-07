/**
 * Contract tests: parent-approved active difficulty guidance.
 */

import { describe, expect, test } from 'vitest';
import {
  buildActiveParentDifficultyOverrideHistory,
  formatParentDifficultyOverrideLabel,
  getParentDifficultyOverrideTypeForRecommendation,
} from '../../src/core/parent-difficulty-overrides';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type {
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../../src/types/parent-actions';

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

describe('parent difficulty override contract', () => {
  test('stores, replaces, exports, and clears active parent guidance locally', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());

    storage.saveParentDifficultyOverride(makeOverride({
      overrideId: 'override-1',
      overrideType: 'add_support',
      createdAt: '2026-01-01T12:00:00.000Z',
    }));
    storage.saveParentDifficultyOverride(makeOverride({
      overrideId: 'override-2',
      overrideType: 'promote_gently',
      createdAt: '2026-01-01T12:05:00.000Z',
    }));

    const overrides = storage.getParentDifficultyOverrides();
    expect(overrides).toHaveLength(2);
    expect(overrides[0]).toMatchObject({
      override_id: 'override-1',
      active: false,
      deactivated_at: '2026-01-01T12:05:00.000Z',
    });
    expect(overrides[1]).toMatchObject({
      override_id: 'override-2',
      active: true,
      override_type: 'promote_gently',
    });
    expect(Object.keys(
      storage.getProgressProfile('local-child').skill_mastery
    )).toHaveLength(0);

    const exported = JSON.parse(storage.exportProgressData([])) as {
      export_metadata: { data_sections_included: string[] };
      parent_difficulty_overrides: ParentDifficultyOverride[];
    };
    expect(exported.export_metadata.data_sections_included).toContain(
      'parent_difficulty_overrides'
    );
    expect(exported.parent_difficulty_overrides).toHaveLength(2);
    expect(exported.parent_difficulty_overrides[1].active).toBe(true);

    storage.clearParentDifficultyOverrides();
    expect(storage.getParentDifficultyOverrides()).toHaveLength(0);
  });

  test('formats active guidance and recommendation mappings', () => {
    expect(formatParentDifficultyOverrideLabel('keep_current')).toBe(
      'Keep current'
    );
    expect(getParentDifficultyOverrideTypeForRecommendation(
      'Promote gently'
    )).toBe('promote_gently');
    expect(getParentDifficultyOverrideTypeForRecommendation(
      'Not enough data'
    )).toBeUndefined();

    const history = buildActiveParentDifficultyOverrideHistory([
      makeOverride({
        overrideId: 'inactive',
        overrideType: 'add_support',
        createdAt: '2026-01-01T12:00:00.000Z',
        active: false,
      }),
      makeOverride({
        overrideId: 'active',
        overrideType: 'keep_current',
        createdAt: '2026-01-01T12:05:00.000Z',
      }),
    ]);

    expect(history).toEqual([
      expect.objectContaining({
        override_id: 'active',
        override_label: 'Keep current',
        timestamp_label: '2026-01-01 12:05 UTC',
      }),
    ]);
  });

  test('does not apply active guidance inside child runtimes in this slice', () => {
    const runtimeSources = import.meta.glob(
      '../../src/modules/{tap-choice/TapChoiceActivity,coloring-book/ColoringActivity,video-vault/VideoVault}.ts',
      {
        eager: true,
        import: 'default',
        query: '?raw',
      }
    ) as Record<string, string>;

    expect(Object.keys(runtimeSources)).toHaveLength(3);
    for (const source of Object.values(runtimeSources)) {
      expect(source).not.toContain('ParentDifficultyOverride');
      expect(source).not.toContain('getParentDifficultyOverrides');
    }
  });
});

function makeOverride(params: {
  overrideId: string;
  overrideType: ParentDifficultyOverrideType;
  createdAt: string;
  active?: boolean;
}): ParentDifficultyOverride {
  return {
    override_id: params.overrideId,
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    override_type: params.overrideType,
    source_recommendation: 'Promote gently',
    source_status: 'Ready for next challenge',
    source_reason: '100% accuracy with no hints or stops.',
    active: params.active ?? true,
    created_at: params.createdAt,
  };
}
