#!/usr/bin/env node
/**
 * One-time prep tool (like comfy-generate.py / vectorize-line-art.sh):
 * renders each of the 52 letters (A-Z, a-z), rasterizes, and reduces each
 * to a single-stroke SKELETON trace via tools/skeletonize-and-trace.sh
 * (see that file's own doc comment for the technique and why), then
 * pre-computes evenly-arc-length-spaced points along each letter's
 * skeleton -- all 52 letters' point sets are saved together as
 * design-source/fonts/letter-outline-dots.json, which
 * src/components/letter-tracing.mjs reads at build time (a plain JSON
 * parse -- no font parsing, no browser, no shelling out to potrace needed
 * for a normal `npm run build`; all of that complexity lives here, in the
 * one-time prep step, not the main build path).
 *
 * SKELETON, not outline (revised from this script's first version):
 * tracing the OUTLINE of a bold/filled glyph -- this script's first
 * version -- necessarily produces two parallel boundary curves (the
 * shape's outer edge and inner edge). Dotting that boundary still reads
 * as a hollow "bubble letter", exactly what the owner explicitly rejected
 * for the solid-letter style earlier, and rejected AGAIN once dotted:
 * "The letters are still bubble letters. the tracing versions are just
 * hollow versions of the filled in black letters" -- with a hand-drawn
 * reference showing a single continuous stroke per letter, not any kind
 * of double-line ring. A true morphological skeleton has no separate
 * inner/outer edge -- it's topologically one line -- so points sampled
 * along it read as a single pen stroke. Rendered at a LIGHTER font weight
 * (SKELETON_WEIGHT, not the bold weight the solid "reveal" letter uses)
 * specifically because skeletonizing the very bold weight produced a
 * needlessly complex skeleton (extra branches from the thick, rounded
 * strokes) -- confirmed directly by comparing weights 800/400/300/200/100
 * side by side: 400 and lighter all skeletonize to the same clean,
 * simple single-stroke shape, closely matching the owner's hand-drawn
 * reference (peak, two legs, one crossbar for "A"), where 800 did not.
 * The solid reveal letter (soloLetter() in letter-tracing.mjs) is
 * unaffected -- it still renders bold text directly, not from this data.
 *
 * Why not read the glyph outline directly from the font file (e.g. via
 * fontkit) and skip the raster round-trip? Tried that first -- simpler in
 * principle, but this font's glyf outlines for at least one letter ("I")
 * are built from TWO separate, overlapping subpaths (evidently a
 * variable-font interpolation technique), which a naive path
 * reader/point-sampler treats as one continuous path and gets badly
 * wrong -- confirmed directly: the raw fontkit-derived outline for "I"
 * traced a nonsense blob, not a bar, because it walked both overlapping
 * subpaths in sequence instead of resolving them into the one solid shape
 * a nonzero-winding fill rule (which is how every browser actually
 * RENDERS the glyph, correctly) would produce. Rasterizing sidesteps this
 * entirely: it doesn't care how many overlapping subpaths the font's
 * internal representation uses, because it only ever sees the CORRECTLY
 * RENDERED pixels. Confirmed on "I": the skeleton is one single, clean,
 * correctly-shaped vertical stroke; spot-checked B/i/g too (multi-contour
 * counters and disconnected dot+stem shapes both resolve correctly).
 *
 * Why measure points via a real browser (Playwright's DOM
 * getTotalLength()/getPointAtLength()) instead of parsing potrace's
 * `<path d="...">` string directly with a JS path-math library? potrace
 * wraps its path in `<g transform="translate(...) scale(0.1,-0.1)">` --
 * hand-parsing the `d` string without applying that transform gives
 * coordinates in potrace's own internal units (~10x too large, Y-flipped;
 * this exact mistake already happened once this session measuring a
 * different asset's bbox, see page-06-helping-mission.mjs's git history).
 * Loading the real SVG into a browser and reading DOM geometry sidesteps
 * needing to hand-replicate that transform math at all.
 *
 * That said, getPointAtLength() itself is a trap here: per spec it returns
 * points in the path ELEMENT's own local user space -- it does NOT apply
 * the path's own `transform` attribute or any ancestor's (confirmed
 * directly: for A-upper.svg, getPointAtLength(0) returned (4775, 7519),
 * matching the raw `d="M4775 7519 ..."` data verbatim, NOT a point inside
 * the 0-1000 canvas). getCTM() looked like the fix but introduces its OWN
 * trap: it composes in the outer <svg>'s width/height-to-viewBox scaling,
 * and potrace emits those width/height in `pt` -- when Chromium sizes the
 * standalone SVG with no CSS override, 1000pt resolves to 1333.33 CSS px
 * (the 4/3 pt-to-px ratio), so getCTM()-transformed points landed in a
 * 0-1333.33 space, not 0-1000, a wrong-but-plausible-looking range that
 * would have silently corrupted every letter had it not been checked
 * against a known point. The actual fix: read the <g>'s own transform
 * attribute as a matrix (`g.transform.baseVal.consolidate().matrix`) and
 * apply THAT directly to each raw getPointAtLength() point via
 * matrixTransform() -- confirmed on the same point: (4775,7519) maps to
 * (477.5, 248.1), inside 0-1000 and matching where "A"'s stroke should be.
 *
 * Render convention every letter shares (so letter-tracing.mjs can treat
 * them uniformly without per-letter bbox math): CANVAS x CANVAS viewBox,
 * text baseline at BASELINE_Y, rendered at FONT_SIZE -- these three
 * numbers deliberately match the fontSize = height * 0.82 / baselineY =
 * height * 0.72 convention tracingWord()/soloLetter()/dottedLetterRow()
 * already use elsewhere in this book (CANVAS=1000 stands in for
 * "height=1000", a round, generously-sized rendering canvas -- not a real
 * page measurement).
 */
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { renderDocument } from '../src/render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outlinesDir = path.join(root, 'design-source/fonts/letter-outlines');
const dotsJsonPath = path.join(root, 'design-source/fonts/letter-outline-dots.json');
const tmpDir = path.join(root, 'dist', '.letter-outline-tmp');
mkdirSync(outlinesDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const CANVAS = 1000;
const FONT_SIZE = 820;
const BASELINE_Y = 720;
// Weight used ONLY for this script's skeleton-source rendering -- see the
// file doc comment for why lighter skeletonizes more cleanly than the
// bold weight the solid "reveal" letter (soloLetter()) renders elsewhere.
const SKELETON_WEIGHT = 400;
// Fixed, fairly fine arc-length spacing for the PRECOMPUTED point set --
// letter-tracing.mjs subsamples (every Nth point) at render time to reach
// whatever final on-page dot density looks right, without needing to
// re-run this prep step to retune spacing.
const DOT_SPACING = 14;

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];

