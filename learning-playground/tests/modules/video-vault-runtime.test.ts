import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import videoVaultActivity from '../../src/content/activities/video-vault.json';
import videoManifest from '../../src/content/videos/family-safe-videos.v1.json';
import {
  destroyVideoVault,
  renderVideoVault,
} from '../../src/modules/video-vault/VideoVault';
import type { VideoVaultManifest } from '../../src/modules/video-vault/video-vault.types';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type { SpeechServiceInterface } from '../../src/types/runtime';

describe('video vault response handoff', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', { location: { hash: '#activity/video-vault' } });
  });

  afterEach(() => {
    destroyVideoVault();
    vi.unstubAllGlobals();
  });

  test('reveals but does not open the response activity when the video ends', () => {
    const root = document.createElement('div') as unknown as MockElement;
    const events: ActivityAttemptEvent[] = [];
    const speech = createMockSpeech();

    renderVideoVault(root as unknown as HTMLElement, {
      activity: videoVaultActivity as LearningActivity,
      childId: 'local-child',
      sessionId: 'session-1',
      speech,
      videoManifest: videoManifest as VideoVaultManifest,
      onEvent: (event) => events.push(event),
    });

    const player = findByTag(root, 'VIDEO');
    const responseButton = findByClass(root, 'video-vault-card__response');
    expect(player).toBeDefined();
    expect(responseButton).toBeDefined();
    expect(responseButton?.hidden).toBe(true);
    expect(window.location.hash).toBe('#activity/video-vault');

    player?.dispatch('ended');

    expect(window.location.hash).toBe('#activity/video-vault');
    expect(responseButton?.hidden).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      outcome: 'completed',
      metadata: {
        evidence_role: 'exposure_only',
        response_activity_id: 'video-bear-bakes-bread-response',
      },
    });
    expect(speech.speak).toHaveBeenLastCalledWith(
      'Bear baked bread. Tap the question mark.'
    );

    responseButton?.click();

    expect(window.location.hash).toBe('#activity/video-bear-bakes-bread-response');
    expect(events).toHaveLength(1);
  });
});

class MockElement {
  readonly tagName: string;
  readonly children: MockElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  className = '';
  id = '';
  textContent = '';
  type = '';
  src = '';
  poster = '';
  preload = '';
  controls = false;
  autoplay = false;
  loop = false;
  hidden = false;
  private readonly listeners: Record<string, Array<() => void>> = {};

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

  removeAttribute(name: string): void {
    delete this.attributes[name];
    if (name === 'src') this.src = '';
  }

  addEventListener(type: string, handler: () => void): void {
    this.listeners[type] ??= [];
    this.listeners[type].push(handler);
  }

  removeEventListener(type: string, handler: () => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((item) => item !== handler);
  }

  dispatch(type: string): void {
    for (const handler of this.listeners[type] ?? []) handler();
  }

  click(): void {
    this.dispatch('click');
  }

  querySelectorAll(selector: string): MockElement[] {
    const matches: MockElement[] = [];
    for (const child of this.children) {
      if (child.tagName.toLowerCase() === selector.toLowerCase()) matches.push(child);
      matches.push(...child.querySelectorAll(selector));
    }
    return matches;
  }

  pause(): void {}
  load(): void {}
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

function findByTag(element: MockElement, tagName: string): MockElement | undefined {
  if (element.tagName === tagName) return element;
  for (const child of element.children) {
    const match = findByTag(child, tagName);
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
