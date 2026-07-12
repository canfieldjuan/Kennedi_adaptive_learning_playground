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

  test('the Word Workshop scene renders inert behind every mode (no letters)', () => {
    const { root } = setup('phonics-find-b');
    const layers = findAllByClassName(root, 'workshop-environment');
    expect(layers).toHaveLength(1);
    expect(layers[0].attributes['aria-hidden']).toBe('true');
    expect(layers[0].innerHTML).toContain('workshop-env__svg');
    // Hard guardrail: nothing in the scene may read as a letter or word.
    expect(layers[0].innerHTML).not.toContain('<text');

    const blend = setup('blend-cat');
    expect(findAllByClassName(blend.root, 'workshop-environment')).toHaveLength(1);
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

  test('a chained activity shows a Next button that advances the session', () => {
    const { root } = setup('phonics-find-b');

    findByChoiceId(root, 'bear')?.click();
    const nextButton = findByText(root, 'Next word');
    expect(nextButton).toBeDefined();

    nextButton?.click();
    expect(window.location.hash).toBe('#activity/phonics-find-m');
  });

  test('Pip shows the mouth shape for the target sound (/b/ -> bilabial)', () => {
    const { root } = setup('phonics-find-b');
    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('bilabial');
  });

  test('Pip shows a different mouth for a different sound (/s/ -> sibilant)', () => {
    const { root } = setup('phonics-find-s');
    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('sibilant');
  });

  test('a correct match makes Pip cheer and the matched word come alive', () => {
    const { root } = setup('phonics-find-b');

    findByChoiceId(root, 'bear')?.click();

    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('cheer');
    expect(findByChoiceId(root, 'bear')?.classList.contains('is-alive')).toBe(true);
  });

  test('letter-first: the capital letter leads and Pip pops in as the reward', () => {
    const { root } = setup('phonics-find-b');

    // One line from the top, naming the capital letter.
    expect(findByClass(root, 'activity-title')?.textContent).toBe(
      'Find the word that starts with the letter B.'
    );
    expect(findByClass(root, 'activity-prompt')).toBeUndefined();

    // The chip holds the letter — Pip is not on stage yet.
    const art = findByClass(root, 'phonics-character__art');
    expect(art?.innerHTML).toContain('phonics-letter');
    expect(art?.innerHTML).toContain('>B<');
    expect(
      findByClass(root, 'phonics-character')?.classList.contains('phonics-character--letter')
    ).toBe(true);

    // The correct answer swaps the letter for cheering Pip.
    findByChoiceId(root, 'bear')?.click();
    expect(art?.innerHTML).not.toContain('phonics-letter');
    expect(
      findByClass(root, 'phonics-character')?.classList.contains('phonics-character--letter')
    ).toBe(false);
    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('cheer');
  });

  test('letter-first stays out of blending: Pip leads a blend from the start', () => {
    const { root } = setup('blend-cat');
    expect(findByClass(root, 'phonics-character__art')?.innerHTML).not.toContain('phonics-letter');
    expect(findByClass(root, 'activity-prompt')).toBeDefined();
  });

  test('a blend renders a sound-out strip and Pip rests on the first sound', () => {
    const { root } = setup('blend-cat');

    const soundout = findByClass(root, 'phonics-soundout');
    expect(soundout?.children.map((chip) => chip.textContent)).toEqual(['c', 'a', 't']);
    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('open'); // /c/
  });

  test('a correct whole-word blend completes and makes the word come alive', () => {
    const { root, events } = setup('blend-cat');

    findByChoiceId(root, 'cat')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(findByClass(root, 'phonics-character')?.dataset.mouth).toBe('cheer');
    expect(findByChoiceId(root, 'cat')?.classList.contains('is-alive')).toBe(true);
  });

  test('spoken blending omits the visual sound strip and emits normal evidence', () => {
    const { root, events } = setup('blend-listen-dog');

    expect(findByClass(root, 'phonics-soundout')).toBeUndefined();
    findByChoiceId(root, 'dog')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]).toMatchObject({
      activity_id: 'blend-listen-dog',
      activity_version: 1,
      skill_ids: ['blending'],
      prompt_text: 'Listen: duh ... ah ... guh. Put the sounds together. Which picture?',
      selected_answer: 'dog',
      correct_answer: 'dog',
      difficulty_level: 4,
    });
  });

  test('the Word-game chain is complete, ordered, and terminates', () => {
    const visited: string[] = [];
    const seen = new Set<string>();
    let id: string | undefined = 'phonics-find-b';

    while (id) {
      if (seen.has(id)) throw new Error(`chain loops at ${id}`);
      seen.add(id);
      visited.push(id);
      const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === id) as
        | LearningActivity
        | undefined;
      expect(activity).toBeDefined();
      id = (activity?.content as { next_activity_id?: string })?.next_activity_id;
    }

    expect(visited).toEqual([
      'phonics-find-b',
      'phonics-find-m',
      'phonics-find-s',
      'phonics-find-c',
      'phonics-find-t',
      'blend-cat',
      'blend-hat',
      'blend-bat',
      'build-cat',
      'build-dog',
      'build-sun',
    ]);
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

function findAllByClassName(element: MockElement, className: string): MockElement[] {
  const matches = element.className.split(/\s+/).includes(className) ? [element] : [];
  for (const child of element.children) {
    matches.push(...findAllByClassName(child, className));
  }
  return matches;
}

function findByChoiceId(element: MockElement, choiceId: string): MockElement | undefined {
  if (element.dataset.choiceId === choiceId) return element;
  for (const child of element.children) {
    const match = findByChoiceId(child, choiceId);
    if (match) return match;
  }
  return undefined;
}

function findByText(element: MockElement, text: string): MockElement | undefined {
  if (element.tagName === 'BUTTON' && element.textContent === text) return element;
  for (const child of element.children) {
    const match = findByText(child, text);
    if (match) return match;
  }
  return undefined;
}

function findByClass(element: MockElement, className: string): MockElement | undefined {
  if (element.className.split(/\s+/).includes(className)) return element;
  for (const child of element.children) {
    const match = findByClass(child, className);
    if (match) return match;
  }
  return undefined;
}
