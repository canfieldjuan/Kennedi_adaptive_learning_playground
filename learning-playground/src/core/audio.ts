/**
 * Local child-feedback audio.
 *
 * Sounds are synthesized with the Web Audio API — no external assets, no
 * network, no dependencies — so the safety boundary (local-only, no open web)
 * holds. Cues are kept soft, low-volume, and short to stay preschool-safe.
 * Where the Web Audio API is unavailable (tests / SSR) every call is a silent
 * no-op. Honors the parent `sound_enabled` setting via the `enabled` flag.
 */

import type { AudioServiceInterface } from '../types/runtime';

type AudioContextCtor = new () => AudioContext;

export class AudioService implements AudioServiceInterface {
  private _enabled: boolean;
  private context: AudioContext | null = null;

  constructor(enabled: boolean = true) {
    this._enabled = enabled;
    if (this._enabled) this.installGestureUnlock();
  }

  // Autoplay policy: a suspended AudioContext can only be resumed from inside a
  // user gesture. Some success cues (the order-ready / delivery chime) fire from
  // a setTimeout, not the tap itself, so resuming lazily in play() would run
  // after the handler returned — outside a gesture — and could stay silent.
  // Unlock once on the first pointer/key gesture so the context is already live
  // before any timer-delayed cue plays.
  private installGestureUnlock(): void {
    if (typeof window === 'undefined') return;
    const unlock = (): void => {
      const ctx = this.ensureContext();
      if (ctx && ctx.state === 'suspended') void ctx.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  play(soundId: string): void {
    if (!this._enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return; // No Web Audio (tests/SSR): stay silent.

    // Belt-and-suspenders: also resume here for cues that DO fire inside a tap
    // (e.g. soft_boing). The gesture-unlock above covers timer-delayed cues.
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    switch (soundId) {
      case 'soft_chime':
        this.playChime(ctx);
        break;
      case 'soft_boing':
        this.playBoing(ctx);
        break;
      default:
        // Unknown cue: stay silent rather than guess a sound.
        break;
    }
  }

  stop(): void {
    // Cues are short one-shots (nothing sustained to cut). Suspend to release
    // the audio hardware when idle; play() resumes on the next gesture.
    if (this.context && this.context.state === 'running') {
      void this.context.suspend();
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === 'undefined') return null;
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.context = new Ctor();
    } catch {
      this.context = null;
    }
    return this.context;
  }

  /** Soft two-note bell for success / order-ready / delivery. */
  private playChime(ctx: AudioContext): void {
    const now = ctx.currentTime;
    this.tone(ctx, 880, now, 0.28, 0.12); // A5
    this.tone(ctx, 1318.5, now + 0.09, 0.34, 0.09); // E6, a beat later
  }

  /** Gentle downward wobble for a try-again cue — never harsh. */
  private playBoing(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.26);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  /** One enveloped sine tone; smooth attack/decay avoids clicks. */
  private tone(
    ctx: AudioContext,
    freq: number,
    start: number,
    duration: number,
    peak: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
