import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { catalog, readRecipe, recipeSchema, RECIPE_MAX_BYTES, resolveRecipe, sourceFingerprint, WORKBOOK_ROOT } from '../src/recipes.mjs';
import { createCountingBook, createCountingBookFromGroups, animals } from '../src/content/counting-practice.mjs';

const counting = (changes = {}) => ({ schemaVersion: 1, template: 'count-and-trace-v1', seed: 0, mode: 'choice', ...changes });
const group = (changes = {}) => ({ animal: 'turtle', count: 3, ...changes });
const copy = value => JSON.parse(JSON.stringify(value));
const metadata = book => book.pages.map(page => page.meta);
const renderedHash = book => createHash('sha256').update(JSON.stringify(book.pages.map(page => ({ meta: page.meta, html: page.render() })))).digest('hex');

test('existing default content/layout stays byte-identical to before recipe support', () => {
  assert.equal(renderedHash(createCountingBook(1042026, 'choice')), '4e7d4f01e24edba22677e7c1464568a2c8f0b85e1dcd080dfbe44cfd63c3c46d');
  assert.equal(renderedHash(createCountingBook(1042026, 'guided')), '0b18955bfab761edabad0a050d7da4c103a27fcff41549eb6c540881805250af');
  assert.equal(renderedHash(resolveRecipe({ schemaVersion: 1, template: 'alphabet-rows-v1' }).book), 'b19fd3798e99b1ffa24c78a2e323a81bb5a857030a7abc03fb56bcf5e4efdbe6');
  assert.equal(renderedHash(resolveRecipe({ schemaVersion: 1, template: 'numbers-1-20-v1' }).book), '2ad8db29cad7828f8ecaab584dd173549269ec5a636514f0e8fc803fd4c650e9');
});

test('all checked-in examples resolve, freeze and replay with identical content', () => {
  for (const name of ['alphabet-a-z', 'numbers-1-20', 'counting-mixed', 'counting-custom']) {
    const input = readRecipe(path.join(WORKBOOK_ROOT, 'recipes', `${name}.json`));
    const savedInput = copy(input);
    const first = resolveRecipe(input);
    const replay = resolveRecipe(copy(first.recipe));
    assert.deepEqual(metadata(first.book), metadata(replay.book));
    assert.equal(renderedHash(first.book), renderedHash(replay.book));
    assert.deepEqual(first.recipe, replay.recipe);
    assert.deepEqual(input, savedInput, 'must not mutate author data');
    assert.equal(first.recipe.lock.sourceSha256, sourceFingerprint(input.template));
    assert.equal(first.recipe.lock.artwork.length, first.book.assets.length);
  }
});

test('custom groups retain order, count, identity and explicit choices; missing choices are seeded', () => {
  const input = counting({ groups: [group({ choices: [4, 3, 2] }), group({ animal: 'elephant', count: 5 }), group({ animal: 'fox', count: 1 })] });
  const before = copy(input);
  const resolved = resolveRecipe(input);
  assert.equal(resolved.book.pages.length, 2);
  assert.deepEqual(resolved.recipe.groups.map(({ animal, count }) => [animal, count]), [['turtle', 3], ['elephant', 5], ['fox', 1]]);
  assert.deepEqual(resolved.recipe.groups[0].choices, [4, 3, 2]);
  assert.deepEqual(resolved.recipe, resolveRecipe(input).recipe);
  assert.notDeepEqual(resolved.recipe.groups[1].choices, resolveRecipe({ ...input, seed: 1 }).recipe.groups[1].choices);
  assert.deepEqual(input, before);
  const html = resolved.book.pages[0].render();
  assert.equal((html.match(/class="ct-picture"/g) ?? []).length, 8);
  assert.deepEqual([...html.matchAll(/data-answer="(\d+)"/g)].map(m => Number(m[1])), resolved.recipe.groups.slice(0, 2).flatMap(g => g.choices));
  assert.deepEqual(resolved.book.assets, [animals.find(a => a.animal === 'turtle').illustrationPath,
    animals.find(a => a.animal === 'elephant').illustrationPath, animals.find(a => a.animal === 'fox').illustrationPath]);
});

