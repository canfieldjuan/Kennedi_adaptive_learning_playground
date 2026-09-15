import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 5,
  title: 'ALPHABET PAGE 5: M, N, O',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: M, N, O',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'M',
        lower: 'm',
        word: 'Moon',
        illustrationPath: path.join(OBJECTS_LOCKED, 'moon.svg'),
        illustrationLabel: 'a crescent moon',
        // No crop: tested directly (uncropped vs a per-axis crop side by
        // side) -- a crescent is inherently thin along its own curve, so
        // tightening the crop barely changes how much of the frame it
        // fills. Not worth the extra viewBox complexity for a
        // near-invisible gain.
      },
      {
        upper: 'N',
        lower: 'n',
        word: 'Nest',
        illustrationPath: path.join(OBJECTS_LOCKED, 'nest.svg'),
        illustrationLabel: 'a bird nest with eggs',
        // nest.svg content bbox x=147.60 y=274.99 w=709.02 h=466.50
        // (0-1024 viewBox) -- a wide, low nest, reads small in a square
        // frame at default sizing. Cropped tight to content + 6% padding
        // per axis (non-square -- see page-03.mjs's igloo comment for the
        // rationale). This is the same source file page-04-pencil-
        // adventure.mjs (Book 1) uses uncropped -- the crop here is local
        // to THIS page's illustrationViewBox call and doesn't touch the
        // source SVG, so Book 1's usage is unaffected.
        illustrationViewBox: '105 247 794 522',
      },
      {
        upper: 'O',
        lower: 'o',
        word: 'Owl',
        illustrationPath: path.join(ANIMALS_LOCKED, 'owl-01-perched.svg'),
        illustrationLabel: 'a perched owl',
      },
    ],
  });
}
