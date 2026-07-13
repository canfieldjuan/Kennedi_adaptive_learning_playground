/**
 * Voice-pack speech — plays pre-recorded local clips (the Emma pack) for
 * known lines and falls back to the wrapped speech-synthesis service for
 * anything unpacked.
 *
 * Safety contract: clips are local static assets under
 * /assets/audio/voice/<pack>/ — no network service, no external URLs; the
 * generator that produced them is an offline build tool and never ships.
 *
 * Voice selection rides the existing parent setting (speech_voice_uri):
 * - undefined or ''            -> the pack (the default voice)
 * - 'voice-pack:<pack>'        -> the pack, chosen explicitly
 * - 'device'                   -> device default speech synthesis
 * - any other value            -> that specific device voice (passthrough)
 */

import type { SpeechServiceInterface, SpeechOptions } from '../types/runtime';
import { voiceLineId, type VoiceManifest } from './voice-lines';

export const VOICE_PACK_URI_PREFIX = 'voice-pack:';
export const DEVICE_VOICE_URI = 'device';

export class VoicePackSpeech implements SpeechServiceInterface {
  private readonly base: SpeechServiceInterface;
  private readonly packName: string;
  private readonly clipIds: Set<string>;
  private readonly baseUrl: string;
  private voiceURI: string | undefined;
  private lastText = '';
  private currentClip: HTMLAudioElement | null = null;

  constructor(
    base: SpeechServiceInterface,
    manifest: VoiceManifest,
    voiceURI?: string
  ) {
    this.base = base;
    this.packName = manifest.pack;
    this.clipIds = new Set(manifest.lines.map((line) => line.id));
    this.baseUrl = `/assets/audio/voice/${manifest.pack}/`;
    this.voiceURI = voiceURI || undefined;
  }

  get enabled(): boolean {
    return this.base.enabled;
  }

  set enabled(value: boolean) {
    this.base.enabled = value;
  }

  setVoiceURI(voiceURI?: string): void {
    this.voiceURI = voiceURI || undefined;
    this.base.setVoiceURI?.(
      this.packActive() || voiceURI === DEVICE_VOICE_URI ? undefined : voiceURI
    );
  }

  private packActive(): boolean {
    return (
      this.voiceURI === undefined ||
      this.voiceURI === `${VOICE_PACK_URI_PREFIX}${this.packName}`
    );
  }

  speak(text: string, options?: SpeechOptions): Promise<void> {
    this.lastText = text;
    if (!this.enabled) return Promise.resolve();

    const clipId = voiceLineId(text);
    const useClip =
      this.packActive() &&
      this.clipIds.has(clipId) &&
      typeof Audio !== 'undefined';
    if (!useClip) {
      return this.base.speak(text, options);
    }

    if (options?.interrupt !== false) {
      this.stop();
    }

    return new Promise((resolve) => {
      const clip = new Audio(`${this.baseUrl}${clipId}.mp3`);
      this.currentClip = clip;
      const finish = () => {
        if (this.currentClip === clip) this.currentClip = null;
        resolve();
      };
      clip.addEventListener('ended', finish);
      clip.addEventListener('error', () => {
        // A missing or unplayable clip must never silence the game: hand the
        // line to the device voice instead.
        if (this.currentClip === clip) this.currentClip = null;
        this.base.speak(text, options).then(resolve);
      });
      const played = clip.play();
      if (played && typeof played.catch === 'function') {
        played.catch(() => {
          // Autoplay policy refusals fall back the same way.
          if (this.currentClip === clip) this.currentClip = null;
          this.base.speak(text, options).then(resolve);
        });
      }
    });
  }

  stop(): void {
    if (this.currentClip) {
      this.currentClip.pause();
      this.currentClip = null;
    }
    this.base.stop();
  }

  repeatLast(): void {
    if (this.lastText) {
      void this.speak(this.lastText);
    }
  }
}
