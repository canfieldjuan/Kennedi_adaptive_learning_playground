import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { catalog, readRecipe, resolveRecipe, templates, WORKBOOK_ROOT } from '../src/recipes.mjs';
import { withPrintBrowser } from './print-artifacts.mjs';

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
  const supplied = readRecipe(input);
  // One owner must cover compatibility checks, every stage and metadata writes.
  // Splitting a coloring run into children leaves verification lifetime and
  // inter-stage writes outside that owner's serialization boundary.
  if (stage !== 'validate' && supplied.template === 'coloring-pages-v1') {
    execFileSync(process.execPath, [path.join(WORKBOOK_ROOT, 'scripts/coloring.mjs'), stage, '--recipe', input,
      ...(options['--out'] ? ['--out', options['--out']] : [])], { cwd: WORKBOOK_ROOT, stdio: 'inherit' });
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
        if (['count-and-trace-v1', 'coloring-pages-v1'].includes(recipe.template)) command.push('--recipe', input);
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
