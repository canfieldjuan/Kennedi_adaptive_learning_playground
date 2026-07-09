import type { ActivityAttemptEvent } from '../types/events';
import {
  isTransferContextType,
  type LearningActivity,
} from '../types/activity';
import type { ParentObservation } from '../types/observations';
import type { CurriculumSkill } from './curriculum-graph';
import {
  eventAppliesToSkill,
  getSkillOutcome,
  hasCountedSkillOutcome,
  isCorrectForSkill,
} from './skill-outcomes';
import { hasLikelyMasteryTransferContext } from './transfer-coverage';

export type MasteryEvidenceType =
  | 'accuracy'
  | 'low_hint_usage'
  | 'response_fluency'
  | 'retention'
  | 'transfer'
  | 'parent_observation'
  | 'completion'
  | 'self_correction';

export interface MasteryEvidence {
  type: MasteryEvidenceType;
  skill_id: string;
  source_ids: string[];
  source_type: 'event' | 'parent_observation' | 'mixed';
  activity_ids: string[];
  summary: string;
  strength: number;
  timestamp?: string;
}

export interface EvidenceSummary {
  skill_id: string;
  counted_attempts: number;
  correct_attempts: number;
  accuracy: number;
  hint_rate: number;
  average_response_ms: number;
  activity_contexts: string[];
  latest_event_at?: string;
  evidence: MasteryEvidence[];
}

export function buildEvidenceForSkill(params: {
  skill: CurriculumSkill;
  events: ActivityAttemptEvent[];
  activities?: LearningActivity[];
  observations?: ParentObservation[];
}): EvidenceSummary {
  const activityById = new Map(
    (params.activities ?? []).map((activity) => [activity.id, activity])
  );
  const skillEvents = params.events
    .filter((event) => eventAppliesToSkill(event, params.skill.id))
    .sort(compareEventsByTimestamp);
  const countedEvents = skillEvents.filter((event) => (
    hasCountedSkillOutcome(event, params.skill.id)
  ));
  const correctEvents = countedEvents.filter((event) => (
    isCorrectForSkill(event, params.skill.id)
  ));
  const hintEvents = skillEvents.filter((event) => (
    isHintForSkill(event, params.skill.id)
  ));
  const completionEvents = skillEvents.filter((event) => (
    getSkillOutcome(event, params.skill.id) === 'completed'
  ));
  const activityContexts = getUniqueSorted(
    correctEvents.map((event) => getEvidenceContext(event, activityById))
  );
  const accuracy = countedEvents.length === 0
    ? 0
    : correctEvents.length / countedEvents.length;
  const hintRate = countedEvents.length === 0
    ? 0
    : hintEvents.length / countedEvents.length;
  const averageResponseMs = getAverageResponseMs(countedEvents);
  const evidence: MasteryEvidence[] = [];
  const requirements = params.skill.evidence_requirements;

  if (
    countedEvents.length >= requirements.min_attempts &&
    accuracy >= requirements.min_accuracy
  ) {
    evidence.push({
      type: 'accuracy',
      skill_id: params.skill.id,
      source_ids: correctEvents.map((event) => event.event_id),
      source_type: 'event',
      activity_ids: activityContexts,
      summary: `${formatPercent(accuracy)} accuracy across ${countedEvents.length} counted attempt(s).`,
      strength: roundToHundredths(accuracy),
      timestamp: correctEvents[correctEvents.length - 1]?.timestamp,
    });
  }

  if (
    countedEvents.length >= requirements.min_attempts &&
    hintRate <= requirements.max_hint_rate
  ) {
    evidence.push({
      type: 'low_hint_usage',
      skill_id: params.skill.id,
      source_ids: countedEvents.map((event) => event.event_id),
      source_type: 'event',
      activity_ids: activityContexts,
      summary: `${formatPercent(hintRate)} hint rate during counted attempts.`,
      strength: roundToHundredths(1 - hintRate),
      timestamp: countedEvents[countedEvents.length - 1]?.timestamp,
    });
  }

  if (
    countedEvents.length >= requirements.min_attempts &&
    averageResponseMs > 0 &&
    averageResponseMs <= requirements.max_average_response_ms
  ) {
    evidence.push({
      type: 'response_fluency',
      skill_id: params.skill.id,
      source_ids: countedEvents.map((event) => event.event_id),
      source_type: 'event',
      activity_ids: activityContexts,
      summary: `Average response time was ${averageResponseMs} ms.`,
      strength: 1,
      timestamp: countedEvents[countedEvents.length - 1]?.timestamp,
    });
  }

  if (completionEvents.length > 0) {
    evidence.push({
      type: 'completion',
      skill_id: params.skill.id,
      source_ids: completionEvents.map((event) => event.event_id),
      source_type: 'event',
      activity_ids: getUniqueSorted(completionEvents.map((event) => event.activity_id)),
      summary: `${completionEvents.length} completion event(s) recorded.`,
      strength: 1,
      timestamp: completionEvents[completionEvents.length - 1]?.timestamp,
    });
  }

  if (
    activityContexts.length >= requirements.min_contexts_for_transfer &&
    hasLikelyMasteryTransferContext(activityContexts.filter(isTransferContextType))
  ) {
    evidence.push({
      type: 'transfer',
      skill_id: params.skill.id,
      source_ids: correctEvents.map((event) => event.event_id),
      source_type: 'event',
      activity_ids: activityContexts,
      summary: `Correct evidence appeared in ${activityContexts.length} activity context(s).`,
      strength: 1,
      timestamp: correctEvents[correctEvents.length - 1]?.timestamp,
    });
  }

  const retentionEvidence = buildRetentionEvidence(params.skill, correctEvents);
  if (retentionEvidence) evidence.push(retentionEvidence);

  const selfCorrectionEvents = correctEvents.filter((event) => event.attempt_number > 1);
  if (selfCorrectionEvents.length > 0) {
    evidence.push({
      type: 'self_correction',
      skill_id: params.skill.id,
      source_ids: selfCorrectionEvents.map((event) => event.event_id),
      source_type: 'event',
      activity_ids: getUniqueSorted(selfCorrectionEvents.map((event) => event.activity_id)),
      summary: `${selfCorrectionEvents.length} correct response(s) after an earlier attempt.`,
      strength: 1,
      timestamp: selfCorrectionEvents[selfCorrectionEvents.length - 1]?.timestamp,
    });
  }

  const observationEvidence = buildParentObservationEvidence(
    params.skill,
    params.observations ?? []
  );
  if (observationEvidence) evidence.push(observationEvidence);

  return {
    skill_id: params.skill.id,
    counted_attempts: countedEvents.length,
    correct_attempts: correctEvents.length,
    accuracy,
    hint_rate: hintRate,
    average_response_ms: averageResponseMs,
    activity_contexts: activityContexts,
    latest_event_at: skillEvents[skillEvents.length - 1]?.timestamp,
    evidence,
  };
}

