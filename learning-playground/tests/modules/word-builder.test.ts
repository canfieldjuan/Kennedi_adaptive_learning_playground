/**
 * Behavioral tests for the Word-builder runtime (issue #27, top rung): tap letter
 * tiles into slots in order to spell a pictured word.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderWordBuilderActivity,
  destroyWordBuilderActivity,
} from '../../src/modules/phonics-match/WordBuilderActivity';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../src/types/runtime';

describe('word-builder runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#activity/build-cat' },
      setTimeout: vi.fn(() => 0),
    });
  });

  afterEach(() => {
    destroyWordBuilderActivity();
    vi.unstubAllGlobals();
  });

  test('the Word Workshop scene renders inert behind the builder (no letters)', () => {
    const { root } = setup('build-cat');
    const layers = findAllByClassName(root, 'workshop-environment');
    expect(layers).toHaveLength(1);
    expect(layers[0].attributes['aria-hidden']).toBe('true');
    expect(layers[0].innerHTML).not.toContain('<text');
  });

  test('tapping the letters in order builds the word, cheers Pip, and pops the picture', () => {
    const { root, events } = setup('build-cat');

    // Pip rests on the first sound (/c/ -> open) before any tap.
    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('open');

    findTileByLetter(root, 'c')?.click();
    findTileByLetter(root, 'a')?.click();
    findTileByLetter(root, 't')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]?.correct_answer).toBe('cat');
    // A flawless build is attempt 1 (wrong taps + 1), not the total tap count —
    // so evidence.ts does not misread it as a self-correction.
    expect(events[0]?.attempt_number).toBe(1);

    // Slots filled left-to-right.
    const slots = findByClass(root, 'word-builder__slots');
    expect(slots?.children.map((slot) => slot.textContent)).toEqual(['c', 'a', 't']);

    // Pip comes alive and the picture pops.
    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('cheer');
    expect(
      findByClass(root, 'word-builder__picture-image')?.classList.contains('is-alive')
    ).toBe(true);
  });

  test('a wrong tile gives incorrect feedback, then a hint highlights the right tile', () => {
    const { root, events } = setup('build-cat'); // expects c, a, t

    findTileByLetter(root, 't')?.click(); // wrong (expects c)
    findTileByLetter(root, 'a')?.click(); // wrong again -> hint

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(findTileByLetter(root, 'c')?.classList.contains('is-hinted')).toBe(true);
    // The hint event records the tile the child actually tapped, not the answer.
    expect(events[2]?.selected_answer).toBe('a');
  });

  test('hint eligibility resets per slot so every letter can earn a hint', () => {
    const { root } = setup('build-cat'); // expects c, a, t

    // Slot 1: two wrong taps -> hint for c.
    findTileByLetter(root, 'a')?.click();
    findTileByLetter(root, 't')?.click();
    expect(findTileByLetter(root, 'c')?.classList.contains('is-hinted')).toBe(true);

    // Advance to slot 2 by placing c.
    findTileByLetter(root, 'c')?.click();

    // Slot 2: two wrong taps -> a fresh hint for a (a one-shot flag would block this).
    findTileByLetter(root, 't')?.click();
    findTileByLetter(root, 't')?.click();
    expect(findTileByLetter(root, 'a')?.classList.contains('is-hinted')).toBe(true);
  });

  test('an activity whose tiles cannot spell the word shows the setup screen', () => {
    const root = document.createElement('div') as unknown as MockElement;
    const events: ActivityAttemptEvent[] = [];
    const broken = {
      ...getActivity('build-cat'),
      content: { target_word: 'cat', tiles: ['a', 't'], picture: '/assets/images/cat.svg' },
    } as unknown as LearningActivity;

    renderWordBuilderActivity(root as unknown as HTMLElement, {
      activity: broken,
      childId: 'local-child',
      sessionId: 'session-1',
      speech: createMockSpeech(),
      audio: createMockAudio(),
      onEvent: (event) => events.push(event),
    });

    expect(findByClass(root, 'word-builder__tray')).toBeUndefined();
    expect(findByClass(root, 'activity-title')?.textContent).toBe('Activity needs setup');
  });

  test('a placed tile is locked and cannot be re-tapped', () => {
    const { root, events } = setup('build-cat');

    const cTile = findTileByLetter(root, 'c');
    cTile?.click(); // places c
    cTile?.click(); // no-op (disabled)

    // Only the (silent) placement happened; no completion yet, no extra events.
    expect(events).toHaveLength(0);
    expect(cTile?.disabled).toBe(true);
  });

  test('symbolic transfer renders a model instead of a picture and emits normal evidence', () => {
    const { root, events } = setup('build-model-map');
    const model = findByClass(root, 'word-builder__model');

    expect(model?.textContent).toBe('map');
    expect(model?.attributes['aria-label']).toBe('Word to copy: map');
    expect(findByClass(root, 'word-builder__picture-image')).toBeUndefined();

    findTileByLetter(root, 'm')?.click();
    findTileByLetter(root, 'a')?.click();
    findTileByLetter(root, 'p')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]).toMatchObject({
      activity_id: 'build-model-map',
      activity_version: 1,
      skill_ids: ['word_building'],
      prompt_text: 'Copy this word. Tap the matching letters in order.',
      selected_answer: 'map',
      correct_answer: 'map',
      difficulty_level: 4,
    });
    expect(model?.classList.contains('is-alive')).toBe(true);
  });

  test('a symbolic model that disagrees with the target fails closed', () => {
    const root = document.createElement('div') as unknown as MockElement;
    const broken = {
      ...getActivity('build-model-map'),
      content: {
        ...getActivity('build-model-map').content,
        word_model: 'sun',
      },
    } as LearningActivity;

    renderWordBuilderActivity(root as unknown as HTMLElement, {
      activity: broken,
      childId: 'local-child',
      sessionId: 'session-1',
      speech: createMockSpeech(),
      audio: createMockAudio(),
      onEvent: vi.fn(),
    });

    expect(findByClass(root, 'word-builder__model')).toBeUndefined();
    expect(findByClass(root, 'activity-title')?.textContent).toBe('Activity needs setup');
  });
});

function setup(activityId: string): { root: MockElement; events: ActivityAttemptEvent[] } {
  const root = document.createElement('div') as unknown as MockElement;
  const events: ActivityAttemptEvent[] = [];
  renderWordBuilderActivity(root as unknown as HTMLElement, {
    activity: getActivity(activityId),
    childId: 'local-child',
    sessionId: 'session-1',
    speech: createMockSpeech(),
    audio: createMockAudio(),
    onEvent: (event) => events.push(event),
  });
  return { root, events };
}

function getActivity(activityId: string): LearningActivity {
  const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === activityId);
  if (!activity) throw new Error(`Missing activity ${activityId}`);
  return activity as LearningActivity;
}

class MockClassList {
  private readonly values = new Set<string>();
  add(name: string): void {
    this.values.add(name);
  }
  remove(name: string): void {
    this.values.delete(name);
  }
  contains(name: string): boolean {
    return this.values.has(name);
  }
}

class MockElement {
  readonly tagName: string;
  readonly children: MockElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  readonly classList = new MockClassList();
  className = '';
  id = '';
  textContent = '';
  innerHTML = '';
  disabled = false;
  hidden = false;
  src = '';
  alt = '';
  type = '';
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

  removeEventListener(type: string, handler: () => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((fn) => fn !== handler);
  }

  click(): void {
    if (this.disabled) return;
    for (const handler of this.listeners.click ?? []) handler();
  }

  remove(): void {
    // no parent tracking needed
  }
}

function createMockDocument(): Document {
  return {
    createElement: (tagName: string) => new MockElement(tagName),
  } as unknown as Document;
}

function createMockSpeech(): SpeechServiceInterface {
  return {
    enabled: true,
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    repeatLast: vi.fn(),
  };
}

function createMockAudio(): AudioServiceInterface {
  return { play: vi.fn(), stop: vi.fn() };
}

function findAllByClassName(element: MockElement, className: string): MockElement[] {
  const matches = element.className.split(/\s+/).includes(className) ? [element] : [];
  for (const child of element.children) {
    matches.push(...findAllByClassName(child, className));
  }
  return matches;
}

function findByClass(element: MockElement, className: string): MockElement | undefined {
  if (element.className.split(/\s+/).includes(className)) return element;
  for (const child of element.children) {
    const match = findByClass(child, className);
    if (match) return match;
  }
  return undefined;
}

function findTileByLetter(element: MockElement, letter: string): MockElement | undefined {
  if (
    element.className.split(/\s+/).includes('word-builder__tile') &&
    element.dataset.letter === letter
  ) {
    return element;
  }
  for (const child of element.children) {
    const match = findTileByLetter(child, letter);
    if (match) return match;
  }
  return undefined;
}
