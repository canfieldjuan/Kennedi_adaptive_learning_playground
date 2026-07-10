/**
 * Core tests: speech voice selection helpers (parent voice picker).
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { pickVoice, listSpeechVoices } from '../../src/core/speech';

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
});
