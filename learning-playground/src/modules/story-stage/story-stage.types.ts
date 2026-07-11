/**
 * Story Stage slice-1 types — the smallest honest shape for ONE fixed,
 * fully narrated tale. Slice 2 replaces this with the authored story-pack
 * model + validator; this fixed tale becomes its migration input.
 *
 * Deliberately absent: skill ids, outcomes, evidence of any kind. Story
 * decisions are narrative preferences, never assessments.
 */

export type StorySceneKind =
  | 'intro'
  | 'problem'
  | 'decision'
  | 'consequence'
  | 'ending';

export interface StoryChoice {
  id: string;
  /** Short spoken/read label, e.g. "Follow the sparkly path". */
  label: string;
  /** Key into the tale's choice art. */
  art: string;
  /** The scene this choice leads to. */
  next: string;
}

export interface StoryScene {
  id: string;
  kind: StorySceneKind;
  /** One or two concise sentences — the whole beat for this scene. */
  narration: string;
  /** Key into the tale's scene art (character pose + moment). */
  art: string;
  /** Exactly two choices when kind === 'decision'. */
  choices?: [StoryChoice, StoryChoice];
  /** The scene a Continue tap leads to (non-decision, non-ending). */
  next?: string;
}

export interface FixedStoryTale {
  id: string;
  title: string;
  /** Spoken once when the story starts. */
  opening: string;
  entrySceneId: string;
  /** Length of every play path, for the neutral story-path dots. */
  pathLength: number;
  scenes: StoryScene[];
}
