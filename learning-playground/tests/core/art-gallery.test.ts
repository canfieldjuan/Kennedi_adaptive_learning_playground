/**
 * Art gallery derivation tests — the gallery is a pure view over the event
 * log: only completed studio events become pieces, newest first, capped,
 * and malformed metadata is skipped instead of crashing the view.
 */

import { describe, expect, test } from 'vitest';
import {
  deriveArtGallery,
  derivePieceFromCompletion,
  GALLERY_CAP,
} from '../../src/core/art-gallery';
import type { ActivityAttemptEvent } from '../../src/types/events';

function makeEvent(overrides: {
  event_id: string;
  outcome?: ActivityAttemptEvent['outcome'];
  activity_id?: string;
  timestamp?: string;
  metadata?: Record<string, string | number | boolean>;
}): ActivityAttemptEvent {
  return {
    event_id: overrides.event_id,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: overrides.activity_id ?? 'art-studio-free-decorate',
    activity_version: 1,
    skill_ids: ['color_fill'],
    timestamp: overrides.timestamp ?? '2026-07-10T12:00:00.000Z',
    prompt_text: 'prompt',
    outcome: overrides.outcome ?? 'completed',
    selected_answer: 'x',
    correct_answer: 'x',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 0,
    choice_count: 4,
    distractor_strength: 'none',
    input_type: 'tap',
    hint_shown: false,
    metadata: overrides.metadata,
  };
}

const FREE_METADATA = {
  game: 'bear-art-studio',
  art_mode: 'free_decorate',
  sticker_ids: 'star,heart',
  card_color_id: 'berry-pink',
  art_surface_id: 'decorate-card',
};

describe('art gallery derivation', () => {
  test('only completed studio events become pieces', () => {
    const events = [
      makeEvent({ event_id: 'e1', metadata: FREE_METADATA }),
      makeEvent({ event_id: 'e2', outcome: 'correct', metadata: FREE_METADATA }),
      makeEvent({ event_id: 'e3', metadata: { game: 'number-train', art_mode: 'free_decorate' } }),
      makeEvent({ event_id: 'e4' }), // no metadata
    ];

    const gallery = deriveArtGallery(events);
    expect(gallery).toHaveLength(1);
    expect(gallery[0]).toMatchObject({
      event_id: 'e1',
      kind: 'stickers',
      sticker_ids: ['star', 'heart'],
      color_ids: ['berry-pink'],
      surface_id: 'decorate-card',
    });
  });

  test('newest piece first, capped at the gallery limit', () => {
    const events = Array.from({ length: GALLERY_CAP + 3 }, (_, index) =>
      makeEvent({
        event_id: `e${index}`,
        timestamp: `2026-07-10T12:00:${String(index).padStart(2, '0')}.000Z`,
        metadata: FREE_METADATA,
      })
    );

    const gallery = deriveArtGallery(events);
    expect(gallery).toHaveLength(GALLERY_CAP);
    expect(gallery[0]?.event_id).toBe(`e${GALLERY_CAP + 2}`);
    expect(gallery[gallery.length - 1]?.event_id).toBe('e3');
  });

  test('every studio mode maps to an honest descriptor', () => {
    const base = { eventId: 'e', activityId: 'a', timestamp: 't' };

    expect(derivePieceFromCompletion({
      ...base,
      metadata: {
        game: 'bear-art-studio', art_mode: 'color_request',
        requested_color_id: 'berry-pink', art_surface_id: 'heart-card',
      },
    })).toMatchObject({ kind: 'painted_subject', color_ids: ['berry-pink'] });

    expect(derivePieceFromCompletion({
      ...base,
      metadata: {
        game: 'bear-art-studio', art_mode: 'quantity_decorate',
        sticker_id: 'star', applied_quantity: 3, art_surface_id: 'count-card',
      },
    })).toMatchObject({ kind: 'stickers', sticker_ids: ['star', 'star', 'star'] });

    expect(derivePieceFromCompletion({
      ...base,
      metadata: {
        game: 'bear-art-studio', art_mode: 'pattern',
        applied_pattern: 'berry-pink,sunny-yellow', art_surface_id: 'scarf',
      },
    })).toMatchObject({ kind: 'pattern', color_ids: ['berry-pink', 'sunny-yellow'] });

    expect(derivePieceFromCompletion({
      ...base,
      metadata: {
        game: 'bear-art-studio', art_mode: 'story_card',
        selected_sticker_ids: 'sun,flower', art_surface_id: 'story-card',
      },
    })).toMatchObject({ kind: 'story', sticker_ids: ['sun', 'flower'] });

    expect(derivePieceFromCompletion({
      ...base,
      metadata: {
        game: 'bear-art-studio', art_mode: 'fix_art',
        wrong_region_id: 'star', requested_color_id: 'sunny-yellow',
        art_surface_id: 'fix-card',
      },
    })).toMatchObject({ kind: 'fixed_card', sticker_ids: ['star'] });
  });

  test('malformed metadata is skipped fail-safe', () => {
    const base = { eventId: 'e', activityId: 'a', timestamp: 't' };
    expect(derivePieceFromCompletion({
      ...base,
      metadata: { game: 'bear-art-studio', art_mode: 'mystery' },
    })).toBeNull();
    expect(derivePieceFromCompletion({
      ...base,
      metadata: { game: 'bear-art-studio', art_mode: 'quantity_decorate', applied_quantity: 0, sticker_id: 'star', art_surface_id: 's' },
    })).toBeNull();
    expect(derivePieceFromCompletion({
      ...base,
      metadata: { game: 'bear-art-studio', art_mode: 'free_decorate' },
    })).toBeNull();
  });
});
