import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { alphabet, pages } from '../src/content/alphabet-practice.mjs';
import { GLYPHS, GUIDES, glyphPaths } from '../src/components/manuscript-glyphs.mjs';
import { manuscriptRow, alphabetPracticePage, escapeText } from '../src/components/alphabet-practice.mjs';

const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lower = upper.toLowerCase();
const sequence = [...upper].flatMap((letter, index) => [letter, lower[index]]);

test('covers A-Z/a-z exactly once, in separate uppercase/lowercase rows', () => {
  assert.deepEqual(alphabet.map(entry => entry.upper).join(''), upper);
  assert.deepEqual(alphabet.map(entry => entry.lower).join(''), lower);
  assert.deepEqual(pages.flatMap(page => page.meta.letters), sequence);
  assert.equal(pages.length, 13);
  assert.ok(pages.every(page => page.meta.letters.length === 4));
  assert.deepEqual(Object.keys(GLYPHS).sort(), [...upper, ...lower].sort());
});

test('every row uses one solid model and five identical dotted-stroke copies, plus a blank try cell', () => {
  for (const letter of sequence) {
    const html = manuscriptRow(letter);
    assert.equal((html.match(/class="model-mark"/g) ?? []).length, 1, letter);
    assert.equal((html.match(/class="trace-mark"/g) ?? []).length, 5, letter);
    assert.equal((html.match(/class="try-cell"/g) ?? []).length, 1, letter);
    for (const d of glyphPaths(letter)) {
      assert.equal(html.split(`d="${d}"`).length - 1, 6, `${letter}: ${d}`);
    }
    assert.match(html, /viewBox="0 0 720 148"/);
  }
});

test('has shared large handwriting guides and extra descender room only where needed', () => {
  assert.deepEqual(GUIDES, { cap: 18, middle: 54, baseline: 90, descender: 116 });
  for (const letter of sequence) {
    assert.equal(manuscriptRow(letter).includes('class="descender-guide"'), 'gjpqy'.includes(letter));
  }
});

test('all existing illustration files exist and cue names match their letters', () => {
  for (const entry of alphabet) {
    assert.equal(entry.word[0], entry.upper);
    assert.ok(existsSync(new URL(`../${entry.illustrationPath}`, import.meta.url)), entry.illustrationPath);
    assert.match(entry.illustrationPath, /^design-source\/animals\/locked-poses\/[a-z0-9-]+\.svg$/);
    assert.match(entry.approvalStatus, /awaits owner review/);
  }
});

test('renders two cue illustrations without combining upper and lower case in one row', () => {
  for (const page of pages) {
    const html = page.render();
    assert.deepEqual([...html.matchAll(/data-letter="([A-Za-z])"/g)].map(match => match[1]), page.meta.letters);
    assert.equal((html.match(/class="ap-art"/g) ?? []).length, 2);
    assert.equal((html.match(/<h1>My alphabet practice<\/h1>/g) ?? []).length, 1);
  }
});

test('rejects malformed letter/page inputs rather than leaving missing trace targets', () => {
  for (const bad of ['', 0, false, null, undefined, 'AA', '1', '<', 'toString']) {
    assert.throws(() => glyphPaths(bad), TypeError);
    assert.throws(() => manuscriptRow(bad), TypeError);
  }
  for (const pageNumber of [0, -1, '', false, null, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => alphabetPracticePage({ pageNumber, letters: alphabet.slice(0, 2) }), TypeError);
  }
  for (const letters of [[], [alphabet[0]], alphabet.slice(0, 3), null, [{ ...alphabet[0], lower: 'b' }, alphabet[1]]]) {
    assert.throws(() => alphabetPracticePage({ pageNumber: 1, letters }), TypeError);
  }
});

test('escapes editable cue text and image labels in the actual downstream HTML', () => {
  assert.equal(escapeText('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  const entry = { ...alphabet[0], word: 'Alligator & <friends>', illustrationLabel: '" onload="alert(1)' };
  const html = alphabetPracticePage({ pageNumber: 1, letters: [entry, alphabet[1]] });
  assert.match(html, /Alligator &amp; &lt;friends&gt;/);
  assert.match(html, /aria-label="&quot; onload=&quot;alert\(1\)"/);
  assert.doesNotMatch(html, /<friends>|aria-label="" onload=/);
});
