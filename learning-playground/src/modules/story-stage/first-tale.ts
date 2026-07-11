/**
 * The first story pack — the slice-1 Lost Friend tale migrated into
 * authored data (arc slice 2). Poppy, Biscuit, and the enchanted forest
 * are now first-class entities; scene narration is a template over the
 * closed token set; every scene carries its adult storyteller cue for
 * Tell It Together (slice 5). Resolving this pack with the fixed
 * selection reproduces slice 1's narration strings EXACTLY (test-pinned),
 * so the child experience does not move.
 *
 * Safety tone: Biscuit is explicitly safe from the first mention; the
 * obstacles are a tangled bush and a shy moment; safety is restored
 * clearly and the story ends with a walk home together. The cues repeat
 * the safety facts as "keep true" lines so an improvising adult holds
 * the same tone.
 */

import type { ResolvedStory, StoryPack, StorySelection } from './story-pack.types';
import { resolveStory } from './story-resolver';

export const FIRST_STORY_PACK: StoryPack = {
  id: 'story-pack-core',
  version: 1,
  characters: [
    {
      id: 'poppy',
      label: 'Princess Poppy',
      introName: 'Princess Poppy the explorer',
      shortName: 'Poppy',
      spokenIntro: 'Princess Poppy loves to explore.',
      possessive: 'her',
      art: 'poppy',
    },
  ],
  settings: [
    {
      id: 'enchanted-forest',
      label: 'The Enchanted Forest',
      spokenIntro: 'The enchanted forest, where the trees sparkle.',
      phrase: 'the enchanted forest',
      art: 'forest',
    },
  ],
  problems: [
    {
      id: 'missing-friend',
      label: 'A Missing Friend',
      spokenIntro: 'Someone wandered off to play!',
      friendLabel: 'Biscuit',
      friendPhrase: 'puppy friend Biscuit',
      friendThem: 'him',
      art: 'paw-prints',
    },
  ],
  families: [
    {
      id: 'lost-friend',
      archetype: 'lost-friend',
      title: "{hero} and {friend}'s Forest Adventure",
      opening: 'Story time! This is the tale of {Hero}.',
      entrySceneId: 'intro',
      maxPathLength: 6,
      characterIds: ['poppy'],
      settingIds: ['enchanted-forest'],
      problemIds: ['missing-friend'],
      scenes: [
        {
          id: 'intro',
          kind: 'intro',
          narration:
            '{Hero} lives beside {setting}, where the trees sparkle softly.',
          cue: {
            beat: 'We meet {Hero} at home beside {setting}.',
            keepTrue: '{hero} is curious and kind.',
            ask: 'What do you think {hero} sees in the sparkly trees?',
            silly: 'Maybe one tree sparkles in polka dots.',
          },
          art: 'intro',
          next: 'problem',
        },
        {
          id: 'problem',
          kind: 'problem',
          narration:
            'Oh! {Their} {friendPhrase} wandered off to play — {friend} is safe, but {hero} wants to find {friendThem}. Look, tiny paw prints!',
          cue: {
            beat: '{friend} wandered off to play — the adventure begins.',
            keepTrue:
              '{friend} is safe the whole time; {hero} just wants to find {friendThem}.',
            ask: 'What sound do you think {friend} makes far away?',
            silly: 'The paw prints could be extra tiny and extra wiggly.',
          },
          art: 'problem',
          next: 'where',
        },
        {
          id: 'where',
          kind: 'decision',
          narration: 'Where should {hero} look for {friend}?',
          cue: {
            beat: '{hero} picks where to look: the sparkly path or the friendly owl.',
            keepTrue: 'Both ways are safe and both can find {friend}.',
            ask: 'Where would YOU look first?',
          },
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
            'The sparkly path leads to a giggling bush — {hero} can see {friend}’s waggly tail! But the branches are all tangled, and {friend} feels a little shy.',
          cue: {
            beat: 'The sparkly path leads to a giggling bush hiding {friend}.',
            keepTrue: '{friend} is found and safe — just feeling a little shy.',
            ask: 'What do you think is making the bush giggle?',
            silly: 'The bush might be ticklish.',
          },
          art: 'bush',
          next: 'help',
        },
        {
          id: 'log',
          kind: 'consequence',
          narration:
            'The friendly owl blinks kindly and points a wing at the old hollow log. {friend} is curled up inside — safe, but a little shy about coming out.',
          cue: {
            beat: 'The friendly owl points to the old hollow log where {friend} hides.',
            keepTrue: 'The owl is kind and {friend} is safe inside the log.',
            ask: 'What would you say to thank the owl?',
            silly: 'The owl might hoot in a fancy voice.',
          },
          art: 'log',
          next: 'help',
        },
        {
          id: 'help',
          kind: 'decision',
          narration: 'How should {hero} help {friend} feel brave enough to come out?',
          cue: {
            beat: '{hero} picks a gentle way to help {friend} feel brave.',
            keepTrue: 'No one is scolded — {friend} just needs gentle courage.',
            ask: 'What helps you feel brave?',
          },
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
            'Shimmery bubbles float and pop — {friend} bounces out laughing! {hero} hugs {their} friend, and they walk home together, safe and happy. The end.',
          cue: {
            beat: 'Bubbles make {friend} laugh, and everyone walks home together.',
            keepTrue: 'The story ends safe, happy, and together.',
            ask: 'What was your favorite part?',
            silly: 'One bubble might pop right on {friend}’s nose.',
          },
          art: 'ending',
          endingId: 'found-with-bubbles',
        },
        {
          id: 'ending-song',
          kind: 'ending',
          narration:
            '{hero} hums {friend}’s favorite song, soft and warm. {friend} wiggles out, tail wagging! They walk home together, safe and happy. The end.',
          cue: {
            beat: 'A soft song helps {friend} wiggle out, and everyone walks home.',
            keepTrue: 'The story ends safe, happy, and together.',
            ask: 'What song would you hum to {friend}?',
          },
          art: 'ending',
          endingId: 'found-with-song',
        },
      ],
    },
  ],
};

/** Slice 2 plays the same fixed selection slice 1 shipped; Pick Three (slice 3) replaces this. */
export const FIRST_FAMILY_ID = 'lost-friend';
export const FIRST_SELECTION: StorySelection = {
  characterId: 'poppy',
  settingId: 'enchanted-forest',
  problemId: 'missing-friend',
};

export function resolveFirstTale(): ResolvedStory {
  return resolveStory(FIRST_STORY_PACK, FIRST_FAMILY_ID, FIRST_SELECTION);
}
