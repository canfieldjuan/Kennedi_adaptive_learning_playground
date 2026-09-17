import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 4,
  title: 'ALPHABET PAGE 4: J, K, L',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: J, K, L',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'J',
        lower: 'j',
        word: 'Jellyfish',
        illustrationPath: path.join(ANIMALS_LOCKED, 'jellyfish-01-floating.svg'),
        illustrationLabel: 'a floating jellyfish',
        // jellyfish-01-floating.svg content bbox x=271.64 y=230.33
        // w=471.77 h=617.67 (0-1024 viewBox) -- trailing tentacles leave a
        // lot of headroom above the dome, reads small in a square frame at
        // default sizing. Cropped tight to content + 6% padding per axis
        // (non-square -- see page-03.mjs's igloo comment for why this
        // frame allows that without distortion, and why per-axis beats a
        // padded-square crop here).
        illustrationViewBox: '243 193 528 692',
      },
      {
        upper: 'K',
        lower: 'k',
        word: 'Kite',
        illustrationPath: path.join(OBJECTS_LOCKED, 'kite.svg'),
        illustrationLabel: 'a diamond kite with a tail',
        // No crop: measured/tested directly and a tight crop barely moves
        // the needle here (confirmed by rendering uncropped vs cropped
        // side by side) -- unlike igloo/jellyfish/whale/nest/yoyo, the
        // kite's own silhouette bbox (w=349 h=889, already 87% of the
        // canvas on its long axis) isn't sitting in a lot of dead canvas
        // space; it's just an intrinsically narrow object (diamond + thin
        // tail), which no crop changes. Reads correctly as "a kite", not
        // as a framing bug.
      },
      {
        upper: 'L',
        lower: 'l',
        word: 'Lion',
        illustrationPath: path.join(ANIMALS_LOCKED, 'lion-01-sitting.svg'),
        illustrationLabel: 'a sitting lion',
      },
    ],
  });
}
