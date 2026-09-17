import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import { svgWrap } from '../illustrations/svg-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../..');

// Real glyph advance widths, for LAYOUT/SPACING only (never for the trace
// dots themselves -- those still come from the skeleton points below).
// Static weight-800 instance (see tools/generate-letter-outlines.mjs's
// sibling doc comment / this project's earlier font-instancing work) --
// advance width barely varies across this font's weight axis, so one
// static instance is a fine stand-in for measuring any weight actually
// rendered.
//
// Why not measure width from the skeleton points' own x-spread (the
// original approach here)? Confirmed broken, not just imprecise: for a
// letter whose skeleton is (near-)purely a single vertical stroke -- I,
// i, l for certain, J/j/t partially -- every skeleton point sits at
// nearly the SAME x-coordinate (min/max x only ~4-6 units apart, pure
// line-thickness noise), so max(xs)-min(xs) measures essentially zero
// width instead of the glyph's real ~230-330-unit advance width. This
// silently produced almost no gap between a combined unit's two
// characters -- confirmed directly: "Ii" rendered its "I" and "i" only
// ~7 units apart at font-size ~115, visually overlapping into what read
// as a single garbled glyph, caught by rendering the real page (not
// assumed from code review). Swept all 52 letters against fontkit's
// advanceWidth to confirm the exact affected set before fixing broadly,
// not just patching the two letters first noticed.
const GLYPH_FONT_PATH = path.join(WORKBOOK, 'design-source/fonts/Baloo2-800-static.ttf');
const GLYPH_FONT = fontkit.openSync(GLYPH_FONT_PATH);

function glyphAdvanceWidth(char, targetFontSize) {
  const glyph = GLYPH_FONT.glyphForCodePoint(char.codePointAt(0));
  return (glyph.advanceWidth / GLYPH_FONT.unitsPerEm) * targetFontSize;
}

// The solid demo letter -- both soloLetter()'s own output and
// dottedLetterRow()'s first (demo) cell, which must match it -- was too
// heavy at Baloo 2's boldest weight (800, what the rest of this book's
// display type uses): "the solid letters are too bold/thick" once seen at
// real tracing-page scale next to thin dotted copies. 700 keeps it
// clearly a solid, confident model letter without reading as over-inked.
const SOLID_WEIGHT = 700;

// Pre-computed once by tools/generate-letter-outlines.mjs, not derived at
// build time -- see that file's own doc comment for why (font-internal
// overlapping subpaths on at least one letter give wrong results if
// walked directly; rasterizing+re-vectorizing, the same way every other
// asset in this book is produced, sidesteps that). `canvas`/`fontSize`/
// `baselineY` describe the shared coordinate convention every letter's
// points were captured in: a `canvas`x`canvas` viewBox, glyph drawn at
// `fontSize`, baseline at `baselineY`. `points[char]` is a long,
// evenly-arc-length-spaced array of [x,y] pairs walking the letter's full
// traced outline (all contours -- silhouette, counters/holes, and any
// disconnected parts like i's dot, in one continuous walk) in that space.
const DOTS_PATH = path.join(WORKBOOK, 'design-source/fonts/letter-outline-dots.json');
const { canvas: SRC_CANVAS, fontSize: SRC_FONT_SIZE, baselineY: SRC_BASELINE_Y, points: RAW_POINTS } = JSON.parse(readFileSync(DOTS_PATH, 'utf8'));

function rawPointsFor(char) {
  const pts = RAW_POINTS[char];
  if (!pts) throw new Error(`letter-tracing.mjs: no precomputed outline for ${JSON.stringify(char)} -- run tools/generate-letter-outlines.mjs`);
  return pts;
}

