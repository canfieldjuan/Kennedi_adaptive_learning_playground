import type { MasteryStatus, RecommendedMasteryAction } from './mastery-engine';

export interface ReviewScheduleInput {
  skill_id: string;
  status: MasteryStatus;
  now_iso: string;
  successful_review_count?: number;
  regression?: boolean;
}

export interface ReviewSchedule {
  skill_id: string;
  next_review_at?: string;
  interval_label: string;
  status_after_review: MasteryStatus;
  recommended_action: RecommendedMasteryAction;
}

export function scheduleReview(input: ReviewScheduleInput): ReviewSchedule {
  if (input.regression || input.status === 'regressed') {
    return {
      skill_id: input.skill_id,
      interval_label: 'Return to practice now',
      status_after_review: 'practicing',
      recommended_action: 'practice',
    };
  }

  if (input.status !== 'likely_mastered' && input.status !== 'mastered') {
    return {
      skill_id: input.skill_id,
      interval_label: 'No review scheduled yet',
      status_after_review: input.status,
      recommended_action: 'practice',
    };
  }

  const successfulReviewCount = input.successful_review_count ?? 0;
  if (successfulReviewCount >= 2) {
    return buildScheduledReview(input, 7, 'Review after 7 days');
  }

  if (successfulReviewCount === 1) {
    return buildScheduledReview(input, 3, 'Review after 3 days');
  }

  return {
    skill_id: input.skill_id,
    next_review_at: addHours(input.now_iso, 24),
    interval_label: 'Review after 24 hours',
    status_after_review: input.status,
    recommended_action: 'schedule_review',
  };
}

function buildScheduledReview(
  input: ReviewScheduleInput,
  days: number,
  intervalLabel: string
): ReviewSchedule {
  return {
    skill_id: input.skill_id,
    next_review_at: addDays(input.now_iso, days),
    interval_label: intervalLabel,
    status_after_review: input.status,
    recommended_action: 'schedule_review',
  };
}

function addHours(timestamp: string, hours: number): string {
  return new Date(Date.parse(timestamp) + hours * 60 * 60 * 1000).toISOString();
}

function addDays(timestamp: string, days: number): string {
  return addHours(timestamp, days * 24);
}
