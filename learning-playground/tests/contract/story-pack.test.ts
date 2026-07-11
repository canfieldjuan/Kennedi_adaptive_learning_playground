/**
 * Story-pack contract tests (arc slice 2).
 *
 * Three claims, each load-bearing:
 * 1. The shipped pack validates cleanly and resolves deterministically.
 * 2. The resolved narration is BYTE-IDENTICAL to the slice-1 hardcoded
 *    strings — the migration to authored data moved nothing the child
 *    sees or hears.
 * 3. EVERY validator rule is proven by a mutation test: a broken clone
 *    of the pack per rule, each caught with its named error. A validator
 *    rule without a failing case is a rule we only believe exists.
 */

import { describe, expect, test } from 'vitest';
import {
  FIRST_FAMILY_ID,
  FIRST_SELECTION,
  FIRST_STORY_PACK,
  resolveFirstTale,
} from '../../src/modules/story-stage/first-tale';
import { resolveStory } from '../../src/modules/story-stage/story-resolver';
import { validateStoryPack } from '../../src/modules/story-stage/story-validator';
import type { StoryPack } from '../../src/modules/story-stage/story-pack.types';

/** Deep-clone the approved pack so each mutation starts from a valid base. */
function clonePack(): StoryPack {
  return JSON.parse(JSON.stringify(FIRST_STORY_PACK)) as StoryPack;
}

function family(pack: StoryPack) {
  return pack.families[0];
}