function outFileFor(ch) {
  const isUpper = ch !== ch.toLowerCase();
  return `${ch}-${isUpper ? 'upper' : 'lower'}.svg`;
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: CANVAS, height: CANVAS } });

const dotsByChar = {};

for (const ch of LETTERS) {
  const glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
    <rect width="${CANVAS}" height="${CANVAS}" fill="#fff"/>
    <text x="${CANVAS / 2}" y="${BASELINE_Y}" text-anchor="middle" style="line-height:1;" font-family="'Baloo 2', sans-serif" font-weight="${SKELETON_WEIGHT}" font-size="${FONT_SIZE}" fill="#000">${ch}</text>
  </svg>`;
  const htmlPath = path.join(tmpDir, `glyph.html`);
  const pngPath = path.join(tmpDir, `glyph.png`);
  writeFileSync(htmlPath, renderDocument({ title: 'glyph raster', bodyHtml: glyphSvg }), 'utf8');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: CANVAS, height: CANVAS } });

  const outPath = path.join(outlinesDir, outFileFor(ch));
  execFileSync(path.join(root, 'tools/skeletonize-and-trace.sh'), [pngPath, outPath, '70']);

  // Load the traced SVG for real and read DOM geometry -- see the file
  // doc comment for why this (not hand-parsing the `d` string) is the
  // right way to get correctly-transformed points.
  const tracedSvg = readFileSync(outPath, 'utf8');
  await page.setContent(`<!DOCTYPE html><html><body>${tracedSvg}</body></html>`);
  const pts = await page.evaluate((spacing) => {
    const svgEl = document.querySelector('svg');
    const gEl = svgEl.querySelector('g');
    const pathEl = svgEl.querySelector('path');
    // getPointAtLength() returns points in the path's own local user
    // space -- it does NOT apply the <g>'s transform. Apply that matrix
    // ourselves (not getCTM(), which also composes in the outer <svg>'s
    // width/height-to-viewBox scaling and gets thrown off by potrace's
    // `pt` units -- see this file's doc comment) to land each point in
    // the real 0-CANVAS coordinate space.
    const m = gEl.transform.baseVal.consolidate().matrix;
    const total = pathEl.getTotalLength();
    const n = Math.max(8, Math.round(total / spacing));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const raw = pathEl.getPointAtLength((i / n) * total);
      const p = raw.matrixTransform(m);
      out.push([Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]);
    }
    return out;
  }, DOT_SPACING);

  dotsByChar[ch] = pts;
  console.log(`wrote ${path.relative(root, outPath)} (${pts.length} points)`);
}

await browser.close();
rmSync(tmpDir, { recursive: true, force: true });

writeFileSync(dotsJsonPath, JSON.stringify({
  canvas: CANVAS,
  fontSize: FONT_SIZE,
  baselineY: BASELINE_Y,
  dotSpacing: DOT_SPACING,
  points: dotsByChar,
}, null, 2), 'utf8');
console.log(`Generated ${LETTERS.length} letter outlines + ${path.relative(root, dotsJsonPath)}`);
