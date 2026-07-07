import {
  getTransferContextStrength,
  type TransferContextStrength,
  type TransferContextType,
} from '../types/activity';
import type { LearningDomain } from '../types/domains';
import type { CurriculumSkill } from './curriculum-graph';

export type ContentGapRecommendationType =
  | 'create_transfer_variant'
  | 'approve_transfer_variant';

export type ActivityVariantBriefContextType =
  | 'different_prompt_mode'
  | 'different_interaction_model'
  | 'reverse_mapping'
  | 'category_sort'
  | 'delayed_review'
  | 'parent_observed_real_world';

export type ActivityVariantBriefStrength =
  | 'medium'
  | 'strong'
  | 'retention';

export type SuggestedGameFamily =
  | 'kennedis_orders'
  | 'color_lab'
  | 'dress_up_stage'
  | 'story_director'
  | 'delivery_race'
  | 'stage_boss';

export type ActivityVariantBriefStatus =
  | 'draft'
  | 'ready_for_design'
  | 'designed'
  | 'approved'
  | 'implemented'
  | 'archived';

export interface ActivityVariantBrief {
  brief_id: string;
  skill_id: string;
  domain: LearningDomain;
  current_transfer_state: string;
  reason: string;
  required_context_type: ActivityVariantBriefContextType;
  required_strength: ActivityVariantBriefStrength;
  suggested_game_family: SuggestedGameFamily;
  suggested_activity_pattern: string;
  required_evidence: {
    minimum_accuracy?: number;
    max_hint_rate?: number;
    min_successful_attempts?: number;
    requires_retention_gap_hours?: number;
  };
  child_facing_summary: string;
  parent_facing_summary: string;
  status: ActivityVariantBriefStatus;
}

export interface ContentGapRecommendation {
  skill_id: string;
  recommendation_type: ContentGapRecommendationType;
  reason: string;
  suggested_context_type: TransferContextType;
  missing_context_strength: TransferContextStrength;
  current_strongest_context_strength?: TransferContextStrength;
  suggested_activity_template: string;
  activity_variant_brief?: ActivityVariantBrief;
}

export function buildContentGapRecommendations(params: {
  skill: CurriculumSkill;
  missing_context_types: TransferContextType[];
  approved_context_count: number;
  required_context_count: number;
  current_strongest_context_strength?: TransferContextStrength;
  current_transfer_state?: string;
}): ContentGapRecommendation[] {
  if (params.missing_context_types.length === 0) return [];

  return params.missing_context_types.map((contextType) => {
    const contextStrength = getTransferContextStrength(contextType);

    return {
      skill_id: params.skill.id,
      recommendation_type: params.approved_context_count === 0
        ? 'approve_transfer_variant'
        : 'create_transfer_variant',
      reason: [
        `${params.skill.label} needs ${params.required_context_count} approved transfer context(s).`,
        params.current_strongest_context_strength
          ? `Current strongest evidence is ${formatTransferStrength(params.current_strongest_context_strength)}.`
          : 'No successful transfer strength has been recorded yet.',
        `Missing ${formatTransferStrength(contextStrength)} context: ${formatTransferContextType(contextType)}.`,
      ].join(' '),
      suggested_context_type: contextType,
      missing_context_strength: contextStrength,
      current_strongest_context_strength: params.current_strongest_context_strength,
      suggested_activity_template: getSuggestedActivityTemplate(
        params.skill.domain,
        contextType
      ),
      activity_variant_brief: buildActivityVariantBrief({
        skill: params.skill,
        context_type: contextType,
        current_transfer_state: params.current_transfer_state ??
          formatCurrentTransferState(params.current_strongest_context_strength),
      }),
    };
  });
}

