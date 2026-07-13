/**
 * VoicePackSpeech behavior: packed lines play local clips, everything else
 * falls back to the wrapped speech service, and failures can never silence
 * the game.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { VoicePackSpeech, DEVICE_VOICE_URI } from '../../src/core/voice-pack';
import { voiceLineId, type VoiceManifest } from '../../src/core/voice-lines';
import type {
  SpeechServiceInterface,
  SpeechOptions,
} from '../../src/types/runtime';

const PACKED_LINE = 'Story time! This is the tale of Poppy.';
const UNPACKED_LINE = 'This line is not in the pack.';

const manifest: VoiceManifest = {
  pack: 'emma',
  voice: 'kokoro/bf_emma',
  lines: [
    { id: voiceLineId(PACKED_LINE), text: PACKED_LINE, style: 'story' },
  ],
};

class MockAudio {
  static instances: MockAudio[] = [];
  readonly src: string;
  paused = false;
  private listeners: Record<string, Array<() => void>> = {};

  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }

  addEventListener(type: string, handler: () => void): void {
    this.listeners[type] ??= [];
    this.listeners[type].push(handler);
  }

  fire(type: string): void {
    for (const handler of this.listeners[type] ?? []) handler();
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

function createBase(): SpeechServiceInterface & {
  spoken: Array<{ text: string; options?: SpeechOptions }>;
  stopped: number;
} {
  const record = {
    enabled: true,
    spoken: [] as Array<{ text: string; options?: SpeechOptions }>,
    stopped: 0,
    speak(text: string, options?: SpeechOptions): Promise<void> {
      record.spoken.push({ text, options });
      return Promise.resolve();
    },
    stop(): void {
      record.stopped += 1;
    },
    repeatLast(): void {},
    setVoiceURI(): void {},
  };
  return record;
}

describe('voice pack speech', () => {
  beforeEach(() => {
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('a packed line plays the local clip and resolves on ended', async () => {
    const base = createBase();
    const speech = new VoicePackSpeech(base, manifest);

    const done = speech.speak(PACKED_LINE);
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toBe(
      `/assets/audio/voice/emma/${voiceLineId(PACKED_LINE)}.mp3`
    );
    // Local asset only — never an external URL.
    expect(MockAudio.instances[0].src).not.toMatch(/^https?:/);
    MockAudio.instances[0].fire('ended');
    await done;
    expect(base.spoken).toHaveLength(0);
  });

  test('an unpacked line falls back to the device voice', async () => {
    const base = createBase();
    const speech = new VoicePackSpeech(base, manifest);

    await speech.speak(UNPACKED_LINE);
    expect(MockAudio.instances).toHaveLength(0);
    expect(base.spoken.map((entry) => entry.text)).toEqual([UNPACKED_LINE]);
  });

  test('a clip error falls back instead of going silent', async () => {
    const base = createBase();
    const speech = new VoicePackSpeech(base, manifest);

    const done = speech.speak(PACKED_LINE);
    MockAudio.instances[0].fire('error');
    await done;
    expect(base.spoken.map((entry) => entry.text)).toEqual([PACKED_LINE]);
  });

  test('choosing the device voice bypasses the pack entirely', async () => {
    const base = createBase();
    const speech = new VoicePackSpeech(base, manifest);
    speech.setVoiceURI(DEVICE_VOICE_URI);

    await speech.speak(PACKED_LINE);
    expect(MockAudio.instances).toHaveLength(0);
    expect(base.spoken.map((entry) => entry.text)).toEqual([PACKED_LINE]);
  });

  test('a specific device voiceURI passes through to the base service', async () => {
    const base = createBase();
    const setVoiceURI = vi.fn();
    base.setVoiceURI = setVoiceURI;
    const speech = new VoicePackSpeech(base, manifest);
    speech.setVoiceURI('some-device-voice');

    await speech.speak(PACKED_LINE);
    expect(MockAudio.instances).toHaveLength(0);
    expect(setVoiceURI).toHaveBeenCalledWith('some-device-voice');
    expect(base.spoken.map((entry) => entry.text)).toEqual([PACKED_LINE]);
  });

  test('stop pauses the playing clip and stops the base service', () => {
    const base = createBase();
    const speech = new VoicePackSpeech(base, manifest);

    void speech.speak(PACKED_LINE);
    speech.stop();
    expect(MockAudio.instances[0].paused).toBe(true);
    expect(base.stopped).toBeGreaterThan(0);
  });

  test('repeatLast replays the last line through the pack', () => {
    const base = createBase();
    const speech = new VoicePackSpeech(base, manifest);

    void speech.speak(PACKED_LINE);
    MockAudio.instances[0].fire('ended');
    speech.repeatLast();
    expect(MockAudio.instances).toHaveLength(2);
  });

  test('disabled speech stays silent but remembers the line for repeat', async () => {
    const base = createBase();
    base.enabled = false;
    const speech = new VoicePackSpeech(base, manifest);

    await speech.speak(PACKED_LINE);
    expect(MockAudio.instances).toHaveLength(0);
    expect(base.spoken).toHaveLength(0);
  });
});
