// One CPU-only preparation owner for both fixed coloring derivatives.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withPrintBrowser, measureArtworkCrops, stageInventory } from '../scripts/print-artifacts.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const inputs = Object.freeze({ bunny: 'bunny-01-sitting.png', turtle: 'turtle-01-walking.png' });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function snapshot(directory) {
  return readdirSync(directory).sort().map(name => {
    const file = path.join(directory, name);
    assert.ok(lstatSync(file).isFile(), 'Coloring inventory must contain regular files.');
    return [name, hash(readFileSync(file))];
  });
}

export async function prepareColoringCharacter(animal) {
  assert.ok(Object.hasOwn(inputs, animal), 'Unknown coloring character.');
  const input = `design-source/animals/locked-poses/${inputs[animal]}`;
  const output = `design-source/coloring/characters/${animal}-coloring-opaque.svg`;
  const directory = path.dirname(path.join(root, output));
  const inputSha256 = hash(readFileSync(path.join(root, input)));
  // stageInventory rejects symlink/non-directory destinations before we copy.
  const inventory = stageInventory(directory);
  let temp;
  try {
    const before = existsSync(directory) ? snapshot(directory) : [];
    for (const [name] of before) cpSync(path.join(directory, name), path.join(inventory.directory, name));
    temp = mkdtempSync(path.join(os.tmpdir(), `kennedi-${animal}-opaque-`));
    const bitmap = path.join(temp, `${animal}.pbm`), traced = path.join(temp, `${animal}.svg`);
    // These settings are the previously proven export, not a new art treatment.
    execFileSync('convert', [path.join(root, input), '-threshold', '70%', '-alpha', 'off', bitmap]);
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
    assert.equal(hash(readFileSync(path.join(root, input))), inputSha256, 'Input changed during preparation.');
    assert.deepEqual(existsSync(directory) ? snapshot(directory) : [], before, 'Coloring inventory changed during preparation.');
    // All fallible preparation is complete. Publish the complete directory,
    // preserving sibling exports/annotations and rolling back a failed rename.
    inventory.publish([...new Set([...before.map(([file]) => file), name, receiptName])]);
    return record;
  } finally {
    if (temp) rmSync(temp, { recursive: true });
    // After success this path was renamed; its .previous backup is retained.
    if (existsSync(inventory.directory)) rmSync(inventory.directory, { recursive: true });
  }
}
