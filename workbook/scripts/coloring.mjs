import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, chmodSync, cpSync, renameSync, rmSync, rmdirSync, lstatSync, existsSync } from 'node:fs';
import path from 'node:path';
import { readRecipe, resolveRecipe, WORKBOOK_ROOT as root } from '../src/recipes.mjs';
import { renderDocument } from '../src/render.mjs';
import { inlineImageFile } from '../src/content/asset-inline.mjs';
import { withPrintBrowser, measureArtworkCrops, stageInventory, savePdfHashes,
  assertPdfHashes, replacePdfRasters, readPdfRasterInventory, printTool } from './print-artifacts.mjs';

const args = process.argv.slice(2), stage = args.shift() ?? 'all';
const stages = ['build', 'pdf', 'screenshots', 'rasterize', 'verify'];
const options = {};
if (![...stages, 'all'].includes(stage)) throw new TypeError('Unknown coloring stage.');
for (let i = 0; i < args.length; i += 2) {
  const flag = args[i], value = args[i + 1];
  if (!['--recipe', '--out'].includes(flag) || !value || value.startsWith('--') || Object.hasOwn(options, flag))
    throw new TypeError('Usage: node scripts/coloring.mjs [all|build|pdf|screenshots|rasterize|verify] [--recipe FILE] [--out DIRECTORY]');
  options[flag] = value;
}
const out = path.resolve(options['--out'] ?? path.join(root, 'dist-recipes/coloring-pages-v1'));
function resolveInput() {
  const input = readRecipe(path.resolve(options['--recipe'] ?? path.join(root, 'recipes/coloring-starter.json')));
  if (input.template !== 'coloring-pages-v1') throw new TypeError('Expected a coloring-pages-v1 recipe.');
  return resolveRecipe(input);
}
// Invalid new recipes create no output. Existing output is invalidated before
// fallible recipe checks, under the same exclusive owner as all stage writes.
let resolved = existsSync(out) ? undefined : resolveInput();
mkdirSync(out, { recursive: true, mode: 0o700 });
assert.ok(lstatSync(out).isDirectory() && !lstatSync(out).isSymbolicLink(), 'Coloring output must be a real directory.');
const lock = path.join(out, '.coloring-run-lock');
try { mkdirSync(lock, { mode: 0o700 }); }
catch (error) {
  if (error.code === 'EEXIST') throw new Error('Coloring output is already owned by another run; inspect the owner before recovering an interrupted lock.', { cause: error });
  throw error;
}
try {
  writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ status: 'NOT_VERIFIED', stage }) + '\n', { mode: 0o600 });
  chmodSync(path.join(out, 'verification.json'), 0o600);
  resolved ??= resolveInput();
  const { book, recipe } = resolved;
  const { pages, assets } = book;
  const pdfPath = path.join(out, 'pdf/kennedi-coloring.pdf');
  const styles = readFileSync(path.join(root, 'src/styles/coloring-practice.css'), 'utf8');
  const hashFile = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  const number = index => String(index + 1).padStart(2, '0');
  const htmlPath = index => path.join(out, 'pages', `page-${number(index)}.html`);
  const singlePdf = index => path.join(out, 'pdf/pages', `page-${number(index)}.pdf`);
  function save(file, data) {
    mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(file, data, { mode: 0o600 }); chmodSync(file, 0o600);
  }
  const saveJson = (file, value) => save(file, JSON.stringify(value, null, 2) + '\n');
  function documents(crops) {
    const bodies = pages.map(page => page.render(crops));
    const doc = body => renderDocument({ title: "Kennedi's coloring book", bodyHtml: `<style>${styles}</style>${body}` });
    return { preview: doc(bodies.join('\n')), singles: bodies.map(doc) };
  }
  function pdfInfo(file) {
    const text = printTool('pdfinfo', ['-f', '1', '-l', String(pages.length), file], { encoding: 'utf8' });
    const count = Number(text.match(/^Pages:\s+(\d+)/m)?.[1]);
    const sizes = [...text.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map(m => m.slice(1).map(Number));
    assert.equal(sizes.length, count);
    assert.ok(sizes.every(size => size[0] === 612 && size[1] === 792), 'PDF pages must be US Letter.');
    return count;
  }
  async function build() {
    const { crops, chrome } = await withPrintBrowser(async browser => ({
      crops: await measureArtworkCrops(browser, root, assets), chrome: browser.version() }));
    const docs = documents(crops), inventory = stageInventory(path.join(out, 'pages'));
    docs.singles.forEach((doc, i) => save(path.join(inventory.directory, path.basename(htmlPath(i))), doc));
    inventory.publish(docs.singles.map((_, i) => path.basename(htmlPath(i))));
    save(path.join(out, 'preview.html'), docs.preview);
    saveJson(path.join(out, 'manifest.json'), { pages: pages.map(page => page.meta), crops, lock: recipe.lock });
    saveJson(path.join(out, 'recipe.json'), recipe);
    saveJson(path.join(out, 'render-environment.json'), { node: process.version, chrome,
      platform: process.platform, architecture: process.arch });
    console.log(`Built ${pages.length} original coloring pages; selected art reused without model inference.`);
  }
  async function pdf() {
    const inventory = stageInventory(path.join(out, 'pdf/pages'));
    await withPrintBrowser(async browser => {
      const page = await browser.newPage(); await page.emulateMedia({ media: 'print' });
      async function exportOne(source, target) {
        const html = readFileSync(source, 'utf8');
        await page.setContent(html, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
        mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
        await page.pdf({ path: target, preferCSSPageSize: true, printBackground: true, tagged: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 } });
        chmodSync(target, 0o600); savePdfHashes(target, html, save);
      }
      await exportOne(path.join(out, 'preview.html'), pdfPath);
      for (let i = 0; i < pages.length; i++) await exportOne(htmlPath(i), path.join(inventory.directory, path.basename(singlePdf(i))));
    });
    inventory.publish(pages.flatMap((_, i) => {
      const file = path.basename(singlePdf(i)); return [file, `${file}.sourcehash`, `${file}.sha256`];
    }));
    console.log(`Exported combined and individual PDFs: ${pdfPath}`);
  }
  async function screenshots() {
    const inventory = stageInventory(path.join(out, 'screenshots'));
    await withPrintBrowser(async browser => {
      const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1.5 });
      await page.emulateMedia({ media: 'print' });
      for (let i = 0; i < pages.length; i++) {
        await page.setContent(readFileSync(htmlPath(i), 'utf8'), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(inventory.directory, `page-${number(i)}.png`), fullPage: true });
      }
    });
    inventory.publish(pages.map((_, i) => `page-${number(i)}.png`));
    console.log(`Rendered ${pages.length} browser screenshots.`);
  }
  function contactDocument(raster) {
    return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Coloring pack print proof</title>
      <style>body{margin:24px;background:#ececec;font:20px sans-serif}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}figure{margin:0}img{width:100%;display:block}figcaption{padding:8px 0}</style>
      <h1>Kennedi's coloring book / draft print proof</h1><main>${pages.map(({ meta }, i) => `<figure><img alt="${meta.title}" src="${inlineImageFile(raster(i))}"><figcaption>${i + 1}. ${meta.title}</figcaption></figure>`).join('')}</main></html>`;
  }
  function rasterReceipt(raster, directory, pdfSha256) {
    return { pdfSha256,
      pages: pages.map((_, i) => ({ file: path.basename(raster(i)), sha256: hashFile(raster(i)) })),
      contact: { htmlSha256: hashFile(path.join(directory, 'contact-sheet.html')),
        pngSha256: hashFile(path.join(directory, 'contact-sheet.png')) } };
  }
  async function rasterize() {
    assert.equal(pdfInfo(pdfPath), pages.length);
    assertPdfHashes(pdfPath, readFileSync(path.join(out, 'preview.html'), 'utf8'));
    const pdfSha256 = hashFile(pdfPath);
    const staging = mkdtempSync(path.join(out, '.coloring-proof-'));
    let inventory;
    try {
      const files = replacePdfRasters(pdfPath, path.join(staging, 'pdf-raster'), pages.length, true);
      const stagedRaster = i => path.join(staging, 'pdf-raster', files[i]);
      const contact = contactDocument(stagedRaster);
      save(path.join(staging, 'contact-sheet.html'), contact);
      await withPrintBrowser(async browser => {
        const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
        await page.setContent(contact, { waitUntil: 'load' });
        await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
        await page.screenshot({ path: path.join(staging, 'contact-sheet.png'), fullPage: true });
        chmodSync(path.join(staging, 'contact-sheet.png'), 0o600);
      });
      assert.equal(hashFile(pdfPath), pdfSha256, 'PDF changed during proof preparation.');
      saveJson(path.join(staging, 'raster-receipt.json'), rasterReceipt(stagedRaster, staging, pdfSha256));
      // No live proof is touched until all rendering succeeds. Receipt is last:
      // an interrupted publication cannot validate a mixed old/new contact set.
      inventory = stageInventory(path.join(out, 'pdf-raster'));
      files.forEach((name, i) => cpSync(stagedRaster(i), path.join(inventory.directory, name)));
      inventory.publish(files);
      for (const name of ['contact-sheet.html', 'contact-sheet.png', 'raster-receipt.json'])
        renameSync(path.join(staging, name), path.join(out, name));
    } finally {
      rmSync(staging, { recursive: true });
      if (inventory && existsSync(inventory.directory)) rmSync(inventory.directory, { recursive: true });
    }
    console.log(`Rasterized ${pages.length} actual PDF pages in grayscale at 150 DPI.`);
  }
  async function verify() {
    const crops = await withPrintBrowser(browser => measureArtworkCrops(browser, root, assets));
    const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest, { pages: pages.map(page => page.meta), crops, lock: recipe.lock });
    const docs = documents(crops);
    assert.equal(readFileSync(path.join(out, 'preview.html'), 'utf8'), docs.preview);
    assertPdfHashes(pdfPath, docs.preview); assert.equal(pdfInfo(pdfPath), pages.length);
    const files = readPdfRasterInventory(path.join(out, 'pdf-raster'), pages.length);
    const rasterPath = i => path.join(out, 'pdf-raster', files[i]);
    assert.deepEqual(JSON.parse(readFileSync(path.join(out, 'raster-receipt.json'), 'utf8')),
      rasterReceipt(rasterPath, out, hashFile(pdfPath)),
      'Stale or altered PDF raster/contact proof receipt; rasterize the current PDF first.');
    assert.ok(readFileSync(path.join(out, 'contact-sheet.html'), 'utf8') === contactDocument(rasterPath),
      'Stale or altered contact HTML; rasterize the current PDF first.');
    const errors = [], externalRequests = [];
    const measurements = await withPrintBrowser(async browser => {
      const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('requestfailed', r => errors.push(r.url()));
      page.on('request', r => { if (!r.url().startsWith('data:')) externalRequests.push(r.url()); });
      await page.emulateMedia({ media: 'print' });
      const results = [];
      for (let i = 0; i < pages.length; i++) {
        const html = readFileSync(htmlPath(i), 'utf8'); assert.equal(html, docs.singles[i]);
        assertPdfHashes(singlePdf(i), html); assert.equal(pdfInfo(singlePdf(i)), 1);
        await page.setContent(html, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
        const m = await page.evaluate(() => {
          const sheet = document.querySelector('.coloring-sheet'), rect = sheet.getBoundingClientRect();
          const boxes = [...sheet.querySelectorAll('header,figure,footer')];
          const art = sheet.querySelector('figure').getBoundingClientRect();
          return { title: sheet.querySelector('h1').textContent, width: rect.width, height: rect.height,
            safeMargins: boxes.every(box => { const b = box.getBoundingClientRect(); return b.left >= rect.left + 47.5 && b.right <= rect.right - 47.5 && b.top >= rect.top + 47.5 && b.bottom <= rect.bottom - 47.5; }),
            noOverflow: [document.documentElement, document.body, sheet, ...boxes].every(e => e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1),
            artworkInches: [art.width / 96, art.height / 96], labeledArt: sheet.querySelectorAll('svg[aria-label]').length };
        });
        assert.equal(m.title, pages[i].meta.title); assert.deepEqual([m.width, m.height], [816, 1056]);
        assert.ok(m.safeMargins && m.noOverflow && m.labeledArt === 1, JSON.stringify(m));
        assert.ok(m.artworkInches[0] >= 7 && m.artworkInches[1] >= 8, 'Art area must remain large.');
        // Inspect actual PDF pixels, not an HTML proxy. Bound ink and reject blank/muddy/color output.
        const raster = await page.evaluate(async uri => {
          const image = new Image(); image.src = uri; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
          const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
          let ink = 0, gray = true;
          for (let n = 0; n < pixels.length; n += 4) {
            ink += pixels[n] < 245 ? 1 : 0;
            gray &&= pixels[n] === pixels[n + 1] && pixels[n] === pixels[n + 2];
          }
          return { width: image.width, height: image.height, grayscale: gray, inkFraction: ink / (pixels.length / 4) };
        }, inlineImageFile(rasterPath(i)));
        assert.deepEqual([raster.width, raster.height], [1275, 1650]); assert.ok(raster.grayscale);
        assert.ok(raster.inkFraction > .01 && raster.inkFraction < .18, `Blank or ink-heavy page: ${JSON.stringify(raster)}`);
        results.push({ page: i + 1, ...m, raster });
      }
      return results;
    });
    assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
    saveJson(path.join(out, 'verification.json'), { status: 'PASS', pages: pages.length,
      dimensionsPoints: [612, 792], browserErrors: errors, externalRequests, measurements });
    console.log(`PASS: ${pages.length} US Letter coloring pages; individual PDFs; current art/source hashes; large art; safe margins; no overflow/errors/network requests; grayscale PDF rasters; bounded ink.`);
  }
  const operations = { build, pdf, screenshots, rasterize, verify };
  for (const name of stage === 'all' ? stages : [stage]) {
    if (name !== 'build') assert.deepEqual(resolveRecipe(readRecipe(path.join(out, 'recipe.json'))).recipe, recipe, 'Output was built from a different recipe.');
    await operations[name]();
  }
} finally {
  rmdirSync(lock);
}
