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
