import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readRecipe, resolveRecipe, WORKBOOK_ROOT as root } from '../src/recipes.mjs';
import { turtlePond, inlineTurtlePond } from '../src/components/coloring-scene.mjs';
import { inlineSvgFile } from '../src/content/asset-inline.mjs';
import { renderDocument } from '../src/render.mjs';
import { withPrintBrowser } from '../scripts/print-artifacts.mjs';

const input = { schemaVersion: 1, template: 'coloring-pages-v1', pages: ['turtle-pond'] };
const copy = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(value).digest('hex');
test('turtle pond selects and locks both fixed assets; mixed/repeated scenes replay in order', () => {
  const first = resolveRecipe(readRecipe(path.join(root, 'recipes/coloring-turtle-pond.json')));
  assert.deepEqual(first.book.assets, [turtlePond.scene, turtlePond.character]);
  assert.deepEqual(first.recipe.lock.artwork.map(a => a.asset), ['turtle-pond', 'turtle-coloring-opaque']);
  assert.deepEqual(resolveRecipe(copy(first.recipe)).recipe, first.recipe);
  for (const pages of [['turtle-pond', 'bunny-garden', 'turtle-pond'], Array(24).fill('turtle-pond')]) {
    const { book, recipe } = resolveRecipe({ ...input, pages });
    assert.deepEqual(book.pages.map(p => p.meta.subject), pages);
    assert.equal(book.assets.length, pages.includes('bunny-garden') ? 4 : 2);
    assert.deepEqual(resolveRecipe(copy(recipe)).recipe, recipe);
  }
  for (const mutate of [r => r.lock.artwork[0].sha256 = '0'.repeat(64),
    r => r.lock.artwork[1].sha256 = '0'.repeat(64), r => r.lock.artwork.pop(),
    r => r.lock.artwork.push(r.lock.artwork[0])]) {
    const altered = copy(first.recipe); mutate(altered);
    assert.throws(() => resolveRecipe(altered), /Recipe lock: selected artwork/);
  }
  for (const recipe of [{ ...input, pages: ['turtle-pond', false] },
    { ...input, pages: ['turtle-pond', '../characters/kennedi'] },
    { ...input, pages: Array(25).fill('turtle-pond') }, { ...input, pages: [] },
    { ...input, companions: ['pippa'] }, { ...input, svg: '<script/>' }])
    assert.throws(() => resolveRecipe(recipe), TypeError);
});

