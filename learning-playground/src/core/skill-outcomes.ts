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
  if (getSkillOutcome(event, skillId) === 'hint_used') return true;
  if (!event.hint_shown) return false;

  const hintedSkillIds = getHintedSkillIds(event);
  if (hintedSkillIds) return hintedSkillIds.includes(skillId);

  return !event.skill_outcomes;
}

export function isCountedOutcome(
  outcome: AttemptOutcome
): outcome is CountedSkillOutcome {
  return outcome === 'correct' || outcome === 'incorrect' || outcome === 'abandoned';
}

function getHintedSkillIds(event: ActivityAttemptEvent): string[] | undefined {
  const value = event.metadata?.hinted_skill_ids;
  if (typeof value !== 'string') return undefined;
  return value
    .split(',')
    .map((skillId) => skillId.trim())
    .filter(Boolean);
}
