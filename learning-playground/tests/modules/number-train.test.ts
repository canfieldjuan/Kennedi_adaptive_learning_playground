/**
 * Behavioral tests for Number Train (arc slice 1: foundation).
 *
 * Covers: the Math home route, the deterministic round plan and its validation
 * contract, the structured train visual (cars of ten seats), Count-the-Train
 * evaluation and hints, counting-only evidence (no subitizing), and the
 * protected legacy Math surface.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderNumberTrainActivity,
  destroyNumberTrainActivity,
} from '../../src/modules/number-train/NumberTrainActivity';
import {
  buildFoundationPlan,
  validatePlan,
  NUMBER_TRAIN_ABSOLUTE_MAX,
} from '../../src/modules/number-train/round-plan';
import {
  destroyHomeScreen,
  renderHomeScreen,
} from '../../src/modules/home/HomeScreen';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../src/types/runtime';

describe('number train routing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', { location: { hash: '#home' } });
  });

  afterEach(() => {
    destroyHomeScreen();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('the Math home tile opens Number Train', async () => {
    const root = document.createElement('div');
    renderHomeScreen(root, createMockSpeech());

    findById(root, 'home-math')?.click();
    await vi.runAllTimersAsync();

    expect(window.location.hash).toBe('#activity/number-train');
  });

  test('Words, Cafe, and Art home routes are unchanged', async () => {
    const routes: Record<string, string> = {
      'home-words': '#activity/phonics-find-b',
      'home-cafe': '#activity/kennedis-orders-banana-001',
      'home-art': '#activity/art-color-circle',
    };

    for (const [id, expected] of Object.entries(routes)) {
      const root = document.createElement('div');
      window.location.hash = '#home';
      renderHomeScreen(root, createMockSpeech());
      findById(root, id)?.click();
      await vi.runAllTimersAsync();
      expect(window.location.hash).toBe(expected);
      destroyHomeScreen();
    }
  });
});

describe('number train round plan', () => {
  test('the foundation plan is deterministic and valid', () => {
    const first = buildFoundationPlan();
    const second = buildFoundationPlan();

    expect(first).toEqual(second);
    expect(validatePlan(first)).toEqual([]);
    expect(first.rounds[0]).toMatchObject({ kind: 'count_train', quantity: 7 });
  });

  test('validation rejects out-of-bounds, duplicate, and unanswerable rounds', () => {
    const base = buildFoundationPlan();

    expect(
      validatePlan({
        ...base,
        rounds: [{ kind: 'count_train', quantity: 21, choices: [20, 21, 22], prompt: 'x' }],
      }).join(' ')
    ).toContain('above max');

    expect(
      validatePlan({
        ...base,
        rounds: [{ kind: 'count_train', quantity: 7, choices: [6, 7, 7], prompt: 'x' }],
      }).join(' ')
    ).toContain('duplicate choices');

    expect(
      validatePlan({
        ...base,
        rounds: [{ kind: 'count_train', quantity: 7, choices: [6, 8, 9], prompt: 'x' }],
      }).join(' ')
    ).toContain('missing from choices');

    expect(
      validatePlan({
        ...base,
        rounds: [{ kind: 'count_train', quantity: -1, choices: [-1, 2, 3], prompt: 'x' }],
      }).join(' ')
    ).toContain('negative');

    // A distractor above the configured maximum is invalid even when the
    // correct answer is in range (the guard's second side).
    expect(
      validatePlan({
        ...base,
        rounds: [{ kind: 'count_train', quantity: 7, choices: [6, 7, 99], prompt: 'x' }],
      }).join(' ')
    ).toContain('choice 99 above max');

    expect(
      validatePlan({ ...base, max_quantity: NUMBER_TRAIN_ABSOLUTE_MAX + 1 }).join(' ')
    ).toContain('outside');
  });
});

describe('number train runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#activity/number-train' },
      setTimeout: vi.fn(() => 0),
    });
  });

  afterEach(() => {
    destroyNumberTrainActivity();
    vi.unstubAllGlobals();
  });

  test('renders a structured train: one car, ten seats, seven occupied', () => {
    const { root } = setup();

    const cars = findAllByClass(root, 'number-train__car');
    expect(cars).toHaveLength(1);

    const seats = findAllByClass(root, 'number-train__seat');
    expect(seats).toHaveLength(10);
    expect(seats.filter((seat) => seat.className.includes('is-occupied'))).toHaveLength(7);
    expect(findByClass(root, 'number-train__engine')).toBeDefined();
  });

  test('a correct numeral tap emits counting evidence and locks the round', () => {
    const { root, events } = setup();

    findChoice(root, '7')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]?.skill_ids).toEqual(['counting']);
    expect(events[0]?.skill_ids).not.toContain('subitizing');
    expect(events[0]?.metadata).toMatchObject({
      game: 'number-train',
      round_type: 'count_train',
      target_quantity: 7,
    });

    // Locked: a further tap emits nothing.
    findChoice(root, '6')?.click();
    expect(events).toHaveLength(2);
  });

  test('two wrong taps trigger a structural counting hint', () => {
    const { root, events } = setup();

    findChoice(root, '6')?.click();
    findChoice(root, '8')?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(findByClass(root, 'number-train')?.className).toContain('is-counting');
    expect(findChoice(root, '7')?.classList.contains('is-hinted')).toBe(true);
  });

  test('destroy removes the screen so re-render starts clean', () => {
    const { root } = setup();
    expect(findByClass(root, 'number-train-screen')).toBeDefined();

    destroyNumberTrainActivity();
    const again = setup();
    expect(findByClass(again.root, 'number-train-screen')).toBeDefined();
  });
});

describe('number train protected surfaces', () => {
  test('the legacy Math activities keep their generic tap-to-match envelope', () => {
    for (const id of ['math-count-stars-three', 'math-dot-card-three', 'math-count-hearts-three']) {
      const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === id);
      expect(activity).toBeDefined();
      expect(activity?.interaction_model).toBe('tap_to_match');
      expect((activity?.content as { game?: string }).game).toBeUndefined();
    }
  });

  test('the Number Train envelope is game-keyed, math-domain, and safe', () => {
    const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === 'number-train');
    expect(activity).toBeDefined();
    expect(activity?.interaction_model).toBe('tap_then_place');
    expect((activity?.content as { game?: string }).game).toBe('number-train');
    expect(activity?.domain).toBe('math');
    expect(activity?.skill_ids).toEqual(['counting']);
    expect(activity?.safety.requires_parent_approval).toBe(true);
    expect(activity?.safety.external_links_allowed).toBe(false);
    expect(JSON.stringify(activity)).not.toMatch(/https?:\/\//);
  });

  test('the default Math activity feeds the counting entry level', () => {
    // Promotion is band-scoped (progress.ts): a fresh profile starts at
    // counting level 0, so the activity behind the Math home tile must emit a
    // difficulty inside level 0's band or a new child can never accrue
    // promotion-eligible attempts.
    const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === 'number-train');
    const graph = loadCurriculumGraph();
    const level = graph.getSkillLevelForDifficulty('counting', activity!.difficulty.level);
    expect(level?.level).toBe(0);
  });
});

function setup(): { root: MockElement; events: ActivityAttemptEvent[] } {
  const root = document.createElement('div') as unknown as MockElement;
  const events: ActivityAttemptEvent[] = [];
  const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === 'number-train');
  if (!activity) throw new Error('Missing number-train activity');

  renderNumberTrainActivity(root as unknown as HTMLElement, {
    activity: activity as LearningActivity,
    childId: 'local-child',
    sessionId: 'session-1',
    speech: createMockSpeech(),
    audio: createMockAudio(),
    onEvent: (event) => events.push(event),
  });
  return { root, events };
}

class MockClassList {
  private readonly values = new Set<string>();
  private readonly owner: MockElement;

  constructor(owner: MockElement) {
    this.owner = owner;
  }

  add(name: string): void {
    this.values.add(name);
    this.sync();
  }

  remove(name: string): void {
    this.values.delete(name);
    this.sync();
  }

  contains(name: string): boolean {
    return this.values.has(name);
  }

  private sync(): void {
    const base = this.owner.baseClassName;
    this.owner.className = [base, ...this.values].filter(Boolean).join(' ');
  }
}

class MockElement {
  readonly tagName: string;
  readonly children: MockElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  readonly classList = new MockClassList(this);
  baseClassName = '';
  id = '';
  textContent = '';
  innerHTML = '';
  disabled = false;
  hidden = false;
  type = '';
  private _className = '';
  private readonly listeners: Record<string, Array<() => void>> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get className(): string {
    return this._className;
  }

  set className(value: string) {
    this._className = value;
    if (!this.baseClassName) this.baseClassName = value;
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

function findById(element: unknown, id: string): MockElement | undefined {
  const mock = element as MockElement;
  if (mock.id === id) return mock;
  for (const child of mock.children) {
    const match = findById(child, id);
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

function findAllByClass(element: MockElement, className: string): MockElement[] {
  const matches = element.className.split(/\s+/).includes(className) ? [element] : [];
  for (const child of element.children) {
    matches.push(...findAllByClass(child, className));
  }
  return matches;
}

function findChoice(element: MockElement, choiceId: string): MockElement | undefined {
  if (element.dataset.choiceId === choiceId) return element;
  for (const child of element.children) {
    const match = findChoice(child, choiceId);
    if (match) return match;
  }
  return undefined;
}
