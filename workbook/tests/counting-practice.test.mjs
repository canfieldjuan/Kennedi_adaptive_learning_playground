import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { animals, createCountingBook, DEFAULT_SEED, describeGroup, isMonotonic, validateMode, validateSeed } from '../src/content/counting-practice.mjs';
import { countAndTrace, traceAnswer } from '../src/components/count-and-trace.mjs';
import { numberGlyph } from '../src/components/number-glyphs.mjs';

const metadata = seed => createCountingBook(seed).pages.map(page => page.meta);
const exampleSvg = '<svg viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>';

test('both modes cover quantities 1-20 with mixed order and distinct animals per sheet', () => {
  for (const seed of [0, 1, DEFAULT_SEED, 0xffffffff, ...Array.from({ length: 100 }, (_, i) => i + 2)]) {
    for (const mode of ['choice', 'guided']) {
      const book = createCountingBook(seed, mode);
      const perPage = mode === 'choice' ? 2 : 3;
      assert.equal(book.pages.length, 24 / perPage);
      const counts = book.pages.flatMap(page => page.meta.groups.map(group => group.count));
      assert.equal(counts.length, 24);
      assert.equal(isMonotonic(counts), false);
      assert.deepEqual([...new Set(counts)].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
      for (const { meta } of book.pages) {
        assert.equal(meta.groups.length, perPage);
        if (mode === 'guided') assert.equal(isMonotonic(meta.groups.map(group => group.count)), false);
        assert.equal(new Set(meta.groups.map(group => group.animal)).size, perPage);
      }
    }
  }
});
test('seed is deterministic and zero is not replaced by a default', () => {
  assert.deepEqual(metadata(DEFAULT_SEED), metadata(DEFAULT_SEED));
  assert.notDeepEqual(metadata(0), metadata(DEFAULT_SEED));
  assert.notDeepEqual(metadata(1), metadata(2));
  assert.equal(validateSeed(0), 0);
  assert.equal(validateSeed(0xffffffff), 0xffffffff);
  for (const seed of [-1, 4294967296, 1.5, '', '1', false, null, NaN, Infinity]) {
    assert.throws(() => validateSeed(seed), TypeError);
    assert.throws(() => createCountingBook(seed), TypeError);
  }
});
test('regression: repeated maximum quantities do not form a descending page', () => {
  const quantities = createCountingBook(2, 'guided').pages[6].meta.groups.map(group => group.count);
  assert.deepEqual(quantities, [12, 3, 12]);
  assert.equal(isMonotonic(quantities), false);
});
test('regression: contact captions use the singular name for one animal', () => {
  const fox = animals.find(entry => entry.animal === 'fox');
  assert.equal(describeGroup({ count: 1, ...fox }), '1 fox');
  assert.equal(describeGroup({ count: 5, ...fox }), '5 foxes');
});
test('existing illustration sources exist and every animal is used', () => {
  assert.equal(new Set(animals.map(entry => entry.animal)).size, 20);
  const book = createCountingBook();
  assert.equal(book.assets.length, 20);
  for (const asset of book.assets) assert.ok(existsSync(fileURLToPath(new URL(`../${asset}`, import.meta.url))));
});
test('each valid count produces exactly that many pictures and one dotted correct answer', () => {
  for (let count = 1; count <= 20; count++) {
    const html = countAndTrace({ count, animal: 'turtle', plural: 'turtles', svg: exampleSvg });
    assert.equal((html.match(/class="ct-picture"/g) ?? []).length, count);
    assert.equal((html.match(/class="ct-trace"/g) ?? []).length, 1);
    assert.ok(html.includes(`data-answer="${count}"`));
    assert.ok(html.includes(numberGlyph(count)));
    assert.ok(html.includes('stroke-dasharray="0.01 5.1"'));
    assert.ok(html.includes(count === 1 ? 'Count the turtle.' : 'Count the turtles.'));
  }
});
test('bad quantities and missing/mixed group content are rejected before output', () => {
  for (const count of [0, 21, -1, 1.5, '', '3', false, null, undefined, NaN, Infinity]) {
    assert.throws(() => traceAnswer(count), TypeError);
    assert.throws(() => countAndTrace({ count, animal: 'dog', plural: 'dogs', svg: exampleSvg }), TypeError);
  }
  for (const partial of [{}, { animal: '' }, { plural: null }, { svg: false }]) {
    assert.throws(() => countAndTrace({ count: 3, animal: 'dog', plural: 'dogs', svg: exampleSvg, ...partial,
      ...(Object.keys(partial).length ? {} : { svg: undefined }) }), TypeError);
  }
});
test('labels are escaped, while trusted repository SVG is kept editable', () => {
  const html = countAndTrace({ count: 1, animal: '<dog & "pal">', plural: 'dogs', svg: exampleSvg });
  assert.ok(html.includes('&lt;dog &amp; &quot;pal&quot;&gt;'));
  assert.equal(html.includes('data-animal="<dog'), false);
  assert.ok(html.includes(exampleSvg));
});
test('choice mode has three unique in-range numbers, one correct, with balanced shuffled positions', () => {
  for (const seed of [0, 1, 2, DEFAULT_SEED, 0xffffffff, ...Array.from({ length: 100 }, (_, i) => i + 3)]) {
    const groups = createCountingBook(seed).pages.flatMap(page => page.meta.groups);
    const positions = [0, 0, 0];
    for (const group of groups) {
      assert.equal(group.choices.length, 3);
      assert.equal(new Set(group.choices).size, 3);
      assert.ok(group.choices.every(n => Number.isInteger(n) && n >= 1 && n <= 20));
      assert.equal(group.choices.filter(n => n === group.count).length, 1);
      positions[group.choices.indexOf(group.count)]++;
    }
    assert.deepEqual(positions, [8, 8, 8]);
    assert.notEqual(new Set(groups.map(group => group.choices.indexOf(group.count))).size, 1);
    const guidedCounts = createCountingBook(seed, 'guided').pages.flatMap(page => page.meta.groups.map(g => g.count));
    assert.deepEqual(groups.map(g => g.count), guidedCounts);
  }
});
test('choice cards are equally dotted with no visible correctness marker', () => {
  for (const count of [1, 10, 20]) {
    const choices = count === 1 ? [2, 1, 3] : count === 20 ? [18, 19, 20] : [10, 9, 11];
    const html = countAndTrace({ count, animal: 'dog', plural: 'dogs', svg: exampleSvg, choices });
    assert.equal((html.match(/class="ct-choice"/g) ?? []).length, 3);
    assert.equal((html.match(/class="ct-trace"/g) ?? []).length, 3);
    assert.equal((html.match(/class="ct-picture"/g) ?? []).length, count);
    assert.deepEqual([...html.matchAll(/data-answer="(\d+)"/g)].map(m => Number(m[1])), choices);
    assert.equal(/class="[^"]*(?:correct|selected|wrong)|\bLOOK\b/.test(html), false);
  }
});
test('invalid/mixed/sparse choices and invalid modes fail, while range edges pass', () => {
  const group = { count: 1, animal: 'dog', plural: 'dogs', svg: exampleSvg };
  for (const choices of [null, false, '', [], [1], [1, 2], [1, 2, 3, 4], [1, 1, 2], [2, 3, 4],
    [1, 0, 2], [1, 2, 21], [1, 2, false], [1, 2, '3'], [1, 2, 3.5], [1, , 2]]) {
    assert.throws(() => countAndTrace({ ...group, choices }), TypeError);
  }
  assert.doesNotThrow(() => countAndTrace({ ...group, choices: [1, 2, 20] }));
  assert.doesNotThrow(() => countAndTrace({ ...group, count: 20, choices: [1, 19, 20] }));
  for (const mode of ['', null, false, 0, 'quiz']) {
    assert.throws(() => validateMode(mode), TypeError);
    assert.throws(() => createCountingBook(0, mode), TypeError);
  }
  assert.equal(validateMode('choice'), 'choice');
  assert.equal(validateMode('guided'), 'guided');
  assert.ok(createCountingBook(0, 'guided').pages.every(p => p.meta.groups.every(g => g.choices === undefined)));
});
