import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { catalog, readRecipe, recipeSchema, resolveRecipe, WORKBOOK_ROOT } from '../src/recipes.mjs';
import { coloringCatalog, createColoringBook } from '../src/content/coloring-pages.mjs';
import { renderDocument } from '../src/render.mjs';
import { withPrintBrowser } from '../scripts/print-artifacts.mjs';
// Both existing npm/CI test entry points include this file. Keep package.json
// unchanged because it is part of the approved print recipe's source lock.
import './coloring-preparation.test.mjs';

const recipe = pages => ({ schemaVersion: 1, template: 'coloring-pages-v1', pages });
const copy = value => JSON.parse(JSON.stringify(value));
test('curated coloring catalog and schema agree; starter freezes/replays without mutation', () => {
  assert.deepEqual(recipeSchema.oneOf.find(s => s.properties.template.const === 'coloring-pages-v1').properties.pages.items.enum,
    coloringCatalog.map(entry => entry.id));
  assert.deepEqual(catalog().coloringSubjects, coloringCatalog.map(({ id, title }) => ({ id, title })));
  const input = readRecipe(path.join(WORKBOOK_ROOT, 'recipes/coloring-starter.json')), before = copy(input);
  const first = resolveRecipe(input), replay = resolveRecipe(copy(first.recipe));
  assert.deepEqual(first.recipe, replay.recipe); assert.deepEqual(input, before);
  assert.deepEqual(first.book.pages.map(p => p.render()), replay.book.pages.map(p => p.render()));
  assert.equal(first.book.pages.length, 4); assert.equal(first.book.assets.length, 4);
});
test('one/min/max pages and repetitions retain exact order with unique asset locks', () => {
  for (const n of [1, 2, 23, 24]) {
    const ids = Array.from({ length: n }, (_, i) => coloringCatalog[i % 4].id);
    const { book, recipe: frozen } = resolveRecipe(recipe(ids));
    assert.equal(book.pages.length, n); assert.deepEqual(book.selections, ids);
    assert.deepEqual(book.pages.map(p => p.meta.subject), ids);
    assert.equal(book.assets.length, new Set(ids).size); assert.deepEqual(resolveRecipe(frozen).recipe, frozen);
  }
});
test('reject mixed/unknown IDs, paths, markup, falsy inputs and page cap overflow at origin', () => {
  for (const ids of [null, false, 0, '', {}, [], Array(25).fill('bunny'), ['../private'], ['<svg>'],
    ['bunny', null], ['bunny', false], ['bunny', 'elephant'], [1], Array(1)]) {
    assert.throws(() => resolveRecipe(recipe(ids)), TypeError);
    assert.throws(() => createColoringBook(ids), TypeError);
  }
  for (const extra of [{ caption: '<script>bad()</script>' }, { out: '/tmp' }, { seed: 0 }, { html: '<svg>' }])
    assert.throws(() => resolveRecipe({ ...recipe(['bunny']), ...extra }), TypeError);
  assert.throws(() => resolveRecipe({ schemaVersion: 1, template: 'coloring-pages-v1' }), TypeError);
});
test('locks reject source/content/order/art tampering; repeated pages need only one asset', () => {
  const frozen = resolveRecipe(recipe(['bunny', 'turtle', 'bunny'])).recipe;
  assert.equal(frozen.lock.artwork.length, 2);
  const changes = [r => r.pages.reverse(), r => r.pages.push('whale'), r => r.lock.sourceSha256 = '0'.repeat(64),
    r => r.lock.artwork[0].sha256 = '0'.repeat(64), r => r.lock.artwork.pop(),
    r => r.lock.artwork.push(r.lock.artwork[0])];
  // Reverse must change actual content rather than a palindromic sequence.
  changes[0] = r => r.pages.splice(0, 2, 'turtle', 'bunny');
  for (const mutate of changes) { const altered = copy(frozen); mutate(altered); assert.throws(() => resolveRecipe(altered), /Recipe lock/); }
});
test('invalid coloring CLI recipes and conflicting flags fail before creating output', context => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-coloring-tests-'));
  context.after(() => rmSync(temp, { recursive: true }));
  const file = path.join(temp, 'invalid.json'), out = path.join(temp, 'must-not-exist');
  writeFileSync(file, JSON.stringify(recipe(['bunny', '../private'])));
  for (const args of [ ['--recipe', file], ['--recipe', file, '--recipe', file], ['--recipe'],
    ['--recipe', path.join(WORKBOOK_ROOT, 'recipes/alphabet-a-z.json')], ['--seed', '0'] ]) {
    const result = spawnSync(process.execPath, [path.join(WORKBOOK_ROOT, 'scripts/coloring.mjs'), 'build', ...args, '--out', out], { encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /TypeError/); assert.equal(existsSync(out), false);
  }
  assert.match(readFileSync(file, 'utf8'), /private/);
});

