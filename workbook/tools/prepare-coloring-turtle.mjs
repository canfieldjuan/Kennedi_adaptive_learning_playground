// CPU-only derivative using the validated bunny export settings; no model call.
import { prepareColoringCharacter } from './prepare-coloring-character.mjs';
if (process.argv.length !== 2) throw new TypeError('Usage: node tools/prepare-coloring-turtle.mjs');
console.log(JSON.stringify(await prepareColoringCharacter('turtle'), null, 2));
