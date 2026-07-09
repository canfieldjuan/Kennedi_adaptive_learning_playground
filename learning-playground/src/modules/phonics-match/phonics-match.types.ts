/**
 * Word game (phonics) runtime types.
 */

export interface PhonicsMatchChoice {
  id: string;
  label: string;
  image?: string;
  correct?: boolean;
}

export interface PhonicsFeedbackRule {
  speech?: string;
  sound?: string;
  highlight_target?: boolean;
}
