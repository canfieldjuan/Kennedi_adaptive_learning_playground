import type { ActivityAttemptEvent } from '../types/events';
import type { LearningActivity } from '../types/activity';
import type { ParentObservation } from '../types/observations';
import { APPROVED_ACTIVITIES } from '../content/activity-catalog';
import {
  type CurriculumGraph,
  loadCurriculumGraph,
} from './curriculum-graph';
import {
  buildEvidenceForSkill,
  hasEvidence,
  type EvidenceSummary,
  type MasteryEvidence,
} from './evidence';
import {
  evaluateTransferCoverage,
  hasDurableMasteryTransferContext,
  hasLikelyMasteryTransferContext,
  type TransferCoverageEvaluation,
} from './transfer-coverage';

export type MasteryStatus =
  | 'not_started'
  | 'introduced'
  | 'practicing'
  | 'single_context_fluent'
  | 'transfer_ready'
  | 'likely_mastered'
  | 'mastered'
  | 'needs_review'
  | 'regressed'
  | 'blocked_by_content_gap';

export type RecommendedMasteryAction =
  | 'introduce'
  | 'practice'
  | 'increase_difficulty'
  | 'test_transfer'
  | 'schedule_review'
  | 'add_support'
  | 'pause_skill';

export interface MasteryEvaluation {
  skill_id: string;
  skill_label: string;
  previous_status: MasteryStatus;
  next_status: MasteryStatus;
  confidence: number;
  evidence: MasteryEvidence[];
  evidence_summary: string;
  transfer_coverage: TransferCoverageEvaluation;
  reason: string;
  recommended_action: RecommendedMasteryAction;
  skill_graph_rule: string;
  source_event_ids: string[];
  source_observation_ids: string[];
}

export interface MasteryEvaluationInput {
  skill_id: string;
  events: ActivityAttemptEvent[];
  observations?: ParentObservation[];
  previous_status?: MasteryStatus;
  prerequisite_statuses?: Record<string, MasteryStatus>;
  activities?: LearningActivity[];
  graph?: CurriculumGraph;
}

const STRONG_PRIOR_STATUSES: MasteryStatus[] = [
  'likely_mastered',
  'mastered',
  'needs_review',
  'single_context_fluent',
  'transfer_ready',
];

export function evaluateSkillMastery(
  input: MasteryEvaluationInput
): MasteryEvaluation {
  const graph = input.graph ?? loadCurriculumGraph();
  const skill = graph.getSkill(input.skill_id);
  if (!skill) {
    throw new Error(`Cannot evaluate unknown skill: ${input.skill_id}`);
  }

  const previousStatus = input.previous_status ?? 'not_started';
  const activities = input.activities ?? APPROVED_ACTIVITIES;
  const evidenceSummary = buildEvidenceForSkill({
    skill,
    events: input.events,
    activities,
    observations: input.observations ?? [],
  });
  const transferCoverage = evaluateTransferCoverage(
    skill.id,
    activities,
    evidenceSummary,
    graph
  );
  const prerequisiteBlock = getPrerequisiteBlock({
    skillId: input.skill_id,
    graph,
    prerequisiteStatuses: input.prerequisite_statuses ?? {},
  });
  const nextStatus = getNextStatus({
    previousStatus,
    evidenceSummary,
    transferCoverage,
    prerequisiteBlock,
  });
  const recommendedAction = getRecommendedAction({
    nextStatus,
    evidenceSummary,
    transferCoverage,
    prerequisiteBlock,
  });

  return {
    skill_id: skill.id,
    skill_label: skill.label,
    previous_status: previousStatus,
    next_status: nextStatus,
    confidence: getConfidence(nextStatus, evidenceSummary),
    evidence: evidenceSummary.evidence,
    evidence_summary: formatEvidenceSummary(evidenceSummary),
    transfer_coverage: transferCoverage,
    reason: getReason(nextStatus, transferCoverage, prerequisiteBlock),
    recommended_action: recommendedAction,
    skill_graph_rule: formatSkillGraphRule(skill),
    source_event_ids: getSourceIds(evidenceSummary.evidence, 'event'),
    source_observation_ids: getSourceIds(
      evidenceSummary.evidence,
      'parent_observation'
    ),
  };
}

