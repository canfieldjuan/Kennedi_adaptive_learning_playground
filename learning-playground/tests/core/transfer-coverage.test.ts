/**
 * Core tests: transfer coverage and content gaps.
 */

import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import { buildEvidenceForSkill } from '../../src/core/evidence';
import { evaluateTransferCoverage } from '../../src/core/transfer-coverage';
import {
  getTransferContextStrength,
  type LearningActivity,
  type TransferContextType,
} from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('transfer coverage', () => {
  test('maps transfer context types to strength tiers', () => {
    expect(getTransferContextStrength('same_format_same_examples')).toBe('weak');
    expect(getTransferContextStrength('same_format_new_examples')).toBe('weak');
    expect(getTransferContextStrength('different_prompt_mode')).toBe('medium');
    expect(getTransferContextStrength('different_interaction_model')).toBe('medium');
    expect(getTransferContextStrength('reverse_mapping')).toBe('strong');
    expect(getTransferContextStrength('category_sort')).toBe('strong');
    expect(getTransferContextStrength('delayed_review')).toBe('retention');
    expect(getTransferContextStrength('parent_observed_real_world')).toBe('strong');
  });

  test('one successful context with no approved transfer variant is blocked by content gap', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('counting');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('math-count-stars-three', 'same_format_same_examples'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1'),
        makeEvent('event-2'),
        makeEvent('event-3'),
      ],
      activities,
    });

    const coverage = evaluateTransferCoverage('counting', activities, evidence, graph);

    expect(coverage).toMatchObject({
      required_context_count: 2,
      approved_context_count: 1,
      successful_context_count: 1,
      successful_strengths: ['weak'],
      strongest_context_strength: 'weak',
      status: 'blocked_by_content_gap',
    });
    expect(coverage.missing_context_types).toContain('same_format_new_examples');
    expect(coverage.missing_strengths).toEqual(
      expect.arrayContaining(['weak', 'medium', 'retention'])
    );
  });

  test('content gap recommendations cite the missing context type', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('counting');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('math-count-stars-three', 'same_format_same_examples'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1'),
        makeEvent('event-2'),
        makeEvent('event-3'),
      ],
      activities,
    });

    const [recommendation] = evaluateTransferCoverage(
      'counting',
      activities,
      evidence,
      graph
    ).recommended_content_actions;

    expect(recommendation).toMatchObject({
      skill_id: 'counting',
      recommendation_type: 'create_transfer_variant',
      suggested_context_type: 'different_prompt_mode',
      missing_context_strength: 'medium',
      current_strongest_context_strength: 'weak',
    });
    expect(recommendation.reason).toContain('Different Prompt Mode');
    expect(recommendation.reason).toContain('Missing Medium context');
    expect(recommendation.activity_variant_brief).toMatchObject({
      skill_id: 'counting',
      required_context_type: 'different_prompt_mode',
      required_strength: 'medium',
      suggested_game_family: 'delivery_race',
      suggested_activity_pattern: 'Picture Quantity Order Card',
      status: 'ready_for_design',
    });
  });

  test('weak-only transfer recommends richer missing context before likely mastery', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('counting');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('math-count-stars-three', 'same_format_same_examples'),
      makeActivity('math-count-blocks-three', 'same_format_new_examples'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1'),
        makeEvent('event-2', 'math-count-blocks-three'),
        makeEvent('event-3'),
      ],
      activities,
    });

    const coverage = evaluateTransferCoverage(
      'counting',
      activities,
      evidence,
      graph
    );

    expect(coverage).toMatchObject({
      successful_context_count: 2,
      successful_strengths: ['weak'],
      strongest_context_strength: 'weak',
      status: 'blocked_by_content_gap',
    });
    expect(coverage.recommended_content_actions[0]).toMatchObject({
      suggested_context_type: 'different_prompt_mode',
      missing_context_strength: 'medium',
      current_strongest_context_strength: 'weak',
    });
    expect(coverage.recommended_content_actions[0].activity_variant_brief).toMatchObject({
      brief_id: 'brief-counting-different_prompt_mode',
      skill_id: 'counting',
      required_context_type: 'different_prompt_mode',
      required_strength: 'medium',
      suggested_game_family: 'delivery_race',
      required_evidence: {
        minimum_accuracy: 0.8,
        min_successful_attempts: 2,
      },
    });
    expect(coverage.recommended_content_actions[0].reason).toContain(
      'Current strongest evidence is Weak'
    );
  });

  test('weak-only phonics transfer prioritizes category sort before same-format variants', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('initial_sound');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('phonics-find-b', 'same_format_same_examples', 'initial_sound', 'phonics'),
      makeActivity('phonics-find-b-ball', 'same_format_new_examples', 'initial_sound', 'phonics'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1', 'phonics-find-b', 'initial_sound', {
          correctChoiceId: 'bear',
          promptText: 'Find the word that starts with b.',
          answer: 'bear',
        }),
        makeEvent('event-2', 'phonics-find-b-ball', 'initial_sound', {
          correctChoiceId: 'ball',
          promptText: 'Find another word that starts with b.',
          answer: 'ball',
        }),
        makeEvent('event-3', 'phonics-find-b', 'initial_sound', {
          correctChoiceId: 'bear',
          promptText: 'Find the word that starts with b.',
          answer: 'bear',
        }),
      ],
      activities,
    });

    const coverage = evaluateTransferCoverage(
      'initial_sound',
      activities,
      evidence,
      graph
    );

    expect(coverage.recommended_content_actions.map((item) => (
      item.suggested_context_type
    ))).toEqual([
      'category_sort',
      'reverse_mapping',
      'delayed_review',
    ]);
    expect(coverage.recommended_content_actions[0].suggested_context_type).not.toBe(
      'same_format_new_examples'
    );
    expect(coverage.recommended_content_actions[0].activity_variant_brief).toMatchObject({
      brief_id: 'brief-initial_sound-category_sort',
      skill_id: 'initial_sound',
      domain: 'phonics',
      current_transfer_state: expect.stringContaining('successful_strengths=weak'),
      required_context_type: 'category_sort',
      required_strength: 'strong',
      suggested_game_family: 'kennedis_orders',
      suggested_activity_pattern: 'B Food Basket',
      required_evidence: {
        minimum_accuracy: 0.8,
        max_hint_rate: 0.2,
        min_successful_attempts: 2,
      },
      status: 'ready_for_design',
    });
    expect(
      coverage.recommended_content_actions[0].activity_variant_brief?.reason
    ).toContain('Current transfer state');
    expect(JSON.stringify(
      coverage.recommended_content_actions[0].activity_variant_brief
    )).not.toMatch(/https?:\/\//);
  });

  test('blending gaps recommend blending work in the existing Word game', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('blending');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('blend-cat', 'same_format_same_examples', 'blending', 'phonics'),
      makeActivity('blend-hat', 'same_format_new_examples', 'blending', 'phonics'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1', 'blend-cat', 'blending'),
        makeEvent('event-2', 'blend-hat', 'blending'),
        makeEvent('event-3', 'blend-cat', 'blending'),
      ],
      activities,
    });

    const recommendation = evaluateTransferCoverage(
      'blending',
      activities,
      evidence,
      graph
    ).recommended_content_actions[0];

    expect(recommendation).toMatchObject({
      skill_id: 'blending',
      suggested_context_type: 'different_prompt_mode',
      suggested_activity_template: 'blend_spoken_sounds_choose_word',
      activity_variant_brief: {
        suggested_game_family: 'word_game',
        suggested_activity_pattern: 'Listen and Blend',
      },
    });
    expect(recommendation.suggested_activity_template).not.toContain('initial_sound');
  });

  test('letter-sound gaps recommend letter work in the existing Word game', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('letter_sound_match');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity(
        'phonics-find-b',
        'same_format_same_examples',
        'letter_sound_match',
        'phonics'
      ),
      makeActivity(
        'phonics-find-b-ball',
        'same_format_new_examples',
        'letter_sound_match',
        'phonics'
      ),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1', 'phonics-find-b', 'letter_sound_match'),
        makeEvent('event-2', 'phonics-find-b-ball', 'letter_sound_match'),
        makeEvent('event-3', 'phonics-find-b', 'letter_sound_match'),
      ],
      activities,
    });

    const recommendation = evaluateTransferCoverage(
      'letter_sound_match',
      activities,
      evidence,
      graph
    ).recommended_content_actions[0];

    expect(recommendation).toMatchObject({
      skill_id: 'letter_sound_match',
      suggested_context_type: 'category_sort',
      suggested_activity_template: 'sort_words_by_starting_letter',
      activity_variant_brief: {
        suggested_game_family: 'word_game',
        suggested_activity_pattern: 'Starting Letter Sort',
      },
    });
  });

  test('word-building gaps recommend word-building work in the existing Word game', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('word_building');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('build-cat', 'same_format_same_examples', 'word_building', 'phonics'),
      makeActivity('build-dog', 'same_format_new_examples', 'word_building', 'phonics'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1', 'build-cat', 'word_building'),
        makeEvent('event-2', 'build-dog', 'word_building'),
        makeEvent('event-3', 'build-cat', 'word_building'),
      ],
      activities,
    });

    const recommendation = evaluateTransferCoverage(
      'word_building',
      activities,
      evidence,
      graph
    ).recommended_content_actions[0];

    expect(recommendation).toMatchObject({
      skill_id: 'word_building',
      suggested_context_type: 'different_prompt_mode',
      suggested_activity_template: 'copy_word_from_symbolic_model',
      activity_variant_brief: {
        suggested_game_family: 'word_game',
        suggested_activity_pattern: 'Copy the Word',
      },
    });
    expect(recommendation.suggested_activity_template).not.toContain('initial_sound');
  });

  test('delayed review brief declares retention evidence threshold', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('initial_sound');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('phonics-find-b', 'same_format_same_examples', 'initial_sound', 'phonics'),
      makeActivity('phonics-find-b-ball', 'same_format_new_examples', 'initial_sound', 'phonics'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1', 'phonics-find-b', 'initial_sound'),
        makeEvent('event-2', 'phonics-find-b-ball', 'initial_sound'),
        makeEvent('event-3', 'phonics-find-b', 'initial_sound'),
      ],
      activities,
    });

    const delayedReviewBrief = evaluateTransferCoverage(
      'initial_sound',
      activities,
      evidence,
      graph
    ).recommended_content_actions.find((item) => (
      item.suggested_context_type === 'delayed_review'
    ))?.activity_variant_brief;

    expect(delayedReviewBrief).toMatchObject({
      required_context_type: 'delayed_review',
      required_strength: 'retention',
      required_evidence: {
        min_successful_attempts: 1,
        requires_retention_gap_hours: 24,
      },
    });
  });

  test('two approved and successful context types are covered when one is medium or stronger', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('counting');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('math-count-stars-three', 'same_format_same_examples'),
      makeActivity('math-count-blocks-three', 'different_prompt_mode'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1'),
        makeEvent('event-2', 'math-count-blocks-three'),
        makeEvent('event-3'),
      ],
      activities,
    });

    expect(evaluateTransferCoverage(
      'counting',
      activities,
      evidence,
      graph
    )).toMatchObject({
      approved_context_count: 2,
      successful_context_count: 2,
      successful_strengths: ['weak', 'medium'],
      strongest_context_strength: 'medium',
      status: 'covered',
    });
  });

  test('approved catalog different-prompt evidence counts as medium math transfer', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('counting');
    expect(skill).toBeDefined();

    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1', 'math-count-stars-three', 'counting', {
          correctChoiceId: 'three',
          promptText: 'How many stars do you see?',
          answer: '3',
        }),
        makeEvent('event-2', 'math-dot-card-three', 'counting', {
          correctChoiceId: 'three',
          promptText: 'Look at the dot card. Which number matches?',
          answer: '3',
        }),
        makeEvent('event-3', 'math-dot-card-three', 'counting', {
          correctChoiceId: 'three',
          promptText: 'Look at the dot card. Which number matches?',
          answer: '3',
        }),
      ],
      activities: APPROVED_ACTIVITIES,
    });

    const coverage = evaluateTransferCoverage(
      'counting',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(coverage.approved_context_types).toContain('different_prompt_mode');
    expect(coverage.successful_context_types).toEqual([
      'same_format_same_examples',
      'different_prompt_mode',
    ]);
    expect(coverage.successful_strengths).toEqual(['weak', 'medium']);
    expect(coverage.strongest_context_strength).toBe('medium');
    expect(coverage.status).toBe('covered');
  });

  test('approved catalog reverse-mapping evidence counts as strong phonics transfer', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('initial_sound');
    expect(skill).toBeDefined();

    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1', 'phonics-find-b', 'initial_sound', {
          correctChoiceId: 'bear',
          promptText: 'Find the word that starts with b.',
          answer: 'bear',
        }),
        makeEvent('event-2', 'phonics-banana-starting-letter', 'initial_sound', {
          correctChoiceId: 'letter-b',
          promptText: 'Banana starts with what letter?',
          answer: 'B',
        }),
        makeEvent('event-3', 'phonics-banana-starting-letter', 'initial_sound', {
          correctChoiceId: 'letter-b',
          promptText: 'Banana starts with what letter?',
          answer: 'B',
        }),
      ],
      activities: APPROVED_ACTIVITIES,
    });

    const coverage = evaluateTransferCoverage(
      'initial_sound',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(coverage.approved_context_types).toContain('reverse_mapping');
    expect(coverage.successful_context_types).toEqual([
      'same_format_same_examples',
      'reverse_mapping',
    ]);
    expect(coverage.successful_strengths).toEqual(['weak', 'strong']);
    expect(coverage.strongest_context_strength).toBe('strong');
    expect(coverage.status).toBe('covered');
  });

  test('approved catalog gives evidence-bearing MVP skills a transfer context to try', () => {
    const graph = loadCurriculumGraph();
    const checks = [
      {
        skillId: 'initial_sound',
        activityId: 'phonics-find-b',
        correctChoiceId: 'bear',
        promptText: 'Find the word that starts with b.',
        answer: 'bear',
      },
      {
        skillId: 'letter_sound_match',
        activityId: 'phonics-find-b',
        correctChoiceId: 'bear',
        promptText: 'Find the word that starts with b.',
        answer: 'bear',
      },
      {
        skillId: 'counting',
        activityId: 'math-count-stars-three',
        correctChoiceId: 'three',
        promptText: 'How many stars do you see?',
        answer: '3',
      },
      {
        skillId: 'subitizing',
        activityId: 'math-count-stars-three',
        correctChoiceId: 'three',
        promptText: 'How many stars do you see?',
        answer: '3',
      },
      {
        skillId: 'shape_match',
        activityId: 'shapes-find-circle',
        correctChoiceId: 'circle',
        promptText: 'Find the circle.',
        answer: 'circle',
      },
      {
        skillId: 'color_fill',
        activityId: 'art-color-circle',
        correctChoiceId: 'sunny-yellow',
        promptText: 'Pick a color for the circle.',
        answer: 'Yellow',
      },
    ];

    for (const check of checks) {
      const skill = graph.getSkill(check.skillId);
      expect(skill).toBeDefined();
      const evidence = buildEvidenceForSkill({
        skill: skill!,
        events: [
          makeEvent('event-1', check.activityId, check.skillId, check),
          makeEvent('event-2', check.activityId, check.skillId, check),
          makeEvent('event-3', check.activityId, check.skillId, check),
        ],
        activities: APPROVED_ACTIVITIES,
      });

      const coverage = evaluateTransferCoverage(
        check.skillId,
        APPROVED_ACTIVITIES,
        evidence,
        graph
      );

      expect(coverage.approved_context_count).toBeGreaterThanOrEqual(
        coverage.required_context_count
      );
      expect(coverage.successful_context_count).toBe(1);
      expect(coverage.status).toBe('ready_for_transfer');
      expect(coverage.recommended_content_actions.length).toBeGreaterThan(0);
      expect(
        coverage.recommended_content_actions.every((item) => (
          item.activity_variant_brief &&
          ['medium', 'strong', 'retention'].includes(
            item.activity_variant_brief.required_strength
          )
        ))
      ).toBe(true);
    }
  });
});