export function hasEvidence(
  evidence: MasteryEvidence[],
  type: MasteryEvidenceType
): boolean {
  return evidence.some((item) => item.type === type);
}

function buildRetentionEvidence(
  skill: CurriculumSkill,
  correctEvents: ActivityAttemptEvent[]
): MasteryEvidence | undefined {
  if (!skill.evidence_requirements.requires_retention) return undefined;
  if (correctEvents.length < 2) return undefined;

  const firstCorrect = correctEvents[0];
  const latestCorrect = correctEvents[correctEvents.length - 1];
  const elapsedMs = Date.parse(latestCorrect.timestamp) - Date.parse(firstCorrect.timestamp);
  const requiredMs = skill.review_policy.likely_mastered_hours * 60 * 60 * 1000;

  if (!Number.isFinite(elapsedMs) || elapsedMs < requiredMs) return undefined;

  return {
    type: 'retention',
    skill_id: skill.id,
    source_ids: [firstCorrect.event_id, latestCorrect.event_id],
    source_type: 'event',
    activity_ids: getUniqueSorted([
      firstCorrect.activity_id,
      latestCorrect.activity_id,
    ]),
    summary: `Correct evidence repeated after ${skill.review_policy.likely_mastered_hours} hour(s).`,
    strength: 1,
    timestamp: latestCorrect.timestamp,
  };
}

function buildParentObservationEvidence(
  skill: CurriculumSkill,
  observations: ParentObservation[]
): MasteryEvidence | undefined {
  const skillTerms = [
    skill.id.toLowerCase(),
    skill.label.toLowerCase(),
  ];
  const matchingObservations = observations.filter((observation) => {
    const note = observation.note.toLowerCase();
    return skillTerms.some((term) => note.includes(term));
  });

  if (matchingObservations.length === 0) return undefined;

  return {
    type: 'parent_observation',
    skill_id: skill.id,
    source_ids: matchingObservations.map((observation) => observation.observation_id),
    source_type: 'parent_observation',
    activity_ids: [],
    summary: `${matchingObservations.length} parent observation(s) mention this skill.`,
    strength: 1,
    timestamp: matchingObservations[matchingObservations.length - 1]?.created_at,
  };
}

function compareEventsByTimestamp(
  a: ActivityAttemptEvent,
  b: ActivityAttemptEvent
): number {
  return (
    a.timestamp.localeCompare(b.timestamp) ||
    a.event_id.localeCompare(b.event_id)
  );
}

function getAverageResponseMs(events: ActivityAttemptEvent[]): number {
  if (events.length === 0) return 0;
  return Math.round(
    events.reduce((sum, event) => sum + event.response_time_ms, 0) / events.length
  );
}

function getEvidenceContext(
  event: ActivityAttemptEvent,
  activityById: Map<string, LearningActivity>
): string {
  return activityById.get(event.activity_id)?.transfer.context_type ?? event.activity_id;
}

function getUniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function isHintForSkill(event: ActivityAttemptEvent, skillId: string): boolean {
  const outcome = getSkillOutcome(event, skillId);
  if (!outcome) return false;
  if (outcome === 'hint_used') return true;

  return !event.skill_outcomes && event.hint_shown;
}
