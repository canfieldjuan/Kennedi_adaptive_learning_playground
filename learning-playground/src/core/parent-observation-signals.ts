import type {
  ParentObservation,
  ParentObservationCategory,
} from '../types/observations';

export interface ParentObservationCategoryOption {
  value: ParentObservationCategory;
  label: string;
}

export const PARENT_OBSERVATION_CATEGORIES: ParentObservationCategoryOption[] = [
  { value: 'general', label: 'General note' },
  { value: 'independent_success', label: 'Independent success' },
  { value: 'needed_support', label: 'Needed support' },
  { value: 'too_easy', label: 'Too easy' },
  { value: 'about_right', label: 'About right' },
  { value: 'too_hard', label: 'Too hard' },
  { value: 'frustration', label: 'Frustration' },
  { value: 'real_world_transfer', label: 'Real-world transfer' },
];

const MASTERY_EVIDENCE_CATEGORIES = new Set<ParentObservationCategory>([
  'independent_success',
  'real_world_transfer',
]);

const SUPPORT_CATEGORIES = new Set<ParentObservationCategory>([
  'needed_support',
  'too_hard',
  'frustration',
]);

export function isParentObservationCategory(
  value: unknown
): value is ParentObservationCategory {
  return PARENT_OBSERVATION_CATEGORIES.some((option) => option.value === value);
}

export function formatParentObservationCategory(
  category?: ParentObservationCategory
): string {
  return PARENT_OBSERVATION_CATEGORIES.find((option) => (
    option.value === category
  ))?.label ?? 'General note';
}

export function observationAppliesToSkill(
  observation: ParentObservation,
  skillId: string
): boolean {
  return !observation.skill_ids || observation.skill_ids.length === 0 ||
    observation.skill_ids.includes(skillId);
}

export function isStructuredMasteryObservationForSkill(
  observation: ParentObservation,
  skillId: string
): boolean {
  return Boolean(
    observation.category &&
    MASTERY_EVIDENCE_CATEGORIES.has(observation.category) &&
    observation.skill_ids?.includes(skillId)
  );
}

export function isParentSupportObservationForSkill(
  observation: ParentObservation,
  skillId: string
): boolean {
  if (!observationAppliesToSkill(observation, skillId)) return false;
  if (observation.category && SUPPORT_CATEGORIES.has(observation.category)) {
    return true;
  }
  if (observation.category && observation.category !== 'general') return false;

  return /frustrat|upset|too hard|tired|needed a break|need a break|cry/i.test(
    observation.note
  );
}
