/**
 * Progress profile builder.
 * Converts local attempt events into parent-visible mastery signals.
 */

import { shouldAddSupport, shouldPromoteSkill } from './adaptive-engine';
import {
  loadCurriculumGraph,
  type CurriculumGraph,
  type CurriculumSkillLevel,
} from './curriculum-graph';
import type { ActivityAttemptEvent } from '../types/events';
import type {
  ChildProgressProfile,
  SkillMasteryState,
} from '../types/progress';

const PROFILE_VERSION = 1;
const RECENT_ATTEMPT_LIMIT = 5;
const PROMOTION_ATTEMPT_MINIMUM = 5;

type CountedOutcome = 'correct' | 'incorrect' | 'abandoned';

export function createEmptyProgressProfile(
  childId: string,
  nowIso = new Date().toISOString()
): ChildProgressProfile {
  return {
    child_id: childId,
    profile_version: PROFILE_VERSION,
    created_at: nowIso,
    updated_at: nowIso,
    skill_mastery: {},
    session_summary: [],
  };
}

export function buildProgressProfileFromEvents(
  childId: string,
  events: ActivityAttemptEvent[],
  existingProfile?: ChildProgressProfile,
  nowIso = new Date().toISOString()
): ChildProgressProfile {
  const childEvents = events
    .filter((event) => event.child_id === childId)
    .sort(compareEventsByTimestamp);

  const createdAt =
    existingProfile?.created_at ??
    childEvents[0]?.timestamp ??
    nowIso;
  const updatedAt =
    childEvents[childEvents.length - 1]?.timestamp ??
    existingProfile?.updated_at ??
    nowIso;

  const skillEvents = groupEventsBySkill(childEvents);
  const skillMastery: Record<string, SkillMasteryState> = {};
  const graph = loadCurriculumGraph();

  for (const [skillId, eventsForSkill] of skillEvents) {
    const existingSkill = existingProfile?.skill_mastery[skillId];
    skillMastery[skillId] = buildSkillMasteryState(
      skillId,
      eventsForSkill,
      existingSkill,
      graph
    );
  }

  return {
    child_id: childId,
    profile_version: PROFILE_VERSION,
    created_at: createdAt,
    updated_at: updatedAt,
    skill_mastery: skillMastery,
    session_summary: existingProfile?.session_summary ?? [],
  };
}

export interface ProgressProfileNormalizationResult {
  profile: ChildProgressProfile;
  changed: boolean;
}

export function normalizeProgressProfileLevels(
  profile: ChildProgressProfile,
  graph: CurriculumGraph = loadCurriculumGraph()
): ProgressProfileNormalizationResult {
  let changed = false;
  const skillMastery: Record<string, SkillMasteryState> = {};

  for (const [skillId, state] of Object.entries(profile.skill_mastery)) {
    const normalizedLevel = normalizeSkillLevel(
      skillId,
      state.current_level,
      graph
    );
    changed ||= normalizedLevel !== state.current_level;
    skillMastery[skillId] = normalizedLevel === state.current_level
      ? state
      : {
        ...state,
        current_level: normalizedLevel,
      };
  }

  return {
    profile: changed
      ? {
        ...profile,
        skill_mastery: skillMastery,
      }
      : profile,
    changed,
  };
}

