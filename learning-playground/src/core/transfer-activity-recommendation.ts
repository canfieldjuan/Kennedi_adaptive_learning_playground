import type {
  LearningActivity,
  TransferContextType,
} from '../types/activity';
import type { TransferCoverageEvaluation } from './transfer-coverage';

export interface TransferActivityRecommendation {
  skill_id: string;
  activity_id: string;
  activity_title: string;
  context_type: TransferContextType;
  context_id: string;
  example_set_id: string;
  reason: string;
}

export function getTransferActivityRecommendation(params: {
  skillId: string;
  activities: LearningActivity[];
  coverage: TransferCoverageEvaluation;
}): TransferActivityRecommendation | undefined {
  if (params.coverage.status !== 'ready_for_transfer') return undefined;

  const successfulContexts = new Set(params.coverage.successful_context_types);
  const activity = params.activities.find((item) => (
    item.skill_ids.includes(params.skillId) &&
    item.transfer.skill_ids.includes(params.skillId) &&
    !successfulContexts.has(item.transfer.context_type)
  ));

  if (!activity) return undefined;

  return {
    skill_id: params.skillId,
    activity_id: activity.id,
    activity_title: activity.title,
    context_type: activity.transfer.context_type,
    context_id: activity.transfer.context_id,
    example_set_id: activity.transfer.example_set_id,
    reason: [
      `${activity.title} is an approved transfer activity.`,
      `It uses ${formatTransferContextLabel(activity.transfer.context_type)} evidence that has not succeeded yet for this skill.`,
    ].join(' '),
  };
}

function formatTransferContextLabel(contextType: TransferContextType): string {
  return contextType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
