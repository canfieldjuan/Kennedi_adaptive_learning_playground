import { describe, expect, test } from 'vitest';
import videoVaultActivity from '../../src/content/activities/video-vault.json';
import { buildEvidenceForSkill } from '../../src/core/evidence';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import { evaluateSkillMastery } from '../../src/core/mastery-engine';
import { evaluateTransferCoverage } from '../../src/core/transfer-coverage';
import { createVideoCompletionEvent } from '../../src/modules/video-vault/video-evidence';
import type { ApprovedVideo } from '../../src/modules/video-vault/video-vault.types';
import type { LearningActivity } from '../../src/types/activity';

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
});

function makeVideo(): ApprovedVideo {
  return {
    id: 'bear-bakes-bread',
    title: 'Bear Bakes Bread',
    path: '/assets/videos/bear-bakes-bread.mp4',
    duration_seconds: 45,
    mime_type: 'video/mp4',
    evidence_role: 'exposure_only',
    source: 'local',
    approved_by_parent: true,
    thumbnail_path: '/assets/images/bear.svg',
  };
}
