import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readRecipe, resolveRecipe, WORKBOOK_ROOT as root } from '../src/recipes.mjs';
import { bunnyGarden, inlineBunnyGarden } from '../src/components/coloring-scene.mjs';
import { inlineSvgFile } from '../src/content/asset-inline.mjs';
import { renderDocument } from '../src/render.mjs';
import { withPrintBrowser } from '../scripts/print-artifacts.mjs';

const input = { schemaVersion: 1, template: 'coloring-pages-v1', pages: ['bunny-garden'] };
test('scene recipe resolves fixed dependencies and replays deterministically', () => {
  const first = resolveRecipe(readRecipe(path.join(root, 'recipes/coloring-bunny-garden.json')));
  assert.deepEqual(first.book.assets, [bunnyGarden.scene, bunnyGarden.character]);
  assert.deepEqual(first.recipe.lock.artwork.map(a => a.asset), ['bunny-garden', 'bunny-coloring-opaque']);
  const replay = resolveRecipe(JSON.parse(JSON.stringify(first.recipe)));
  assert.equal(first.book.pages[0].render(), replay.book.pages[0].render());
  assert.deepEqual(first.recipe, replay.recipe);
  const repeated = resolveRecipe({ ...input, pages: ['bunny-garden', 'bunny', 'bunny-garden'] });
  assert.equal(repeated.book.assets.length, 3);
  assert.deepEqual(repeated.book.pages.map(p => p.meta.subject), ['bunny-garden', 'bunny', 'bunny-garden']);
});
test('scene and character locks reject drift; recipes cannot inject a cast or file path', () => {
  const first = resolveRecipe(input).recipe;
  for (const index of [0, 1]) {
    const copy = JSON.parse(JSON.stringify(first)); copy.lock.artwork[index].sha256 = '0'.repeat(64);
    assert.throws(() => resolveRecipe(copy), /selected artwork changed/);
  }
  for (const recipe of [ { ...input, pages: ['bunny-garden', '../characters/pippa'] },
    { ...input, pages: ['bunny-garden', false] }, { ...input, companions: ['pippa'] },
    { ...input, scene: '/etc/passwd' }, { ...input, html: '<image href="https://example.test">' } ])
    assert.throws(() => resolveRecipe(recipe), TypeError);
});
test('publication preserves ordered editable layers and replaces linked art with vector paths', () => {
  const source = readFileSync(path.join(root, bunnyGarden.scene), 'utf8'), svg = inlineBunnyGarden(root);
  assert.match(source, /<image id="bunny-reference" href="\.\.\/characters\/bunny-coloring-opaque\.svg"/);
  assert.ok(!/<image\b/.test(svg)); assert.ok(!/https?:\/\//.test(svg.replace(/xmlns[^=]*="[^"]*"/g, '')));
  const layers = ['garden-background', 'garden-flowers', 'garden-bunny', 'garden-butterfly', 'garden-foreground'];
  const positions = layers.map(id => svg.indexOf(`id="${id}"`));
  assert.ok(positions.every(p => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(svg, /id="coloring-bunny"/); assert.match(svg, /fill="#ffffff"/i);
});
test('existing accepted starter HTML is byte-identical, including source art, layout and captions', () => {
  const crops = {
    'design-source/animals/locked-poses/bunny-01-sitting.svg': '238.31 6.07 600.84 988.66',
    'design-source/animals/locked-poses/turtle-01-walking.svg': '180.20 369.42 670.57 429.49',
    'design-source/animals/locked-poses/unicorn-01-standing.svg': '129.18 -15.03 799.22 1008.03',
    'design-source/animals/locked-poses/whale-01-swimming.svg': '194.04 249.07 693.51 503.71',
  };
  const expected = ['3c96b338b9ec13aeb6c76603e7bbac242541508cdfc854f295ff1328d71c8d46',
    'cd192f716aadd296843bd7de0656f1fc6ce9762689a81141d88a7808f1c6b6c8',
    '364d77a9d292c9290bcd271f5c22297b854dcb34c32921c6c828d701b4b6ce3c',
    'c58c0825364f443aaf7578d7ee33ab5909791c14601a95f1daa08c56f7653f95'];
  const { book } = resolveRecipe(readRecipe(path.join(root, 'recipes/coloring-starter.json')));
  const styles = readFileSync(path.join(root, 'src/styles/coloring-practice.css'), 'utf8');
  assert.deepEqual(book.pages.map(p => createHash('sha256').update(renderDocument({ title: "Kennedi's coloring book",
    bodyHtml: `<style>${styles}</style>${p.render(crops)}` })).digest('hex')), expected);
});
test('opaque bunny retains its outline and blocks background through face/body without a rectangle', async () => {
  const normalized = file => inlineSvgFile(path.join(root, file))
    .replace(/width="[^"]*"/, 'width="1024"').replace(/height="[^"]*"/, 'height="1024"')
    .replace(/viewBox="[^"]*"/, 'viewBox="0 0 1024 1024"');
  await withPrintBrowser(async browser => {
    const page = await browser.newPage();
    const result = await page.evaluate(async pair => {
      async function pixels(svg, white) {
        const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(svg); await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
        const ctx = canvas.getContext('2d'); if (white) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1024, 1024); }
        ctx.drawImage(image, 0, 0, 1024, 1024); return ctx.getImageData(0, 0, 1024, 1024).data;
      }
      const bare = await Promise.all(pair.map(s => pixels(s, false))), white = await Promise.all(pair.map(s => pixels(s, true)));
      let changed = 0, delta = 0;
      for (let n = 0; n < white[0].length; n += 4) {
        if ((white[0][n] < 128) !== (white[1][n] < 128)) changed++;
        delta += Math.abs(white[0][n] - white[1][n]);
      }
      const at = (pixels, x, y) => [...pixels.slice((y * 1024 + x) * 4, (y * 1024 + x) * 4 + 4)];
      return { binaryDifferenceFraction: changed / (1024 * 1024), meanGrayDelta: delta / (1024 * 1024),
        samples: [[512, 700], [512, 380]].map(([x, y]) => ({ before: at(bare[0], x, y), after: at(bare[1], x, y) })),
        outside: at(bare[1], 0, 0) };
    }, [normalized('design-source/animals/locked-poses/bunny-01-sitting.svg'), normalized(bunnyGarden.character)]);
    // Opaque positive/negative contours have tiny edge antialias differences,
    // not a new character. Bound these rather than claiming byte-level parity.
    assert.ok(result.binaryDifferenceFraction < .0002 && result.meanGrayDelta < .05, JSON.stringify(result));
    for (const sample of result.samples) { assert.equal(sample.before[3], 0); assert.deepEqual(sample.after, [255, 255, 255, 255]); }
    assert.equal(result.outside[3], 0, 'Exterior background must remain visible.');
    console.log('Bunny occlusion/parity:', JSON.stringify(result));
  });
});

test('editable and published scene have identical silhouettes; parity rejects shifted or resized art', async () => {
  const character = inlineSvgFile(path.join(root, bunnyGarden.character));
  const source = inlineSvgFile(path.join(root, bunnyGarden.scene)).replace(
    'href="../characters/bunny-coloring-opaque.svg"', `href="data:image/svg+xml;base64,${Buffer.from(character).toString('base64')}"`);
  const normalize = svg => svg.replace(/width="[^"]*"/, 'width="700"').replace(/height="[^"]*"/, 'height="820"')
    .replace(/viewBox="[^"]*"/, 'viewBox="0 0 700 820"');
  await withPrintBrowser(async browser => {
    const page = await browser.newPage();
    const published = normalize(inlineBunnyGarden(root));
    const results = await page.evaluate(async images => {
      async function pixels(svg) {
        const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(svg); await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 700; canvas.height = 820;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 700, 820);
        ctx.drawImage(image, 0, 0, 700, 820); return ctx.getImageData(0, 0, 700, 820).data;
      }
      const [a, ...variants] = await Promise.all(images.map(pixels));
      return variants.map(b => {
        let binaryDifferencePixels = 0, total = 0, maxGrayDelta = 0;
        for (let i = 0; i < a.length; i += 4) {
          if ((a[i] < 128) !== (b[i] < 128)) binaryDifferencePixels++;
          const delta = Math.abs(a[i] - b[i]);
          total += delta; maxGrayDelta = Math.max(maxGrayDelta, delta);
        }
        return { binaryDifferencePixels, meanGrayDelta: total / (700 * 820), maxGrayDelta };
      });
    }, [normalize(source), published,
      published.replace('id="coloring-bunny" x="144"', 'id="coloring-bunny" x="145"'),
      published.replace('width="412" height="576"', 'width="413" height="576"')]);
    // Chromium's linked-image and nested-vector rasterizers differ by at most
    // 3 gray levels on 9 edge pixels in the measured reproduction. Keep exact
    // binary silhouette parity plus tightly bounded edge smoothing, not exact
    // RGBA bytes. A one-unit position or size change must still fail.
    const assertParity = result => {
      assert.equal(result.binaryDifferencePixels, 0, 'Printed silhouette drift.');
      assert.ok(result.maxGrayDelta <= 3 && result.meanGrayDelta < .0001, JSON.stringify(result));
    };
    assertParity(results[0]);
    for (const result of results.slice(1)) assert.throws(() => assertParity(result), /Printed silhouette drift/);
    console.log('Scene parity; actual, shifted, resized:', JSON.stringify(results));
  });
});