test('pond publication preserves editable layer order and consumes vector paths, not image links', () => {
  const svg = inlineTurtlePond(root);
  assert.ok(!/<image\b/.test(svg));
  assert.ok(!/https?:\/\//.test(svg.replace(/xmlns[^=]*="[^"]*"/g, '')));
  assert.match(svg, /id="coloring-turtle"/); assert.match(svg, /fill="#ffffff"/i);
  const layers = ['pond-background', 'pond-water', 'pond-reeds', 'pond-bank', 'pond-turtle', 'pond-dragonfly', 'pond-lilies'];
  const positions = layers.map(id => svg.indexOf(`id="${id}"`));
  assert.ok(positions.every(p => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('fixed slot accepts source coordinates and rejects malformed/missing/duplicate/foreign references', context => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'kennedi-pond-slot-'));
  context.after(() => rmSync(temp, { recursive: true }));
  mkdirSync(path.dirname(path.join(temp, turtlePond.scene)), { recursive: true });
  mkdirSync(path.dirname(path.join(temp, turtlePond.character)), { recursive: true });
  writeFileSync(path.join(temp, turtlePond.character), readFileSync(path.join(root, turtlePond.character)));
  const source = readFileSync(path.join(root, turtlePond.scene), 'utf8');
  const slot = source.match(/<image\b[^>]*id="turtle-reference"[^>]*\/>/)[0];
  for (const variant of [source, source.replace('x="125"', 'x="0"'), source.replace('x="125"', 'x="-1"')]) {
    writeFileSync(path.join(temp, turtlePond.scene), variant);
    const svg = inlineTurtlePond(temp);
    assert.match(svg, /id="coloring-turtle"/);
    assert.ok(!/<image\b/.test(svg));
  }
  for (const bad of [source.replace(slot, ''), source.replace(slot, slot + slot),
    source.replace('../characters/turtle-coloring-opaque.svg', '../characters/other.svg'),
    source.replace('width="485"', 'width="0"'), source.replace('height="310"', 'height="-1"'),
    source.replace('x="125"', 'x="NaN"'), source.replace('y="293"', ''),
    source.replace('</svg>', '<image href="https://example.test/extra.svg"/></svg>')]) {
    writeFileSync(path.join(temp, turtlePond.scene), bad);
    assert.throws(() => inlineTurtlePond(temp), assert.AssertionError);
  }
});

test('canonical turtle source and approved bunny garden output remain unchanged', () => {
  assert.equal(hash(readFileSync(path.join(root, 'design-source/animals/locked-poses/turtle-01-walking.svg'))),
    'b77c7d5caebad1ab13eed30e87c07e23c9d985121c5605822e48354eff9ecbae');
  assert.equal(hash(readFileSync(path.join(root, 'design-source/animals/locked-poses/turtle-01-walking.png'))),
    '520fe4835d76d567a32cee56e657581d0bc1ae51d33eb6825be4b56753eba197');
  assert.equal(hash(readFileSync(path.join(root, 'design-source/coloring/scenes/bunny-garden.svg'))),
    'e3a53644b1d9c0a191e834a58c795cd8ef305a7a78bd9411abe25f15b233239f');
  const { book } = resolveRecipe({ ...input, pages: ['bunny-garden'] });
  const crops = { 'design-source/coloring/scenes/bunny-garden.svg': '-51.57 -8.36 779.30 842.20',
    'design-source/coloring/characters/bunny-coloring-opaque.svg': '238.31 6.07 600.84 988.66' };
  const css = readFileSync(path.join(root, 'src/styles/coloring-practice.css'), 'utf8');
  assert.equal(hash(renderDocument({ title: "Kennedi's coloring book", bodyHtml: `<style>${css}</style>${book.pages[0].render(crops)}` })),
    'e31e6c27eb6a6fde1dcd1da3309b16c3fa1a69216e93b7de4ed16eb5c2b8ee5e');
});

test('pond source/publication parity rejects pose drift; opaque turtle preserves appearance and blocks backdrop', async () => {
  const character = inlineSvgFile(path.join(root, turtlePond.character));
  const source = inlineSvgFile(path.join(root, turtlePond.scene)).replace(
    'href="../characters/turtle-coloring-opaque.svg"', `href="data:image/svg+xml;base64,${Buffer.from(character).toString('base64')}"`);
  const normalize = (svg, w, h) => svg.replace(/width="[^"]*"/, `width="${w}"`).replace(/height="[^"]*"/, `height="${h}"`)
    .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${w} ${h}"`);
  const published = inlineTurtlePond(root);
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
        for (let i = 0; i < a.length; i += 4) {
          binaryDifferencePixels += (a[i] < 128) !== (b[i] < 128);
          const d = Math.abs(a[i] - b[i]); total += d; maxGrayDelta = Math.max(maxGrayDelta, d);
        }
        return { binaryDifferencePixels, meanGrayDelta: total / (a.length / 4), maxGrayDelta };
      };
      const scene = await Promise.all(data.scene.map(svg => pixels(svg, 700, 820, true)));
      const white = await Promise.all(data.character.map(svg => pixels(svg, 1024, 1024, true)));
      const bare = await Promise.all(data.character.map(svg => pixels(svg, 1024, 1024, false)));
      const at = (p, x, y) => [...p.slice((y * 1024 + x) * 4, (y * 1024 + x) * 4 + 4)];
      return { scene: scene.slice(1).map(b => compare(scene[0], b)), character: compare(...white),
        samples: [[260, 470], [540, 540]].map(([x, y]) => ({ before: at(bare[0], x, y), after: at(bare[1], x, y) })),
        outside: at(bare[1], 0, 0) };
    }, { scene: [source, published, published.replace('id="coloring-turtle" x="125"', 'id="coloring-turtle" x="126"'),
      published.replace('width="485" height="310"', 'width="486" height="310"')].map(s => normalize(s, 700, 820)),
    character: [inlineSvgFile(path.join(root, 'design-source/animals/locked-poses/turtle-01-walking.svg')), character].map(s => normalize(s, 1024, 1024)) });
    const assertParity = m => {
      assert.equal(m.binaryDifferencePixels, 0, 'Printed silhouette drift.');
      // Measured linked/inline rasterization: 14 gray levels max, 0 silhouette
      // changes, .000124 mean delta. Do not claim exact RGBA byte parity.
      assert.ok(m.maxGrayDelta <= 14 && m.meanGrayDelta < .0002, JSON.stringify(m));
    };
    assertParity(result.scene[0]);
    for (const variant of result.scene.slice(1)) assert.throws(() => assertParity(variant), /Printed silhouette drift/);
    // Same validated opaque-contour allowance as the bunny, not a new design.
    assert.ok(result.character.binaryDifferencePixels / (1024 * 1024) < .0002 && result.character.meanGrayDelta < .05);
    for (const sample of result.samples) { assert.equal(sample.before[3], 0); assert.deepEqual(sample.after, [255, 255, 255, 255]); }
    assert.equal(result.outside[3], 0);
    console.log('Turtle appearance, occlusion and scene parity:', JSON.stringify(result));
  });
});