function makeActivity(
  activityId: string,
  contextType: TransferContextType,
  skillId = 'counting',
  domain: LearningActivity['domain'] = 'math'
): LearningActivity {
  return {
    id: activityId,
    version: 1,
    title: activityId,
    domain,
    skill_ids: [skillId],
    transfer: {
      skill_ids: [skillId],
      context_type: contextType,
      context_id: activityId,
      example_set_id: activityId,
      prompt_mode: 'mixed',
    },
    difficulty: {
      level: 1,
      choice_count: 3,
      distractor_strength: 'easy',
    },
    interaction_model: 'tap_to_match',
    estimated_duration_seconds: 45,
    content: {},
    success_rules: {},
    feedback_rules: {},
    safety: {
      requires_parent_approval: true,
      external_links_allowed: false,
    },
  };
}

function makeEvent(
  eventId: string,
  activityId = 'math-count-stars-three',
  skillId = 'counting',
  overrides: {
    correctChoiceId?: string;
    promptText?: string;
    answer?: string;
  } = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: activityId,
    activity_version: 1,
    skill_ids: [skillId],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: overrides.promptText ?? 'How many stars do you see?',
    outcome: 'correct',
    selected_choice_id: overrides.correctChoiceId ?? 'three',
    correct_choice_id: overrides.correctChoiceId ?? 'three',
    selected_answer: overrides.answer ?? '3',
    correct_answer: overrides.answer ?? '3',
    attempt_number: 1,
    response_time_ms: 900,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}
