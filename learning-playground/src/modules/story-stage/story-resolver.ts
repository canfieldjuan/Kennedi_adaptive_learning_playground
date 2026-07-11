/**
 * Story resolution — pure and deterministic: pack + family + selection in,
 * concrete playable story out. Token substitution draws ONLY from authored
 * entity phrases; unknown tokens or incompatible selections throw (packs
 * are validated before shipping, so throwing here means a programming
 * error, not a child-facing state).
 */

import type {
  AdultCue,
  ResolvedScene,
  ResolvedStory,
  StoryPack,
  StorySelection,
} from './story-pack.types';

function substitute(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{[a-zA-Z]+\}/g, (match) => {
    const value = tokens[match];
    if (value === undefined) {
      throw new Error(`Unknown story token ${match}`);
    }
    return value;
  });
}

export function resolveStory(
  pack: StoryPack,
  familyId: string,
  selection: StorySelection
): ResolvedStory {
  const family = pack.families.find((entry) => entry.id === familyId);
  if (!family) throw new Error(`Unknown story family ${familyId}`);

  const character = pack.characters.find((entry) => entry.id === selection.characterId);
  const setting = pack.settings.find((entry) => entry.id === selection.settingId);
  const problem = pack.problems.find((entry) => entry.id === selection.problemId);
  if (!character || !setting || !problem) {
    throw new Error('Selection references unknown pack entities');
  }
  if (
    !family.characterIds.includes(character.id) ||
    !family.settingIds.includes(setting.id) ||
    !family.problemIds.includes(problem.id)
  ) {
    throw new Error(
      `Selection ${character.id}/${setting.id}/${problem.id} is not compatible with family ${family.id}`
    );
  }

  const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);
  const tokens: Record<string, string> = {
    '{hero}': character.shortName,
    '{Hero}': character.introName,
    '{their}': character.possessive,
    '{Their}': capitalize(character.possessive),
    '{friend}': problem.friendLabel,
    '{friendPhrase}': problem.friendPhrase,
    '{friendThem}': problem.friendThem,
    '{setting}': setting.phrase,
  };

  const resolveCue = (cue: AdultCue): AdultCue => ({
    beat: substitute(cue.beat, tokens),
    keepTrue: substitute(cue.keepTrue, tokens),
    ask: substitute(cue.ask, tokens),
    ...(cue.silly !== undefined ? { silly: substitute(cue.silly, tokens) } : {}),
  });

  const scenes: ResolvedScene[] = family.scenes.map((scene) => ({
    id: scene.id,
    kind: scene.kind,
    narration: substitute(scene.narration, tokens),
    cue: resolveCue(scene.cue),
    art: scene.art,
    ...(scene.choices
      ? {
          choices: [
            { ...scene.choices[0], label: substitute(scene.choices[0].label, tokens) },
            { ...scene.choices[1], label: substitute(scene.choices[1].label, tokens) },
          ] as NonNullable<ResolvedScene['choices']>,
        }
      : {}),
    ...(scene.next !== undefined ? { next: scene.next } : {}),
    ...(scene.endingId !== undefined ? { endingId: scene.endingId } : {}),
  }));

  return {
    familyId: family.id,
    title: substitute(family.title, tokens),
    opening: substitute(family.opening, tokens),
    entrySceneId: family.entrySceneId,
    pathLength: family.maxPathLength,
    selection,
    scenes,
  };
}
