import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glyphPaths, GUIDES } from './manuscript-glyphs.mjs';
import { inlineSvgFile, withSvgLabel, withViewBox } from '../content/asset-inline.mjs';

const workbook = fileURLToPath(new URL('../../', import.meta.url));
export const escapeText = text => String(text).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function manuscriptRow(letter) {
  const paths = glyphPaths(letter);
  const step = 720 / 7;
  const offset = 20;
  const marks = Array.from({ length: 6 }, (_, index) => {
    const trace = index > 0;
    return `<g class="${trace ? 'trace-mark' : 'model-mark'}" transform="translate(${step * (index + 0.5) - 40} ${offset})"
      fill="none" stroke="#111" stroke-width="${trace ? 2.3 : 4.3}" stroke-linecap="round" stroke-linejoin="round"
      ${trace ? 'stroke-dasharray="0.01 5.1"' : ''}>
      ${paths.map(d => `<path d="${d}"/>`).join('')}
    </g>`;
  }).join('');
  const descender = 'gjpqy'.includes(letter);
  return `<svg class="ap-guide" data-letter="${letter}" viewBox="0 0 720 148" role="img"
    aria-label="${letter}: one solid model, five dotted letters to trace, then a blank try space">
    <g fill="none" stroke="#666" stroke-width="1">
      <path d="M0 ${GUIDES.cap + offset} H720"/>
      <path d="M0 ${GUIDES.middle + offset} H720" stroke-dasharray="5 5"/>
      ${descender ? `<path class="descender-guide" d="M0 ${GUIDES.descender + offset} H720" stroke-dasharray="2 6"/>` : ''}
    </g>
    <path d="M0 ${GUIDES.baseline + offset} H720" fill="none" stroke="#111" stroke-width="1.5"/>
    ${marks}
    <rect class="try-cell" x="617.14" y="25" width="102.86" height="118" fill="none" stroke="none"/>
    <path d="M617.14 26 V142" fill="none" stroke="#666" stroke-width="1" stroke-dasharray="3 5"/>
  </svg>`;
}

function letterPair(entry, crops) {
  const { upper, lower, word, illustrationPath, illustrationLabel } = entry;
  let illustration = inlineSvgFile(path.join(workbook, illustrationPath));
  if (crops[illustrationPath]) illustration = withViewBox(illustration, crops[illustrationPath]);
  illustration = withSvgLabel(illustration, escapeText(illustrationLabel));
  return `<section class="ap-pair" data-pair="${upper}${lower}">
    <div class="ap-pair-heading">
      <h2>Capital ${upper}</h2>
      <div class="ap-cue"><span>${upper} is for ${escapeText(word)}.</span>
        <div class="ap-art" data-asset="${escapeText(illustrationPath)}">${illustration}</div>
      </div>
    </div>
    ${manuscriptRow(upper)}
    <h2 class="ap-lower-heading">Lowercase ${lower}</h2>
    ${manuscriptRow(lower)}
  </section>`;
}

export function alphabetPracticePage({ pageNumber, letters, crops = {} }) {
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || !Array.isArray(letters) || letters.length !== 2) {
    throw new TypeError('An alphabet practice page needs a positive page number and exactly two letters.');
  }
  for (const { upper, lower } of letters) {
    glyphPaths(upper);
    glyphPaths(lower);
    if (!/^[A-Z]$/.test(upper) || lower !== upper.toLowerCase()) throw new TypeError('Letter pairs must be matching uppercase/lowercase letters.');
  }
  const sequence = letters.map(({ upper, lower }) => `${upper} ${lower}`).join('  ');
  return `<section class="sheet ap-sheet" data-page="${pageNumber}">
    <header class="ap-header">
      <p class="ap-brand">KENNEDI'S WORKBOOK</p>
      <h1>My alphabet practice</h1>
      <p class="ap-direction">Trace the dots. Then try one on your own.</p>
      <div class="ap-columns"><span>LOOK</span><span>TRACE</span><span>TRY</span></div>
    </header>
    <div class="ap-practice">${letters.map(entry => letterPair(entry, crops)).join('')}</div>
    <footer class="ap-footer"><span>${sequence}</span><span>Alphabet practice / Page ${pageNumber}</span></footer>
  </section>`;
}
