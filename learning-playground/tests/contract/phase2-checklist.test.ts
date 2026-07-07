/**
 * Contract tests: MVP Phase 2 checklist coverage.
 */

import { describe, expect, test } from 'vitest';
import { buildPhase2ChecklistCoverage } from '../../src/core/phase2-checklist';
import { ACTIVITY_TITLE_LOOKUP } from '../../src/content/activity-title-lookup';
import type { LocalDataHealth } from '../../src/core/export-data';
import type { ParentSkillInterpretation } from '../../src/core/parent-interpretation';
import type { ParentRecentAttempt } from '../../src/core/parent-review-format';
import type { ParentSessionReview } from '../../src/core/session-review';

describe('phase 2 checklist coverage contract', () => {
  test('maps session review and guidance into parent checklist answers', () => {
    const coverage = buildPhase2ChecklistCoverage({
      review: makeReview(),
      recentAttempts: [
        makeRecentAttempt('Count the Stars', ['Counting']),
        makeRecentAttempt('Find the /b/ Sound', ['Initial Sound']),
      ],
      interpretations: [
        makeInterpretation({
          skillId: 'counting',
          skillLabel: 'Counting',
          status: 'Ready for next challenge',
          statusReason: '100% accuracy with no hints or stops.',
          recommendation: 'Promote gently',
          recommendationReason: 'Offer a slightly harder version only after the parent chooses it.',
          attempts: 4,
          accuracy: 1,
        }),
        makeInterpretation({
          skillId: 'initial_sound',
          skillLabel: 'Initial Sound',
          status: 'Needs more support',
          statusReason: 'Repeated answer: cat.',
          recommendation: 'Add support',
          recommendationReason: 'Use fewer choices or model the answer once.',
          attempts: 3,
          accuracy: 0,
          repeatedErrorPattern: 'cat',
        }),
      ],
      dataHealth: makeDataHealth(),
      activityTitleLookup: ACTIVITY_TITLE_LOOKUP,
    });

    expect(coverage.answered_count).toBe(10);
    expect(coverage.total_count).toBe(10);
    expect(coverage.fit_summary).toMatchObject({
      status: 'Needs support',
      summary: 'Some current activities may need more support or simplification.',
    });
    expect(findAnswer(coverage.items, 'What did my child do?')).toMatchObject({
      state: 'Answered',
      answer: 'Completed Count the Stars.',
      source_labels: ['Session Review', 'Recent Attempts'],
    });
    expect(findAnswer(coverage.items, 'What skills were practiced?').answer).toBe(
      'Counting and Initial Sound'
    );
    expect(findAnswer(coverage.items, 'What seemed easy?').answer).toContain(
      'Counting looked ready'
    );
    expect(findAnswer(coverage.items, 'What seemed difficult?').answer).toContain(
      'Initial Sound may need support'
    );
    expect(findAnswer(coverage.items, 'What should we try next?').answer).toBe(
      'Add support for Initial Sound.'
    );
    expect(findAnswer(
      coverage.items,
      'What should we try next?'
    ).source_labels).toEqual(['Parent Guidance']);
    expect(findAnswer(
      coverage.items,
      'Why is the app making that recommendation?'
    ).answer).toContain('Repeated answer: cat.');
    expect(findAnswer(coverage.items, 'Can I export everything?')).toMatchObject({
      state: 'Answered',
      source_labels: ['Data Management'],
    });
    expect(findAnswer(coverage.items, 'Can I delete everything?').state).toBe('Answered');
    expect(findAnswer(
      coverage.items,
      'Does the child experience remain identical?'
    ).answer).toContain('parent-only');
    expect(findAnswer(
      coverage.items,
      'Does every safety guarantee still hold?'
    ).answer).toContain('local data only');
  });

  test('marks checklist answers as low-data when there is no session evidence yet', () => {
    const coverage = buildPhase2ChecklistCoverage({
      review: {
        session_id: 'session-1',
        completed_activities: [],
        skills_touched: [],
        accuracy_by_skill: [],
        hints_used: 0,
        abandoned_activities: [],
        parent_notes: [],
      },
      recentAttempts: [],
      interpretations: [],
      dataHealth: {
        total_events: 0,
        total_sessions: 0,
        total_observations: 0,
        total_parent_actions: 0,
        total_transfer_decisions: 0,
        total_activity_brief_decisions: 0,
        total_mastery_snapshots: 0,
        total_review_schedule_records: 0,
        migrated_event_count: 0,
      },
      activityTitleLookup: ACTIVITY_TITLE_LOOKUP,
    });

    expect(coverage.answered_count).toBe(4);
    expect(coverage.fit_summary).toMatchObject({
      status: 'Not enough data',
      summary: 'Current fit needs a few more reviewed attempts before the app can describe it.',
    });
    expect(findAnswer(coverage.items, 'What did my child do?').state).toBe(
      'Needs more data'
    );
    expect(findAnswer(coverage.items, 'What skills were practiced?').state).toBe(
      'Needs more data'
    );
    expect(findAnswer(coverage.items, 'What seemed easy?').state).toBe(
      'Not applicable yet'
    );
    expect(findAnswer(coverage.items, 'What should we try next?').state).toBe(
      'Not applicable yet'
    );
    expect(findAnswer(coverage.items, 'Can I export everything?').state).toBe(
      'Answered'
    );
  });

  test('marks the current fit as too easy when parent guidance is ready for challenge', () => {
    const coverage = buildCoverageWithInterpretations([
      makeInterpretation({
        skillId: 'counting',
        skillLabel: 'Counting',
        status: 'Ready for next challenge',
        statusReason: '90% accuracy with no hints or stops.',
        recommendation: 'Promote gently',
        recommendationReason: 'Offer a slightly harder version only after the parent chooses it.',
        attempts: 5,
        accuracy: 0.9,
      }),
    ]);

    expect(coverage.fit_summary).toMatchObject({
      status: 'Too easy',
      summary: 'Some current activities may be ready for a gentle challenge.',
    });
    expect(coverage.fit_summary.evidence).toContain(
      'Counting: 90% accuracy with no hints or stops.'
    );
  });

  test('marks the current fit as good fit when guidance says to keep practice stable', () => {
    const coverage = buildCoverageWithInterpretations([
      makeInterpretation({
        skillId: 'counting',
        skillLabel: 'Counting',
        status: 'Keep practicing here',
        statusReason: '70% accuracy across 4 attempt(s).',
        recommendation: 'Keep stable',
        recommendationReason: 'Stay with this level and watch the next few attempts.',
        attempts: 4,
        accuracy: 0.7,
      }),
    ]);

    expect(coverage.fit_summary).toMatchObject({
      status: 'Good fit',
      summary: 'Current activities look like a steady fit for practice.',
    });
    expect(coverage.fit_summary.evidence).toContain(
      'Counting: 70% accuracy across 4 attempt(s).'
    );
  });
});

