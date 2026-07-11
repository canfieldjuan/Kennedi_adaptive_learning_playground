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
import {
  FIRST_SELECTION,
  FIRST_STORY_PACK,
  resolveFirstTale,
} from '../../src/modules/story-stage/first-tale';
import {
  familiesSupporting,
  findFamilyFor,
  selectableEntities,
} from '../../src/modules/story-stage/story-selection';
import type { ResolvedScene, StoryPack } from '../../src/modules/story-stage/story-pack.types';
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

describe('pick three selection helpers', () => {
  // A synthetic two-family pack: c1 belongs to family A, c2 to family B,
  // c3 is authored but unwired; the families share setting s1.
  const stubScenes = { scenes: [], archetype: 'stub', title: 'T', opening: 'O', entrySceneId: 'intro', maxPathLength: 6 };
  const entity = (id: string) => ({
    id,
    label: id,
    spokenIntro: `${id} line`,
    art: id,
  });
  const syntheticPack = {
    id: 'synthetic',
    version: 1,
    characters: [
      { ...entity('c1'), introName: 'c1', shortName: 'c1', possessive: 'her' },
      { ...entity('c2'), introName: 'c2', shortName: 'c2', possessive: 'his' },
      { ...entity('c3'), introName: 'c3', shortName: 'c3', possessive: 'their' },
    ],
    settings: [{ ...entity('s1'), phrase: 'the s1' }],
    problems: [
      { ...entity('p1'), friendLabel: 'F', friendPhrase: 'friend F', friendThem: 'him' },
      { ...entity('p2'), friendLabel: 'G', friendPhrase: 'friend G', friendThem: 'her' },
    ],
    families: [
      { ...stubScenes, id: 'family-a', characterIds: ['c1'], settingIds: ['s1'], problemIds: ['p1'] },
      { ...stubScenes, id: 'family-b', characterIds: ['c2'], settingIds: ['s1'], problemIds: ['p2'] },
    ],
  } as unknown as StoryPack;

  test('unwired entities are never offered as cards', () => {
    const offered = selectableEntities(syntheticPack);
    expect(offered.characters.map((entry) => entry.id)).toEqual(['c1', 'c2']);
    expect(offered.settings.map((entry) => entry.id)).toEqual(['s1']);
    expect(offered.problems.map((entry) => entry.id)).toEqual(['p1', 'p2']);
  });

  test('later steps only offer entities compatible with earlier picks', () => {
    const afterCharacter = selectableEntities(syntheticPack, { characterId: 'c2' });
    expect(afterCharacter.settings.map((entry) => entry.id)).toEqual(['s1']);
    expect(afterCharacter.problems.map((entry) => entry.id)).toEqual(['p2']);
  });

  test('a completed selection maps to the family that supports it', () => {
    expect(
      findFamilyFor(syntheticPack, { characterId: 'c1', settingId: 's1', problemId: 'p1' })?.id
    ).toBe('family-a');
    expect(
      findFamilyFor(syntheticPack, { characterId: 'c1', settingId: 's1', problemId: 'p2' })
    ).toBeUndefined();
    expect(familiesSupporting(syntheticPack, {}).map((entry) => entry.id)).toEqual([
      'family-a',
      'family-b',
    ]);
  });

  test('the shipped pack resolves the fixed selection to the lost-friend family', () => {
    expect(findFamilyFor(FIRST_STORY_PACK, FIRST_SELECTION)?.id).toBe('lost-friend');
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

  /** Walk the Pick Three flow with the single authored trio and Start. */
  function startFirstStory(root: MockElement): void {
    findByAria(root, 'Princess Poppy')?.click();
    findByAria(root, 'Next step')?.click();
    findByAria(root, 'The Enchanted Forest')?.click();
    findByAria(root, 'Next step')?.click();
    findByAria(root, 'A Missing Friend')?.click();
    findByAria(root, 'Next step')?.click();
    findByAria(root, 'Start the story')?.click();
  }

  function currentCaption(root: MockElement): string {
    return findByClass(root, 'story-stage__caption')?.textContent ?? '';
  }

  function stepTitle(root: MockElement): string {
    return findByClass(root, 'story-stage__step-title')?.textContent ?? '';
  }

  test('setup speaks the step ask, and picking a card responds without advancing', () => {
    const root = setup();

    // The route lands on setup, not a story: step ask spoken, no caption.
    expect(stepTitle(root)).toBe('Who is the story about?');
    expect(speech.speak.mock.calls.map((call) => call[0])).toEqual([
      'Who is the story about?',
    ]);
    expect(findByClass(root, 'story-stage__caption')).toBeUndefined();

    const card = findByAria(root, 'Princess Poppy')!;
    expect(card.attributes['aria-pressed']).toBe('false');
    card.click();

    // Selection response is visible and audible, and the step does NOT advance.
    expect(card.attributes['aria-pressed']).toBe('true');
    expect(card.classList.contains('story-stage__card--selected')).toBe(true);
    expect(speech.speak.mock.calls.at(-1)?.[0]).toBe('Princess Poppy loves to explore.');
    expect(stepTitle(root)).toBe('Who is the story about?');
  });

  test('Next is gated on a pick at every step', () => {
    const root = setup();

    // No pick yet: Next is disabled and clicking it goes nowhere.
    expect(findByAria(root, 'Next step')?.disabled).toBe(true);
    findByAria(root, 'Next step')?.click();
    expect(stepTitle(root)).toBe('Who is the story about?');

    findByAria(root, 'Princess Poppy')?.click();
    expect(findByAria(root, 'Next step')?.disabled).toBe(false);
    findByAria(root, 'Next step')?.click();
    expect(stepTitle(root)).toBe('Where does it happen?');
    expect(speech.speak.mock.calls.at(-1)?.[0]).toBe('Where does it happen?');
  });

  test('the summary shows all three picks and one large Start control', () => {
    const root = setup();
    findByAria(root, 'Princess Poppy')?.click();
    findByAria(root, 'Next step')?.click();
    findByAria(root, 'The Enchanted Forest')?.click();
    findByAria(root, 'Next step')?.click();
    findByAria(root, 'A Missing Friend')?.click();
    findByAria(root, 'Next step')?.click();

    expect(stepTitle(root)).toBe('Your story is ready!');
    expect(speech.speak.mock.calls.at(-1)?.[0]).toBe('Your story is ready!');
    const items = findAllByClass(root, 'story-stage__summary-item');
    expect(items).toHaveLength(3);
    expect(
      items.map((item) => findByClass(item, 'story-stage__card-label')?.textContent)
    ).toEqual(['Princess Poppy', 'The Enchanted Forest', 'A Missing Friend']);
    expect(findByAria(root, 'Start the story')).toBeDefined();
    // Still no story surface until Start.
    expect(findByClass(root, 'story-stage__caption')).toBeUndefined();
  });

  test('a full narrated play-through reaches an ending deterministically', () => {
    const root = setup();
    startFirstStory(root);

    // Fully narrated launch: opening + entry scene narrated once each,
    // in order, after the setup speech; no autoplay beyond that.
    expect(speech.speak.mock.calls.slice(-2).map((call) => call[0])).toEqual([
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
    startFirstStory(root);
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'Ask the friendly owl')?.click();
    expect(currentCaption(root)).toBe(scene('log').narration);
  });

  test('scene changes stop speech before speaking (no overlap)', () => {
    const root = setup();
    startFirstStory(root);
    const callsBefore = order(speech);
    findByAria(root, 'What happens next?')?.click();
    const calls = order(speech).slice(callsBefore.length);
    expect(calls).toEqual(['stop', 'speak']);
  });

  test('Repeat replays the current prompt in both phases', () => {
    const root = setup();
    findByAria(root, 'Repeat prompt')?.click();
    expect(speech.repeatLast).toHaveBeenCalledTimes(1);
    startFirstStory(root);
    findByAria(root, 'Repeat prompt')?.click();
    expect(speech.repeatLast).toHaveBeenCalledTimes(2);
  });

  test('leaving the story stops narration', () => {
    setup();
    const stops = speech.stop.mock.calls.length;
    destroyStoryStage();
    expect(speech.stop.mock.calls.length).toBeGreaterThan(stops);
  });

  test('Tell it again restarts the same story from the beginning', () => {
    const root = setup();
    startFirstStory(root);
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

  test('New story at an ending returns to the Pick Three setup', () => {
    const root = setup();
    startFirstStory(root);
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'Follow the sparkly path')?.click();
    findByAria(root, 'What happens next?')?.click();
    findByAria(root, 'Blow gentle bubbles')?.click();
    expect(findByAria(root, 'New story')).toBeDefined();

    findByAria(root, 'New story')?.click();
    expect(stepTitle(root)).toBe('Who is the story about?');
    expect(speech.speak.mock.calls.at(-1)?.[0]).toBe('Who is the story about?');
    expect(findByClass(root, 'story-stage__caption')).toBeUndefined();
    // A fresh selection is required: Next is gated again.
    expect(findByAria(root, 'Next step')?.disabled).toBe(true);
  });

  test('the runtime has no event sink and decorative layers are hidden', () => {
    const root = setup();
    startFirstStory(root);
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
