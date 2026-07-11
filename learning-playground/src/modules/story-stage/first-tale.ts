/**
 * The core story pack (arc slice 4): five original characters, four
 * settings, three problems, and the three authored story families —
 * The Lost Friend, The Broken Thing, and The Special Delivery.
 *
 * Every story is an AUTHORED FAMILY with controlled substitutions over
 * the closed token set — never fragment composition. Compatibility
 * lists keep every offered combination coherent (Milo the puppy never
 * hunts for a puppy friend; the music box lives where tables live),
 * and the validator dry-resolves every supported combination before
 * anything ships.
 *
 * Safety tone (spec §8/§24): missing friends are safe from the first
 * mention; broken things are fixable and nobody is blamed; obstacles
 * are gentle; every story ends safe, happy, and together. The adult
 * cues repeat these facts as "keep true" lines so an improvising adult
 * holds the same tone.
 */

import type { ResolvedStory, StoryPack, StorySelection } from './story-pack.types';
import { resolveStory } from './story-resolver';

export const FIRST_STORY_PACK: StoryPack = {
  id: 'story-pack-core',
  version: 2,
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
    {
      id: 'finn',
      label: 'Finn the Dragon',
      introName: 'Finn the friendly dragon',
      shortName: 'Finn',
      spokenIntro: 'Finn the dragon gives warm, cozy hugs.',
      possessive: 'his',
      art: 'finn',
    },
    {
      id: 'robo',
      label: 'Robo',
      introName: 'Robo the helpful robot',
      shortName: 'Robo',
      spokenIntro: 'Robo the robot loves to help!',
      possessive: 'their',
      art: 'robo',
    },
    {
      id: 'luna',
      label: 'Luna the Unicorn',
      introName: 'Luna the gentle unicorn',
      shortName: 'Luna',
      spokenIntro: 'Luna the unicorn is gentle and kind.',
      possessive: 'her',
      art: 'luna',
    },
    {
      id: 'milo',
      label: 'Milo the Puppy',
      introName: 'Milo the playful puppy',
      shortName: 'Milo',
      spokenIntro: 'Milo the puppy is ready to play!',
      possessive: 'his',
      art: 'milo',
    },
  ],
  settings: [
    {
      id: 'enchanted-forest',
      label: 'The Enchanted Forest',
      spokenIntro: 'The enchanted forest, where the trees sparkle.',
      phrase: 'the enchanted forest',
      detail: 'where the trees sparkle softly',
      art: 'forest',
    },
    {
      id: 'moon-castle',
      label: 'The Moon Castle',
      spokenIntro: 'The moon castle, glowing in the sky.',
      phrase: 'the moon castle',
      detail: 'where the towers glow like little moons',
      art: 'moon-castle',
    },
    {
      id: 'cozy-town',
      label: 'The Cozy Town',
      spokenIntro: 'The cozy town, where every window twinkles.',
      phrase: 'the cozy town',
      detail: 'where every window twinkles hello',
      art: 'cozy-town',
    },
    {
      id: 'cloud-village',
      label: 'The Cloud Village',
      spokenIntro: 'The cloud village, soft as pillows.',
      phrase: 'the cloud village',
      detail: 'where the streets are soft as pillows',
      art: 'cloud-village',
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
    {
      id: 'quiet-music-box',
      label: 'A Quiet Music Box',
      spokenIntro: 'The little music box stopped singing!',
      art: 'music-box',
    },
    {
      id: 'special-delivery',
      label: 'A Special Delivery',
      spokenIntro: 'Something special needs to be delivered!',
      art: 'berry-basket',
    },
  ],
  families: [
    {
      id: 'lost-friend',
      archetype: 'lost-friend',
      title: "{hero} and {friend}'s Great Adventure",
      opening: 'Story time! This is the tale of {Hero}.',
      entrySceneId: 'intro',
      maxPathLength: 6,
      characterIds: ['poppy', 'finn', 'robo', 'luna'],
      settingIds: ['enchanted-forest', 'cozy-town'],
      problemIds: ['missing-friend'],
      scenes: [
        {
          id: 'intro',
          kind: 'intro',
          narration: '{Hero} lives beside {setting}, {settingDetail}.',
          cue: {
            beat: 'We meet {Hero} at home beside {setting}.',
            keepTrue: '{hero} is curious and kind.',
            ask: 'What do you think {hero} sees near {setting}?',
            silly: 'Maybe something sparkles in polka dots.',
          },
          art: 'lost-intro',
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
          art: 'lost-problem',
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
          art: 'lost-where',
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
          art: 'lost-bush',
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
          art: 'lost-log',
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
          art: 'lost-help',
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
          art: 'lost-ending',
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
          art: 'lost-ending',
          endingId: 'found-with-song',
        },
      ],
    },
    {
      id: 'broken-thing',
      archetype: 'broken-thing',
      title: '{hero} and the Little Music Box',
      opening: 'Story time! This is the tale of {Hero}.',
      entrySceneId: 'intro',
      maxPathLength: 6,
      characterIds: ['poppy', 'finn', 'robo', 'luna', 'milo'],
      settingIds: ['cozy-town', 'moon-castle', 'cloud-village'],
      problemIds: ['quiet-music-box'],
      scenes: [
        {
          id: 'intro',
          kind: 'intro',
          narration:
            '{Hero} visits {setting}, {settingDetail}. On a little table sits a tiny music box.',
          cue: {
            beat: 'We meet {Hero} and the little music box in {setting}.',
            keepTrue: 'The music box is special and loved.',
            ask: 'What song do you think the music box plays?',
            silly: 'Maybe it plays a song about pancakes.',
          },
          art: 'fix-intro',
          next: 'problem',
        },
        {
          id: 'problem',
          kind: 'problem',
          narration:
            'Oh! The little music box has gone quiet — one tiny wheel slipped loose, so its song is taking a rest.',
          cue: {
            beat: 'The music box stopped — one tiny wheel is loose.',
            keepTrue:
              'Nothing is ruined and nobody did anything wrong — it can be fixed.',
            ask: 'What do you think made the tiny wheel slip?',
            silly: 'Maybe the wheel wanted a somersault.',
          },
          art: 'fix-problem',
          next: 'how',
        },
        {
          id: 'how',
          kind: 'decision',
          narration: 'How should {hero} help the music box find its song?',
          cue: {
            beat: '{hero} picks a first way to try.',
            keepTrue: 'Both ways are good ideas — trying is what matters.',
            ask: 'What would you try first?',
          },
          art: 'fix-how',
          choices: [
            {
              id: 'wind-it',
              label: 'Wind it gently',
              art: 'wind',
              next: 'wind',
            },
            {
              id: 'peek-inside',
              label: 'Peek inside',
              art: 'peek',
              next: 'inside',
            },
          ],
        },
        {
          id: 'wind',
          kind: 'consequence',
          narration:
            '{Hero} winds the little handle, gentle and slow. The box hums one wobbly note — so close! The tiny wheel still wants to sit back in its place.',
          cue: {
            beat: 'A gentle wind-up gets one wobbly note — almost!',
            keepTrue: 'The first try helped; it is not a mistake.',
            ask: 'What note do you think the box hummed?',
            silly: 'Maybe it sounded like a sleepy kazoo.',
          },
          art: 'fix-wind',
          next: 'finish',
        },
        {
          id: 'inside',
          kind: 'consequence',
          narration:
            '{Hero} peeks inside with a little light. There it is — the tiny wheel, just a bit loose, waiting to be nudged home.',
          cue: {
            beat: 'Peeking inside finds the loose tiny wheel.',
            keepTrue: 'Looking closely is how {hero} finds the answer.',
            ask: 'What else might live inside a music box?',
            silly: 'Maybe a very tiny dust bunny with a hat.',
          },
          art: 'fix-inside',
          next: 'finish',
        },
        {
          id: 'finish',
          kind: 'decision',
          narration: 'The tiny wheel is ready. How should {hero} set it just right?',
          cue: {
            beat: '{hero} picks how to finish the fix.',
            keepTrue: 'Using tools and asking for help are both brave choices.',
            ask: 'Who would you ask for help?',
          },
          art: 'fix-finish',
          choices: [
            {
              id: 'tiny-toolkit',
              label: 'Use the tiny toolkit',
              art: 'toolkit',
              next: 'ending-toolkit',
            },
            {
              id: 'ask-friend',
              label: 'Ask a friend to help',
              art: 'helper',
              next: 'ending-helper',
            },
          ],
        },
        {
          id: 'ending-toolkit',
          kind: 'ending',
          narration:
            'Click! With the tiny toolkit, the wheel pops snugly into place. The music box sings its sweet song again, and everyone dances. The end.',
          cue: {
            beat: 'The toolkit clicks the wheel home and the song returns.',
            keepTrue: 'The story ends happy, with the music box singing.',
            ask: 'What was your favorite part?',
            silly: 'Maybe the box adds a drum solo.',
          },
          art: 'fix-ending-toolkit',
          endingId: 'fixed-with-toolkit',
        },
        {
          id: 'ending-helper',
          kind: 'ending',
          narration:
            '{Hero} asks a kind friend, and together they nudge the wheel home. The music box sings again — fixing is even sweeter together! The end.',
          cue: {
            beat: 'A kind friend helps nudge the wheel home.',
            keepTrue: 'Asking for help made the fix happy and easy.',
            ask: 'What would you and a friend fix together?',
          },
          art: 'fix-ending-helper',
          endingId: 'fixed-with-friend',
        },
      ],
    },
    {
      id: 'special-delivery',
      archetype: 'special-delivery',
      title: '{hero} and the Sunshine Berries',
      opening: 'Story time! This is the tale of {Hero}.',
      entrySceneId: 'intro',
      maxPathLength: 6,
      characterIds: ['poppy', 'finn', 'robo', 'luna', 'milo'],
      settingIds: ['enchanted-forest', 'cloud-village', 'moon-castle'],
      problemIds: ['special-delivery'],
      scenes: [
        {
          id: 'intro',
          kind: 'intro',
          narration:
            '{Hero} visits {setting}, {settingDetail}. Today feels like a very special day.',
          cue: {
            beat: 'We meet {Hero} in {setting} on a special day.',
            keepTrue: '{hero} feels excited and ready.',
            ask: 'What makes a day feel special to you?',
            silly: 'Maybe the wind smells like berries.',
          },
          art: 'delivery-intro',
          next: 'problem',
        },
        {
          id: 'problem',
          kind: 'problem',
          narration:
            'A basket of sunshine berries needs to reach the big surprise party — and {hero} gets to carry it!',
          cue: {
            beat: 'A berry basket must reach the surprise party.',
            keepTrue: 'The job is exciting, not scary — {hero} was chosen to help.',
            ask: 'Who do you think the party is for?',
            silly: 'Maybe the berries giggle when they bounce.',
          },
          art: 'delivery-problem',
          next: 'route',
        },
        {
          id: 'route',
          kind: 'decision',
          narration: 'Which way should {hero} carry the basket?',
          cue: {
            beat: '{hero} picks the path to the party.',
            keepTrue: 'Both paths are safe and both reach the party.',
            ask: 'Which way would YOU go?',
          },
          art: 'delivery-route',
          choices: [
            {
              id: 'little-bridge',
              label: 'Over the little bridge',
              art: 'bridge',
              next: 'bridge',
            },
            {
              id: 'flower-meadow',
              label: 'Through the flower meadow',
              art: 'meadow',
              next: 'meadow',
            },
          ],
        },
        {
          id: 'bridge',
          kind: 'consequence',
          narration:
            'The little bridge sways gently — wibble, wobble! {Hero} hugs the basket close and takes slow, careful tiptoe steps.',
          cue: {
            beat: 'The wobbly bridge asks for careful tiptoe steps.',
            keepTrue: 'The bridge is safe — it just wobbles a little.',
            ask: 'Can you do a tiptoe walk right now?',
            silly: 'Maybe the bridge is humming wibble-wobble.',
          },
          art: 'delivery-bridge',
          next: 'protect',
        },
        {
          id: 'meadow',
          kind: 'consequence',
          narration:
            'The flower meadow is full of sleepy butterflies. {Hero} walks so-o-o softly, keeping the basket safe and steady.',
          cue: {
            beat: 'Sleepy butterflies mean soft, quiet steps.',
            keepTrue: 'The butterflies are friendly — {hero} is just being gentle.',
            ask: 'How quietly can you whisper?',
            silly: 'Maybe one butterfly snores tiny snores.',
          },
          art: 'delivery-meadow',
          next: 'protect',
        },
        {
          id: 'protect',
          kind: 'decision',
          narration: 'The party is just ahead! How should {hero} bring the basket in?',
          cue: {
            beat: '{hero} picks the grand entrance.',
            keepTrue: 'Either way, the berries arrive safe.',
            ask: 'How would you carry something precious?',
          },
          art: 'delivery-protect',
          choices: [
            {
              id: 'carry-high',
              label: 'Carry it up high',
              art: 'carry',
              next: 'ending-high',
            },
            {
              id: 'little-wagon',
              label: 'Roll it in the little wagon',
              art: 'wagon',
              next: 'ending-wagon',
            },
          ],
        },
        {
          id: 'ending-high',
          kind: 'ending',
          narration:
            '{Hero} lifts the basket up high and marches in — ta-da! Friends cheer, the berries shine, and the surprise party begins. The end.',
          cue: {
            beat: 'A ta-da entrance starts the party.',
            keepTrue: 'The delivery worked and everyone is happy.',
            ask: 'What was your favorite part?',
            silly: 'Maybe someone cheers extra loud for the basket.',
          },
          art: 'delivery-ending-high',
          endingId: 'delivered-up-high',
        },
        {
          id: 'ending-wagon',
          kind: 'ending',
          narration:
            '{Hero} tucks the basket into a little wagon and rolls it in, smooth and steady. Friends cheer — sunshine berries for everyone! The end.',
          cue: {
            beat: 'The wagon rolls the berries in safe and steady.',
            keepTrue: 'The delivery worked and everyone shares the berries.',
            ask: 'What would you put in a little wagon?',
          },
          art: 'delivery-ending-wagon',
          endingId: 'delivered-by-wagon',
        },
      ],
    },
  ],
};

/** The classic trio — slice 1's original story, kept as a regression pin. */
export const FIRST_FAMILY_ID = 'lost-friend';
export const FIRST_SELECTION: StorySelection = {
  characterId: 'poppy',
  settingId: 'enchanted-forest',
  problemId: 'missing-friend',
};

export function resolveFirstTale(): ResolvedStory {
  return resolveStory(FIRST_STORY_PACK, FIRST_FAMILY_ID, FIRST_SELECTION);
}
