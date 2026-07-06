/**
 * Content pack types.
 * Packs are swappable bundles of learning content.
 */

export interface ContentPackItem {
  id: string;
  type: "word" | "image" | "sound" | "video" | "shape" | "story_prompt";
  label: string;
  phonetic_hint?: string;
  image_path?: string;
  audio_path?: string;
  video_path?: string;
  tags?: string[];
}

export interface ContentPack {
  id: string;
  version: number;
  title: string;
  status: "draft" | "approved" | "archived";
  created_by: "parent" | "ai" | "system";
  approved_by_parent: boolean;
  items: ContentPackItem[];
}
