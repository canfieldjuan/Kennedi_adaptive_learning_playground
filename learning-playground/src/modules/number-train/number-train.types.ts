/**
 * Number Train types — deliberately narrow (issue: Number Train arc, slice 1).
 * The round union grows as later slices add Load-the-Train (quantity
 * construction) and Missing Station (number sequence). Do not generalize these
 * into a speculative Math-game framework; future games get their own types.
 */

/** Count the Train: a preloaded quantity; the child picks the matching numeral. */
export interface CountTrainRound {
  kind: 'count_train';
  /** Passengers seated on the train for this round. */
  quantity: number;
  /** Numeral options shown to the child; contains `quantity` exactly once. */
  choices: number[];
  /** Short spoken prompt for the round. */
  prompt: string;
}

/** All Number Train round shapes (union grows in later slices). */
export type NumberTrainRound = CountTrainRound;

export interface NumberTrainPlan {
  rounds: NumberTrainRound[];
  /** Upper bound any round quantity/answer may reach (data model supports 0–50). */
  max_quantity: number;
}
