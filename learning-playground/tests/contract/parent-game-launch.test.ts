/**
 * Contract tests: parent-owned game launch entry points.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderParentPanel } from '../../src/modules/parent-panel/ParentPanel';
import type { StorageServiceInterface } from '../../src/types/runtime';
import type { ChildProgressProfile } from '../../src/types/progress';
import type { ParentObservation } from '../../src/types/observations';

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

  test('parent panel renders and routes both parent-started launch paths', () => {
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

    expect(collectText(root)).toContain('Video Observation');
    expect(collectText(root)).toContain('Bear Bakes Bread + separate question');
    expect(collectText(root)).toContain('Exposure + response');
    const videoLaunchButton = findElementByText(root, 'Start Video Observation');

    expect(videoLaunchButton).toBeDefined();
    expect(videoLaunchButton?.dataset.activityId).toBe('video-vault');
    videoLaunchButton?.click();
    expect(window.location.hash).toBe('#activity/video-vault');
    expect(localStorage.getItem('lp_activity_events')).toBeNull();
  });

  test('video observation launch honors the parent playback setting', () => {
    const storage = createMockStorage();
    const enabledSettings = storage.getSettings();
    storage.getSettings = () => ({
      ...enabledSettings,
      video_enabled: false,
    });
    const root = document.createElement('div');

    renderParentPanel(root, storage, {
      childId: 'local-child',
      sessionId: 'session-1',
    });

    const videoLaunchButton = findElementByText(root, 'Start Video Observation');
    expect(videoLaunchButton).toBeDefined();
    expect(videoLaunchButton?.disabled).toBe(true);
    expect(collectText(root)).toMatch(/Playback\s+Off/);

    videoLaunchButton?.click();
    expect(window.location.hash).toBe('#parent');
    expect(localStorage.getItem('lp_activity_events')).toBeNull();
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

    expect(collectText(root)).toContain('1: Counts structured quantities accurately');
  });

  test('parent notes expose structured fit and skill controls only in the parent panel', () => {
    const root = document.createElement('div');

    renderParentPanel(root, createMockStorage(), {
      childId: 'local-child',
      sessionId: 'session-1',
    });

    const text = collectText(root);
    expect(text).toContain('Observation type');
    expect(text).toContain('General note');
    expect(text).toContain('Independent success');
    expect(text).toContain('Real-world transfer');
    expect(text).toContain('Applies to');
    expect(text).toContain('Whole session');
  });

  test('parent notes save the selected category and session skill', () => {
    localStorage.setItem('lp_activity_events', JSON.stringify([{
      event_id: 'event-1',
      session_id: 'session-1',
      child_id: 'local-child',
      activity_id: 'math-count-stars-three',
      activity_version: 1,
      skill_ids: ['counting'],
      timestamp: '2026-01-01T12:00:00.000Z',
      prompt_text: 'How many stars do you see?',
      outcome: 'correct',
      selected_choice_id: 'three',
      correct_choice_id: 'three',
      selected_answer: '3',
      correct_answer: '3',
      attempt_number: 1,
      response_time_ms: 1000,
      difficulty_level: 1,
      choice_count: 3,
      distractor_strength: 'easy',
      input_type: 'tap',
      hint_shown: false,
    }]));
    const saved: ParentObservation[] = [];
    const storage: StorageServiceInterface = {
      ...createMockStorage(),
      saveParentObservation: (observation) => saved.push(observation),
    };
    const root = document.createElement('div');

    renderParentPanel(root, storage, {
      childId: 'local-child',
      sessionId: 'session-1',
    });

    const categorySelect = findElementById(root, 'parent-observation-category');
    const skillSelect = findElementById(root, 'parent-observation-skill');
    const textarea = findElementById(root, 'parent-session-note');
    const saveButton = findElementByText(root, 'Save Notes');
    expect(collectText(root)).toContain('Counting');
    expect(categorySelect).toBeDefined();
    expect(skillSelect).toBeDefined();
    expect(textarea).toBeDefined();
    expect(saveButton).toBeDefined();

    categorySelect!.value = 'too_hard';
    skillSelect!.value = 'counting';
    textarea!.value = 'Needed a calmer counting round.';
    saveButton!.click();

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      session_id: 'session-1',
      child_id: 'local-child',
      note: 'Needed a calmer counting round.',
      category: 'too_hard',
      skill_ids: ['counting'],
    });
  });

  test('parent notes fail closed when select values are not offered by the session', () => {
    const saved: ParentObservation[] = [];
    const storage: StorageServiceInterface = {
      ...createMockStorage(),
      saveParentObservation: (observation) => saved.push(observation),
    };
    const root = document.createElement('div');

    renderParentPanel(root, storage, {
      childId: 'local-child',
      sessionId: 'session-1',
    });

    const categorySelect = findElementById(root, 'parent-observation-category');
    const skillSelect = findElementById(root, 'parent-observation-skill');
    const textarea = findElementById(root, 'parent-session-note');
    const saveButton = findElementByText(root, 'Save Notes');

    categorySelect!.value = 'unsupported-category';
    skillSelect!.value = 'unsupported-skill';
    textarea!.value = 'A note with malformed control values.';
    saveButton!.click();

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      category: 'general',
      note: 'A note with malformed control values.',
    });
    expect(saved[0].skill_ids).toBeUndefined();
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
    if (this.disabled) return;
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
      story_mode: 'narrated',
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

function findElementById(
  element: Element,
  id: string
): MockElement | undefined {
  const mockElement = element as unknown as MockElement;
  if (mockElement.id === id) return mockElement;

  for (const child of mockElement.children) {
    const match = findElementById(child as unknown as Element, id);
    if (match) return match;
  }

  return undefined;
}
