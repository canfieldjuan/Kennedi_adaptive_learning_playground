import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const pagesDir = path.join(distDir, 'pages');
const shotsDir = path.join(distDir, 'screenshots');

// Clean before writing (same pattern build.mjs already uses for dist/pages/)
// so a page removed from the manifest doesn't leave its old screenshot
// behind alongside the current set -- this only writes one file per
// manifest entry, it never removes a stale extra on its own.
rmSync(shotsDir, { recursive: true, force: true });
mkdirSync(shotsDir, { recursive: true });

const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf8'));

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({
    viewport: { width: 816, height: 1056 },
    deviceScaleFactor: 2,
  });
  await page.emulateMedia({ media: 'print' });

  for (const meta of manifest) {
    const num = String(meta.pageNumber).padStart(2, '0');
    const filePath = path.join(pagesDir, `page-${num}.html`);
    await page.goto(pathToFileURL(filePath).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const outPath = path.join(shotsDir, `page-${num}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Wrote ${path.relative(root, outPath)}`);
  }
} finally {
  await browser.close();
}
