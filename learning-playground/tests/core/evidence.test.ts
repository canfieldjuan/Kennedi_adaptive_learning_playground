import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import { buildEvidenceForSkill } from '../../src/core/evidence';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('mastery evidence skill outcomes', () => {
  test('per-skill outcomes keep compound evidence skill-specific', () => {
    const graph = loadCurriculumGraph();
    const counting = graph.getSkill('counting');
    const colorFill = graph.getSkill('color_fill');
    expect(counting).toBeDefined();
    expect(colorFill).toBeDefined();
    const events = [
      makeCompoundEvent({
        eventId: 'event-1',
        outcome: 'incorrect',
        skillOutcomes: [
          {
            skill_id: 'counting',
            outcome: 'correct',
            reason: 'quantity_match',
          },
          {
            skill_id: 'color_fill',
            outcome: 'incorrect',
            reason: 'color_mismatch',
          },
        ],
      }),
      makeCompoundEvent({
        eventId: 'event-2',
        outcome: 'hint_used',
        hintShown: true,
        skillOutcomes: [
          {
            skill_id: 'color_fill',
            outcome: 'hint_used',
            reason: 'color',
          },
        ],
      }),
    ];

    const countingEvidence = buildEvidenceForSkill({
      skill: counting!,
      events,
      activities: APPROVED_ACTIVITIES,
    });
    const colorEvidence = buildEvidenceForSkill({
      skill: colorFill!,
      events,
      activities: APPROVED_ACTIVITIES,
    });

    expect(countingEvidence.counted_attempts).toBe(1);
    expect(countingEvidence.correct_attempts).toBe(1);
    expect(countingEvidence.accuracy).toBe(1);
    expect(countingEvidence.hint_rate).toBe(0);
    expect(colorEvidence.counted_attempts).toBe(1);
    expect(colorEvidence.correct_attempts).toBe(0);
    expect(colorEvidence.accuracy).toBe(0);
    expect(colorEvidence.hint_rate).toBe(1);
  });

  test('counts hinted compound attempts when skill outcomes are present', () => {
    const graph = loadCurriculumGraph();
    const counting = graph.getSkill('counting');
    expect(counting).toBeDefined();
    const events = [
      makeCompoundEvent({
        eventId: 'event-1',
        outcome: 'correct',
        skillOutcomes: [
          { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        ],
      }),
      makeCompoundEvent({
        eventId: 'event-2',
        outcome: 'correct',
        skillOutcomes: [
          { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        ],
      }),
      makeCompoundEvent({
        eventId: 'event-3',
        outcome: 'hint_used',
        hintShown: true,
        skillOutcomes: [
          { skill_id: 'counting', outcome: 'hint_used', reason: 'quantity' },
        ],
      }),
      makeCompoundEvent({
        eventId: 'event-4',
        outcome: 'correct',
        hintShown: true,
        hintedSkillIds: ['counting'],
        skillOutcomes: [
          { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        ],
      }),
      makeCompoundEvent({
        eventId: 'event-5',
        outcome: 'correct',
        skillOutcomes: [
          { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        ],
      }),
    ];

    const countingEvidence = buildEvidenceForSkill({
      skill: counting!,
      events,
      activities: APPROVED_ACTIVITIES,
    });

    expect(countingEvidence.counted_attempts).toBe(4);
    expect(countingEvidence.hint_rate).toBe(0.5);
    expect(
      countingEvidence.evidence.some((item) => item.type === 'low_hint_usage')
    ).toBe(false);
  });

  test('scopes hinted compound attempts to the hinted skill', () => {
    const graph = loadCurriculumGraph();
    const counting = graph.getSkill('counting');
    const colorFill = graph.getSkill('color_fill');
    expect(counting).toBeDefined();
    expect(colorFill).toBeDefined();
    const events = [
      makeCompoundEvent({
        eventId: 'event-1',
        outcome: 'hint_used',
        hintShown: true,
        skillOutcomes: [
          { skill_id: 'color_fill', outcome: 'hint_used', reason: 'color' },
        ],
      }),
      makeCompoundEvent({
        eventId: 'event-2',
        outcome: 'correct',
        hintShown: true,
        hintedSkillIds: ['color_fill'],
        skillOutcomes: [
          { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
          { skill_id: 'color_fill', outcome: 'correct', reason: 'color_match' },
        ],
      }),
    ];

    const countingEvidence = buildEvidenceForSkill({
      skill: counting!,
      events,
      activities: APPROVED_ACTIVITIES,
    });
    const colorEvidence = buildEvidenceForSkill({
      skill: colorFill!,
      events,
      activities: APPROVED_ACTIVITIES,
    });

    expect(countingEvidence.hint_rate).toBe(0);
    expect(colorEvidence.hint_rate).toBe(2);
  });
});

function makeCompoundEvent(params: {
  eventId: string;
  outcome: ActivityAttemptEvent['outcome'];
  hintShown?: boolean;
  hintedSkillIds?: string[];
  skillOutcomes?: ActivityAttemptEvent['skill_outcomes'];
}): ActivityAttemptEvent {
  return {
    event_id: params.eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'kennedis-orders-pink-berries-001',
    activity_version: 1,
    skill_ids: ['counting', 'color_fill'],
    timestamp: '2026-01-01T12:00:00.000Z',
    prompt_text: 'Mama Bear wants 3 pink berries.',
    outcome: params.outcome,
    skill_outcomes: params.skillOutcomes,
    selected_choice_id: 'berry',
    correct_choice_id: 'berry',
    selected_answer: '3 berry, yellow',
    correct_answer: '3 pink berry',
    attempt_number: 1,
    response_time_ms: 1400,
    difficulty_level: 4,
    choice_count: 5,
    distractor_strength: 'medium',
    input_type: 'tap',
    hint_shown: params.hintShown ?? false,
    metadata: params.hintedSkillIds
      ? { hinted_skill_ids: params.hintedSkillIds.join(',') }
      : undefined,
  };
}
