/**
 * Video Vault - local, parent-approved media only.
 */

export interface VideoVaultConfig {
  manifest: VideoVaultManifest;
}

interface VideoVaultManifestPolicy {
  id: string;
  /** Content revision recorded in exposure events. */
  version: number;
  title: string;
  description?: string;
  intake_mode: 'repo_bundled';
  parent_imports_supported: false;
  approved_by_parent: true;
  evidence_role: 'exposure_only';
}

/** The pre-discriminator manifest shape already shipped by the app. */
export interface LegacyVideoVaultManifestV2 extends VideoVaultManifestPolicy {
  version: 2;
  schema_version?: never;
  items: ApprovedVideo[];
}

export interface VideoVaultManifestV3 extends VideoVaultManifestPolicy {
  schema_version: 3;
  items: VideoVaultManifestItem[];
}

export type VideoVaultManifest = LegacyVideoVaultManifestV2 | VideoVaultManifestV3;

export type SupportedVideoMimeType = 'video/mp4' | 'video/webm';
export type BilingualStoryMode = 'english' | 'story_bridge' | 'spanish_replay';
export type StoryLanguage = 'en' | 'es-419';

/** Legacy/runtime shape retained for the existing Video Vault adapter. */
export interface ApprovedVideo {
  id: string;
  title: string;
  path: string;
  duration_seconds: number;
  mime_type: SupportedVideoMimeType;
  evidence_role: 'exposure_only';
  response_activity_id: string;
  source: 'local';
  approved_by_parent: true;
  thumbnail_path?: string;
}

export interface ApprovedVideoItem extends ApprovedVideo {
  kind: 'approved_video';
}

export type VideoVaultManifestItem = ApprovedVideoItem | BilingualStoryVideoItem;

export interface BilingualStoryVideoItem {
  kind: 'bilingual_story';
  id: string;
  title: string;
  story_family: string;
  source: 'local';
  approved_by_parent: true;
  evidence_role: 'exposure_only';
  language_register: 'es-419';
  thumbnail_path: string;
  modes: Record<BilingualStoryMode, BilingualStoryMediaExport>;
  visual_targets: StoryVisualTarget[];
  interaction_slots: StoryInteractionSlot[];
  target_words: StoryLanguageTarget[];
  target_phrases: StoryLanguageTarget[];
  cues: BilingualStoryCue[];
  completion_page: StoryCompletionPageDefinition;
}

export interface BilingualStoryMediaExport {
  id: string;
  path: string;
  duration_seconds: number;
  mime_type: SupportedVideoMimeType;
  source: 'local';
  approved_by_parent: true;
  sha256: string;
}

export interface SpanishNarrationApproval {
  spanish_text: string;
  english_intent: string;
  register: 'es-419';
  pronunciation_review_status: 'approved';
  reviewer: string;
  approved_at: string;
  approval_version: number;
  audio_asset_path: string;
  audio_sha256: string;
}

export interface StoryVisualTarget {
  id: string;
  asset_path: string;
  english_label: string;
  spanish_label: string;
  approved_by_parent: true;
}

export interface StoryInteractionSlot {
  id: string;
  label: string;
}

export interface StoryLanguageTarget {
  id: string;
  english_text: string;
  spanish_text: string;
  visual_target_id: string;
  spanish_approval: SpanishNarrationApproval;
}

export interface StoryCuePrompt {
  text: string;
  language: StoryLanguage;
  english_intent: string;
  audio_asset_path?: string;
  spanish_approval?: SpanishNarrationApproval;
}

export interface StoryCueVisualTarget {
  target_id: string;
  slot_id: string;
}

export interface StoryCueRepeatBoundary {
  start_ms: number;
  end_ms: number;
  return_to: 'resume_playback' | 'paused_cue';
}

interface StoryCueBase {
  id: string;
  mode: BilingualStoryMode;
  start_ms: number;
  end_ms: number;
  prompt: StoryCuePrompt;
  visual_targets: StoryCueVisualTarget[];
  repeat_boundary: StoryCueRepeatBoundary;
}

export interface StoryNarrationLineCue extends StoryCueBase {
  cue_type: 'narration_line';
  pauses_playback: false;
  required_child_action: 'none';
  resume_behavior: 'continue';
}

export interface StoryWordExposureCue extends StoryCueBase {
  cue_type: 'word_exposure';
  pauses_playback: false;
  required_child_action: 'none';
  resume_behavior: 'continue';
  target_word_ids: string[];
}

export interface StorySceneTransitionCue extends StoryCueBase {
  cue_type: 'scene_transition';
  pauses_playback: false;
  required_child_action: 'none';
  resume_behavior: 'continue';
}

export interface StoryCompletionCue extends StoryCueBase {
  cue_type: 'completion';
  pauses_playback: false;
  required_child_action: 'none';
  resume_behavior: 'continue';
}

export interface StoryResponsePauseCue extends StoryCueBase {
  cue_type: 'response_pause';
  pauses_playback: true;
  required_child_action: 'select_visual_target';
  resume_behavior: 'after_explicit_action';
  guided_target_id: string;
}

export type BilingualStoryCue =
  | StoryNarrationLineCue
  | StoryWordExposureCue
  | StoryResponsePauseCue
  | StorySceneTransitionCue
  | StoryCompletionCue;

export interface StoryCompletionPageDefinition {
  schema_version: 1;
  id: string;
  title: string;
  background_asset_path: string;
  scene_variants: StoryPageAssetChoice[];
  colors: StoryPageColorChoice[];
  color_targets: StoryPageColorTarget[];
  stickers: StoryPageAssetChoice[];
  sticker_slots: StoryPageSlot[];
  max_stickers: number;
  characters: StoryPageAssetChoice[];
  character_slots: StoryPageSlot[];
}

export interface StoryPageAssetChoice {
  id: string;
  label: string;
  asset_path: string;
}

export interface StoryPageColorChoice {
  id: string;
  label: string;
  value: string;
}

export interface StoryPageColorTarget {
  id: string;
  label: string;
  allowed_color_ids: string[];
}

export interface StoryPageSlot {
  id: string;
  label: string;
}

/** Non-evaluative watch/participation history. */
export interface StoryExposureRecord {
  schema_version: 1;
  id: string;
  manifest_id: string;
  manifest_version: number;
  story_id: string;
  media_id: string;
  session_id: string;
  mode: BilingualStoryMode;
  started_at: string;
  completed_at?: string;
  encountered_cue_ids: string[];
  encountered_target_word_ids: string[];
  repeat_count: number;
  replay_count: number;
  response_pauses: StoryResponsePauseRecord[];
  completed: boolean;
}

export interface StoryResponsePauseRecord {
  cue_id: string;
  selected_target_ids: string[];
  resumed_at?: string;
}

/** Exact semantic ownership state; rendering remains derived from these ids. */
export interface StoryVaultCompletionRecord {
  schema_version: 1;
  id: string;
  story_id: string;
  exposure_record_id: string;
  completion_page_id: string;
  scene_id: string;
  color_choices: StoryPageColorSelection[];
  stickers: StoryPagePlacement[];
  characters: StoryPagePlacement[];
  created_at: string;
}

export interface StoryPageColorSelection {
  target_id: string;
  color_id: string;
}

export interface StoryPagePlacement {
  asset_id: string;
  slot_id: string;
}