function scene(pack: StoryPack, id: string) {
  const found = family(pack).scenes.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing scene ${id}`);
  return found;
}

describe('the approved story pack', () => {
  test('validates with zero errors', () => {
    expect(validateStoryPack(FIRST_STORY_PACK)).toEqual([]);
  });

  test('resolution is deterministic: same pack + selection, same story', () => {
    const first = resolveStory(FIRST_STORY_PACK, FIRST_FAMILY_ID, FIRST_SELECTION);
    const second = resolveStory(FIRST_STORY_PACK, FIRST_FAMILY_ID, FIRST_SELECTION);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  test('resolved narration is byte-identical to the slice-1 tale', () => {
    const story = resolveFirstTale();
    expect(story.title).toBe("Poppy and Biscuit's Forest Adventure");
    expect(story.opening).toBe(
      'Story time! This is the tale of Princess Poppy the explorer.'
    );
    const narrationById = new Map(
      story.scenes.map((entry) => [entry.id, entry.narration])
    );
    expect(narrationById.get('intro')).toBe(
      'Princess Poppy the explorer lives beside the enchanted forest, where the trees sparkle softly.'
    );
    expect(narrationById.get('problem')).toBe(
      'Oh! Her puppy friend Biscuit wandered off to play — Biscuit is safe, but Poppy wants to find him. Look, tiny paw prints!'
    );
    expect(narrationById.get('where')).toBe('Where should Poppy look for Biscuit?');
    expect(narrationById.get('bush')).toBe(
      'The sparkly path leads to a giggling bush — Poppy can see Biscuit’s waggly tail! But the branches are all tangled, and Biscuit feels a little shy.'
    );
    expect(narrationById.get('log')).toBe(
      'The friendly owl blinks kindly and points a wing at the old hollow log. Biscuit is curled up inside — safe, but a little shy about coming out.'
    );
    expect(narrationById.get('help')).toBe(
      'How should Poppy help Biscuit feel brave enough to come out?'
    );
    expect(narrationById.get('ending-bubbles')).toBe(
      'Shimmery bubbles float and pop — Biscuit bounces out laughing! Poppy hugs her friend, and they walk home together, safe and happy. The end.'
    );
    expect(narrationById.get('ending-song')).toBe(
      'Poppy hums Biscuit’s favorite song, soft and warm. Biscuit wiggles out, tail wagging! They walk home together, safe and happy. The end.'
    );
  });

  test('no unresolved tokens survive resolution, in narration or cues', () => {
    const story = resolveFirstTale();
    expect(JSON.stringify(story)).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  test('every scene carries a complete adult cue (Together mode is data-ready)', () => {
    for (const entry of family(FIRST_STORY_PACK).scenes) {
      expect(entry.cue.beat.trim().length).toBeGreaterThan(0);
      expect(entry.cue.keepTrue.trim().length).toBeGreaterThan(0);
      expect(entry.cue.ask.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('the resolver rejects invalid requests', () => {
  test('unknown family', () => {
    expect(() =>
      resolveStory(FIRST_STORY_PACK, 'no-such-family', FIRST_SELECTION)
    ).toThrow(/Unknown story family/);
  });

  test('selection referencing unknown entities', () => {
    expect(() =>
      resolveStory(FIRST_STORY_PACK, FIRST_FAMILY_ID, {
        ...FIRST_SELECTION,
        characterId: 'no-such-character',
      })
    ).toThrow(/unknown pack entities/);
  });

  test('selection outside the family compatibility lists', () => {
    const pack = clonePack();
    pack.characters.push({ ...pack.characters[0], id: 'stranger' });
    expect(() =>
      resolveStory(pack, FIRST_FAMILY_ID, {
        ...FIRST_SELECTION,
        characterId: 'stranger',
      })
    ).toThrow(/not compatible with family/);
  });

  test('unknown token in a template', () => {
    const pack = clonePack();
    scene(pack, 'intro').narration = 'Hello {mystery}!';
    expect(() => resolveStory(pack, FIRST_FAMILY_ID, FIRST_SELECTION)).toThrow(
      /Unknown story token \{mystery\}/
    );
  });
});

describe('validator mutation coverage — every rule catches its broken pack', () => {
  test('duplicate character id', () => {
    const pack = clonePack();
    pack.characters.push({ ...pack.characters[0] });
    expect(validateStoryPack(pack)).toContain('duplicate character id poppy');
  });

  test('duplicate setting id', () => {
    const pack = clonePack();
    pack.settings.push({ ...pack.settings[0] });
    expect(validateStoryPack(pack)).toContain('duplicate setting id enchanted-forest');
  });

  test('duplicate problem id', () => {
    const pack = clonePack();
    pack.problems.push({ ...pack.problems[0] });
    expect(validateStoryPack(pack)).toContain('duplicate problem id missing-friend');
  });

  test('duplicate family id', () => {
    const pack = clonePack();
    pack.families.push(JSON.parse(JSON.stringify(pack.families[0])));
    expect(validateStoryPack(pack)).toContain('duplicate family id lost-friend');
  });

  test('duplicate scene id within a family', () => {
    const pack = clonePack();
    family(pack).scenes.push(JSON.parse(JSON.stringify(scene(pack, 'intro'))));
    expect(validateStoryPack(pack)).toContain(
      'duplicate family lost-friend scene id intro'
    );
  });

  test('external URL anywhere in the pack', () => {
    const pack = clonePack();
    scene(pack, 'intro').narration = 'Watch at https://example.com now';
    expect(validateStoryPack(pack)).toContain('pack contains an external URL');
  });

  test('empty compatibility lists', () => {
    const pack = clonePack();
    family(pack).characterIds = [];
    family(pack).settingIds = [];
    family(pack).problemIds = [];
    const errors = validateStoryPack(pack);
    expect(errors).toContain('family lost-friend: no compatible characters');
    expect(errors).toContain('family lost-friend: no compatible settings');
    expect(errors).toContain('family lost-friend: no compatible problems');
  });

  test('compatibility lists referencing unknown entities', () => {
    const pack = clonePack();
    family(pack).characterIds.push('ghost-character');
    family(pack).settingIds.push('ghost-setting');
    family(pack).problemIds.push('ghost-problem');
    const errors = validateStoryPack(pack);
    expect(errors).toContain('family lost-friend: unknown character ghost-character');
    expect(errors).toContain('family lost-friend: unknown setting ghost-setting');
    expect(errors).toContain('family lost-friend: unknown problem ghost-problem');
  });

  test('missing entry scene', () => {
    const pack = clonePack();
    family(pack).entrySceneId = 'nowhere';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend: missing entry scene nowhere'
    );
  });

  test('empty narration', () => {
    const pack = clonePack();
    scene(pack, 'intro').narration = '   ';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene intro: empty narration'
    );
  });

  test('missing adult cue', () => {
    const pack = clonePack();
    scene(pack, 'intro').cue.ask = '';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene intro: missing adult cue'
    );
  });

  test('missing art key', () => {
    const pack = clonePack();
    scene(pack, 'intro').art = '';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene intro: missing art key'
    );
  });

  test('unknown narration token', () => {
    const pack = clonePack();
    scene(pack, 'intro').narration = '{Hero} met {villain} today.';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene intro: unknown narration token {villain}'
    );
  });

  test('unknown token hiding in a cue template', () => {
    const pack = clonePack();
    scene(pack, 'intro').cue.silly = 'Add a {dragon} if you like.';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene intro: unknown narration token {dragon}'
    );
  });

  test('decision without exactly two choices', () => {
    const pack = clonePack();
    const where = scene(pack, 'where');
    where.choices = [where.choices![0]] as unknown as typeof where.choices;
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene where: decisions need exactly two choices'
    );
  });

  test('fake choice: both options lead to the same scene', () => {
    const pack = clonePack();
    const where = scene(pack, 'where');
    where.choices![1].next = where.choices![0].next;
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene where: fake choice (both lead to bush)'
    );
  });

  test('choice missing its label and art', () => {
    const pack = clonePack();
    const where = scene(pack, 'where');
    where.choices![0].label = ' ';
    where.choices![0].art = '';
    const errors = validateStoryPack(pack);
    expect(errors).toContain(
      'family lost-friend scene where: choice sparkly-path missing label'
    );
    expect(errors).toContain(
      'family lost-friend scene where: choice sparkly-path missing art'
    );
  });

  test('choice leading to a missing scene', () => {
    const pack = clonePack();
    scene(pack, 'where').choices![0].next = 'nowhere';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene where: choice sparkly-path leads to missing scene nowhere'
    );
  });

  test('decision with a stray continue target', () => {
    const pack = clonePack();
    scene(pack, 'where').next = 'bush';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene where: decisions must not have a continue target'
    );
  });

  test('ending that tries to continue', () => {
    const pack = clonePack();
    scene(pack, 'ending-song').next = 'intro';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene ending-song: endings must not continue'
    );
  });

  test('ending without an ending id', () => {
    const pack = clonePack();
    delete scene(pack, 'ending-song').endingId;
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene ending-song: ending without an ending id'
    );
  });

  test('non-decision scene with choices', () => {
    const pack = clonePack();
    const intro = scene(pack, 'intro');
    intro.choices = JSON.parse(JSON.stringify(scene(pack, 'where').choices));
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene intro: only decisions may have choices'
    );
  });

  test('dead end: a scene that neither continues nor ends', () => {
    const pack = clonePack();
    delete scene(pack, 'bush').next;
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene bush: dead end without an ending'
    );
  });

  test('continue target pointing at a missing scene', () => {
    const pack = clonePack();
    scene(pack, 'bush').next = 'nowhere';
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend scene bush: next scene nowhere is missing'
    );
  });

  test('circular path', () => {
    const pack = clonePack();
    // bush loops back to the problem scene instead of moving forward.
    scene(pack, 'bush').next = 'problem';
    expect(
      validateStoryPack(pack).some((error) =>
        error.startsWith('family lost-friend: circular path through ')
      )
    ).toBe(true);
  });

  test('path exceeding the family max length', () => {
    const pack = clonePack();
    family(pack).maxPathLength = 3;
    expect(
      validateStoryPack(pack).some((error) =>
        error.includes('exceeds max length 3')
      )
    ).toBe(true);
  });

  test('unreachable scene', () => {
    const pack = clonePack();
    family(pack).scenes.push({
      id: 'orphan',
      kind: 'consequence',
      narration: 'Nobody can reach this scene.',
      cue: { beat: 'Orphan beat.', keepTrue: 'Orphan fact.', ask: 'Orphan ask?' },
      art: 'bush',
      next: 'help',
    });
    expect(validateStoryPack(pack)).toContain(
      'family lost-friend: unreachable scene orphan'
    );
  });

  test('no reachable ending', () => {
    const pack = clonePack();
    // Shrink the family to a two-scene loop with no ending anywhere.
    family(pack).scenes = [
      {
        id: 'intro',
        kind: 'intro',
        narration: 'A story that never ends.',
        cue: { beat: 'Beat.', keepTrue: 'Fact.', ask: 'Ask?' },
        art: 'intro',
        next: 'middle',
      },
      {
        id: 'middle',
        kind: 'consequence',
        narration: 'Still going.',
        cue: { beat: 'Beat.', keepTrue: 'Fact.', ask: 'Ask?' },
        art: 'bush',
        next: 'intro',
      },
    ];
    family(pack).entrySceneId = 'intro';
    expect(validateStoryPack(pack)).toContain('family lost-friend: no reachable ending');
  });
});
