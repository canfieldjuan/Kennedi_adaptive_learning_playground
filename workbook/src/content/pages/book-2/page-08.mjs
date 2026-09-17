import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 8,
  title: 'ALPHABET PAGE 8: V, W, X',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: V, W, X',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'V',
        lower: 'v',
        word: 'Violin',
        illustrationPath: path.join(OBJECTS_LOCKED, 'violin.svg'),
        illustrationLabel: 'a violin with a bow',
      },
      {
        upper: 'W',
        lower: 'w',
        word: 'Whale',
        illustrationPath: path.join(ANIMALS_LOCKED, 'whale-01-swimming.svg'),
        illustrationLabel: 'a swimming whale',
        // whale-01-swimming.svg content bbox x=231.19 y=276.06 w=619.21
        // h=449.74 (0-1024 viewBox) -- a low, wide swimming pose, reads
        // small in a square frame at default sizing. Cropped tight to
        // content + 6% padding per axis (non-square -- see page-03.mjs's
        // igloo comment for the rationale).
        illustrationViewBox: '194 249 694 504',
      },
      {
        upper: 'X',
        lower: 'x',
        word: 'Xylophone',
        illustrationPath: path.join(OBJECTS_LOCKED, 'xylophone.svg'),
        illustrationLabel: 'a toy xylophone with two mallets',
        // xylophone.svg content bbox x=248.2 y=347.3 w=519.3 h=343.7
        // (0-1024 viewBox) -- a low, wide composition, reads small in a
        // square frame at default sizing. Padded 6% per axis, squared off
        // (this crop was established and owner-approved earlier as part
        // of the X/Z validation batch, kept as-is here).
        illustrationViewBox: '217 228 582 582',
      },
    ],
  });
}
