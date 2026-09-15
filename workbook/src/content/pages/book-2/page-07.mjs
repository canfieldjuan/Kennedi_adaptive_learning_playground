import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');

export const meta = {
  pageNumber: 7,
  title: 'ALPHABET PAGE 7: S, T, U',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: S, T, U',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'S',
        lower: 's',
        word: 'Sun',
        illustrationPath: path.join(OBJECTS_LOCKED, 'sun.svg'),
        illustrationLabel: 'a sun with rays',
      },
      {
        upper: 'T',
        lower: 't',
        word: 'Tree',
        illustrationPath: path.join(OBJECTS_LOCKED, 'tree.svg'),
        illustrationLabel: 'a tree',
      },
      {
        upper: 'U',
        lower: 'u',
        word: 'Umbrella',
        illustrationPath: path.join(OBJECTS_LOCKED, 'umbrella.svg'),
        illustrationLabel: 'an open umbrella',
      },
    ],
  });
}