test('coloring titles respect real font metrics; tight leading reproduction overflows', async () => {
  const styles = readFileSync(path.join(WORKBOOK_ROOT, 'src/styles/coloring-practice.css'), 'utf8');
  await withPrintBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    await page.emulateMedia({ media: 'print' });
    for (const entry of coloringCatalog) {
      await page.setContent(renderDocument({ title: 'Heading regression', bodyHtml: `<style>${styles}</style>
        <header class="coloring-header"><p>KENNEDI'S COLORING BOOK</p><h1>${entry.title}</h1></header>` }));
      await page.evaluate(() => document.fonts.ready);
      const current = await page.evaluate(() => {
        const e = document.querySelector('header'); return [e.clientHeight, e.scrollHeight];
      });
      assert.ok(current[1] <= current[0] + 1, `${entry.id}: natural heading must fit`);
      const reproduction = await page.evaluate(() => {
        document.querySelector('h1').style.lineHeight = '1.15';
        const e = document.querySelector('header'); return [e.clientHeight, e.scrollHeight];
      });
      assert.ok(reproduction[1] > reproduction[0] + 1, 'Original defect must be reproducible.');
    }
  });
});

test('single-page print pipeline replays a locked recipe and rejects altered rasters', context => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-coloring-print-'));
  context.after(() => rmSync(temp, { recursive: true }));
  const file = path.join(temp, 'one-page.json'), out = path.join(temp, 'printed');
  writeFileSync(file, JSON.stringify(recipe(['turtle'])));
  const run = (stage, input = file) => spawnSync(process.execPath,
    [path.join(WORKBOOK_ROOT, 'scripts/workbook.mjs'), stage, '--recipe', input, '--out', out], { encoding: 'utf8' });
  const initial = run('all'); assert.equal(initial.status, 0, initial.stderr);
  const result = JSON.parse(readFileSync(path.join(out, 'verification.json'), 'utf8'));
  assert.equal(result.status, 'PASS'); assert.equal(result.pages, 1);
  const replay = run('verify', path.join(out, 'recipe.json')); assert.equal(replay.status, 0, replay.stderr);
  appendFileSync(path.join(out, 'pdf-raster/page-1.png'), 'tampered');
  const altered = run('verify'); assert.notEqual(altered.status, 0); assert.match(altered.stderr, /Stale or altered PDF raster/);
  const restored = run('rasterize'); assert.equal(restored.status, 0, restored.stderr);
  const verified = run('verify'); assert.equal(verified.status, 0, verified.stderr);
});

