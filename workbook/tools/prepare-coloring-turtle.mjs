// CPU-only derivative using the validated bunny export settings; no model call.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withPrintBrowser, measureArtworkCrops } from '../scripts/print-artifacts.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = 'design-source/animals/locked-poses/turtle-01-walking.png';
const output = 'design-source/coloring/characters/turtle-coloring-opaque.svg';
if (process.argv.length !== 2) throw new TypeError('Usage: node tools/prepare-coloring-turtle.mjs');
const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-turtle-opaque-'));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
try {
  const bitmap = path.join(temp, 'turtle.pbm'), traced = path.join(temp, 'turtle.svg');
  execFileSync('convert', [path.join(root, input), '-threshold', '70%', '-alpha', 'off', bitmap]);
  execFileSync('potrace', [bitmap, '--svg', '--opaque', '--output', traced]);
  const directory = path.dirname(path.join(root, output));
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const svg = readFileSync(traced, 'utf8');
  writeFileSync(path.join(root, output), svg, { mode: 0o600 });
  const crops = await withPrintBrowser(browser => measureArtworkCrops(browser, root, [output]));
  writeFileSync(path.join(root, output), svg.replace(/viewBox="[^"]*"/, `viewBox="${crops[output]}"`));
  chmodSync(path.join(root, output), 0o600);
  const record = { aiGeneratedSource: true, artModified: false, vectorExportModified: true,
    input, inputSha256: hash(path.join(root, input)), output, outputSha256: hash(path.join(root, output)),
    thresholdPercent: 70, opaqueWhiteInteriors: true,
    tools: { convert: execFileSync('convert', ['-version'], { encoding: 'utf8' }).split('\n')[0],
      potrace: execFileSync('potrace', ['--version'], { encoding: 'utf8' }).split('\n')[0] },
    crop: crops[output], approval: 'draft / owner visual approval required' };
  const receipt = path.join(directory, 'turtle-coloring-opaque.recipe.json');
  writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 }); chmodSync(receipt, 0o600);
  console.log(JSON.stringify(record, null, 2));
} finally { rmSync(temp, { recursive: true }); }
