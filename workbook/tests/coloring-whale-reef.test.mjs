import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readRecipe, resolveRecipe, WORKBOOK_ROOT as root } from '../src/recipes.mjs';
import { whaleReef, inlineWhaleReef } from '../src/components/coloring-scene.mjs';
import { inlineSvgFile } from '../src/content/asset-inline.mjs';
import { withPrintBrowser } from '../scripts/print-artifacts.mjs';

const input = { schemaVersion: 1, template: 'coloring-pages-v1', pages: ['whale-reef'] };
const copy = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(value).digest('hex');
// Opaque Potrace separates compound contours and makes post-close moves absolute.
// Compare the actual original geometry, not path formatting or just an image hash.
function contours(svg) {
  const tokens = [...svg.matchAll(/<path[^>]* d="([^"]*)"/g)]
    .flatMap(m => m[1].match(/[a-zA-Z]|[-+]?\d+(?:\.\d+)?/g));
  let x = 0, y = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'M') { x = Number(tokens[i + 1]); y = Number(tokens[i + 2]); }
    else if (tokens[i] === 'm') {
      assert.equal(tokens[i - 1], 'z');
      x += Number(tokens[i + 1]); y += Number(tokens[i + 2]);
      tokens[i] = 'M'; tokens[i + 1] = String(x); tokens[i + 2] = String(y);
    }
  }
  assert.ok(tokens.length);
  return tokens;
}

test('reef recipe locks both assets and preserves mixed/repeated/boundary selection order', () => {
  const first = resolveRecipe(readRecipe(path.join(root, 'recipes/coloring-whale-reef.json')));
  assert.deepEqual(first.book.assets, [whaleReef.scene, whaleReef.character]);
  assert.deepEqual(first.recipe.lock.artwork.map(a => a.asset), ['whale-reef', 'whale-coloring-opaque']);
  assert.deepEqual(resolveRecipe(copy(first.recipe)).recipe, first.recipe);
  for (const pages of [['whale-reef', 'unicorn-meadow', 'turtle-pond', 'bunny-garden', 'whale-reef'], Array(24).fill('whale-reef')]) {
    const { book, recipe } = resolveRecipe({ ...input, pages });
    assert.deepEqual(book.pages.map(p => p.meta.subject), pages);
    assert.equal(book.assets.length, pages.includes('bunny-garden') ? 8 : 2);
    assert.deepEqual(resolveRecipe(copy(recipe)).recipe, recipe);
  }
  for (const mutate of [r => r.lock.artwork[0].sha256 = '0'.repeat(64),
    r => r.lock.artwork[1].sha256 = '0'.repeat(64), r => r.lock.artwork.pop(),
    r => r.lock.artwork.push(r.lock.artwork[0])]) {
    const altered = copy(first.recipe); mutate(altered);
    assert.throws(() => resolveRecipe(altered), /Recipe lock: selected artwork/);
  }
  for (const pages of [[], Array(25).fill('whale-reef'), ['whale-reef', false], ['whale-reef', 0],
    ['whale-reef', ''], ['whale-reef', '../characters/whale']])
    assert.throws(() => resolveRecipe({ ...input, pages }), TypeError);
  for (const extra of [{ companions: ['pippa'] }, { svg: '<script/>' }])
    assert.throws(() => resolveRecipe({ ...input, ...extra }), TypeError);
});

