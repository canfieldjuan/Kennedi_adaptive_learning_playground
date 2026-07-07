import type { TransferContextType } from '../types/activity';
import type { CurriculumSkill } from './curriculum-graph';

export type ContentGapRecommendationType =
  | 'create_transfer_variant'
  | 'approve_transfer_variant';

export interface ContentGapRecommendation {
  skill_id: string;
  recommendation_type: ContentGapRecommendationType;
  reason: string;
  suggested_context_type: TransferContextType;
  suggested_activity_template: string;
}

export function buildContentGapRecommendations(params: {
  skill: CurriculumSkill;
  missing_context_types: TransferContextType[];
  approved_context_count: number;
  required_context_count: number;
}): ContentGapRecommendation[] {
  if (params.missing_context_types.length === 0) return [];

  return params.missing_context_types.map((contextType) => ({
    skill_id: params.skill.id,
    recommendation_type: params.approved_context_count === 0
      ? 'approve_transfer_variant'
      : 'create_transfer_variant',
    reason: [
      `${params.skill.label} needs ${params.required_context_count} approved transfer context(s).`,
      `Missing context type: ${formatTransferContextType(contextType)}.`,
    ].join(' '),
    suggested_context_type: contextType,
    suggested_activity_template: getSuggestedActivityTemplate(
      params.skill.domain,
      contextType
    ),
  }));
}

export function formatTransferContextType(contextType: TransferContextType): string {
  return contextType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSuggestedActivityTemplate(
  domain: string,
  contextType: TransferContextType
): string {
  if (contextType === 'delayed_review') return 'delayed_review_check';

  if (domain === 'phonics') {
    if (contextType === 'reverse_mapping') return 'hear_word_choose_starting_letter';
    if (contextType === 'category_sort') return 'sort_words_by_initial_sound';
    return 'new_initial_sound_examples';
  }

  if (domain === 'math') {
    if (contextType === 'different_interaction_model') return 'match_numeral_to_quantity';
    if (contextType === 'different_prompt_mode') return 'choose_more_or_less';
    return 'same_quantity_new_layout';
  }

  if (domain === 'spatial') {
    if (contextType === 'different_interaction_model') return 'match_shape_silhouette';
    if (contextType === 'different_prompt_mode') return 'find_shape_in_scene';
    return 'same_shape_new_examples';
  }

  if (domain === 'art') {
    if (contextType === 'parent_observed_real_world') return 'parent_observed_color_choice';
    return 'same_color_skill_new_shape';
  }

  return 'transfer_variant';
}
