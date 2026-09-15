import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 2,
  title: 'ALPHABET PAGE 2: D, E, F',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: D, E, F',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'D',
        lower: 'd',
        word: 'Dog',
        illustrationPath: path.join(ANIMALS_LOCKED, 'dog-01-sitting.svg'),
        illustrationLabel: 'a puppy sitting',
      },
      {
        upper: 'E',
        lower: 'e',
        word: 'Elephant',
        illustrationPath: path.join(ANIMALS_LOCKED, 'elephant-01-standing.svg'),
        illustrationLabel: 'a standing elephant',
      },
      {
        upper: 'F',
        lower: 'f',
        word: 'Fish',
        illustrationPath: path.join(ANIMALS_LOCKED, 'fish-01-swimming.svg'),
        illustrationLabel: 'a swimming fish',
      },
    ],
  });
}
