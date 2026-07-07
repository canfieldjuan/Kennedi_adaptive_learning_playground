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
