/**
 * Story Stage tests — the fixed tale's structure and the runtime's
 * behavior. Since slice 2 the tale is RESOLVED from the authored story
 * pack, so these graph proofs run against exactly what the runtime plays.
 * The load-bearing claims: decisions branch deterministically to
 * distinct consequences, every path ends, the runtime emits NO events of
 * any kind, narration never overlaps (stop before speak), Repeat replays,
 * and leaving the story stops speech.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderStoryStage,
  destroyStoryStage,
} from '../../src/modules/story-stage/StoryStageActivity';
import { resolveFirstTale } from '../../src/modules/story-stage/first-tale';
import type { ResolvedScene } from '../../src/modules/story-stage/story-pack.types';
import type { SpeechServiceInterface } from '../../src/types/runtime';
import { parseRoute } from '../../src/app/router';

const FIRST_TALE = resolveFirstTale();

describe('the first tale (resolved story graph)', () => {
  const scenesById = new Map(FIRST_TALE.scenes.map((scene) => [scene.id, scene]));

  test('every decision has exactly two choices leading to distinct scenes', () => {
    const decisions = FIRST_TALE.scenes.filter((scene) => scene.kind === 'decision');
    expect(decisions.length).toBe(2);
    for (const decision of decisions) {
      expect(decision.choices).toHaveLength(2);
      const [a, b] = decision.choices!;
      expect(a.next).not.toBe(b.next);
      expect(scenesById.has(a.next)).toBe(true);
      expect(scenesById.has(b.next)).toBe(true);
    }
  });

  test('every path from the entry reaches an ending within the path length', () => {
    const endings: string[] = [];
    const walk = (sceneId: string, depth: number, seen: Set<string>) => {
      expect(depth).toBeLessThanOrEqual(FIRST_TALE.pathLength);
      expect(seen.has(sceneId)).toBe(false); // no cycles
      const scene = scenesById.get(sceneId);
      expect(scene).toBeDefined();
      const nextSeen = new Set(seen).add(sceneId);
      if (scene!.kind === 'ending') {
        endings.push(sceneId);
        expect(scene!.next).toBeUndefined();
        return;
      }
      if (scene!.kind === 'decision') {
        for (const choice of scene!.choices!) walk(choice.next, depth + 1, nextSeen);
        return;
      }
      expect(scene!.next).toBeDefined();
      walk(scene!.next!, depth + 1, nextSeen);
    };
    walk(FIRST_TALE.entrySceneId, 1, new Set());
    // Four paths (2 × 2 choices), two ending variants.
    expect(endings).toHaveLength(4);
    expect(new Set(endings).size).toBe(2);
  });

  test('no dead scenes: every authored scene is reachable from the entry', () => {
    const reachable = new Set<string>();
    const visit = (sceneId: string) => {
      if (reachable.has(sceneId)) return;
      reachable.add(sceneId);
      const scene = scenesById.get(sceneId)!;
      if (scene.kind === 'decision') scene.choices!.forEach((c) => visit(c.next));
      else if (scene.next) visit(scene.next);
    };
    visit(FIRST_TALE.entrySceneId);
    expect(reachable.size).toBe(FIRST_TALE.scenes.length);
  });

  test('the two first-choice branches narrate distinct consequences', () => {
    const bush = scenesById.get('bush')!;
    const log = scenesById.get('log')!;
    expect(bush.narration).not.toBe(log.narration);
    expect(bush.art).not.toBe(log.art);
  });

  test('story data is local-only and every scene narrates', () => {
    expect(JSON.stringify(FIRST_TALE)).not.toMatch(/https?:\/\//);
    for (const scene of FIRST_TALE.scenes) {
      expect(scene.narration.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('story stage routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('#story-stage parses to its own view; game routes are untouched', () => {
    vi.stubGlobal('window', { location: { hash: '#story-stage' } });
    expect(parseRoute()).toEqual({ view: 'story-stage' });

    // The four games still route as activities, byte-identical.
    for (const id of [
      'phonics-find-b',
      'kennedis-orders-banana-001',
      'number-train',
      'art-studio-free-decorate',
    ]) {
      vi.stubGlobal('window', { location: { hash: `#activity/${id}` } });
      expect(parseRoute()).toEqual({ view: 'activity', activityId: id });
    }

    vi.stubGlobal('window', { location: { hash: '' } });
    expect(parseRoute()).toEqual({ view: 'home' });
  });
});

type MockSpeech = {
  enabled: boolean;
  speak: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  repeatLast: ReturnType<typeof vi.fn>;
};

describe('story stage runtime', () => {
  let speech: MockSpeech;

  beforeEach(() => {
    vi.stubGlobal('document', createMockDocument());
    vi.stubGlobal('window', { location: { hash: '#story-stage' } });
    speech = createMockSpeech();
  });

  afterEach(() => {
    destroyStoryStage();
    vi.unstubAllGlobals();
  });

  function setup(): MockElement {
    const root = document.createElement('div') as unknown as MockElement;
    renderStoryStage(root as unknown as HTMLElement, {
      speech: speech as unknown as SpeechServiceInterface,
    });
    return root;
  }

  function currentCaption(root: MockElement): string {
    return findByClass(root, 'story-stage__caption')?.textContent ?? '';
  }

  test('a full narrated play-through reaches an ending deterministically', () => {
    const root = setup();

    // Opening + entry scene narrated once each; no autoplay beyond that.
    expect(speech.speak.mock.calls.map((call) => call[0])).toEqual([
      FIRST_TALE.opening,
      scene('intro').narration,
    ]);
    expect(currentCaption(root)).toBe(scene('intro').narration);

    findByAria(root, 'What happens next?')?.click();
    expect(currentCaption(root)).toBe(scene('problem').narration);

    findByAria(root, 'What happens next?')?.click();
    expect(currentCaption(root)).toBe(scene('where').narration);

    // Decision: two illustrated choices.
    const choices = findAllByClass(root, 'story-stage__choice');
    expect(choices).toHaveLength(2);
    findByAria(root, 'Follow the sparkly path')?.click();
    expect(currentCaption(root)).toBe(scene('bush').narration);

    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'Sing a soft song')?.click();
    expect(currentCaption(root)).toBe(scene('ending-song').narration);

    // Ending controls, once.
    expect(findByAria(root, 'Tell it again')).toBeDefined();
    expect(findByText(root, 'Home')).toBeDefined();
  });

  test('the other branch produces the other consequence (real choices)', () => {
    const root = setup();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'Ask the friendly owl')?.click();
    expect(currentCaption(root)).toBe(scene('log').narration);
  });

  test('scene changes stop speech before speaking (no overlap)', () => {
    const root = setup();
    const callsBefore = order(speech);
    findByAria(root, 'What happens next?')?.click();
    const calls = order(speech).slice(callsBefore.length);
    expect(calls).toEqual(['stop', 'speak']);
  });

  test('Repeat replays the current scene narration', () => {
    const root = setup();
    findByAria(root, 'Repeat prompt')?.click();
    expect(speech.repeatLast).toHaveBeenCalledTimes(1);
  });

  test('leaving the story stops narration', () => {
    setup();
    const stops = speech.stop.mock.calls.length;
    destroyStoryStage();
    expect(speech.stop.mock.calls.length).toBeGreaterThan(stops);
  });

  test('Tell it again restarts the same story from the beginning', () => {
    const root = setup();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'Follow the sparkly path')?.click();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'Blow gentle bubbles')?.click();
    expect(currentCaption(root)).toBe(scene('ending-bubbles').narration);

    findByAria(root, 'Tell it again')?.click();
    expect(currentCaption(root)).toBe(scene('intro').narration);
    expect(findByAria(root, 'What happens next?')).toBeDefined();
  });

  test('the runtime has no event sink and decorative layers are hidden', () => {
    const root = setup();
    // The options type takes speech only — assert the rendered tree carries
    // no evidence hooks and the scene layer is aria-hidden.
    expect(findByClass(root, 'story-stage__scene')?.attributes['aria-hidden']).toBe('true');
    const sceneMarkup = findByClass(root, 'story-stage__scene')?.innerHTML ?? '';
    expect(sceneMarkup).toContain('story-stage__scene-svg');
    expect(sceneMarkup.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, ''))
      .not.toMatch(/https?:\/\//);
  });
});

function scene(id: string): ResolvedScene {
  const found = FIRST_TALE.scenes.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing scene ${id}`);
  return found;
}

function order(speech: MockSpeech): string[] {
  const entries: Array<{ kind: string; order: number }> = [];
  speech.stop.mock.invocationCallOrder.forEach((n: number) => entries.push({ kind: 'stop', order: n }));
  speech.speak.mock.invocationCallOrder.forEach((n: number) => entries.push({ kind: 'speak', order: n }));
  return entries.sort((a, b) => a.order - b.order).map((entry) => entry.kind);
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

class MockElement {
  readonly tagName: string;
  readonly children: MockElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  readonly classList = new MockClassList();
  className = '';
  id = '';
  textContent = '';
  disabled = false;
  hidden = false;
  type = '';
  parentElement: MockElement | null = null;
  private innerHtmlValue = '';
  private readonly listeners: Record<string, Array<() => void>> = {};

  constructor(tagName: string) { this.tagName = tagName.toUpperCase(); }
  get innerHTML(): string { return this.innerHtmlValue; }
  set innerHTML(value: string) {
    this.innerHtmlValue = value;
    if (value === '') this.children.length = 0;
  }
  appendChild(child: MockElement): MockElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
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

function createMockSpeech(): MockSpeech {
  return {
    enabled: true,
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    repeatLast: vi.fn(),
  };
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

function findByText(element: MockElement, text: string): MockElement | undefined {
  if (element.textContent === text) return element;
  for (const child of element.children) {
    const match = findByText(child, text);
    if (match) return match;
  }
  return undefined;
}
