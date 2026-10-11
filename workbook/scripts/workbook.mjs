import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { catalog, readRecipe, resolveRecipe, templates, WORKBOOK_ROOT } from '../src/recipes.mjs';
import { withPrintOutput, withPrintBrowser } from './print-artifacts.mjs';
import { runColoring } from './coloring.mjs';

const args = process.argv.slice(2);
const stage = args.shift() ?? 'all';
const stages = ['build', 'pdf', 'screenshots', 'rasterize', 'verify'];
const usage = 'Usage: node scripts/workbook.mjs [all|build|pdf|screenshots|rasterize|verify|validate] --recipe FILE [--out DIRECTORY]; or catalog';
const options = {};
if (stage === 'catalog') {
  if (args.length) throw new TypeError(usage);
  console.log(JSON.stringify(catalog(), null, 2));
} else {
  if (![...stages, 'all', 'validate'].includes(stage)) throw new TypeError(usage);
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], value = args[i + 1];
    if (!['--recipe', '--out'].includes(flag) || !value || value.startsWith('--') || Object.hasOwn(options, flag)) throw new TypeError(usage);
    options[flag] = value;
  }
  if (!options['--recipe'] || (stage === 'validate' && options['--out'])) throw new TypeError(usage);
  const input = path.resolve(options['--recipe']);
  async function dispatch(owner) {
    const supplied = readRecipe(input);
    // Keep the complete coloring run and metadata under its output owner.
    if (stage !== 'validate' && supplied.template === 'coloring-pages-v1') {
      await runColoring(stage, { ...options, '--recipe': input }, owner);
    } else {
      const { book, recipe } = resolveRecipe(supplied);
      if (stage === 'validate') console.log(`PASS: ${recipe.template}; ${book.pages.length} pages; ${book.assets.length} catalog assets; recipe and any locks valid.`);
      else {
        const out = path.resolve(options['--out'] ?? path.join(WORKBOOK_ROOT, 'dist-recipes', recipe.template));
        const snapshot = path.join(out, 'recipe.json');
        const save = (file, value) => {
          mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
          writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 }); chmodSync(file, 0o600);
        };
        for (const operation of stage === 'all' ? stages : [stage]) {
          // Check the exact saved recipe before exporting/checking an older build.
          if (operation !== 'build') assert.deepEqual(resolveRecipe(readRecipe(snapshot)).recipe, recipe, 'Output was built from a different recipe.');
          const command = [path.join(WORKBOOK_ROOT, 'scripts', `${templates[recipe.template]}.mjs`), operation, '--out', out];
          if (recipe.template === 'count-and-trace-v1') command.push('--recipe', input);
          // Fixed executable/script mapping and argument array; no shell or recipe code.
          execFileSync(process.execPath, command, { cwd: WORKBOOK_ROOT, stdio: 'inherit' });
          if (operation === 'build') {
            save(snapshot, recipe);
            save(path.join(out, 'render-environment.json'), { node: process.version,
              chrome: await withPrintBrowser(browser => browser.version()),
              platform: process.platform, architecture: process.arch });
          }
        }
        console.log(`Recipe workbook ${stage} complete: ${out}`);
      }
    }
  }
  // An explicit existing target is known independently of unreadable input or
  // damaged saved metadata. Claim it before any fallible recipe work. Without
  // an explicit target, invalid input selects no default output to mutate.
  if (stage !== 'validate' && options['--out'] && existsSync(path.resolve(options['--out'])))
    await withPrintOutput(options['--out'], stage, dispatch);
  else await dispatch();
}
