/**
 * Puzzle Match — type stubs for future implementation.
 */

export interface PuzzleMatchConfig {
  target_shape: string;
  prompt_audio: string;
  choices: PuzzleChoice[];
}

export interface PuzzleChoice {
  id: string;
  label: string;
  image: string;
  correct: boolean;
}
