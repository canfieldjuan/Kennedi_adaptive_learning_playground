// CPU-only derivative using the shared opaque-contour owner; no model call.
import { prepareColoringCharacter } from './prepare-coloring-character.mjs';
if (process.argv.length !== 2) throw new TypeError('Usage: node tools/prepare-coloring-whale.mjs');
console.log(JSON.stringify(await prepareColoringCharacter('whale'), null, 2));
