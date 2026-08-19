import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocument } from '../src/render.mjs';
import { pages } from '../src/content/book-1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const pagesDir = path.join(distDir, 'pages');

rmSync(pagesDir, { recursive: true, force: true });
mkdirSync(pagesDir, { recursive: true });

const sorted = [...pages].sort((a, b) => a.meta.pageNumber - b.meta.pageNumber);

let combinedBody = '';
const manifest = [];

for (const pageModule of sorted) {
  const { meta, render } = pageModule;
  const bodyHtml = render();
  const num = String(meta.pageNumber).padStart(2, '0');

  const singleDoc = renderDocument({
    title: `Kennedi Is the Boss - Book 1 - Page ${meta.pageNumber}: ${meta.title}`,
    bodyHtml,
  });
  writeFileSync(path.join(pagesDir, `page-${num}.html`), singleDoc, 'utf8');

  combinedBody += `<p class="preview-label">Page ${meta.pageNumber} &mdash; ${meta.title}</p>\n${bodyHtml}\n`;
  manifest.push(meta);
}

const previewDoc = renderDocument({
  title: 'Kennedi Is the Boss - Book 1 - Preview',
  bodyHtml: combinedBody,
});
writeFileSync(path.join(distDir, 'preview.html'), previewDoc, 'utf8');
writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Built ${sorted.length} pages.`);
console.log(`  dist/preview.html (all pages, browser preview)`);
console.log(`  dist/pages/page-01.html .. page-${String(sorted.length).padStart(2, '0')}.html (standalone, individually printable)`);
console.log(`  dist/manifest.json (page metadata)`);
