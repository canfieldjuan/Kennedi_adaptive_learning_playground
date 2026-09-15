import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocument } from '../src/render.mjs';
import { pages } from '../src/content/book-2.mjs';

// Mirrors build.mjs exactly (see that file), pointed at book-2.mjs and a
// separate dist-book-2/ output tree -- kept fully separate from dist/ so
// this validation-phase build can never collide with or disturb Book 1's
// already-committed build output.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist-book-2');
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
    title: `Kennedi's ABC Book - Book 2 - Page ${meta.pageNumber}: ${meta.title}`,
    bodyHtml,
  });
  writeFileSync(path.join(pagesDir, `page-${num}.html`), singleDoc, 'utf8');

  combinedBody += `<p class="preview-label">Page ${meta.pageNumber} &mdash; ${meta.title}</p>\n${bodyHtml}\n`;
  manifest.push(meta);
}

const previewDoc = renderDocument({
  title: "Kennedi's ABC Book - Book 2 - Preview",
  bodyHtml: combinedBody,
});
writeFileSync(path.join(distDir, 'preview.html'), previewDoc, 'utf8');
writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Built ${sorted.length} pages.`);
console.log(`  dist-book-2/preview.html (all pages, browser preview)`);
console.log(`  dist-book-2/pages/page-NN.html (standalone, individually printable)`);
console.log(`  dist-book-2/manifest.json (page metadata)`);
