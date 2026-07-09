import type { ActivityAttemptEvent, AttemptOutcome } from '../types/events';

export type CountedSkillOutcome = Extract<
  AttemptOutcome,
  'correct' | 'incorrect' | 'abandoned'
>;

export function getSkillOutcome(
  event: ActivityAttemptEvent,
  skillId: string
): AttemptOutcome | undefined {
  if (event.skill_outcomes) {
    return event.skill_outcomes.find((item) => item.skill_id === skillId)?.outcome;
  }

  return event.outcome;
}

export function hasCountedSkillOutcome(
  event: ActivityAttemptEvent,
  skillId: string
): boolean {
  const outcome = getSkillOutcome(event, skillId);
  return outcome ? isCountedOutcome(outcome) : false;
}

export function eventAppliesToSkill(
  event: ActivityAttemptEvent,
  skillId: string
): boolean {
  return event.skill_ids.includes(skillId) && getSkillOutcome(event, skillId) !== undefined;
}

export function isCorrectForSkill(
  event: ActivityAttemptEvent,
  skillId: string
): boolean {
  return getSkillOutcome(event, skillId) === 'correct';
}

export function isHintForSkill(
  event: ActivityAttemptEvent,
  skillId: string
): boolean {
  if (!eventAppliesToSkill(event, skillId)) return false;
  return getSkillOutcome(event, skillId) === 'hint_used' || event.hint_shown;
}

export function isCountedOutcome(
  outcome: AttemptOutcome
): outcome is CountedSkillOutcome {
  return outcome === 'correct' || outcome === 'incorrect' || outcome === 'abandoned';
}
