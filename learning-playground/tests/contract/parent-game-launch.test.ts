/**
 * Contract tests: parent-owned game launch entry points.
 */

import { describe, expect, test } from 'vitest';

describe('parent game launch contract', () => {
  test('parent panel owns the Bear Cafe launch path', () => {
    const sources = import.meta.glob(
      '../../src/modules/parent-panel/ParentPanel.ts',
      {
        eager: true,
        import: 'default',
        query: '?raw',
      }
    ) as Record<string, string>;
    const source = Object.values(sources)[0] ?? '';

    expect(source).toContain('Parent-Started Games');
    expect(source).toContain('Bear Cafe');
    expect(source).toContain('Start Bear Cafe');
    expect(source).toContain("const BEAR_CAFE_FIRST_ACTIVITY_ID = 'kennedis-orders-banana-001'");
    expect(source).toContain('window.location.hash = BEAR_CAFE_ROUTE');
  });

  test('Bear Cafe is not exposed on the four-slot child home grid', () => {
    const sources = import.meta.glob(
      '../../src/modules/home/HomeScreen.ts',
      {
        eager: true,
        import: 'default',
        query: '?raw',
      }
    ) as Record<string, string>;
    const source = Object.values(sources)[0] ?? '';

    expect(source.match(/id: 'home-/g) ?? []).toHaveLength(4);
    expect(source).toContain("label: 'Words'");
    expect(source).toContain("label: 'Videos'");
    expect(source).toContain("label: 'Math'");
    expect(source).toContain("label: 'Art'");
    expect(source).not.toContain('kennedis-orders');
    expect(source).not.toContain('Bear Cafe');
  });

  test('parent launch does not add automatic child routing or new game modules', () => {
    const parentSources = import.meta.glob(
      '../../src/modules/parent-panel/ParentPanel.ts',
      {
        eager: true,
        import: 'default',
        query: '?raw',
      }
    ) as Record<string, string>;
    const parentSource = Object.values(parentSources)[0] ?? '';
    const catalogSources = import.meta.glob(
      '../../src/content/activity-catalog.ts',
      {
        eager: true,
        import: 'default',
        query: '?raw',
      }
    ) as Record<string, string>;
    const catalogSource = Object.values(catalogSources)[0] ?? '';

    expect(parentSource).toContain('Start Bear Cafe');
    expect(parentSource).not.toContain('nature-camera-safari');
    expect(catalogSource).not.toContain('nature-camera');
  });
});
