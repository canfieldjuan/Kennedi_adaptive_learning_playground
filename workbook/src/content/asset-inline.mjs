import { readFileSync } from 'node:fs';

/** Reads a potrace-exported SVG file and returns just the <svg>...</svg> markup, ready to inline in HTML (strips the XML/DOCTYPE prolog and <metadata>). */
export function inlineSvgFile(path) {
  const raw = readFileSync(path, 'utf8');
  const match = raw.match(/<svg[\s\S]*<\/svg>/);
  if (!match) throw new Error(`No <svg> found in ${path}`);
  return match[0]
    .replace(/<metadata>[\s\S]*?<\/metadata>/, '')
    .replace(/width="[0-9.]+pt"\s+height="[0-9.]+pt"/, 'width="100%" height="100%"');
}

/**
 * Reads a raster image (PNG/JPG) and returns a base64 data: URI, ready for
 * an <img src="..."> -- same self-containment goal as render.mjs's font
 * inlining. Use this instead of an absolute filesystem path in <img src>:
 * an absolute path only resolves on the machine that built it (it happens
 * to work under file:// on the machine that generated dist/, but breaks on
 * any other machine/CI/checkout path), whereas a data: URI travels with the
 * HTML anywhere, matching "every generated file works standalone" above.
 */
export function inlineImageFile(path) {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  const data = readFileSync(path).toString('base64');
  return `data:${mime};base64,${data}`;
}

/**
 * inlineSvgFile()'s output is the potrace SVG root exactly as traced -- no
 * role/title/aria-label of its own (unlike illustrations/svg-utils.mjs's
 * svgWrap(), which adds one whenever a label is given). Dropped straight
 * into a pictureChoiceRow card (which just wraps whatever `{svg}` it's
 * given in an otherwise-unlabeled div), a screen-reader user reaches the
 * page's primary question but gets no name for that choice.
 *
 * First shipped as a page-local `withLabel()` duplicated near-identically
 * in page-03-meet-boss-kennedi.mjs and page-06-helping-mission.mjs -- two
 * copies of the same fix is exactly the "a later page reuses it, promote
 * it" case design-system.md already names for illustrations, so it
 * belongs here instead, next to the other inlineSvgFile()/inlineImageFile()
 * self-containment helpers. Both call sites now import this one function.
 */
export function withSvgLabel(svgMarkup, label) {
  return svgMarkup.replace(/^<svg /, `<svg role="img" aria-label="${label}" `);
}
