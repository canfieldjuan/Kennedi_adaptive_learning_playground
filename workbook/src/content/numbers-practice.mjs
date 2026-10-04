import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { numberGlyph } from '../components/number-glyphs.mjs';
import { inlineSvgFile, withSvgLabel, withViewBox } from './asset-inline.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const animals = [
  ['bear', 'bear-01-sitting'], ['cat', 'cat-01-sleeping'], ['dog', 'dog-01-sitting'],
  ['fox', 'fox-01-sitting'], ['turtle', 'turtle-01-walking'], ['elephant', 'elephant-01-standing'],
  ['giraffe', 'giraffe-01-standing'], ['hippo', 'hippo-01-standing'], ['owl', 'owl-01-perched'],
  ['penguin', 'penguin-01-standing'], ['raccoon', 'raccoon-01-sitting'], ['whale', 'whale-01-swimming'],
  ['monkey', 'monkey-01-sitting'], ['lion', 'lion-01-sitting'], ['kangaroo', 'kangaroo-01-standing'],
  ['narwhal', 'narwhal-01-swimming'], ['sloth', 'sloth-01-hanging'], ['unicorn', 'unicorn-01-standing'],
  ['zebra', 'zebra-01-standing'], ['alligator', 'alligator-01-walking'],
];
export const numbers = words.map((word, index) => ({
  number: index + 1, word, animal: animals[index][0],
  illustrationPath: `design-source/animals/locked-poses/${animals[index][1]}.svg`,
}));
export const assets = [...new Set(numbers.map(entry => entry.illustrationPath))];

function illustration(entry, crops) {
  let svg = inlineSvgFile(path.join(root, entry.illustrationPath));
  if (crops[entry.illustrationPath]) svg = withViewBox(svg, crops[entry.illustrationPath]);
  return withSvgLabel(svg, `A ${entry.animal} to color`);
}

export function numberRow(number) {
  const glyph = numberGlyph(number);
  const width = String(number).length === 1 ? 80 : 144;
  const marks = Array.from({ length: 4 }, (_, index) => `<g
    class="${index ? 'trace-mark' : 'model-mark'}" transform="translate(${index * 144 + (144 - width) / 2} 18)"
    fill="none" stroke="#111" stroke-width="${index ? 2.3 : 4.3}" stroke-linecap="round" stroke-linejoin="round"
    ${index ? 'stroke-dasharray="0.01 5.1"' : ''}>${glyph}</g>`).join('');
  return `<svg class="np-guide" data-number="${number}" viewBox="0 0 720 140" role="img"
    aria-label="${number}: look, trace three times, then try one on your own">
    <path d="M0 36 H720 M0 72 H720" fill="none" stroke="#666" stroke-width="1"/>
    <path d="M0 108 H720" fill="none" stroke="#111" stroke-width="1.5"/>
    <path d="M576 22 V133" fill="none" stroke="#666" stroke-dasharray="3 5"/>
    ${marks}<rect class="try-cell" x="576" y="22" width="144" height="111" fill="none" stroke="none"/>
  </svg>`;
}

export function dotFrames(number) {
  numberGlyph(number); // Apply the same numeric range to the counting panel.
  const frames = number > 10 ? 2 : 1;
  const boxes = Array.from({ length: frames }, (_, frame) => Array.from({ length: 10 }, (_, cell) => {
    const x = 2 + frame * 232 + (cell % 5) * 40;
    const y = 2 + Math.floor(cell / 5) * 40;
    return `<rect x="${x}" y="${y}" width="40" height="40" fill="none" stroke="#666" stroke-width="1"/>`;
  }).join('')).join('');
  const dots = Array.from({ length: number }, (_, index) => {
    const frame = Math.floor(index / 10), cell = index % 10;
    return `<circle class="np-dot" cx="${22 + frame * 232 + (cell % 5) * 40}" cy="${22 + Math.floor(cell / 5) * 40}" r="9" fill="#111"/>`;
  }).join('');
  return `<svg class="np-frames" data-count="${number}" viewBox="0 0 436 84" role="img" aria-label="${number} dots in groups of ten">${boxes}${dots}</svg>`;
}

function header(title, direction) {
  return `<header class="np-header"><p class="np-brand">KENNEDI'S WORKBOOK</p>
    <h1>${title}</h1><p class="np-direction">${direction}</p></header>`;
}
function footer(pageNumber, left) {
  return `<footer class="np-footer"><span>${left}</span><span>Numbers 1-20 / Page ${pageNumber}</span></footer>`;
}
function practicePage(meta, crops) {
  return `<section class="sheet np-sheet" data-page="${meta.pageNumber}">
    ${header(meta.title, 'Trace the dots. Then try one on your own.')}
    <div class="np-practice">${meta.entries.map(entry => `<section class="np-number">
      <h2>${entry.number} <span>${entry.word}</span></h2>
      <div class="np-columns"><span>LOOK</span><span>TRACE</span><span>TRY</span></div>
      ${numberRow(entry.number)}
      <div class="np-count-color"><div class="np-count"><h3>Touch and count ${entry.number} dot${entry.number === 1 ? '' : 's'}.</h3>${dotFrames(entry.number)}</div>
        <figure class="np-color"><div class="np-art" data-asset="${entry.illustrationPath}">${illustration(entry, crops)}</div><figcaption>Color the ${entry.animal}.</figcaption></figure>
      </div></section>`).join('')}</div>
    ${footer(meta.pageNumber, `Let's practice ${meta.numbers.join(' and ')}.`)}
  </section>`;
}

function countingPage(meta, crops) {
  return `<section class="sheet np-sheet np-break" data-page="${meta.pageNumber}">
    ${header(meta.title, 'Count together. Circle how many. Color the pictures.')}
    <div class="np-games">${meta.games.map(({ count, entry, choices }) => `<section class="np-game" data-answer="${count}">
      <div class="np-picture-group" style="--columns:${Math.min(count, count > 10 ? 10 : 8)}">
        ${Array.from({ length: count }, () => `<div class="np-count-picture" data-asset="${entry.illustrationPath}">${illustration(entry, crops)}</div>`).join('')}
      </div><div class="np-choices"><span>How many?</span>${choices.map(value => `<span class="np-choice">${value}</span>`).join('')}</div>
    </section>`).join('')}</div>
    ${footer(meta.pageNumber, 'One picture, one number. Take your time!')}
  </section>`;
}

export const pages = [];
for (let pair = 0; pair < 10; pair++) {
  const entries = numbers.slice(pair * 2, pair * 2 + 2);
  const meta = { pageNumber: pages.length + 1, kind: 'practice', title: 'My number practice',
    numbers: entries.map(entry => entry.number), entries, pictureCounts: [], };
  pages.push({ meta, render: (crops = {}) => practicePage(meta, crops) });
  if (pair === 4 || pair === 9) {
    const games = pair === 4
      ? [{ count: 3, entry: numbers[0], choices: [2, 3, 4] }, { count: 6, entry: numbers[3], choices: [6, 5, 7] }, { count: 8, entry: numbers[4], choices: [7, 9, 8] }]
      : [{ count: 12, entry: numbers[9], choices: [11, 12, 13] }, { count: 15, entry: numbers[11], choices: [15, 14, 16] }, { count: 20, entry: numbers[4], choices: [18, 19, 20] }];
    const meta = { pageNumber: pages.length + 1, kind: 'counting', title: 'A little counting break',
      numbers: [], games, pictureCounts: games.map(game => game.count), entries: games.map(game => game.entry) };
    pages.push({ meta, render: (crops = {}) => countingPage(meta, crops) });
  }
}
