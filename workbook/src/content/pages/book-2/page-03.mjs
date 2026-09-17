import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphabetPage } from '../../../components/letter-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');
const ANIMALS_LOCKED = path.join(WORKBOOK, 'design-source/animals/locked-poses');

export const meta = {
  pageNumber: 3,
  title: 'ALPHABET PAGE 3: G, H, I',
  primarySkill: 'uppercase/lowercase letter recognition + tracing: G, H, I',
};

export function render() {
  return alphabetPage({
    pageNumber: meta.pageNumber,
    letters: [
      {
        upper: 'G',
        lower: 'g',
        word: 'Giraffe',
        illustrationPath: path.join(ANIMALS_LOCKED, 'giraffe-01-standing.svg'),
        illustrationLabel: 'a standing giraffe',
      },
      {
        upper: 'H',
        lower: 'h',
        word: 'House',
        illustrationPath: path.join(OBJECTS_LOCKED, 'house.svg'),
        illustrationLabel: 'a house',
      },
      {
        upper: 'I',
        lower: 'i',
        word: 'Igloo',
        illustrationPath: path.join(OBJECTS_LOCKED, 'igloo.svg'),
        illustrationLabel: 'an igloo',
        // igloo.svg content bbox x=75.96 y=299.57 w=856.12 h=505.30 (0-1024
        // viewBox) -- a low, wide dome, reads small in a square frame at
        // default sizing (confirmed by rendering uncropped vs cropped side
        // by side). Cropped tight to content + 6% padding PER AXIS (not
        // squared to a shared max, unlike page-01's cat crop) -- this
        // frame (letterPage.mjs's .illo-frame) has no CSS forcing svg
        // width/height to an equal %, so the default
        // preserveAspectRatio="xMidYMid meet" letterboxes a non-square
        // viewBox without distortion, and a tight non-square crop fills
        // the frame MORE than an unnecessarily-square one would (verified
        // directly: a per-axis crop reads visibly larger than the
        // padded-square equivalent for a non-square subject like this).
        illustrationViewBox: '25 269 959 566',
      },
    ],
  });
}
