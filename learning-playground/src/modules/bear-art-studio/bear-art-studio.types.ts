/**
 * Bear Art Studio content types — the parsed, validated shape of a studio
 * activity's `content`. Parsing is fail-closed: anything malformed renders
 * the "needs setup" screen instead of a broken game.
 */

import type { StudioShapeId } from './studio-art';

export type ArtMode =
  | 'free_decorate'
  | 'color_request'
  | 'quantity_decorate'
  | 'pattern'
  | 'fix_art'
  | 'story_card';

export interface StudioColor {
  id: string;
  label: string;
  value: string;
}

export interface StudioCharacter {
  id: string;
  name: string;
}

export interface StudioChain {
  nextActivityId?: string;
  nextLabel?: string;
}

interface StudioBase {
  character: StudioCharacter;
  promptAudio: string;
  chain: StudioChain;
  maxAttemptsBeforeHint: number;
}

export interface FreeDecorateContent extends StudioBase {
  mode: 'free_decorate';
  colors: StudioColor[];
  stickers: StudioShapeId[];
  slotCount: number;
  /** 'card' (default), dress-up 'shirt', performing 'poster', or the
   * bear-house 'wall_frame'. */
  surface: 'card' | 'shirt' | 'poster' | 'wall_frame';
}

export interface StoryCardContent extends StudioBase {
  mode: 'story_card';
  /** Short kebab-case theme id, e.g. 'going-outside'. */
  storyTheme: string;
  /** Every sticker the tray offers (story items + distractors). */
  stickerPool: StudioShapeId[];
  /** The stickers that belong to the story. */
  storyStickers: StudioShapeId[];
}

export interface ColorRequestContent extends StudioBase {
  mode: 'color_request';
  colors: StudioColor[];
  subjectShape: StudioShapeId;
  targetColor: StudioColor;
}

export interface QuantityDecorateContent extends StudioBase {
  mode: 'quantity_decorate';
  targetSticker: StudioShapeId;
  targetQuantity: number;
  slotCount: number;
}

export interface PatternContent extends StudioBase {
  mode: 'pattern';
  colors: StudioColor[];
  patternColorIds: string[];
  patternLength: number;
  patternPrefill: number;
}

export interface FixRegion {
  id: string;
  shape: StudioShapeId;
  colorId: string;
}

export interface FixArtContent extends StudioBase {
  mode: 'fix_art';
  colors: StudioColor[];
  regions: FixRegion[];
  wrongRegionId: string;
  wrongColorId: string;
}

export type StudioContent =
  | FreeDecorateContent
  | ColorRequestContent
  | QuantityDecorateContent
  | PatternContent
  | FixArtContent
  | StoryCardContent;
