/**
 * Phonics Match — type stubs for future implementation.
 */

export interface PhonicsMatchConfig {
  target_sound: string;
  prompt_audio: string;
  choices: PhonicsChoice[];
}

export interface PhonicsChoice {
  id: string;
  label: string;
  image: string;
  correct: boolean;
}
