/**
 * Storage-related types.
 * Settings live in localStorage. Larger data moves to IndexedDB later.
 */

import type { LearningDomain } from './domains';
import type { ChildProgressProfile } from './progress';
import type { ActivityAttemptEvent } from './events';
import type { ContentPack } from './content-pack';
import type { ParentObservation } from './observations';

export interface ParentSettings {
  child_display_name: string;
  session_limit_minutes: number;
  sound_enabled: boolean;
  speech_enabled: boolean;
  video_enabled: boolean;
  max_activity_choices: number;
  difficulty_mode: "fixed" | "adaptive";
  allowed_domains: LearningDomain[];
  parent_gate_enabled: boolean;
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
  content_packs: ContentPack[];
  approved_assets: ApprovedAsset[];
}
