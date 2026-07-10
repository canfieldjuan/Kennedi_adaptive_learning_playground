/**
 * Art gallery derivation — the child's collection of finished Bear Art
 * Studio pieces, as a PURE VIEW over the activity event log (the same
 * pattern as the progress profile). Nothing here stores anything: the event
 * log already owns persistence, parent export, and Clear Progress Data, so
 * the gallery inherits all three for free.
 *
 * Deterministic and DOM-free. Malformed metadata is skipped fail-safe; the
 * gallery is capped so it can never grow unbounded.
 */

import type { ActivityAttemptEvent } from '../types/events';

/** Newest-first cap on the derived collection. */
export const GALLERY_CAP = 12;

export type GalleryPieceKind =
  | 'stickers'
  | 'painted_subject'
  | 'pattern'
  | 'story'
  | 'fixed_card';

export interface GalleryPiece {
  /** The completion event this piece derives from. */
  event_id: string;
  activity_id: string;
  created_at: string;
  kind: GalleryPieceKind;
  /** Art surface id, e.g. decorate-card / bear-shirt / scarf / story-card. */
  surface_id: string;
  /** Sticker shape ids on the piece (may be empty). */
  sticker_ids: string[];
  /** Studio palette color ids relevant to the piece (may be empty). */
  color_ids: string[];
}

/**
 * Map one completed studio event's metadata to a piece descriptor. Shared
 * by the historical derivation and the runtime's just-finished piece, so
 * the two can never disagree. Returns null when the metadata cannot
 * honestly describe a piece.
 */
export function derivePieceFromCompletion(params: {
  eventId: string;
  activityId: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean>;
}): GalleryPiece | null {
  const { metadata } = params;
  if (metadata.game !== 'bear-art-studio') return null;

  const surfaceId = typeof metadata.art_surface_id === 'string'
    ? metadata.art_surface_id
    : '';
  if (surfaceId.length === 0) return null;

  const base = {
    event_id: params.eventId,
    activity_id: params.activityId,
    created_at: params.timestamp,
    surface_id: surfaceId,
  };

  switch (metadata.art_mode) {
    case 'free_decorate':
      return {
        ...base,
        kind: 'stickers',
        sticker_ids: splitIds(metadata.sticker_ids),
        color_ids: singleId(metadata.card_color_id),
      };
    case 'color_request':
      return {
        ...base,
        kind: 'painted_subject',
        sticker_ids: [],
        color_ids: singleId(metadata.requested_color_id),
      };
    case 'quantity_decorate': {
      const sticker = typeof metadata.sticker_id === 'string' ? metadata.sticker_id : '';
      const applied = typeof metadata.applied_quantity === 'number'
        ? metadata.applied_quantity
        : 0;
      if (sticker.length === 0 || applied < 1) return null;
      return {
        ...base,
        kind: 'stickers',
        sticker_ids: Array.from({ length: Math.min(applied, 8) }, () => sticker),
        color_ids: [],
      };
    }
    case 'pattern':
      return {
        ...base,
        kind: 'pattern',
        sticker_ids: [],
        color_ids: splitIds(metadata.applied_pattern),
      };
    case 'story_card':
      return {
        ...base,
        kind: 'story',
        sticker_ids: splitIds(metadata.selected_sticker_ids),
        color_ids: [],
      };
    case 'fix_art': {
      const region = typeof metadata.wrong_region_id === 'string'
        ? metadata.wrong_region_id
        : '';
      if (region.length === 0) return null;
      return {
        ...base,
        kind: 'fixed_card',
        sticker_ids: [region],
        color_ids: singleId(metadata.requested_color_id),
      };
    }
    default:
      return null;
  }
}

/** The child's gallery: newest first, capped, derived only from events. */
export function deriveArtGallery(events: ActivityAttemptEvent[]): GalleryPiece[] {
  const pieces: GalleryPiece[] = [];
  for (const event of events) {
    if (event.outcome !== 'completed' || !event.metadata) continue;
    const piece = derivePieceFromCompletion({
      eventId: event.event_id,
      activityId: event.activity_id,
      timestamp: event.timestamp,
      metadata: event.metadata,
    });
    if (piece) pieces.push(piece);
  }
  pieces.reverse();
  return pieces.slice(0, GALLERY_CAP);
}

function splitIds(value: unknown): string[] {
  if (typeof value !== 'string' || value.length === 0) return [];
  return value.split(',').filter((id) => id.length > 0);
}

function singleId(value: unknown): string[] {
  return typeof value === 'string' && value.length > 0 && value !== 'none'
    ? [value]
    : [];
}
