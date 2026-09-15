/**
 * Mirrors rasterize-pdf.mjs (Book 1) for Book 2 -- rasterizes the actual
 * generated PDF (not the HTML source) via poppler's pdftoppm, so pages
 * can be inspected exactly as a printer would receive them, and so a page
 * silently overflowing its `.sheet` onto an extra PDF page (an actual bug
 * hit once building this book's pages -- see letter-page.mjs's git
 * history / scripts/mockup-alphabet-layout.mjs's page-count check) is
 * visible as an extra page-N.png instead of silently dropped.
 */
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist-book-2');
const pdfPath = path.join(distDir, 'pdf', 'kennedis-workbook-book-2.pdf');
const rasterDir = path.join(distDir, 'pdf-raster');

if (!existsSync(pdfPath)) {
  console.error(`Missing ${path.relative(root, pdfPath)}. Run "node scripts/export-pdf-book-2.mjs" first.`);
  process.exit(1);
}

rmSync(rasterDir, { recursive: true, force: true });
mkdirSync(rasterDir, { recursive: true });

execFileSync('pdftoppm', ['-png', '-r', '150', pdfPath, path.join(rasterDir, 'page')], { stdio: 'inherit' });
console.log(`Rasterized PDF pages to ${path.relative(root, rasterDir)}/page-*.png`);