test('range/cap edges and partial pages work without falsy default defeat', () => {
  for (const mode of ['choice', 'guided']) for (const seed of [0, 4294967295]) for (const length of [1, 2, 3, 59, 60]) {
    const input = counting({ seed, mode, groups: Array.from({ length }, (_, index) => group({ animal: animals[index % animals.length].animal, count: index % 2 ? 20 : 1 })) });
    const { book, recipe } = resolveRecipe(input);
    assert.equal(book.seed, seed);
    assert.equal(book.pages.length, Math.ceil(length / (mode === 'choice' ? 2 : 3)));
    assert.equal(recipe.groups.length, length);
    assert.deepEqual(metadata(book), metadata(resolveRecipe(copy(recipe)).book));
    if (mode === 'choice') {
      const positions = [0, 0, 0];
      recipe.groups.forEach(g => positions[g.choices.indexOf(g.count)]++);
      assert.ok(Math.max(...positions) - Math.min(...positions) <= 1);
    } else assert.ok(recipe.groups.every(g => !Object.hasOwn(g, 'choices')));
  }
});

test('schema rejects malformed top-level, extra/mixed/falsy fields and unknown templates', () => {
  const invalid = [null, false, 0, '', [], {}, { schemaVersion: 1 }, counting({ schemaVersion: 0 }), counting({ schemaVersion: '1' }),
    counting({ template: '__proto__' }), counting({ template: '../scripts/build' }), counting({ template: 'future-v2' }),
    counting({ seed: -1 }), counting({ seed: 4294967296 }), counting({ seed: false }), counting({ seed: '' }), counting({ seed: null }), counting({ seed: 0.5 }),
    counting({ mode: false }), counting({ mode: '' }), counting({ mode: null }), counting({ mode: 'quiz' }),
    counting({ code: 'process.exit()' }), counting({ html: '<script>' }), counting({ out: '/tmp' }),
    { schemaVersion: 1, template: 'alphabet-rows-v1', seed: 0 }, { schemaVersion: 1, template: 'numbers-1-20-v1', groups: [] },
    JSON.parse('{"schemaVersion":1,"template":"alphabet-rows-v1","__proto__":{}}')];
  for (const input of invalid) assert.throws(() => resolveRecipe(input), TypeError);
  assert.deepEqual(recipeSchema.$defs.group.properties.animal.enum, animals.map(a => a.animal));
});

test('groups reject unsafe/unknown assets, bad counts, duplicates and invalid choices at origin', () => {
  const badGroups = [null, false, '', [], Array(61).fill(group()), [null], [false], [group(), null], [group(), group()],
    [group({ animal: 'frog' })], [group({ animal: '../private.svg' })], [group({ illustrationPath: '/etc/passwd' })], [group({ animal: '<svg>' })],
    ...[0, -1, 21, 0.5, '', '3', false, null].map(count => [group({ count })]),
    ...[null, false, '', [], [3, 4], [3, 4, 5, 6], [3, 3, 4], [1, 2, 4], [3, 0, 4], [3, 21, 4], [3, '4', 5], [3, false, 5]].map(choices => [group({ choices })])];
  for (const groups of badGroups) assert.throws(() => resolveRecipe(counting({ groups })), TypeError);
  assert.throws(() => resolveRecipe(counting({ mode: 'guided', groups: [group({ choices: [2, 3, 4] })] })), TypeError);
  assert.throws(() => createCountingBookFromGroups(0, 'choice', [group({ choices: [3, , 4] })]), TypeError);
  assert.throws(() => createCountingBookFromGroups(0, 'choice', [group(), , group({ animal: 'cat' })]), TypeError);
  assert.doesNotThrow(() => resolveRecipe(counting({ groups: [group({ count: 1, choices: [20, 1, 2] })] })));
  assert.doesNotThrow(() => resolveRecipe(counting({ groups: [group({ count: 20, choices: [1, 20, 19] })] })));
});

test('locks reject changed content, renderer/art hashes, missing/mixed/duplicate/unknown assets', () => {
  const saved = resolveRecipe(counting({ groups: [group()] })).recipe;
  const invalid = [];
  const modified = action => { const value = copy(saved); action(value); invalid.push(value); };
  modified(r => r.seed++);
  modified(r => r.groups[0].count = 4);
  modified(r => r.groups[0].choices.reverse());
  modified(r => r.lock.sourceSha256 = '0'.repeat(64));
  modified(r => r.lock.contentSha256 = '0'.repeat(64));
  modified(r => r.lock.artwork[0].sha256 = '0'.repeat(64));
  modified(r => r.lock.artwork[0].asset = 'other-animal');
  modified(r => r.lock.artwork[0].asset = '../turtle');
  modified(r => r.lock.artwork = []);
  modified(r => r.lock.artwork.push(r.lock.artwork[0]));
  modified(r => delete r.lock.sourceSha256);
  modified(r => r.lock.artwork[0].sha256 = false);
  modified(r => r.lock.extra = true);
  modified(r => r.lock = null);
  for (const input of invalid) assert.throws(() => resolveRecipe(input), TypeError);
  assert.deepEqual(resolveRecipe(copy(saved)).recipe, saved);
});

