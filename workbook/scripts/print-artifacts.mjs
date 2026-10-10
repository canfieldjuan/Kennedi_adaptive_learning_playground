import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, mkdtempSync, readdirSync, chmodSync, lstatSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';
import { inlineSvgFile } from '../src/content/asset-inline.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function withPrintBrowser(fn) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { return await fn(browser); } finally { await browser.close(); }
}
export function printTool(tool, args, options) {
  assert.ok(['pdfinfo', 'pdftoppm'].includes(tool), 'Unknown print tool.');
  return execFileSync(tool, args, options); // Resolve installed Poppler through PATH.
}
export function savePdfHashes(file, source, save) {
  save(`${file}.sourcehash`, hash(source));
  save(`${file}.sha256`, hash(readFileSync(file)));
}
export function assertPdfHashes(file, source) {
  assert.equal(readFileSync(`${file}.sourcehash`, 'utf8'), hash(source), `Stale PDF: ${file}`);
  assert.equal(readFileSync(`${file}.sha256`, 'utf8'), hash(readFileSync(file)), `Altered PDF: ${file}`);
}

// Build and verification must execute the same live crop producer, not trust
// a saved viewBox to describe what today's build would produce.
export async function measureArtworkCrops(browser, root, assets) {
  const page = await browser.newPage();
  try {
    await page.setContent(assets.map(asset => `<div style="width:1024px;height:1024px">${inlineSvgFile(path.join(root, asset))}</div>`).join(''));
    const bounds = await page.evaluate(() => [...document.querySelectorAll('svg')].map(svg => {
      const { x, y, width, height } = svg.getBBox(); return { x, y, width, height };
    }));
    assert.equal(bounds.length, assets.length);
    return Object.fromEntries(bounds.map((b, index) => {
      assert.ok(b.width > 0 && b.height > 0, `Empty art: ${assets[index]}`);
      return [assets[index], [b.x - b.width * .06, b.y - b.height * .06, b.width * 1.12, b.height * 1.12].map(n => n.toFixed(2)).join(' ')];
    }));
  } finally { await page.close(); }
}

export function stageInventory(directory) {
  const existing = lstatSync(directory, { throwIfNoEntry: false });
  assert.ok(!existing || (existing.isDirectory() && !existing.isSymbolicLink()), 'Artifact output must be a real directory, not a symlink.');
  mkdirSync(path.dirname(directory), { recursive: true, mode: 0o700 });
  const staging = mkdtempSync(path.join(path.dirname(directory), `.${path.basename(directory)}-`));
  return { directory: staging, publish(expected) {
    assert.ok(Array.isArray(expected) && expected.length > 0 && new Set(expected).size === expected.length
      && expected.every(name => typeof name === 'string' && name && name === path.basename(name) && !['.', '..'].includes(name)), 'Invalid artifact inventory.');
    const files = readdirSync(staging).sort();
    assert.deepEqual(files, [...expected].sort(), 'Unexpected artifact inventory.');
    assert.ok(files.every(name => lstatSync(path.join(staging, name)).isFile()), 'Artifact inventory must contain regular files.');
    files.forEach(name => chmodSync(path.join(staging, name), 0o600));
    const current = lstatSync(directory, { throwIfNoEntry: false });
    assert.ok(current?.ino === existing?.ino && current?.dev === existing?.dev, 'Artifact output changed during generation.');
    // Validate first; preserve the complete previous inventory and annotations.
    const previous = `${staging}.previous`;
    if (existing) renameSync(directory, previous);
    try { renameSync(staging, directory); }
    catch (error) {
      if (existing) renameSync(previous, directory);
      throw error;
    }
    if (existing) console.log(`Previous artifact inventory preserved: ${previous}`);
    return files;
  } };
}

export function readPdfRasterInventory(directory, pages) {
  assert.ok(Number.isSafeInteger(pages) && pages > 0, 'Expected a positive raster page count.');
  const output = lstatSync(directory);
  assert.ok(output.isDirectory() && !output.isSymbolicLink(), 'Raster inventory must be a real directory.');
  const images = readdirSync(directory).sort((a, b) =>
    Number(/^page-(\d+)\.png$/.exec(a)?.[1]) - Number(/^page-(\d+)\.png$/.exec(b)?.[1]));
  assert.deepEqual(images.map(name => /^page-(\d+)\.png$/.exec(name)?.[1]).map(Number),
    Array.from({ length: pages }, (_, index) => index + 1), 'Unexpected raster page inventory.');
  assert.ok(images.every(name => lstatSync(path.join(directory, name)).isFile()), 'Raster inventory must contain regular files.');
  return images;
}

export function replacePdfRasters(file, directory, pages, grayscale = false) {
  assert.ok(Number.isSafeInteger(pages) && pages > 0, 'Expected a positive raster page count.');
  const inventory = stageInventory(directory);
  const staging = inventory.directory;
  printTool('pdftoppm', ['-png', ...(grayscale ? ['-gray'] : []), '-r', '150', file, path.join(staging, 'page')], { stdio: 'inherit' });
  const images = readPdfRasterInventory(staging, pages);
  inventory.publish(images);
  return images;
}
