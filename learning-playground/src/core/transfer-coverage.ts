import type {
  LearningActivity,
  TransferContextType,
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
  missing_context_types: TransferContextType[];
  status: TransferCoverageStatus;
  recommended_content_actions: ContentGapRecommendation[];
}

const TRANSFER_CONTEXT_TYPES: TransferContextType[] = [
  'same_format_same_examples',
  'same_format_new_examples',
  'different_prompt_mode',
  'different_interaction_model',
  'reverse_mapping',
  'category_sort',
  'delayed_review',
  'parent_observed_real_world',
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
  const missingContextTypes = skill.planned_transfer_contexts
    .filter((contextType) => !approvedContextTypes.includes(contextType));
  const status = getCoverageStatus({
    requiredContextCount,
    approvedContextCount: approvedContextTypes.length,
    successfulContextCount: successfulContextTypes.length,
  });
  const blockingMissingContextTypes = approvedContextTypes.length >= requiredContextCount
    ? []
    : missingContextTypes;
  const recommendations = buildContentGapRecommendations({
    skill,
    missing_context_types: blockingMissingContextTypes,
    approved_context_count: approvedContextTypes.length,
    required_context_count: requiredContextCount,
  });

  return {
    skill_id: skillId,
    required_context_count: requiredContextCount,
    approved_context_count: approvedContextTypes.length,
    successful_context_count: successfulContextTypes.length,
    approved_context_types: approvedContextTypes,
    successful_context_types: successfulContextTypes,
    missing_context_types: missingContextTypes,
    status,
    recommended_content_actions: recommendations,
  };
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
}): TransferCoverageStatus {
  if (params.successfulContextCount >= params.requiredContextCount) {
    return 'covered';
  }

  if (params.approvedContextCount >= params.requiredContextCount) {
    return 'ready_for_transfer';
  }

  if (params.successfulContextCount > 0) {
    return 'blocked_by_content_gap';
  }

  return 'needs_more_content';
}

function getUniqueTransferContextTypes(
  values: TransferContextType[]
): TransferContextType[] {
  return [...new Set(values)].sort((a, b) => (
    TRANSFER_CONTEXT_TYPES.indexOf(a) - TRANSFER_CONTEXT_TYPES.indexOf(b)
  ));
}

function isTransferContextType(value: string): value is TransferContextType {
  return TRANSFER_CONTEXT_TYPES.includes(value as TransferContextType);
}
