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

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this._synth = window.speechSynthesis;
    }
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
