/**
 * Contract tests: parent-owned game launch entry points.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderParentPanel } from '../../src/modules/parent-panel/ParentPanel';
import type { StorageServiceInterface } from '../../src/types/runtime';
import type { ChildProgressProfile } from '../../src/types/progress';

describe('parent game launch contract', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('localStorage', createMemoryLocalStorage());
    vi.stubGlobal('window', {
      location: { hash: '#parent' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('parent panel renders and routes the Bear Cafe launch path', () => {
    const root = document.createElement('div');

    renderParentPanel(root, createMockStorage(), {
      childId: 'local-child',
      sessionId: 'session-1',
    });

    expect(collectText(root)).toContain('Parent-Started Games');
    expect(collectText(root)).toContain('Bear Cafe');
    const launchButton = findElementByText(root, 'Start Bear Cafe');

    expect(launchButton).toBeDefined();
    expect(launchButton?.dataset.activityId).toBe('kennedis-orders-banana-001');
    launchButton?.click();
    expect(window.location.hash).toBe('#activity/kennedis-orders-banana-001');
  });

  test('parent progress renders curriculum level labels instead of bare numbers', () => {
    const root = document.createElement('div');

    renderParentPanel(root, createMockStorage({
      child_id: 'local-child',
      profile_version: 1,
      created_at: '2026-07-08T00:00:00.000Z',
      updated_at: '2026-07-08T00:00:00.000Z',
      skill_mastery: {
        counting: {
          skill_id: 'counting',
          current_level: 1,
          confidence: 0.8,
          total_attempts: 5,
          correct_attempts: 5,
          recent_accuracy: 1,
          recent_average_response_ms: 900,
          last_seen_at: '2026-07-08T00:00:00.000Z',
          needs_review: false,
        },
      },
      session_summary: [],
    }), {
      childId: 'local-child',
      sessionId: 'session-1',
    });

    expect(collectText(root)).toContain('1: Counts small pretend-play sets');
  });

  test('Bear Cafe replaces Videos on the four-slot child home grid', () => {
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
    expect(source).toContain("label: 'Cafe'");
    expect(source).toContain("label: 'Math'");
    expect(source).toContain("label: 'Art'");
    expect(source).toContain("speechLabel: 'Bear Cafe'");
    expect(source).toContain("route: '#activity/kennedis-orders-banana-001'");
    expect(source).not.toContain("label: 'Videos'");
  });

  test('Bear Cafe launch does not add new game modules', () => {
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

class MockElement {
  readonly tagName: string;
  readonly children: MockElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  className = '';
  id = '';
  textContent = '';
  innerHTML = '';
  type = '';
  value = '';
  disabled = false;
  href = '';
  download = '';
  htmlFor = '';
  title = '';
  private readonly listeners: Record<string, Array<() => void>> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  appendChild(child: MockElement): MockElement {
    this.children.push(child);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  addEventListener(type: string, handler: () => void): void {
    this.listeners[type] ??= [];
    this.listeners[type].push(handler);
  }

  click(): void {
    for (const handler of this.listeners.click ?? []) {
      handler();
    }
  }

  remove(): void {
    // Tests do not need parent references; this satisfies ParentPanel cleanup.
  }
}

function createMockDocument(): Document {
  return {
    createElement: (tagName: string) => new MockElement(tagName),
  } as unknown as Document;
}

function createMemoryLocalStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  } as Storage;
}

function createMockStorage(profile: ChildProgressProfile = {
    child_id: 'local-child',
    profile_version: 1,
    created_at: '2026-07-08T00:00:00.000Z',
    updated_at: '2026-07-08T00:00:00.000Z',
    skill_mastery: {},
    session_summary: [],
  }): StorageServiceInterface {
  return {
    getSettings: () => ({
      child_display_name: 'Explorer',
      session_limit_minutes: 20,
      sound_enabled: true,
      speech_enabled: true,
      video_enabled: true,
      max_activity_choices: 4,
      difficulty_mode: 'adaptive',
      allowed_domains: ['language', 'phonics', 'math', 'art'],
      parent_gate_enabled: true,
      parent_gate_phrase: 'PARENT',
    }),
    saveSettings: () => undefined,
    getProgressProfile: () => profile,
    saveProgressProfile: () => undefined,
    updateProgressFromEvents: () => profile,
    resetProgress: () => undefined,
    getParentObservations: () => [],
    saveParentObservation: () => undefined,
    clearParentObservations: () => undefined,
    getParentDifficultyActions: () => [],
    saveParentDifficultyAction: () => undefined,
    clearParentDifficultyActions: () => undefined,
    getParentDifficultyOverrides: () => [],
    saveParentDifficultyOverride: () => undefined,
    clearParentDifficultyOverrides: () => undefined,
    getParentTransferDecisions: () => [],
    saveParentTransferDecision: () => undefined,
    clearParentTransferDecisions: () => undefined,
    getParentActivityBriefDecisions: () => [],
    saveParentActivityBriefDecision: () => undefined,
    clearParentActivityBriefDecisions: () => undefined,
    getParentMasterySnapshots: () => [],
    saveParentMasterySnapshot: () => undefined,
    clearParentMasterySnapshots: () => undefined,
    getParentReviewScheduleRecords: () => [],
    saveParentReviewScheduleRecord: () => undefined,
    clearParentReviewScheduleRecords: () => undefined,
    exportProgressData: () => '{}',
  };
}

function collectText(element: Element): string {
  const mockElement = element as unknown as MockElement;
  return [
    mockElement.textContent,
    mockElement.innerHTML,
    ...mockElement.children.map((child) => collectText(child as unknown as Element)),
  ].join(' ');
}

function findElementByText(
  element: Element,
  text: string
): MockElement | undefined {
  const mockElement = element as unknown as MockElement;
  if (mockElement.textContent === text) return mockElement;

  for (const child of mockElement.children) {
    const match = findElementByText(child as unknown as Element, text);
    if (match) return match;
  }

  return undefined;
}
