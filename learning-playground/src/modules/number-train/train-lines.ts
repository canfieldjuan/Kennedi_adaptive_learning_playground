/**
 * Every spoken Number Train line, as pure builders — the single source of
 * truth shared by the activity runtime AND the voice-pack manifest collector,
 * so the Emma pack can enumerate exactly what the game can say (plans are
 * seeded in the activity JSON, so the round set is deterministic).
 */

import type { MissingStationRound } from './number-train.types';

export const SEATS_PER_CAR = 10;
export const DEFAULT_SUCCESS_TAIL = 'All aboard!';

export function countSuccessLine(quantity: number, tail: string): string {
  return `Yes! ${quantity} ${quantity === 1 ? 'passenger' : 'passengers'}. ${tail}`;
}

export function loadSuccessLine(target: number, tail: string): string {
  return `Yes! ${target} ${target === 1 ? 'passenger' : 'passengers'} aboard. ${tail}`;
}

export function sequenceSuccessLine(sequence: number[], tail: string): string {
  return `Yes! ${sequence.join(', ')}. ${tail}`;
}

/** Load-round support after a wrong Check; diff = target - built, nonzero. */
export function loadSupportLine(diff: number): string {
  return diff > 0
    ? `${diff} more ${diff === 1 ? 'passenger' : 'passengers'} needed.`
    : `${-diff} too many. Take ${-diff === 1 ? 'one' : 'some'} off.`;
}

/** Load-round structural hint; states the count and the exact next move. */
export function loadStructuralHintLine(built: number, diff: number): string {
  return diff > 0
    ? `You have ${built}. Put on ${diff} more.`
    : `You have ${built}. Take off ${-diff}.`;
}

export function buildCountingHint(quantity: number): string {
  if (quantity <= SEATS_PER_CAR) {
    const counts = Array.from({ length: quantity }, (_, i) => String(i + 1));
    return `Count each passenger: ${counts.join(', ')}.`;
  }
  const countOn = Array.from(
    { length: quantity - SEATS_PER_CAR + 1 },
    (_, i) => String(SEATS_PER_CAR + i)
  );
  return `One full car is ten passengers. Count on: ${countOn.join(', ')}.`;
}

export function buildSequenceHint(round: MissingStationRound): string {
  const walked = round.sequence
    .map((value, i) => (i === round.missing_index ? 'hmm' : String(value)))
    .join(', ');
  const question =
    round.missing_index === 0
      ? `What comes before ${round.sequence[1]}?`
      : `What comes after ${round.sequence[round.missing_index - 1]}?`;
  return `Count along the track: ${walked}. ${question}`;
}

/** Seats the load UI renders for a target — the bound on reachable counts. */
export function loadSeatCapacity(target: number): number {
  return Math.max(1, Math.ceil(target / SEATS_PER_CAR)) * SEATS_PER_CAR;
}
