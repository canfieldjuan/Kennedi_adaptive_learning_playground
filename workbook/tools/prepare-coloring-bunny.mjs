// CPU-only opaque-interior derivative. Canonical PNG/SVG are never rewritten.
import { prepareColoringCharacter } from './prepare-coloring-character.mjs';
if (process.argv.length !== 2) throw new TypeError('Usage: node tools/prepare-coloring-bunny.mjs');
console.log(JSON.stringify(await prepareColoringCharacter('bunny'), null, 2));