test('bounded JSON file loading rejects empty/malformed/oversized input and accepts size edge', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'kennedi-recipe-json-'));
  try {
    const file = path.join(directory, 'recipe.json');
    const valid = JSON.stringify({ schemaVersion: 1, template: 'alphabet-rows-v1' });
    for (const text of ['', '{bad}', 'false', valid + ' '.repeat(RECIPE_MAX_BYTES + 1 - Buffer.byteLength(valid))]) {
      writeFileSync(file, text);
      assert.throws(() => readRecipe(file), TypeError);
    }
    writeFileSync(file, valid + ' '.repeat(RECIPE_MAX_BYTES - Buffer.byteLength(valid)));
    assert.deepEqual(readRecipe(file), JSON.parse(valid));
    assert.throws(() => readRecipe(directory), TypeError);
  } finally { rmSync(directory, { recursive: true }); }
});

test('CLI validates before creating outputs; rejects conflicting or duplicate flags and wrong templates', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'kennedi-recipe-cli-'));
  try {
    const invalid = path.join(directory, 'invalid.json');
    const out = path.join(directory, 'must-not-exist');
    writeFileSync(invalid, JSON.stringify(counting({ groups: [group({ animal: '../private' })] })));
    const custom = path.join(WORKBOOK_ROOT, 'recipes/counting-custom.json');
    const alpha = path.join(WORKBOOK_ROOT, 'recipes/alphabet-a-z.json');
    for (const [script, args] of [
      ['workbook', ['build', '--recipe', invalid, '--out', out]],
      ['workbook', ['build', '--recipe', custom, '--seed', '1', '--out', out]],
      ['workbook', ['build', '--recipe', custom, '--recipe', custom, '--out', out]],
      ['workbook', ['build', '--out', out]],
      ['workbook', ['build', '--recipe']],
      ['counting', ['build', '--recipe', custom, '--seed', '0', '--out', out]],
      ['counting', ['build', '--recipe', custom, '--mode', 'choice', '--out', out]],
      ['counting', ['build', '--recipe', alpha, '--out', out]],
      ['counting', ['build', '--recipe', invalid, '--out', out]],
    ]) {
      const result = spawnSync(process.execPath, [path.join(WORKBOOK_ROOT, 'scripts', `${script}.mjs`), ...args], { encoding: 'utf8' });
      assert.notEqual(result.status, 0, `${script} ${args.join(' ')}`);
      assert.match(result.stderr, /Error/);
      assert.equal(existsSync(out), false);
    }
    const validation = spawnSync(process.execPath, [path.join(WORKBOOK_ROOT, 'scripts/workbook.mjs'), 'validate', '--recipe', custom], { encoding: 'utf8' });
    assert.equal(validation.status, 0, validation.stderr);
    assert.match(validation.stdout, /PASS: count-and-trace-v1; 3 pages/);
    assert.equal(existsSync(out), false);
    const listing = spawnSync(process.execPath, [path.join(WORKBOOK_ROOT, 'scripts/workbook.mjs'), 'catalog'], { encoding: 'utf8' });
    assert.equal(listing.status, 0, listing.stderr);
    assert.deepEqual(JSON.parse(listing.stdout), catalog());
  } finally { rmSync(directory, { recursive: true }); }
});

test('later stages reject a valid recipe for a different existing build before touching its output', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'kennedi-recipe-stage-'));
  try {
    const snapshot = path.join(directory, 'recipe.json');
    const original = JSON.stringify(resolveRecipe({ schemaVersion: 1, template: 'alphabet-rows-v1' }).recipe);
    writeFileSync(snapshot, original);
    for (const stage of ['pdf', 'screenshots', 'rasterize', 'verify']) {
      const result = spawnSync(process.execPath, [path.join(WORKBOOK_ROOT, 'scripts/workbook.mjs'), stage,
        '--recipe', path.join(WORKBOOK_ROOT, 'recipes/numbers-1-20.json'), '--out', directory], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Output was built from a different recipe/);
      assert.equal(readFileSync(snapshot, 'utf8'), original);
      assert.equal(existsSync(path.join(directory, 'pdf')), false);
      assert.equal(existsSync(path.join(directory, 'screenshots')), false);
    }
  } finally { rmSync(directory, { recursive: true }); }
});
