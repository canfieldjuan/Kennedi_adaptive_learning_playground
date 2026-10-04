import { alphabetPracticePage } from '../components/alphabet-practice.mjs';

// Reuse the current tracked artwork. No draft color candidates, new generation,
// or owner-approval claims. Change a cue here without changing row layout.
const cues = [
  ['Alligator', 'alligator-01-walking'], ['Bear', 'bear-01-sitting'],
  ['Cat', 'cat-01-sleeping'], ['Dog', 'dog-01-sitting'],
  ['Elephant', 'elephant-01-standing'], ['Fox', 'fox-01-sitting'],
  ['Giraffe', 'giraffe-01-standing'], ['Hippo', 'hippo-01-standing'],
  ['Iguana', 'iguana-01-standing'], ['Jellyfish', 'jellyfish-01-floating'],
  ['Kangaroo', 'kangaroo-01-standing'], ['Lion', 'lion-01-sitting'],
  ['Monkey', 'monkey-01-sitting'], ['Narwhal', 'narwhal-01-swimming'],
  ['Owl', 'owl-01-perched'], ['Penguin', 'penguin-01-standing'],
  ['Queen', 'queen-01-standing'], ['Raccoon', 'raccoon-01-sitting'],
  ['Shark', 'shark-01-swimming'], ['Turtle', 'turtle-01-walking'],
  ['Unicorn', 'unicorn-01-standing'], ['Vulture', 'vulture-01-perched'],
  ['Whale', 'whale-01-swimming'], ['X-ray fish', 'xrayfish-01-swimming'],
  ['Yak', 'yak-01-standing'], ['Zebra', 'zebra-01-standing'],
];

export const alphabet = cues.map(([word, asset], index) => ({
  upper: String.fromCharCode(65 + index),
  lower: String.fromCharCode(97 + index),
  word,
  illustrationPath: `design-source/animals/locked-poses/${asset}.svg`,
  illustrationLabel: `A picture of a ${word.toLowerCase()}`,
  approvalStatus: 'existing-locked-art; alphabet layout awaits owner review',
}));

export const pages = Array.from({ length: alphabet.length / 2 }, (_, index) => {
  const letters = alphabet.slice(index * 2, index * 2 + 2);
  const meta = {
    pageNumber: index + 1,
    title: 'My alphabet practice',
    letters: letters.map(({ upper, lower }) => [upper, lower]).flat(),
    cues: letters,
    primarySkill: 'manuscript letter tracing',
  };
  return { meta, render: (crops = {}) => alphabetPracticePage({ ...meta, letters, crops }) };
});
