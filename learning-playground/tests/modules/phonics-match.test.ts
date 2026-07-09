/**
 * Behavioral tests for the Word-game (phonics-match) runtime.
 *
 * The matcher had no behavioral coverage while it rode the generic tap-choice
 * grid; these pin the parity behavior on its own runtime: correct-tap completion,
 * hint-after-N, grid lock, and the reverse (letter, no-image) card.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderPhonicsMatchActivity,
  destroyPhonicsMatchActivity,
} from '../../src/modules/phonics-match/PhonicsMatchActivity';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../src/types/runtime';

describe('phonics-match (Word game) runtime — parity behavior', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#activity/phonics-find-b' },
      setTimeout: vi.fn(() => 0),
    });
  });

  afterEach(() => {
    destroyPhonicsMatchActivity();
    vi.unstubAllGlobals();
  });

  test('a correct tap emits correct + completed and locks the grid', () => {
    const { root, events } = setup('phonics-find-b');

    findByChoiceId(root, 'bear')?.click();
    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]?.selected_choice_id).toBe('bear');
    expect(events[0]?.correct_choice_id).toBe('bear');

    // Grid is locked — a further tap does nothing.
    findByChoiceId(root, 'cat')?.click();
    expect(events).toHaveLength(2);
  });

  test('two wrong taps trigger a hint that highlights the correct choice', () => {
    const { root, events } = setup('phonics-find-b');

    findByChoiceId(root, 'cat')?.click();
    findByChoiceId(root, 'sun')?.click();

    const outcomes = events.map((event) => event.outcome);
    expect(outcomes).toEqual(['incorrect', 'incorrect', 'hint_used']);
    expect(findByChoiceId(root, 'bear')?.classList.contains('is-hinted')).toBe(true);
  });

  test('the reverse letter card (no images) resolves the correct letter', () => {
    const { root, events } = setup('phonics-banana-starting-letter');

    findByChoiceId(root, 'letter-b')?.click();
    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[1]?.correct_answer).toBe('B');
  });
});

function setup(activityId: string): { root: MockElement; events: ActivityAttemptEvent[] } {
  const root = document.createElement('div') as unknown as MockElement;
  const events: ActivityAttemptEvent[] = [];
  renderPhonicsMatchActivity(root as unknown as HTMLElement, {
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

function findByChoiceId(element: MockElement, choiceId: string): MockElement | undefined {
  if (element.dataset.choiceId === choiceId) return element;
  for (const child of element.children) {
    const match = findByChoiceId(child, choiceId);
    if (match) return match;
  }
  return undefined;
}
