import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { animals, createCountingBook, DEFAULT_SEED, describeGroup, isMonotonic, validateSeed } from '../src/content/counting-practice.mjs';
import { countAndTrace, traceAnswer } from '../src/components/count-and-trace.mjs';
import { numberGlyph } from '../src/components/number-glyphs.mjs';

const metadata = seed => createCountingBook(seed).pages.map(page => page.meta);
const exampleSvg = '<svg viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>';

test('all quantities 1-20 covered with mixed orders and distinct animals per sheet', () => {
  for (const seed of [0, 1, DEFAULT_SEED, 0xffffffff, ...Array.from({ length: 100 }, (_, i) => i + 2)]) {
    const book = createCountingBook(seed);
    assert.equal(book.pages.length, 8);
    const counts = book.pages.flatMap(page => page.meta.groups.map(group => group.count));
    assert.equal(counts.length, 24);
    assert.deepEqual([...new Set(counts)].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
    for (const { meta } of book.pages) {
      assert.equal(meta.groups.length, 3);
      assert.equal(isMonotonic(meta.groups.map(group => group.count)), false);
      assert.equal(new Set(meta.groups.map(group => group.animal)).size, 3);
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
  const quantities = createCountingBook(2).pages[6].meta.groups.map(group => group.count);
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