export function formatTransferContextType(contextType: TransferContextType): string {
  return contextType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatTransferStrength(strength: TransferContextStrength): string {
  return strength.charAt(0).toUpperCase() + strength.slice(1);
}

function buildActivityVariantBrief(params: {
  skill: CurriculumSkill;
  context_type: TransferContextType;
  current_transfer_state: string;
}): ActivityVariantBrief | undefined {
  if (!isActivityVariantBriefContextType(params.context_type)) return undefined;

  const requiredStrength = getTransferContextStrength(params.context_type);
  if (!isActivityVariantBriefStrength(requiredStrength)) return undefined;

  const suggestedGameFamily = getSuggestedGameFamily(
    params.skill.domain,
    params.context_type
  );
  const suggestedActivityPattern = getSuggestedActivityPattern(
    params.skill,
    params.context_type
  );
  const domain = toLearningDomain(params.skill.domain);
  const reason = getBriefReason(
    params.skill,
    params.context_type,
    requiredStrength,
    params.current_transfer_state
  );

  return {
    brief_id: createBriefId(params.skill.id, params.context_type),
    skill_id: params.skill.id,
    domain,
    current_transfer_state: params.current_transfer_state,
    reason,
    required_context_type: params.context_type,
    required_strength: requiredStrength,
    suggested_game_family: suggestedGameFamily,
    suggested_activity_pattern: suggestedActivityPattern,
    required_evidence: getRequiredEvidence(params.skill, requiredStrength),
    child_facing_summary: getChildFacingSummary(
      suggestedGameFamily,
      suggestedActivityPattern
    ),
    parent_facing_summary: [
      `${suggestedActivityPattern} adds ${formatTransferStrength(requiredStrength).toLowerCase()} ${formatTransferContextType(params.context_type)} evidence.`,
      reason,
    ].join(' '),
    status: 'ready_for_design',
  };
}

function createBriefId(
  skillId: string,
  contextType: ActivityVariantBriefContextType
): string {
  return `brief-${skillId}-${contextType}`;
}

function isActivityVariantBriefContextType(
  contextType: TransferContextType
): contextType is ActivityVariantBriefContextType {
  return (
    contextType === 'different_prompt_mode' ||
    contextType === 'different_interaction_model' ||
    contextType === 'reverse_mapping' ||
    contextType === 'category_sort' ||
    contextType === 'delayed_review' ||
    contextType === 'parent_observed_real_world'
  );
}

function isActivityVariantBriefStrength(
  strength: TransferContextStrength
): strength is ActivityVariantBriefStrength {
  return (
    strength === 'medium' ||
    strength === 'strong' ||
    strength === 'retention'
  );
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

function getSuggestedGameFamily(
  domain: string,
  contextType: ActivityVariantBriefContextType
): SuggestedGameFamily {
  if (domain === 'phonics') return 'kennedis_orders';
  if (domain === 'math') return 'delivery_race';
  if (domain === 'art') return 'color_lab';
  if (domain === 'spatial') return 'dress_up_stage';
  if (domain === 'language') return 'story_director';
  if (contextType === 'category_sort' || contextType === 'reverse_mapping') {
    return 'kennedis_orders';
  }
  return 'stage_boss';
}

function toLearningDomain(domain: string): LearningDomain {
  if (
    domain === 'literacy' ||
    domain === 'phonics' ||
    domain === 'math' ||
    domain === 'logic' ||
    domain === 'spatial' ||
    domain === 'memory' ||
    domain === 'science' ||
    domain === 'music' ||
    domain === 'art' ||
    domain === 'emotional' ||
    domain === 'language' ||
    domain === 'coding_concepts'
  ) {
    return domain;
  }

  throw new Error(`Cannot create activity variant brief for unknown domain: ${domain}`);
}

function getSuggestedActivityPattern(
  skill: CurriculumSkill,
  contextType: ActivityVariantBriefContextType
): string {
  if (skill.id === 'initial_sound') {
    if (contextType === 'category_sort') return 'B Food Basket';
    if (contextType === 'reverse_mapping') return 'Starting Letter Order Check';
    if (contextType === 'delayed_review') return "Yesterday's Bear Cafe Order";
    if (contextType === 'different_prompt_mode') return 'Picture Order Card';
    return 'New Order Station';
  }

  if (skill.domain === 'math') {
    if (contextType === 'different_prompt_mode') return 'Picture Quantity Order Card';
    if (contextType === 'different_interaction_model') return 'Number Delivery Match';
    if (contextType === 'delayed_review') return "Yesterday's Count Check";
    return 'Quantity Sorting Route';
  }

  if (skill.domain === 'spatial') {
    if (contextType === 'different_prompt_mode') return 'Find Shape in Scene';
    if (contextType === 'different_interaction_model') return 'Shape Silhouette Match';
    if (contextType === 'delayed_review') return "Yesterday's Shape Spot";
    return 'Shape Sorting Stage';
  }

  if (skill.domain === 'art') {
    if (contextType === 'parent_observed_real_world') return 'Parent Color Notice';
    if (contextType === 'different_prompt_mode') return 'Color From Request Card';
    if (contextType === 'delayed_review') return "Yesterday's Color Choice";
    return 'Color Lab Sort';
  }

  if (contextType === 'delayed_review') return 'Delayed Review Check';
  if (contextType === 'category_sort') return 'Category Sort';
  if (contextType === 'reverse_mapping') return 'Reverse Mapping Check';
  if (contextType === 'different_interaction_model') return 'Different Interaction Check';
  return 'Different Prompt Check';
}

function getBriefReason(
  skill: CurriculumSkill,
  contextType: ActivityVariantBriefContextType,
  strength: ActivityVariantBriefStrength,
  currentTransferState: string
): string {
  if (contextType === 'delayed_review') {
    return `${skill.label} needs retention evidence after time has passed. Current transfer state: ${currentTransferState}.`;
  }

  if (contextType === 'category_sort') {
    return `${skill.label} has weak same-format transfer only. Category sorting would test whether the child can group matching examples while rejecting distractors. Current transfer state: ${currentTransferState}.`;
  }

  if (contextType === 'reverse_mapping') {
    return `${skill.label} has weak same-format transfer only. Reverse mapping tests the skill from the opposite direction. Current transfer state: ${currentTransferState}.`;
  }

  return `${skill.label} needs ${formatTransferStrength(strength).toLowerCase()} ${formatTransferContextType(contextType)} evidence before the mastery claim can be trusted. Current transfer state: ${currentTransferState}.`;
}

function getRequiredEvidence(
  skill: CurriculumSkill,
  strength: ActivityVariantBriefStrength
): ActivityVariantBrief['required_evidence'] {
  if (strength === 'retention') {
    return {
      min_successful_attempts: 1,
      requires_retention_gap_hours: skill.review_policy.likely_mastered_hours,
    };
  }

  return {
    minimum_accuracy: Math.max(skill.evidence_requirements.min_accuracy, 0.8),
    max_hint_rate: strength === 'strong'
      ? Math.min(skill.evidence_requirements.max_hint_rate, 0.2)
      : skill.evidence_requirements.max_hint_rate,
    min_successful_attempts: 2,
  };
}

function getChildFacingSummary(
  gameFamily: SuggestedGameFamily,
  activityPattern: string
): string {
  return `${formatGameFamily(gameFamily)}: ${activityPattern}`;
}

function formatGameFamily(gameFamily: SuggestedGameFamily): string {
  return gameFamily
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrentTransferState(
  currentStrongestStrength?: TransferContextStrength
): string {
  return currentStrongestStrength
    ? `strongest successful transfer is ${currentStrongestStrength}`
    : 'no successful transfer yet';
}
