/**
 * Behavioral tests for the Bear Art Studio runtime (art arc slice 1).
 *
 * Pin the evidence honesty of all five modes: completion only on a
 * legitimate finish, quantity judged only on Check (never per tap), color
 * requests carrying requested/selected metadata, per-position pattern
 * evidence, the fix mode's gentle redirect, and hint flows that glow but
 * never auto-fill. The studio scene mounts inert behind every mode.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderBearArtStudioActivity,
  destroyBearArtStudioActivity,
} from '../../src/modules/bear-art-studio/BearArtStudioActivity';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../src/types/runtime';

describe('bear art studio runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#activity/art-studio-free-decorate' },
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    });
  });

  afterEach(() => {
    destroyBearArtStudioActivity();
    vi.unstubAllGlobals();
  });

  test('the studio scene mounts once, inert, with the bear requester', () => {
    const { root } = setup('art-studio-free-decorate');

    const layers = findAllByClass(root, 'studio-environment');
    expect(layers).toHaveLength(1);
    expect(layers[0].attributes['aria-hidden']).toBe('true');

    const portrait = findByClass(root, 'bear-art-studio__bear');
    expect(portrait?.attributes['aria-hidden']).toBe('true');
    expect(portrait?.innerHTML).toContain('bear-art');

    const request = findByClass(root, 'bear-art-studio__request');
    expect(request?.attributes.role).toBe('img');
    expect(request?.attributes['aria-label']).toContain('Baby Polar Bear');
  });

  test('free decorate completes only on Finish art, with creative evidence', () => {
    const { root, events } = setup('art-studio-free-decorate');

    const doneButton = findByText(root, 'Finish art');
    expect(doneButton?.disabled).toBe(true);

    // Sticker then slot: the placement is play, not a judged attempt.
    findByAria(root, 'star sticker')?.click();
    findByAria(root, 'Art spot 1')?.click();
    expect(events).toHaveLength(0);
    expect(findByAria(root, 'Art spot 1')?.classList.contains('is-filled')).toBe(true);
    expect(doneButton?.disabled).toBe(false);

    findByAria(root, 'heart sticker')?.click();
    findByAria(root, 'Art spot 4')?.click();

    doneButton?.click();
    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]?.metadata).toMatchObject({
      game: 'bear-art-studio',
      art_mode: 'free_decorate',
      stickers_placed: 2,
      sticker_ids: 'star,heart',
    });
    expect(events[0]?.skill_ids).toEqual(['color_fill']);
    expect(findByClass(root, 'activity-complete-actions')?.hidden).toBe(false);

    // Finishing twice does not double-log.
    doneButton?.click();
    expect(events).toHaveLength(2);
  });

  test('the chain button routes to the next art request', () => {
    const { root } = setup('art-studio-free-decorate');
    findByAria(root, 'star sticker')?.click();
    findByAria(root, 'Art spot 1')?.click();
    findByText(root, 'Finish art')?.click();

    findByText(root, 'Next art')?.click();
    expect(window.location.hash).toBe('#activity/art-studio-pink-request');
  });

  test('color request records requested vs selected and never completes on a miss', () => {
    const { root, events } = setup('art-studio-pink-request');

    findByColorId(root, 'sunny-yellow')?.click();
    findByClass(root, 'bear-art-studio__subject')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['incorrect']);
    expect(events[0]).toMatchObject({
      selected_choice_id: 'sunny-yellow',
      correct_choice_id: 'berry-pink',
      hint_shown: false,
    });
    expect(events[0]?.metadata).toMatchObject({
      requested_color_id: 'berry-pink',
      selected_color_id: 'sunny-yellow',
    });

    findByColorId(root, 'berry-pink')?.click();
    findByClass(root, 'bear-art-studio__subject')?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'correct',
      'completed',
    ]);
    expect(events[2]?.metadata).toMatchObject({ requested_color_id: 'berry-pink' });
  });

  test('two color misses glow the requested swatch as a hint', () => {
    const { root, events } = setup('art-studio-pink-request');

    findByColorId(root, 'sunny-yellow')?.click();
    findByClass(root, 'bear-art-studio__subject')?.click();
    findByColorId(root, 'leaf-green')?.click();
    findByClass(root, 'bear-art-studio__subject')?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(
      findByColorId(root, 'berry-pink')?.classList.contains('is-hinted')
    ).toBe(true);
  });

  test('quantity is judged only on Check, with over/under evidence', () => {
    const { root, events } = setup('art-studio-three-stars');

    // Placing and removing stickers is silent play.
    findByAria(root, 'Sticker spot 1')?.click();
    findByAria(root, 'Sticker spot 2')?.click();
    expect(events).toHaveLength(0);

    findByText(root, 'Check')?.click();
    expect(events.map((event) => event.outcome)).toEqual(['incorrect']);
    expect(events[0]?.metadata).toMatchObject({
      requested_quantity: 3,
      applied_quantity: 2,
      count_difference: -1,
    });
    expect(events[0]?.skill_ids).toEqual(['counting']);

    // Overshoot: add two more, Check → second miss also brings the hint,
    // which pulses what is placed and never auto-fills.
    findByAria(root, 'Sticker spot 3')?.click();
    findByAria(root, 'Sticker spot 4')?.click();
    findByText(root, 'Check')?.click();
    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(events[1]?.metadata).toMatchObject({
      applied_quantity: 4,
      count_difference: 1,
    });
    expect(findByAria(root, 'Sticker spot 1')?.classList.contains('is-hinted')).toBe(true);

    // Remove one (tap a filled spot) and Check: exactly three completes.
    findByAria(root, 'Sticker spot 4')?.click();
    findByText(root, 'Check')?.click();
    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
      'correct',
      'completed',
    ]);
    expect(events[4]?.metadata).toMatchObject({
      requested_quantity: 3,
      applied_quantity: 3,
    });
  });

  test('the pattern fills position by position and records the sequence', () => {
    const { root, events } = setup('art-studio-pattern-scarf');

    const segments = findAllByClass(root, 'bear-art-studio__segment');
    expect(segments).toHaveLength(6);
    expect(segments.filter((s) => s.classList.contains('is-filled'))).toHaveLength(3);

    // Position 3 expects yellow (pink, yellow, pink | yellow ...). A green
    // tap is a gentle miss that fills nothing.
    findByColorId(root, 'leaf-green')?.click();
    expect(events.map((event) => event.outcome)).toEqual(['incorrect']);
    expect(events[0]?.metadata).toMatchObject({
      pattern_position: 3,
      expected_color_id: 'sunny-yellow',
      selected_color_id: 'leaf-green',
    });
    expect(segments.filter((s) => s.classList.contains('is-filled'))).toHaveLength(3);

    findByColorId(root, 'sunny-yellow')?.click();
    findByColorId(root, 'berry-pink')?.click();
    findByColorId(root, 'sunny-yellow')?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'correct',
      'correct',
      'correct',
      'completed',
    ]);
    expect(events[4]?.metadata).toMatchObject({
      requested_pattern:
        'berry-pink,sunny-yellow,berry-pink,sunny-yellow,berry-pink,sunny-yellow',
      applied_pattern:
        'berry-pink,sunny-yellow,berry-pink,sunny-yellow,berry-pink,sunny-yellow',
    });
    expect(segments.filter((s) => s.classList.contains('is-filled'))).toHaveLength(6);
  });

  test('fix the art redirects gently and completes only on the true fix', () => {
    const { root, events } = setup('art-studio-fix-card');

    // The heart already matches: tapping it is a redirect, not a repaint.
    findByColorId(root, 'berry-pink')?.click();
    findByAria(root, 'heart on the card')?.click();
    expect(events.map((event) => event.outcome)).toEqual(['incorrect']);
    expect(events[0]?.metadata).toMatchObject({
      region_already_matching: true,
      wrong_region_id: 'star',
    });

    // Wrong color on the wrong region: second miss brings the hint glow on
    // the region that needs fixing.
    findByColorId(root, 'tomato-red')?.click();
    findByAria(root, 'star on the card')?.click();
    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(findByAria(root, 'star on the card')?.classList.contains('is-hinted')).toBe(true);

    // The true fix: yellow on the star.
    findByColorId(root, 'sunny-yellow')?.click();
    findByAria(root, 'star on the card')?.click();
    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
      'correct',
      'completed',
    ]);
    expect(events[3]?.metadata).toMatchObject({
      detected_mismatch: true,
      corrected_mismatch: true,
      wrong_region_id: 'star',
      requested_color_id: 'sunny-yellow',
    });
  });

  test('malformed studio content fails closed to the setup screen', () => {
    const activity = getActivity('art-studio-pink-request');
    const broken = {
      ...activity,
      content: { ...activity.content, art_mode: 'mystery_mode' },
    } as LearningActivity;
    const root = document.createElement('div') as unknown as MockElement;

    renderBearArtStudioActivity(root as unknown as HTMLElement, {
      activity: broken,
      childId: 'local-child',
      sessionId: 'session-1',
      speech: createMockSpeech(),
      audio: createMockAudio(),
      onEvent: vi.fn(),
    });

    expect(findByText(root, 'Home')).toBeDefined();
    expect(findByClassText(root, 'activity-title')).toBe('Art studio needs setup');
  });
});

function setup(activityId: string): { root: MockElement; events: ActivityAttemptEvent[] } {
  const root = document.createElement('div') as unknown as MockElement;
  const events: ActivityAttemptEvent[] = [];
  renderBearArtStudioActivity(root as unknown as HTMLElement, {
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
  private readonly listeners: Record<string, Array<() => void>> = {};

  constructor(tagName: string) { this.tagName = tagName.toUpperCase(); }
  appendChild(child: MockElement): MockElement { this.children.push(child); return child; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
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
  remove(): void {}
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
  const matches: MockElement[] = [];
  if (element.className.split(/\s+/).includes(className)) matches.push(element);
  for (const child of element.children) {
    matches.push(...findAllByClass(child, className));
  }
  return matches;
}

function findByClassText(element: MockElement, className: string): string | undefined {
  return findByClass(element, className)?.textContent;
}

function findByText(element: MockElement, text: string): MockElement | undefined {
  if (element.textContent === text) return element;
  for (const child of element.children) {
    const match = findByText(child, text);
    if (match) return match;
  }
  return undefined;
}

function findByAria(element: MockElement, label: string): MockElement | undefined {
  if (element.attributes['aria-label'] === label) return element;
  for (const child of element.children) {
    const match = findByAria(child, label);
    if (match) return match;
  }
  return undefined;
}

function findByColorId(element: MockElement, colorId: string): MockElement | undefined {
  if (element.dataset.colorId === colorId) return element;
  for (const child of element.children) {
    const match = findByColorId(child, colorId);
    if (match) return match;
  }
  return undefined;
}
