import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { alphabet, pages } from '../src/content/alphabet-practice.mjs';
import { renderDocument } from '../src/render.mjs';
import { inlineImageFile } from '../src/content/asset-inline.mjs';
import { savePdfHashes, assertPdfHashes, measureArtworkCrops, replacePdfRasters } from './print-artifacts.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const stage = args.shift() ?? 'all';
const stages = ['build', 'pdf', 'screenshots', 'rasterize', 'verify', 'all'];
if (!stages.includes(stage) || (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1]))) {
  throw new Error('Usage: node scripts/alphabet.mjs [build|pdf|screenshots|rasterize|verify|all] [--out DIRECTORY]');
}
const out = path.resolve(args[1] ?? path.join(root, 'dist-alphabet'));
const pdfPath = path.join(out, 'pdf', 'kennedi-alphabet-practice-a-z.pdf');
const num = number => String(number).padStart(2, '0');
const htmlPath = number => path.join(out, 'pages', `page-${num(number)}.html`);
const singlePdf = number => path.join(out, 'pdf', 'pages', `page-${num(number)}.pdf`);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const styles = readFileSync(path.join(root, 'src/styles/alphabet-practice.css'), 'utf8');
const poppler = tool => existsSync(`/usr/bin/${tool}`) ? `/usr/bin/${tool}` : tool;
function save(file, contents) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, contents, { mode: 0o600 });
}
function info(file) {
  const result = execFileSync(poppler('pdfinfo'), [file], { encoding: 'utf8' });
  return {
    pages: Number(result.match(/^Pages:\s+(\d+)/m)?.[1]),
    dimensions: result.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m)?.slice(1).map(Number),
  };
}
async function withBrowser(fn) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { return await fn(browser); } finally { await browser.close(); }
}

function documents(crops) {
  const bodies = pages.map(page => page.render(crops));
  return {
    singles: bodies.map((body, index) => renderDocument({ title: `Kennedi alphabet practice: ${pages[index].meta.letters.join(', ')}`, bodyHtml: `<style>${styles}</style>${body}` })),
    preview: renderDocument({
      title: 'Kennedi alphabet practice A-Z',
      bodyHtml: `<style>${styles}</style>${bodies.map((body, index) => `<p class="preview-label">Page ${index + 1}: ${pages[index].meta.letters.join(' / ')}</p>${body}`).join('\n')}`,
    }),
  };
}

