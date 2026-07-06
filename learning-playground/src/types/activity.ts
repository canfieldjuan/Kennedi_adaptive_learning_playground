/**
 * LearningActivity — the universal schema for every activity in the playground.
 * Every game, puzzle, or exercise must conform to this shape.
 */

import type { LearningDomain, InteractionModel, DistractorStrength } from './domains';

export interface LearningActivity {
  id: string;
  version: number;
  title: string;
  domain: LearningDomain;
  skill_ids: string[];
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
