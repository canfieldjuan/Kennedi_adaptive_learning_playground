import type { LearningActivity } from '../types/activity';
import type { DistractorStrength } from '../types/domains';
import type { ActivityAttemptEvent } from '../types/events';
import type {
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../types/parent-actions';
import { formatParentDifficultyOverrideLabel } from './parent-difficulty-overrides';

export interface AppliedParentGuidance {
  override_id: string;
  override_type: ParentDifficultyOverrideType;
  override_label: string;
  skill_id: string;
  skill_label: string;
}

export interface ParentDifficultyApplicationResult {
  activity: LearningActivity;
  appliedGuidance?: AppliedParentGuidance;
}

type ChoiceLike = Record<string, unknown> & {
  id: string;
  correct?: boolean;
};

const DISTRACTOR_STRENGTHS: DistractorStrength[] = [
  'none',
  'easy',
  'medium',
  'hard',
];

export function applyParentApprovedDifficulty(
  activity: LearningActivity,
  overrides: ParentDifficultyOverride[]
): ParentDifficultyApplicationResult {
  const override = findActiveOverrideForActivity(activity, overrides);
  if (!override || activity.interaction_model !== 'tap_to_match') {
    return { activity };
  }

  return {
    activity: applyTapChoiceOverride(activity, override.override_type),
    appliedGuidance: {
      override_id: override.override_id,
      override_type: override.override_type,
      override_label: formatParentDifficultyOverrideLabel(
        override.override_type
      ),
      skill_id: override.skill_id,
      skill_label: override.skill_label,
    },
  };
}

export function buildParentGuidanceEventMetadata(
  guidance?: AppliedParentGuidance
): ActivityAttemptEvent['metadata'] | undefined {
  if (!guidance) return undefined;

  return {
    parent_guidance_applied: true,
    parent_guidance_override_id: guidance.override_id,
    parent_guidance_override_type: guidance.override_type,
    parent_guidance_label: guidance.override_label,
    parent_guidance_skill_id: guidance.skill_id,
    parent_guidance_skill_label: guidance.skill_label,
  };
}

function findActiveOverrideForActivity(
  activity: LearningActivity,
  overrides: ParentDifficultyOverride[]
): ParentDifficultyOverride | undefined {
  return activity.skill_ids
    .map((skillId) => overrides.find((override) => (
      override.active &&
      override.skill_id === skillId
    )))
    .find((override): override is ParentDifficultyOverride => (
      override !== undefined
    ));
}

function applyTapChoiceOverride(
  activity: LearningActivity,
  overrideType: ParentDifficultyOverrideType
): LearningActivity {
  const choices = getChoices(activity);
  const correctChoiceId = getCorrectChoiceId(activity, choices);
  const effectiveChoiceCount = getEffectiveChoiceCount(
    activity.difficulty.choice_count,
    overrideType,
    choices.length
  );

  return {
    ...activity,
    difficulty: {
      ...activity.difficulty,
      level: getEffectiveLevel(activity.difficulty.level, overrideType),
      choice_count: effectiveChoiceCount,
      distractor_strength: getEffectiveDistractorStrength(
        activity.difficulty.distractor_strength,
        overrideType
      ),
    },
    content: {
      ...activity.content,
      choices: getEffectiveChoices(
        choices,
        correctChoiceId,
        effectiveChoiceCount
      ),
    },
    success_rules: getEffectiveSuccessRules(
      activity.success_rules,
      overrideType
    ),
  };
}

function getEffectiveLevel(
  level: LearningActivity['difficulty']['level'],
  overrideType: ParentDifficultyOverrideType
): LearningActivity['difficulty']['level'] {
  if (overrideType === 'add_support') return clampLevel(level - 1);
  if (overrideType === 'promote_gently') return clampLevel(level + 1);
  return level;
}

function getEffectiveChoiceCount(
  currentChoiceCount: number,
  overrideType: ParentDifficultyOverrideType,
  availableChoices: number
): number {
  const boundedCurrent = clampChoiceCount(currentChoiceCount, availableChoices);
  if (overrideType === 'add_support') {
    return clampChoiceCount(boundedCurrent - 1, availableChoices);
  }
  if (overrideType === 'promote_gently') {
    return clampChoiceCount(boundedCurrent + 1, availableChoices);
  }
  return boundedCurrent;
}

function getEffectiveDistractorStrength(
  strength: DistractorStrength,
  overrideType: ParentDifficultyOverrideType
): DistractorStrength {
  const currentIndex = DISTRACTOR_STRENGTHS.indexOf(strength);
  if (currentIndex < 0) return strength;

  if (overrideType === 'add_support') {
    return DISTRACTOR_STRENGTHS[Math.max(0, currentIndex - 1)];
  }
  if (overrideType === 'promote_gently') {
    return DISTRACTOR_STRENGTHS[
      Math.min(DISTRACTOR_STRENGTHS.length - 1, currentIndex + 1)
    ];
  }
  return strength;
}

function getEffectiveSuccessRules(
  successRules: Record<string, unknown>,
  overrideType: ParentDifficultyOverrideType
): Record<string, unknown> {
  if (overrideType === 'add_support') {
    return {
      ...successRules,
      max_attempts_before_hint: 1,
    };
  }

  if (overrideType === 'promote_gently') {
    const currentHintThreshold = typeof successRules.max_attempts_before_hint === 'number'
      ? successRules.max_attempts_before_hint
      : 2;
    return {
      ...successRules,
      max_attempts_before_hint: Math.max(3, currentHintThreshold),
    };
  }

  return { ...successRules };
}

function getEffectiveChoices(
  choices: ChoiceLike[],
  correctChoiceId: string | undefined,
  choiceCount: number
): ChoiceLike[] {
  if (!correctChoiceId || choices.length <= choiceCount) {
    return [...choices];
  }

  const selectedIds = new Set<string>([correctChoiceId]);
  for (const choice of choices) {
    if (choice.id === correctChoiceId) continue;
    if (selectedIds.size >= choiceCount) break;
    selectedIds.add(choice.id);
  }

  return choices.filter((choice) => selectedIds.has(choice.id));
}

function getChoices(activity: LearningActivity): ChoiceLike[] {
  const choices = activity.content.choices;
  if (!Array.isArray(choices)) return [];

  return choices.filter((choice): choice is ChoiceLike => {
    if (typeof choice !== 'object' || choice === null) return false;
    const value = choice as Record<string, unknown>;
    return (
      typeof value.id === 'string' &&
      (value.correct === undefined || typeof value.correct === 'boolean')
    );
  });
}

function getCorrectChoiceId(
  activity: LearningActivity,
  choices: ChoiceLike[]
): string | undefined {
  const configuredChoiceId = activity.success_rules.correct_choice_id;
  if (typeof configuredChoiceId === 'string') return configuredChoiceId;
  return choices.find((choice) => choice.correct === true)?.id;
}

function clampLevel(value: number): LearningActivity['difficulty']['level'] {
  return Math.min(5, Math.max(0, value)) as LearningActivity['difficulty']['level'];
}

function clampChoiceCount(value: number, availableChoices: number): number {
  const upperBound = availableChoices > 0
    ? Math.min(6, availableChoices)
    : 6;
  return Math.min(upperBound, Math.max(2, value));
}