async function build() {
  // Crop only the surrounding empty SVG canvas. Never change the source paths.
  // Measure the SVG root, not the transformed potrace group (different units).
  const crops = await withBrowser(browser => measureArtworkCrops(browser, root, alphabet.map(entry => entry.illustrationPath)));
  const manifest = pages.map(page => ({
    ...page.meta,
    cues: page.meta.cues.map(entry => ({ ...entry, viewBox: crops[entry.illustrationPath], sourceSha256: hash(readFileSync(path.join(root, entry.illustrationPath))) })),
  }));
  const rendered = documents(crops);
  for (const [index, document] of rendered.singles.entries()) save(htmlPath(index + 1), document);
  save(path.join(out, 'preview.html'), rendered.preview);
  save(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Built ${pages.length} illustrated pages, ${alphabet.length * 2} separate-case rows: ${out}`);
}

async function pdf() {
  await withBrowser(async browser => {
    const page = await browser.newPage();
    await page.emulateMedia({ media: 'print' });
    async function exportOne(source, destination) {
      const bytes = readFileSync(source); // render and hash the same snapshot
      await page.setContent(bytes.toString('utf8'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      await page.pdf({ path: destination, preferCSSPageSize: true, printBackground: true, tagged: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
      chmodSync(destination, 0o600);
      savePdfHashes(destination, bytes, save);
    }
    await exportOne(path.join(out, 'preview.html'), pdfPath);
    for (const { meta } of pages) await exportOne(htmlPath(meta.pageNumber), singlePdf(meta.pageNumber));
  });
  console.log(`Exported combined PDF and ${pages.length} individual PDFs: ${pdfPath}`);
}

async function screenshots() {
  await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1.5 });
    await page.emulateMedia({ media: 'print' });
    for (const { meta } of pages) {
      await page.setContent(readFileSync(htmlPath(meta.pageNumber), 'utf8'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const destination = path.join(out, 'screenshots', `page-${num(meta.pageNumber)}.png`);
      mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      await page.screenshot({ path: destination, fullPage: true });
      chmodSync(destination, 0o600);
    }
  });
  console.log(`Captured ${pages.length} browser screenshots.`);
}

async function rasterize() {
  assert.equal(info(pdfPath).pages, pages.length, 'Refuse to rasterize a wrong-length PDF.');
  const directory = path.join(out, 'pdf-raster');
  const images = replacePdfRasters(pdfPath, directory, pages.length);
  // A compact overview made from the actual PDF rasters, not HTML screenshots.
  assert.equal(images.length, pages.length, 'Unexpected/stale PDF raster pages.');
  const contact = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Alphabet PDF contact sheet</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eee;font:16px sans-serif}h1{margin:0 0 16px;font-size:24px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}figure{margin:0}img{width:100%;display:block;border:1px solid #ccc}figcaption{margin-bottom:6px;font-weight:bold}</style></head>
    <body><h1>Kennedi's alphabet practice / A-Z / PDF print proofs</h1><main>${images.map((file, index) => `<figure><figcaption>Page ${index + 1}: ${pages[index].meta.letters.join(' / ')}</figcaption><img alt="PDF page ${index + 1}" src="${inlineImageFile(path.join(directory, file))}"></figure>`).join('')}</main></body></html>`;
  save(path.join(out, 'contact-sheet.html'), contact);
  await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.setContent(contact, { waitUntil: 'load' });
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({ path: path.join(out, 'contact-sheet.png'), fullPage: true });
    chmodSync(path.join(out, 'contact-sheet.png'), 0o600);
  });
  console.log(`Rasterized the actual ${pages.length}-page PDF at 150 DPI: ${directory}`);
}