function findAnswer(
  items: ReturnType<typeof buildPhase2ChecklistCoverage>['items'],
  question: string
) {
  const item = items.find((entry) => entry.question === question);
  if (!item) throw new Error(`Missing checklist question: ${question}`);
  return item;
}

function makeReview(): ParentSessionReview {
  return {
    session_id: 'session-1',
    completed_activities: ['math-count-stars-three'],
    skills_touched: ['counting', 'initial_sound'],
    accuracy_by_skill: [],
    hints_used: 1,
    abandoned_activities: ['phonics-find-b'],
    most_repeated_activity: 'phonics-find-b',
    parent_notes: [],
  };
}

function makeRecentAttempt(
  activityTitle: string,
  skillLabels: string[]
): ParentRecentAttempt {
  return {
    event_id: `event-${activityTitle}`,
    activity_id: 'activity-id',
    activity_title: activityTitle,
    skill_ids: skillLabels.map((label) => label.toLowerCase().replaceAll(' ', '_')),
    skill_labels: skillLabels,
    prompt_text: 'Prompt',
    selected_answer: 'selected',
    correct_answer: 'correct',
    outcome: 'correct',
    outcome_label: 'Correct',
    hint_used: false,
    response_time_ms: 1000,
    response_time_label: '1 sec',
  };
}

function makeInterpretation(params: {
  skillId: string;
  skillLabel: string;
  status: ParentSkillInterpretation['status'];
  statusReason: string;
  recommendation: ParentSkillInterpretation['recommendation'];
  recommendationReason: string;
  attempts: number;
  accuracy: number;
  repeatedErrorPattern?: string;
}): ParentSkillInterpretation {
  return {
    skill_id: params.skillId,
    skill_label: params.skillLabel,
    status: params.status,
    status_reason: params.statusReason,
    recommendation: params.recommendation,
    recommendation_reason: params.recommendationReason,
    attempts: params.attempts,
    recent_accuracy: params.accuracy,
    hints_used: 0,
    abandoned_count: 0,
    repeated_error_pattern: params.repeatedErrorPattern,
  };
}

function makeDataHealth(): LocalDataHealth {
  return {
    total_events: 6,
    total_sessions: 1,
    total_observations: 1,
    total_parent_actions: 0,
    total_transfer_decisions: 0,
    total_activity_brief_decisions: 0,
    total_mastery_snapshots: 0,
    total_review_schedule_records: 0,
    first_event_timestamp: '2026-01-01T12:00:00.000Z',
    latest_event_timestamp: '2026-01-01T12:05:00.000Z',
    migrated_event_count: 0,
  };
}

function buildCoverageWithInterpretations(
  interpretations: ParentSkillInterpretation[]
) {
  return buildPhase2ChecklistCoverage({
    review: makeReview(),
    recentAttempts: [makeRecentAttempt('Count the Stars', ['Counting'])],
    interpretations,
    dataHealth: makeDataHealth(),
    activityTitleLookup: ACTIVITY_TITLE_LOOKUP,
  });
}
