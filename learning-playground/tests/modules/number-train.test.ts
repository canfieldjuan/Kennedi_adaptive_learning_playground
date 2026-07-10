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
import type {
  CountTrainRound,
  NumberTrainRound,
} from '../../src/modules/number-train/number-train.types';
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

      // The ramp anchor rises monotonically. A missing-station blank may sit
      // below its anchor, so the ramp is checked on the anchor, not the blank.
      let previous = 0;
      for (const round of plan.rounds) {
        const answer = answerOf(round);
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThanOrEqual(SESSION_CONFIG.max_quantity);
        const anchor =
          round.kind === 'missing_station'
            ? Math.max(...round.sequence)
            : answer;
        expect(anchor).toBeGreaterThanOrEqual(previous);
        if (round.kind === 'count_train') {
          expect(new Set(round.choices).size).toBe(round.choices.length);
          expect(round.choices).toContain(round.quantity);
        }
        if (round.kind !== 'missing_station') previous = anchor;
      }

      // Easy confidence start, slight stretch finish.
      expect(answerOf(plan.rounds[0])).toBeLessThanOrEqual(5);
      expect(answerOf(plan.rounds[plan.rounds.length - 1])).toBeGreaterThanOrEqual(
        SESSION_CONFIG.max_quantity - 4
      );
    }
  });

  test('tiny authored maxima still produce a valid trip (no impossible sequence)', () => {
    // A sequence path needs three consecutive numbers; with max_quantity 1-2
    // the composition substitutes a count round instead of failing the plan.
    for (const max of [1, 2]) {
      const plan = buildSessionPlan({ seed: 1, round_count: 6, max_quantity: max });
      expect(validatePlan(plan)).toEqual([]);
      expect(plan.rounds.some((round) => round.kind === 'missing_station')).toBe(false);
    }
    // At max 3 the sequence fits (a three-number path) and appears again.
    const plan3 = buildSessionPlan({ seed: 1, round_count: 6, max_quantity: 3 });
    expect(validatePlan(plan3)).toEqual([]);
    const seq = plan3.rounds.find((round) => round.kind === 'missing_station');
    expect(seq).toBeDefined();
    if (seq?.kind === 'missing_station') {
      expect(seq.sequence.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('the six-round trip builds at round 4 and fills a sequence at round 5', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const plan = buildSessionPlan({ ...SESSION_CONFIG, seed });
      expect(plan.rounds.map((round) => round.kind)).toEqual([
        'count_train',
        'count_train',
        'count_train',
        'load_train',
        'missing_station',
        'count_train',
      ]);
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

    // Load rounds obey the same bound.
    expect(
      validatePlan({
        ...base,
        rounds: [{ kind: 'load_train', target: 21, prompt: 'x' }],
      }).join(' ')
    ).toContain('target 21 above max');

    // Sequences must be consecutive ascending with the blank in range.
    expect(
      validatePlan({
        ...base,
        rounds: [{
          kind: 'missing_station',
          sequence: [4, 5, 7, 8],
          missing_index: 1,
          choices: [4, 5, 6],
          prompt: 'x',
        }],
      }).join(' ')
    ).toContain('not consecutive');

    expect(
      validatePlan({
        ...base,
        rounds: [{
          kind: 'missing_station',
          sequence: [4, 5, 6, 7],
          missing_index: 4,
          choices: [4, 5, 6],
          prompt: 'x',
        }],
      }).join(' ')
    ).toContain('missing_index 4 out of range');

    expect(
      validatePlan({ ...base, max_quantity: NUMBER_TRAIN_ABSOLUTE_MAX + 1 }).join(' ')
    ).toContain('outside');
  });
});

describe('number train runtime', () => {
  let timeoutId = 0;
  let clearTimeoutSpy = vi.fn();

  beforeEach(() => {
    timeoutId = 0;
    clearTimeoutSpy = vi.fn();
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#activity/number-train' },
      setTimeout: vi.fn(() => {
        timeoutId += 1;
        return timeoutId;
      }),
      clearTimeout: clearTimeoutSpy,
    });
  });

  afterEach(() => {
    destroyNumberTrainActivity();
    vi.unstubAllGlobals();
  });

  const plan = buildSessionPlan(SESSION_CONFIG); // same seed/config as the envelope
  const round1 = asCount(plan.rounds[0]);

  test('renders the round-1 quantity as structured cars of ten seats', () => {
    const { root } = setup();
    const quantity = round1.quantity;
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
    const quantity = round1.quantity;

    findChoice(root, String(quantity))?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct']);
    expect(events[0]?.skill_ids).toEqual(['counting', 'numeral_recognition']);
    expect(events[0]?.skill_outcomes).toEqual([
      { skill_id: 'counting', outcome: 'correct' },
      { skill_id: 'numeral_recognition', outcome: 'correct' },
    ]);
    expect(events[0]?.skill_ids).not.toContain('subitizing');
    expect(events[0]?.metadata).toMatchObject({
      game: 'number-train',
      round_type: 'count_train',
      round_index: 1,
      round_total: 6,
      target_quantity: quantity,
    });

    // Round locked; the child advances by tapping Next station.
    findChoice(root, String(round1.choices.find((c) => c !== quantity)))?.click();
    expect(events).toHaveLength(1);
    expect(findByText(root, 'Next station')).toBeDefined();
  });

  test('two wrong taps trigger a structural counting hint', () => {
    const { root, events } = setup();
    const quantity = round1.quantity;
    const wrong = round1.choices.filter((c) => c !== quantity);

    findChoice(root, String(wrong[0]))?.click();
    findChoice(root, String(wrong[1]))?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(findByClass(root, 'number-train')?.className).toContain('is-counting');
    expect(findChoice(root, String(quantity))?.classList.contains('is-hinted')).toBe(true);

    // The count-along hint teaches counting, not numeral recognition: the hint
    // event attaches to counting only, and post-hint events name the hinted
    // skill so downstream per-skill hint attribution stays precise.
    const hintEvent = events[2];
    expect(hintEvent?.skill_ids).toEqual(['counting']);
    expect(hintEvent?.skill_outcomes).toEqual([
      { skill_id: 'counting', outcome: 'hint_used' },
    ]);
    expect(hintEvent?.metadata).toMatchObject({ hinted_skill_ids: 'counting' });

    findChoice(root, String(quantity))?.click();
    const postHintCorrect = events[events.length - 1];
    expect(postHintCorrect?.outcome).toBe('correct');
    expect(postHintCorrect?.skill_ids).toEqual(['counting', 'numeral_recognition']);
    expect(postHintCorrect?.metadata).toMatchObject({ hinted_skill_ids: 'counting' });
  });

  test('a full mixed trip fills every station and emits completed exactly once', () => {
    const { root, events } = setup();

    for (const round of plan.rounds) {
      completeRound(root, round);
      findByText(root, 'Next station')?.click();
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
      completeRound(root, round);
      findByText(root, 'Next station')?.click();
    }
    findByText(root, 'Play Again')?.click();

    const replayPlan = buildSessionPlan({
      ...SESSION_CONFIG,
      seed: SESSION_CONFIG.seed + 1,
    });
    expect(validatePlan(replayPlan)).toEqual([]);
    const replayRound1 = asCount(replayPlan.rounds[0]);

    // The new trip renders round 1 of the replay plan and is playable.
    const occupied = findAllByClass(root, 'number-train__seat').filter((seat) =>
      seat.className.includes('is-occupied')
    );
    expect(occupied).toHaveLength(replayRound1.quantity);

    const before = events.length;
    findChoice(root, String(replayRound1.quantity))?.click();
    expect(events).toHaveLength(before + 1);
    expect(events[events.length - 1]?.outcome).toBe('correct');
  });

  test('a load round builds only on Check, with remove-before-submit', () => {
    const { root, events } = setup();

    // Play through rounds 1-3 (counts) to reach the first load round.
    for (const round of plan.rounds.slice(0, 3)) {
      completeRound(root, round);
      findByText(root, 'Next station')?.click();
    }
    const loadRound = plan.rounds[3];
    if (loadRound.kind !== 'load_train') throw new Error('expected load round');
    const eventsBefore = events.length;

    // Empty train with capacity for the target; large controls present.
    const seats = findAllByClass(root, 'number-train__seat--tap');
    expect(seats.length).toBe(Math.max(1, Math.ceil(loadRound.target / 10)) * 10);
    expect(seats.filter((s) => s.className.includes('is-occupied'))).toHaveLength(0);
    expect(findByText(root, 'Add passenger')).toBeDefined();
    expect(findByText(root, 'Remove')).toBeDefined();

    // Seat taps toggle and emit NO events.
    seats[0]?.click();
    expect(seats[0]?.classList.contains('is-occupied')).toBe(true);
    seats[0]?.click();
    expect(seats[0]?.classList.contains('is-occupied')).toBe(false);
    findByText(root, 'Add passenger')?.click();
    findByText(root, 'Add passenger')?.click();
    findByText(root, 'Remove')?.click();
    expect(events).toHaveLength(eventsBefore);
    expect(seats.filter((s) => s.className.includes('is-occupied'))).toHaveLength(1);

    // Wrong Check → incorrect with the constructed count as the answer,
    // attributed to counting + quantity construction (never subitizing).
    findByText(root, 'Check')?.click();
    expect(events).toHaveLength(eventsBefore + 1);
    expect(events[events.length - 1]).toMatchObject({
      outcome: 'incorrect',
      selected_answer: '1',
      correct_answer: String(loadRound.target),
      skill_ids: ['counting', 'quantity_construction'],
    });
    expect(events[events.length - 1]?.skill_outcomes).toEqual([
      { skill_id: 'counting', outcome: 'incorrect' },
      { skill_id: 'quantity_construction', outcome: 'incorrect' },
    ]);
    expect(events[events.length - 1]?.metadata).toMatchObject({
      round_type: 'load_train',
      target_quantity: loadRound.target,
    });

    // Second wrong Check → bounded structural hint: the next empty seat lights
    // up and nothing is auto-filled.
    findByText(root, 'Check')?.click();
    expect(events.map((e) => e.outcome).slice(-2)).toEqual(['incorrect', 'hint_used']);
    expect(seats.some((s) => s.className.includes('is-next-hint'))).toBe(true);
    expect(seats.filter((s) => s.className.includes('is-occupied'))).toHaveLength(1);

    // Build the target and Check → correct, attempt_number counts Checks.
    for (let i = 1; i < loadRound.target; i += 1) {
      findByText(root, 'Add passenger')?.click();
    }
    findByText(root, 'Check')?.click();
    expect(events[events.length - 1]).toMatchObject({
      outcome: 'correct',
      selected_answer: String(loadRound.target),
      attempt_number: 3,
    });
    expect(findByText(root, 'Next station')).toBeDefined();
  });

  test('a missing-station round fills the blank and hints by walking the track', () => {
    const { root, events } = setup();

    // Play through rounds 1-4 to reach the sequence round.
    for (const round of plan.rounds.slice(0, 4)) {
      completeRound(root, round);
      findByText(root, 'Next station')?.click();
    }
    const seqRound = plan.rounds[4];
    if (seqRound.kind !== 'missing_station') throw new Error('expected sequence round');
    const answer = seqRound.sequence[seqRound.missing_index];
    const eventsBefore = events.length;

    // The path renders one sign per number with exactly one blank.
    const stops = findAllByClass(root, 'number-train__path-stop');
    expect(stops).toHaveLength(seqRound.sequence.length);
    expect(stops.filter((s) => s.className.includes('is-missing'))).toHaveLength(1);
    expect(stops[seqRound.missing_index]?.textContent).toBe('?');

    // Two wrong numerals → walk-along hint + highlighted correct numeral.
    const wrong = seqRound.choices.filter((c) => c !== answer);
    findChoice(root, String(wrong[0]))?.click();
    findChoice(root, String(wrong[1]))?.click();
    expect(events.slice(eventsBefore).map((e) => e.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(findByClass(root, 'number-train__path')?.className).toContain('is-walking');
    expect(findChoice(root, String(answer))?.classList.contains('is-hinted')).toBe(true);

    // The correct numeral fills the blank and advances the trip; sequence
    // rounds attribute number order + numeral recognition.
    findChoice(root, String(answer))?.click();
    expect(events[events.length - 1]).toMatchObject({
      outcome: 'correct',
      selected_answer: String(answer),
      skill_ids: ['number_sequence', 'numeral_recognition'],
    });
    expect(events[events.length - 1]?.metadata).toMatchObject({
      round_type: 'missing_station',
      target_quantity: answer,
    });
    expect(stops[seqRound.missing_index]?.textContent).toBe(String(answer));
    expect(stops[seqRound.missing_index]?.classList.contains('is-filled')).toBe(true);
    expect(findByText(root, 'Next station')).toBeDefined();
  });

  test('the journey strip announces the current station as the trip advances', () => {
    const { root } = setup();
    const journey = findByClass(root, 'number-train__journey');
    expect(journey?.attributes['aria-label']).toBe('Trip: station 1 of 6');

    completeRound(root, plan.rounds[0]);
    findByText(root, 'Next station')?.click();
    expect(journey?.attributes['aria-label']).toBe('Trip: station 2 of 6');
  });

  test('destroy clears pending timeouts (Home mid-round leaves no timers)', () => {
    const { root } = setup();
    const wrong = round1.choices.find((c) => c !== round1.quantity);

    // A wrong tap schedules the bounce-reset timeout.
    findChoice(root, String(wrong))?.click();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    destroyNumberTrainActivity();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(1);
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
    expect(activity?.skill_ids).toEqual([
      'counting',
      'numeral_recognition',
      'quantity_construction',
      'number_sequence',
    ]);
    expect(activity?.safety.requires_parent_approval).toBe(true);
    expect(activity?.safety.external_links_allowed).toBe(false);
    expect(JSON.stringify(activity)).not.toMatch(/https?:\/\//);
  });

  test('the default Math activity feeds the entry level of every skill it claims', () => {
    // Promotion is band-scoped (progress.ts): a fresh profile starts each
    // skill at level 0, so the activity behind the Math home tile must emit a
    // difficulty inside level 0's band for every skill it records evidence
    // for, or a new child can never accrue promotion-eligible attempts.
    const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === 'number-train');
    const graph = loadCurriculumGraph();
    for (const skillId of activity!.skill_ids) {
      const level = graph.getSkillLevelForDifficulty(skillId, activity!.difficulty.level);
      expect(level?.level).toBe(0);
    }
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
  readonly style: Record<string, string> = {};
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

function answerOf(round: NumberTrainRound): number {
  if (round.kind === 'count_train') return round.quantity;
  if (round.kind === 'load_train') return round.target;
  return round.sequence[round.missing_index];
}

function asCount(round: NumberTrainRound): CountTrainRound {
  if (round.kind !== 'count_train') throw new Error('expected a count round');
  return round;
}

/** Solve one round the way the child would: tap the numeral, or build + Check. */
function completeRound(root: MockElement, round: NumberTrainRound): void {
  if (round.kind === 'load_train') {
    for (let i = 0; i < round.target; i += 1) {
      findByText(root, 'Add passenger')?.click();
    }
    findByText(root, 'Check')?.click();
    return;
  }
  findChoice(root, String(answerOf(round)))?.click();
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
