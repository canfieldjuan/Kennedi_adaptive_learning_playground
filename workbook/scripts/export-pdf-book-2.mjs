/**
 * Mirrors export-pdf.mjs (Book 1) for Book 2. page.pdf() goes through
 * Chromium's print pipeline, a different and more deterministic code path
 * than live on-screen compositing/screenshots -- confirmed necessary
 * directly: a live page.screenshot() of a book-2 page (dense with inline
 * SVGs) hit a real, reproducible Chromium compositor glitch that this
 * project's own established PDF-based pattern doesn't.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist-book-2');
const pdfDir = path.join(distDir, 'pdf');
const previewPath = path.join(distDir, 'preview.html');
const outPath = path.join(pdfDir, 'kennedis-workbook-book-2.pdf');

mkdirSync(pdfDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  const previewBuffer = readFileSync(previewPath);
  await page.setContent(previewBuffer.toString('utf8'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: outPath,
    width: '8.5in',
    height: '11in',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0in', bottom: '0in', left: '0in', right: '0in' },
    tagged: true,
  });
  console.log(`Wrote ${path.relative(root, outPath)}`);
} finally {
  await browser.close();
}