function getPrerequisiteBlock(params: {
  skillId: string;
  graph: CurriculumGraph;
  prerequisiteStatuses: Record<string, MasteryStatus>;
}): string | undefined {
  const unmet = params.graph.getPrerequisites(params.skillId)
    .filter((skill) => (
      params.prerequisiteStatuses[skill.id] !== 'mastered' &&
      params.prerequisiteStatuses[skill.id] !== 'likely_mastered'
    ));

  return unmet[0]?.label;
}

function getNextStatus(params: {
  previousStatus: MasteryStatus;
  evidenceSummary: EvidenceSummary;
  transferCoverage: TransferCoverageEvaluation;
  prerequisiteBlock?: string;
}): MasteryStatus {
  if (params.evidenceSummary.counted_attempts === 0) return 'not_started';

  if (isRegression(params.previousStatus, params.evidenceSummary)) {
    return 'regressed';
  }

  if (params.prerequisiteBlock) {
    return params.evidenceSummary.counted_attempts < 2 ? 'introduced' : 'practicing';
  }

  const hasAccuracy = hasEvidence(params.evidenceSummary.evidence, 'accuracy');
  const hasLowHintUsage = hasEvidence(params.evidenceSummary.evidence, 'low_hint_usage');
  const hasRetention = hasEvidence(params.evidenceSummary.evidence, 'retention');
  const hasCoreEvidence = hasAccuracy && hasLowHintUsage;
  const successfulContextCount = params.transferCoverage.successful_context_count;
  const requiredContextCount = params.transferCoverage.required_context_count;
  const hasLikelyTransferQuality = hasLikelyMasteryTransferContext(
    params.transferCoverage.successful_context_types
  );
  const hasDurableEvidence = (
    hasRetention ||
    hasDurableMasteryTransferContext(params.transferCoverage.successful_context_types)
  );

  if (
    hasCoreEvidence &&
    successfulContextCount >= requiredContextCount &&
    hasLikelyTransferQuality &&
    hasDurableEvidence
  ) {
    return 'mastered';
  }

  if (
    hasCoreEvidence &&
    successfulContextCount >= requiredContextCount &&
    hasLikelyTransferQuality
  ) {
    return 'likely_mastered';
  }

  if (
    hasCoreEvidence &&
    params.transferCoverage.status === 'ready_for_transfer'
  ) {
    return 'transfer_ready';
  }

  if (hasCoreEvidence && successfulContextCount === 1) {
    return 'single_context_fluent';
  }

  if (
    hasCoreEvidence &&
    params.transferCoverage.status === 'blocked_by_content_gap'
  ) {
    return 'blocked_by_content_gap';
  }

  if (
    params.evidenceSummary.accuracy < 0.5 ||
    params.evidenceSummary.hint_rate > 0.5
  ) {
    return 'needs_review';
  }

  return params.evidenceSummary.counted_attempts < 2 ? 'introduced' : 'practicing';
}

function getRecommendedAction(params: {
  nextStatus: MasteryStatus;
  evidenceSummary: EvidenceSummary;
  transferCoverage: TransferCoverageEvaluation;
  prerequisiteBlock?: string;
}): RecommendedMasteryAction {
  if (params.prerequisiteBlock) return 'practice';

  if (params.nextStatus === 'not_started') return 'introduce';
  if (params.nextStatus === 'introduced') return 'practice';
  if (params.nextStatus === 'practicing') return 'practice';
  if (params.nextStatus === 'needs_review') return 'add_support';
  if (params.nextStatus === 'regressed') return 'add_support';
  if (params.nextStatus === 'single_context_fluent') return 'test_transfer';
  if (params.nextStatus === 'transfer_ready') return 'test_transfer';
  if (params.nextStatus === 'blocked_by_content_gap') return 'test_transfer';
  if (params.nextStatus === 'mastered') return 'schedule_review';
  if (params.nextStatus === 'likely_mastered') return 'schedule_review';

  if (
    params.transferCoverage.successful_context_count <
    params.transferCoverage.required_context_count
  ) {
    return 'test_transfer';
  }

  if (!hasEvidence(params.evidenceSummary.evidence, 'retention')) {
    return 'schedule_review';
  }

  return 'increase_difficulty';
}