test('reef keeps editable layer order, source identity, receipt hashes and self-contained publication', () => {
  const svg = inlineWhaleReef(root);
  assert.ok(!/<image\b/.test(svg));
  assert.ok(!/https?:\/\//.test(svg.replace(/xmlns[^=]*="[^"]*"/g, '')));
  assert.match(svg, /id="coloring-whale"/);
  assert.match(svg, /fill="#ffffff"/i);
  const positions = ['reef-water', 'reef-seabed', 'reef-whale', 'reef-coral', 'reef-starfish']
    .map(id => svg.indexOf('id="' + id + '"'));
  assert.ok(positions.every(p => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  for (const [file, expected] of [
    ['design-source/animals/locked-poses/whale-01-swimming.png', 'e5834ec2e58c6a07919a6485986c444b7f0b866a8bf5d2bc017ef627281609b0'],
    ['design-source/animals/locked-poses/whale-01-swimming.svg', '302babb8d7f8ca139f5dc28e05f25cdbdbed6e455c83e5c9e3209b02ba88d880'],
    ['design-source/coloring/scenes/bunny-garden.svg', 'e3a53644b1d9c0a191e834a58c795cd8ef305a7a78bd9411abe25f15b233239f'],
    ['design-source/coloring/scenes/turtle-pond.svg', '023cc1fdcb377ff2252fbaf8ef0573616360d103176da9780a22e703a6f57312'],
    ['design-source/coloring/scenes/unicorn-meadow.svg', 'eda27e01ccfccc4c05f2b3078d16d97d379193f968cf0f6fa1ae0a3b6e2f7f79']])
    assert.equal(hash(readFileSync(path.join(root, file))), expected, file);
  const receipt = JSON.parse(readFileSync(path.join(root, 'design-source/coloring/characters/whale-coloring-opaque.recipe.json')));
  assert.equal(receipt.inputSha256, hash(readFileSync(path.join(root, receipt.input))));
  assert.equal(receipt.outputSha256, hash(readFileSync(path.join(root, whaleReef.character))));
  assert.equal(receipt.approval, 'draft / owner visual approval required');
  const canonical = inlineSvgFile(path.join(root, 'design-source/animals/locked-poses/whale-01-swimming.svg'));
  const character = inlineSvgFile(path.join(root, whaleReef.character));
  assert.deepEqual(contours(character), contours(canonical));
  const changed = character.replace(/M(\d+)/, (_, n) => 'M' + (Number(n) + 1));
  assert.throws(() => assert.deepEqual(contours(changed), contours(canonical)), assert.AssertionError);
});

test('reef fixed slot accepts artist origins and rejects missing/duplicate/foreign/invalid references', context => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-reef-slot-'));
  context.after(() => rmSync(temp, { recursive: true }));
  mkdirSync(path.dirname(path.join(temp, whaleReef.scene)), { recursive: true });
  mkdirSync(path.dirname(path.join(temp, whaleReef.character)), { recursive: true });
  writeFileSync(path.join(temp, whaleReef.character), readFileSync(path.join(root, whaleReef.character)));
  const source = readFileSync(path.join(root, whaleReef.scene), 'utf8');
  const slot = source.match(/<image\b[^>]*id="whale-reference"[^>]*\/>/)[0];
  for (const x of ['70', '0', '-1']) {
    writeFileSync(path.join(temp, whaleReef.scene), source.replace('x="70"', 'x="' + x + '"'));
    assert.ok(inlineWhaleReef(temp).includes('id="coloring-whale" x="' + x + '"'));
  }
  for (const bad of [source.replace(slot, ''), source.replace(slot, slot + slot),
    source.replace('../characters/whale-coloring-opaque.svg', '../characters/other.svg'),
    source.replace('width="560"', 'width="0"'), source.replace('height="407"', 'height="-1"'),
    source.replace('x="70"', 'x="NaN"'), source.replace('y="151"', ''),
    source.replace('</svg>', '<image href="https://example.test/extra.svg"/></svg>')]) {
    writeFileSync(path.join(temp, whaleReef.scene), bad);
    assert.throws(() => inlineWhaleReef(temp), assert.AssertionError);
  }
});

test('actual reef source/publication parity rejects shifted/resized art; whale interiors cover backdrop', async () => {
  const canonical = inlineSvgFile(path.join(root, 'design-source/animals/locked-poses/whale-01-swimming.svg'));
  const character = inlineSvgFile(path.join(root, whaleReef.character));
  const linked = inlineSvgFile(path.join(root, whaleReef.scene)).replace(
    'href="../characters/whale-coloring-opaque.svg"',
    'href="data:image/svg+xml;base64,' + Buffer.from(character).toString('base64') + '"');
  const published = inlineWhaleReef(root);
  // In addition to raster parity, source slot and published placement must be exact.
  assert.match(published, /id="coloring-whale" x="70" y="151" width="560" height="407"/);
  const normalize = (s, w, h) => s.replace(/width="[^"]*"/, 'width="' + w + '"').replace(/height="[^"]*"/, 'height="' + h + '"')
    .replace(/viewBox="[^"]*"/, 'viewBox="0 0 ' + w + ' ' + h + '"');
  await withPrintBrowser(async browser => {
    const page = await browser.newPage();
    const result = await page.evaluate(async data => {
      async function pixels(svg, w, h, white) {
        const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(svg); await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (white) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(image, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h).data;
      }
      function compare(a, b) {
        let total = 0, nonEdgeDifferences = 0, maxGrayDelta = 0, binaryDifferencePixels = 0;
        for (let i = 0; i < a.length; i += 4) {
          const d = Math.abs(a[i] - b[i]); total += d; maxGrayDelta = Math.max(maxGrayDelta, d);
          if ((a[i] < 128) !== (b[i] < 128)) {
            binaryDifferencePixels++;
            if (a[i] === 0 || a[i] === 255 || b[i] === 0 || b[i] === 255) nonEdgeDifferences++;
          }
        }
        return { meanGrayDelta: total / (a.length / 4), maxGrayDelta, binaryDifferencePixels, nonEdgeDifferences };
      }
      const scenes = await Promise.all(data.scene.map(s => pixels(s, 700, 820, true)));
      const white = await Promise.all(data.character.map(s => pixels(s, 1024, 1024, true)));
      const bare = await Promise.all(data.character.map(s => pixels(s, 1024, 1024, false)));
      const backed = await pixels(data.backed, 1024, 1024, false);
      const at = (p, x, y) => [...p.slice((y * 1024 + x) * 4, (y * 1024 + x) * 4 + 4)];
      return { scene: scenes.slice(1).map(s => compare(scenes[0], s)), character: compare(...white),
        samples: [[450, 480], [600, 520]].map(([x, y]) => ({ before: at(bare[0], x, y), after: at(bare[1], x, y), backed: at(backed, x, y) })),
        outside: at(bare[1], 0, 0), outsideBacked: at(backed, 0, 0) };
    }, { scene: [linked, published, published.replace('id="coloring-whale" x="70"', 'id="coloring-whale" x="71"'),
      published.replace('width="560" height="407"', 'width="561" height="407"')].map(s => normalize(s, 700, 820)),
    character: [canonical, character].map(s => normalize(s, 1024, 1024)),
    backed: normalize(character, 1024, 1024).replace(/(<svg[^>]*>)/, '$1<rect width="1024" height="1024" fill="black"/>') });
    console.log('Whale source/publication/occlusion:', JSON.stringify(result));
    const parity = m => {
      assert.equal(m.nonEdgeDifferences, 0, 'Printed silhouette drift.');
      // Measured actual linked/inline edge delta: zero threshold crossings,
      // max 2 gray levels, mean .00002265. Do not reuse another scene's bound.
      assert.equal(m.binaryDifferencePixels, 0);
      assert.ok(m.maxGrayDelta <= 2 && m.meanGrayDelta < .00003, 'Scene antialiasing exceeded edge-only allowance.');
    };
    parity(result.scene[0]);
    for (const variant of result.scene.slice(1)) assert.throws(() => parity(variant), /Printed silhouette drift/);
    assert.equal(result.character.nonEdgeDifferences, 0);
    assert.ok(result.character.meanGrayDelta < .008 && result.character.maxGrayDelta <= 28
      && result.character.binaryDifferencePixels <= 24);
    for (const sample of result.samples) {
      assert.equal(sample.before[3], 0);
      assert.deepEqual(sample.after, [255, 255, 255, 255]);
      assert.deepEqual(sample.backed, sample.after);
    }
    assert.equal(result.outside[3], 0);
    assert.deepEqual(result.outsideBacked, [0, 0, 0, 255]);
  });
});
