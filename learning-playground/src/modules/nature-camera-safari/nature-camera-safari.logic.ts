import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type {
  NatureCameraContent,
  SafariEvaluation,
} from './nature-camera-safari.types';

export function getNatureCameraContent(
  activity: LearningActivity
): NatureCameraContent | null {
  const value = activity.content as Partial<NatureCameraContent>;
  if (
    value.game !== 'nature-camera-safari' ||
    value.uses_real_camera !== false ||
    typeof value.mode !== 'string' ||
    !value.guide ||
    typeof value.prompt_audio !== 'string' ||
    typeof value.scene_label !== 'string' ||
    !Array.isArray(value.objects) ||
    !value.required_task
  ) {
    return null;
  }

  return value as NatureCameraContent;
}

export function evaluateSafariSelection(
  content: NatureCameraContent,
  selectedObjectIds: string[]
): SafariEvaluation {
  const selectedIds = [...new Set(selectedObjectIds)];
  const correctObjectIds = getCorrectObjectIds(content);
  const hasIncorrectSelection = selectedIds.some((id) => !correctObjectIds.includes(id));
  const selectedCorrectCount = selectedIds.filter((id) => correctObjectIds.includes(id)).length;

  if (content.mode === 'free_picture_walk') {
    const correct = selectedIds.length > 0;
    return {
      correct,
      canComplete: correct,
      issue: correct ? 'none' : 'no_photo',
      selectedObjectIds: selectedIds.slice(0, 1),
      correctObjectIds,
    };
  }

  if (content.mode === 'target_photo' || content.mode === 'album_review') {
    const selectedId = selectedIds[0] ?? '';
    const correct = correctObjectIds.includes(selectedId);
    return {
      correct,
      canComplete: correct,
      issue: correct ? 'none' : 'target',
      selectedObjectIds: selectedId ? [selectedId] : [],
      correctObjectIds,
    };
  }

  if (content.mode === 'count_photo') {
    const requestedCount = content.required_task.quantity ?? correctObjectIds.length;
    const correct = (
      !hasIncorrectSelection &&
      selectedCorrectCount === requestedCount
    );

    return {
      correct,
      canComplete: correct,
      issue: getCountIssue(selectedCorrectCount, requestedCount, hasIncorrectSelection),
      selectedObjectIds: selectedIds,
      correctObjectIds,
    };
  }

  const correct = (
    selectedIds.length === correctObjectIds.length &&
    !hasIncorrectSelection &&
    correctObjectIds.every((id) => selectedIds.includes(id))
  );

  return {
    correct,
    canComplete: correct,
    issue: correct ? 'none' : 'first_sound',
    selectedObjectIds: selectedIds,
    correctObjectIds,
  };
}

export function getCorrectObjectIds(content: NatureCameraContent): string[] {
  const task = content.required_task;

  if (content.mode === 'free_picture_walk') {
    return content.objects.map((object) => object.id);
  }

  if (task.target_ids) {
    return task.target_ids;
  }

  if (task.target_id) {
    return [task.target_id];
  }

  if (task.target_kind) {
    return content.objects
      .filter((object) => object.kind === task.target_kind)
      .map((object) => object.id)
      .slice(0, task.quantity);
  }

  if (task.first_sound) {
    return content.objects
      .filter((object) => object.first_sound === task.first_sound)
      .map((object) => object.id);
  }

  return [];
}

export function hasLargeTapAreas(
  content: NatureCameraContent,
  minimumSizePx = 80
): boolean {
  return content.objects.every((object) => object.tap_area_px >= minimumSizePx);
}

export function createNatureCameraEvent(params: {
  activity: LearningActivity;
  content: NatureCameraContent;
  sessionId: string;
  childId: string;
  outcome: ActivityAttemptEvent['outcome'];
  selectedObjectIds: string[];
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
  eventName: string;
  issue?: string;
}): ActivityAttemptEvent {
  const selectedLabels = formatObjectLabels(params.content, params.selectedObjectIds);
  const correctObjectIds = getCorrectObjectIds(params.content);

  return {
    event_id: createEventId(),
    session_id: params.sessionId,
    child_id: params.childId,
    activity_id: params.activity.id,
    activity_version: params.activity.version,
    skill_ids: params.activity.skill_ids,
    timestamp: new Date().toISOString(),
    prompt_text: params.content.prompt_audio,
    outcome: params.outcome,
    selected_choice_id: params.selectedObjectIds.join(','),
    correct_choice_id: correctObjectIds.join(','),
    selected_answer: selectedLabels || 'no photo',
    correct_answer: formatObjectLabels(params.content, correctObjectIds),
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: params.activity.difficulty.level,
    choice_count: params.activity.difficulty.choice_count,
    distractor_strength: params.activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: params.hintShown,
    metadata: {
      context_id: params.activity.transfer.context_id,
      context_type: params.activity.transfer.context_type,
      example_set_id: params.activity.transfer.example_set_id,
      prompt_mode: params.activity.transfer.prompt_mode,
      event_name: params.eventName,
      game_mode: params.content.mode,
      issue: params.issue ?? 'none',
      selected_object_ids: params.selectedObjectIds.join(','),
      correct_object_ids: correctObjectIds.join(','),
      selected_count: params.selectedObjectIds.length,
      requested_count: params.content.required_task.quantity ?? correctObjectIds.length,
      uses_real_camera: false,
    },
  };
}

export function formatObjectLabels(
  content: NatureCameraContent,
  objectIds: string[]
): string {
  return objectIds
    .map((id) => content.objects.find((object) => object.id === id)?.label ?? id)
    .join(', ');
}

function getCountIssue(
  selectedCorrectCount: number,
  requestedCount: number,
  hasIncorrectSelection: boolean
): string {
  if (hasIncorrectSelection) return 'distractor';
  if (selectedCorrectCount < requestedCount) return 'under_count';
  if (selectedCorrectCount > requestedCount) return 'over_count';
  return 'none';
}

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
