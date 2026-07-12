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
    const { root, events } = setup();

    // Phone → make → build the one-banana order → Check → plating timer →
    // delivery.
    findByAria(root, 'Baby Polar Bear is calling')?.click();
    findByAria(root, 'Choose banana, none on tray')?.click();
    findByAria(root, 'Check order')?.click();
    const plating = timers.find((timer) => timer.ms === PLATING_DURATION_MS);
    expect(plating).toBeDefined();
    plating?.cb();

    const environment = findByClass(root, 'bear-cafe-environment');
    expect(environment?.dataset.stage).toBe('delivery');

    // No emoji anywhere in the delivery stage — bell, order tray, and the
    // Deliver control are all local illustrated SVG.
    const delivery = findByClass(root, 'bear-cafe-delivery');
    const deliveryMarkup = collectMarkup(delivery!);
    expect(deliveryMarkup).not.toContain('🔔');
    expect(deliveryMarkup).not.toContain('🧺');
    expect(deliveryMarkup).not.toContain('☎');
    expect(deliveryMarkup).toContain('bear-cafe-bell-svg');
    expect(deliveryMarkup).toContain('bear-cafe-tray-svg');
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
    expect(deliver?.innerHTML).toContain('bear-cafe-tray-svg');
    deliver?.click();

    const completions = events.filter((event) => event.outcome === 'completed');
    expect(completions).toHaveLength(1);
    expect(completions[0]?.metadata?.event_name).toBe('order_delivered');
    expect(findByClass(root, 'bear-cafe-environment')?.dataset.stage).toBe('handoff');
  });

  test('the completion celebration bursts illustrated confetti, not emoji', () => {
    const { root } = setup();

    findByAria(root, 'Baby Polar Bear is calling')?.click();
    findByAria(root, 'Choose banana, none on tray')?.click();
    findByAria(root, 'Check order')?.click();
    timers.find((timer) => timer.ms === PLATING_DURATION_MS)?.cb();
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
});

function setup(): { root: MockElement; events: ActivityAttemptEvent[] } {
  const root = document.createElement('div') as unknown as MockElement;
  const events: ActivityAttemptEvent[] = [];
  const activity = APPROVED_ACTIVITIES.find(
    (entry) => entry.id === 'kennedis-orders-banana-001'
  );
  if (!activity) throw new Error('Missing banana activity');

  renderKennedisOrdersActivity(root as unknown as HTMLElement, {
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
