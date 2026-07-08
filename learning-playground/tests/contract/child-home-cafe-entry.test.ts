/**
 * Contract tests: child home Bear Cafe entry.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  destroyHomeScreen,
  renderHomeScreen,
} from '../../src/modules/home/HomeScreen';
import type { SpeechServiceInterface } from '../../src/types/runtime';

describe('child home Bear Cafe entry contract', () => {
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

  test('home grid keeps four child choices and starts the full Bear Cafe shift', async () => {
    const root = document.createElement('div');
    const speech = createMockSpeech();

    renderHomeScreen(root, speech);

    const homeCards = findElementsByClassName(root, 'home-card');
    expect(homeCards).toHaveLength(4);
    expect(collectText(root)).toContain('Words');
    expect(collectText(root)).toContain('Cafe');
    expect(collectText(root)).toContain('Math');
    expect(collectText(root)).toContain('Art');
    expect(collectText(root)).not.toContain('Videos');

    const cafeButton = findElementById(root, 'home-cafe');
    expect(cafeButton).toBeDefined();
    expect(cafeButton?.attributes['aria-label']).toBe('Cafe');
    expect(collectText(cafeButton as unknown as Element)).toContain('Cafe');

    cafeButton?.click();
    await vi.runAllTimersAsync();

    expect(speech.speak).toHaveBeenCalledWith('Bear Cafe');
    expect(window.location.hash).toBe('#activity/kennedis-orders-banana-001');
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

function collectText(element: Element): string {
  const mockElement = element as unknown as MockElement;
  return [
    mockElement.textContent,
    mockElement.innerHTML,
    ...mockElement.children.map((child) => collectText(child as unknown as Element)),
  ].join(' ');
}

function findElementById(
  element: Element,
  id: string
): MockElement | undefined {
  const mockElement = element as unknown as MockElement;
  if (mockElement.id === id) return mockElement;

  for (const child of mockElement.children) {
    const match = findElementById(child as unknown as Element, id);
    if (match) return match;
  }

  return undefined;
}

function findElementsByClassName(
  element: Element,
  className: string
): MockElement[] {
  const mockElement = element as unknown as MockElement;
  const matches = mockElement.className.split(' ').includes(className)
    ? [mockElement]
    : [];

  for (const child of mockElement.children) {
    matches.push(...findElementsByClassName(child as unknown as Element, className));
  }

  return matches;
}
