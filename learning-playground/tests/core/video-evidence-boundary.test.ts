import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import videoVaultActivity from '../../src/content/activities/video-vault.json';
import { buildEvidenceForSkill } from '../../src/core/evidence';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import { evaluateSkillMastery } from '../../src/core/mastery-engine';
import { evaluateTransferCoverage } from '../../src/core/transfer-coverage';
import { createVideoCompletionEvent } from '../../src/modules/video-vault/video-evidence';
import type { ApprovedVideo } from '../../src/modules/video-vault/video-vault.types';
import type { LearningActivity } from '../../src/types/activity';
import type { ActivityAttemptEvent } from '../../src/types/events';

describe('video exposure evidence boundary', () => {
  test('video completion cannot become a counted vocabulary attempt or mastery', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('vocabulary');
    const activity = videoVaultActivity as LearningActivity;
    expect(skill).toBeDefined();
    const event = createVideoCompletionEvent({
      activity,
      childId: 'local-child',
      sessionId: 'session-1',
      manifestId: 'family-safe-videos-v1',
      promptText: 'Pick a video.',
      video: makeVideo(),
      attemptNumber: 1,
      responseTimeMs: 45_000,
    });
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [event],
      activities: [activity],
    });
    const coverage = evaluateTransferCoverage(
      'vocabulary',
      [activity],
      evidence,
      graph
    );
    const mastery = evaluateSkillMastery({
      skill_id: 'vocabulary',
      events: [event],
      activities: [activity],
      graph,
    });

    expect(evidence).toMatchObject({
      counted_attempts: 0,
      correct_attempts: 0,
      accuracy: 0,
      activity_contexts: [],
    });
    expect(evidence.evidence.map((item) => item.type)).toEqual(['completion']);
    expect(coverage.successful_context_count).toBe(0);
    expect(mastery).toMatchObject({
      next_status: 'not_started',
      confidence: 0,
      recommended_action: 'introduce',
    });
  });

  test('counts the separate vocabulary response without counting video exposure', () => {
    const graph = loadCurriculumGraph();
    const skill = graph.getSkill('vocabulary');
    const videoActivity = videoVaultActivity as LearningActivity;
    const responseActivity = APPROVED_ACTIVITIES.find((activity) => (
      activity.id === 'video-bear-bakes-bread-response'
    ));
    expect(skill).toBeDefined();
    expect(responseActivity).toBeDefined();

    const videoEvent = createVideoCompletionEvent({
      activity: videoActivity,
      childId: 'local-child',
      sessionId: 'session-1',
      manifestId: 'family-safe-videos-v1',
      promptText: 'Pick a video.',
      video: makeVideo(),
      attemptNumber: 1,
      responseTimeMs: 9_500,
    });
    const responseEvent = makeCorrectResponseEvent(responseActivity!);
    const evidence = buildEvidenceForSkill({
      skill: skill!,
      events: [videoEvent, responseEvent],
      activities: [videoActivity, responseActivity!],
    });

    expect(evidence).toMatchObject({
      counted_attempts: 1,
      correct_attempts: 1,
      accuracy: 1,
      activity_contexts: ['different_prompt_mode'],
    });
    expect(evidence.evidence.map((item) => item.type)).toEqual(['completion']);
  });
});

function makeVideo(): ApprovedVideo {
  return {
    id: 'bear-bakes-bread',
    title: 'Bear Bakes Bread',
    path: '/assets/videos/bear-bakes-bread.mp4',
    duration_seconds: 45,
    mime_type: 'video/mp4',
    evidence_role: 'exposure_only',
    response_activity_id: 'video-bear-bakes-bread-response',
    source: 'local',
    approved_by_parent: true,
    thumbnail_path: '/assets/images/bear.svg',
  };
}

function makeCorrectResponseEvent(activity: LearningActivity): ActivityAttemptEvent {
  return {
    event_id: 'event-response-1',
    session_id: 'session-1',
    child_id: 'local-child',
    activity_id: activity.id,
    activity_version: activity.version,
    skill_ids: activity.skill_ids,
    timestamp: '2026-07-10T08:00:00.000Z',
    prompt_text: 'What did Bear bake?',
    outcome: 'correct',
    selected_choice_id: 'bread',
    correct_choice_id: 'bread',
    selected_answer: 'bread',
    correct_answer: 'bread',
    attempt_number: 1,
    response_time_ms: 2_000,
    difficulty_level: activity.difficulty.level,
    choice_count: activity.difficulty.choice_count,
    distractor_strength: activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: false,
  };
}
