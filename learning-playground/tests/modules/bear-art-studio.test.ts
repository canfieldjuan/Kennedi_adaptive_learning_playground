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

  test('free decorate is an art table: brush, stickers, then Finish art', () => {
    const { root, events } = setup('art-studio-free-decorate');

    const doneButton = findByAria(root, 'Finish art');
    expect(doneButton?.disabled).toBe(true);
    // No slot grid anywhere — the canvas is the surface.
    expect(findAllByClass(root, 'bear-art-studio__slot')).toHaveLength(0);

    // A brush stroke: one summarized first-mark event, nothing per move.
    brushStroke(root, 100, 80, 12);
    expect(events.map((event) => event.outcome)).toEqual(['correct']);
    expect(events[0]?.metadata).toMatchObject({
      canvas_event: 'first_brush_mark',
      tool_mode: 'brush',
      selected_color_id: 'berry-pink',
    });
    expect(doneButton?.disabled).toBe(false);

    // More strokes add no more events (summarized evidence).
    brushStroke(root, 200, 120, 20);
    expect(events).toHaveLength(1);

    // Stickers place freely on the canvas.
    findByAria(root, 'Stickers')?.click();
    findByAria(root, 'star sticker')?.click();
    placeStickerAt(root, 300, 150);
    findByAria(root, 'heart sticker')?.click();
    placeStickerAt(root, 500, 300);
    expect(findAllByClass(root, 'bear-art-studio__placed')).toHaveLength(2);

    doneButton?.click();
    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[1]?.metadata).toMatchObject({
      sticker_ids: 'star,heart',
      placed_sticker_count: 2,
      colors_used: 'berry-pink',
      canvas_action_count: 4,
      art_surface_id: 'decorate-card',
    });
    expect(findByClass(root, 'activity-complete-actions')?.hidden).toBe(false);

    // Finishing twice does not double-log.
    doneButton?.click();
    expect(events).toHaveLength(2);
  });

  test('the sticker tool arms a sticker by itself and owns the choice row', () => {
    const { root } = setup('art-studio-free-decorate');

    const swatchGrid = findByClass(root, 'bear-art-studio__swatches');
    const stickerRow = findByClass(root, 'bear-art-studio__stickers');
    // Brush mode: colors visible, stickers hidden.
    expect(swatchGrid?.hidden).toBe(false);
    expect(stickerRow?.hidden).toBe(true);

    // Choosing the sticker tool must never leave the canvas dead: the first
    // sticker arms automatically and a canvas tap places it with no other
    // discovery step (this exact flow used to no-op silently).
    findByAria(root, 'Stickers')?.click();
    expect(stickerRow?.hidden).toBe(false);
    expect(swatchGrid?.hidden).toBe(true);
    expect(
      findByAria(root, 'star sticker')?.classList.contains('is-selected')
    ).toBe(true);
    expect(findByClassText(root, 'activity-feedback')).toBe(
      'Tap your picture to add stickers!'
    );
    placeStickerAt(root, 240, 180);
    expect(findAllByClass(root, 'bear-art-studio__placed')).toHaveLength(1);

    // Picking a different sticker still works exactly as before.
    findByAria(root, 'heart sticker')?.click();
    expect(
      findByAria(root, 'star sticker')?.classList.contains('is-selected')
    ).toBe(false);
    placeStickerAt(root, 420, 260);
    expect(findAllByClass(root, 'bear-art-studio__placed')).toHaveLength(2);

    // Back to brush: the rows swap back.
    findByAria(root, 'Brush')?.click();
    expect(swatchGrid?.hidden).toBe(false);
    expect(stickerRow?.hidden).toBe(true);
  });

  test('the chain button routes to the next art request', () => {
    const { root } = setup('art-studio-free-decorate');
    findByAria(root, 'star sticker')?.click();
    findByAria(root, 'Art spot 1')?.click();
    findByAria(root, 'Finish art')?.click();

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

  test('a brush stroke in the requested color completes the color request', () => {
    const { root, events } = setup('art-studio-pink-request');

    findByAria(root, 'Brush')?.click();
    findByColorId(root, 'berry-pink')?.click();
    brushStroke(root, 200, 150, 8);

    expect(events.map((event) => event.outcome)).toEqual(['correct', 'completed']);
    expect(events[0]?.metadata).toMatchObject({
      requested_color_id: 'berry-pink',
      selected_color_id: 'berry-pink',
      tool_mode: 'brush',
    });
  });

  test('a wrong-color brush stroke is one gentle attempt, not a stream', () => {
    const { root, events } = setup('art-studio-pink-request');

    findByAria(root, 'Brush')?.click();
    findByColorId(root, 'sunny-yellow')?.click();
    brushStroke(root, 200, 150, 15);

    // One attempt per stroke end — never one per pointer move.
    expect(events.map((event) => event.outcome)).toEqual(['incorrect']);
    expect(events[0]?.metadata).toMatchObject({
      requested_color_id: 'berry-pink',
      selected_color_id: 'sunny-yellow',
      tool_mode: 'brush',
    });
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

  test('quantity counts free placements and completes at the asked number', () => {
    const { root, events } = setup('art-studio-three-stars');

    // No grid, no Check button: the canvas is the card.
    expect(findAllByClass(root, 'bear-art-studio__slot')).toHaveLength(0);
    expect(findByText(root, 'Check')).toBeUndefined();

    placeStickerAt(root, 100, 100);
    placeStickerAt(root, 300, 200);
    expect(events.map((event) => event.outcome)).toEqual(['correct', 'correct']);
    expect(events[1]?.metadata).toMatchObject({
      sticker_id: 'star',
      placed_sticker_count: 2,
      requested_quantity: 3,
    });

    // Tapping a placed star removes it (self-correction below the goal);
    // re-placing to the same count does not double-log.
    findAllByClass(root, 'bear-art-studio__placed')[1]?.click();
    expect(findAllByClass(root, 'bear-art-studio__placed')).toHaveLength(1);
    placeStickerAt(root, 420, 260);
    expect(events).toHaveLength(2);

    // The third star completes the count.
    placeStickerAt(root, 600, 320);
    expect(events.map((event) => event.outcome)).toEqual([
      'correct',
      'correct',
      'correct',
      'completed',
    ]);
    expect(events[3]?.metadata).toMatchObject({
      requested_quantity: 3,
      applied_quantity: 3,
      placed_sticker_count: 3,
    });
    expect(events[3]?.skill_ids).toEqual(['counting']);

    // Locked after completion: further taps place nothing.
    placeStickerAt(root, 650, 350);
    expect(findAllByClass(root, 'bear-art-studio__placed')).toHaveLength(3);
    expect(events).toHaveLength(4);
  });

  test('five-flower variant records difficulty-3 structured counting evidence', () => {
    const activity = getActivity('art-studio-five-flowers');
    const { root, events } = setup('art-studio-five-flowers');

    expect(activity.safety).toMatchObject({
      requires_parent_approval: true,
      external_links_allowed: false,
    });
    expect(activity.transfer.context_type).toBe('same_format_new_examples');

    // Free placement on the canvas: five flowers complete the count.
    for (let index = 0; index < 5; index += 1) {
      placeStickerAt(root, 80 + index * 120, 120 + (index % 2) * 140);
    }

    expect(events.map((event) => event.outcome)).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct', 'completed',
    ]);
    expect(events[5]).toMatchObject({
      skill_ids: ['counting'],
      difficulty_level: 3,
      choice_count: 6,
      distractor_strength: 'medium',
      selected_answer: '5',
      correct_answer: '5',
      metadata: {
        requested_quantity: 5,
        applied_quantity: 5,
        sticker_id: 'flower',
      },
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

  test('story card accepts what belongs and gently rejects what does not', () => {
    const { root, events } = setup('art-studio-story-outside');

    // The request card shows only HOW MANY belong — never which.
    const request = findByClass(root, 'bear-art-studio__request');
    expect(request?.innerHTML).toContain('bear-art-studio__request-slot');
    expect(request?.innerHTML).not.toContain('studio-shape-svg');

    // A distractor (moon: the story is daytime) wiggles, records honest
    // category evidence, and fills nothing.
    findByAria(root, 'moon sticker')?.click();
    expect(events.map((event) => event.outcome)).toEqual(['incorrect']);
    expect(events[0]?.metadata).toMatchObject({
      story_theme: 'going-outside',
      sticker_id: 'moon',
      belongs_to_story: false,
    });
    expect(events[0]?.skill_ids).toEqual(['vocabulary']);

    // Second miss brings a hint glow on a story sticker; nothing auto-places.
    findByAria(root, 'star sticker')?.click();
    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
    ]);
    const hinted = ['sun', 'flower'].filter((id) =>
      findByAria(root, `${id} sticker`)?.classList.contains('is-hinted')
    );
    expect(hinted).toHaveLength(1);

    // The story stickers pop onto the card; completing them all finishes.
    findByAria(root, 'sun sticker')?.click();
    findByAria(root, 'flower sticker')?.click();
    expect(events.map((event) => event.outcome)).toEqual([
      'incorrect',
      'incorrect',
      'hint_used',
      'correct',
      'correct',
      'completed',
    ]);
    expect(events[5]?.metadata).toMatchObject({
      story_theme: 'going-outside',
      required_sticker_ids: 'sun,flower',
      selected_sticker_ids: 'sun,flower',
    });
  });

  test('a placed story sticker cannot double-place or double-log', () => {
    const { root, events } = setup('art-studio-story-outside');

    findByAria(root, 'sun sticker')?.click();
    findByAria(root, 'sun sticker')?.click();
    expect(events.map((event) => event.outcome)).toEqual(['correct']);
  });

  test('dress-up paints the shirt with the fill tool and decorates freely', () => {
    const { root, events } = setup('art-studio-dress-bear');

    const shirt = findByClass(root, 'bear-art-studio__surface');
    expect(shirt?.innerHTML).toContain('studio-shirt-svg');
    expect(shirt?.attributes['aria-hidden']).toBe('true');

    // Fill tool + swatch repaints the shirt itself.
    findByAria(root, 'Fill')?.click();
    findByColorId(root, 'berry-pink')?.click();
    expect(shirt?.innerHTML).toContain('#fd79a8');

    // Stickers land anywhere on the shirt canvas.
    findByAria(root, 'Stickers')?.click();
    findByAria(root, 'heart sticker')?.click();
    placeStickerAt(root, 350, 220);
    findByAria(root, 'Finish art')?.click();

    const completed = events.find((event) => event.outcome === 'completed');
    expect(completed?.metadata).toMatchObject({
      art_surface_id: 'bear-shirt',
      card_color_id: 'berry-pink',
      sticker_ids: 'heart',
    });
  });

  test('finished art gets the gallery frame beat', () => {
    const { root } = setup('art-studio-pink-request');

    findByColorId(root, 'berry-pink')?.click();
    findByClass(root, 'bear-art-studio__subject')?.click();

    expect(
      findByClass(root, 'bear-art-studio__easel')?.classList.contains('is-gallery')
    ).toBe(true);
  });

  test('the chain runs fix, story, poster, wall picture, then dress-up', () => {
    const fix = getActivity('art-studio-fix-card');
    expect(fix.content.next_activity_id).toBe('art-studio-story-outside');
    const story = getActivity('art-studio-story-outside');
    expect(story.content.next_activity_id).toBe('art-studio-stage-poster');
    const poster = getActivity('art-studio-stage-poster');
    expect(poster.content.next_activity_id).toBe('art-studio-wall-picture');
    const wall = getActivity('art-studio-wall-picture');
    expect(wall.content.next_activity_id).toBe('art-studio-dress-bear');
    const dress = getActivity('art-studio-dress-bear');
    expect(dress.content.next_activity_id).toBeUndefined();
  });

  test('the poster and wall-frame surfaces render, fill, and finish', () => {
    const poster = setup('art-studio-stage-poster');
    const posterSurface = findByClass(poster.root, 'bear-art-studio__surface');
    expect(posterSurface?.innerHTML).toContain('studio-poster-svg');
    findByAria(poster.root, 'Fill')?.click();
    findByColorId(poster.root, 'tomato-red')?.click();
    expect(posterSurface?.innerHTML).toContain('#e05d5d');
    findByAria(poster.root, 'Finish art')?.click();
    const posterDone = poster.events.find((e) => e.outcome === 'completed');
    expect(posterDone?.metadata).toMatchObject({ art_surface_id: 'stage-poster' });
    destroyBearArtStudioActivity();

    const wall = setup('art-studio-wall-picture');
    const wallSurface = findByClass(wall.root, 'bear-art-studio__surface');
    expect(wallSurface?.innerHTML).toContain('studio-wall-frame-svg');
    findByAria(wall.root, 'Fill')?.click();
    findByColorId(wall.root, 'leaf-green')?.click();
    expect(wallSurface?.innerHTML).toContain('#00b894');
    findByAria(wall.root, 'Stickers')?.click();
    findByAria(wall.root, 'moon sticker')?.click();
    placeStickerAt(wall.root, 300, 200);
    findByAria(wall.root, 'Finish art')?.click();
    const wallDone = wall.events.find((e) => e.outcome === 'completed');
    expect(wallDone?.metadata).toMatchObject({
      art_surface_id: 'bear-house-wall',
      sticker_ids: 'moon',
    });
  });

  test('finishing shows the gallery shelf: live piece first, then history', () => {
    const history = [{
      event_id: 'old-1',
      activity_id: 'art-studio-pink-request',
      created_at: '2026-07-10T11:00:00.000Z',
      kind: 'painted_subject' as const,
      surface_id: 'heart-card',
      sticker_ids: [],
      color_ids: ['berry-pink'],
    }];
    const root = document.createElement('div') as unknown as MockElement;
    renderBearArtStudioActivity(root as unknown as HTMLElement, {
      activity: getActivity('art-studio-free-decorate'),
      childId: 'local-child',
      sessionId: 'session-1',
      speech: createMockSpeech(),
      audio: createMockAudio(),
      onEvent: vi.fn(),
      gallery: history,
    });

    const shelf = findByClass(root, 'bear-art-studio__shelf');
    expect(shelf?.hidden).toBe(true);

    brushStroke(root, 120, 90);
    findByAria(root, 'Finish art')?.click();

    expect(shelf?.hidden).toBe(false);
    expect(shelf?.children).toHaveLength(2);
    expect(shelf?.children[0]?.className).toContain('bear-art-studio__mini--new');
    expect(shelf?.children[0]?.innerHTML).toContain('bear-art-studio__mini-svg');
    expect(shelf?.children[1]?.className).not.toContain('--new');
  });

  test('free decorate completion carries the full piece descriptor', () => {
    const { root, events } = setup('art-studio-free-decorate');

    findByColorId(root, 'sunny-yellow')?.click();
    brushStroke(root, 150, 120);
    findByAria(root, 'Stickers')?.click();
    findByAria(root, 'heart sticker')?.click();
    placeStickerAt(root, 400, 240);
    findByAria(root, 'Finish art')?.click();

    const completed = events.find((event) => event.outcome === 'completed');
    expect(completed?.metadata).toMatchObject({
      sticker_ids: 'heart',
      card_color_id: 'sunny-yellow',
      colors_used: 'sunny-yellow',
      art_surface_id: 'decorate-card',
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
  private readonly listeners: Record<string, Array<(event?: unknown) => void>> = {};

  parentElement: MockElement | null = null;
  constructor(tagName: string) { this.tagName = tagName.toUpperCase(); }
  appendChild(child: MockElement): MockElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 0, top: 0, width: 800, height: 500 };
  }
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

function paintLayer(root: MockElement): MockElement {
  const layer = findByClass(root, 'bear-art-studio__paint-layer');
  if (!layer) throw new Error('Missing paint layer');
  return layer;
}

function brushStroke(root: MockElement, x = 120, y = 90, moves = 3): void {
  const layer = paintLayer(root);
  layer.fire('pointerdown', { clientX: x, clientY: y, stopPropagation: () => {} });
  for (let index = 0; index < moves; index += 1) {
    layer.fire('pointermove', { clientX: x + index * 8, clientY: y + index * 5 });
  }
  layer.fire('pointerup', {});
}

function placeStickerAt(root: MockElement, x: number, y: number): void {
  paintLayer(root).fire('click', { clientX: x, clientY: y, stopPropagation: () => {} });
}

function findByColorId(element: MockElement, colorId: string): MockElement | undefined {
  if (element.dataset.colorId === colorId) return element;
  for (const child of element.children) {
    const match = findByColorId(child, colorId);
    if (match) return match;
  }
  return undefined;
}
