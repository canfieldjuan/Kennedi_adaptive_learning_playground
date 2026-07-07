/**
 * LearningActivity — the universal schema for every activity in the playground.
 * Every game, puzzle, or exercise must conform to this shape.
 */

import type { LearningDomain, InteractionModel, DistractorStrength } from './domains';

export type TransferContextType =
  | 'same_format_same_examples'
  | 'same_format_new_examples'
  | 'different_prompt_mode'
  | 'different_interaction_model'
  | 'reverse_mapping'
  | 'category_sort'
  | 'delayed_review'
  | 'parent_observed_real_world';

export const TRANSFER_CONTEXT_TYPES: TransferContextType[] = [
  'same_format_same_examples',
  'same_format_new_examples',
  'different_prompt_mode',
  'different_interaction_model',
  'reverse_mapping',
  'category_sort',
  'delayed_review',
  'parent_observed_real_world',
];

export type TransferContextStrength =
  | 'weak'
  | 'medium'
  | 'strong'
  | 'retention';

export const TRANSFER_CONTEXT_STRENGTHS: Record<
  TransferContextType,
  TransferContextStrength
> = {
  same_format_same_examples: 'weak',
  same_format_new_examples: 'weak',
  different_prompt_mode: 'medium',
  different_interaction_model: 'medium',
  reverse_mapping: 'strong',
  category_sort: 'strong',
  delayed_review: 'retention',
  parent_observed_real_world: 'strong',
};

export function getTransferContextStrength(
  contextType: TransferContextType
): TransferContextStrength {
  return TRANSFER_CONTEXT_STRENGTHS[contextType];
}

export function isLikelyMasteryTransferStrength(
  strength: TransferContextStrength
): boolean {
  return strength === 'medium' || strength === 'strong';
}

export function isTransferContextType(value: string): value is TransferContextType {
  return TRANSFER_CONTEXT_TYPES.includes(value as TransferContextType);
}

export type TransferPromptMode =
  | 'visual'
  | 'spoken'
  | 'mixed'
  | 'symbolic'
  | 'real_world';

export interface ActivityTransferMetadata {
  skill_ids: string[];
  context_type: TransferContextType;
  context_id: string;
  example_set_id: string;
  prompt_mode: TransferPromptMode;
}

export interface LearningActivity {
  id: string;
  version: number;
  title: string;
  domain: LearningDomain;
  skill_ids: string[];
  transfer: ActivityTransferMetadata;
  difficulty: {
    level: 0 | 1 | 2 | 3 | 4 | 5;
    choice_count: number;
    distractor_strength: DistractorStrength;
  };
  interaction_model: InteractionModel;
  estimated_duration_seconds: number;
  content: Record<string, unknown>;
  success_rules: Record<string, unknown>;
  feedback_rules: Record<string, unknown>;
  safety: {
    requires_parent_approval: boolean;
    external_links_allowed: false;
    contains_video?: boolean;
    contains_audio?: boolean;
  };
}
