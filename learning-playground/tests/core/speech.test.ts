/**
 * Core tests: speech voice selection helpers (parent voice picker).
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { pickVoice, listSpeechVoices, SpeechService } from '../../src/core/speech';

const voices = [
  { voiceURI: 'v-samantha', name: 'Samantha', lang: 'en-US' },
  { voiceURI: 'v-daniel', name: 'Daniel', lang: 'en-GB' },
  { voiceURI: 'v-amelie', name: 'Amelie', lang: 'fr-FR' },
] as unknown as SpeechSynthesisVoice[];

describe('speech voice selection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('pickVoice returns the voice matching the preferred URI', () => {
    expect(pickVoice(voices, 'v-daniel')?.name).toBe('Daniel');
  });

  test('pickVoice returns undefined for no preference, no match, or empty list', () => {
    expect(pickVoice(voices, undefined)).toBeUndefined();
    expect(pickVoice(voices, 'v-missing')).toBeUndefined();
    expect(pickVoice([], 'v-daniel')).toBeUndefined();
  });

  test('listSpeechVoices returns [] when speech synthesis is unavailable', () => {
    expect(listSpeechVoices()).toEqual([]);
  });

  test('listSpeechVoices returns only English voices when available', () => {
    vi.stubGlobal('window', { speechSynthesis: { getVoices: () => voices } });
    expect(listSpeechVoices().map((voice) => voice.name)).toEqual([
      'Samantha',
      'Daniel',
    ]);
  });

  test('setVoiceURI makes a live speak() apply the chosen installed voice', () => {
    const spoken: Array<{ voice: SpeechSynthesisVoice | null }> = [];
    class FakeUtterance {
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal('window', {
      speechSynthesis: {
        getVoices: () => voices,
        speak: (utterance: { voice: SpeechSynthesisVoice | null }) => spoken.push(utterance),
        cancel: () => {},
      },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);

    const service = new SpeechService(true);
    service.setVoiceURI('v-daniel');
    void service.speak('hello');

    expect(spoken[0]?.voice?.name).toBe('Daniel');
  });
});
