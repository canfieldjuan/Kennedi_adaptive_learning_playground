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
  buildSessionPlan,
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

const SESSION_CONFIG = { seed: 20260710, round_count: 6, max_quantity: 20 };

describe('number train round plan', () => {
  test('the same seed and config reproduce the identical plan', () => {
    const first = buildSessionPlan(SESSION_CONFIG);
    const second = buildSessionPlan(SESSION_CONFIG);

    expect(first).toEqual(second);
    expect(validatePlan(first)).toEqual([]);
    expect(first.rounds).toHaveLength(6);
  });

  test('a different seed produces a different trip', () => {
    const first = buildSessionPlan(SESSION_CONFIG);
    const other = buildSessionPlan({ ...SESSION_CONFIG, seed: SESSION_CONFIG.seed + 1 });

    expect(first).not.toEqual(other);
    expect(validatePlan(other)).toEqual([]);
  });

  test('plans across many seeds stay valid, bounded, and gradually harder', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const plan = buildSessionPlan({ ...SESSION_CONFIG, seed });
      expect(validatePlan(plan)).toEqual([]);

      let previous = 0;
      for (const round of plan.rounds) {
        expect(round.quantity).toBeGreaterThanOrEqual(1);
        expect(round.quantity).toBeLessThanOrEqual(SESSION_CONFIG.max_quantity);
        expect(round.quantity).toBeGreaterThanOrEqual(previous);
        expect(new Set(round.choices).size).toBe(round.choices.length);
        expect(round.choices).toContain(round.quantity);
        previous = round.quantity;
      }

      // Easy confidence start, slight stretch finish.
      expect(plan.rounds[0].quantity).toBeLessThanOrEqual(5);
      expect(plan.rounds[plan.rounds.length - 1].quantity).toBeGreaterThanOrEqual(
        SESSION_CONFIG.max_quantity - 4
      );
    }
  });

  test('validation rejects out-of-bounds, duplicate, and unanswerable rounds', () => {
    const base = buildSessionPlan(SESSION_CONFIG);

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

  const plan = buildSessionPlan(SESSION_CONFIG); // same seed/config as the envelope

  test('renders the round-1 quantity as structured cars of ten seats', () => {
    const { root } = setup();
    const quantity = plan.rounds[0].quantity;
    const expectedCars = Math.max(1, Math.ceil(quantity / 10));

    expect(findAllByClass(root, 'number-train__car')).toHaveLength(expectedCars);
    expect(findAllByClass(root, 'number-train__seat')).toHaveLength(expectedCars * 10);
    expect(
      findAllByClass(root, 'number-train__seat').filter((seat) =>
        seat.className.includes('is-occupied')
      )
    ).toHaveLength(quantity);
    expect(findByClass(root, 'number-train__engine')).toBeDefined();
    expect(findAllByClass(root, 'number-train__station')).toHaveLength(6);
  });

  test('a correct numeral tap emits counting evidence and offers Next station', () => {
    const { root, events } = setup();
    const quantity = plan.rounds[0].quantity;

    findChoice(root, String(quantity))?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct']);
    expect(events[0]?.skill_ids).toEqual(['counting']);
    expect(events[0]?.skill_ids).not.toContain('subitizing');
    expect(events[0]?.metadata).toMatchObject({
      game: 'number-train',
      round_type: 'count_train',
      round_index: 1,
      round_total: 6,
      target_quantity: quantity,
    });

    // Round locked; the child advances by tapping Next station.
    findChoice(root, String(plan.rounds[0].choices.find((c) => c !== quantity)))?.click();
    expect(events).toHaveLength(1);
    expect(findByText(root, 'Next station')).toBeDefined();
  });

  test('two wrong taps trigger a structural counting hint', () => {
    const { root, events } = setup();
    const quantity = plan.rounds[0].quantity;
    const wrong = plan.rounds[0].choices.filter((c) => c !== quantity);

    findChoice(root, String(wrong[0]))?.click();
    findChoice(root, String(wrong[1]))?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(findByClass(root, 'number-train')?.className).toContain('is-counting');
    expect(findChoice(root, String(quantity))?.classList.contains('is-hinted')).toBe(true);
  });

  test('a full trip fills every station and emits completed exactly once', () => {
    const { root, events } = setup();

    for (const round of plan.rounds) {
      findChoice(root, String(round.quantity))?.click();
      const next = findByText(root, 'Next station');
      next?.click();
    }

    const outcomes = events.map((event) => event.outcome);
    expect(outcomes.filter((o) => o === 'correct')).toHaveLength(6);
    expect(outcomes.filter((o) => o === 'completed')).toHaveLength(1);
    expect(events[events.length - 1]?.outcome).toBe('completed');
    expect(events[events.length - 1]?.metadata).toMatchObject({ round_index: 6 });

    expect(
      findAllByClass(root, 'number-train__station').filter((s) =>
        s.className.includes('is-done')
      )
    ).toHaveLength(6);
    expect(findByText(root, 'Play Again')).toBeDefined();
    expect(findByText(root, 'Home')).toBeDefined();
  });

  test('Play Again starts a new deterministic trip from the next seed', () => {
    const { root, events } = setup();

    for (const round of plan.rounds) {
      findChoice(root, String(round.quantity))?.click();
      findByText(root, 'Next station')?.click();
    }
    findByText(root, 'Play Again')?.click();

    const replayPlan = buildSessionPlan({
      ...SESSION_CONFIG,
      seed: SESSION_CONFIG.seed + 1,
    });
    expect(validatePlan(replayPlan)).toEqual([]);

    // The new trip renders round 1 of the replay plan and is playable.
    const occupied = findAllByClass(root, 'number-train__seat').filter((seat) =>
      seat.className.includes('is-occupied')
    );
    expect(occupied).toHaveLength(replayPlan.rounds[0].quantity);

    const before = events.length;
    findChoice(root, String(replayPlan.rounds[0].quantity))?.click();
    expect(events).toHaveLength(before + 1);
    expect(events[events.length - 1]?.outcome).toBe('correct');
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
  private _innerHTML = '';
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

  get innerHTML(): string {
    return this._innerHTML;
  }

  // Real DOM semantics: assigning innerHTML replaces the children. The session
  // runtime reuses grid/stage nodes across rounds via `innerHTML = ''`, so the
  // mock must actually clear or stale buttons leak between rounds.
  set innerHTML(value: string) {
    this._innerHTML = value;
    if (value === '') this.children.length = 0;
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

function findByText(element: MockElement, text: string): MockElement | undefined {
  if (element.tagName === 'BUTTON' && element.textContent === text) return element;
  for (const child of element.children) {
    const match = findByText(child, text);
    if (match) return match;
  }
  return undefined;
}

function findChoice(element: MockElement, choiceId: string): MockElement | undefined {
  if (element.dataset.choiceId === choiceId) return element;
  for (const child of element.children) {
    const match = findChoice(child, choiceId);
    if (match) return match;
  }
  return undefined;
}
