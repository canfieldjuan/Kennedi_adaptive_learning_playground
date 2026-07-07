/**
 * Contract tests: curriculum graph integrity.
 */

import { describe, expect, test } from 'vitest';
import curriculumData from '../../src/content/curriculum/curriculum.v1.json';
import artColorCircle from '../../src/content/activities/art-color-circle.json';
import mathCountStarsThree from '../../src/content/activities/math-count-stars-three.json';
import phonicsFindB from '../../src/content/activities/phonics-find-b.json';
import shapesFindCircle from '../../src/content/activities/shapes-find-circle.json';
import videoVault from '../../src/content/activities/video-vault.json';
import {
  loadCurriculumGraph,
  validateCurriculumGraph,
  type CurriculumGraphData,
} from '../../src/core/curriculum-graph';
import type { LearningActivity } from '../../src/types/activity';

const activities = [
  artColorCircle,
  mathCountStarsThree,
  phonicsFindB,
  shapesFindCircle,
  videoVault,
] as LearningActivity[];

describe('curriculum graph contract', () => {
  test('every existing activity skill exists in the curriculum graph', () => {
    const graph = loadCurriculumGraph();

    for (const activity of activities) {
      for (const skillId of activity.skill_ids) {
        expect(graph.getSkill(skillId)?.id).toBe(skillId);
      }
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
