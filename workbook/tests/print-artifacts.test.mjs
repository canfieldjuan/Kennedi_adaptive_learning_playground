import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { alphabet } from '../src/content/alphabet-practice.mjs';
import { numbers } from '../src/content/numbers-practice.mjs';

const original = fileURLToPath(new URL('../', import.meta.url));
let directory, source;
const out = kind => path.join(directory, kind);
function run(script, stage, destination, extra = []) {
  return spawnSync(process.execPath, [path.join(source, 'scripts', `${script}.mjs`), stage, '--out', destination, ...extra],
    { cwd: source, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
}
function passes(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
}

before(() => {
  const parent = process.env.KENNEDI_PRINT_TEST_EVIDENCE_DIR ?? os.tmpdir();
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  directory = mkdtempSync(path.join(parent, 'kennedi-print-regression-'));
  source = path.join(directory, 'source');
  mkdirSync(source, { mode: 0o700 });
  for (const item of ['scripts', 'src', 'recipes', 'package.json', 'package-lock.json']) {
    cpSync(path.join(original, item), path.join(source, item), { recursive: true });
  }
  symlinkSync(path.join(original, 'node_modules'), path.join(source, 'node_modules'), 'dir');
  for (const file of new Set([...alphabet, ...numbers].map(cue => cue.illustrationPath))) {
    mkdirSync(path.dirname(path.join(source, file)), { recursive: true, mode: 0o700 });
    cpSync(path.join(original, file), path.join(source, file));
  }
  for (const kind of ['alphabet', 'numbers']) passes(run(kind, 'all', out(kind)));
  console.log(`Print regression evidence: ${directory}`);
});
after(() => {
  // Only our own fresh temporary fixture is deleted; durable local evidence stays.
  if (!process.env.KENNEDI_PRINT_TEST_EVIDENCE_DIR && directory) rmSync(directory, { recursive: true });
});

for (const [kind, filename] of [['alphabet', 'kennedi-alphabet-practice-a-z.pdf'], ['numbers', 'kennedi-numbers-1-20.pdf']]) {
  test(`${kind} rejects altered combined and individual PDF bytes`, () => {
    const files = [path.join(out(kind), 'pdf', filename), path.join(out(kind), 'pdf/pages/page-01.pdf')];
    for (const file of files) {
      const bytes = readFileSync(file);
      // Legal trailing PDF comment preserves page count/Letter dimensions.
      writeFileSync(file, Buffer.concat([bytes, Buffer.from('\n% changed artifact\n')]));
      try {
        const result = run(kind, 'verify', out(kind));
        assert.notEqual(result.status, 0, `${kind} accepted altered ${path.basename(file)}`);
        assert.match(result.stderr, /Altered PDF/);
      } finally { writeFileSync(file, bytes); }
    }
    passes(run(kind, 'verify', out(kind)));
  });
}

test('rebuilding 12 counting pages as 3 pages replaces the raster inventory', () => {
  const destination = out('counting');
  passes(run('workbook', 'all', destination, ['--recipe', path.join(source, 'recipes/counting-mixed.json')]));
  const previous = readdirSync(path.join(destination, 'pdf-raster')).filter(file => /^page-\d+\.png$/.test(file));
  assert.equal(previous.length, 12);
  writeFileSync(path.join(destination, 'pdf-raster/notes.txt'), 'Keep this annotation.');
  const result = run('workbook', 'all', destination, ['--recipe', path.join(source, 'recipes/counting-custom.json')]);
  passes(result);
  assert.equal(readdirSync(path.join(destination, 'pdf-raster')).filter(file => /^page-\d+\.png$/.test(file)).length, 3);
  const verification = JSON.parse(readFileSync(path.join(destination, 'verification.json'), 'utf8'));
  assert.equal(verification.status, 'PASS');
  assert.equal(verification.pages, 3);
  const backups = readdirSync(destination).filter(file => /^\.pdf-raster-.*\.previous$/.test(file));
  assert.equal(backups.length, 1);
  assert.equal(readdirSync(path.join(destination, backups[0])).filter(file => /^page-\d+\.png$/.test(file)).length, 12);
  assert.equal(readFileSync(path.join(destination, backups[0], 'notes.txt'), 'utf8'), 'Keep this annotation.');
});

test('direct alphabet/numbers verification rejects changed crop-producing code', () => {
  const helper = path.join(source, 'scripts/print-artifacts.mjs');
  const files = existsSync(helper) ? [helper] : ['alphabet', 'numbers'].map(kind => path.join(source, `scripts/${kind}.mjs`));
  const originals = files.map(file => [file, readFileSync(file, 'utf8')]);
  for (const [file, text] of originals) {
    const changed = text.replaceAll('* .06', '* .08').replaceAll('* 1.12', '* 1.16');
    assert.notEqual(changed, text, 'fixture must change the real crop producer');
    writeFileSync(file, changed);
  }
  try {
    for (const kind of ['alphabet', 'numbers']) {
      const result = run(kind, 'verify', out(kind));
      assert.notEqual(result.status, 0, `${kind} accepted stale crops after producer changed`);
      assert.match(result.stderr, /Stale illustration crops/);
    }
  } finally { for (const [file, text] of originals) writeFileSync(file, text); }
  for (const kind of ['alphabet', 'numbers']) passes(run(kind, 'verify', out(kind)));
});

test('raster publication rejects bad counts/symlinks without changing the live inventory', async () => {
  const { replacePdfRasters } = await import('../scripts/print-artifacts.mjs');
  const live = path.join(out('counting'), 'pdf-raster');
  const pdf = path.join(out('counting'), 'pdf/kennedi-count-circle-and-trace.pdf');
  const originalImages = readdirSync(live).map(file => [file, readFileSync(path.join(live, file))]);
  for (const bad of [0, -1, '', false, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => replacePdfRasters(pdf, live, bad), /positive raster page count/);
  }
  assert.throws(() => replacePdfRasters(pdf, live, 4), /Unexpected raster page inventory/);
  assert.deepEqual(readdirSync(live).map(file => [file, readFileSync(path.join(live, file))]), originalImages);
  const link = path.join(directory, 'raster-symlink');
  symlinkSync(live, link, 'dir');
  assert.throws(() => replacePdfRasters(pdf, link, 3), /real directory/);
  assert.deepEqual(readdirSync(live).map(file => [file, readFileSync(path.join(live, file))]), originalImages);
});
