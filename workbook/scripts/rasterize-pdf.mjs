/**
 * Rasterizes the actual generated PDF (not the HTML source) to PNGs via
 * poppler's pdftoppm, so we can visually inspect exactly what a printer
 * would receive. Requires poppler-utils (pdftoppm) on PATH.
 */
import { mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const pdfPath = path.join(distDir, 'pdf', 'kennedi-is-the-boss-book-1.pdf');
const rasterDir = path.join(distDir, 'pdf-raster');

if (!existsSync(pdfPath)) {
  console.error(`Missing ${path.relative(root, pdfPath)}. Run "npm run pdf" first.`);
  process.exit(1);
}

mkdirSync(rasterDir, { recursive: true });

try {
  execFileSync('pdftoppm', ['-png', '-r', '150', pdfPath, path.join(rasterDir, 'page')], { stdio: 'inherit' });
  console.log(`Rasterized PDF pages to ${path.relative(root, rasterDir)}/page-*.png`);
} catch (err) {
  console.error('pdftoppm failed (is poppler-utils installed?):', err.message);
  process.exit(1);
}
