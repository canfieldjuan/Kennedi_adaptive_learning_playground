import { describe, expect, test } from 'vitest';
import { buildEvidenceForSkill } from '../../src/core/evidence';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import { evaluateSkillMastery } from '../../src/core/mastery-engine';
import {
  isParentSupportObservationForSkill,
  isStructuredMasteryObservationForSkill,
} from '../../src/core/parent-observation-signals';
import type {
  ParentObservation,
  ParentObservationCategory,
} from '../../src/types/observations';

describe('parent observation signal semantics', () => {
  test('scopes structured support while keeping unscoped support session-wide', () => {
    const countingFrustration = makeObservation({
      category: 'frustration',
      skillIds: ['counting'],
      note: 'Wanted a break.',
    });
    const sessionSupport = makeObservation({
      category: 'too_hard',
      note: 'The session felt demanding.',
    });

    expect(isParentSupportObservationForSkill(countingFrustration, 'counting')).toBe(true);
    expect(isParentSupportObservationForSkill(countingFrustration, 'vocabulary')).toBe(false);
    expect(isParentSupportObservationForSkill(sessionSupport, 'counting')).toBe(true);
    expect(isParentSupportObservationForSkill(sessionSupport, 'vocabulary')).toBe(true);
  });

  test('uses tagged independent success as evidence without requiring skill prose', () => {
    const graph = loadCurriculumGraph();
    const counting = graph.getSkill('counting');
    expect(counting).toBeDefined();
    const observation = makeObservation({
      category: 'independent_success',
      skillIds: ['counting'],
      note: 'Did this without help.',
    });
    const evidence = buildEvidenceForSkill({
      skill: counting!,
      events: [],
      observations: [observation],
    });
    const mastery = evaluateSkillMastery({
      skill_id: 'counting',
      events: [],
      observations: [observation],
      graph,
    });

    expect(isStructuredMasteryObservationForSkill(observation, 'counting')).toBe(true);
    expect(evidence.evidence).toContainEqual(expect.objectContaining({
      type: 'parent_observation',
      source_ids: [observation.observation_id],
      summary: '1 parent observation(s) reference this skill.',
    }));
    expect(mastery).toMatchObject({
      next_status: 'not_started',
      confidence: 0,
      recommended_action: 'introduce',
    });
  });

  test.each<ParentObservationCategory>([
    'general',
    'needed_support',
    'too_easy',
    'about_right',
    'too_hard',
    'frustration',
  ])('does not turn structured %s into positive mastery evidence', (category) => {
    const graph = loadCurriculumGraph();
    const counting = graph.getSkill('counting');
    expect(counting).toBeDefined();
    const observation = makeObservation({
      category,
      skillIds: ['counting'],
      note: 'Counting is named here on purpose.',
    });
    const evidence = buildEvidenceForSkill({
      skill: counting!,
      events: [],
      observations: [observation],
    });

    expect(evidence.evidence.some((item) => item.type === 'parent_observation')).toBe(false);
  });

  test('preserves legacy note-to-skill evidence matching', () => {
    const graph = loadCurriculumGraph();
    const counting = graph.getSkill('counting');
    expect(counting).toBeDefined();
    const legacyObservation = makeObservation({
      note: 'Counting looked strong today.',
    });
    const evidence = buildEvidenceForSkill({
      skill: counting!,
      events: [],
      observations: [legacyObservation],
    });

    expect(evidence.evidence).toContainEqual(expect.objectContaining({
      type: 'parent_observation',
      source_ids: [legacyObservation.observation_id],
    }));
  });
});

function makeObservation(params: {
  note: string;
  category?: ParentObservationCategory;
  skillIds?: string[];
}): ParentObservation {
  return {
    observation_id: `observation-${params.category ?? 'legacy'}`,
    session_id: 'session-1',
    child_id: 'local-child',
    note: params.note,
    category: params.category,
    skill_ids: params.skillIds,
    created_at: '2026-01-01T12:00:00.000Z',
  };
}
