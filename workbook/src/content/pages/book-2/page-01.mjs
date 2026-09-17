import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 1,
  title: 'ALPHABET PAGE 1: A, B, C',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: A, B, C',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'A',
        lower: 'a',
        word: 'Apple',
        illustrationPath: path.join(OBJECTS_LOCKED, 'apple.svg'),
        illustrationLabel: 'an apple',
      },
      {
        upper: 'B',
        lower: 'b',
        word: 'Ball',
        illustrationPath: path.join(OBJECTS_LOCKED, 'ball.svg'),
        illustrationLabel: 'a ball',
      },
      {
        upper: 'C',
        lower: 'c',
        word: 'Cat',
        illustrationPath: path.join(ANIMALS_LOCKED, 'cat-01-sleeping.svg'),
        illustrationLabel: 'a sleeping cat',
        // cat-01-sleeping.svg content bbox x=129 y=317 w=729.3 h=418.6
        // (0-1024 viewBox) -- a curled-up cat is wide/short, so it reads
        // small in a square frame at default sizing. Padded 6% per axis,
        // squared off (shorter axis padded to match longer), same recipe
        // as page-06-helping-mission.mjs's withViewBox() call sites.
        illustrationViewBox: '85 118 817 817',
      },
    ],
  });
}
