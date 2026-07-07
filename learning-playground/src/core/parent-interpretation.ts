import type { ActivityAttemptEvent } from '../types/events';
import type { LearningActivity } from '../types/activity';
import { APPROVED_ACTIVITIES } from '../content/activity-catalog';
import type {
  ParentSessionReview,
  SkillAccuracySummary,
} from './session-review';
import { loadCurriculumGraph } from './curriculum-graph';
import {
  evaluateSkillMastery,
  type MasteryEvaluation,
  type RecommendedMasteryAction,
} from './mastery-engine';
import {
  formatRecommendedAction,
  getMasteryRecommendation,
  type ParentAdaptiveRecommendation,
} from './recommendation-engine';
import {
  getTransferActivityRecommendation,
  type TransferActivityRecommendation,
} from './transfer-activity-recommendation';
import { formatSkillLabel } from './parent-review-format';

export type ParentSkillStatus =
  | 'Ready for next challenge'
  | 'Keep practicing here'
  | 'Needs more support'
  | 'Not enough data yet';

export interface ParentSkillInterpretation {
  skill_id: string;
  skill_label: string;
  status: ParentSkillStatus;
  status_reason: string;
  recommendation: ParentAdaptiveRecommendation;
  recommendation_reason: string;
  attempts: number;
  recent_accuracy: number;
  hints_used: number;
  abandoned_count: number;
  repeated_error_pattern?: string;
  mastery_status?: MasteryEvaluation['next_status'];
  mastery_confidence?: number;
  mastery_reason?: string;
  mastery_recommended_action?: RecommendedMasteryAction;
  mastery_evidence_summary?: string;
  skill_graph_rule?: string;
  transfer_coverage_status?: MasteryEvaluation['transfer_coverage']['status'];
  transfer_required_context_count?: number;
  transfer_approved_context_count?: number;
  transfer_successful_context_count?: number;
  transfer_successful_strengths?: MasteryEvaluation['transfer_coverage']['successful_strengths'];
  transfer_strongest_context_strength?: MasteryEvaluation['transfer_coverage']['strongest_context_strength'];
  transfer_missing_context_types?: string[];
  transfer_missing_strengths?: MasteryEvaluation['transfer_coverage']['missing_strengths'];
  transfer_content_recommendation?: MasteryEvaluation['transfer_coverage']['recommended_content_actions'][number];
  transfer_activity_recommendation?: TransferActivityRecommendation;
  mastery_source_event_ids?: string[];
  mastery_source_observation_ids?: string[];
}

interface SkillSignal {
  summary: SkillAccuracySummary;
  events: ActivityAttemptEvent[];
  hintsUsed: number;
  abandonedCount: number;
  repeatedErrorPattern?: string;
  hasParentFrustrationNote: boolean;
}

export function buildParentSkillInterpretations(
  review: ParentSessionReview,
  sessionEvents: ActivityAttemptEvent[],
  activities: LearningActivity[] = APPROVED_ACTIVITIES
): ParentSkillInterpretation[] {
  const graph = loadCurriculumGraph();
  const summariesBySkill = new Map(
    review.accuracy_by_skill.map((summary) => [summary.skill_id, summary])
  );

  for (const skillId of review.skills_touched) {
    if (!summariesBySkill.has(skillId)) {
      summariesBySkill.set(skillId, {
        skill_id: skillId,
        correct_attempts: 0,
        total_attempts: 0,
        accuracy: 0,
      });
    }
  }

  return [...summariesBySkill.values()]
    .sort((a, b) => a.skill_id.localeCompare(b.skill_id))
    .map((summary) => {
      const signal = buildSkillSignal(summary, review, sessionEvents);
      const status = getStatus(signal);
      const mastery = graph.getSkill(summary.skill_id)
        ? evaluateSkillMastery({
          skill_id: summary.skill_id,
          events: sessionEvents,
          observations: review.parent_notes,
          activities,
          graph,
        })
        : undefined;
      const recommendation = getRecommendation(signal, mastery);
      const transferActivityRecommendation = mastery
        ? getTransferActivityRecommendation({
          skillId: summary.skill_id,
          activities,
          coverage: mastery.transfer_coverage,
        })
        : undefined;

      return {
        skill_id: summary.skill_id,
        skill_label: formatSkillLabel(summary.skill_id),
        status,
        status_reason: getStatusReason(status, signal),
        recommendation,
        recommendation_reason: getRecommendationReason(
          recommendation,
          signal,
          mastery
        ),
        attempts: summary.total_attempts,
        recent_accuracy: summary.accuracy,
        hints_used: signal.hintsUsed,
        abandoned_count: signal.abandonedCount,
        repeated_error_pattern: signal.repeatedErrorPattern,
        mastery_status: mastery?.next_status,
        mastery_confidence: mastery?.confidence,
        mastery_reason: mastery?.reason,
        mastery_recommended_action: mastery?.recommended_action,
        mastery_evidence_summary: mastery?.evidence_summary,
        skill_graph_rule: mastery?.skill_graph_rule,
        transfer_coverage_status: mastery?.transfer_coverage.status,
        transfer_required_context_count: mastery?.transfer_coverage.required_context_count,
        transfer_approved_context_count: mastery?.transfer_coverage.approved_context_count,
        transfer_successful_context_count: mastery?.transfer_coverage.successful_context_count,
        transfer_successful_strengths: mastery?.transfer_coverage.successful_strengths,
        transfer_strongest_context_strength:
          mastery?.transfer_coverage.strongest_context_strength,
        transfer_missing_context_types: mastery?.transfer_coverage.missing_context_types,
        transfer_missing_strengths: mastery?.transfer_coverage.missing_strengths,
        transfer_content_recommendation:
          mastery?.transfer_coverage.recommended_content_actions[0],
        transfer_activity_recommendation: transferActivityRecommendation,
        mastery_source_event_ids: mastery?.source_event_ids,
        mastery_source_observation_ids: mastery?.source_observation_ids,
      };
    });
}

