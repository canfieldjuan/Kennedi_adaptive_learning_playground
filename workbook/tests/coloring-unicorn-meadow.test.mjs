import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readRecipe, resolveRecipe, WORKBOOK_ROOT as root } from '../src/recipes.mjs';
import { unicornMeadow, inlineUnicornMeadow } from '../src/components/coloring-scene.mjs';
import { inlineSvgFile } from '../src/content/asset-inline.mjs';
import { withPrintBrowser } from '../scripts/print-artifacts.mjs';

const input = { schemaVersion: 1, template: 'coloring-pages-v1', pages: ['unicorn-meadow'] };
const copy = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(value).digest('hex');

// Potrace --opaque separates compound contours and changes post-close relative
// moves to absolute moves. Normalize only that representation change; require
// every curve/line/close command to stay identical. Not a general SVG parser.
function contourTokens(svg) {
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
  assert.ok(tokens.length > 0);
  return tokens;
}

test('meadow locks both fixed assets and replays ordered mixed/repeated selections', () => {
  const first = resolveRecipe(readRecipe(path.join(root, 'recipes/coloring-unicorn-meadow.json')));
  assert.deepEqual(first.book.assets, [unicornMeadow.scene, unicornMeadow.character]);
  assert.deepEqual(first.recipe.lock.artwork.map(a => a.asset), ['unicorn-meadow', 'unicorn-coloring-opaque']);
  assert.deepEqual(resolveRecipe(copy(first.recipe)).recipe, first.recipe);
  for (const pages of [['unicorn-meadow', 'turtle-pond', 'bunny-garden', 'unicorn-meadow'], Array(24).fill('unicorn-meadow')]) {
    const { book, recipe } = resolveRecipe({ ...input, pages });
    assert.deepEqual(book.pages.map(p => p.meta.subject), pages);
    assert.equal(book.assets.length, pages.includes('bunny-garden') ? 6 : 2);
    assert.deepEqual(resolveRecipe(copy(recipe)).recipe, recipe);
  }
  for (const mutate of [r => r.lock.artwork[0].sha256 = '0'.repeat(64),
    r => r.lock.artwork[1].sha256 = '0'.repeat(64), r => r.lock.artwork.pop(),
    r => r.lock.artwork.push(r.lock.artwork[0])]) {
    const altered = copy(first.recipe); mutate(altered);
    assert.throws(() => resolveRecipe(altered), /Recipe lock: selected artwork/);
  }
  for (const pages of [[], Array(25).fill('unicorn-meadow'), ['unicorn-meadow', false],
    ['unicorn-meadow', 0], ['unicorn-meadow', ''], ['unicorn-meadow', '../characters/unicorn']])
    assert.throws(() => resolveRecipe({ ...input, pages }), TypeError);
  assert.throws(() => resolveRecipe({ ...input, companions: ['pippa'] }), TypeError);
});

