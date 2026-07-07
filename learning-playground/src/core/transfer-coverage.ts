import type {
  LearningActivity,
  TransferContextStrength,
  TransferContextType,
} from '../types/activity';
import {
  TRANSFER_CONTEXT_TYPES,
  getTransferContextStrength,
  isLikelyMasteryTransferStrength,
  isTransferContextType,
} from '../types/activity';
import {
  buildContentGapRecommendations,
  type ContentGapRecommendation,
} from './content-gap-engine';
import {
  type CurriculumGraph,
  loadCurriculumGraph,
} from './curriculum-graph';
import type { EvidenceSummary } from './evidence';

export type TransferCoverageStatus =
  | 'covered'
  | 'needs_more_content'
  | 'ready_for_transfer'
  | 'blocked_by_content_gap';

export interface TransferCoverageEvaluation {
  skill_id: string;
  required_context_count: number;
  approved_context_count: number;
  successful_context_count: number;
  approved_context_types: TransferContextType[];
  successful_context_types: TransferContextType[];
  successful_strengths: TransferContextStrength[];
  strongest_context_strength?: TransferContextStrength;
  missing_context_types: TransferContextType[];
  missing_strengths: TransferContextStrength[];
  status: TransferCoverageStatus;
  recommended_content_actions: ContentGapRecommendation[];
}

const TRANSFER_STRENGTHS: TransferContextStrength[] = [
  'weak',
  'medium',
  'strong',
  'retention',
];

const RICH_TRANSFER_CONTEXT_PRIORITY: TransferContextType[] = [
  'category_sort',
  'reverse_mapping',
  'different_prompt_mode',
  'different_interaction_model',
  'delayed_review',
];

export function evaluateTransferCoverage(
  skillId: string,
  activities: LearningActivity[],
  evidence: EvidenceSummary,
  curriculumGraph: CurriculumGraph = loadCurriculumGraph()
): TransferCoverageEvaluation {
  const skill = curriculumGraph.getSkill(skillId);
  if (!skill) {
    throw new Error(`Cannot evaluate transfer coverage for unknown skill: ${skillId}`);
  }

  const requiredContextCount = skill.evidence_requirements.min_contexts_for_transfer;
  const approvedContextTypes = getApprovedContextTypes(skillId, activities);
  const successfulContextTypes = getSuccessfulContextTypes(evidence);
  const successfulStrengths = getUniqueTransferStrengths(
    successfulContextTypes.map(getTransferContextStrength)
  );
  const strongestContextStrength = getStrongestTransferStrength(successfulStrengths);
  const missingContextTypes = skill.planned_transfer_contexts
    .filter((contextType) => !approvedContextTypes.includes(contextType));
  const missingStrengths = getUniqueTransferStrengths(
    missingContextTypes.map(getTransferContextStrength)
  );
  const status = getCoverageStatus({
    requiredContextCount,
    approvedContextCount: approvedContextTypes.length,
    successfulContextCount: successfulContextTypes.length,
    hasSuccessfulRichTransfer: hasLikelyMasteryTransferContext(successfulContextTypes),
    hasApprovedRichTransfer: hasLikelyMasteryTransferContext(approvedContextTypes),
  });
  const blockingMissingContextTypes = getRecommendedMissingContextTypes({
    missingContextTypes,
    approvedContextTypes,
    successfulContextTypes,
    requiredContextCount,
  });
  const recommendations = buildContentGapRecommendations({
    skill,
    missing_context_types: blockingMissingContextTypes,
    approved_context_count: approvedContextTypes.length,
    required_context_count: requiredContextCount,
    current_strongest_context_strength: strongestContextStrength,
  });

  return {
    skill_id: skillId,
    required_context_count: requiredContextCount,
    approved_context_count: approvedContextTypes.length,
    successful_context_count: successfulContextTypes.length,
    approved_context_types: approvedContextTypes,
    successful_context_types: successfulContextTypes,
    successful_strengths: successfulStrengths,
    strongest_context_strength: strongestContextStrength,
    missing_context_types: missingContextTypes,
    missing_strengths: missingStrengths,
    status,
    recommended_content_actions: recommendations,
  };
}

