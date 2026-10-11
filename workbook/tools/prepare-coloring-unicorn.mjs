// CPU-only derivative using the shared opaque-contour owner; no model call.
import { prepareColoringCharacter } from './prepare-coloring-character.mjs';
if (process.argv.length !== 2) throw new TypeError('Usage: node tools/prepare-coloring-unicorn.mjs');
console.log(JSON.stringify(await prepareColoringCharacter('unicorn'), null, 2));
