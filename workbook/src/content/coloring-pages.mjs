import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inlineSvgFile, withSvgLabel, withViewBox } from './asset-inline.mjs';
import { bunnyGarden, inlineBunnyGarden, turtlePond, inlineTurtlePond } from '../components/coloring-scene.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Deliberately curated: not every shaded workbook SVG is suitable for coloring.
export const coloringCatalog = Object.freeze([
  { id: 'bunny', title: 'My bunny', file: 'bunny-01-sitting' },
  { id: 'turtle', title: 'My turtle', file: 'turtle-01-walking' },
  { id: 'unicorn', title: 'My unicorn', file: 'unicorn-01-standing' },
  { id: 'whale', title: 'My whale', file: 'whale-01-swimming' },
  { id: 'bunny-garden', title: "Bunny's garden", illustrationPath: bunnyGarden.scene,
    dependencies: [bunnyGarden.character], renderScene: inlineBunnyGarden,
    label: 'A bunny in a flower garden with carrots and a butterfly' },
  { id: 'turtle-pond', title: "Turtle's pond", illustrationPath: turtlePond.scene,
    dependencies: [turtlePond.character], renderScene: inlineTurtlePond,
    label: 'A turtle on a bank beside a pond with lily pads, reeds and a dragonfly' },
].map(entry => Object.freeze({ ...entry,
  illustrationPath: entry.illustrationPath ?? `design-source/animals/locked-poses/${entry.file}.svg`,
})));

export function createColoringBook(selections) {
  if (!Array.isArray(selections) || selections.length < 1 || selections.length > 24)
    throw new TypeError('Coloring pages must contain 1-24 catalog IDs.');
  const entries = Array.from(selections, id => {
    const entry = coloringCatalog.find(item => item.id === id);
    if (!entry) throw new TypeError('Unknown coloring catalog ID.');
    return entry;
  });
  return {
    selections: [...selections],
    assets: [...new Set(entries.flatMap(entry => [entry.illustrationPath, ...(entry.dependencies ?? [])]))],
    pages: entries.map((entry, index) => {
      const meta = { pageNumber: index + 1, kind: 'coloring', subject: entry.id,
        title: entry.title, illustrationPath: entry.illustrationPath };
      return { meta, render(crops = {}) {
        let svg = entry.renderScene ? entry.renderScene(root) : inlineSvgFile(path.join(root, entry.illustrationPath));
        if (crops[entry.illustrationPath]) svg = withViewBox(svg, crops[entry.illustrationPath]);
        svg = withSvgLabel(svg, entry.label ?? `A ${entry.id} to color`);
        return `<section class="sheet coloring-sheet" data-page="${meta.pageNumber}">
          <header class="coloring-header"><p>KENNEDI'S COLORING BOOK</p><h1>${entry.title}</h1></header>
          <figure class="coloring-art" data-subject="${entry.id}">${svg}</figure>
          <footer class="coloring-footer"><span>Make it your own.</span><span>${meta.pageNumber}</span></footer>
        </section>`;
      } };
    }),
  };
}
