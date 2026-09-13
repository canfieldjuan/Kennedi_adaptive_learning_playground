/**
 * Preview + spot-verify ONE page module without registering it in
 * src/content/book-1.mjs or touching dist/. For iterating on a new or
 * edited page before it's wired into the real book (see docs/design-system.md
 * step 4: "Render and inspect it at full-page and actual print scale").
 *
 * Runs the same checks as scripts/verify.mjs (console/page errors,
 * horizontal/vertical overflow, title-present) plus a full-page screenshot,
 * scoped to this one page, so a page author gets a fast inspect loop without
 * needing the page registered yet.
 *
 * Usage:
 *   node scripts/preview-page.mjs <path-to-page-module.mjs> [outDir]
 *
 * outDir defaults to a directory under the OS temp dir (never inside dist/,
 * so scratch iteration output never risks being committed).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import { chromium } from 'playwright';
import { renderDocument } from '../src/render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const modulePathArg = process.argv[2];
if (!modulePathArg) {
  console.error('Usage: node scripts/preview-page.mjs <path-to-page-module.mjs> [outDir]');
  process.exit(1);
}
const outDir = process.argv[3] || path.join(os.tmpdir(), 'kennedi-workbook-preview');
mkdirSync(outDir, { recursive: true });

const absModulePath = path.resolve(root, modulePathArg);
const mod = await import(pathToFileURL(absModulePath).href);
const { meta, render } = mod;
if (!meta || !render) {
  throw new Error(`${absModulePath} must export "meta" and "render" (see docs/design-system.md)`);
}

const bodyHtml = render();
const doc = renderDocument({
  title: `Preview - Page ${meta.pageNumber}: ${meta.title}`,
  bodyHtml,
});

const base = path.basename(absModulePath, '.mjs');
const htmlPath = path.join(outDir, `${base}.html`);
writeFileSync(htmlPath, doc, 'utf8');

const failures = [];
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });
  await page.emulateMedia({ media: 'print' });

  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  if (consoleErrors.length > 0) {
    failures.push(`console/page errors: ${consoleErrors.join(' | ')}`);
  }

  // Same check as scripts/verify.mjs's title check (fixed there first) --
  // this tool had the identical weak spot: checking whether meta.title
  // appears anywhere in the document trivially passes via the <title> tag
  // renderDocument() always injects, regardless of whether the actual
  // visible <h1> is missing or says something else. Compare the extracted,
  // normalized <h1> text instead.
  const h1Match = doc.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const normalize = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, '').toLowerCase();
  if (!meta.title) {
    failures.push('meta.title is missing');
  } else if (!h1Match) {
    failures.push('no <h1> found in rendered HTML');
  } else if (normalize(h1Match[1]) !== normalize(meta.title)) {
    failures.push(`<h1> text "${h1Match[1].replace(/<[^>]+>/g, '')}" does not match meta.title "${meta.title}"`);
  }

  const overflow = await page.evaluate(() => {
    const sheet = document.querySelector('.sheet');
    if (!sheet) return { noSheet: true };
    const result = { horizontal: [], vertical: [] };
    const nodes = [sheet, ...sheet.querySelectorAll('*')];
    for (const el of nodes) {
      if (el.scrollWidth - el.clientWidth > 2) result.horizontal.push(el.className || el.tagName);
      if (el.scrollHeight - el.clientHeight > 2) {
        result.vertical.push(el === sheet ? '.sheet (page overflow)' : (el.className || el.tagName));
      }
    }
    return result;
  });
  if (overflow.noSheet) {
    failures.push('no .sheet element found');
  } else {
    if (overflow.horizontal.length > 0) failures.push(`horizontal overflow in [${overflow.horizontal.join(', ')}]`);
    if (overflow.vertical.length > 0) failures.push(`vertical overflow in [${overflow.vertical.join(', ')}]`);
  }

  const pngPath = path.join(outDir, `${base}.png`);
  await page.screenshot({ path: pngPath });

  console.log(`HTML:  ${htmlPath}`);
  console.log(`PNG:   ${pngPath}`);
  if (failures.length > 0) {
    console.log(`\nFAIL (${failures.length}):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('\nOK: title present, no console/page errors, no overflow.');
  }
} finally {
  await browser.close();
}