test('meadow preserves editable layers, self-contained vectors and canonical sources', () => {
  const svg = inlineUnicornMeadow(root);
  assert.ok(!/<image\b/.test(svg));
  assert.ok(!/https?:\/\//.test(svg.replace(/xmlns[^=]*="[^"]*"/g, '')));
  assert.match(svg, /id="coloring-unicorn"/);
  assert.match(svg, /fill="#ffffff"/i);
  const layers = ['meadow-rainbow', 'meadow-clouds', 'meadow-hills', 'meadow-ground', 'meadow-unicorn', 'meadow-flowers'];
  const positions = layers.map(id => svg.indexOf(`id="${id}"`));
  assert.ok(positions.every(p => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  for (const [file, expected] of [
    ['design-source/animals/locked-poses/unicorn-01-standing.png', '15b80cfef3eaffc2156290d53e2d9b5b6a76859f74a2e01bebae16a24ad57256'],
    ['design-source/animals/locked-poses/unicorn-01-standing.svg', 'b3423310defd702e3fcd79e663d526d410bb41d4b7a187b3683558ec1b82d0ea'],
    ['design-source/coloring/scenes/bunny-garden.svg', 'e3a53644b1d9c0a191e834a58c795cd8ef305a7a78bd9411abe25f15b233239f'],
    ['design-source/coloring/scenes/turtle-pond.svg', '023cc1fdcb377ff2252fbaf8ef0573616360d103176da9780a22e703a6f57312']])
    assert.equal(hash(readFileSync(path.join(root, file))), expected, file);
  const receipt = JSON.parse(readFileSync(path.join(root, 'design-source/coloring/characters/unicorn-coloring-opaque.recipe.json')));
  assert.equal(receipt.outputSha256, hash(readFileSync(path.join(root, unicornMeadow.character))));
  assert.equal(receipt.inputSha256, hash(readFileSync(path.join(root, receipt.input))));
});

test('unicorn fixed slot accepts finite artist coordinates and rejects malformed/foreign references', context => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-meadow-slot-'));
  context.after(() => rmSync(temp, { recursive: true }));
  mkdirSync(path.dirname(path.join(temp, unicornMeadow.scene)), { recursive: true });
  mkdirSync(path.dirname(path.join(temp, unicornMeadow.character)), { recursive: true });
  writeFileSync(path.join(temp, unicornMeadow.character), readFileSync(path.join(root, unicornMeadow.character)));
  const source = readFileSync(path.join(root, unicornMeadow.scene), 'utf8');
  const slot = source.match(/<image\b[^>]*id="unicorn-reference"[^>]*\/>/)[0];
  for (const x of ['155', '0', '-1']) {
    writeFileSync(path.join(temp, unicornMeadow.scene), source.replace('x="155"', `x="${x}"`));
    assert.match(inlineUnicornMeadow(temp), new RegExp(`id="coloring-unicorn" x="${x}"`));
  }
  for (const bad of [source.replace(slot, ''), source.replace(slot, slot + slot),
    source.replace('../characters/unicorn-coloring-opaque.svg', '../characters/other.svg'),
    source.replace('width="430"', 'width="0"'), source.replace('height="540"', 'height="-1"'),
    source.replace('x="155"', 'x="NaN"'), source.replace('y="212"', ''),
    source.replace('</svg>', '<image href="https://example.test/extra.svg"/></svg>')]) {
    writeFileSync(path.join(temp, unicornMeadow.scene), bad);
    assert.throws(() => inlineUnicornMeadow(temp), assert.AssertionError);
  }
});

test('unicorn publication preserves silhouette and rejects pose drift; opaque interiors hide the hills', async () => {
  const character = inlineSvgFile(path.join(root, unicornMeadow.character));
  const canonical = inlineSvgFile(path.join(root, 'design-source/animals/locked-poses/unicorn-01-standing.svg'));
  assert.deepEqual(contourTokens(character), contourTokens(canonical));
  assert.throws(() => assert.deepEqual(contourTokens(character.replace('M3106 9831', 'M3107 9831')), contourTokens(canonical)), assert.AssertionError);
  const source = inlineSvgFile(path.join(root, unicornMeadow.scene)).replace(
    'href="../characters/unicorn-coloring-opaque.svg"', `href="data:image/svg+xml;base64,${Buffer.from(character).toString('base64')}"`);
  const normalize = (svg, w, h) => svg.replace(/width="[^"]*"/, `width="${w}"`).replace(/height="[^"]*"/, `height="${h}"`)
    .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${w} ${h}"`);
  const published = inlineUnicornMeadow(root);
  await withPrintBrowser(async browser => {
    const page = await browser.newPage();
    const result = await page.evaluate(async data => {
      async function pixels(svg, w, h, white) {
        const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(svg); await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d'); if (white) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(image, 0, 0, w, h); return ctx.getImageData(0, 0, w, h).data;
      }
      const compare = (a, b) => {
        let binaryDifferencePixels = 0, total = 0, maxGrayDelta = 0;
        const differences = [];
        for (let i = 0; i < a.length; i += 4) {
          binaryDifferencePixels += (a[i] < 128) !== (b[i] < 128);
          const d = Math.abs(a[i] - b[i]); total += d; maxGrayDelta = Math.max(maxGrayDelta, d);
          if ((a[i] < 128) !== (b[i] < 128)) differences.push({ pixel: i / 4, before: a[i], after: b[i] });
        }
        return { binaryDifferencePixels, meanGrayDelta: total / (a.length / 4), maxGrayDelta,
          nonEdgeDifferences: differences.filter(p => p.before === 0 || p.before === 255 || p.after === 0 || p.after === 255).length,
          firstDifferences: differences.slice(0, 5) };
      };
      const scene = await Promise.all(data.scene.map(svg => pixels(svg, 700, 820, true)));
      const white = await Promise.all(data.character.map(svg => pixels(svg, 1024, 1024, true)));
      const bare = await Promise.all(data.character.map(svg => pixels(svg, 1024, 1024, false)));
      const at = (p, x, y) => [...p.slice((y * 1024 + x) * 4, (y * 1024 + x) * 4 + 4)];
      // An actual black backdrop is covered by the white body, not a white rectangle.
      const backed = await pixels(data.backed, 1024, 1024, false);
      return { scene: scene.slice(1).map(b => compare(scene[0], b)), character: compare(...white),
        samples: [[300, 420], [500, 650]].map(([x, y]) => ({ before: at(bare[0], x, y), after: at(bare[1], x, y), backed: at(backed, x, y) })),
        outside: at(bare[1], 0, 0), outsideBacked: at(backed, 0, 0) };
    }, { scene: [source, published, published.replace('id="coloring-unicorn" x="155"', 'id="coloring-unicorn" x="156"'),
      published.replace('width="430" height="540"', 'width="431" height="540"')].map(s => normalize(s, 700, 820)),
    character: [canonical, character].map(s => normalize(s, 1024, 1024)),
    backed: normalize(character, 1024, 1024).replace(/(<svg[^>]*>)/, '$1<rect width="1024" height="1024" fill="black"/>') });
    console.log('Unicorn appearance, occlusion and scene parity:', JSON.stringify(result));
    const assertParity = m => {
      assert.equal(m.nonEdgeDifferences, 0, 'Printed silhouette drift.');
      // Measured linked/inline Chrome edge-only delta: 1 threshold crossing,
      // 37 gray levels max, .000277 mean. Geometry and coordinates stay exact;
      // bunny/pond's separate existing bounds are not changed.
      assert.ok(m.binaryDifferencePixels <= 1 && m.maxGrayDelta <= 37 && m.meanGrayDelta < .0003, JSON.stringify(m));
    };
    assertParity(result.scene[0]);
    for (const variant of result.scene.slice(1)) assert.throws(() => assertParity(variant), /Printed silhouette drift/);
    assert.equal(result.character.nonEdgeDifferences, 0);
    assert.ok(result.character.meanGrayDelta < .05);
    for (const sample of result.samples) {
      assert.equal(sample.before[3], 0);
      assert.deepEqual(sample.after, [255, 255, 255, 255]);
      assert.deepEqual(sample.backed, sample.after);
    }
    assert.equal(result.outside[3], 0);
    assert.deepEqual(result.outsideBacked, [0, 0, 0, 255]);
  });
});
