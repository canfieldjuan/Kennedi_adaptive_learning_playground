/**
 * Number Train world registry — the single lookup the runtime and the
 * selector use. Train Station is the stable default; resolution is
 * fail-open: an unknown, removed, or malformed preferred id silently
 * resolves to the default so a stale saved preference can never break the
 * game.
 */

import { TRAIN_STATION_WORLD } from './worlds/train-station/train-station.world';
import type { NumberTrainWorldPack } from './world-pack.types';

export const NUMBER_TRAIN_WORLDS: NumberTrainWorldPack[] = [
  TRAIN_STATION_WORLD,
];

export const DEFAULT_WORLD_ID = TRAIN_STATION_WORLD.id;

/** Resolve a (possibly missing/foreign/malformed) preferred world id. */
export function resolveNumberTrainWorld(
  preferredId?: unknown
): NumberTrainWorldPack {
  if (typeof preferredId === 'string') {
    const match = NUMBER_TRAIN_WORLDS.find((world) => world.id === preferredId);
    if (match) return match;
  }
  return TRAIN_STATION_WORLD;
}
