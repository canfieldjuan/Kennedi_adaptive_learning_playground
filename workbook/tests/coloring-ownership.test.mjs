import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, renameSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { RECIPE_MAX_BYTES, resolveRecipe, WORKBOOK_ROOT } from '../src/recipes.mjs';

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

test('incoming recipe failures invalidate existing output before parsing across entrypoints and stages', context => {
  const f = fixture(context); f.setRecipe(['turtle']);
  mkdirSync(f.out);
  const snapshot = path.join(f.out, 'recipe.json');
  const saved = resolveRecipe({ schemaVersion: 1, template: 'coloring-pages-v1', pages: ['turtle'] }).recipe;
  writeFileSync(snapshot, JSON.stringify(saved));
  const receipt = path.join(f.out, 'verification.json');
  const invalidLock = structuredClone(saved); invalidLock.lock.sourceSha256 = '0'.repeat(64);
  const cases = [
    ['schema-invalid', JSON.stringify({ schemaVersion: 1, template: 'coloring-pages-v1', pages: ['bogus'] }), /no unique matching recipe format/],
    ['malformed', '{', /not valid JSON/],
    ['missing', undefined, /ENOENT/],
    ['directory', undefined, /JSON file/],
    ['oversized', ' '.repeat(RECIPE_MAX_BYTES + 1), /no larger than/],
    ['invalid-lock', JSON.stringify(invalidLock), /renderer inputs changed/],
  ];
  // POSIX permission denial is meaningful only for an unprivileged POSIX user.
  if (process.getuid?.() > 0) cases.push(['unreadable', JSON.stringify(saved), /EACCES/]);
  const observations = [];
  for (const [label, data, expected] of cases) {
    const input = path.join(f.dir, `${label}.json`);
    if (label === 'directory') mkdirSync(input);
    else if (data !== undefined) writeFileSync(input, data);
    if (label === 'unreadable') chmodSync(input, 0);
    for (const direct of [false, true]) for (const stage of ['all', 'build', 'pdf', 'screenshots', 'rasterize', 'verify']) {
      writeFileSync(receipt, JSON.stringify({ status: 'PASS' }));
      const result = f.run(stage, { input, direct });
      assert.notEqual(result.status, 0, `${label}/${direct}/${stage}`);
      assert.match(result.stderr, expected);
      const status = JSON.parse(readFileSync(receipt)).status;
      observations.push({ label, direct, stage, status });
      assert.equal(status, 'NOT_VERIFIED', `${label}/${direct}/${stage} must not retain stale PASS`);
      assert.equal(existsSync(path.join(f.out, '.coloring-run-lock')), false, 'Failure must release its owner');
    }
    if (label === 'unreadable') chmodSync(input, 0o600);
  }
  // Incoming and saved metadata can be the same file; no pre-owner metadata
  // parsing is allowed either. A malformed snapshot must not defeat ownership.
  writeFileSync(snapshot, '{'); writeFileSync(receipt, JSON.stringify({ status: 'PASS' }));
  const alias = f.run('verify', { input: snapshot });
  assert.notEqual(alias.status, 0); assert.match(alias.stderr, /not valid JSON/);
  assert.equal(JSON.parse(readFileSync(receipt)).status, 'NOT_VERIFIED');
  console.log(JSON.stringify({ cases: observations.length, status: 'NOT_VERIFIED', savedInputAlias: true }));
});

