import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { assets, pages } from '../src/content/numbers-practice.mjs';
import { renderDocument } from '../src/render.mjs';
import { inlineSvgFile, inlineImageFile } from '../src/content/asset-inline.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const stage = args.shift() ?? 'all';
const stages = ['build', 'pdf', 'screenshots', 'rasterize', 'verify', 'all'];
if (!stages.includes(stage) || (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1]))) {
  throw new Error('Usage: node scripts/numbers.mjs [build|pdf|screenshots|rasterize|verify|all] [--out DIRECTORY]');
}
const out = path.resolve(args[1] ?? path.join(root, 'dist-numbers'));
const pdfPath = path.join(out, 'pdf', 'kennedi-numbers-1-20.pdf');
const num = n => String(n).padStart(2, '0');
const htmlPath = n => path.join(out, 'pages', `page-${num(n)}.html`);
const singlePdf = n => path.join(out, 'pdf', 'pages', `page-${num(n)}.pdf`);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const styles = readFileSync(path.join(root, 'src/styles/numbers-practice.css'), 'utf8');
function save(file, contents) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, contents, { mode: 0o600 });
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
function documents(crops) {
  const bodies = pages.map(page => page.render(crops));
  return {
    singles: bodies.map((body, index) => renderDocument({ title: `Kennedi numbers 1-20: page ${index + 1}`, bodyHtml: `<style>${styles}</style>${body}` })),
    preview: renderDocument({ title: 'Kennedi numbers 1-20', bodyHtml: `<style>${styles}</style>${bodies.join('\n')}` }),
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
  const manifest = { pages: pages.map(page => page.meta),
    artwork: assets.map(asset => ({ path: asset, viewBox: crops[asset], sha256: hash(readFileSync(path.join(root, asset))) })) };
  const rendered = documents(crops);
  rendered.singles.forEach((document, index) => save(htmlPath(index + 1), document));
  save(path.join(out, 'preview.html'), rendered.preview);
  save(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Built ${pages.length} pages: ten practice sheets and two illustrated counting breaks.`);
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
  execFileSync('/usr/bin/pdftoppm', ['-png', '-r', '150', pdfPath, path.join(directory, 'page')], { stdio: 'inherit' });
  const images = readdirSync(directory).filter(file => /^page-\d+\.png$/.test(file)).sort();
  assert.equal(images.length, pages.length);
  images.forEach(file => chmodSync(path.join(directory, file), 0o600));
  const contact = `<!doctype html><html><head><meta charset="utf-8"><title>Numbers workbook PDF overview</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eee;font:16px sans-serif}h1{margin:0 0 16px;font-size:24px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}figure{margin:0}img{width:100%;display:block}figcaption{padding:8px 0}</style></head><body>
    <h1>Numbers 1-20 / printable pages</h1><main>${images.map((file, index) => `<figure><img src="${inlineImageFile(path.join(directory, file))}"><figcaption>Page ${index + 1}</figcaption></figure>`).join('')}</main></body></html>`;
  save(path.join(out, 'contact-sheet.html'), contact);
  await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await page.setContent(contact, { waitUntil: 'load' });
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({ path: path.join(out, 'contact-sheet.png'), fullPage: true });
    chmodSync(path.join(out, 'contact-sheet.png'), 0o600);
  });
  console.log(`Rasterized all ${pages.length} actual PDF pages at 150 DPI.`);
}
async function verify() {
  assert.deepEqual(pages.flatMap(page => page.meta.numbers), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(pages.filter(page => page.meta.kind === 'practice').length, 10);
  assert.equal(pages.filter(page => page.meta.kind === 'counting').length, 2);
  const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.pages, pages.map(page => page.meta));
  for (const asset of manifest.artwork) assert.equal(hash(readFileSync(path.join(root, asset.path))), asset.sha256);
  const current = documents(Object.fromEntries(manifest.artwork.map(asset => [asset.path, asset.viewBox])));
  assert.equal(hash(readFileSync(path.join(out, 'preview.html'))), hash(current.preview), 'Stale combined HTML.');
  assert.equal(readFileSync(`${pdfPath}.sourcehash`, 'utf8'), hash(current.preview), 'Stale combined PDF.');
  assert.deepEqual(info(pdfPath), { pages: 12, dimensions: [612, 792] });
  const physical = execFileSync('/usr/bin/pdfinfo', ['-f', '1', '-l', '12', pdfPath], { encoding: 'utf8' });
  const dimensions = [...physical.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map(m => m.slice(1).map(Number));
  assert.equal(dimensions.length, 12);
  assert.ok(dimensions.every(([w, h]) => w === 612 && h === 792));
  const errors = [];
  const measurements = await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => errors.push(request.url()));
    await page.emulateMedia({ media: 'print' });
    const results = [];
    for (const { meta } of pages) {
      const document = readFileSync(htmlPath(meta.pageNumber));
      assert.equal(hash(document), hash(current.singles[meta.pageNumber - 1]));
      assert.equal(readFileSync(`${singlePdf(meta.pageNumber)}.sourcehash`, 'utf8'), hash(document));
      assert.deepEqual(info(singlePdf(meta.pageNumber)), { pages: 1, dimensions: [612, 792] });
      await page.setContent(document.toString('utf8'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const sheet = document.querySelector('.np-sheet'), rect = sheet.getBoundingClientRect();
        const rows = [...sheet.querySelectorAll('.np-guide')];
        const boxes = [...sheet.querySelectorAll('header, footer, .np-number, .np-guide, .np-count-color, .np-game, .np-art, .np-choices')];
        return { title: sheet.querySelector('h1').textContent, width: rect.width, height: rect.height,
          numbers: rows.map(row => Number(row.dataset.number)),
          dots: [...sheet.querySelectorAll('.np-frames')].map(frame => frame.querySelectorAll('.np-dot').length),
          traceCopies: rows.map(row => row.querySelectorAll('.trace-mark').length),
          tryCells: rows.map(row => row.querySelectorAll('.try-cell').length),
          modelCopies: rows.map(row => row.querySelectorAll('.model-mark').length),
          pictures: [...sheet.querySelectorAll('.np-game')].map(game => game.querySelectorAll('.np-count-picture').length),
          choices: [...sheet.querySelectorAll('.np-game')].map(game => [...game.querySelectorAll('.np-choice')].map(choice => Number(choice.textContent))),
          coloringArt: sheet.querySelectorAll('.np-art svg[aria-label]').length,
          safeMargins: boxes.every(box => { const b = box.getBoundingClientRect(); return b.left >= rect.left + 47.5 && b.right <= rect.right - 47.5 && b.top >= rect.top + 47.5 && b.bottom <= rect.bottom - 47.5; }),
          noOverflow: sheet.scrollWidth <= sheet.clientWidth && sheet.scrollHeight <= sheet.clientHeight && [...sheet.querySelectorAll('div, header, section, footer')].every(e => e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1),
          glyphsFit: rows.every(row => [...row.querySelectorAll('.model-mark, .trace-mark')].every((mark, index) => { const b = mark.getBBox(), t = mark.transform.baseVal.consolidate().matrix; return b.x + t.e >= index * 144 && b.x + b.width + t.e < (index + 1) * 144 && b.y + t.f >= 0 && b.y + b.height + t.f < 140; })),
          numeralGuideInches: rows.map(row => 72 * row.getBoundingClientRect().width / 720 / 96),
        };
      });
      assert.equal(m.title, meta.title);
      assert.deepEqual(m.numbers, meta.numbers); assert.deepEqual(m.dots, meta.numbers);
      assert.deepEqual(m.traceCopies, meta.numbers.map(() => 3));
      assert.deepEqual(m.tryCells, meta.numbers.map(() => 1)); assert.deepEqual(m.modelCopies, meta.numbers.map(() => 1));
      assert.deepEqual(m.pictures, meta.pictureCounts);
      if (meta.games) assert.deepEqual(m.choices, meta.games.map(game => game.choices));
      assert.equal(m.coloringArt, meta.kind === 'practice' ? 2 : 0);
      assert.deepEqual([m.width, m.height], [816, 1056]);
      assert.ok(m.safeMargins && m.noOverflow && m.glyphsFit, `Layout failure on page ${meta.pageNumber}: ${JSON.stringify(m)}`);
      assert.ok(m.numeralGuideInches.every(height => Math.abs(height - .75) < .001));
      results.push({ page: meta.pageNumber, ...m });
    }
    return results;
  });
  assert.deepEqual(errors, []);
  const result = { status: 'PASS', pages: 12, practiceNumbers: 20, countingBreaks: 2, pdf: pdfPath,
    dimensionsPoints: [612, 792], browserErrors: errors, measurements };
  save(path.join(out, 'verification.json'), JSON.stringify(result, null, 2));
  console.log('PASS: 12 US Letter pages; numbers 1-20 in order; exact dot/picture quantities; tracing and blank cells; .75-inch guides; safe margins; no overflow or browser errors.');
}
const operations = { build, pdf, screenshots, rasterize, verify };
if (stage === 'all') for (const operation of Object.values(operations)) await operation();
else await operations[stage]();
