import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createCountingBook, DEFAULT_SEED, describeGroup, isMonotonic, validateSeed } from '../src/content/counting-practice.mjs';
import { countAndTrace } from '../src/components/count-and-trace.mjs';
import { numberGlyph } from '../src/components/number-glyphs.mjs';
import { renderDocument } from '../src/render.mjs';
import { inlineSvgFile, inlineImageFile } from '../src/content/asset-inline.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const stage = args.shift() ?? 'all';
const stages = ['build', 'pdf', 'screenshots', 'rasterize', 'verify', 'all'];
const options = {};
const usage = 'Usage: node scripts/counting.mjs [build|pdf|screenshots|rasterize|verify|all] [--out DIRECTORY] [--seed UINT32]';
if (!stages.includes(stage)) throw new Error(usage);
for (let i = 0; i < args.length; i += 2) {
  const flag = args[i], value = args[i + 1];
  if (!['--out', '--seed'].includes(flag) || !value || value.startsWith('--') || flag in options) throw new Error(usage);
  options[flag] = value;
}
if (options['--seed'] !== undefined && !/^(0|[1-9]\d*)$/.test(options['--seed'])) throw new Error(usage);
const seed = validateSeed(options['--seed'] === undefined ? DEFAULT_SEED : Number(options['--seed']));
const { pages, assets } = createCountingBook(seed);
const out = path.resolve(options['--out'] ?? path.join(root, 'dist-counting'));
const pdfPath = path.join(out, 'pdf', 'kennedi-mixed-count-and-trace.pdf');
const num = n => String(n).padStart(2, '0');
const htmlPath = n => path.join(out, 'pages', `page-${num(n)}.html`);
const singlePdf = n => path.join(out, 'pdf', 'pages', `page-${num(n)}.pdf`);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const styles = readFileSync(path.join(root, 'src/styles/counting-practice.css'), 'utf8');
function save(file, contents) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, contents, { mode: 0o600 });
  chmodSync(file, 0o600);
}
function info(file) {
  const text = execFileSync('/usr/bin/pdfinfo', [file], { encoding: 'utf8' });
  return { pages: Number(text.match(/^Pages:\s+(\d+)/m)?.[1]),
    dimensions: text.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m)?.slice(1).map(Number) };
}
async function withBrowser(fn) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { return await fn(browser); } finally { await browser.close(); }
}
function wrap(body, title = 'Kennedi: mixed count and trace') {
  return renderDocument({ title, bodyHtml: `<style>${styles}</style>${body}` });
}
function documents(crops) {
  const bodies = pages.map(page => page.render(crops));
  return {
    singles: bodies.map((body, index) => wrap(body, `Kennedi: count and trace, page ${index + 1}`)),
    preview: wrap(bodies.join('\n')),
  };
}
async function build() {
  const crops = await withBrowser(async browser => {
    const page = await browser.newPage();
    await page.setContent(assets.map(asset => `<div style="width:1024px;height:1024px">${inlineSvgFile(path.join(root, asset))}</div>`).join(''));
    const bounds = await page.evaluate(() => [...document.querySelectorAll('svg')].map(svg => {
      const { x, y, width, height } = svg.getBBox(); return { x, y, width, height };
    }));
    assert.equal(bounds.length, assets.length);
    return Object.fromEntries(bounds.map((b, index) => {
      assert.ok(b.width > 0 && b.height > 0, `Empty art: ${assets[index]}`);
      return [assets[index], [b.x - b.width * .06, b.y - b.height * .06, b.width * 1.12, b.height * 1.12].map(n => n.toFixed(2)).join(' ')];
    }));
  });
  const manifest = { seed, pages: pages.map(page => page.meta),
    artwork: assets.map(asset => ({ path: asset, viewBox: crops[asset], sha256: hash(readFileSync(path.join(root, asset))) })) };
  const rendered = documents(crops);
  rendered.singles.forEach((document, index) => save(htmlPath(index + 1), document));
  save(path.join(out, 'preview.html'), rendered.preview);
  save(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Built ${pages.length} mixed count-and-trace sheets / ${pages.length * 3} groups / seed ${seed}.`);
}
async function pdf() {
  await withBrowser(async browser => {
    const page = await browser.newPage();
    await page.emulateMedia({ media: 'print' });
    async function exportOne(source, destination) {
      const bytes = readFileSync(source);
      await page.setContent(bytes.toString('utf8'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      await page.pdf({ path: destination, preferCSSPageSize: true, printBackground: true, tagged: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 } });
      chmodSync(destination, 0o600);
      save(`${destination}.sourcehash`, hash(bytes));
      save(`${destination}.sha256`, hash(readFileSync(destination)));
    }
    await exportOne(path.join(out, 'preview.html'), pdfPath);
    for (const { meta } of pages) await exportOne(htmlPath(meta.pageNumber), singlePdf(meta.pageNumber));
  });
  console.log(`Exported ${pdfPath} and ${pages.length} individual page PDFs.`);
}
async function screenshots() {
  await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1.5 });
    await page.emulateMedia({ media: 'print' });
    for (const { meta } of pages) {
      await page.setContent(readFileSync(htmlPath(meta.pageNumber), 'utf8'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(out, 'screenshots', `page-${num(meta.pageNumber)}.png`);
      mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      await page.screenshot({ path: file, fullPage: true }); chmodSync(file, 0o600);
    }
  });
  console.log(`Captured ${pages.length} browser screenshots.`);
}
async function rasterize() {
  assert.equal(info(pdfPath).pages, pages.length, 'Unexpected PDF length; inspect layout before continuing.');
  const directory = path.join(out, 'pdf-raster');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  execFileSync('/usr/bin/pdftoppm', ['-png', '-gray', '-r', '150', pdfPath, path.join(directory, 'page')], { stdio: 'inherit' });
  const images = readdirSync(directory).filter(file => /^page-\d+\.png$/.test(file)).sort();
  assert.equal(images.length, pages.length);
  images.forEach(file => chmodSync(path.join(directory, file), 0o600));
  const contact = `<!doctype html><html><head><meta charset="utf-8"><title>Count-and-trace PDF overview</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eee;font:16px sans-serif}h1{margin:0 0 16px;font-size:24px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}figure{margin:0}img{width:100%;display:block}figcaption{padding:8px 0}</style></head><body>
    <h1>Mixed animal counting / traceable answers / seed ${seed}</h1><main>${images.map((file, index) => `<figure><img src="${inlineImageFile(path.join(directory, file))}"><figcaption>Page ${index + 1}: ${pages[index].meta.groups.map(describeGroup).join(', ')}</figcaption></figure>`).join('')}</main></body></html>`;
  save(path.join(out, 'contact-sheet.html'), contact);
  await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await page.setContent(contact, { waitUntil: 'load' });
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({ path: path.join(out, 'contact-sheet.png'), fullPage: true });
    chmodSync(path.join(out, 'contact-sheet.png'), 0o600);
  });
  console.log(`Rasterized all ${pages.length} actual PDF pages in grayscale at 150 DPI.`);
}
function assertPdf(file, source, length) {
  assert.equal(readFileSync(`${file}.sourcehash`, 'utf8'), hash(source), `Stale PDF: ${file}`);
  assert.equal(readFileSync(`${file}.sha256`, 'utf8'), hash(readFileSync(file)), `Altered PDF: ${file}`);
  assert.deepEqual(info(file), { pages: length, dimensions: [612, 792] });
}
async function measure(page) {
  return page.evaluate(() => {
    const sheet = document.querySelector('.ct-sheet'), rect = sheet.getBoundingClientRect();
    const groups = [...sheet.querySelectorAll('.ct-group')];
    const boxes = [...sheet.querySelectorAll('header, footer, .ct-group, .ct-pictures, .ct-picture, .ct-answer')];
    return { title: sheet.querySelector('h1').textContent, width: rect.width, height: rect.height,
      pictures: groups.map(group => group.querySelectorAll('.ct-picture').length),
      answers: groups.map(group => Number(group.querySelector('.ct-answer-guide').dataset.answer)),
      tracePaths: groups.map(group => [...group.querySelectorAll('.ct-trace path')].map(p => p.getAttribute('d'))),
      animals: groups.map(group => group.dataset.animal),
      tileInches: [...sheet.querySelectorAll('.ct-picture')].map(tile => tile.getBoundingClientRect().width / 96),
      answerInches: [...sheet.querySelectorAll('.ct-answer-guide')].map(svg => 72 * svg.getBoundingClientRect().height / 140 / 96),
      glyphsFit: [...sheet.querySelectorAll('.ct-trace')].every(mark => {
        const b = mark.getBBox(), t = mark.transform.baseVal.consolidate().matrix;
        return b.x + t.e >= 2 && b.x + b.width + t.e <= 158 && b.y + t.f >= 2 && b.y + b.height + t.f <= 138;
      }),
      safeMargins: boxes.every(box => { const b = box.getBoundingClientRect(); return b.left >= rect.left + 47.5 && b.right <= rect.right - 47.5 && b.top >= rect.top + 47.5 && b.bottom <= rect.bottom - 47.5; }),
      noOverflow: sheet.scrollWidth <= sheet.clientWidth && sheet.scrollHeight <= sheet.clientHeight && [...sheet.querySelectorAll('div, main, header, section, footer')].every(e => e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1),
    };
  });
}
function assertLayout(m, label) {
  assert.deepEqual([m.width, m.height], [816, 1056]);
  assert.ok(m.safeMargins && m.noOverflow && m.glyphsFit, `Layout failure ${label}: ${JSON.stringify(m)}`);
  assert.ok(m.tileInches.every(height => height >= .75));
  assert.ok(m.answerInches.every(height => Math.abs(height - .75) < .001));
}
async function verify() {
  const counts = pages.flatMap(page => page.meta.groups.map(group => group.count));
  assert.deepEqual([...new Set(counts)].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(counts.length, 24);
  for (const { meta } of pages) {
    assert.equal(isMonotonic(meta.groups.map(group => group.count)), false);
    assert.equal(new Set(meta.groups.map(group => group.animal)).size, 3);
  }
  const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  assert.equal(manifest.seed, seed);
  assert.deepEqual(manifest.pages, pages.map(page => page.meta));
  assert.deepEqual(manifest.artwork.map(asset => asset.path), assets);
  for (const asset of manifest.artwork) assert.equal(hash(readFileSync(path.join(root, asset.path))), asset.sha256);
  const current = documents(Object.fromEntries(manifest.artwork.map(asset => [asset.path, asset.viewBox])));
  assert.equal(hash(readFileSync(path.join(out, 'preview.html'))), hash(current.preview), 'Stale combined HTML.');
  assertPdf(pdfPath, current.preview, pages.length);
  const physical = execFileSync('/usr/bin/pdfinfo', ['-f', '1', '-l', String(pages.length), pdfPath], { encoding: 'utf8' });
  const dimensions = [...physical.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map(m => m.slice(1).map(Number));
  assert.equal(dimensions.length, pages.length);
  assert.ok(dimensions.every(([w, h]) => w === 612 && h === 792));
  const errors = [];
  const results = await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => errors.push(request.url()));
    await page.emulateMedia({ media: 'print' });
    const measurements = [];
    for (const { meta } of pages) {
      const document = readFileSync(htmlPath(meta.pageNumber));
      assert.equal(hash(document), hash(current.singles[meta.pageNumber - 1]));
      assertPdf(singlePdf(meta.pageNumber), document, 1);
      await page.setContent(document.toString('utf8'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const m = await measure(page);
      assert.equal(m.title, meta.title);
      assert.deepEqual(m.pictures, meta.groups.map(group => group.count));
      assert.deepEqual(m.answers, m.pictures);
      assert.deepEqual(m.animals, meta.groups.map(group => group.animal));
      assert.deepEqual(m.tracePaths, meta.groups.map(group => [...numberGlyph(group.count).matchAll(/d="([^"]+)"/g)].map(match => match[1])));
      assertLayout(m, `on page ${meta.pageNumber}`);
      measurements.push({ page: meta.pageNumber, ...m });
    }
    // Stress the origin layout with the densest legal groups, independent of seed.
    const svg = inlineSvgFile(path.join(root, assets[0]));
    await page.setContent(wrap(`<section class="sheet ct-sheet"><header class="ct-header"><p class="ct-brand">KENNEDI'S WORKBOOK</p><h1>Count and trace</h1><p class="ct-direction">Count the animals. Trace how many.</p></header><main class="ct-groups">${Array.from({ length: 3 }, () => countAndTrace({ count: 20, animal: 'bear', plural: 'bears', svg })).join('')}</main><footer class="ct-footer"><span>Touch each animal as you count.</span><span>Page test</span></footer></section>`));
    await page.evaluate(() => document.fonts.ready);
    const stress = await measure(page);
    assertLayout(stress, 'with three maximum-count groups');
    assert.deepEqual(stress.pictures, [20, 20, 20]);
    return { measurements, stress };
  });
  assert.deepEqual(errors, []);
  save(path.join(out, 'verification.json'), JSON.stringify({ status: 'PASS', seed, pages: pages.length,
    groups: counts.length, quantities: [...new Set(counts)].sort((a, b) => a - b), pdf: pdfPath,
    pdfSha256: hash(readFileSync(pdfPath)), dimensionsPoints: [612, 792], browserErrors: errors, ...results }, null, 2));
  console.log(`PASS: ${pages.length} US Letter pages; ${counts.length} shuffled groups; quantities 1-20; exact pictures and dotted answers; .75-inch tiles/answer guides; safe margins; no overflow/browser errors; maximum-density stress passed.`);
}
const operations = { build, pdf, screenshots, rasterize, verify };
if (stage === 'all') for (const operation of Object.values(operations)) await operation();
else await operations[stage]();
