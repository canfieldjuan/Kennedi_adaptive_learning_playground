/**
 * Contract tests: local progress export polish.
 */

import { describe, expect, test } from 'vitest';
import { StorageService, type KeyValueStorage } from '../../src/core/storage';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from '../../src/types/parent-actions';
import type { ParentTransferDecision } from '../../src/types/transfer';
import type { ParentActivityBriefDecision } from '../../src/types/activity-briefs';
import type {
  ParentMasterySnapshot,
  ParentReviewScheduleRecord,
} from '../../src/types/mastery-records';

class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('progress export contract', () => {
  test('adds metadata and data health while preserving raw local sections', () => {
    const storage = new StorageService(new MemoryKeyValueStorage());
    const events = [
      makeEvent('event-1', 'session-1', '2026-01-01T12:00:00.000Z'),
      makeEvent('event-2', 'session-2', '2026-01-01T12:05:00.000Z', {
        migrated_from_legacy: true,
      }),
    ];
    storage.saveParentDifficultyAction(makeAction());
    storage.saveParentDifficultyOverride(makeOverride());
    storage.saveParentTransferDecision(makeTransferDecision());
    storage.saveParentActivityBriefDecision(makeBriefDecision());
    storage.saveParentMasterySnapshot(makeMasterySnapshot());
    storage.saveParentReviewScheduleRecord(makeReviewScheduleRecord());

    const exported = JSON.parse(storage.exportProgressData(events)) as {
      exported_at: string;
      export_metadata: {
        export_version: string;
        app_baseline: string;
        export_timestamp: string;
        data_sections_included: string[];
      };
      data_health: {
        total_events: number;
        total_sessions: number;
        total_observations: number;
        total_parent_actions: number;
        total_transfer_decisions: number;
        total_activity_brief_decisions: number;
        total_mastery_snapshots: number;
        total_review_schedule_records: number;
        first_event_timestamp: string;
        latest_event_timestamp: string;
        migrated_event_count: number;
      };
      settings: { parent_gate_phrase: string };
      activity_events: ActivityAttemptEvent[];
      parent_difficulty_actions: ParentDifficultyAction[];
      parent_difficulty_overrides: ParentDifficultyOverride[];
      parent_transfer_decisions: ParentTransferDecision[];
      parent_activity_brief_decisions: ParentActivityBriefDecision[];
      parent_mastery_snapshots: ParentMasterySnapshot[];
      parent_review_schedule_records: ParentReviewScheduleRecord[];
    };

    expect(exported.exported_at).toBe(exported.export_metadata.export_timestamp);
    expect(exported.export_metadata).toMatchObject({
      export_version: '1',
      app_baseline: 'v0.2.8',
    });
    expect(exported.export_metadata.data_sections_included).toEqual([
      'settings',
      'child_profile',
      'activity_events',
      'parent_observations',
      'parent_difficulty_actions',
      'parent_difficulty_overrides',
      'parent_transfer_decisions',
      'parent_activity_brief_decisions',
      'parent_mastery_snapshots',
      'parent_review_schedule_records',
      'story_history',
      'cafe_order_history',
      'train_trip_history',
      'fashion_card_history',
    ]);
    expect(exported.data_health).toMatchObject({
      total_events: 2,
      total_sessions: 2,
      total_observations: 0,
      total_parent_actions: 1,
      total_transfer_decisions: 1,
      total_activity_brief_decisions: 1,
      total_mastery_snapshots: 1,
      total_review_schedule_records: 1,
      first_event_timestamp: '2026-01-01T12:00:00.000Z',
      latest_event_timestamp: '2026-01-01T12:05:00.000Z',
      migrated_event_count: 1,
    });
    expect(exported.settings.parent_gate_phrase).toBe('PARENT');
    expect(exported.activity_events[0].activity_id).toBe('math-count-stars-three');
    expect(exported.parent_difficulty_actions[0].action_type).toBe('keep_stable');
    expect(exported.parent_difficulty_overrides[0].override_type).toBe(
      'promote_gently'
    );
    expect(exported.parent_transfer_decisions[0].decision_type).toBe(
      'approve_transfer_activity'
    );
    expect(exported.parent_transfer_decisions[0].transfer_activity_id).toBe(
      'math-count-hearts-three'
    );
    expect(exported.parent_activity_brief_decisions[0]).toMatchObject({
      decision_type: 'approve_brief',
      brief_id: 'brief-counting-different_prompt_mode',
      suggested_activity_pattern: 'Picture Quantity Order Card',
    });
    expect(exported.parent_mastery_snapshots[0]).toMatchObject({
      skill_id: 'counting',
      next_status: 'likely_mastered',
      recommended_action: 'schedule_review',
    });
    expect(exported.parent_review_schedule_records[0]).toMatchObject({
      skill_id: 'counting',
      interval_label: 'Review after 24 hours',
      next_review_at: '2026-01-02T12:12:00.000Z',
    });

    storage.clearParentTransferDecisions();
    expect(storage.getParentTransferDecisions()).toHaveLength(0);
    storage.clearParentActivityBriefDecisions();
    expect(storage.getParentActivityBriefDecisions()).toHaveLength(0);
    storage.clearParentMasterySnapshots();
    expect(storage.getParentMasterySnapshots()).toHaveLength(0);
    storage.clearParentReviewScheduleRecords();
    expect(storage.getParentReviewScheduleRecords()).toHaveLength(0);
  });
});

