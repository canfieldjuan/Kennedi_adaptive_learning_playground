export type NatureCameraMode =
  | 'free_picture_walk'
  | 'target_photo'
  | 'count_photo'
  | 'first_sound'
  | 'album_review';

export interface NatureCameraGuide {
  id: string;
  name: string;
  icon: string;
  intro_line: string;
  success_line: string;
}

export interface NatureSceneObject {
  id: string;
  label: string;
  image: string;
  x: number;
  y: number;
  size: number;
  tap_area_px: number;
  kind: string;
  first_sound?: string;
  hint?: string;
}

export interface NatureCameraRequiredTask {
  target_id?: string;
  target_ids?: string[];
  target_kind?: string;
  quantity?: number;
  first_sound?: string;
}

export interface NatureCameraContent {
  game: 'nature-camera-safari';
  mode: NatureCameraMode;
  uses_real_camera: false;
  guide: NatureCameraGuide;
  prompt_audio: string;
  scene_label: string;
  walk_label?: string;
  round_label?: string;
  round_index?: number;
  round_total?: number;
  completion_line: string;
  objects: NatureSceneObject[];
  required_task: NatureCameraRequiredTask;
  parent_evidence_summary?: string;
  next_activity_id?: string;
  future_evidence_notes?: string[];
}

export interface SafariEvaluation {
  correct: boolean;
  canComplete: boolean;
  issue: string;
  selectedObjectIds: string[];
  correctObjectIds: string[];
}
