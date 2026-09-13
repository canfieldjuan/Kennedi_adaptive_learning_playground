import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const pdfDir = path.join(distDir, 'pdf');
const previewPath = path.join(distDir, 'preview.html');
const outPath = path.join(pdfDir, 'kennedi-is-the-boss-book-1.pdf');
const hashPath = `${outPath}.sourcehash`;

mkdirSync(pdfDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();

  // Read the source once into a buffer, hash THAT buffer, and render THAT
  // same buffer via setContent() -- goto()'ing the file path and separately
  // re-reading it after page.pdf() resolves (the first version of this)
  // left a window, spanning the whole PDF-render duration, where a
  // concurrent `npm run build` could rewrite dist/preview.html on disk: the
  // PDF would bake in whatever Chrome read at goto-time, but the recorded
  // hash would capture the newer content written after that, so
  // verify.mjs's later comparison against a fresh read matches and reports
  // an (actually stale) PDF as fresh. Reading once and rendering that exact
  // buffer makes "what got hashed" and "what got rendered" the same bytes
  // by construction, not by timing. Safe to swap goto -> setContent here
  // specifically because preview.html is fully self-contained (fonts/CSS
  // inlined as data URIs by render.mjs) with no relative-path, fetch(), or
  // location/baseURI dependence anywhere in render.mjs, build.mjs, or the
  // page components (checked) -- so setContent renders it identically to a
  // file:// goto.
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
    // Tagged (accessible) PDF: without this, the committed PDF has no
    // structure tree or marked-content metadata at all, so a screen-reader
    // user opening the advertised "print-ready deliverable" loses every
    // heading and image description present in the HTML source it's
    // rendered from. Supported by the pinned Playwright version (checked
    // node_modules/playwright-core/types/types.d.ts) and by channel:
    // 'chrome' the same as Chromium, since tagging is a Chrome PDF-printing
    // feature, not Playwright's own.
    tagged: true,
  });

  // Companion hash of the exact source this PDF was rendered from, so
  // verify.mjs can tell a fresh PDF from a stale one by more than page
  // count/size/title -- a body-only edit (wording, a swapped illustration,
  // shared CSS) changes preview.html without changing any page's title, so
  // a title-only freshness check (the first version of this) can't catch
  // it. previewBuffer above is exactly what got rendered (see setContent
  // above), and it's fully self-contained (fonts/CSS inlined by
  // render.mjs), so its hash captures every page's complete rendered
  // content and every shared style in one value.
  writeFileSync(hashPath, sourceHash, 'utf8');

  console.log(`Wrote ${path.relative(root, outPath)}`);
  console.log(`Wrote ${path.relative(root, hashPath)}`);
} finally {
  await browser.close();
}