function buildSkillMasteryState(
  skillId: string,
  events: ActivityAttemptEvent[],
  existingSkill: SkillMasteryState | undefined,
  graph: CurriculumGraph
): SkillMasteryState {
  const countedEvents = events.filter(hasCountedOutcome);
  const latestEvent = events[events.length - 1];
  const latestCountedEvent = countedEvents[countedEvents.length - 1];
  const recentAttempts = countedEvents.slice(-RECENT_ATTEMPT_LIMIT);
  const correctAttempts = countedEvents.filter((event) => event.outcome === 'correct');
  const recentCorrectAttempts = recentAttempts.filter((event) => event.outcome === 'correct');
  const recentHintCount = countRecentHints(events);
  const recentAccuracy = calculateAccuracy(
    recentCorrectAttempts.length,
    recentAttempts.length
  );
  const confidence = calculateConfidence(
    recentAccuracy,
    countedEvents.length,
    recentHintCount
  );
  const baseLevel = getBaseLevel(skillId, existingSkill, graph);
  const maxLevel = graph.getMaxSkillLevel(skillId)?.level ?? baseLevel;
  const currentLevel = getSkillLevelOrFallback(skillId, baseLevel, graph);

  const candidate: SkillMasteryState = {
    skill_id: skillId,
    current_level: baseLevel,
    confidence,
    total_attempts: countedEvents.length,
    correct_attempts: correctAttempts.length,
    recent_accuracy: recentAccuracy,
    recent_average_response_ms: calculateAverageResponseTime(recentAttempts),
    last_seen_at: latestEvent.timestamp,
    last_promoted_at: existingSkill?.last_promoted_at,
    needs_review: shouldMarkNeedsReview(recentAttempts, recentHintCount),
  };

  if (
    baseLevel < maxLevel &&
    shouldPromoteFromEvents(
      candidate,
      events,
      currentLevel,
      existingSkill?.last_promoted_at
    )
  ) {
    return {
      ...candidate,
      current_level: Math.min(baseLevel + 1, maxLevel),
      last_promoted_at: latestCountedEvent?.timestamp ?? latestEvent.timestamp,
      needs_review: false,
    };
  }

  return candidate;
}

function groupEventsBySkill(
  events: ActivityAttemptEvent[]
): Map<string, ActivityAttemptEvent[]> {
  const grouped = new Map<string, ActivityAttemptEvent[]>();

  for (const event of events) {
    for (const skillId of event.skill_ids) {
      const skillEvents = grouped.get(skillId) ?? [];
      skillEvents.push(event);
      grouped.set(skillId, skillEvents);
    }
  }

  return grouped;
}

function compareEventsByTimestamp(
  a: ActivityAttemptEvent,
  b: ActivityAttemptEvent
): number {
  return a.timestamp.localeCompare(b.timestamp);
}

function hasCountedOutcome(
  event: ActivityAttemptEvent
): event is ActivityAttemptEvent & { outcome: CountedOutcome } {
  return (
    event.outcome === 'correct' ||
    event.outcome === 'incorrect' ||
    event.outcome === 'abandoned'
  );
}

function calculateAccuracy(correctCount: number, attemptCount: number): number {
  if (attemptCount === 0) return 0;
  return correctCount / attemptCount;
}

function calculateAverageResponseTime(events: ActivityAttemptEvent[]): number {
  if (events.length === 0) return 0;

  const total = events.reduce((sum, event) => sum + event.response_time_ms, 0);
  return Math.round(total / events.length);
}

function calculateConfidence(
  recentAccuracy: number,
  totalAttempts: number,
  recentHintCount: number
): number {
  if (totalAttempts === 0) return 0;

  const attemptFactor = Math.min(1, totalAttempts / PROMOTION_ATTEMPT_MINIMUM);
  const hintFactor = Math.max(0, 1 - Math.min(recentHintCount, 3) * 0.1);
  return roundToHundredths(recentAccuracy * attemptFactor * hintFactor);
}

function countRecentHints(events: ActivityAttemptEvent[]): number {
  return events
    .slice(-RECENT_ATTEMPT_LIMIT)
    .filter((event) => event.outcome === 'hint_used').length;
}

function shouldMarkNeedsReview(
  recentAttempts: ActivityAttemptEvent[],
  recentHintCount: number
): boolean {
  const recentCorrectAttempts = recentAttempts.filter((event) => event.outcome === 'correct');
  const recentAccuracy = calculateAccuracy(
    recentCorrectAttempts.length,
    recentAttempts.length
  );
  const candidate: SkillMasteryState = {
    skill_id: 'candidate',
    current_level: 0,
    confidence: calculateConfidence(
      recentAccuracy,
      recentAttempts.length,
      recentHintCount
    ),
    total_attempts: recentAttempts.length,
    correct_attempts: recentCorrectAttempts.length,
    recent_accuracy: recentAccuracy,
    recent_average_response_ms: calculateAverageResponseTime(recentAttempts),
    last_seen_at: recentAttempts[recentAttempts.length - 1]?.timestamp ?? '',
    needs_review: false,
  };

  return (
    shouldAddSupport(candidate) ||
    recentHintCount >= 2 ||
    hasTwoRecentAbandons(recentAttempts)
  );
}

