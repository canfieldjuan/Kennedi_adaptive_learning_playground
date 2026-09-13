/**
 * Deterministic print-layout checks. Fails (non-zero exit) on any problem.
 * Run after `npm run build && npm run pdf`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const pagesDir = path.join(distDir, 'pages');
const pdfPath = path.join(distDir, 'pdf', 'kennedi-is-the-boss-book-1.pdf');

const failures = [];
const ok = (msg) => console.log(`  OK   ${msg}`);
const fail = (msg) => { console.log(`  FAIL ${msg}`); failures.push(msg); };

if (!existsSync(path.join(distDir, 'manifest.json'))) {
  console.error('dist/manifest.json missing. Run "npm run build" first.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf8'));
const expectedPageCount = manifest.length;

console.log(`\nVerifying ${expectedPageCount}-page workbook build\n`);

// --- PDF checks (poppler pdfinfo) ------------------------------------------
console.log('PDF (pdfinfo):');
if (!existsSync(pdfPath)) {
  fail(`missing ${path.relative(root, pdfPath)} - run "npm run pdf" first`);
} else {
  const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const pagesMatch = info.match(/^Pages:\s+(\d+)/m);
  const sizeMatch = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);

  const pageCount = pagesMatch ? parseInt(pagesMatch[1], 10) : -1;
  if (pageCount === expectedPageCount) ok(`page count == ${expectedPageCount}`);
  else fail(`page count is ${pageCount}, expected ${expectedPageCount}`);

  if (sizeMatch) {
    const w = parseFloat(sizeMatch[1]);
    const h = parseFloat(sizeMatch[2]);
    const within = (v, target) => Math.abs(v - target) < 1;
    if (within(w, 612) && within(h, 792)) ok('page size == US Letter (612 x 792 pts)');
    else fail(`page size is ${w} x ${h} pts, expected 612 x 792 pts (US Letter)`);
  } else {
    fail('could not parse page size from pdfinfo output');
  }

  // --- PDF content freshness (poppler pdftotext) ---------------------------
  // Page count and page size can both stay unchanged while the PDF itself
  // goes stale -- editing an existing page's content or shared CSS and
  // running only `npm run build` (which rewrites dist/pages/*.html, not the
  // PDF) leaves the OLD PDF in place, and the two checks above have nothing
  // to catch that: same count, same US Letter size, silently wrong content.
  // Extract each PDF page's own text and confirm it still contains that
  // page's current title, the same correspondence the <h1> check above
  // enforces for the HTML -- if page N's title changed (or the PDF is from
  // before page N existed in the current manifest order), this fails where
  // the count/size checks would have silently passed.
  console.log('\nPDF content freshness (pdftotext):');
  for (const meta of manifest) {
    const pageText = execFileSync('pdftotext', ['-f', String(meta.pageNumber), '-l', String(meta.pageNumber), pdfPath, '-'], { encoding: 'utf8' });
    const normalize = (s) => s.replace(/\s+/g, '').toLowerCase();
    if (normalize(pageText).includes(normalize(meta.title))) {
      ok(`page ${meta.pageNumber}: PDF page text contains title "${meta.title}"`);
    } else {
      fail(`page ${meta.pageNumber}: PDF page text does not contain title "${meta.title}" -- PDF looks stale, run "npm run pdf" again`);
    }
  }
}

// --- Manifest / title checks -----------------------------------------------
console.log('\nPage titles:');
const seenNumbers = new Set();
for (const meta of manifest) {
  if (!meta.title || !meta.pageNumber) {
    fail(`manifest entry missing title/pageNumber: ${JSON.stringify(meta)}`);
    continue;
  }
  if (seenNumbers.has(meta.pageNumber)) fail(`duplicate pageNumber ${meta.pageNumber}`);
  seenNumbers.add(meta.pageNumber);

  const num = String(meta.pageNumber).padStart(2, '0');
  const filePath = path.join(pagesDir, `page-${num}.html`);
  if (!existsSync(filePath)) {
    fail(`missing dist/pages/page-${num}.html`);
    continue;
  }
  const html = readFileSync(filePath, 'utf8');
  // Check the visible <h1> (page-01's cover-title or every other page's
  // sheet-title), not just html.includes(meta.title) -- that trivially
  // passes via the <title> tag build.mjs injects into every document
  // regardless of what the h1 actually says, silently defeating the page
  // contract in docs/design-system.md ("title ... must exactly match the
  // <h1> text you render"). Normalize (strip tags/whitespace, lowercase)
  // before comparing: page 1's h1 is two <span>s ("KENNEDI" / "IS THE
  // BOSS") that only equal meta.title ("Kennedi Is The Boss") once
  // whitespace and case are ignored -- that's expected, not a bug.
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const normalize = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, '').toLowerCase();
  if (!h1Match) {
    fail(`page ${meta.pageNumber}: no <h1> found in dist/pages/page-${num}.html`);
  } else if (normalize(h1Match[1]) === normalize(meta.title)) {
    ok(`page ${meta.pageNumber}: visible <h1> matches title "${meta.title}"`);
  } else {
    fail(`page ${meta.pageNumber}: <h1> text "${h1Match[1].replace(/<[^>]+>/g, '')}" does not match meta.title "${meta.title}"`);
  }
}
for (let n = 1; n <= expectedPageCount; n++) {
  if (!seenNumbers.has(n)) fail(`no manifest entry for expected page ${n}`);
}

// --- Browser-based checks: console errors + overflow ------------------------
console.log('\nBrowser checks (console errors, overflow):');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  await page.emulateMedia({ media: 'print' });

  for (const meta of manifest) {
    const num = String(meta.pageNumber).padStart(2, '0');
    const filePath = path.join(pagesDir, `page-${num}.html`);
    if (!existsSync(filePath)) continue;

    const consoleErrors = [];
    const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
    const onPageError = (err) => consoleErrors.push(String(err));
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    await page.goto(pathToFileURL(filePath).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    if (consoleErrors.length === 0) ok(`page ${meta.pageNumber}: no console/page errors`);
    else fail(`page ${meta.pageNumber}: console/page errors: ${consoleErrors.join(' | ')}`);

    const overflow = await page.evaluate(() => {
      const sheet = document.querySelector('.sheet');
      if (!sheet) return { noSheet: true };
      const result = { horizontal: [], vertical: [] };
      const nodes = [sheet, ...sheet.querySelectorAll('*')];
      for (const el of nodes) {
        if (el.scrollWidth - el.clientWidth > 2) {
          result.horizontal.push(el.className || el.tagName);
        }
        if (el.scrollHeight - el.clientHeight > 2) {
          result.vertical.push(el === sheet ? '.sheet (page overflow)' : (el.className || el.tagName));
        }
      }
      return result;
    });

    if (overflow.noSheet) {
      fail(`page ${meta.pageNumber}: no .sheet element found`);
    } else {
      if (overflow.horizontal.length === 0) ok(`page ${meta.pageNumber}: no horizontal overflow`);
      else fail(`page ${meta.pageNumber}: horizontal overflow in [${overflow.horizontal.join(', ')}]`);

      if (overflow.vertical.length === 0) ok(`page ${meta.pageNumber}: no vertical overflow within sheet children`);
      else fail(`page ${meta.pageNumber}: vertical overflow in [${overflow.vertical.join(', ')}]`);
    }

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
} finally {
  await browser.close();
}

console.log('');
if (failures.length > 0) {
  console.error(`VERIFY FAILED: ${failures.length} problem(s) found.`);
  process.exit(1);
} else {
  console.log('VERIFY PASSED: all checks green.');
}
