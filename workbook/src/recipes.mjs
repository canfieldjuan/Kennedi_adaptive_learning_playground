import { createHash } from 'node:crypto';
import { readFileSync, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabet, pages as alphabetPages } from './content/alphabet-practice.mjs';
import { assets as numberAssets, pages as numberPages } from './content/numbers-practice.mjs';
import { animals, createCountingBook, createCountingBookFromGroups } from './content/counting-practice.mjs';

export const WORKBOOK_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const RECIPE_MAX_BYTES = 65536;
export const recipeSchema = JSON.parse(readFileSync(new URL('../recipes/workbook.schema.json', import.meta.url), 'utf8'));
export const templates = Object.freeze({
  'alphabet-rows-v1': 'alphabet', 'numbers-1-20-v1': 'numbers', 'count-and-trace-v1': 'counting',
});
const hash = data => createHash('sha256').update(data).digest('hex');
const assetId = file => path.basename(file, '.svg');

// Interpret only the JSON Schema keywords used by our checked-in schema.
// The schema is also consumable by standard JSON Schema validators/model tools.
function check(value, schema, label = 'recipe') {
  if (schema.$ref) return check(value, recipeSchema.$defs[schema.$ref.split('/').at(-1)], label);
  if (schema.oneOf) {
    const errors = [];
    let matches = 0;
    for (const branch of schema.oneOf) {
      try { check(value, branch, label); matches++; } catch (error) { errors.push(error.message); }
    }
    if (matches !== 1) throw new TypeError(`${label}: no unique matching recipe format. ${errors.join(' | ')}`);
    return;
  }
  const fail = reason => { throw new TypeError(`${label}: ${reason}`); };
  if (Object.hasOwn(schema, 'const') && value !== schema.const) fail(`expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) fail(`expected one of ${schema.enum.join(', ')}`);
  if (schema.type === 'integer' && !Number.isInteger(value)) fail('expected an integer');
  if (schema.type === 'string' && typeof value !== 'string') fail('expected a string');
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected an object');
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) fail(`missing ${key}`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties, key)) fail(`unknown field ${key}`);
      check(value[key], schema.properties[key], `${label}.${key}`);
    }
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) fail('expected an array');
    if (value.length < schema.minItems || value.length > schema.maxItems) fail(`expected ${schema.minItems}-${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) fail('items must be distinct');
    Array.from(value).forEach((item, index) => check(item, schema.items, `${label}[${index}]`));
  }
  if (schema.minimum !== undefined && value < schema.minimum) fail(`minimum is ${schema.minimum}`);
  if (schema.maximum !== undefined && value > schema.maximum) fail(`maximum is ${schema.maximum}`);
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail('invalid identifier or SHA256');
}

export function readRecipe(file) {
  const fd = openSync(file, 'r');
  const buffer = Buffer.alloc(RECIPE_MAX_BYTES + 1);
  let length = 0;
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > RECIPE_MAX_BYTES) throw new TypeError(`Recipe must be a JSON file no larger than ${RECIPE_MAX_BYTES} bytes.`);
    while (length < buffer.length) {
      const n = readSync(fd, buffer, length, buffer.length - length, null);
      if (n === 0) break;
      length += n;
    }
  } finally { closeSync(fd); }
  if (length > RECIPE_MAX_BYTES) throw new TypeError('Recipe exceeds the size limit.');
  let recipe;
  try { recipe = JSON.parse(buffer.subarray(0, length).toString('utf8')); }
  catch { throw new TypeError('Recipe is not valid JSON.'); }
  check(recipe, recipeSchema);
  return recipe;
}

export function catalog() {
  return {
    schemaVersion: 1, templates: Object.keys(templates),
    countingAnimals: animals.map(({ animal }) => animal),
    artwork: [...new Set([...alphabet.map(entry => entry.illustrationPath), ...numberAssets])].map(assetId),
  };
}

export function sourceFingerprint(template) {
  const common = ['src/recipes.mjs', 'recipes/workbook.schema.json', 'scripts/workbook.mjs', 'scripts/print-artifacts.mjs',
    'src/render.mjs', 'src/content/asset-inline.mjs', 'package.json', 'package-lock.json',
    'src/fonts/Baloo2-Variable.woff2', 'src/fonts/Nunito-Variable.woff2',
    ...['fonts', 'tokens', 'base', 'components', 'print'].map(name => `src/styles/${name}.css`)];
  const files = {
    alphabet: ['src/content/alphabet-practice.mjs', 'src/components/alphabet-practice.mjs', 'src/components/manuscript-glyphs.mjs'],
    numbers: ['src/content/numbers-practice.mjs', 'src/components/number-glyphs.mjs'],
    counting: ['src/content/counting-practice.mjs', 'src/content/numbers-practice.mjs', 'src/components/count-and-trace.mjs', 'src/components/number-glyphs.mjs'],
  };
  const kind = templates[template];
  if (!kind) throw new TypeError('Unknown workbook template.');
  const digest = createHash('sha256');
  for (const file of [...common, ...files[kind], `src/styles/${kind === 'counting' ? 'counting' : kind}-practice.css`, `scripts/${kind}.mjs`].sort()) {
    digest.update(file).update('\0').update(readFileSync(path.join(WORKBOOK_ROOT, file))).update('\0');
  }
  return digest.digest('hex');
}

export function freezeRecipe(template, book) {
  const content = { schemaVersion: 1, template };
  if (template === 'count-and-trace-v1') {
    Object.assign(content, { seed: book.seed, mode: book.mode,
      groups: book.pages.flatMap(page => page.meta.groups.map(({ animal, count, choices }) => ({
        animal, count, ...(choices ? { choices: [...choices] } : {}),
      }))) });
  }
  return { ...content, lock: { sourceSha256: sourceFingerprint(template), contentSha256: hash(JSON.stringify(content)),
    artwork: book.assets.map(file => ({ asset: assetId(file), sha256: hash(readFileSync(path.join(WORKBOOK_ROOT, file))) })) } };
}

export function resolveRecipe(recipe) {
  check(recipe, recipeSchema);
  let book;
  if (recipe.template === 'count-and-trace-v1') {
    book = Object.hasOwn(recipe, 'groups')
      ? createCountingBookFromGroups(recipe.seed, recipe.mode, recipe.groups)
      : createCountingBook(recipe.seed, recipe.mode);
  } else if (recipe.template === 'alphabet-rows-v1') {
    book = { pages: alphabetPages, assets: alphabet.map(entry => entry.illustrationPath) };
  } else book = { pages: numberPages, assets: numberAssets };
  const frozen = freezeRecipe(recipe.template, book);
  if (Object.hasOwn(recipe, 'lock')) {
    if (recipe.lock.sourceSha256 !== frozen.lock.sourceSha256) throw new TypeError('Recipe lock: renderer inputs changed; use the original source checkout or create a new reviewed recipe.');
    if (recipe.lock.contentSha256 !== frozen.lock.contentSha256) throw new TypeError('Recipe lock: content/choices changed.');
    const expected = frozen.lock.artwork;
    if (recipe.lock.artwork.length !== expected.length || new Set(recipe.lock.artwork.map(item => item.asset)).size !== expected.length
      || expected.some(item => !recipe.lock.artwork.some(saved => saved.asset === item.asset && saved.sha256 === item.sha256))) {
      throw new TypeError('Recipe lock: selected artwork changed, missing, duplicated or unknown.');
    }
  }
  return { book, recipe: frozen };
}
