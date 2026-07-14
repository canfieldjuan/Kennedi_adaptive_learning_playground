/**
 * Build the Emma voice-pack manifest from the live content.
 *
 *   npx vite-node scripts/voice/build-voice-manifest.ts
 *
 * Writes src/content/voice/emma-voice-manifest.json (sorted by id for stable
 * diffs). Audio generation is a separate offline step —
 * scripts/voice/generate_voice_pack.py — which reads this manifest; the
 * authoring stack is never a runtime dependency (art-production contract
 * principle applied to audio).
 */

// @ts-expect-error vite-node runs in Node; the app intentionally does not ship Node typings.
import { mkdirSync, writeFileSync } from 'node:fs';
// @ts-expect-error same Node-only import rule as above.
import { dirname, join } from 'node:path';
// @ts-expect-error same Node-only import rule as above.
import { fileURLToPath } from 'node:url';
import { collectVoiceLines } from './collect-voice-lines';
import type { VoiceManifest } from '../../src/core/voice-lines';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(
  here,
  '..',
  '..',
  'src',
  'content',
  'voice',
  'emma-voice-manifest.json'
);

const lines = collectVoiceLines();
const PACKS: Array<Pick<VoiceManifest, 'pack' | 'voice'>> = [
  { pack: 'tara', voice: 'orpheus/tara' },
  { pack: 'emma', voice: 'kokoro/bf_emma' },
  { pack: 'dad', voice: 'chatterbox/owner-clone' },
];

mkdirSync(dirname(outPath), { recursive: true });
for (const packInfo of PACKS) {
  const manifest: VoiceManifest = { ...packInfo, lines };
  const packPath = outPath.replace('emma-voice-manifest', `${packInfo.pack}-voice-manifest`);
  writeFileSync(packPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${lines.length} lines to ${packPath}`);
}

const styles = lines.reduce<Record<string, number>>((acc, line) => {
  acc[line.style] = (acc[line.style] ?? 0) + 1;
  return acc;
}, {});
console.log(styles);
