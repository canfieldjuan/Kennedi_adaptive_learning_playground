/**
 * Fashion card completion object — the Dress-Up Studio ownership record.
 *
 * Pins the malformed-safe converter: a valid card round-trips exactly, an
 * optional sticker is preserved, and anything structurally wrong reads as null
 * so one bad stored record can never poison the collection. Unknown ids are
 * allowed through structurally (the art layer renders them fail-safe).
 */

import { describe, expect, test } from 'vitest';
import {
  FASHION_CARD_HISTORY_LIMIT,
  toFashionCardCompletion,
  type FashionCardCompletion,
} from '../../src/modules/dress-up-studio/fashion-cards';

function validCard(overrides: Partial<FashionCardCompletion> = {}): FashionCardCompletion {
  return {
    completion_id: 'card-1',
    session_id: 'session-1',
    doll_id: 'luna',
    tone_id: 'tone-light',
    hair_id: 'hair-ponytails',
    hair_color_id: 'haircolor-brown',
    glasses: false,
    outfit: { top: 'top-star-tee', shoes: 'shoes-sneakers' },
    accessory_ids: ['acc-bow'],
    scene_id: 'scene-park',
    frame_id: 'frame-gold-stars',
    created_at: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('toFashionCardCompletion', () => {
  test('a valid card round-trips exactly', () => {
    const card = validCard();
    expect(toFashionCardCompletion(card)).toEqual(card);
  });

  test('an optional card sticker is preserved', () => {
    const card = validCard({ sticker_id: 'sticker-heart' });
    expect(toFashionCardCompletion(card)?.sticker_id).toBe('sticker-heart');
  });

  test('a dress-only outfit (no top or bottom) is valid', () => {
    const card = validCard({ outfit: { dress: 'dress-party', shoes: 'shoes-flats' } });
    expect(toFashionCardCompletion(card)?.outfit).toEqual({
      dress: 'dress-party',
      shoes: 'shoes-flats',
    });
  });

  test('unknown ids are allowed structurally (art renders them fail-safe)', () => {
    const card = validCard({ tone_id: 'tone-does-not-exist', scene_id: 'scene-x' });
    expect(toFashionCardCompletion(card)).not.toBeNull();
  });

  test.each([
    ['missing completion_id', { completion_id: '' }],
    ['non-boolean glasses', { glasses: 'yes' as unknown as boolean }],
    ['missing scene_id', { scene_id: '' }],
    ['missing frame_id', { frame_id: '' }],
    ['empty sticker_id', { sticker_id: '' }],
  ])('drops a malformed card: %s', (_label, overrides) => {
    expect(toFashionCardCompletion(validCard(overrides))).toBeNull();
  });

  test('a non-string outfit value drops the whole card', () => {
    const card = { ...validCard(), outfit: { top: 42 } } as unknown;
    expect(toFashionCardCompletion(card)).toBeNull();
  });

  test('a non-string accessory id drops the whole card', () => {
    const card = { ...validCard(), accessory_ids: ['acc-bow', 7] } as unknown;
    expect(toFashionCardCompletion(card)).toBeNull();
  });

  test('non-object input is null', () => {
    expect(toFashionCardCompletion(null)).toBeNull();
    expect(toFashionCardCompletion('nope')).toBeNull();
    expect(toFashionCardCompletion(42)).toBeNull();
  });

  test('the collection cap is a small bounded number', () => {
    expect(FASHION_CARD_HISTORY_LIMIT).toBeGreaterThan(0);
    expect(FASHION_CARD_HISTORY_LIMIT).toBeLessThanOrEqual(24);
  });

  test('the completion object carries no evaluative fields', () => {
    const card = validCard() as unknown as Record<string, unknown>;
    for (const forbidden of ['outcome', 'score', 'correct', 'mastery', 'skill_ids']) {
      expect(card[forbidden]).toBeUndefined();
    }
  });
});
