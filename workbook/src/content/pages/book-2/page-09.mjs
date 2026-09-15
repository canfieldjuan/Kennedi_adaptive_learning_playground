import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

// Final page: only 2 letters, not 3 -- 26 letters doesn't divide evenly
// into groups of 3 (8 pages of 3 = 24, leaving exactly Y and Z).
export const meta = {
  pageNumber: 9,
  title: 'ALPHABET PAGE 9: Y, Z',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: Y, Z',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'Y',
        lower: 'y',
        word: 'Yoyo',
        illustrationPath: path.join(OBJECTS_LOCKED, 'yoyo.svg'),
        illustrationLabel: 'a yo-yo with its string',
        // yoyo.svg content bbox x=242.23 y=81.08 w=538.69 h=794.47
        // (0-1024 viewBox) -- the string loop adds height without adding
        // width, so it reads small in a square frame at default sizing.
        // Cropped tight to content + 6% padding per axis (non-square --
        // see page-03.mjs's igloo comment for the rationale).
        illustrationViewBox: '210 33 603 890',
      },
      {
        upper: 'Z',
        lower: 'z',
        word: 'Zebra',
        illustrationPath: path.join(ANIMALS_LOCKED, 'zebra-01-standing.svg'),
        illustrationLabel: 'a standing zebra',
      },
    ],
  });
}
