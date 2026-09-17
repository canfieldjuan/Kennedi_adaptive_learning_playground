/**
 * Mirrors export-pdf.mjs (Book 1) for Book 2. page.pdf() goes through
 * Chromium's print pipeline, a different and more deterministic code path
 * than live on-screen compositing/screenshots -- confirmed necessary
 * directly: a live page.screenshot() of a book-2 page (dense with inline
 * SVGs) hit a real, reproducible Chromium compositor glitch that this
 * project's own established PDF-based pattern doesn't.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist-book-2');
const pdfDir = path.join(distDir, 'pdf');
const previewPath = path.join(distDir, 'preview.html');
const outPath = path.join(pdfDir, 'kennedis-workbook-book-2.pdf');
const hashPath = `${outPath}.sourcehash`;

mkdirSync(pdfDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  // Read once, hash that exact buffer, render that exact buffer -- see
  // export-pdf.mjs's doc comment for why (goto()'ing the path and
  // re-reading it separately leaves a window where a concurrent build
  // could change what's on disk between render and hash).
  const previewBuffer = readFileSync(previewPath);
  const sourceHash = createHash('sha256').update(previewBuffer).digest('hex');
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

  // Companion hash of the exact source this PDF was rendered from -- same
  // freshness-tracking purpose as export-pdf.mjs's own hashPath (see that
  // file's doc comment); Book 2 has no verify.mjs counterpart wired up yet
  // to consume it, but writing it now keeps the two books' PDF-export
  // scripts at parity and unblocks adding that check later without a
  // re-export.
  writeFileSync(hashPath, sourceHash, 'utf8');

  console.log(`Wrote ${path.relative(root, outPath)}`);
  console.log(`Wrote ${path.relative(root, hashPath)}`);
} finally {
  await browser.close();
}
