import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 6,
  title: 'ALPHABET PAGE 6: P, Q, R',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: P, Q, R',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'P',
        lower: 'p',
        word: 'Pencil',
        illustrationPath: path.join(OBJECTS_LOCKED, 'pencil.svg'),
        illustrationLabel: 'a pencil',
        // Same source file page-04-pencil-adventure.mjs (Book 1) uses;
        // its own bbox is already near-square and fills this frame well
        // uncropped (confirmed by rendering).
      },
      {
        upper: 'Q',
        lower: 'q',
        word: 'Queen',
        illustrationPath: path.join(ANIMALS_LOCKED, 'queen-01-standing.svg'),
        illustrationLabel: 'a queen with a crown',
      },
      {
        upper: 'R',
        lower: 'r',
        word: 'Rainbow',
        illustrationPath: path.join(OBJECTS_LOCKED, 'rainbow.svg'),
        illustrationLabel: 'a rainbow with clouds',
      },
    ],
  });
}
