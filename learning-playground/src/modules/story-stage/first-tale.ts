/**
 * The first tale — a fixed Lost Friend story that proves the complete
 * child flow: intro → problem → a real WHERE decision (two distinct
 * consequences) → a real HOW decision → two ending variants.
 *
 * Safety tone: Biscuit is explicitly safe from the first mention; the
 * obstacles are a tangled bush and a shy moment; safety is restored
 * clearly and the story ends with a walk home together.
 */

import type { FixedStoryTale } from './story-stage.types';

export const FIRST_TALE: FixedStoryTale = {
  id: 'lost-friend-poppy-biscuit',
  title: "Poppy and Biscuit's Forest Adventure",
  opening: 'Story time! This is the tale of Princess Poppy the explorer.',
  entrySceneId: 'intro',
  pathLength: 6,
  scenes: [
    {
      id: 'intro',
      kind: 'intro',
      narration:
        'Princess Poppy the explorer lives beside the enchanted forest, where the trees sparkle softly.',
      art: 'intro',
      next: 'problem',
    },
    {
      id: 'problem',
      kind: 'problem',
      narration:
        'Oh! Her puppy friend Biscuit wandered off to play — Biscuit is safe, but Poppy wants to find him. Look, tiny paw prints!',
      art: 'problem',
      next: 'where',
    },
    {
      id: 'where',
      kind: 'decision',
      narration: 'Where should Poppy look for Biscuit?',
      art: 'where',
      choices: [
        {
          id: 'sparkly-path',
          label: 'Follow the sparkly path',
          art: 'sparkle',
          next: 'bush',
        },
        {
          id: 'ask-owl',
          label: 'Ask the friendly owl',
          art: 'owl',
          next: 'log',
        },
      ],
    },
    {
      id: 'bush',
      kind: 'consequence',
      narration:
        'The sparkly path leads to a giggling bush — Poppy can see Biscuit’s waggly tail! But the branches are all tangled, and Biscuit feels a little shy.',
      art: 'bush',
      next: 'help',
    },
    {
      id: 'log',
      kind: 'consequence',
      narration:
        'The friendly owl blinks kindly and points a wing at the old hollow log. Biscuit is curled up inside — safe, but a little shy about coming out.',
      art: 'log',
      next: 'help',
    },
    {
      id: 'help',
      kind: 'decision',
      narration: 'How should Poppy help Biscuit feel brave enough to come out?',
      art: 'help',
      choices: [
        {
          id: 'bubbles',
          label: 'Blow gentle bubbles',
          art: 'bubbles',
          next: 'ending-bubbles',
        },
        {
          id: 'song',
          label: 'Sing a soft song',
          art: 'song',
          next: 'ending-song',
        },
      ],
    },
    {
      id: 'ending-bubbles',
      kind: 'ending',
      narration:
        'Shimmery bubbles float and pop — Biscuit bounces out laughing! Poppy hugs her friend, and they walk home together, safe and happy. The end.',
      art: 'ending',
    },
    {
      id: 'ending-song',
      kind: 'ending',
      narration:
        'Poppy hums Biscuit’s favorite song, soft and warm. Biscuit wiggles out, tail wagging! They walk home together, safe and happy. The end.',
      art: 'ending',
    },
  ],
};