function buildSkillSignal(
  summary: SkillAccuracySummary,
  review: ParentSessionReview,
  sessionEvents: ActivityAttemptEvent[]
): SkillSignal {
  const events = sessionEvents.filter((event) => (
    event.skill_ids.includes(summary.skill_id)
  ));

  return {
    summary,
    events,
    hintsUsed: events.filter((event) => (
      event.outcome === 'hint_used' || event.hint_shown
    )).length,
    abandonedCount: events.filter((event) => event.outcome === 'abandoned').length,
    repeatedErrorPattern: getRepeatedErrorPattern(events),
    hasParentFrustrationNote: hasFrustrationNote(
      review.parent_notes.map((observation) => observation.note)
    ),
  };
}

function getStatus(signal: SkillSignal): ParentSkillStatus {
  const { summary, hintsUsed, abandonedCount, repeatedErrorPattern } = signal;

  if (summary.total_attempts < 3) return 'Not enough data yet';
  if (signal.hasParentFrustrationNote) return 'Needs more support';
  if (repeatedErrorPattern) return 'Needs more support';
  if (abandonedCount > 0 && summary.accuracy < 0.8) return 'Needs more support';
  if (summary.accuracy >= 0.8 && hintsUsed === 0 && abandonedCount === 0) {
    return 'Ready for next challenge';
  }
  if (summary.accuracy < 0.5 || hintsUsed >= 2) return 'Needs more support';
  return 'Keep practicing here';
}

function getRecommendation(
  signal: SkillSignal,
  mastery?: MasteryEvaluation
): ParentAdaptiveRecommendation {
  if (mastery) {
    const masteryRecommendation = getMasteryRecommendation(mastery);
    if (masteryRecommendation) return masteryRecommendation;
  }

  const { summary, hintsUsed, abandonedCount, repeatedErrorPattern } = signal;

  if (summary.total_attempts < 3) return 'Not enough data';
  if (signal.hasParentFrustrationNote) return 'Review later';
  if (repeatedErrorPattern || summary.accuracy < 0.5 || hintsUsed >= 2) {
    return 'Add support';
  }
  if (abandonedCount > 0) return 'Review later';
  if (summary.accuracy >= 0.8 && hintsUsed === 0) return 'Promote gently';
  return 'Keep stable';
}

function getStatusReason(
  status: ParentSkillStatus,
  signal: SkillSignal
): string {
  const { summary, hintsUsed, abandonedCount, repeatedErrorPattern } = signal;
  const accuracyLabel = formatPercent(summary.accuracy);

  if (status === 'Not enough data yet') {
    return `${summary.total_attempts} counted attempt(s) so far.`;
  }
  if (signal.hasParentFrustrationNote) {
    return 'Parent note suggests this may need a calmer setup or a break.';
  }
  if (repeatedErrorPattern) {
    return `Repeated answer: ${repeatedErrorPattern}.`;
  }
  if (abandonedCount > 0) {
    return `${abandonedCount} activity stop(s) in this skill.`;
  }
  if (hintsUsed >= 2) {
    return `${hintsUsed} hint(s) used in this skill.`;
  }
  if (status === 'Ready for next challenge') {
    return `${accuracyLabel} accuracy with no hints or stops.`;
  }

  return `${accuracyLabel} accuracy across ${summary.total_attempts} attempt(s).`;
}

function getRecommendationReason(
  recommendation: ParentAdaptiveRecommendation,
  signal: SkillSignal,
  mastery?: MasteryEvaluation
): string {
  if (recommendation === 'Add transfer activity') {
    return mastery?.transfer_coverage.recommended_content_actions[0]?.reason ??
      'The skill looks fluent in one context, but approved transfer content is missing.';
  }
  if (recommendation === 'Try transfer activity') {
    return 'Another approved context is available. The parent can choose when to offer it.';
  }

  if (mastery) {
    return `${mastery.reason} Suggested next action: ${formatRecommendedAction(mastery.recommended_action)}.`;
  }

  const { summary, hintsUsed, abandonedCount, repeatedErrorPattern } = signal;
  const accuracyLabel = formatPercent(summary.accuracy);

  if (recommendation === 'Not enough data') {
    return 'Keep observing before changing the activity level.';
  }
  if (recommendation === 'Review later') {
    return abandonedCount > 0
      ? 'Offer this again after an easier warm-up.'
      : 'Pause this skill and return when the session feels settled.';
  }
  if (recommendation === 'Add support') {
    if (repeatedErrorPattern) {
      return 'Use fewer choices or model the answer once.';
    }
    if (hintsUsed >= 2) {
      return 'Keep the activity level steady and offer a hint sooner.';
    }
    return `${accuracyLabel} accuracy suggests adding support.`;
  }
  if (recommendation === 'Promote gently') {
    return 'Offer a slightly harder version only after the parent chooses it.';
  }

  return 'Stay with this level and watch the next few attempts.';
}

function getRepeatedErrorPattern(
  events: ActivityAttemptEvent[]
): string | undefined {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.outcome !== 'incorrect') continue;
    const answer = event.selected_answer.trim();
    if (!answer) continue;
    counts.set(answer, (counts.get(answer) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort(([answerA, countA], [answerB, countB]) => (
      countB - countA || answerA.localeCompare(answerB)
    ))[0]?.[0];
}

function hasFrustrationNote(notes: string[]): boolean {
  return notes.some((note) => (
    /frustrat|upset|too hard|tired|needed a break|need a break|cry/i.test(note)
  ));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
