/**
 * Dress-Up Studio runtime — behavioral tests.
 *
 * Pins the ownership-completion behavior: the child changes the doll's world,
 * a finish builds a completion object of the EXACT choices, the payoff and a
 * later revisit render from that same object, the saved-look shelf revisits
 * without earning access again, and the game emits NO attempt events (its only
 * output is the non-evaluative fashion-card sink).
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderDressUpStudio,
  destroyDressUpStudio,
} from '../../src/modules/dress-up-studio/DressUpStudioActivity';
import type { FashionCardCompletion } from '../../src/modules/dress-up-studio/fashion-cards';
import type { SpeechServiceInterface } from '../../src/types/runtime';

describe('dress-up studio runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', { location: { hash: '#dress-up' } });
  });

  afterEach(() => {
    destroyDressUpStudio();
    vi.unstubAllGlobals();
  });

  test('opens the studio with a doll-in-scene preview, tabs, and Finish', () => {
    const { root } = setup();

    const preview = findByClass(root, 'dress-up-studio__doll');
    expect(preview?.innerHTML).toContain('du-stage-svg');

    // One supply tab per category strip.
    expect(findAllByClass(root, 'dress-up-studio__tab')).toHaveLength(9);
    expect(findByAria(root, 'Finish the look')).toBeDefined();
  });

  test('tapping a top changes the doll (the new fabric appears, the old is gone)', () => {
    const { root } = setup();

    findByAria(root, 'Tops')?.click();
    findByAria(root, 'Stripe Tee')?.click();

    const preview = findByClass(root, 'dress-up-studio__doll');
    expect(preview?.innerHTML).toContain('#7fb4e6'); // stripe tee fabric
    expect(preview?.innerHTML).not.toContain('#f48fb3'); // the default star tee is gone
  });

  test('a dress replaces the top and bottom in the saved look', () => {
    const { root, history } = setup();

    findByAria(root, 'Dresses')?.click();
    findByAria(root, 'Party Dress')?.click();
    findByAria(root, 'Finish the look')?.click();

    expect(history.items).toHaveLength(1);
    const card = history.items[0];
    expect(card.outfit.dress).toBe('dress-party');
    expect(card.outfit.top).toBeUndefined();
    expect(card.outfit.bottom).toBeUndefined();
    // Shoes coexist with a dress.
    expect(card.outfit.shoes).toBe('shoes-sneakers');
  });

  test('Finish builds a completion object of the exact choices and shows it', () => {
    const { root, history } = setup();

    // Change a scene and add an accessory, then finish.
    findByAria(root, 'Place')?.click();
    findByAria(root, 'Dance Stage')?.click();
    findByAria(root, 'Extras')?.click();
    findByAria(root, 'Hair Bow')?.click();
    findByAria(root, 'Finish the look')?.click();

    const card = history.items[0];
    expect(card.doll_id).toBe('luna');
    expect(card.scene_id).toBe('scene-dance');
    expect(card.accessory_ids).toEqual(['acc-bow']);

    // The payoff renders the same card, in the chosen scene, with a frame.
    const cardHolder = findByClass(root, 'dress-up-studio__card');
    expect(cardHolder?.innerHTML).toContain('du-card-svg');
    expect(cardHolder?.innerHTML).toContain('du-frame');
  });

  test('the finished card stays until a child-controlled action', () => {
    const { root } = setup();
    findByAria(root, 'Finish the look')?.click();

    expect(findByClass(root, 'dress-up-studio__payoff')?.hidden).toBe(false);
    expect(findByClass(root, 'dress-up-studio__studio')?.hidden).toBe(true);
    // Large, clear finish choices — never an auto-wipe.
    expect(findByAria(root, 'Make a new look')).toBeDefined();
    expect(findByAria(root, 'Return home')).toBeDefined();
  });

  test('saved looks revisit from the shelf without earning access again', () => {
    const { root } = setup();

    findByAria(root, 'Finish the look')?.click();
    findByAria(root, 'Make a new look')?.click();

    // Back in the studio, the saved card is on the shelf.
    const minis = findAllByClass(root, 'dress-up-studio__mini');
    expect(minis).toHaveLength(1);

    // Tapping it re-opens the exact card (revisit), with a Back control.
    minis[0].click();
    expect(findByClass(root, 'dress-up-studio__card')?.innerHTML).toContain('du-card-svg');
    expect(findByAria(root, 'Back to the studio')).toBeDefined();
  });

  test('the game emits no attempt events (its only output is the card sink)', () => {
    const { root, history } = setup();
    // The render options accept no onEvent sink at all; finishing writes exactly
    // one non-evaluative fashion card and nothing else.
    findByAria(root, 'Finish the look')?.click();
    expect(history.items).toHaveLength(1);
    const card = history.items[0] as unknown as Record<string, unknown>;
    expect(card.outcome).toBeUndefined();
    expect(card.skill_ids).toBeUndefined();
  });

  test('destroy removes the studio from the DOM', () => {
    const { root } = setup();
    expect(root.children.length).toBe(1);
    destroyDressUpStudio();
    expect(root.children.length).toBe(0);
  });

  test('a saved card with unknown ids still renders on the shelf (fail-safe)', () => {
    const stale: FashionCardCompletion = {
      completion_id: 'stale-1',
      session_id: 's',
      doll_id: 'luna',
      tone_id: 'tone-does-not-exist',
      hair_id: 'hair-x',
      hair_color_id: 'hc-x',
      glasses: false,
      outfit: { top: 'unknown-top', dress: 'unknown-dress' },
      accessory_ids: ['acc-x'],
      scene_id: 'scene-x',
      frame_id: 'frame-x',
      created_at: '2026-07-20T00:00:00.000Z',
    };
    const { root } = setup([stale]);

    const minis = findAllByClass(root, 'dress-up-studio__mini');
    expect(minis).toHaveLength(1);
    // It renders a card SVG rather than throwing on the unknown ids.
    expect(minis[0].innerHTML).toContain('du-card-svg');
  });

  test('a fully undressed doll still renders and finishes with an empty outfit', () => {
    const { root, history } = setup();

    // Remove each default garment by tapping its selected chip again.
    findByAria(root, 'Tops')?.click();
    findByAria(root, 'Star Tee')?.click();
    findByAria(root, 'Bottoms')?.click();
    findByAria(root, 'Denim Skirt')?.click();
    findByAria(root, 'Shoes')?.click();
    findByAria(root, 'Sneakers')?.click();

    expect(findByClass(root, 'dress-up-studio__doll')?.innerHTML).toContain('du-stage-svg');

    findByAria(root, 'Finish the look')?.click();
    expect(history.items[0].outfit).toEqual({});
  });

  test('the reveal is a one-shot class and decorative art is aria-hidden', () => {
    const { root } = setup();
    expect(findByClass(root, 'dress-up-studio__doll')?.attributes['aria-hidden']).toBe('true');

    findByAria(root, 'Finish the look')?.click();
    const cardHolder = findByClass(root, 'dress-up-studio__card');
    expect(cardHolder?.classList.contains('is-revealing')).toBe(true);
    expect(cardHolder?.attributes['aria-hidden']).toBe('true');
  });
});

// — Harness (mock DOM, matching the repo's other module tests) —

interface FashionHistory {
  items: FashionCardCompletion[];
  list(): FashionCardCompletion[];
  append(card: FashionCardCompletion): void;
}

function setup(seed: FashionCardCompletion[] = []): { root: MockElement; history: FashionHistory } {
  const root = document.createElement('div') as unknown as MockElement;
  const items: FashionCardCompletion[] = [...seed];
  const history: FashionHistory = {
    items,
    list: () => items,
    append: (card) => {
      items.push(card);
    },
  };
  renderDressUpStudio(root as unknown as HTMLElement, {
    sessionId: 'session-1',
    speech: createMockSpeech(),
    history,
  });
  return { root, history };
}

function createMockSpeech(): SpeechServiceInterface {
  return {
    enabled: true,
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    repeatLast: vi.fn(),
  };
}

class MockClassList {
  private readonly values = new Set<string>();
  add(name: string): void { this.values.add(name); }
  remove(name: string): void { this.values.delete(name); }
  contains(name: string): boolean { return this.values.has(name); }
  toggle(name: string, force?: boolean): boolean {
    const shouldAdd = force ?? !this.values.has(name);
    if (shouldAdd) this.values.add(name);
    else this.values.delete(name);
    return shouldAdd;
  }
}

class MockStyle {
  private readonly values = new Map<string, string>();
  setProperty(name: string, value: string): void { this.values.set(name, value); }
  getPropertyValue(name: string): string { return this.values.get(name) ?? ''; }
}

class MockElement {
  readonly tagName: string;
  readonly children: MockElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  readonly classList = new MockClassList();
  readonly style = new MockStyle();
  className = '';
  id = '';
  textContent = '';
  innerHTML = '';
  disabled = false;
  hidden = false;
  type = '';
  private readonly listeners: Record<string, Array<(event?: unknown) => void>> = {};

  parentElement: MockElement | null = null;
  constructor(tagName: string) { this.tagName = tagName.toUpperCase(); }
  appendChild(child: MockElement): MockElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  addEventListener(type: string, handler: (event?: unknown) => void): void {
    this.listeners[type] ??= [];
    this.listeners[type].push(handler);
  }
  removeEventListener(type: string, handler: (event?: unknown) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((fn) => fn !== handler);
  }
  fire(type: string, payload?: unknown): void {
    if (this.disabled) return;
    for (const handler of this.listeners[type] ?? []) handler(payload);
  }
  click(): void {
    this.fire('click', { stopPropagation: () => {} });
  }
  remove(): void {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    if (index !== -1) siblings.splice(index, 1);
    this.parentElement = null;
  }
}

function createMockDocument(): Document {
  return {
    createElement: (tagName: string) => new MockElement(tagName),
  } as unknown as Document;
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
  const matches: MockElement[] = [];
  if (element.className.split(/\s+/).includes(className)) matches.push(element);
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
