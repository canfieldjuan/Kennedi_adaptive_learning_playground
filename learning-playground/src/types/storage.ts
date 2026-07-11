/**
 * Storage-related types.
 * Settings live in localStorage. Larger data moves to IndexedDB later.
 */

import type { LearningDomain } from './domains';
import type { ChildProgressProfile } from './progress';
import type { ActivityAttemptEvent } from './events';
import type { ContentPack } from './content-pack';
import type { ParentObservation } from './observations';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from './parent-actions';

export interface ParentSettings {
  child_display_name: string;
  session_limit_minutes: number;
  sound_enabled: boolean;
  speech_enabled: boolean;
  /** Preferred speech-synthesis voiceURI; undefined = the device default voice. */
  speech_voice_uri?: string;
  video_enabled: boolean;
  max_activity_choices: number;
  difficulty_mode: "fixed" | "adaptive";
  /** Story Stage narration ownership: the game narrates, or the adult improvises over cues. */
  story_mode: "narrated" | "together";
  allowed_domains: LearningDomain[];
  parent_gate_enabled: boolean;
  parent_gate_phrase: string;
}

export interface ApprovedAsset {
  id: string;
  type: "image" | "audio" | "video" | "svg";
  path: string;
  source: "local" | "parent_upload" | "generated";
  approved_by_parent: boolean;
  created_at: string;
}

export interface StorageContract {
  settings: ParentSettings;
  child_profile: ChildProgressProfile;
  activity_events: ActivityAttemptEvent[];
  parent_observations: ParentObservation[];
  parent_difficulty_actions: ParentDifficultyAction[];
  parent_difficulty_overrides: ParentDifficultyOverride[];
  content_packs: ContentPack[];
  approved_assets: ApprovedAsset[];
}
