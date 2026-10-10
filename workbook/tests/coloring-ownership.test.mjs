import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, renameSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { WORKBOOK_ROOT } from '../src/recipes.mjs';

function fixture(context) {
  const evidence = process.env.KENNEDI_COLORING_OWNERSHIP_EVIDENCE_DIR;
  const parent = evidence ?? os.tmpdir();
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const dir = mkdtempSync(path.join(parent, 'coloring-ownership-'));
  context.after(() => { if (!evidence) rmSync(dir, { recursive: true }); });
  const out = path.join(dir, 'printed'), file = path.join(dir, 'recipe.json');
  const setRecipe = pages => writeFileSync(file, JSON.stringify({ schemaVersion: 1, template: 'coloring-pages-v1', pages }));
  const run = (stage, { input = file, direct = false, preload } = {}) => spawnSync(process.execPath,
    [...(preload ? ['--import', preload] : []), path.join(WORKBOOK_ROOT, `scripts/${direct ? 'coloring' : 'workbook'}.mjs`),
      stage, '--recipe', input, '--out', out], { encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
  console.log('Ownership fixture:', dir);
  return { dir, out, file, setRecipe, run };
}

test('old PASS is invalidated before failed/mismatched stages and before a new build', context => {
  const f = fixture(context); f.setRecipe(['turtle']);
  const initial = f.run('all'); assert.equal(initial.status, 0, initial.stderr);
  const receipt = path.join(f.out, 'verification.json'), original = readFileSync(receipt);
  assert.equal(JSON.parse(original).status, 'PASS');
  const other = path.join(f.dir, 'other.json');
  writeFileSync(other, JSON.stringify({ schemaVersion: 1, template: 'coloring-pages-v1', pages: ['bunny'] }));
  const preload = path.join(f.dir, 'fault.mjs');
  writeFileSync(preload, `import {chromium} from ${JSON.stringify(path.join(WORKBOOK_ROOT, 'node_modules/playwright/index.mjs'))};
chromium.launch=async()=>{throw Error('injected ownership browser failure');};`);
  const observations = [];
  function fails(label, stage, options, expected) {
    writeFileSync(receipt, original);
    const result = f.run(stage, options);
    assert.notEqual(result.status, 0, label); assert.match(result.stderr, expected);
    observations.push({ label, exit: result.status, status: JSON.parse(readFileSync(receipt)).status });
  }
  fails('launcher recipe mismatch', 'verify', { input: other }, /different recipe/);
  fails('direct recipe mismatch', 'pdf', { input: other, direct: true }, /different recipe/);
  for (const stage of ['build', 'pdf', 'screenshots', 'rasterize', 'verify'])
    fails(`${stage} browser failure`, stage, { direct: true, preload }, /injected ownership browser failure/);
  const contact = path.join(f.out, 'contact-sheet.png'), goodContact = readFileSync(contact);
  writeFileSync(contact, 'altered contact');
  fails('launcher failed verification', 'verify', {}, /Stale or altered PDF raster/);
  writeFileSync(contact, goodContact);
  writeFileSync(receipt, original);
  const built = f.run('build', { input: other }); assert.equal(built.status, 0, built.stderr);
  observations.push({ label: 'successful replacement build', exit: built.status, status: JSON.parse(readFileSync(receipt)).status });
  console.log(JSON.stringify(observations));
  for (const observation of observations) assert.notEqual(observation.status, 'PASS', observation.label);
});

for (const count of [9, 10, 24]) {
  test(`${count}-page real Poppler inventory reaches contact, receipt and pixel verification`, context => {
    const f = fixture(context); f.setRecipe(Array(count).fill('turtle'));
    const result = f.run('all');
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(readFileSync(path.join(f.out, 'raster-receipt.json')));
    assert.equal(receipt.pages.length, count);
    assert.equal(receipt.pages[0].file, count >= 10 ? 'page-01.png' : 'page-1.png');
    assert.equal(receipt.pages.at(-1).file, `page-${count}.png`);
    const verification = JSON.parse(readFileSync(path.join(f.out, 'verification.json')));
    assert.equal(verification.status, 'PASS'); assert.equal(verification.pages, count);
    console.log(JSON.stringify({ count, first: receipt.pages[0].file, last: receipt.pages.at(-1).file, status: verification.status }));
  });
}

test('one output owner rejects an overlapping coloring build before it can change verification', context => {
  const f = fixture(context); f.setRecipe(['turtle']);
  const initial = f.run('all'); assert.equal(initial.status, 0, initial.stderr);
  const preload = path.join(f.dir, 'overlap.mjs'), observation = path.join(f.dir, 'overlap.json');
  writeFileSync(preload, `import {chromium} from ${JSON.stringify(path.join(WORKBOOK_ROOT, 'node_modules/playwright/index.mjs'))};
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const launch=chromium.launch.bind(chromium);let once=false;
chromium.launch=async(...args)=>{
  if(!once){once=true;const before=fs.readFileSync(${JSON.stringify(path.join(f.out, 'verification.json'))},'utf8');
    const contender=spawnSync(process.execPath,${JSON.stringify([path.join(WORKBOOK_ROOT, 'scripts/coloring.mjs'), 'build', '--recipe', f.file, '--out', f.out])},{encoding:'utf8'});
    fs.writeFileSync(${JSON.stringify(observation)},JSON.stringify({exit:contender.status,error:contender.stderr,before,after:fs.readFileSync(${JSON.stringify(path.join(f.out, 'verification.json'))},'utf8')}));
  } return launch(...args);
};`);
  const verified = f.run('verify', { direct: true, preload }); assert.equal(verified.status, 0, verified.stderr);
  const overlap = JSON.parse(readFileSync(observation));
  console.log(JSON.stringify({ exit: overlap.exit, before: JSON.parse(overlap.before).status, after: JSON.parse(overlap.after).status }));
  assert.notEqual(overlap.exit, 0, 'Concurrent output mutation must be rejected.');
  assert.match(overlap.error, /Coloring output is already owned/);
  assert.equal(JSON.parse(overlap.before).status, 'NOT_VERIFIED');
  assert.equal(overlap.after, overlap.before, 'Contender must not alter the owning run receipt.');
  assert.equal(JSON.parse(readFileSync(path.join(f.out, 'verification.json'))).status, 'PASS');
});

test('actual raster inventory accepts numeric order and rejects missing, mixed, duplicate and linked entries', async context => {
  const { readPdfRasterInventory } = await import('../scripts/print-artifacts.mjs');
  const f = fixture(context), directory = path.join(f.dir, 'rasters');
  mkdirSync(directory);
  writeFileSync(path.join(directory, 'page-1.png'), 'first');
  assert.deepEqual(readPdfRasterInventory(directory, 1), ['page-1.png']);
  for (const invalid of [0, '', false, null, -1, 1.5, NaN, 25])
    assert.throws(() => readPdfRasterInventory(directory, invalid));
  writeFileSync(path.join(directory, 'page-02.png'), 'second');
  assert.deepEqual(readPdfRasterInventory(directory, 2), ['page-1.png', 'page-02.png']);
  assert.throws(() => readPdfRasterInventory(directory, 1), /Unexpected raster page inventory/);
  renameSync(path.join(directory, 'page-02.png'), path.join(f.dir, 'second'));
  assert.throws(() => readPdfRasterInventory(directory, 2), /Unexpected raster page inventory/);
  for (const name of ['notes.txt', 'page-01.png', 'page-0.png', 'page-3.png']) {
    writeFileSync(path.join(directory, name), 'invalid');
    assert.throws(() => readPdfRasterInventory(directory, 2), /Unexpected raster page inventory/);
    renameSync(path.join(directory, name), path.join(f.dir, name));
  }
  symlinkSync(path.join(f.dir, 'second'), path.join(directory, 'page-2.png'));
  assert.throws(() => readPdfRasterInventory(directory, 2), /regular files/);
  symlinkSync(directory, path.join(f.dir, 'linked-directory'), 'dir');
  assert.throws(() => readPdfRasterInventory(path.join(f.dir, 'linked-directory'), 2), /real directory/);
});
