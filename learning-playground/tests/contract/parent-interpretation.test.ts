/**
 * Contract tests: parent interpretation layer.
 */

import { describe, expect, test } from 'vitest';
import {
  buildParentSkillInterpretations,
  type ParentSkillInterpretation,
} from '../../src/core/parent-interpretation';
import type { ParentSessionReview } from '../../src/core/session-review';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type { SkillMasteryState } from '../../src/types/progress';

describe('parent interpretation contract', () => {
  test('recommends transfer practice when approved variants exist and signals are strong', () => {
    const events = [
      makeEvent('event-1', 'correct'),
      makeEvent('event-2', 'correct'),
      makeEvent('event-3', 'correct'),
      makeEvent('event-4', 'correct'),
    ];
    const review = makeReview({
      totalAttempts: 4,
      correctAttempts: 4,
      accuracy: 1,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);

    expect(interpretation).toMatchObject({
      skill_label: 'Counting',
      status: 'Ready for next challenge',
      recommendation: 'Try transfer activity',
      attempts: 4,
      recent_accuracy: 1,
      mastery_status: 'transfer_ready',
      mastery_recommended_action: 'test_transfer',
      transfer_coverage_status: 'ready_for_transfer',
      transfer_successful_strengths: ['weak'],
      transfer_strongest_context_strength: 'weak',
      transfer_activity_recommendation: {
        activity_id: 'math-dot-card-three',
        activity_title: 'Dot Card Number Match',
        context_type: 'different_prompt_mode',
      },
    });
    expect(interpretation.recommendation_reason).toContain('approved context');
    expect(interpretation.skill_graph_rule).toContain('Counting requires');
    expect(interpretation.transfer_missing_context_types).not.toContain(
      'different_prompt_mode'
    );
    // Bear Art Studio's sticker-count activity now covers
    // different_interaction_model for counting; only retention remains.
    expect(interpretation.transfer_missing_context_types).not.toContain(
      'different_interaction_model'
    );
    expect(interpretation.transfer_missing_context_types).toContain(
      'delayed_review'
    );
  });

  test('detects repeated incorrect answers and recommends support', () => {
    const events = [
      makeEvent('event-1', 'incorrect', { selectedAnswer: '2' }),
      makeEvent('event-2', 'incorrect', { selectedAnswer: '2' }),
      makeEvent('event-3', 'incorrect', { selectedAnswer: '4' }),
    ];
    const review = makeReview({
      totalAttempts: 3,
      correctAttempts: 0,
      accuracy: 0,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);

    expect(interpretation).toMatchObject({
      status: 'Needs more support',
      recommendation: 'Add support',
      repeated_error_pattern: '2',
    });
    expect(interpretation.status_reason).toContain('Repeated answer: 2');
  });

  test('uses per-skill outcomes for compound partial-match interpretation', () => {
    const events = [
      makeCompoundEvent('event-1', [
        { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        { skill_id: 'color_fill', outcome: 'incorrect', reason: 'color_mismatch' },
      ]),
      makeCompoundEvent('event-2', [
        { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        { skill_id: 'color_fill', outcome: 'incorrect', reason: 'color_mismatch' },
      ]),
      makeCompoundEvent('event-3', [
        { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        { skill_id: 'color_fill', outcome: 'incorrect', reason: 'color_mismatch' },
      ]),
      makeCompoundEvent('event-4', [
        { skill_id: 'color_fill', outcome: 'hint_used', reason: 'color' },
      ], {
        outcome: 'hint_used',
        hintShown: true,
      }),
      makeCompoundEvent('event-5', [
        { skill_id: 'counting', outcome: 'correct', reason: 'quantity_match' },
        { skill_id: 'color_fill', outcome: 'correct', reason: 'color_match' },
      ], {
        outcome: 'correct',
        hintShown: true,
        hintedSkillIds: ['color_fill'],
      }),
    ];
    const review = makeCompoundReview();

    const interpretations = buildParentSkillInterpretations(review, events);
    const counting = getInterpretation(interpretations, 'counting');
    const color = getInterpretation(interpretations, 'color_fill');

    expect(counting).toMatchObject({
      status: 'Ready for next challenge',
      hints_used: 0,
      repeated_error_pattern: undefined,
    });
    expect(color).toMatchObject({
      status: 'Needs more support',
      hints_used: 2,
      repeated_error_pattern: '3 yellow berries',
    });
  });

  test('uses not-enough-data when the session has too little evidence', () => {
    const events = [makeEvent('event-1', 'correct')];
    const review = makeReview({
      totalAttempts: 1,
      correctAttempts: 1,
      accuracy: 1,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);

    expect(interpretation.status).toBe('Not enough data yet');
    expect(interpretation.recommendation).toBe('Not enough data');
  });

  test('uses stored current level for difficulty coverage without changing guidance', () => {
    const events = [
      makeEvent('event-1', 'correct'),
      makeEvent('event-2', 'correct'),
      makeEvent('event-3', 'correct'),
      makeEvent('event-4', 'correct'),
    ];
    const review = makeReview({
      totalAttempts: 4,
      correctAttempts: 4,
      accuracy: 1,
    });

    const [entryInterpretation] = buildParentSkillInterpretations(
      review,
      events,
      { skill_states: { counting: makeSkillState(0) } }
    );
    const [structuredInterpretation] = buildParentSkillInterpretations(
      review,
      events,
      { skill_states: { counting: makeSkillState(1) } }
    );

    expect(entryInterpretation.difficulty_coverage).toMatchObject({
      current_level: 0,
      status: 'covered',
    });
    expect(structuredInterpretation.difficulty_coverage).toMatchObject({
      current_level: 1,
      current_min_difficulty_level: 2,
      current_max_difficulty_level: 3,
      status: 'covered',
      approved_activity_ids: ['art-studio-five-flowers', 'number-train-express'],
      covered_level_count: 3,
      total_level_count: 3,
    });
    expect(structuredInterpretation.recommendation).toBe(
      entryInterpretation.recommendation
    );
  });

  test('scopes structured support observations to the tagged skill', () => {
    const countingEvents = [1, 2, 3].map((index) => (
      makeEvent(`event-${index}`, 'correct')
    ));
    const vocabularyEvents = [4, 5, 6].map((index) => ({
      ...makeEvent(`event-${index}`, 'correct'),
      activity_id: 'video-bear-bakes-bread-response',
      skill_ids: ['vocabulary'],
      prompt_text: 'What did Bear bake?',
      selected_choice_id: 'bread',
      correct_choice_id: 'bread',
      selected_answer: 'bread',
      correct_answer: 'bread',
      difficulty_level: 2,
      distractor_strength: 'medium' as const,
    }));
    const review: ParentSessionReview = {
      session_id: 'session-1',
      completed_activities: [],
      skills_touched: ['counting', 'vocabulary'],
      accuracy_by_skill: [
        { skill_id: 'counting', correct_attempts: 3, total_attempts: 3, accuracy: 1 },
        { skill_id: 'vocabulary', correct_attempts: 3, total_attempts: 3, accuracy: 1 },
      ],
      hints_used: 0,
      abandoned_activities: [],
      most_repeated_activity: 'math-count-stars-three',
      parent_notes: [{
        observation_id: 'observation-1',
        session_id: 'session-1',
        child_id: 'local-child',
        note: 'Wanted a break.',
        category: 'frustration',
        skill_ids: ['counting'],
        created_at: '2026-01-01T12:10:00.000Z',
      }],
    };

    const interpretations = buildParentSkillInterpretations(
      review,
      [...countingEvents, ...vocabularyEvents]
    );

    expect(getInterpretation(interpretations, 'counting')).toMatchObject({
      status: 'Needs more support',
      recommendation: 'Review later',
      recommendation_reason: 'Pause this skill and return when the session feels settled.',
      mastery_status: 'transfer_ready',
    });
    expect(getInterpretation(interpretations, 'vocabulary').status).toBe(
      'Ready for next challenge'
    );
  });

  test('keeps guidance language non-comparative and non-pressure-based', () => {
    const events = [
      makeEvent('event-1', 'incorrect', { hintShown: true }),
      makeEvent('event-2', 'hint_used', { hintShown: true }),
      makeEvent('event-3', 'incorrect'),
    ];
    const review = makeReview({
      totalAttempts: 3,
      correctAttempts: 0,
      accuracy: 0,
    });

    const [interpretation] = buildParentSkillInterpretations(review, events);
    const text = serializeInterpretation(interpretation).toLowerCase();

    expect(interpretation.recommendation).toBe('Add support');
    expect(text).not.toMatch(/streak|rank|behind|score|faster|shame/);
  });

  test('gated skills read their prerequisites evaluated mastery, not an unmet default', () => {
    // Counting reaches likely_mastered (three correct across two approved
    // transfer contexts); quantity_construction (prerequisite: counting) has
    // strong single-context evidence from Number Train. Before prerequisite
    // statuses were wired through, the gate treated counting as unmet and
    // pinned quantity_construction behind "still prerequisite evidence".
    const events: ActivityAttemptEvent[] = [
      makeEvent('event-1', 'correct'),
      { ...makeEvent('event-2', 'correct'), activity_id: 'math-dot-card-three' },
      makeEvent('event-3', 'correct'),
      ...[4, 5, 6].map((n) => ({
        ...makeEvent(`event-${n}`, 'correct'),
        activity_id: 'number-train',
        skill_ids: ['counting', 'quantity_construction'],
        skill_outcomes: [
          { skill_id: 'counting', outcome: 'correct' as const },
          { skill_id: 'quantity_construction', outcome: 'correct' as const },
        ],
        prompt_text: 'Put 7 passengers on the train.',
        selected_answer: '7',
        correct_answer: '7',
      })),
    ];
    const review: ParentSessionReview = {
      session_id: 'session-1',
      completed_activities: ['math-count-stars-three', 'number-train'],
      skills_touched: ['counting', 'quantity_construction'],
      accuracy_by_skill: [
        { skill_id: 'counting', correct_attempts: 6, total_attempts: 6, accuracy: 1 },
        {
          skill_id: 'quantity_construction',
          correct_attempts: 3,
          total_attempts: 3,
          accuracy: 1,
        },
      ],
      hints_used: 0,
      abandoned_activities: [],
      most_repeated_activity: 'number-train',
      parent_notes: [],
    };

    const interpretations = buildParentSkillInterpretations(review, events);
    const counting = interpretations.find((item) => item.skill_id === 'counting');
    const construction = interpretations.find(
      (item) => item.skill_id === 'quantity_construction'
    );

    expect(counting?.mastery_status).toBe('likely_mastered');
    expect(construction?.mastery_reason).not.toContain('prerequisite evidence');
    expect(construction?.mastery_status).not.toBe('practicing');
  });
});

function makeReview(params: {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}): ParentSessionReview {
  return {
    session_id: 'session-1',
    completed_activities: ['math-count-stars-three'],
    skills_touched: ['counting'],
    accuracy_by_skill: [
      {
        skill_id: 'counting',
        correct_attempts: params.correctAttempts,
        total_attempts: params.totalAttempts,
        accuracy: params.accuracy,
      },
    ],
    hints_used: 0,
    abandoned_activities: [],
    most_repeated_activity: 'math-count-stars-three',
    parent_notes: [],
  };
}

function makeCompoundReview(): ParentSessionReview {
  return {
    session_id: 'session-1',
    completed_activities: [],
    skills_touched: ['counting', 'color_fill'],
    accuracy_by_skill: [
      {
        skill_id: 'color_fill',
        correct_attempts: 1,
        total_attempts: 4,
        accuracy: 0.25,
      },
      {
        skill_id: 'counting',
        correct_attempts: 4,
        total_attempts: 4,
        accuracy: 1,
      },
    ],
    hints_used: 1,
    abandoned_activities: [],
    most_repeated_activity: 'kennedis-orders-pink-berries-001',
    parent_notes: [],
  };
}

function makeEvent(
  eventId: string,
  outcome: ActivityAttemptEvent['outcome'],
  overrides: {
    selectedAnswer?: string;
    hintShown?: boolean;
  } = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'How many stars do you see?',
    outcome,
    selected_choice_id: 'selected',
    correct_choice_id: 'three',
    selected_answer: overrides.selectedAnswer ?? '3',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: overrides.hintShown ?? outcome === 'hint_used',
  };
}

function makeCompoundEvent(
  eventId: string,
  skillOutcomes: ActivityAttemptEvent['skill_outcomes'],
  overrides: {
    outcome?: ActivityAttemptEvent['outcome'];
    hintShown?: boolean;
    hintedSkillIds?: string[];
  } = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'kennedis-orders-pink-berries-001',
    activity_version: 1,
    skill_ids: ['counting', 'color_fill'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'Mama Bear wants 3 pink berries.',
    outcome: overrides.outcome ?? 'incorrect',
    skill_outcomes: skillOutcomes,
    selected_choice_id: 'berry',
    correct_choice_id: 'berry',
    selected_answer: '3 yellow berries',
    correct_answer: '3 pink berries',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 4,
    choice_count: 5,
    distractor_strength: 'medium',
    input_type: 'tap',
    hint_shown: overrides.hintShown ?? false,
    metadata: overrides.hintedSkillIds
      ? { hinted_skill_ids: overrides.hintedSkillIds.join(',') }
      : undefined,
  };
}

function getInterpretation(
  interpretations: ParentSkillInterpretation[],
  skillId: string
): ParentSkillInterpretation {
  const interpretation = interpretations.find((item) => item.skill_id === skillId);
  expect(interpretation).toBeDefined();
  return interpretation!;
}

function serializeInterpretation(
  interpretation: ParentSkillInterpretation
): string {
  return [
    interpretation.status,
    interpretation.status_reason,
    interpretation.recommendation,
    interpretation.recommendation_reason,
  ].join(' ');
}

function makeSkillState(currentLevel: number): SkillMasteryState {
  return {
    skill_id: 'counting',
    current_level: currentLevel,
    confidence: 0.8,
    total_attempts: 5,
    correct_attempts: 5,
    recent_accuracy: 1,
    recent_average_response_ms: 1000,
    last_seen_at: '2026-01-01T12:00:00.000Z',
    needs_review: false,
  };
}
