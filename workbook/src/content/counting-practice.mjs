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
export function validateMode(mode) {
  if (!['choice', 'guided'].includes(mode)) throw new TypeError('Mode must be choice or guided.');
  return mode;
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

export function createCountingBook(seed = DEFAULT_SEED, mode = 'choice') {
  validateMode(mode);
  const random = randomFor(seed);
  const counts = shuffle([...Array.from({ length: 20 }, (_, i) => i + 1), 3, 5, 8, 12], random);
  const selected = [...shuffle(animals, random)];
  // Repeat four assets, but never repeat a species within a sheet.
  for (let i = 20; i < 24; i++) {
    const onSheet = selected.slice(Math.floor(i / 3) * 3);
    if (mode === 'choice' && i % 2) onSheet.push(selected[i - 1]);
    selected.push(shuffle(animals, random).find(entry => !onSheet.includes(entry)));
  }
  const groups = Array.from({ length: 8 }, (_, index) => {
    const quantities = counts.slice(index * 3, index * 3 + 3);
    if (isMonotonic(quantities)) {
      const sorted = [...quantities].sort((a, b) => a - b);
      // A repeated maximum must straddle the smaller value (12,3,12),
      // not remain adjacent (12,12,3). No quantity occurs three times.
      quantities.splice(0, 3, ...(sorted[1] === sorted[2]
        ? [sorted[1], sorted[0], sorted[2]] : [sorted[1], sorted[2], sorted[0]]));
    }
    return quantities.map((count, offset) => ({ count, ...selected[index * 3 + offset] }));
  }).flat();
  return countingPages(seed, mode, groups);
}

// Recipe groups resolve only through this catalog, never through supplied paths.
export function createCountingBookFromGroups(seed, mode, input) {
  validateSeed(seed);
  validateMode(mode);
  if (!Array.isArray(input) || input.length < 1 || input.length > 60) {
    throw new TypeError('Counting recipes need 1-60 groups.');
  }
  const perPage = mode === 'choice' ? 2 : 3;
  const groups = Array.from(input, (group, index) => {
    if (!group || typeof group !== 'object' || Array.isArray(group)
      || Object.keys(group).some(key => !['animal', 'count', 'choices'].includes(key))) {
      throw new TypeError(`Invalid counting group ${index + 1}.`);
    }
    const entry = animals.find(entry => entry.animal === group.animal);
    if (!entry || !Number.isInteger(group.count) || group.count < 1 || group.count > 20) {
      throw new TypeError(`Group ${index + 1} needs a catalog animal and count from 1-20.`);
    }
    if (Object.hasOwn(group, 'choices')) {
      const choices = group.choices;
      if (mode !== 'choice' || !Array.isArray(choices) || choices.length !== 3
        || new Set(choices).size !== 3 || !choices.includes(group.count)
        || !Array.from(choices).every(n => Number.isInteger(n) && n >= 1 && n <= 20)) {
        throw new TypeError(`Group ${index + 1} needs three distinct choices containing its count once (choice mode only).`);
      }
    }
    const earlier = input.slice(Math.floor(index / perPage) * perPage, index);
    if (earlier.some(other => other?.animal === group.animal)) {
      throw new TypeError(`Repeated animal on counting page: ${group.animal}.`);
    }
    return { count: group.count, ...entry,
      ...(Object.hasOwn(group, 'choices') ? { choices: [...group.choices] } : {}) };
  });
  const book = countingPages(seed, mode, groups);
  if (mode === 'choice') assertBalancedChoicePositions(groups);
  return book;
}

// Explicit choices keep the author's order, but the correct answer must not bunch in one box, or a child can
// learn the position instead of counting. No position may hold it more than ceil(groups / 3) + 1 times.
export function assertBalancedChoicePositions(groups) {
  const positions = [0, 0, 0];
  for (const group of groups) positions[group.choices.indexOf(group.count)]++;
  const limit = Math.ceil(groups.length / 3) + 1;
  if (Math.max(...positions) > limit) {
    throw new TypeError(`Correct answers bunch in one choice box (${positions.join('/')} by position); `
      + `reorder explicit choices so no box holds the answer more than ${limit} times.`);
  }
}

function countingPages(seed, mode, groups) {
  if (mode === 'choice') {
    // Independent choice RNG does not disturb the approved animal/count mix.
    const choiceRandom = randomFor((seed ^ 0xc0dec0de) >>> 0);
    const positions = shuffle(Array.from({ length: groups.length }, (_, i) => i % 3), choiceRandom);
    groups.forEach((group, index) => {
      const nearby = Array.from({ length: 20 }, (_, i) => i + 1)
        .filter(n => n !== group.count && Math.abs(n - group.count) <= 3);
      const choices = shuffle(nearby, choiceRandom).slice(0, 2);
      choices.splice(positions[index], 0, group.count);
      if (!Object.hasOwn(group, 'choices')) group.choices = choices;
    });
  }
  const perPage = mode === 'choice' ? 2 : 3;
  const pages = Array.from({ length: Math.ceil(groups.length / perPage) }, (_, index) => {
    const meta = { pageNumber: index + 1, title: mode === 'choice' ? 'Count, choose and trace' : 'Count and trace',
      seed, mode, groups: groups.slice(index * perPage, (index + 1) * perPage) };
    return { meta, render: (crops = {}) => renderPage(meta, crops) };
  });
  return { seed, mode, pages, assets: [...new Set(groups.map(entry => entry.illustrationPath))] };
}

export function renderPage(meta, crops = {}) {
  return `<section class="sheet ct-sheet${meta.mode === 'choice' ? ' ct-sheet-choice' : ''}" data-page="${meta.pageNumber}">
    <header class="ct-header"><p class="ct-brand">KENNEDI'S WORKBOOK</p>
      <h1>${meta.title}</h1><p class="ct-direction">${meta.mode === 'choice' ? 'Count. Circle the number. Trace it.' : 'Count the animals. Trace how many.'}</p></header>
    <main class="ct-groups">${meta.groups.map(group => {
      let svg = inlineSvgFile(path.join(root, group.illustrationPath));
      if (crops[group.illustrationPath]) svg = withViewBox(svg, crops[group.illustrationPath]);
      return countAndTrace({ ...group, svg: withSvgLabel(svg, `A ${group.animal}`) });
    }).join('')}</main>
    <footer class="ct-footer"><span>Touch each animal as you count.</span><span>Page ${meta.pageNumber}</span></footer>
  </section>`;
}
