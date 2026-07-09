/**
 * Contract tests: curriculum graph integrity.
 */

import { describe, expect, test } from 'vitest';
import curriculumData from '../../src/content/curriculum/curriculum.v1.json';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import {
  loadCurriculumGraph,
  validateCurriculumGraph,
  type CurriculumGraphData,
} from '../../src/core/curriculum-graph';
import type { LearningActivity } from '../../src/types/activity';

const activities = APPROVED_ACTIVITIES as LearningActivity[];

describe('curriculum graph contract', () => {
  test('every existing activity skill exists in the curriculum graph', () => {
    const graph = loadCurriculumGraph();

    for (const activity of activities) {
      for (const skillId of activity.skill_ids) {
        expect(graph.getSkill(skillId)?.id).toBe(skillId);
      }
    }
  });

  test('every activity skill has at least one planned transfer context', () => {
    const graph = loadCurriculumGraph();

    for (const activity of activities) {
      for (const skillId of activity.skill_ids) {
        expect(graph.getSkill(skillId)?.planned_transfer_contexts.length).toBeGreaterThan(0);
      }
    }
  });

  test('every activity transfer context is planned for its skills', () => {
    const graph = loadCurriculumGraph();

    for (const activity of activities) {
      for (const skillId of activity.transfer.skill_ids) {
        expect(graph.getSkill(skillId)?.planned_transfer_contexts).toContain(
          activity.transfer.context_type
        );
      }
    }
  });

  test('every activity difficulty maps to a declared skill level', () => {
    const graph = loadCurriculumGraph();

    for (const activity of activities) {
      for (const skillId of activity.skill_ids) {
        expect(
          graph.getSkillLevelForDifficulty(skillId, activity.difficulty.level)
        ).toBeDefined();
      }
    }
  });

  test('resolves curriculum level labels and difficulty bands', () => {
    const graph = loadCurriculumGraph();

    expect(graph.getSkillLevel('counting', 1)?.label).toBe(
      'Counts small pretend-play sets'
    );
    expect(graph.getSkillLevelForDifficulty('counting', 4)?.label).toBe(
      'Counts in combined orders'
    );
    expect(graph.getLowestSkillLevel('counting')?.level).toBe(0);
    expect(graph.getMaxSkillLevel('counting')?.level).toBe(2);
  });

  test('blending maps each difficulty to a reachable level (top level not shadowed)', () => {
    const graph = loadCurriculumGraph();

    // Bands are non-overlapping (0-2 / 3-4 / 5-5), so difficulty 5 resolves to
    // the top "fluent" level 2 rather than being eclipsed by level 1's band.
    const expected: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 };
    for (let difficulty = 0; difficulty <= 5; difficulty += 1) {
      expect(graph.getSkillLevelForDifficulty('blending', difficulty)?.level).toBe(
        expected[difficulty]
      );
    }
  });

  test('current graph has valid references and no circular prerequisites', () => {
    expect(validateCurriculumGraph(curriculumData as CurriculumGraphData)).toEqual([]);
  });

  test('detects missing prerequisites', () => {
    const graph = cloneGraph();
    graph.skills[0].prerequisites = ['missing-skill'];

    expect(validateCurriculumGraph(graph)).toContain(
      `Skill ${graph.skills[0].id} has missing prerequisite missing-skill`
    );
  });

  test('detects circular prerequisite chains', () => {
    const graph = cloneGraph();
    const counting = graph.skills.find((skill) => skill.id === 'counting');
    expect(counting).toBeDefined();
    counting!.prerequisites = ['subitizing'];

    expect(validateCurriculumGraph(graph).join(' ')).toContain(
      'Circular prerequisite chain'
    );
  });

  test('detects self-unlocking skills', () => {
    const graph = cloneGraph();
    graph.skills[0].unlocks = [graph.skills[0].id];

    expect(validateCurriculumGraph(graph)).toContain(
      `Skill ${graph.skills[0].id} cannot unlock itself`
    );
  });

  test('detects missing planned transfer contexts', () => {
    const graph = cloneGraph();
    graph.skills[0].planned_transfer_contexts = [];

    expect(validateCurriculumGraph(graph)).toContain(
      `Skill ${graph.skills[0].id} needs at least one planned transfer context`
    );
  });

  test('detects missing curriculum levels', () => {
    const graph = cloneGraph();
    graph.skills[0].levels = [];

    expect(validateCurriculumGraph(graph)).toContain(
      `Skill ${graph.skills[0].id} needs at least one curriculum level`
    );
  });

  test('detects curriculum levels that do not start at zero', () => {
    const graph = cloneGraph();
    graph.skills[0].levels[0].level = 1;

    expect(validateCurriculumGraph(graph)).toContain(
      `Skill ${graph.skills[0].id} levels must be contiguous from 0`
    );
  });

  test('detects non-contiguous curriculum levels', () => {
    const graph = cloneGraph();
    graph.skills[0].levels[1].level = 3;

    expect(validateCurriculumGraph(graph)).toContain(
      `Skill ${graph.skills[0].id} levels must be contiguous from 0`
    );
  });

  test('detects invalid curriculum level difficulty bands', () => {
    const graph = cloneGraph();
    graph.skills[0].levels[0].min_difficulty_level = 4;
    graph.skills[0].levels[0].max_difficulty_level = 2;

    expect(validateCurriculumGraph(graph)).toContain(
      `Skill ${graph.skills[0].id} level 0 has invalid difficulty band`
    );
  });

  test('curriculum and child-facing activities contain no external links', () => {
    expect(JSON.stringify(curriculumData)).not.toMatch(/https?:\/\//);

    for (const activity of activities) {
      expect(JSON.stringify(activity)).not.toMatch(/https?:\/\//);
    }
  });
});

function cloneGraph(): CurriculumGraphData {
  return JSON.parse(JSON.stringify(curriculumData)) as CurriculumGraphData;
}
