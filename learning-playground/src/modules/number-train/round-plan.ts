/**
 * Number Train round planning — deterministic and local.
 *
 * Slice 1 ships one fixed foundation round; the seeded multi-round session
 * generator lands in the next slice. The validation contract starts here so
 * every future generator is held to the same rules: quantities within bounds,
 * a present correct answer, and no duplicate choices.
 */

import type { NumberTrainPlan, NumberTrainRound } from './number-train.types';

/** Hard ceiling of the Number Train data model (sessions author below this). */
export const NUMBER_TRAIN_ABSOLUTE_MAX = 50;

/**
 * The fixed slice-1 plan: one Count-the-Train round, quantity 7 in a single
 * car, numeral choices 6 / 7 / 8. Deterministic by construction.
 */
export function buildFoundationPlan(maxQuantity: number = 20): NumberTrainPlan {
  const plan: NumberTrainPlan = {
    max_quantity: clampMaxQuantity(maxQuantity),
    rounds: [
      {
        kind: 'count_train',
        quantity: 7,
        choices: [6, 7, 8],
        prompt: 'How many passengers are riding?',
      },
    ],
  };

  const errors = validatePlan(plan);
  if (errors.length > 0) {
    throw new Error(`Invalid Number Train plan: ${errors.join('; ')}`);
  }

  return plan;
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
