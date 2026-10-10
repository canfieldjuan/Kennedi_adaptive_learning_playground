// One CPU-only preparation owner for both fixed coloring derivatives.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withPrintBrowser, measureArtworkCrops, stageInventory } from '../scripts/print-artifacts.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const inputs = Object.freeze({ bunny: 'bunny-01-sitting.png', turtle: 'turtle-01-walking.png' });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function prepareColoringCharacter(animal) {
  assert.ok(Object.hasOwn(inputs, animal), 'Unknown coloring character.');
  const input = `design-source/animals/locked-poses/${inputs[animal]}`;
  const output = `design-source/coloring/characters/${animal}-coloring-opaque.svg`;
  const directory = path.dirname(path.join(root, output));
  const inputBytes = readFileSync(path.join(root, input));
  const inputSha256 = hash(inputBytes);
  // An editor does not participate in advisory locks. Never replace its live
  // directory: publish only a uniquely reserved candidate for visual review.
  mkdirSync(path.dirname(directory), { recursive: true, mode: 0o700 });
  const candidate = mkdtempSync(path.join(path.dirname(directory), '.characters-'));
  const inventory = stageInventory(path.join(candidate, 'export'));
  let temp, published = false;
  try {
    temp = mkdtempSync(path.join(os.tmpdir(), `kennedi-${animal}-opaque-`));
    const snapshot = path.join(temp, 'input.png');
    writeFileSync(snapshot, inputBytes, { mode: 0o600 });
    const bitmap = path.join(temp, `${animal}.pbm`), traced = path.join(temp, `${animal}.svg`);
    // These settings are the previously proven export, not a new art treatment.
    execFileSync('convert', [snapshot, '-threshold', '70%', '-alpha', 'off', bitmap]);
    execFileSync('potrace', [bitmap, '--svg', '--opaque', '--output', traced]);
    const svg = readFileSync(traced, 'utf8'), name = path.basename(output);
    const stagedSvg = path.join(inventory.directory, name);
    writeFileSync(stagedSvg, svg, { mode: 0o600 });
    const crops = await withPrintBrowser(browser => measureArtworkCrops(browser, inventory.directory, [name]));
    assert.match(svg, /viewBox="[^"]*"/, 'Traced SVG must contain a viewBox.');
    writeFileSync(stagedSvg, svg.replace(/viewBox="[^"]*"/, `viewBox="${crops[name]}"`));
    const record = { aiGeneratedSource: true, artModified: false, vectorExportModified: true,
      input, inputSha256, output, outputSha256: hash(readFileSync(stagedSvg)),
      thresholdPercent: 70, opaqueWhiteInteriors: true,
      tools: { convert: execFileSync('convert', ['-version'], { encoding: 'utf8' }).split('\n')[0],
        potrace: execFileSync('potrace', ['--version'], { encoding: 'utf8' }).split('\n')[0] },
      crop: crops[name], approval: 'draft / owner visual approval required' };
    const receiptName = `${animal}-coloring-opaque.recipe.json`;
    writeFileSync(path.join(inventory.directory, receiptName), JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    assert.deepEqual(JSON.parse(readFileSync(path.join(inventory.directory, receiptName))), record);
    inventory.publish([name, receiptName]);
    published = true;
    return { ...record, candidateDirectory: path.join(candidate, 'export') };
  } finally {
    if (temp) rmSync(temp, { recursive: true });
    // Keep successful review candidates; remove only this invocation's scratch.
    if (!published && existsSync(candidate)) rmSync(candidate, { recursive: true });
  }
}
