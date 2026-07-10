/**
 * Number Train round planning — deterministic and local.
 *
 * `buildSessionPlan` generates a short graduated trip from a stable seed: no
 * `Math.random`, no clock, so the same seed and config always reproduce the
 * same plan (testable, replayable). `validatePlan` is the contract every
 * generator is held to: quantities within bounds, a present correct answer,
 * no duplicate choices, no negatives, nothing above the configured maximum.
 */

import type {
  NumberTrainPlan,
  NumberTrainRound,
  NumberTrainSessionConfig,
} from './number-train.types';

/** Hard ceiling of the Number Train data model (sessions author below this). */
export const NUMBER_TRAIN_ABSOLUTE_MAX = 50;

const COUNT_PROMPT = 'How many passengers are riding?';

/**
 * Build one deterministic session: `round_count` Count-the-Train rounds whose
 * quantities ramp from an easy confidence start (~3) to a slight stretch near
 * `max_quantity`, never decreasing, with seed-jittered variety. Distractors
 * are plausible neighbors (±1/±2) clamped to `0..max`. Throws if the generated
 * plan violates the validation contract (fail closed).
 */
export function buildSessionPlan(config: NumberTrainSessionConfig): NumberTrainPlan {
  const maxQuantity = clampMaxQuantity(config.max_quantity);
  const roundCount = clampRoundCount(config.round_count);
  const random = mulberry32(config.seed);

  const rounds: NumberTrainRound[] = [];
  let previousQuantity = 0;

  for (let index = 0; index < roundCount; index += 1) {
    // Ramp: lerp from an easy start to just under the max, ±1 seeded jitter.
    const progress = roundCount === 1 ? 1 : index / (roundCount - 1);
    const rampTarget = 3 + progress * (maxQuantity - 4);
    const jitter = Math.floor(random() * 3) - 1;
    let quantity = clamp(Math.round(rampTarget) + jitter, 1, maxQuantity);

    // Difficulty increases gradually: never step below an earlier round, and
    // avoid identical back-to-back quantities where the range allows it.
    if (quantity < previousQuantity) quantity = previousQuantity;
    if (quantity === previousQuantity && quantity < maxQuantity) quantity += 1;
    previousQuantity = quantity;

    const kind = roundKindAt(index, roundCount, maxQuantity);
    if (kind === 'load_train') {
      rounds.push({
        kind: 'load_train',
        target: quantity,
        prompt: `Put ${quantity} passengers on the train.`,
      });
    } else if (kind === 'missing_station') {
      rounds.push(buildMissingStationRound(quantity, maxQuantity, random));
    } else {
      rounds.push({
        kind: 'count_train',
        quantity,
        choices: buildChoices(quantity, maxQuantity, random),
        prompt: COUNT_PROMPT,
      });
    }
  }

  const plan: NumberTrainPlan = { max_quantity: maxQuantity, rounds };

  const errors = validatePlan(plan);
  if (errors.length > 0) {
    throw new Error(`Invalid Number Train plan: ${errors.join('; ')}`);
  }

  return plan;
}

/**
 * Deterministic trip composition. On the standard six-round trip the child
 * counts first (confidence), builds a quantity at round 4, fills a missing
 * station number at round 5, and finishes with a stretch count. Shorter
 * authored trips keep one build round near the middle. Sequence rounds need a
 * consecutive path of at least three numbers, so they appear only on trips of
 * six or more rounds AND when the session max supports the path — tiny
 * authored maxima (1–2) substitute a count round instead of failing the plan.
 */
function roundKindAt(
  index: number,
  roundCount: number,
  maxQuantity: number
): 'count_train' | 'load_train' | 'missing_station' {
  if (roundCount < 3) return 'count_train';
  if (roundCount < 6) {
    return index === roundCount - 2 ? 'load_train' : 'count_train';
  }
  if (index === 3) return 'load_train';
  if (index === 4) return maxQuantity >= 3 ? 'missing_station' : 'count_train';
  return 'count_train';
}

/**
 * A four-number consecutive path anchored near the ramp quantity, with a
 * seeded blank. The number line never dips below 1 or above the session max.
 */
function buildMissingStationRound(
  quantity: number,
  maxQuantity: number,
  random: () => number
): NumberTrainRound {
  const pathLength = Math.min(4, maxQuantity);
  const start = clamp(quantity - 2, 1, Math.max(1, maxQuantity - (pathLength - 1)));
  const sequence = Array.from({ length: pathLength }, (_, i) => start + i);
  const missingIndex = Math.floor(random() * sequence.length);
  const answer = sequence[missingIndex];

  return {
    kind: 'missing_station',
    sequence,
    missing_index: missingIndex,
    choices: buildChoices(answer, maxQuantity, random),
    prompt: 'Which number is missing on the track?',
  };
}