/**
 * Evenly-spaced dots along a letter's outline, resampled from the dense
 * precomputed point array by taking every `stride`-th point.
 *
 * A FIXED STRIDE (not a fixed target dot count) is the right knob here:
 * every letter's precomputed points were walked at the same true
 * arc-length spacing (tools/generate-letter-outlines.mjs's DOT_SPACING,
 * applied uniformly across all 52 letters), so raw point COUNT is already
 * directly proportional to that letter's real traced perimeter --
 * confirmed directly (post coordinate-transform fix): "I" (a short,
 * simple bar) has 893 precomputed points, "A" (longer, plus a full
 * enclosed counter needing its own separate traced loop) has 1612, "W"
 * (longest/most complex) has 2426. A fixed target COUNT was tried first
 * and rejected: forcing every letter to ~16 dots starved multi-contour
 * letters like "A"/"B"/"g" of enough dots to read as a coherent shape
 * (16 dots split between an outer silhouette AND an inner counter loop is
 * too sparse for either), while a fixed stride naturally gives complex
 * letters proportionally more dots and simple letters fewer, matching how
 * dense a real dot-to-dot trace needs to be at each letter's own
 * complexity -- verified by rendering both and comparing.
 */
function sampleDots(char, stride) {
  if (!Number.isFinite(stride) || stride <= 0) {
    throw new Error(`sampleDots: stride must be a positive finite number, got ${stride}`);
  }
  const raw = rawPointsFor(char);
  const out = [];
  for (let i = 0; i < raw.length; i += stride) out.push(raw[i]);
  return out;
}

/**
 * Maps a point in the precomputed outline's own coordinate space (see the
 * DOTS_PATH convention above) into the caller's target layout: horizontal
 * center `cx`, target `fontSize`, target `baselineY`. Pure uniform
 * scale + offset -- the precomputed space and every caller in this file
 * share the same "glyph drawn at some font-size, baseline at some y"
 * shape, so no per-letter bbox math is needed to reposition/rescale one
 * into the other.
 */
function mapPoint([px, py], cx, targetFontSize, targetBaselineY) {
  const s = targetFontSize / SRC_FONT_SIZE;
  const x = cx + (px - SRC_CANVAS / 2) * s;
  const y = targetBaselineY + (py - SRC_BASELINE_Y) * s;
  return [x, y];
}

/**
 * Lays out a short string of 1+ characters (e.g. "A" or "Aa") left to
 * right as one combined unit: each character keeps its own real glyph
 * width (fontkit's advanceWidth -- see glyphAdvanceWidth()'s doc comment
 * for why NOT the skeleton points' own bbox), with a small fixed gap
 * between characters. Returns each character's own horizontal center
 * (`cx`, relative to the unit's own left edge at 0) plus the unit's total
 * width, so a caller can draw/trace each character separately (a
 * combined "Aa" is two independent glyphs sitting next to each other, not
 * one glyph) while still treating the pair as one positioned block.
 */
function layoutChars(chars, fontSize) {
  const GAP = fontSize * 0.06;
  let cursor = 0;
  const layout = [];
  for (const ch of chars) {
    const glyphW = glyphAdvanceWidth(ch, fontSize);
    layout.push({ ch, cx: cursor + glyphW / 2 });
    cursor += glyphW + GAP;
  }
  return { layout, totalW: cursor - GAP };
}

/**
 * One solid, filled demo letter (or short combined unit, e.g. "Aa") -- the
 * "show once" half of the OT show-once-then-repeat-trace pattern
 * practiceRow() already uses for pencil-control paths. Plain fill-based
 * <text> per character, same technique tracingWord() itself uses for its
 * own (safe) solid layer -- no stroke rendering, so the Chromium
 * tangled-glyph bug (see dottedLetterRow's doc comment) can't occur here
 * either. Sized off the SAME real glyph-width data (fontkit advanceWidth)
 * the dotted cells use, so the two visually match.
 */
export function soloLetter(chars, opts = {}) {
  const { height = 200, label = `the letter${chars.length > 1 ? 's' : ''} ${chars}` } = opts;
  const fontSize = height * 0.82;
  const baselineY = height * 0.72;
  const { layout, totalW } = layoutChars(chars, fontSize);
  const vbWidth = Math.round(totalW + fontSize * 0.5);
  const xOffset = (vbWidth - totalW) / 2;
  let inner = '';
  for (const { ch, cx } of layout) {
    inner += `<text x="${(xOffset + cx).toFixed(2)}" y="${baselineY}" text-anchor="middle" style="line-height:1;" font-family="'Baloo 2', sans-serif" font-weight="${SOLID_WEIGHT}" font-size="${fontSize}" fill="#000">${ch}</text>`;
  }
  return `<div class="solo-letter">${svgWrap(`0 0 ${vbWidth} ${height}`, inner, { label })}</div>`;
}

