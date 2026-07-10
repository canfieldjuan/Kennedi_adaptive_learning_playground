/**
 * Core tests: parent-approved transfer activity recommendation.
 */

import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import { buildEvidenceForSkill } from '../../src/core/evidence';
import { getTransferActivityRecommendation } from '../../src/core/transfer-activity-recommendation';
import { evaluateTransferCoverage } from '../../src/core/transfer-coverage';
import type { LearningActivity, TransferContextType } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('transfer activity recommendation', () => {
  test('recommends an approved richer math transfer activity when coverage is ready', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('counting');
    expect(skill).toBeDefined();
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1'),
        makeEvent('event-2'),
        makeEvent('event-3'),
      ],
      activities: APPROVED_ACTIVITIES,
    });
    const coverage = evaluateTransferCoverage(
      'counting',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(getTransferActivityRecommendation({
      skillId: 'counting',
      activities: APPROVED_ACTIVITIES,
      coverage,
    })).toMatchObject({
      skill_id: 'counting',
      activity_id: 'math-dot-card-three',
      activity_title: 'Dot Card Number Match',
      context_type: 'different_prompt_mode',
    });
  });

  test('recommends the approved rich phonics transfer activity when it is unsucceeded', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('initial_sound');
    expect(skill).toBeDefined();
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makePhonicsEvent('event-1'),
        makePhonicsEvent('event-2'),
        makePhonicsEvent('event-3'),
      ],
      activities: APPROVED_ACTIVITIES,
    });
    const coverage = evaluateTransferCoverage(
      'initial_sound',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(coverage.status).toBe('ready_for_transfer');
    expect(getTransferActivityRecommendation({
      skillId: 'initial_sound',
      activities: APPROVED_ACTIVITIES,
      coverage,
    })).toMatchObject({
      skill_id: 'initial_sound',
      activity_id: 'phonics-banana-starting-letter',
      activity_title: 'Banana Starting Letter',
      context_type: 'reverse_mapping',
    });
  });

  test('recommends the approved spoken blend after weak visual blending evidence', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('blending');
    expect(skill).toBeDefined();
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeBlendingEvent('event-1'),
        makeBlendingEvent('event-2'),
        makeBlendingEvent('event-3'),
      ],
      activities: APPROVED_ACTIVITIES,
    });
    const coverage = evaluateTransferCoverage(
      'blending',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(coverage.status).toBe('ready_for_transfer');
    expect(coverage.successful_strengths).toEqual(['weak']);
    expect(getTransferActivityRecommendation({
      skillId: 'blending',
      activities: APPROVED_ACTIVITIES,
      coverage,
    })).toMatchObject({
      skill_id: 'blending',
      activity_id: 'blend-listen-dog',
      activity_title: 'Listen and Blend',
      context_type: 'different_prompt_mode',
    });
  });

  test('recommends the symbolic word build after both weak build contexts succeed', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('word_building');
    expect(skill).toBeDefined();
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeWordBuildingEvent('event-1', 'build-cat', 1, 2, 'cat'),
        makeWordBuildingEvent('event-2', 'build-dog', 2, 3, 'dog'),
        makeWordBuildingEvent('event-3', 'build-cat', 1, 2, 'cat'),
      ],
      activities: APPROVED_ACTIVITIES,
    });
    const coverage = evaluateTransferCoverage(
      'word_building',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(coverage.status).toBe('ready_for_transfer');
    expect(coverage.successful_strengths).toEqual(['weak']);
    expect(getTransferActivityRecommendation({
      skillId: 'word_building',
      activities: APPROVED_ACTIVITIES,
      coverage,
    })).toMatchObject({
      skill_id: 'word_building',
      activity_id: 'build-model-map',
      activity_title: 'Copy the Word',
      context_type: 'different_prompt_mode',
    });
  });

  test('recommends the visual color request after both weak Art contexts succeed', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('color_fill');
    expect(skill).toBeDefined();
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeColorEvent('event-1', 'art-color-circle', 'sunny-yellow', 'Yellow'),
        makeColorEvent(
          'event-2',
          'art-color-circle-cool-colors',
          'apple-red',
          'Red'
        ),
        makeColorEvent('event-3', 'art-color-circle', 'sky-blue', 'Blue'),
      ],
      activities: APPROVED_ACTIVITIES,
    });
    const coverage = evaluateTransferCoverage(
      'color_fill',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(coverage.status).toBe('ready_for_transfer');
    expect(coverage.successful_strengths).toEqual(['weak']);
    expect(getTransferActivityRecommendation({
      skillId: 'color_fill',
      activities: APPROVED_ACTIVITIES,
      coverage,
    })).toMatchObject({
      skill_id: 'color_fill',
      activity_id: 'art-match-blue-card',
      activity_title: 'Match the Color Card',
      context_type: 'different_prompt_mode',
    });
  });

  test('recommends the shape scene after both weak spatial contexts succeed', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('shape_match');
    expect(skill).toBeDefined();
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeShapeEvent('event-1', 'shapes-find-circle'),
        makeShapeEvent('event-2', 'shapes-find-circle-heart'),
        makeShapeEvent('event-3', 'shapes-find-circle'),
      ],
      activities: APPROVED_ACTIVITIES,
    });
    const coverage = evaluateTransferCoverage(
      'shape_match',
      APPROVED_ACTIVITIES,
      evidence,
      graph
    );

    expect(coverage.status).toBe('ready_for_transfer');
    expect(coverage.successful_strengths).toEqual(['weak']);
    expect(getTransferActivityRecommendation({
      skillId: 'shape_match',
      activities: APPROVED_ACTIVITIES,
      coverage,
    })).toMatchObject({
      skill_id: 'shape_match',
      activity_id: 'shapes-roof-in-scene',
      activity_title: 'Roof Shape Match',
      context_type: 'different_prompt_mode',
    });
  });

  test('does not recommend a launch activity while coverage is blocked by content gap', () => {
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

    expect(coverage.status).toBe('blocked_by_content_gap');
    expect(getTransferActivityRecommendation({
      skillId: 'counting',
      activities,
      coverage,
    })).toBeUndefined();
  });

  test('does not recommend another activity after transfer coverage is successful', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('counting');
    expect(skill).toBeDefined();
    const activities = [
      makeActivity('math-count-stars-three', 'same_format_same_examples'),
      makeActivity('math-count-hearts-three', 'different_prompt_mode'),
    ];
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [
        makeEvent('event-1'),
        makeEvent('event-2', 'math-count-hearts-three'),
        makeEvent('event-3'),
      ],
      activities,
    });
    const coverage = evaluateTransferCoverage('counting', activities, evidence, graph);

    expect(coverage.status).toBe('covered');
    expect(getTransferActivityRecommendation({
      skillId: 'counting',
      activities,
      coverage,
    })).toBeUndefined();
  });
});

