/**
 * Bear Cafe environment tests (visual arc stage 2, issue #55).
 *
 * Proves the decorative scene is inert and game-owned: rendered exactly once
 * behind every stage, aria-hidden, reframed per stage via data-stage — and
 * that the delivery stage is fully illustrated (no emoji) while the Deliver
 * control keeps its accessible name and its single completion emission.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderKennedisOrdersActivity,
  destroyKennedisOrdersActivity,
} from '../../src/modules/kennedis-orders/KennedisOrdersActivity';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type { CafeOrderCompletion } from '../../src/types/cafe-order-completion';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../src/types/runtime';

const PLATING_DURATION_MS = 800;
const HANDOFF_DURATION_MS = 900;

describe('bear cafe environment', () => {
  let timers: Array<{ cb: () => void; ms: number }> = [];

  beforeEach(() => {
    timers = [];
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#activity/kennedis-orders-banana-001' },
      setTimeout: vi.fn((cb: () => void, ms: number) => {
        timers.push({ cb, ms });
        return timers.length;
      }),
      clearTimeout: vi.fn(),
    });
  });

  afterEach(() => {
    destroyKennedisOrdersActivity();
    vi.unstubAllGlobals();
  });

  test('the scene renders once behind every stage, inert and stage-aware', () => {
    const { root } = setup();

    let environments = findAllByClass(root, 'bear-cafe-environment');
    expect(environments).toHaveLength(1);
    expect(environments[0].attributes['aria-hidden']).toBe('true');
    expect(environments[0].dataset.stage).toBe('phone');
    expect(environments[0].innerHTML).toContain('cafe-env__svg');
    expect(environments[0].innerHTML).toContain('cafe-env__phone-station');

    // Answering the call advances to the make stage: same single scene,
    // reframed by data-stage.
    findByAria(root, 'Baby Polar Bear is calling')?.click();
    environments = findAllByClass(root, 'bear-cafe-environment');
    expect(environments).toHaveLength(1);
    expect(environments[0].dataset.stage).toBe('make');
  });

  test('the delivery stage is illustrated end to end and delivers exactly once', () => {
    const { root, events, history } = setup();

    // Phone → make → build the one-banana order → Check → plating timer →
    // packaging.
    findByAria(root, 'Baby Polar Bear is calling')?.click();
    findByAria(root, 'Choose banana, none on tray')?.click();
    findByAria(root, 'Check order')?.click();
    const plating = timers.find((timer) => timer.ms === PLATING_DURATION_MS);
    expect(plating).toBeDefined();
    plating?.cb();

    expect(findByClass(root, 'bear-cafe-environment')?.dataset.stage).toBe('packaging');
    const packagingMarkup = collectMarkup(findByClass(root, 'bear-cafe-packaging')!);
    expect(packagingMarkup).toContain('data-bag-color="pink"');
    expect(packagingMarkup).toContain('data-seal="heart"');
    expect(events.filter((event) => event.outcome === 'completed')).toHaveLength(0);
    expect(history).toHaveLength(0);
    findByAria(root, 'Package order')?.click();

    const environment = findByClass(root, 'bear-cafe-environment');
    expect(environment?.dataset.stage).toBe('delivery');

    // No emoji anywhere in the delivery stage — bell, exact order package,
    // seal, and Deliver control are all local illustrated SVG.
    const delivery = findByClass(root, 'bear-cafe-delivery');
    const deliveryMarkup = collectMarkup(delivery!);
    expect(deliveryMarkup).not.toContain('🔔');
    expect(deliveryMarkup).not.toContain('🧺');
    expect(deliveryMarkup).not.toContain('☎');
    expect(deliveryMarkup).toContain('bear-cafe-bell-svg');
    expect(deliveryMarkup).toContain('bear-cafe-package');
    expect(deliveryMarkup).toContain('/assets/images/bear-cafe-order-bag-frame.svg');
    expect(deliveryMarkup).toContain('/assets/images/bear-cafe-seal-heart.svg');
    expect(deliveryMarkup).toContain('bear-cafe-delivery__window');
    expect(deliveryMarkup).toContain('bear-cafe-delivery__order');

    expect(deliveryMarkup).toContain('bear-cafe-delivery__scene-art');
    expect(deliveryMarkup).toContain('/assets/images/bear-cafe-pickup-window-proof.svg');
    expect(deliveryMarkup).toContain('aria-hidden="true"');
    expect(deliveryMarkup).toContain('draggable="false"');

    // The Deliver control keeps its accessible name and its single
    // synchronous completion emission.
    const deliver = findByAria(root, 'Deliver order');
    expect(deliver).toBeDefined();
    expect(deliver?.innerHTML).toContain('bear-cafe-package');
    deliver?.click();
    deliver?.click();

    const completions = events.filter((event) => event.outcome === 'completed');
    expect(completions).toHaveLength(1);
    expect(completions[0]?.metadata?.event_name).toBe('order_delivered');
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      caller_id: 'baby-polar-bear',
      food_items: [{ food_id: 'banana', count: 1 }],
      bag_color_id: 'pink',
      seal_id: 'heart',
    });
    expect(findByClass(root, 'bear-cafe-environment')?.dataset.stage).toBe('handoff');
  });

  test('the completion celebration bursts illustrated confetti, not emoji', () => {
    const { root } = setup();

    findByAria(root, 'Baby Polar Bear is calling')?.click();
    findByAria(root, 'Choose banana, none on tray')?.click();
    findByAria(root, 'Check order')?.click();
    timers.find((timer) => timer.ms === PLATING_DURATION_MS)?.cb();
    findByAria(root, 'Package order')?.click();
    findByAria(root, 'Deliver order')?.click();
    timers.find((timer) => timer.ms === HANDOFF_DURATION_MS)?.cb();

    const celebrate = findByClass(root, 'bear-cafe-celebrate');
    expect(celebrate).toBeDefined();
    expect(celebrate?.attributes['aria-hidden']).toBe('true');

    // Same deterministic burst — 12 pieces — but every piece is inline SVG
    // in the arc standard; no emoji glyph remains in the polished scene.
    const pieces = findAllByClass(root, 'bear-cafe-celebrate__piece');
    expect(pieces).toHaveLength(12);
    for (const piece of pieces) {
      expect(piece.innerHTML).toContain('bear-cafe-celebrate-svg');
    }
    expect(collectMarkup(celebrate!)).not.toMatch(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u
    );
  });

  test('Free Make emits one unscored completion and revisits without more events', () => {
    const { root, events, history } = setup({
      activityId: 'kennedis-orders-free-make-001',
    });

    findByAria(root, 'Baby Polar Bear is calling')?.click();
    findByAria(root, 'Choose cupcake, none on tray')?.click();
    expect(events).toEqual([]);
    findByAria(root, 'Check order')?.click();
    expect(events).toEqual([]);
    timers.find((timer) => timer.ms === PLATING_DURATION_MS)?.cb();
    findByAria(root, 'Choose Blue bag')?.click();
    findByAria(root, 'Choose Star seal')?.click();
    findByAria(root, 'Package order')?.click();
    expect(events).toEqual([]);
    findByAria(root, 'Deliver order')?.click();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      outcome: 'completed',
      skill_outcomes: [],
      metadata: { event_name: 'order_delivered' },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      food_items: [{ food_id: 'cupcake', count: 1 }],
      bag_color_id: 'blue',
      seal_id: 'star',
    });

    timers.find((timer) => timer.ms === HANDOFF_DURATION_MS)?.cb();
    const completeMarkup = collectMarkup(findByClass(root, 'bear-cafe-complete')!);
    expect(completeMarkup).toContain('data-bag-color="blue"');
    expect(completeMarkup).toContain('data-seal="star"');
    findByAria(root, 'Open order wall')?.click();
    expect(events).toHaveLength(1);
    expect(findAllByClass(root, 'bear-cafe-order-wall__card')).toHaveLength(1);
    findByClass(root, 'bear-cafe-order-wall__card')?.click();
    expect(findByClass(root, 'bear-cafe-environment')?.dataset.stage).toBe('order_detail');
    expect(collectMarkup(findByClass(root, 'bear-cafe-order-detail')!)).toContain(
      'data-bag-color="blue"'
    );
    expect(events).toHaveLength(1);
  });

  test('the child wall is newest-first, bounded to six cards per page, and has no delete', () => {
    const saved = Array.from({ length: 7 }, (_, index) => savedOrder(index));
    const { root, events } = setup({ history: saved });

    findByAria(root, 'Open order wall')?.click();
    const firstPageCards = findAllByClass(root, 'bear-cafe-order-wall__card');
    expect(firstPageCards).toHaveLength(6);
    expect(collectMarkup(firstPageCards[0])).toContain('data-bag-color="pink"');
    expect(collectMarkup(firstPageCards[0])).toContain('data-seal="heart"');
    expect(collectMarkup(firstPageCards[1])).toContain('data-bag-color="blue"');
    expect(collectMarkup(firstPageCards[1])).toContain('data-seal="star"');
    const wallMarkup = collectMarkup(findByClass(root, 'bear-cafe-order-wall')!);
    expect(wallMarkup).not.toMatch(/delete|remove/i);
    findByAria(root, 'Next order wall page')?.click();
    expect(findAllByClass(root, 'bear-cafe-order-wall__card')).toHaveLength(1);
    expect(events).toEqual([]);
  });
});

function setup(params: {
  activityId?: string;
  history?: CafeOrderCompletion[];
} = {}): {
  root: MockElement;
  events: ActivityAttemptEvent[];
  history: CafeOrderCompletion[];
} {
  const root = document.createElement('div') as unknown as MockElement;
  const events: ActivityAttemptEvent[] = [];
  const history = params.history ?? [];
  const activity = APPROVED_ACTIVITIES.find(
    (entry) => entry.id === (params.activityId ?? 'kennedis-orders-banana-001')
  );
  if (!activity) throw new Error('Missing Bear Cafe activity');

  renderKennedisOrdersActivity(root as unknown as HTMLElement, {
    activity: activity as LearningActivity,
    childId: 'local-child',
    sessionId: 'session-1',
    speech: createMockSpeech(),
    audio: createMockAudio(),
    onEvent: (event) => events.push(event),
    history: {
      list: () => history,
      append: (record) => history.push(record),
    },
  });
  return { root, events, history };
}

function savedOrder(index: number): CafeOrderCompletion {
  return {
    schema_version: 1,
    game: 'kennedis-orders',
    completion_id: `saved-order-${index}`,
    session_id: `session-${index}`,
    child_id: 'local-child',
    activity_id: 'kennedis-orders-banana-001',
    activity_version: 1,
    caller_id: 'baby-polar-bear',
    food_items: [{ food_id: 'banana', count: 1 }],
    bag_color_id: index % 2 === 0 ? 'pink' : 'blue',
    seal_id: index % 2 === 0 ? 'heart' : 'star',
    completed_at: new Date(Date.UTC(2026, 6, 13, 12, index)).toISOString(),
  };
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
  readonly style = {
    setProperty: (_name: string, _value: string) => {},
  } as unknown as CSSStyleDeclaration;
  readonly classList = new MockClassList(this);
  baseClassName = '';
  id = '';
  textContent = '';
  disabled = false;
  hidden = false;
  type = '';
  private _className = '';
  private _innerHTML = '';
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

  set innerHTML(value: string) {
    this._innerHTML = value;
    if (value === '') this.children.length = 0;
  }

  appendChild(child: MockElement): MockElement {
    this.children.push(child);
    return child;
  }

  append(...nodes: MockElement[]): void {
    this.children.push(...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
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

function findByAria(element: MockElement, label: string): MockElement | undefined {
  if (element.attributes['aria-label'] === label) return element;
  for (const child of element.children) {
    const match = findByAria(child, label);
    if (match) return match;
  }
  return undefined;
}

/** All markup/text reachable under an element (innerHTML + children). */
function collectMarkup(element: MockElement): string {
  return [
    element.textContent,
    element.innerHTML,
    ...element.children.map((child) => collectMarkup(child)),
  ].join(' ');
}