function isRegression(
  previousStatus: MasteryStatus,
  evidenceSummary: EvidenceSummary
): boolean {
  if (!STRONG_PRIOR_STATUSES.includes(previousStatus)) return false;
  if (evidenceSummary.counted_attempts < 2) return false;

  return (
    evidenceSummary.accuracy < 0.5 ||
    evidenceSummary.hint_rate > 0.5
  );
}

function getConfidence(
  nextStatus: MasteryStatus,
  evidenceSummary: EvidenceSummary
): number {
  if (nextStatus === 'not_started') return 0;
  if (nextStatus === 'mastered') return 0.95;
  if (nextStatus === 'likely_mastered') return 0.85;
  if (nextStatus === 'transfer_ready') return 0.78;
  if (nextStatus === 'single_context_fluent') return 0.72;
  if (nextStatus === 'blocked_by_content_gap') return 0.72;
  if (nextStatus === 'regressed' || nextStatus === 'needs_review') return 0.65;

  const attemptFactor = Math.min(1, evidenceSummary.counted_attempts / 3);
  return roundToHundredths(evidenceSummary.accuracy * attemptFactor);
}

function getReason(
  nextStatus: MasteryStatus,
  transferCoverage: TransferCoverageEvaluation,
  prerequisiteBlock?: string
): string {
  if (nextStatus === 'not_started') {
    return 'No local attempt evidence has been recorded for this skill yet.';
  }

  if (prerequisiteBlock) {
    return `Practice continues because ${prerequisiteBlock} is still prerequisite evidence.`;
  }

  if (nextStatus === 'mastered') {
    return 'Evidence includes accuracy, low hint use, rich transfer, and retention or real-world transfer.';
  }

  if (nextStatus === 'likely_mastered') {
    return 'Accuracy is strong across enough approved transfer contexts, including medium or strong transfer evidence; schedule review before durable mastery.';
  }

  if (nextStatus === 'transfer_ready') {
    return 'Fluency is strong and another approved transfer context is available.';
  }

  if (nextStatus === 'single_context_fluent') {
    if (transferCoverage.status === 'blocked_by_content_gap') {
      return 'Single-context fluency is strong, but transfer cannot be proven because approved content coverage is missing.';
    }
    return 'Single-context fluency is strong, but transfer evidence is still needed.';
  }

  if (nextStatus === 'blocked_by_content_gap') {
    return 'Transfer is required, but approved transfer content is missing.';
  }

  if (nextStatus === 'regressed') {
    return 'Recent evidence after a stronger status shows the fit may need support again.';
  }

  if (nextStatus === 'needs_review') {
    return 'Recent accuracy or hint use suggests the current fit may need support.';
  }

  return 'Evidence is still building for this skill.';
}

function formatEvidenceSummary(summary: EvidenceSummary): string {
  return [
    `${summary.correct_attempts}/${summary.counted_attempts} counted attempt(s) correct`,
    `${formatPercent(summary.accuracy)} accuracy`,
    `${formatPercent(summary.hint_rate)} hint rate`,
    `${summary.activity_contexts.length} successful transfer context(s)`,
  ].join('; ');
}

function formatSkillGraphRule(
  skill: NonNullable<ReturnType<CurriculumGraph['getSkill']>>
): string {
  const requirements = skill.evidence_requirements;
  return [
    `${skill.label} requires ${requirements.min_attempts} attempt(s)`,
    `${formatPercent(requirements.min_accuracy)} accuracy`,
    `hint rate at or below ${formatPercent(requirements.max_hint_rate)}`,
    `transfer across ${requirements.min_contexts_for_transfer} context(s)`,
    'at least one medium or strong transfer context before likely mastery',
    requirements.requires_retention ? 'retention review' : 'no retention review',
  ].join(', ');
}

function getSourceIds(
  evidence: MasteryEvidence[],
  sourceType: MasteryEvidence['source_type']
): string[] {
  return [
    ...new Set(
      evidence
        .filter((item) => item.source_type === sourceType)
        .flatMap((item) => item.source_ids)
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}
