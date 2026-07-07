/**
 * Contract tests: parent-approved guidance application.
 */

import { describe, expect, test } from 'vitest';
import {
  applyParentApprovedDifficulty,
  buildParentGuidanceEventMetadata,
} from '../../src/core/parent-difficulty-application';
import artColorCircle from '../../src/content/activities/art-color-circle.json';
import mathCountStarsThree from '../../src/content/activities/math-count-stars-three.json';
import type { LearningActivity } from '../../src/types/activity';
import type {
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../../src/types/parent-actions';

describe('parent difficulty application contract', () => {
  test('applies add support to tap-choice activities without mutating content', () => {
    const sourceActivity = cloneActivity(mathCountStarsThree as LearningActivity);
    const result = applyParentApprovedDifficulty(sourceActivity, [
      makeOverride({
        overrideId: 'override-support',
        overrideType: 'add_support',
      }),
    ]);

    expect(result.activity).not.toBe(sourceActivity);
    expect(sourceActivity.difficulty).toEqual({
      level: 1,
      choice_count: 3,
      distractor_strength: 'easy',
    });
    expect(sourceActivity.success_rules.max_attempts_before_hint).toBe(2);
    expect(getChoiceLabels(sourceActivity)).toEqual(['2', '3', '4']);

    expect(result.activity.difficulty).toEqual({
      level: 0,
      choice_count: 2,
      distractor_strength: 'none',
    });
    expect(result.activity.success_rules.max_attempts_before_hint).toBe(1);
    expect(getChoiceLabels(result.activity)).toEqual(['2', '3']);
    expect(getChoiceIds(result.activity)).toContain('three');
    expect(result.appliedGuidance).toMatchObject({
      override_id: 'override-support',
      override_type: 'add_support',
      override_label: 'Add support',
      skill_id: 'counting',
      skill_label: 'Counting',
    });
  });

  test('applies promote gently within preschool-safe activity bounds', () => {
    const sourceActivity = cloneActivity(mathCountStarsThree as LearningActivity);
    sourceActivity.difficulty = {
      level: 5,
      choice_count: 3,
      distractor_strength: 'hard',
    };

    const result = applyParentApprovedDifficulty(sourceActivity, [
      makeOverride({
        overrideId: 'override-promote',
        overrideType: 'promote_gently',
      }),
    ]);

    expect(result.activity.difficulty).toEqual({
      level: 5,
      choice_count: 3,
      distractor_strength: 'hard',
    });
    expect(result.activity.success_rules.max_attempts_before_hint).toBe(3);
    expect(getChoiceLabels(result.activity)).toEqual(['2', '3', '4']);
    expect(result.appliedGuidance?.override_label).toBe('Promote gently');
  });

  test('records parent guidance for keep-current without changing difficulty', () => {
    const sourceActivity = cloneActivity(mathCountStarsThree as LearningActivity);
    const result = applyParentApprovedDifficulty(sourceActivity, [
      makeOverride({
        overrideId: 'override-stable',
        overrideType: 'keep_current',
      }),
    ]);

    expect(result.activity).not.toBe(sourceActivity);
    expect(result.activity.difficulty).toEqual(sourceActivity.difficulty);
    expect(result.activity.success_rules).toEqual(sourceActivity.success_rules);
    expect(getChoiceIds(result.activity)).toEqual(getChoiceIds(sourceActivity));
    expect(result.appliedGuidance?.override_label).toBe('Keep current');
  });

  test('does not apply guidance to unsupported activity models', () => {
    const sourceActivity = cloneActivity(artColorCircle as LearningActivity);
    const result = applyParentApprovedDifficulty(sourceActivity, [
      makeOverride({
        overrideId: 'override-coloring',
        overrideType: 'add_support',
        skillId: 'color_fill',
        skillLabel: 'Color Fill',
      }),
    ]);

    expect(result.activity).toBe(sourceActivity);
    expect(result.appliedGuidance).toBeUndefined();
  });

  test('builds local event metadata only when guidance was applied', () => {
    const result = applyParentApprovedDifficulty(
      mathCountStarsThree as LearningActivity,
      [
        makeOverride({
          overrideId: 'override-metadata',
          overrideType: 'promote_gently',
        }),
      ]
    );

    expect(buildParentGuidanceEventMetadata(result.appliedGuidance)).toEqual({
      parent_guidance_applied: true,
      parent_guidance_override_id: 'override-metadata',
      parent_guidance_override_type: 'promote_gently',
      parent_guidance_label: 'Promote gently',
      parent_guidance_skill_id: 'counting',
      parent_guidance_skill_label: 'Counting',
    });
    expect(buildParentGuidanceEventMetadata()).toBeUndefined();
  });
});

function cloneActivity(activity: LearningActivity): LearningActivity {
  return JSON.parse(JSON.stringify(activity)) as LearningActivity;
}

function getChoiceIds(activity: LearningActivity): string[] {
  return getChoices(activity).map((choice) => choice.id);
}

function getChoiceLabels(activity: LearningActivity): string[] {
  return getChoices(activity).map((choice) => choice.label);
}

function getChoices(activity: LearningActivity): Array<{ id: string; label: string }> {
  const choices = activity.content.choices;
  if (!Array.isArray(choices)) return [];

  return choices
    .map((choice) => choice as Record<string, unknown>)
    .filter((choice): choice is { id: string; label: string } => (
      typeof choice.id === 'string' &&
      typeof choice.label === 'string'
    ));
}

function makeOverride(params: {
  overrideId: string;
  overrideType: ParentDifficultyOverrideType;
  skillId?: string;
  skillLabel?: string;
}): ParentDifficultyOverride {
  return {
    override_id: params.overrideId,
    child_id: 'local-child',
    skill_id: params.skillId ?? 'counting',
    skill_label: params.skillLabel ?? 'Counting',
    override_type: params.overrideType,
    source_recommendation: 'Promote gently',
    source_status: 'Ready for next challenge',
    source_reason: 'Recent activity fit suggested a parent-approved change.',
    active: true,
    created_at: '2026-01-01T12:00:00.000Z',
  };
}
