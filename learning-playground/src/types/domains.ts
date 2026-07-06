/**
 * Core domain types for the Learning Playground.
 * These define the vocabulary of learning the system understands.
 */

export type LearningDomain =
  | "literacy"
  | "phonics"
  | "math"
  | "logic"
  | "spatial"
  | "memory"
  | "science"
  | "music"
  | "art"
  | "emotional"
  | "language"
  | "coding_concepts";

export type SkillId =
  | "letter_recognition"
  | "letter_sound_match"
  | "initial_sound"
  | "rhyming"
  | "vocabulary"
  | "counting"
  | "subitizing"
  | "shape_match"
  | "pattern_extend"
  | "same_different"
  | "category_sort"
  | "sequence_order"
  | "memory_match"
  | "emotion_identify"
  | "cause_effect"
  | "debug_sequence"
  | "color_fill"
  | "sound_match";

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type InteractionModel =
  | "tap"
  | "tap_to_match"
  | "tap_then_place"
  | "drag_drop"
  | "draw"
  | "color_fill"
  | "watch_then_do";

export type DistractorStrength =
  | "none"
  | "easy"
  | "medium"
  | "hard";
