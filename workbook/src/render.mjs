/**
 * Turns a page's HTML fragment into a fully self-contained document: fonts
 * are base64-inlined so every generated file works standalone (no relative
 * paths, no network, opens directly via file://).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.join(__dirname, 'styles');
const fontsDir = path.join(__dirname, 'fonts');

function fontDataUri(file) {
  return readFileSync(path.join(fontsDir, file)).toString('base64');
}

function buildInlineCss() {
  let fonts = readFileSync(path.join(stylesDir, 'fonts.css'), 'utf8');
  fonts = fonts
    .replace("url('../fonts/Baloo2-Variable.woff2')", `url('data:font/woff2;base64,${fontDataUri('Baloo2-Variable.woff2')}')`)
    .replace("url('../fonts/Nunito-Variable.woff2')", `url('data:font/woff2;base64,${fontDataUri('Nunito-Variable.woff2')}')`);
  const tokens = readFileSync(path.join(stylesDir, 'tokens.css'), 'utf8');
  const base = readFileSync(path.join(stylesDir, 'base.css'), 'utf8');
  const components = readFileSync(path.join(stylesDir, 'components.css'), 'utf8');
  const print = readFileSync(path.join(stylesDir, 'print.css'), 'utf8');
  return [fonts, tokens, base, components, print].join('\n');
}

const INLINE_CSS = buildInlineCss();

export function renderDocument({ title, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${INLINE_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}
