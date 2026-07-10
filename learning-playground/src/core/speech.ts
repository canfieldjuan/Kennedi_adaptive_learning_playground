/**
 * Speech service built on the Web Speech API (speechSynthesis).
 *
 * Rules:
 * - Parent can disable speech.
 * - Every speech prompt should be short.
 * - Stop previous speech before speaking a new phrase.
 * - Gracefully no-op if speech synthesis is unavailable.
 */

import type { SpeechServiceInterface, SpeechOptions } from '../types/runtime';

export class SpeechService implements SpeechServiceInterface {
  enabled: boolean;
  private _lastText: string = '';
  private _synth: SpeechSynthesis | null = null;
  private _voiceURI: string | undefined;

  constructor(enabled: boolean = true, voiceURI?: string) {
    this.enabled = enabled;
    this._voiceURI = voiceURI || undefined;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this._synth = window.speechSynthesis;
    }
  }

  /** Choose a preferred voice by voiceURI; unset falls back to the device default. */
  setVoiceURI(voiceURI?: string): void {
    this._voiceURI = voiceURI || undefined;
  }

  /**
   * Speak a short phrase. Cancels any in-progress utterance first.
   */
  speak(text: string, options?: SpeechOptions): Promise<void> {
    if (!this.enabled || !this._synth) {
      this._lastText = text;
      return Promise.resolve();
    }

    // Always interrupt by default
    if (options?.interrupt !== false) {
      this.stop();
    }

    this._lastText = text;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.85;
    utterance.pitch = options?.pitch ?? 1.1;
    utterance.lang = options?.lang ?? 'en-US';

    // Apply the parent-chosen voice when it's available; otherwise the device
    // default voice is used (unchanged behavior).
    const voice = pickVoice(this._synth.getVoices(), this._voiceURI);
    if (voice) utterance.voice = voice;

    return new Promise((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      this._synth?.speak(utterance);
    });
  }

  /**
   * Stop any in-progress speech.
   */
  stop(): void {
    if (!this._synth) return;
    this._synth.cancel();
  }

  /**
   * Repeat the last spoken phrase.
   */
  repeatLast(): void {
    if (this._lastText) {
      this.speak(this._lastText);
    }
  }
}

/**
 * Resolve the preferred voice from an available-voices list. Returns undefined
 * when no preference is set or the preferred voice is not installed (so the
 * caller keeps the device default). Pure — safe to unit test without a DOM.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI?: string
): SpeechSynthesisVoice | undefined {
  if (!voiceURI) return undefined;
  return voices.find((voice) => voice.voiceURI === voiceURI);
}

/**
 * The device's installed English speech voices, for the parent voice picker.
 * Returns [] where speech synthesis is unavailable (tests / SSR) so callers
 * never throw.
 */
export function listSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
}