/**
 * One row: a solid demo letter (or combined unit, e.g. "Aa"), then
 * `reps - 1` dotted copies to trace -- practiceRow()'s "show once,
 * repeat-trace" cell pattern, applied to a real letterform instead of an
 * abstract path shape.
 *
 * The trace copies are NOT a stroked/dashed outline of the glyph, and NOT
 * tracingWord()'s halo-ring technique either -- both were explicitly
 * rejected for this page. tracingWord() itself documents why stroking the
 * glyph directly is unsafe (Chromium exposes tangled, self-intersecting
 * contours baked into several of this font's glyphs when stroked), and
 * its own fix (a halo of translated fill copies) reads as a thick hollow
 * "bubble" letter -- fine for the word-tracing it was built for, twice
 * explicitly rejected for this one: "I don't want hollow letters like
 * bubbles letters. I want a simple A B C", and again after the first
 * dotted version still outlined a bold glyph's perimeter: "The letters
 * are still bubble letters. the tracing versions are just hollow
 * versions of the filled in black letters."
 *
 * The actual fix: dots follow the letter's morphological SKELETON (a true
 * single-pixel-wide centerline, not the boundary of a filled shape -- see
 * tools/generate-letter-outlines.mjs for how that's captured and why),
 * so there is no separate inner/outer edge to read as a ring, dotted or
 * not. Every dot is its own independent filled circle -- no stroke
 * rendering of the glyph anywhere in this technique, so the tangled-glyph
 * bug tracingWord() exists to avoid can't occur here either. Pure black
 * dots (not a lighter/gray fill) for the same reason every other asset in
 * this book stays pure black: a light fill risks disappearing on a cheap
 * home printer (docs/design-system.md's hard rule #1), where a small
 * solid black dot at normal print size does not.
 */
export function dottedLetterRow(chars, opts = {}) {
  const {
    reps = 4,
    height = 140,
    dotStride = 55, // sample every Nth precomputed outline point -- see sampleDots()
    dotRadiusFrac = 0.02, // dot radius, as a fraction of fontSize -- "the dots... are too [thick]" at 0.028
    label = `trace the letter${chars.length > 1 ? 's' : ''} ${chars}`,
  } = opts;

  const fontSize = height * 0.82;
  const baselineY = height * 0.72;
  const dotR = fontSize * dotRadiusFrac;

  const { layout, totalW } = layoutChars(chars, fontSize);
  const cellW = totalW + fontSize * 0.5; // breathing room each side
  const vbWidth = cellW * reps;
  const xOffsetInCell = (cellW - totalW) / 2;

  function demoCell(cellCx) {
    const left = cellCx - cellW / 2 + xOffsetInCell;
    let out = '';
    for (const { ch, cx } of layout) {
      out += `<text x="${(left + cx).toFixed(2)}" y="${baselineY}" text-anchor="middle" style="line-height:1;" font-family="'Baloo 2', sans-serif" font-weight="${SOLID_WEIGHT}" font-size="${fontSize}" fill="#000">${ch}</text>`;
    }
    return out;
  }

  function dottedCell(cellCx) {
    const left = cellCx - cellW / 2 + xOffsetInCell;
    let out = '';
    for (const { ch, cx } of layout) {
      const dots = sampleDots(ch, dotStride);
      for (const p of dots) {
        const [x, y] = mapPoint(p, left + cx, fontSize, baselineY);
        out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${dotR.toFixed(2)}" fill="#000"/>`;
      }
    }
    return out;
  }

  let cells = '';
  for (let i = 0; i < reps; i++) {
    const cx = cellW * i + cellW / 2;
    cells += i === 0 ? demoCell(cx) : dottedCell(cx);
  }
  return `<div class="dotted-letter-row">${svgWrap(`0 0 ${vbWidth} ${height}`, cells, { label })}</div>`;
}
