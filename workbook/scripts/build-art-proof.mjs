/**
 * Renders the art-direction integration proof pages (NOT part of the real
 * 6-page book) to dist-proof/. Owner-approval-required draft -- see
 * docs/art/asset-provenance.md.
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocument } from '../src/render.mjs';
import * as page01proof from '../src/content/proof-pages/page-01-cover-art-proof.mjs';
import * as page06proof from '../src/content/proof-pages/page-06-help-art-proof.mjs';
import * as sizeTestProof from '../src/content/proof-pages/print-size-test.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist-proof');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const pages = [page01proof, page06proof];
let combinedBody = '';
const manifest = [];

for (const pageModule of pages) {
  const { meta, render } = pageModule;
  const bodyHtml = render();
  const num = String(meta.pageNumber).padStart(2, '0');
  const singleDoc = renderDocument({
    title: `ART PROOF - Page ${meta.pageNumber}: ${meta.title}`,
    bodyHtml,
  });
  writeFileSync(path.join(distDir, `page-${num}-proof.html`), singleDoc, 'utf8');
  combinedBody += `<p class="preview-label">Page ${meta.pageNumber} &mdash; ${meta.title}</p>\n${bodyHtml}\n`;
  manifest.push(meta);
}

writeFileSync(path.join(distDir, 'preview.html'), renderDocument({ title: 'ART PROOF - Preview', bodyHtml: combinedBody }), 'utf8');
writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

// Size-test proof: standalone doc, not part of the page-shell preview (free-flowing height).
const sizeTestDoc = renderDocument({ title: 'ART PROOF - Real Print-Size Test', bodyHtml: sizeTestProof.render() });
writeFileSync(path.join(distDir, 'print-size-test.html'), sizeTestDoc, 'utf8');

console.log(`Built ${pages.length} art-proof pages + print-size-test.html -> dist-proof/`);
