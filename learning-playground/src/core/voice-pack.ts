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

interface PackEntry {
  clipIds: Set<string>;
  baseUrl: string;
}

export class VoicePackSpeech implements SpeechServiceInterface {
  private readonly base: SpeechServiceInterface;
  private readonly packs: Map<string, PackEntry>;
  private readonly defaultPack: string;
  private voiceURI: string | undefined;
  private lastText = '';
  private currentClip: HTMLAudioElement | null = null;

  constructor(
    base: SpeechServiceInterface,
    manifests: VoiceManifest | VoiceManifest[],
    voiceURI?: string
  ) {
    this.base = base;
    const list = Array.isArray(manifests) ? manifests : [manifests];
    this.packs = new Map(
      list.map((manifest) => [
        manifest.pack,
        {
          clipIds: new Set(manifest.lines.map((line) => line.id)),
          baseUrl: `/assets/audio/voice/${manifest.pack}/`,
        },
      ])
    );
    this.defaultPack = list[0]?.pack ?? '';
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
      this.activePack() || voiceURI === DEVICE_VOICE_URI ? undefined : voiceURI
    );
  }

  /** The pack the current voiceURI selects, or null for device speech. */
  private activePack(): PackEntry | null {
    if (this.voiceURI === undefined) {
      return this.packs.get(this.defaultPack) ?? null;
    }
    if (this.voiceURI.startsWith(VOICE_PACK_URI_PREFIX)) {
      return (
        this.packs.get(this.voiceURI.slice(VOICE_PACK_URI_PREFIX.length)) ?? null
      );
    }
    return null;
  }

  speak(text: string, options?: SpeechOptions): Promise<void> {
    this.lastText = text;
    if (!this.enabled) return Promise.resolve();

    const clipId = voiceLineId(text);
    const pack = this.activePack();
    const useClip =
      pack !== null && pack.clipIds.has(clipId) && typeof Audio !== 'undefined';
    if (!useClip || pack === null) {
      return this.base.speak(text, options);
    }

    if (options?.interrupt !== false) {
      this.stop();
    }

    return new Promise((resolve) => {
      const clip = new Audio(`${pack.baseUrl}${clipId}.mp3`);
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
