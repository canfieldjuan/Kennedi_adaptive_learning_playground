/**
 * Voice pack contract: the committed manifest stays in lockstep with the
 * live game content, every manifest line ships a real local clip, and the
 * pack can never point outside the app.
 *
 * When these fail after a content change, the fix is mechanical:
 *   npx vite-node scripts/voice/build-voice-manifest.ts
 *   python scripts/voice/generate_voice_pack.py --only-missing
 */

import { describe, expect, test } from 'vitest';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { readdirSync } from 'node:fs';
import { collectVoiceLines } from '../../scripts/voice/collect-voice-lines';
import {
  normalizeVoiceLine,
  voiceLineId,
  type VoiceManifest,
} from '../../src/core/voice-lines';
import emmaJson from '../../src/content/voice/emma-voice-manifest.json';
import taraJson from '../../src/content/voice/tara-voice-manifest.json';

const PACKS: Array<[string, VoiceManifest]> = [
  ['emma', emmaJson as unknown as VoiceManifest],
  ['tara', taraJson as unknown as VoiceManifest],
];

describe.each(PACKS)('%s voice pack contract', (packName, manifest) => {
  test('the committed manifest matches the live content enumeration', () => {
    // Exact lockstep: a new prompt, feedback line, story scene, or character
    // must re-run the manifest builder (and render its clips) to ship.
    expect(manifest.pack).toBe(packName);
    expect(manifest.lines).toEqual(collectVoiceLines());
  });

  test('every manifest line has a committed local clip', () => {
    const shipped = new Set(
      readdirSync(
        new URL(`../../public/assets/audio/voice/${packName}/`, import.meta.url)
      ) as string[]
    );
    const missing = manifest.lines
      .filter((line) => !shipped.has(`${line.id}.mp3`))
      .map((line) => `${line.id} "${line.text}"`);
    expect(missing).toEqual([]);
  });

  test('line ids are the hash of their normalized text', () => {
    for (const line of manifest.lines) {
      expect(line.id).toBe(voiceLineId(line.text));
      expect(line.text).toBe(normalizeVoiceLine(line.text));
    }
  });

  test('the pack references nothing outside the app', () => {
    const raw = JSON.stringify(manifest);
    expect(raw).not.toContain('http://');
    expect(raw).not.toContain('https://');
  });

  test('the story stage is fully covered — every resolvable narration is packed', () => {
    const packed = new Set(manifest.lines.map((line) => line.id));
    const storyLines = collectVoiceLines().filter(
      (line) => line.style === 'story'
    );
    expect(storyLines.length).toBeGreaterThan(100);
    for (const line of storyLines) {
      expect(packed.has(line.id)).toBe(true);
    }
  });
});