async function verify() {
  const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.map(entry => entry.letters), pages.map(page => page.meta.letters), 'Manifest row coverage/order drifted.');
  const savedCrops = Object.fromEntries(manifest.flatMap(entry => entry.cues.map(cue => [cue.illustrationPath, cue.viewBox])));
  const crops = await withBrowser(browser => measureArtworkCrops(browser, root, alphabet.map(entry => entry.illustrationPath)));
  assert.deepEqual(savedCrops, crops, 'Stale illustration crops; rebuild first.');
  const current = documents(crops);
  assert.equal(hash(readFileSync(path.join(out, 'preview.html'))), hash(current.preview), 'HTML is stale relative to current code/styles/content/art; rebuild first.');
  for (const [index, document] of current.singles.entries()) {
    assert.equal(hash(readFileSync(htmlPath(index + 1))), hash(document), `Page ${index + 1} HTML is stale; rebuild first.`);
  }
  const pdfInfo = info(pdfPath);
  assert.equal(pdfInfo.pages, pages.length);
  assert.deepEqual(pdfInfo.dimensions, [612, 792]);
  assertPdfHashes(pdfPath, current.preview);
  // Verify each physical PDF page, not just the document's default dimensions.
  const allInfo = execFileSync(poppler('pdfinfo'), ['-f', '1', '-l', String(pages.length), pdfPath], { encoding: 'utf8' });
  const dimensions = [...allInfo.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map(match => match.slice(1).map(Number));
  assert.equal(dimensions.length, pages.length);
  assert.ok(dimensions.every(([width, height]) => width === 612 && height === 792));
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
      assertPdfHashes(singlePdf(meta.pageNumber), document);
      assert.deepEqual(info(singlePdf(meta.pageNumber)), { pages: 1, dimensions: [612, 792] });
      for (const cue of manifest[meta.pageNumber - 1].cues) {
        assert.equal(hash(readFileSync(path.join(root, cue.illustrationPath))), cue.sourceSha256, `Changed artwork: ${cue.illustrationPath}; rebuild first.`);
      }
      await page.setContent(document.toString('utf8'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const sheet = document.querySelector('.ap-sheet');
        const rect = sheet.getBoundingClientRect();
        const boxes = [...sheet.querySelectorAll('header, section, footer, .ap-guide, .ap-art, .ap-cue, h2')];
        const rows = [...sheet.querySelectorAll('.ap-guide')];
        return {
          title: sheet.querySelector('h1').textContent,
          width: rect.width, height: rect.height,
          letters: rows.map(row => row.dataset.letter),
          traceCopies: rows.map(row => row.querySelectorAll('.trace-mark').length),
          tryCells: rows.map(row => row.querySelectorAll('.try-cell').length),
          artCount: sheet.querySelectorAll('.ap-art svg[aria-label]').length,
          safeMargins: boxes.every(box => {
            const b = box.getBoundingClientRect();
            return b.left >= rect.left + 47.5 && b.right <= rect.right - 47.5 && b.top >= rect.top + 47.5 && b.bottom <= rect.bottom - 47.5;
          }),
          noOverflow: sheet.scrollWidth <= sheet.clientWidth && sheet.scrollHeight <= sheet.clientHeight
            && [...sheet.querySelectorAll('div, header, section, footer')].every(element => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1),
          uppercaseHeightInches: 72 * rows[0].getBoundingClientRect().width / 720 / 96,
          glyphsFit: rows.every(row => [...row.querySelectorAll('.model-mark, .trace-mark')].every(mark => {
            const b = mark.getBBox();
            const matrix = mark.transform.baseVal.consolidate().matrix;
            return b.x + matrix.e >= 0 && b.x + b.width + matrix.e < 617.14
              && b.y + matrix.f >= 0 && b.y + b.height + matrix.f <= 146;
          })),
          lowercaseBodiesAligned: rows.filter(row => 'abdgopq'.includes(row.dataset.letter)).every(row => {
            const bodyIndex = 'bdp'.includes(row.dataset.letter) ? 1 : 0;
            const body = row.querySelectorAll('.model-mark path')[bodyIndex].getBBox();
            return Math.abs(body.y - 54) < .01 && Math.abs(body.y + body.height - 90) < .01;
          }),
        };
      });
      assert.equal(m.title, meta.title);
      assert.deepEqual(m.letters, meta.letters);
      assert.deepEqual(m.traceCopies, [5, 5, 5, 5]);
      assert.deepEqual(m.tryCells, [1, 1, 1, 1]);
      assert.equal(m.artCount, 2);
      assert.deepEqual([m.width, m.height], [816, 1056]);
      assert.ok(m.safeMargins && m.noOverflow && m.glyphsFit && m.lowercaseBodiesAligned, `Layout failure on page ${meta.pageNumber}: ${JSON.stringify(m)}`);
      assert.ok(Math.abs(m.uppercaseHeightInches - .75) < .001);
      results.push({ page: meta.pageNumber, ...m });
    }
    return results;
  });
  assert.deepEqual(errors, []);
  for (const directory of ['pages', 'pdf/pages', 'screenshots', 'pdf-raster']) {
    const pattern = directory === 'pages' ? /^page-\d+\.html$/ : directory === 'pdf/pages' ? /^page-\d+\.pdf$/ : /^page-\d+\.png$/;
    assert.equal(readdirSync(path.join(out, directory)).filter(file => pattern.test(file)).length, pages.length, directory);
  }
  const result = { status: 'PASS', pages: pages.length, rows: alphabet.length * 2, pdf: pdfPath, dimensionsPoints: pdfInfo.dimensions, browserErrors: errors, measurements };
  save(path.join(out, 'verification.json'), JSON.stringify(result, null, 2));
  console.log(`PASS: ${pages.length} US Letter pages; ${alphabet.length * 2} correctly ordered rows; all individual PDFs, artwork hashes, source hashes, margins, glyph bounds and browser checks passed.`);
}

const operations = { build, pdf, screenshots, rasterize, verify };
if (stage === 'all') {
  for (const operation of Object.values(operations)) await operation();
} else await operations[stage]();
