/**
 * Contract tests: parent panel summary formatting.
 */

import { describe, expect, test } from 'vitest';
import {
  buildLocalDataHealth,
  buildProgressExportPayload,
} from '../../src/core/export-data';
import {
  formatParentDataHealth,
  getParentEmptyStateMessage,
} from '../../src/core/parent-panel-summary';
import { createEmptyProgressProfile } from '../../src/core/progress';
import type { ActivityAttemptEvent } from '../../src/types/events';
import type { ParentObservation } from '../../src/types/observations';
import type { ParentDifficultyAction } from '../../src/types/parent-actions';
import type { ParentSettings } from '../../src/types/storage';

describe('parent panel summary contract', () => {
  test('panel data health uses the same counts as export data health', () => {
    const events = [
      makeEvent('event-1', 'session-1', '2026-01-01T12:00:00.000Z'),
      makeEvent('event-2', 'session-2', '2026-01-01T12:05:00.000Z', {
        migrated_from_legacy: true,
      }),
    ];
    const observations = [makeObservation()];
    const actions = [makeAction()];

    const localHealth = buildLocalDataHealth(events, observations, actions);
    const exportPayload = buildProgressExportPayload({
      settings: makeSettings(),
      childProfile: createEmptyProgressProfile('local-child'),
      events,
      observations,
      actions,
      exportedAt: '2026-01-01T12:10:00.000Z',
    });

    expect(localHealth).toEqual(exportPayload.data_health);
  });

  test('formats data health for a compact parent panel summary', () => {
    const summary = formatParentDataHealth({
      total_events: 2,
      total_sessions: 1,
      total_observations: 1,
      total_parent_actions: 1,
      total_transfer_decisions: 1,
      total_activity_brief_decisions: 1,
      total_mastery_snapshots: 1,
      total_review_schedule_records: 1,
      first_event_timestamp: '2026-01-01T12:00:00.000Z',
      latest_event_timestamp: '2026-01-01T12:05:00.000Z',
      migrated_event_count: 1,
    });

    expect(summary.status_label).toBe('Local data ready');
    expect(summary.status_detail).toBe('Latest activity: 2026-01-01 12:05 UTC.');
    expect(summary.compact_metrics).toEqual([
      { label: 'Events', value: '2' },
      { label: 'Sessions', value: '1' },
      { label: 'Parent Notes', value: '1' },
      { label: 'Parent Actions', value: '1' },
      { label: 'Transfer Choices', value: '1' },
      { label: 'Brief Choices', value: '1' },
      { label: 'Mastery Checks', value: '1' },
      { label: 'Review Plans', value: '1' },
      { label: 'Latest Event', value: '2026-01-01 12:05 UTC' },
    ]);
    expect(summary.metrics).toEqual([
      { label: 'Events', value: '2' },
      { label: 'Sessions', value: '1' },
      { label: 'Parent Notes', value: '1' },
      { label: 'Parent Actions', value: '1' },
      { label: 'Transfer Choices', value: '1' },
      { label: 'Brief Choices', value: '1' },
      { label: 'Mastery Checks', value: '1' },
      { label: 'Review Plans', value: '1' },
      { label: 'First Event', value: '2026-01-01 12:00 UTC' },
      { label: 'Latest Event', value: '2026-01-01 12:05 UTC' },
      { label: 'Migrated Events', value: '1' },
    ]);
  });

  test('formats empty data health and review empty-state copy', () => {
    const summary = formatParentDataHealth({
      total_events: 0,
      total_sessions: 0,
      total_observations: 0,
      total_parent_actions: 0,
      total_transfer_decisions: 0,
      total_activity_brief_decisions: 0,
      total_mastery_snapshots: 0,
      total_review_schedule_records: 0,
      migrated_event_count: 0,
    });

    expect(summary.status_label).toBe('Waiting for first activity');
    expect(summary.status_detail).toBe('No local activity data has been recorded yet.');
    expect(summary.metrics.find((metric) => (
      metric.label === 'First Event'
    ))?.value).toBe('None yet');
    expect(getParentEmptyStateMessage('progress')).toBe(
      'No local attempts recorded yet.'
    );
    expect(getParentEmptyStateMessage('accuracy')).toBe(
      'No counted attempts in this session yet.'
    );
    expect(getParentEmptyStateMessage('recent_attempts')).toBe(
      'No attempts in this session yet. After an activity, this will show the prompt, answer, hint use, outcome, and response time.'
    );
    expect(getParentEmptyStateMessage('guidance')).toBe(
      'Guidance appears after a skill has enough local attempts. The child flow stays unchanged while the parent reviews the fit.'
    );
    expect(getParentEmptyStateMessage('parent_notes')).toBe(
      'No parent notes for this session yet. Add anything you noticed; notes stay local and export with progress data.'
    );
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

function makeObservation(): ParentObservation {
  return {
    observation_id: 'observation-1',
    session_id: 'session-1',
    child_id: 'local-child',
    note: 'Stayed focused.',
    created_at: '2026-01-01T12:08:00.000Z',
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
    created_at: '2026-01-01T12:09:00.000Z',
  };
}

function makeSettings(): ParentSettings {
  return {
    child_display_name: 'Explorer',
    session_limit_minutes: 20,
    sound_enabled: true,
    speech_enabled: true,
    video_enabled: true,
    max_activity_choices: 4,
    difficulty_mode: 'adaptive',
      story_mode: 'narrated',
    allowed_domains: ['math'],
    parent_gate_enabled: true,
    parent_gate_phrase: 'PARENT',
  };
}