/** Three choices: the answer plus two neighbor distractors, seed-ordered. */
function buildChoices(
  quantity: number,
  maxQuantity: number,
  random: () => number
): number[] {
  const candidates = [quantity - 2, quantity - 1, quantity + 1, quantity + 2]
    .filter((value) => value >= 0 && value <= maxQuantity && value !== quantity);

  // Pick two distinct distractors by seed.
  const distractors: number[] = [];
  const pool = [...candidates];
  while (distractors.length < 2 && pool.length > 0) {
    const pick = Math.floor(random() * pool.length);
    distractors.push(pool.splice(pick, 1)[0]);
  }

  const choices = [quantity, ...distractors];
  // Seeded order so the correct answer's position varies between rounds.
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

/**
 * mulberry32 — tiny deterministic PRNG. Pure function of the seed; no
 * dependency, no clock, so plans are reproducible in tests and on replay.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

function clampRoundCount(value: number): number {
  if (!Number.isInteger(value)) return 6;
  return clamp(value, 1, 12);
}

/**
 * Enforce the round-plan rules every generator must obey. Returns human-readable
 * problems; an empty array means the plan is valid.
 */
export function validatePlan(plan: NumberTrainPlan): string[] {
  const errors: string[] = [];

  if (
    !Number.isInteger(plan.max_quantity) ||
    plan.max_quantity < 1 ||
    plan.max_quantity > NUMBER_TRAIN_ABSOLUTE_MAX
  ) {
    errors.push(`max_quantity ${plan.max_quantity} outside 1..${NUMBER_TRAIN_ABSOLUTE_MAX}`);
  }

  if (plan.rounds.length === 0) {
    errors.push('plan has no rounds');
  }

  plan.rounds.forEach((round, index) => {
    errors.push(...validateRound(round, plan.max_quantity, index));
  });

  return errors;
}

function validateRound(
  round: NumberTrainRound,
  maxQuantity: number,
  index: number
): string[] {
  const errors: string[] = [];
  const where = `round ${index + 1} (${round.kind})`;

  if (round.kind === 'load_train') {
    if (!Number.isInteger(round.target) || round.target < 1) {
      errors.push(`${where}: target ${round.target} must be a positive integer`);
    }
    if (round.target > maxQuantity) {
      errors.push(`${where}: target ${round.target} above max ${maxQuantity}`);
    }
    if (round.prompt.trim().length === 0) {
      errors.push(`${where}: empty prompt`);
    }
    return errors;
  }

  if (round.kind === 'missing_station') {
    if (round.sequence.length < 3) {
      errors.push(`${where}: sequence needs at least three numbers`);
    }
    for (let i = 0; i < round.sequence.length; i += 1) {
      const value = round.sequence[i];
      if (!Number.isInteger(value) || value < 0 || value > maxQuantity) {
        errors.push(`${where}: sequence value ${value} outside 0..${maxQuantity}`);
      }
      if (i > 0 && value !== round.sequence[i - 1] + 1) {
        errors.push(`${where}: sequence is not consecutive ascending`);
        break;
      }
    }
    if (
      !Number.isInteger(round.missing_index) ||
      round.missing_index < 0 ||
      round.missing_index >= round.sequence.length
    ) {
      errors.push(`${where}: missing_index ${round.missing_index} out of range`);
      return errors;
    }
    const answer = round.sequence[round.missing_index];
    if (round.choices.length < 2) {
      errors.push(`${where}: needs at least two choices`);
    }
    if (new Set(round.choices).size !== round.choices.length) {
      errors.push(`${where}: duplicate choices`);
    }
    if (!round.choices.includes(answer)) {
      errors.push(`${where}: missing number ${answer} absent from choices`);
    }
    for (const choice of round.choices) {
      if (!Number.isInteger(choice) || choice < 0) {
        errors.push(`${where}: choice ${choice} is negative or non-integer`);
      }
      if (choice > maxQuantity) {
        errors.push(`${where}: choice ${choice} above max ${maxQuantity}`);
      }
    }
    if (round.prompt.trim().length === 0) {
      errors.push(`${where}: empty prompt`);
    }
    return errors;
  }

  if (!Number.isInteger(round.quantity) || round.quantity < 0) {
    errors.push(`${where}: quantity ${round.quantity} is negative or non-integer`);
  }
  if (round.quantity > maxQuantity) {
    errors.push(`${where}: quantity ${round.quantity} above max ${maxQuantity}`);
  }
  if (round.choices.length < 2) {
    errors.push(`${where}: needs at least two choices`);
  }
  if (new Set(round.choices).size !== round.choices.length) {
    errors.push(`${where}: duplicate choices`);
  }
  if (!round.choices.includes(round.quantity)) {
    errors.push(`${where}: correct answer ${round.quantity} missing from choices`);
  }
  for (const choice of round.choices) {
    if (!Number.isInteger(choice) || choice < 0) {
      errors.push(`${where}: choice ${choice} is negative or non-integer`);
    }
    if (choice > maxQuantity) {
      errors.push(`${where}: choice ${choice} above max ${maxQuantity}`);
    }
  }
  if (round.prompt.trim().length === 0) {
    errors.push(`${where}: empty prompt`);
  }

  return errors;
}

function clampMaxQuantity(value: number): number {
  if (!Number.isInteger(value)) return 20;
  return Math.min(Math.max(value, 1), NUMBER_TRAIN_ABSOLUTE_MAX);
}