function shouldPromoteFromEvents(
  state: SkillMasteryState,
  events: ActivityAttemptEvent[],
  currentLevel: CurriculumSkillLevel,
  lastPromotedAt?: string
): boolean {
  const eventsSincePromotion = lastPromotedAt
    ? events.filter((event) => event.timestamp > lastPromotedAt)
    : events;
  const eventsInCurrentBand = eventsSincePromotion.filter((event) => (
    isWithinDifficultyBand(event, currentLevel)
  ));
  const eligibleAttempts = eventsInCurrentBand.filter(hasCountedOutcome);

  if (eligibleAttempts.length < PROMOTION_ATTEMPT_MINIMUM) return false;

  const recentEligibleAttempts = eligibleAttempts.slice(-RECENT_ATTEMPT_LIMIT);
  const recentCorrectAttempts = recentEligibleAttempts.filter((event) => (
    event.outcome === 'correct'
  ));
  const recentHintCount = countRecentHints(eventsInCurrentBand);
  const recentAccuracy = calculateAccuracy(
    recentCorrectAttempts.length,
    recentEligibleAttempts.length
  );
  const confidence = calculateConfidence(
    recentAccuracy,
    eligibleAttempts.length,
    recentHintCount
  );

  return shouldPromoteSkill({
    ...state,
    total_attempts: eligibleAttempts.length,
    correct_attempts: eligibleAttempts.filter((event) => (
      event.outcome === 'correct'
    )).length,
    recent_accuracy: recentAccuracy,
    recent_average_response_ms: calculateAverageResponseTime(recentEligibleAttempts),
    confidence,
  });
}

function getBaseLevel(
  skillId: string,
  existingSkill: SkillMasteryState | undefined,
  graph: CurriculumGraph
): number {
  const lowestLevel = graph.getLowestSkillLevel(skillId)?.level ?? 0;
  if (!existingSkill) return lowestLevel;

  return normalizeSkillLevel(skillId, existingSkill.current_level, graph);
}

function getSkillLevelOrFallback(
  skillId: string,
  level: number,
  graph: CurriculumGraph
): CurriculumSkillLevel {
  return graph.getSkillLevel(skillId, level) ??
    graph.getLowestSkillLevel(skillId) ?? {
      level: 0,
      label: 'Starting level',
      min_difficulty_level: 0,
      max_difficulty_level: 5,
    };
}

function isWithinDifficultyBand(
  event: ActivityAttemptEvent,
  level: CurriculumSkillLevel
): boolean {
  return (
    event.difficulty_level >= level.min_difficulty_level &&
    event.difficulty_level <= level.max_difficulty_level
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeSkillLevel(
  skillId: string,
  currentLevel: number,
  graph: CurriculumGraph
): number {
  const lowestLevel = graph.getLowestSkillLevel(skillId)?.level;
  const maxLevel = graph.getMaxSkillLevel(skillId)?.level;

  if (lowestLevel === undefined || maxLevel === undefined) {
    return currentLevel;
  }

  const normalizedLevel = Number.isFinite(currentLevel)
    ? Math.trunc(currentLevel)
    : lowestLevel;
  return clamp(normalizedLevel, lowestLevel, maxLevel);
}

function hasTwoRecentAbandons(events: ActivityAttemptEvent[]): boolean {
  const lastTwo = events.slice(-2);
  return (
    lastTwo.length === 2 &&
    lastTwo.every((event) => event.outcome === 'abandoned')
  );
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}
