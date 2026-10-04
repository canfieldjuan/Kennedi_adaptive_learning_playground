import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { numbers } from './numbers-practice.mjs';
import { inlineSvgFile, withSvgLabel, withViewBox } from './asset-inline.mjs';
import { countAndTrace } from '../components/count-and-trace.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const DEFAULT_SEED = 1042026;
const plurals = { fox: 'foxes' };
export const animals = numbers.map(({ animal, illustrationPath }) => ({
  animal, plural: plurals[animal] ?? `${animal}s`, illustrationPath,
}));
export const describeGroup = ({ count, animal, plural }) => `${count} ${count === 1 ? animal : plural}`;

export function validateSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new TypeError('Seed must be an integer from 0 through 4294967295.');
  }
  return seed;
}

// Mulberry32 + Fisher-Yates: stable output, including a legitimate zero seed.
function randomFor(seed) {
  let state = validateSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const isMonotonic = counts => counts.every((n, i) => !i || n >= counts[i - 1])
  || counts.every((n, i) => !i || n <= counts[i - 1]);

export function createCountingBook(seed = DEFAULT_SEED) {
  const random = randomFor(seed);
  const counts = shuffle([...Array.from({ length: 20 }, (_, i) => i + 1), 3, 5, 8, 12], random);
  const selected = [...shuffle(animals, random)];
  // Repeat four assets, but never repeat a species within a sheet.
  for (let i = 20; i < 24; i++) {
    const onSheet = selected.slice(Math.floor(i / 3) * 3);
    selected.push(shuffle(animals, random).find(entry => !onSheet.includes(entry)));
  }
  const pages = Array.from({ length: 8 }, (_, index) => {
    const quantities = counts.slice(index * 3, index * 3 + 3);
    if (isMonotonic(quantities)) {
      const sorted = [...quantities].sort((a, b) => a - b);
      // A repeated maximum must straddle the smaller value (12,3,12),
      // not remain adjacent (12,12,3). No quantity occurs three times.
      quantities.splice(0, 3, ...(sorted[1] === sorted[2]
        ? [sorted[1], sorted[0], sorted[2]] : [sorted[1], sorted[2], sorted[0]]));
    }
    const groups = quantities.map((count, offset) => ({ count, ...selected[index * 3 + offset] }));
    const meta = { pageNumber: index + 1, title: 'Count and trace', seed, groups };
    return { meta, render: (crops = {}) => renderPage(meta, crops) };
  });
  return { seed, pages, assets: [...new Set(selected.map(entry => entry.illustrationPath))] };
}

function renderPage(meta, crops) {
  return `<section class="sheet ct-sheet" data-page="${meta.pageNumber}">
    <header class="ct-header"><p class="ct-brand">KENNEDI'S WORKBOOK</p>
      <h1>${meta.title}</h1><p class="ct-direction">Count the animals. Trace how many.</p></header>
    <main class="ct-groups">${meta.groups.map(group => {
      let svg = inlineSvgFile(path.join(root, group.illustrationPath));
      if (crops[group.illustrationPath]) svg = withViewBox(svg, crops[group.illustrationPath]);
      return countAndTrace({ ...group, svg: withSvgLabel(svg, `A ${group.animal}`) });
    }).join('')}</main>
    <footer class="ct-footer"><span>Touch each animal as you count.</span><span>Page ${meta.pageNumber}</span></footer>
  </section>`;
}