function makeEvent(
  eventId: string,
  sessionId: string,
  timestamp: string,
  metadata: ActivityAttemptEvent['metadata'] = {}
): ActivityAttemptEvent {
  return {
    event_id: eventId,
    session_id: sessionId,
    child_id: 'local-child',
    activity_id: 'math-count-stars-three',
    activity_version: 1,
    skill_ids: ['counting'],
    timestamp,
    prompt_text: 'How many stars do you see?',
    outcome: 'correct',
    selected_choice_id: 'three',
    correct_choice_id: 'three',
    selected_answer: '3',
    correct_answer: '3',
    attempt_number: 1,
    response_time_ms: 1000,
    difficulty_level: 1,
    choice_count: 3,
    distractor_strength: 'easy',
    input_type: 'tap',
    hint_shown: false,
    metadata,
  };
}

function makeAction(): ParentDifficultyAction {
  return {
    action_id: 'action-1',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    action_type: 'keep_stable',
    source_recommendation: 'Keep stable',
    source_status: 'Keep practicing here',
    source_reason: 'Stay with this level and watch the next few attempts.',
    created_at: '2026-01-01T12:08:00.000Z',
  };
}

function makeOverride(): ParentDifficultyOverride {
  return {
    override_id: 'override-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    override_type: 'promote_gently',
    source_recommendation: 'Promote gently',
    source_status: 'Ready for next challenge',
    source_reason: '100% accuracy with no hints or stops.',
    active: true,
    created_at: '2026-01-01T12:09:00.000Z',
  };
}

function makeTransferDecision(): ParentTransferDecision {
  return {
    decision_id: 'transfer-decision-1',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    decision_type: 'approve_transfer_activity',
    source_recommendation: 'Add transfer activity',
    source_status: 'single_context_fluent',
    source_reason: 'Single-context fluency needs transfer coverage.',
    missing_context_type: 'same_format_new_examples',
    suggested_activity_template: 'same_quantity_new_layout',
    transfer_activity_id: 'math-count-hearts-three',
    transfer_activity_title: 'Count the Hearts',
    created_at: '2026-01-01T12:10:00.000Z',
  };
}

function makeBriefDecision(): ParentActivityBriefDecision {
  return {
    decision_id: 'brief-decision-1',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    decision_type: 'approve_brief',
    brief_id: 'brief-counting-different_prompt_mode',
    required_context_type: 'different_prompt_mode',
    required_strength: 'medium',
    suggested_game_family: 'delivery_race',
    suggested_activity_pattern: 'Picture Quantity Order Card',
    reason: 'Counting needs medium transfer evidence.',
    status_at_decision: 'ready_for_design',
    created_at: '2026-01-01T12:11:00.000Z',
  };
}

function makeMasterySnapshot(): ParentMasterySnapshot {
  return {
    snapshot_id: 'mastery-snapshot-1',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    previous_status: 'practicing',
    next_status: 'likely_mastered',
    confidence: 0.85,
    recommended_action: 'schedule_review',
    reason: 'Counting has enough transfer evidence for likely mastery.',
    evidence_summary: '3/3 counted attempt(s) correct; transfer evidence present',
    skill_graph_rule: 'Counting requires transfer and retention.',
    source_event_ids: ['event-1', 'event-2'],
    source_observation_ids: [],
    transfer_status: 'covered',
    transfer_required_context_count: 2,
    transfer_approved_context_count: 2,
    transfer_successful_context_count: 2,
    transfer_successful_strengths: ['weak', 'medium'],
    transfer_strongest_context_strength: 'medium',
    created_at: '2026-01-01T12:12:00.000Z',
  };
}

function makeReviewScheduleRecord(): ParentReviewScheduleRecord {
  return {
    schedule_id: 'review-schedule-1',
    snapshot_id: 'mastery-snapshot-1',
    session_id: 'session-1',
    child_id: 'local-child',
    skill_id: 'counting',
    skill_label: 'Counting',
    mastery_status: 'likely_mastered',
    interval_label: 'Review after 24 hours',
    next_review_at: '2026-01-02T12:12:00.000Z',
    status_after_review: 'likely_mastered',
    recommended_action: 'schedule_review',
    created_at: '2026-01-01T12:12:00.000Z',
  };
}
