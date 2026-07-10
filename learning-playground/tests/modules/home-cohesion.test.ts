/**
 * Home cohesion tests (visual arc stage 6, issue #55): the four home cards
 * carry illustrated inline-SVG icons — no emoji anywhere in the child home
 * markup — while the four-choice structure, labels, routes, and speech-on-tap
 * behavior stay exactly as before.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  destroyHomeScreen,
  renderHomeScreen,
} from '../../src/modules/home/HomeScreen';
import type { SpeechServiceInterface } from '../../src/types/runtime';

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

describe('home cohesion (illustrated icons)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', {
      location: { hash: '#home' },
    });
  });

  afterEach(() => {
    destroyHomeScreen();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('all four cards use inline SVG icons and no emoji remains', () => {
    const root = document.createElement('div');
    renderHomeScreen(root, createMockSpeech());

    const icons = findElementsByClassName(root, 'home-card__icon');
    expect(icons).toHaveLength(4);
    for (const icon of icons) {
      expect(icon.attributes['aria-hidden']).toBe('true');
      expect(icon.innerHTML).toContain('<svg');
    }

    // The whole home markup is emoji-free (the old 📖 ☎️ 🔢 🎨 icons).
    expect(collectMarkup(root)).not.toMatch(EMOJI_PATTERN);
  });

  test('icon swap leaves structure, labels, routes, and speech untouched', async () => {
    const root = document.createElement('div');
    const speech = createMockSpeech();
    renderHomeScreen(root, speech);

    expect(findElementsByClassName(root, 'home-card')).toHaveLength(4);
    for (const label of ['Words', 'Cafe', 'Math', 'Art']) {
      expect(collectMarkup(root)).toContain(label);
    }

    const wordsCard = findElementById(root, 'home-words');
    expect(wordsCard?.attributes['aria-label']).toBe('Words');
    wordsCard?.click();
    await vi.runAllTimersAsync();
    expect(speech.speak).toHaveBeenCalledWith('Words');
    expect(window.location.hash).toBe('#activity/phonics-find-b');
  });
});

class MockElement {
  readonly tagName: string;
  readonly children: MockElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  className = '';
  id = '';
  textContent = '';
  innerHTML = '';
  disabled = false;
  title = '';
  private readonly listeners: Record<string, Array<() => void | Promise<void>>> = {};

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

  addEventListener(type: string, handler: () => void | Promise<void>): void {
    this.listeners[type] ??= [];
    this.listeners[type].push(handler);
  }

  click(): void {
    for (const handler of this.listeners.click ?? []) {
      void handler();
    }
  }

  remove(): void {
    // Tests do not need parent references; this satisfies HomeScreen cleanup.
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

function collectMarkup(element: Element): string {
  const mockElement = element as unknown as MockElement;
  return [
    mockElement.textContent,
    mockElement.innerHTML,
    ...mockElement.children.map((child) => collectMarkup(child as unknown as Element)),
  ].join(' ');
}

function findElementById(element: Element, id: string): MockElement | undefined {
  const mockElement = element as unknown as MockElement;
  if (mockElement.id === id) return mockElement;
  for (const child of mockElement.children) {
    const match = findElementById(child as unknown as Element, id);
    if (match) return match;
  }
  return undefined;
}

function findElementsByClassName(element: Element, className: string): MockElement[] {
  const mockElement = element as unknown as MockElement;
  const matches = mockElement.className.split(' ').includes(className)
    ? [mockElement]
    : [];
  for (const child of mockElement.children) {
    matches.push(...findElementsByClassName(child as unknown as Element, className));
  }
  return matches;
}