test('invalid new inputs and validate-only calls do not claim or mutate output', context => {
  const f = fixture(context); f.setRecipe(['bogus']);
  for (const direct of [false, true]) {
    const result = f.run('build', { direct }); assert.notEqual(result.status, 0);
    assert.equal(existsSync(f.out), false);
  }
  const defaultOutputs = ['alphabet-rows-v1', 'numbers-1-20-v1', 'count-and-trace-v1', 'coloring-pages-v1']
    .map(template => path.join(WORKBOOK_ROOT, 'dist-recipes', template));
  const beforeDefaults = defaultOutputs.map(out => ({ exists: existsSync(out),
    receipt: existsSync(path.join(out, 'verification.json')) ? readFileSync(path.join(out, 'verification.json'), 'utf8') : undefined }));
  const withoutTarget = spawnSync(process.execPath, [path.join(WORKBOOK_ROOT, 'scripts/workbook.mjs'), 'build', '--recipe', f.file], { encoding: 'utf8' });
  assert.notEqual(withoutTarget.status, 0);
  assert.deepEqual(defaultOutputs.map(out => ({ exists: existsSync(out),
    receipt: existsSync(path.join(out, 'verification.json')) ? readFileSync(path.join(out, 'verification.json'), 'utf8') : undefined })), beforeDefaults);
  mkdirSync(f.out);
  const receipt = path.join(f.out, 'verification.json'), original = '{"status":"PASS"}';
  writeFileSync(receipt, original);
  const script = path.join(WORKBOOK_ROOT, 'scripts/workbook.mjs');
  for (const args of [
    ['validate', '--recipe', f.file], ['validate', '--recipe', f.file, '--out', f.out],
    ['build', '--recipe', f.file, '--out', f.out, '--out', f.out], ['catalog'],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.equal(result.status, args[0] === 'catalog' ? 0 : 1);
    assert.equal(readFileSync(receipt, 'utf8'), original);
    assert.equal(existsSync(path.join(f.out, '.coloring-run-lock')), false);
  }
  f.setRecipe(['turtle']);
  const valid = spawnSync(process.execPath, [script, 'validate', '--recipe', f.file], { encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(readFileSync(receipt, 'utf8'), original);
});

test('explicit targets are owned independently of the incoming or saved template', context => {
  const f = fixture(context); mkdirSync(f.out);
  const receipt = path.join(f.out, 'verification.json');
  for (const template of ['alphabet-rows-v1', 'numbers-1-20-v1', 'count-and-trace-v1']) {
    const recipe = template === 'count-and-trace-v1'
      ? { schemaVersion: 1, template, seed: 0, mode: 'choice' } : { schemaVersion: 1, template };
    writeFileSync(path.join(f.out, 'recipe.json'), JSON.stringify(resolveRecipe(recipe).recipe));
    f.setRecipe(['bogus']); writeFileSync(receipt, JSON.stringify({ status: 'PASS' }));
    const invalid = f.run('build'); assert.notEqual(invalid.status, 0);
    assert.equal(JSON.parse(readFileSync(receipt)).status, 'NOT_VERIFIED');
    // A valid other-family input must still use its original dispatcher and
    // reject a mismatched snapshot without producing any PDF.
    writeFileSync(f.file, JSON.stringify({ schemaVersion: 1, template: template === 'alphabet-rows-v1' ? 'numbers-1-20-v1' : 'alphabet-rows-v1' }));
    writeFileSync(receipt, JSON.stringify({ status: 'PASS' }));
    const mismatch = f.run('pdf'); assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /different recipe/);
    assert.equal(JSON.parse(readFileSync(receipt)).status, 'NOT_VERIFIED');
    assert.equal(existsSync(path.join(f.out, 'pdf')), false);
  }
});

test('shared output owner rejects forged, cross-target and concurrent capabilities without altering the receipt', async context => {
  const { withPrintOutput } = await import('../scripts/print-artifacts.mjs');
  const f = fixture(context), other = path.join(f.dir, 'other');
  let releasedOwner;
  await withPrintOutput(f.out, 'build', async owner => {
    releasedOwner = owner;
    const receipt = path.join(f.out, 'verification.json'), before = readFileSync(receipt, 'utf8');
    let calls = 0;
    const action = () => { calls++; };
    for (const forged of [{}, null, false, 0, ''])
      await assert.rejects(withPrintOutput(f.out, 'pdf', action, forged), /owner does not match/);
    await assert.rejects(withPrintOutput(other, 'pdf', action, owner), /owner does not match/);
    assert.equal(existsSync(other), false);
    await assert.rejects(withPrintOutput(f.out, 'pdf', action), /output is already owned/);
    assert.equal(calls, 0);
    await withPrintOutput(f.out, 'build', action, owner); assert.equal(calls, 1);
    assert.equal(readFileSync(receipt, 'utf8'), before, 'Nested handoff must not rewrite owner receipt');
  });
  assert.equal(existsSync(path.join(f.out, '.coloring-run-lock')), false);
  await assert.rejects(withPrintOutput(f.out, 'build', () => {}, releasedOwner), /owner does not match/);
  await assert.rejects(withPrintOutput(f.out, 'pdf', () => { throw Error('isolated owner fault'); }), /isolated owner fault/);
  assert.equal(existsSync(path.join(f.out, '.coloring-run-lock')), false);
  assert.equal(JSON.parse(readFileSync(path.join(f.out, 'verification.json'))).status, 'NOT_VERIFIED');
  const linked = path.join(f.dir, 'linked'); symlinkSync(f.out, linked, 'dir');
  await assert.rejects(withPrintOutput(linked, 'build', () => {}), /real directory/);
});

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
    const contenders=[];
    for(const script of ['coloring','workbook']) for(const input of ${JSON.stringify([f.file, path.join(f.dir, 'absent.json')])}) {
      const contender=spawnSync(process.execPath,[${JSON.stringify(path.join(WORKBOOK_ROOT, 'scripts'))}+'/'+script+'.mjs','build','--recipe',input,'--out',${JSON.stringify(path.join(f.out, '..', path.basename(f.out)))}],{encoding:'utf8'});
      contenders.push({script,input,exit:contender.status,error:contender.stderr,before,after:fs.readFileSync(${JSON.stringify(path.join(f.out, 'verification.json'))},'utf8')});
    }
    fs.writeFileSync(${JSON.stringify(observation)},JSON.stringify(contenders));
  } return launch(...args);
};`);
  for (const direct of [false, true]) {
    const verified = f.run('verify', { direct, preload }); assert.equal(verified.status, 0, verified.stderr);
    const overlaps = JSON.parse(readFileSync(observation)); assert.equal(overlaps.length, 4);
    for (const overlap of overlaps) {
      console.log(JSON.stringify({ ownerDirect: direct, contender: overlap.script, exit: overlap.exit, before: JSON.parse(overlap.before).status, after: JSON.parse(overlap.after).status }));
      assert.notEqual(overlap.exit, 0, 'Concurrent output mutation must be rejected.');
      assert.match(overlap.error, /output is already owned/);
      assert.equal(JSON.parse(overlap.before).status, 'NOT_VERIFIED');
      assert.equal(overlap.after, overlap.before, 'Contender must not alter the owning run receipt.');
    }
    assert.equal(JSON.parse(readFileSync(path.join(f.out, 'verification.json'))).status, 'PASS');
  }
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
