import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const pdfDir = path.join(distDir, 'pdf');
const previewPath = path.join(distDir, 'preview.html');
const outPath = path.join(pdfDir, 'kennedi-is-the-boss-book-1.pdf');

mkdirSync(pdfDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(previewPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: outPath,
    width: '8.5in',
    height: '11in',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0in', bottom: '0in', left: '0in', right: '0in' },
  });
  console.log(`Wrote ${path.relative(root, outPath)}`);
} finally {
  await browser.close();
}
