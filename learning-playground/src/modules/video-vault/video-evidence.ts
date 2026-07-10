import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type { ApprovedVideo } from './video-vault.types';

export function createVideoCompletionEvent(params: {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  manifestId: string;
  promptText: string;
  video: ApprovedVideo;
  attemptNumber: number;
  responseTimeMs: number;
}): ActivityAttemptEvent {
  return {
    event_id: createEventId(),
    session_id: params.sessionId,
    child_id: params.childId,
    activity_id: params.activity.id,
    activity_version: params.activity.version,
    skill_ids: params.activity.skill_ids,
    timestamp: new Date().toISOString(),
    prompt_text: params.promptText,
    outcome: 'completed',
    skill_outcomes: params.activity.skill_ids.map((skillId) => ({
      skill_id: skillId,
      outcome: 'completed',
      reason: 'Local video exposure completed; no skill response was collected.',
    })),
    selected_choice_id: params.video.id,
    selected_answer: params.video.title,
    correct_answer: params.video.title,
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: params.activity.difficulty.level,
    choice_count: params.activity.difficulty.choice_count,
    distractor_strength: params.activity.difficulty.distractor_strength,
    input_type: 'video',
    hint_shown: false,
    metadata: {
      manifest_id: params.manifestId,
      video_title: params.video.title,
      duration_seconds: params.video.duration_seconds,
      media_source: params.video.source,
      media_type: params.video.mime_type,
      evidence_role: params.video.evidence_role,
    },
  };
}

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