test('coloring verification rejects a stale contact-sheet image', context => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-coloring-contact-'));
  context.after(() => rmSync(temp, { recursive: true }));
  const file = path.join(temp, 'one-page.json'), out = path.join(temp, 'printed');
  writeFileSync(file, JSON.stringify(recipe(['turtle'])));
  const run = stage => spawnSync(process.execPath,
    [path.join(WORKBOOK_ROOT, 'scripts/workbook.mjs'), stage, '--recipe', file, '--out', out], { encoding: 'utf8' });
  const initial = run('all'); assert.equal(initial.status, 0, initial.stderr);
  for (const name of ['contact-sheet.png', 'contact-sheet.html', 'raster-receipt.json']) {
    const target = path.join(out, name), original = readFileSync(target);
    writeFileSync(target, name.endsWith('.json') ? '{}' : 'stale contact proof');
    const stale = run('verify');
    assert.notEqual(stale.status, 0, `Verification accepted stale ${name}.`);
    assert.match(stale.stderr, /contact|proof/i);
    writeFileSync(target, original);
    renameSync(target, path.join(temp, 'missing-file'));
    const missing = run('verify');
    assert.notEqual(missing.status, 0, `Verification accepted missing ${name}.`);
    assert.match(missing.stderr, /ENOENT/);
    renameSync(path.join(temp, 'missing-file'), target);
  }
  const recovered = run('verify'); assert.equal(recovered.status, 0, recovered.stderr);
});

test('coloring contact failure preserves old proof and interrupted publication fails closed', context => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-coloring-interruption-'));
  context.after(() => rmSync(temp, { recursive: true }));
  const file = path.join(temp, 'recipe.json'), out = path.join(temp, 'printed');
  const preload = path.join(temp, 'fault.mjs');
  const run = (stage, injected = false) => spawnSync(process.execPath,
    [...(injected ? ['--import', preload] : []), path.join(WORKBOOK_ROOT, injected ? 'scripts/coloring.mjs' : 'scripts/workbook.mjs'),
      stage, '--recipe', file, '--out', out], { encoding: 'utf8' });
  const pass = stage => { const result = run(stage); assert.equal(result.status, 0, result.stderr); };
  const proofFiles = ['pdf-raster/page-1.png', 'contact-sheet.html', 'contact-sheet.png', 'raster-receipt.json'];
  const snapshot = () => proofFiles.map(name => [name, readFileSync(path.join(out, name))]);
  writeFileSync(file, JSON.stringify(recipe(['turtle']))); pass('all');
  const old = snapshot();
  writeFileSync(file, JSON.stringify(recipe(['bunny']))); pass('build'); pass('pdf');
  for (const fault of ['launch', 'screenshot']) {
    writeFileSync(preload, `import {chromium} from ${JSON.stringify(path.join(WORKBOOK_ROOT, 'node_modules/playwright/index.mjs'))};
import fs from 'node:fs';
const launch=chromium.launch.bind(chromium);
chromium.launch=async(...args)=>{
  if(${JSON.stringify(fault)}==='launch') throw Error('injected contact launch failure');
  const browser=await launch(...args), newPage=browser.newPage.bind(browser);
  browser.newPage=async(...args)=>{const page=await newPage(...args);
    page.screenshot=async options=>{fs.writeFileSync(options.path,'partial screenshot');throw Error('injected contact screenshot failure');};
    return page;};
  return browser;
};`);
    const interrupted = run('rasterize', true);
    assert.notEqual(interrupted.status, 0);
    assert.match(interrupted.stderr, new RegExp(`injected contact ${fault} failure`));
    assert.deepEqual(snapshot(), old, 'Rendering failure changed the last complete proof.');
    const stale = run('verify'); assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /Stale or altered PDF raster\/contact proof/);
  }
  writeFileSync(preload, `import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
const rename=fs.renameSync;
fs.renameSync=(from,to)=>{if(String(from).includes('.coloring-proof-') && String(to).endsWith('/contact-sheet.png'))
  throw Error('injected contact publication failure');return rename(from,to);};
syncBuiltinESMExports();`);
  const partial = run('rasterize', true); assert.notEqual(partial.status, 0);
  assert.match(partial.stderr, /injected contact publication failure/);
  const mixed = run('verify'); assert.notEqual(mixed.status, 0);
  assert.match(mixed.stderr, /Stale or altered PDF raster\/contact proof/);
  pass('rasterize'); pass('verify');
});