export function hasLikelyMasteryTransferContext(
  contextTypes: TransferContextType[]
): boolean {
  return contextTypes
    .map(getTransferContextStrength)
    .some(isLikelyMasteryTransferStrength);
}

export function hasDurableMasteryTransferContext(
  contextTypes: TransferContextType[]
): boolean {
  return (
    contextTypes.includes('delayed_review') ||
    contextTypes.includes('parent_observed_real_world')
  );
}

function getApprovedContextTypes(
  skillId: string,
  activities: LearningActivity[]
): TransferContextType[] {
  return getUniqueTransferContextTypes(
    activities
      .filter((activity) => (
        activity.skill_ids.includes(skillId) &&
        activity.transfer.skill_ids.includes(skillId)
      ))
      .map((activity) => activity.transfer.context_type)
  );
}

function getSuccessfulContextTypes(
  evidence: EvidenceSummary
): TransferContextType[] {
  return getUniqueTransferContextTypes(
    evidence.activity_contexts.filter(isTransferContextType)
  );
}

function getCoverageStatus(params: {
  requiredContextCount: number;
  approvedContextCount: number;
  successfulContextCount: number;
  hasSuccessfulRichTransfer: boolean;
  hasApprovedRichTransfer: boolean;
}): TransferCoverageStatus {
  if (
    params.successfulContextCount >= params.requiredContextCount &&
    params.hasSuccessfulRichTransfer
  ) {
    return 'covered';
  }

  if (
    params.successfulContextCount > 0 &&
    params.approvedContextCount >= params.requiredContextCount &&
    (
      params.successfulContextCount < params.requiredContextCount ||
      params.hasApprovedRichTransfer
    )
  ) {
    return 'ready_for_transfer';
  }

  if (params.successfulContextCount > 0) {
    return 'blocked_by_content_gap';
  }

  return 'needs_more_content';
}

function getRecommendedMissingContextTypes(params: {
  missingContextTypes: TransferContextType[];
  approvedContextTypes: TransferContextType[];
  successfulContextTypes: TransferContextType[];
  requiredContextCount: number;
}): TransferContextType[] {
  if (params.missingContextTypes.length === 0) return [];

  if (params.approvedContextTypes.length < params.requiredContextCount) {
    return params.missingContextTypes;
  }

  if (
    params.successfulContextTypes.length >= params.requiredContextCount &&
    !hasLikelyMasteryTransferContext(params.successfulContextTypes) &&
    !hasLikelyMasteryTransferContext(params.approvedContextTypes)
  ) {
    return sortRichMissingContextTypes(params.missingContextTypes);
  }

  return [];
}

function sortRichMissingContextTypes(
  contextTypes: TransferContextType[]
): TransferContextType[] {
  return contextTypes
    .filter((contextType) => (
      getTransferContextStrength(contextType) !== 'weak'
    ))
    .sort((a, b) => (
      getRichContextPriority(a) - getRichContextPriority(b)
    ));
}

function getRichContextPriority(contextType: TransferContextType): number {
  const priority = RICH_TRANSFER_CONTEXT_PRIORITY.indexOf(contextType);
  return priority === -1 ? RICH_TRANSFER_CONTEXT_PRIORITY.length : priority;
}

function getUniqueTransferContextTypes(
  values: TransferContextType[]
): TransferContextType[] {
  return [...new Set(values)].sort((a, b) => (
    TRANSFER_CONTEXT_TYPES.indexOf(a) - TRANSFER_CONTEXT_TYPES.indexOf(b)
  ));
}

function getUniqueTransferStrengths(
  values: TransferContextStrength[]
): TransferContextStrength[] {
  return [...new Set(values)].sort((a, b) => (
    TRANSFER_STRENGTHS.indexOf(a) - TRANSFER_STRENGTHS.indexOf(b)
  ));
}

function getStrongestTransferStrength(
  values: TransferContextStrength[]
): TransferContextStrength | undefined {
  return values[values.length - 1];
}
