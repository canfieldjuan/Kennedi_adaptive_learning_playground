/**
 * Core tests: parent activity brief design queue.
 */

import { describe, expect, test } from 'vitest';
import { buildActivityBriefDesignQueue } from '../../src/core/activity-brief-design-queue';
import type { ParentActivityBriefDecision } from '../../src/types/activity-briefs';

describe('activity brief design queue', () => {
  test('groups latest brief decisions by queue status', () => {
    const queue = buildActivityBriefDesignQueue([
      makeDecision('brief-phonics-category_sort', 'approve_brief', {
        skillId: 'initial_sound',
        skillLabel: 'Initial Sound',
        createdAt: '2026-01-01T12:00:00.000Z',
      }),
      makeDecision('brief-counting-different_prompt_mode', 'hold_brief', {
        skillId: 'counting',
        skillLabel: 'Counting',
        createdAt: '2026-01-01T12:05:00.000Z',
      }),
      makeDecision('brief-color-parent_observed_real_world', 'archive_brief', {
        skillId: 'color_recognition',
        skillLabel: 'Color Recognition',
        createdAt: '2026-01-01T12:10:00.000Z',
      }),
    ]);

    expect(queue.total_count).toBe(3);
    expect(queue.approved).toHaveLength(1);
    expect(queue.held).toHaveLength(1);
    expect(queue.archived).toHaveLength(1);
    expect(queue.approved[0]).toMatchObject({
      status: 'approved',
      skill_label: 'Initial Sound',
      suggested_activity_pattern: 'B Food Basket',
    });
  });

  test('latest decision wins for the same skill and brief', () => {
    const queue = buildActivityBriefDesignQueue([
      makeDecision('brief-phonics-category_sort', 'approve_brief', {
        decisionId: 'decision-1',
        skillId: 'initial_sound',
        createdAt: '2026-01-01T12:00:00.000Z',
      }),
      makeDecision('brief-phonics-category_sort', 'hold_brief', {
        decisionId: 'decision-2',
        skillId: 'initial_sound',
        createdAt: '2026-01-01T12:05:00.000Z',
      }),
      makeDecision('brief-phonics-category_sort', 'archive_brief', {
        decisionId: 'decision-3',
        skillId: 'initial_sound',
        createdAt: '2026-01-01T12:10:00.000Z',
      }),
    ]);

    expect(queue.total_count).toBe(1);
    expect(queue.approved).toHaveLength(0);
    expect(queue.held).toHaveLength(0);
    expect(queue.archived).toHaveLength(1);
    expect(queue.archived[0]).toMatchObject({
      decision_id: 'decision-3',
      status: 'archived',
      queue_id: 'initial_sound::brief-phonics-category_sort',
    });
  });

  test('empty decisions produce an empty queue', () => {
    expect(buildActivityBriefDesignQueue([])).toEqual({
      approved: [],
      held: [],
      archived: [],
      total_count: 0,
    });
  });
});

function makeDecision(
  briefId: string,
  decisionType: ParentActivityBriefDecision['decision_type'],
  options: {
    decisionId?: string;
    skillId?: string;
    skillLabel?: string;
    createdAt?: string;
  } = {}
): ParentActivityBriefDecision {
  return {
    decision_id: options.decisionId ?? `${briefId}-${decisionType}`,
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: options.skillId ?? 'initial_sound',
    skill_label: options.skillLabel ?? 'Initial Sound',
    decision_type: decisionType,
    brief_id: briefId,
    required_context_type: 'category_sort',
    required_strength: 'strong',
    suggested_game_family: 'kennedis_orders',
    suggested_activity_pattern: getPattern(briefId),
    reason: 'Adds stronger transfer evidence before likely mastery.',
    status_at_decision: 'ready_for_design',
    created_at: options.createdAt ?? '2026-01-01T12:00:00.000Z',
  };
}

function getPattern(briefId: string): string {
  if (briefId.includes('counting')) return 'Picture Quantity Order Card';
  if (briefId.includes('color')) return 'Parent Color Notice';
  return 'B Food Basket';
}
