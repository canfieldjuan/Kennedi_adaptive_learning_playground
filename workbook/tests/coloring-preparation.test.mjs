import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const original = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(context) {
  const evidence = process.env.KENNEDI_COLORING_PREP_EVIDENCE_DIR;
  const parent = evidence ?? os.tmpdir();
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const root = mkdtempSync(path.join(parent, 'coloring-preparation-'));
  context.after(() => { if (!evidence) rmSync(root, { recursive: true }); });
  const files = ['scripts/print-artifacts.mjs', 'src/content/asset-inline.mjs',
    'tools/prepare-coloring-bunny.mjs', 'tools/prepare-coloring-turtle.mjs'];
  if (existsSync(path.join(original, 'tools/prepare-coloring-character.mjs')))
    files.push('tools/prepare-coloring-character.mjs');
  for (const file of files) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(original, file), path.join(root, file));
  }
  symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  const live = path.join(root, 'design-source/coloring/characters');
  cpSync(path.join(original, 'design-source/coloring/characters'), live, { recursive: true });
  writeFileSync(path.join(live, 'notes.txt'), 'Preserve artist annotations.');
  for (const input of ['bunny-01-sitting.png', 'turtle-01-walking.png']) {
    const relative = `design-source/animals/locked-poses/${input}`;
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    cpSync(path.join(original, relative), path.join(root, relative));
  }
  const snapshot = () => readdirSync(live).sort().map(name => [name, hash(readFileSync(path.join(live, name)))]);
  const inputs = () => ['bunny-01-sitting.png', 'turtle-01-walking.png'].map(name =>
    hash(readFileSync(path.join(root, 'design-source/animals/locked-poses', name))));
  const run = (animal, fault) => {
    const args = [];
    if (fault) {
      const preload = path.join(root, 'fault.mjs');
      writeFileSync(preload, `import fs from 'node:fs';
import child from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {chromium} from 'playwright';
const write=fs.writeFileSync, rename=fs.renameSync, exec=child.execFileSync;
const chmod=fs.chmodSync;
const fault=${JSON.stringify(fault)}, live=${JSON.stringify(live)};
if(fault==='crop') chromium.launch=async()=>{throw Error('injected crop failure');};
if(fault==='metadata') child.execFileSync=(tool,args,options)=>{
  if(args[0]==='-version') throw Error('injected metadata failure');
  return exec(tool,args,options);
};
if(fault==='receipt') fs.writeFileSync=(file,...args)=>{
  if(String(file).endsWith('.recipe.json')) throw Error('injected receipt failure');
  return write(file,...args);
};
if(fault==='publish') fs.renameSync=(from,to)=>{
  if(String(from).includes('.characters-') && (to===live || String(to).endsWith('/export')))
    throw Error('injected publication failure');
  return rename(from,to);
};
if(fault==='concurrent') fs.writeFileSync=(file,...args)=>{
  const result=write(file,...args);
  if(String(file).endsWith('.recipe.json')) write(live+'/notes.txt','Concurrent artist edit.');
  return result;
};
if(fault==='late-edit') {
  let armed=false;
  fs.writeFileSync=(file,...args)=>{
    const result=write(file,...args);
    if(String(file).endsWith('.recipe.json')) armed=true;
    return result;
  };
  fs.chmodSync=(file,...args)=>{
    if(armed && String(file).includes('.characters-')) write(live+'/notes.txt','Late artist edit.');
    return chmod(file,...args);
  };
}
syncBuiltinESMExports();
`);
      args.push('--import', preload);
    }
    return spawnSync(process.execPath, [...args, path.join(root, `tools/prepare-coloring-${animal}.mjs`)],
      { cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  };
  console.log('Isolated preparation fixture:', root);
  return { root, live, snapshot, inputs, run };
}

for (const animal of ['bunny', 'turtle']) {
  test(`${animal}: late publication edit must remain in live artist inventory`, context => {
    const f = fixture(context), before = f.snapshot();
    const result = f.run(animal, 'late-edit');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(path.join(f.live, 'notes.txt'), 'utf8'), 'Late artist edit.');
    assert.deepEqual(f.snapshot().filter(([name]) => name !== 'notes.txt'), before.filter(([name]) => name !== 'notes.txt'));
  });
  for (const fault of ['crop', 'metadata', 'receipt', 'publish']) {
    test(`${animal}: ${fault} failure preserves complete reviewed inventory`, context => {
      const f = fixture(context), before = f.snapshot(), inputs = f.inputs();
      const result = f.run(animal, fault);
      assert.notEqual(result.status, 0, 'Fault must actually interrupt preparation.');
      assert.match(result.stderr, new RegExp(`injected ${fault === 'publish' ? 'publication' : fault} failure`));
      const after = f.snapshot();
      console.log(JSON.stringify({ animal, fault, exitStatus: result.status, before, after }));
      assert.deepEqual(after, before, 'Failed preparation changed reviewed SVG/receipt/sibling files.');
      assert.deepEqual(f.inputs(), inputs, 'Canonical input changed.');
    });
  }
  test(`${animal}: successful preparation preserves exact approved export, receipt and siblings`, context => {
    const f = fixture(context), before = f.snapshot(), inputs = f.inputs();
    const result = f.run(animal);
    assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
    assert.deepEqual(f.snapshot(), before, 'Port changed proven export bytes or provenance.');
    assert.deepEqual(f.inputs(), inputs);
    const resultRecord = JSON.parse(result.stdout);
    const candidate = resultRecord.candidateDirectory;
    assert.ok(candidate.startsWith(path.dirname(f.live) + '/.characters-'));
    const receipt = JSON.parse(readFileSync(path.join(candidate, `${animal}-coloring-opaque.recipe.json`)));
    assert.equal(receipt.outputSha256, hash(readFileSync(path.join(f.root, receipt.output))));
    assert.deepEqual(readdirSync(candidate).sort().map(name => [name, hash(readFileSync(path.join(candidate, name)))]),
      before.filter(([name]) => name.startsWith(animal + '-')));
    const repeated = f.run(animal); assert.equal(repeated.status, 0, repeated.stderr);
    assert.notEqual(JSON.parse(repeated.stdout).candidateDirectory, candidate, 'Runs must not share a publication target.');
    console.log(`${animal} successful export/receipt parity PASS: ${receipt.outputSha256}`);
  });
  test(`${animal}: concurrent same-directory edit is preserved without live publication`, context => {
    const f = fixture(context), before = f.snapshot();
    const result = f.run(animal, 'concurrent');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(f.snapshot().filter(([name]) => name !== 'notes.txt'), before.filter(([name]) => name !== 'notes.txt'));
    assert.equal(readFileSync(path.join(f.live, 'notes.txt'), 'utf8'), 'Concurrent artist edit.');
  });
  test(`${animal}: CLI rejects unexpected arguments without changing reviewed files`, context => {
    const f = fixture(context), before = f.snapshot();
    const result = spawnSync(process.execPath, [path.join(f.root, `tools/prepare-coloring-${animal}.mjs`), '--out', '/unexpected'],
      { cwd: f.root, encoding: 'utf8', timeout: 30000 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /TypeError: Usage:/);
    assert.deepEqual(f.snapshot(), before);
  });
}

test('shared preparation rejects unknown/path/prototype/falsy character IDs before writes', async () => {
  const { prepareColoringCharacter } = await import('../tools/prepare-coloring-character.mjs');
  for (const bad of [null, false, 0, '', '../bunny', '__proto__', 'toString', 'puppy'])
    await assert.rejects(prepareColoringCharacter(bad), /Unknown coloring character/);
});
