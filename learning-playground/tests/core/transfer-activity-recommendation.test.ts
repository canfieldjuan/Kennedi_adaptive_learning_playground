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
  test('recommends an approved unsucceeded transfer activity when coverage is ready', () => {
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
      activity_id: 'math-count-hearts-three',
      activity_title: 'Count the Hearts',
      context_type: 'same_format_new_examples',
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
      makeActivity('math-count-hearts-three', 'same_format_new_examples'),
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
