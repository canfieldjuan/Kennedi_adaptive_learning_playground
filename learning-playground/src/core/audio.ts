/**
 * Placeholder audio service.
 * Will be expanded when real audio assets are added.
 */

import type { AudioServiceInterface } from '../types/runtime';

export class AudioService implements AudioServiceInterface {
  private _enabled: boolean;

  constructor(enabled: boolean = true) {
    this._enabled = enabled;
  }

  play(soundId: string): void {
    if (!this._enabled) return;
    // Placeholder: log the sound request until real audio files exist
    console.log(`[Audio] play: ${soundId}`);
  }

  stop(): void {
    console.log('[Audio] stop');
  }
}
