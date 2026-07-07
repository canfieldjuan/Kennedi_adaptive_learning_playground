/**
 * Core tests: mastery engine.
 */

import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { evaluateSkillMastery } from '../../src/core/mastery-engine';
import type { LearningActivity, TransferContextType } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('mastery engine', () => {
  test('single-context fluency must not equal likely mastery', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
        makeEvent('event-4', 'correct', '2026-01-03T12:00:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
      ],
    });

    expect(evaluation.next_status).toBe('single_context_fluent');
    expect(evaluation.transfer_coverage.status).toBe('blocked_by_content_gap');
    expect(evaluation.recommended_action).toBe('test_transfer');
    expect(evaluation.reason).toContain('transfer');
  });

  test('does not count incorrect activity contexts as transfer evidence', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-03T12:00:00.000Z'),
        makeEvent('event-4', 'correct', '2026-01-03T12:01:00.000Z'),
        makeEvent('event-5', 'incorrect', '2026-01-03T12:02:00.000Z', {
          activityId: 'math-count-blocks-three',
        }),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
        makeActivity('math-count-blocks-three', 'same_format_new_examples'),
      ],
    });

    expect(evaluation.next_status).toBe('transfer_ready');
    expect(evaluation.recommended_action).toBe('test_transfer');
    expect(evaluation.evidence.map((item) => item.type)).not.toContain(
      'transfer'
    );
  });

  test('available approved transfer variants make a fluent skill transfer ready', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
        makeActivity('math-count-blocks-three', 'same_format_new_examples'),
      ],
    });

    expect(evaluation.next_status).toBe('transfer_ready');
    expect(evaluation.transfer_coverage.status).toBe('ready_for_transfer');
  });

  test('approved catalog transfer variant makes one-context counting transfer ready', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
      ],
      activities: APPROVED_ACTIVITIES,
    });

    expect(evaluation.next_status).toBe('transfer_ready');
    expect(evaluation.next_status).not.toBe('likely_mastered');
    expect(evaluation.transfer_coverage.status).toBe('ready_for_transfer');
  });

  test('two successful transfer context types may become likely mastered', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z', {
          activityId: 'math-count-blocks-three',
        }),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
        makeActivity('math-count-blocks-three', 'different_prompt_mode'),
      ],
    });

    expect(evaluation.next_status).toBe('likely_mastered');
    expect(evaluation.recommended_action).toBe('schedule_review');
    expect(evaluation.evidence.map((item) => item.type)).toContain('transfer');
    expect(evaluation.evidence.map((item) => item.type)).not.toContain('retention');
  });

  test('approved reverse-mapping phonics evidence can support likely mastery', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'initial_sound',
      prerequisite_statuses: {
        vocabulary: 'likely_mastered',
      },
      events: [
        makePhonicsEvent('event-1', 'phonics-find-b', {
          correctChoiceId: 'bear',
          promptText: 'Find the word that starts with b.',
          answer: 'bear',
        }),
        makePhonicsEvent('event-2', 'phonics-banana-starting-letter', {
          correctChoiceId: 'letter-b',
          promptText: 'Banana starts with what letter?',
          answer: 'B',
        }),
        makePhonicsEvent('event-3', 'phonics-banana-starting-letter', {
          correctChoiceId: 'letter-b',
          promptText: 'Banana starts with what letter?',
          answer: 'B',
        }),
      ],
      activities: APPROVED_ACTIVITIES,
    });

    expect(evaluation.next_status).toBe('likely_mastered');
    expect(evaluation.next_status).not.toBe('mastered');
    expect(evaluation.transfer_coverage.successful_context_types).toEqual([
      'same_format_same_examples',
      'reverse_mapping',
    ]);
    expect(evaluation.transfer_coverage.successful_strengths).toEqual([
      'weak',
      'strong',
    ]);
    expect(evaluation.evidence.map((item) => item.type)).toContain('transfer');
  });

  test('approved different-prompt math evidence can support likely mastery', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z', {
          activityId: 'math-dot-card-three',
        }),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z', {
          activityId: 'math-dot-card-three',
        }),
      ],
      activities: APPROVED_ACTIVITIES,
    });

    expect(evaluation.next_status).toBe('likely_mastered');
    expect(evaluation.next_status).not.toBe('mastered');
    expect(evaluation.transfer_coverage.successful_context_types).toEqual([
      'same_format_same_examples',
      'different_prompt_mode',
    ]);
    expect(evaluation.transfer_coverage.successful_strengths).toEqual([
      'weak',
      'medium',
    ]);
    expect(evaluation.evidence.map((item) => item.type)).toContain('transfer');
  });

  test('weak-only transfer cannot produce likely mastery', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z', {
          activityId: 'math-count-blocks-three',
        }),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
        makeActivity('math-count-blocks-three', 'same_format_new_examples'),
      ],
    });

    expect(evaluation.next_status).toBe('blocked_by_content_gap');
    expect(evaluation.next_status).not.toBe('likely_mastered');
    expect(evaluation.transfer_coverage.successful_strengths).toEqual(['weak']);
    expect(evaluation.transfer_coverage.strongest_context_strength).toBe('weak');
    expect(evaluation.evidence.map((item) => item.type)).not.toContain('transfer');
  });

  test('transfer without delayed review cannot become mastered', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z', {
          activityId: 'math-count-blocks-three',
        }),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
        makeActivity('math-count-blocks-three', 'different_prompt_mode'),
      ],
    });

    expect(evaluation.next_status).not.toBe('mastered');
    expect(evaluation.next_status).toBe('likely_mastered');
  });

  test('requires transfer and retention before mastery', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z', {
          activityId: 'math-count-blocks-three',
        }),
        makeEvent('event-3', 'correct', '2026-01-03T12:00:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
        makeActivity('math-count-blocks-three', 'different_prompt_mode'),
      ],
    });

    expect(evaluation.next_status).toBe('mastered');
    expect(evaluation.recommended_action).toBe('schedule_review');
    expect(evaluation.evidence.map((item) => item.type)).toEqual(
      expect.arrayContaining(['accuracy', 'transfer', 'retention'])
    );
  });

  test('promotion requires enough evidence', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
      ],
    });

    expect(evaluation.next_status).toBe('introduced');
    expect(evaluation.recommended_action).toBe('practice');
    expect(evaluation.evidence.map((item) => item.type)).not.toContain(
      'accuracy'
    );
  });

  test('regression can lower a stronger previous status', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      previous_status: 'mastered',
      events: [
        makeEvent('event-1', 'incorrect', '2026-01-04T12:00:00.000Z'),
        makeEvent('event-2', 'incorrect', '2026-01-04T12:01:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
      ],
    });

    expect(evaluation.next_status).toBe('regressed');
    expect(evaluation.recommended_action).toBe('add_support');
  });

  test('mastery evidence cites source events', () => {
    const evaluation = evaluateSkillMastery({
      skill_id: 'counting',
      events: [
        makeEvent('event-1', 'correct', '2026-01-01T12:00:00.000Z'),
        makeEvent('event-2', 'correct', '2026-01-01T12:01:00.000Z'),
        makeEvent('event-3', 'correct', '2026-01-01T12:02:00.000Z'),
      ],
      activities: [
        makeActivity('math-count-stars-three', 'same_format_same_examples'),
      ],
    });

    expect(evaluation.source_event_ids).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
    expect(evaluation.skill_graph_rule).toContain('Counting requires');
  });
});

function makePhonicsEvent(
  eventId: string,
  activityId: string,
  overrides: {
    correctChoiceId: string;
    promptText: string;
    answer: string;
  }
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: activityId,
    activity_version: 1,
    skill_ids: ['initial_sound'],
    timestamp: `2026-01-01T12:00:0${eventId.slice(-1)}.000Z`,
    prompt_text: overrides.promptText,
    outcome: 'correct',
    selected_choice_id: overrides.correctChoiceId,
    correct_choice_id: overrides.correctChoiceId,
    selected_answer: overrides.answer,
    correct_answer: overrides.answer,
    attempt_number: 1,
    response_time_ms: 900,
    difficulty_level: 2,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
  };
}

function makeEvent(
  eventId: string,
  outcome: ActivityAttemptEvent['outcome'],
  timestamp: string,
  overrides: {
    activityId?: string;
  } = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: overrides.activityId ?? 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp,
    prompt_text: 'How many stars do you see?',
    outcome,
    selected_choice_id: outcome === 'correct' ? 'three' : 'two',
    correct_choice_id: 'three',
    selected_answer: outcome === 'correct' ? '3' : '2',
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
