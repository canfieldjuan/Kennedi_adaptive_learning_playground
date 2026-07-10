import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import {
  evaluateSkillDifficultyCoverage,
  listCurriculumDifficultyGaps,
} from '../../src/core/difficulty-coverage';
import type { LearningActivity } from '../../src/types/activity';

describe('difficulty coverage', () => {
  test('reports a covered entry rung from approved catalog activities', () => {
    const coverage = evaluateSkillDifficultyCoverage({
      skill_id: 'counting',
      current_level: 0,
    });

    expect(coverage).toMatchObject({
      skill_id: 'counting',
      current_level: 0,
      current_min_difficulty_level: 0,
      current_max_difficulty_level: 1,
      status: 'covered',
      covered_level_count: 3,
      total_level_count: 3,
    });
    expect(coverage?.approved_activity_ids).toContain('number-train');
  });

  test('reports the structured counting rung as covered by the studio variant', () => {
    const coverage = evaluateSkillDifficultyCoverage({
      skill_id: 'counting',
      current_level: 1,
    });

    expect(coverage).toMatchObject({
      current_level_label: 'Counts structured quantities accurately',
      current_min_difficulty_level: 2,
      current_max_difficulty_level: 3,
      status: 'covered',
      covered_level_count: 3,
      total_level_count: 3,
    });
    expect(coverage?.approved_activity_ids).toEqual(['art-studio-five-flowers']);
  });

  test('still reports a content gap when the producing activity is absent', () => {
    const activities = APPROVED_ACTIVITIES.filter((activity) => (
      activity.id !== 'art-studio-five-flowers'
    ));
    const coverage = evaluateSkillDifficultyCoverage({
      skill_id: 'counting',
      current_level: 1,
      activities,
    });

    expect(coverage).toMatchObject({
      status: 'blocked_by_content_gap',
      approved_activity_ids: [],
      covered_level_count: 2,
      total_level_count: 3,
    });
    expect(coverage?.reason).toContain('content gap in the app');
    expect(coverage?.reason).toContain('not a judgment about the child');
  });

  test('includes both difficulty-band boundaries and excludes adjacent levels', () => {
    const activities = [1, 2, 3, 4].map((difficulty) => (
      makeCountingActivity(`counting-difficulty-${difficulty}`, difficulty)
    ));
    const coverage = evaluateSkillDifficultyCoverage({
      skill_id: 'counting',
      current_level: 1,
      activities,
    });

    expect(coverage?.approved_activity_ids).toEqual([
      'counting-difficulty-2',
      'counting-difficulty-3',
    ]);
  });

  test('does not coerce an unknown skill or undeclared level', () => {
    expect(evaluateSkillDifficultyCoverage({
      skill_id: 'missing-skill',
      current_level: 0,
    })).toBeUndefined();
    expect(evaluateSkillDifficultyCoverage({
      skill_id: 'counting',
      current_level: 99,
    })).toBeUndefined();
  });

  test('lists the exact current approved-content gaps', () => {
    expect(listCurriculumDifficultyGaps().map((gap) => (
      `${gap.skill_id}:${gap.level}:${gap.min_difficulty_level}-${gap.max_difficulty_level}`
    ))).toEqual([
      'number_sequence:1:2-3',
      'number_sequence:2:4-5',
      'numeral_recognition:1:2-3',
      'numeral_recognition:2:4-5',
      'quantity_construction:1:2-3',
      'quantity_construction:2:4-5',
      'subitizing:2:4-5',
      // vocabulary:2:4-5 is covered by art-studio-story-outside (Bear Art
      // Studio story card).
    ]);
  });
});

function makeCountingActivity(
  id: string,
  difficulty: number
): LearningActivity {
  const base = APPROVED_ACTIVITIES.find((activity) => (
    activity.id === 'math-count-stars-three'
  ));
  if (!base) throw new Error('Missing counting test fixture');

  return {
    ...base,
    id,
    skill_ids: ['counting'],
    difficulty: {
      ...base.difficulty,
      level: difficulty as LearningActivity['difficulty']['level'],
    },
    transfer: {
      ...base.transfer,
      skill_ids: ['counting'],
    },
  };
}
