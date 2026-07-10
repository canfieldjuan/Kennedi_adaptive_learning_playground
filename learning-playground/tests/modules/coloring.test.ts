import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  destroyColoringActivity,
  renderColoringActivity,
} from '../../src/modules/coloring-book/ColoringActivity';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../src/types/runtime';

describe('coloring runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#activity/art-color-circle' },
      setTimeout: vi.fn((callback: () => void) => {
        callback();
        return 0;
      }),
    });
  });

  afterEach(() => {
    destroyColoringActivity();
    vi.unstubAllGlobals();
  });

  test('the studio scene renders once, inert, and all-neutral', () => {
    const { root } = setup('art-color-circle');

    const screen = findByClass(root, 'coloring-screen');
    expect(screen?.className).toContain('coloring-studio');

    const layers = findAllByClass(root, 'studio-environment');
    expect(layers).toHaveLength(1);
    expect(layers[0].attributes['aria-hidden']).toBe('true');
    expect(layers[0].innerHTML).toContain('studio-env__svg');
    // Hard guardrails: nothing readable in the scene, and no saturated color —
    // color on this screen belongs only to the palette and the filled shape.
    expect(layers[0].innerHTML).not.toContain('<text');
    const paints = layers[0].innerHTML.match(/(?:fill|stroke)="([^"]+)"/g) ?? [];
    expect(paints.length).toBeGreaterThan(0);
    const neutralPalette = [
      'rgba(58, 36, 97, 0.45)',
      'rgba(58, 36, 97, 0.28)',
      '#f4efe6',
      '#e9e1d2',
      '#d9c4a3',
      '#c9b28d',
      '#fbf8f1',
      '#f7f3e9',
      '#d8d0c2',
    ];
    for (const paint of paints) {
      const value = paint.replace(/^(?:fill|stroke)="/, '').replace(/"$/, '');
      expect(neutralPalette).toContain(value);
    }

    // Rendering the request variant mounts the same single scene.
    const request = setup('art-match-blue-card');
    expect(findAllByClass(request.root, 'studio-environment')).toHaveLength(1);
  });

  test('legacy free choice still accepts any selected palette color', () => {
    const { root, events } = setup('art-color-circle');

    expect(findByClass(root, 'coloring-screen--request')).toBeUndefined();

    findByColorId(root, 'berry-pink')?.click();
    findByClass(root, 'coloring-shape')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]).toMatchObject({
      selected_choice_id: 'berry-pink',
      selected_answer: 'Pink',
      correct_answer: 'Pink',
      hint_shown: false,
    });
    expect(events[0]?.correct_choice_id).toBeUndefined();
    expect(events[0]?.metadata).toEqual({
      color_label: 'Pink',
      color_value: '#fd79a8',
    });
  });

  test('visual request mismatch logs incorrect and remains correctable', () => {
    const { root, events } = setup('art-match-blue-card');
    const requestCard = findByClass(root, 'coloring-request-card');

    expect(findByClass(root, 'coloring-screen--request')).toBeDefined();
    expect(requestCard?.attributes['aria-label']).toBe('Match the Blue color');
    expect(
      findByClass(root, 'coloring-request-card__swatch')?.style.getPropertyValue(
        '--request-color'
      )
    ).toBe('#74b9ff');

    findByColorId(root, 'sunny-yellow')?.click();
    findByClass(root, 'coloring-shape')?.click();

    expect(events.map((event) => event.outcome)).toEqual(['incorrect']);
    expect(events[0]).toMatchObject({
      selected_choice_id: 'sunny-yellow',
      correct_choice_id: 'sky-blue',
      selected_answer: 'Yellow',
      correct_answer: 'Blue',
      attempt_number: 1,
    });
    expect(findByClass(root, 'activity-complete-actions')?.hidden).toBe(true);
    expect(findByColorId(root, 'sky-blue')?.disabled).toBe(false);

    findByColorId(root, 'sky-blue')?.click();
    findByClass(root, 'coloring-shape')?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'correct',
      'completed',
    ]);
    expect(events[1]).toMatchObject({
      selected_choice_id: 'sky-blue',
      correct_choice_id: 'sky-blue',
      selected_answer: 'Blue',
      correct_answer: 'Blue',
      attempt_number: 2,
      response_time_ms: expect.any(Number),
      metadata: {
        target_color_id: 'sky-blue',
        target_color_label: 'Blue',
        target_color_value: '#74b9ff',
      },
    });
  });

  test('repeated mismatch emits one hint and highlights the requested swatch', () => {
    const { root, events } = setup('art-match-blue-card');

    findByColorId(root, 'sunny-yellow')?.click();
    findByClass(root, 'coloring-shape')?.click();
    findByColorId(root, 'berry-pink')?.click();
    findByClass(root, 'coloring-shape')?.click();

    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    expect(events[2]).toMatchObject({
      selected_choice_id: 'berry-pink',
      correct_choice_id: 'sky-blue',
      hint_shown: true,
    });
    expect(findByColorId(root, 'sky-blue')?.classList.contains('is-hinted')).toBe(true);

    findByColorId(root, 'leaf-green')?.click();
    findByClass(root, 'coloring-shape')?.click();
    expect(events.filter((event) => event.outcome === 'hint_used')).toHaveLength(1);
  });

  test('an unknown target color fails closed', () => {
    const activity = getActivity('art-match-blue-card');
    const broken = {
      ...activity,
      content: { ...activity.content, target_color_id: 'missing-color' },
      success_rules: { ...activity.success_rules, correct_color_id: 'missing-color' },
    } as LearningActivity;
    const root = document.createElement('div') as unknown as MockElement;

    renderColoringActivity(root as unknown as HTMLElement, {
      activity: broken,
      childId: 'local-child',
      sessionId: 'session-1',
      speech: createMockSpeech(),
      audio: createMockAudio(),
      onEvent: vi.fn(),
    });

    expect(findByClass(root, 'coloring-request-card')).toBeUndefined();
    expect(findByClass(root, 'activity-title')?.textContent).toBe('Coloring needs setup');
  });
});

function setup(activityId: string): { root: MockElement; events: ActivityAttemptEvent[] } {
  const root = document.createElement('div') as unknown as MockElement;
  const events: ActivityAttemptEvent[] = [];
  renderColoringActivity(root as unknown as HTMLElement, {
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

function findByColorId(element: MockElement, colorId: string): MockElement | undefined {
  if (element.dataset.colorId === colorId) return element;
  for (const child of element.children) {
    const match = findByColorId(child, colorId);
    if (match) return match;
  }
  return undefined;
}