function makeActivity(
  activityId: string,
  contextType: TransferContextType
): LearningActivity {
  return {
    id: activityId,
    version: 1,
    title: activityId,
    domain: 'math',
    skill_ids: ['counting'],
    transfer: {
      skill_ids: ['counting'],
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

function makePhonicsEvent(eventId: string): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'phonics-find-b',
    activity_version: 1,
    skill_ids: ['initial_sound'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'Find the word that starts with b.',
    outcome: 'correct',
    selected_choice_id: 'bear',
    correct_choice_id: 'bear',
    selected_answer: 'bear',
    correct_answer: 'bear',
    attempt_number: 1,
    response_time_ms: 900,
    difficulty_level: 2,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}

function makeBlendingEvent(eventId: string): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: 'blend-cat',
    activity_version: 2,
    skill_ids: ['blending'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'Sound it out. Which word do these sounds make?',
    outcome: 'correct',
    selected_choice_id: 'cat',
    correct_choice_id: 'cat',
    selected_answer: 'cat',
    correct_answer: 'cat',
    attempt_number: 1,
    response_time_ms: 1200,
    difficulty_level: 2,
    choice_count: 3,
    distractor_strength: 'hard',
    input_type: 'tap',
    hint_shown: false,
  };
}

function makeWordBuildingEvent(
  eventId: string,
  activityId: string,
  activityVersion: number,
  difficultyLevel: number,
  word: string
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: activityId,
    activity_version: activityVersion,
    skill_ids: ['word_building'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: `Build the word ${word}.`,
    outcome: 'correct',
    selected_choice_id: word,
    correct_choice_id: word,
    selected_answer: word,
    correct_answer: word,
    attempt_number: 1,
    response_time_ms: 1400,
    difficulty_level: difficultyLevel,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}

function makeColorEvent(
  eventId: string,
  activityId: string,
  colorId: string,
  colorLabel: string
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: activityId,
    activity_version: 1,
    skill_ids: ['color_fill'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'Pick a color for the circle.',
    outcome: 'correct',
    selected_choice_id: colorId,
    selected_answer: colorLabel,
    correct_answer: colorLabel,
    attempt_number: 1,
    response_time_ms: 1100,
    difficulty_level: 1,
    choice_count: 4,
    distractor_strength: 'none',
    input_type: 'tap',
    hint_shown: false,
  };
}

function makeShapeEvent(
  eventId: string,
  activityId: string
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: activityId,
    activity_version: 1,
    skill_ids: ['shape_match'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'Find the circle.',
    outcome: 'correct',
    selected_choice_id: 'circle',
    correct_choice_id: 'circle',
    selected_answer: 'circle',
    correct_answer: 'circle',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}

function makeEvent(
  eventId: string,
  activityId = 'math-count-stars-three'
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: activityId,
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: 'How many stars do you see?',
    outcome: 'correct',
    selected_choice_id: 'three',
    correct_choice_id: 'three',
    selected_answer: '3',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: 900,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}
