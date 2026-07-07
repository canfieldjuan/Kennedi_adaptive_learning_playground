/**
 * Contract tests: parent approval remains required for recommendation changes.
 */

import { describe, expect, test } from 'vitest';

describe('parent approval boundary contract', () => {
  test('mastery and recommendation core modules do not save active guidance', () => {
    const sources = import.meta.glob(
      '../../src/core/{mastery-engine,evidence,curriculum-graph,review-scheduler,parent-interpretation,transfer-coverage,content-gap-engine,recommendation-engine}.ts',
      {
        eager: true,
        import: 'default',
        query: '?raw',
      }
    ) as Record<string, string>;

    expect(Object.keys(sources)).toHaveLength(8);
    for (const source of Object.values(sources)) {
      expect(source).not.toContain('saveParentDifficultyOverride');
      expect(source).not.toContain('saveParentTransferDecision');
      expect(source).not.toContain('StorageService');
      expect(source).not.toContain('localStorage');
    }
  });

  test('parent panel still owns active guidance approval controls', () => {
    const sources = import.meta.glob(
      '../../src/modules/parent-panel/ParentPanel.ts',
      {
        eager: true,
        import: 'default',
        query: '?raw',
      }
    ) as Record<string, string>;
    const source = Object.values(sources)[0] ?? '';

    expect(source).toContain('Apply as active guidance');
    expect(source).toContain('Record parent choice');
    expect(source).toContain('Approve transfer plan');
    expect(source).toContain('Hold transfer plan');
    expect(source).toContain('saveParentDifficultyOverride');
    expect(source).toContain('saveParentTransferDecision');
  });
});
