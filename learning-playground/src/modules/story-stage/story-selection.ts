/**
 * Selection helpers for the Pick Three setup (arc slice 3) — pure and
 * deterministic. These make "valid compatible combinations" structural:
 * every step only offers entities that some family supports GIVEN the
 * picks already made, so an unsupported trio is impossible by
 * construction, not merely checked after the fact.
 */

import type {
  StoryCharacter,
  StoryFamily,
  StoryPack,
  StoryProblem,
  StorySelection,
  StorySetting,
} from './story-pack.types';

export interface SelectableEntities {
  characters: StoryCharacter[];
  settings: StorySetting[];
  problems: StoryProblem[];
}

/** Families whose compatibility lists include every id picked so far. */
export function familiesSupporting(
  pack: StoryPack,
  partial: Partial<StorySelection>
): StoryFamily[] {
  return pack.families.filter(
    (family) =>
      (!partial.characterId || family.characterIds.includes(partial.characterId)) &&
      (!partial.settingId || family.settingIds.includes(partial.settingId)) &&
      (!partial.problemId || family.problemIds.includes(partial.problemId))
  );
}

/**
 * The entities the setup may offer as cards given the picks so far: only
 * those referenced by a family that still supports the partial selection.
 * With no picks yet, this is also the "authored but unwired entities never
 * render as dead cards" filter.
 */
export function selectableEntities(
  pack: StoryPack,
  partial: Partial<StorySelection> = {}
): SelectableEntities {
  const families = familiesSupporting(pack, partial);
  const characterIds = new Set(families.flatMap((family) => family.characterIds));
  const settingIds = new Set(families.flatMap((family) => family.settingIds));
  const problemIds = new Set(families.flatMap((family) => family.problemIds));
  return {
    characters: pack.characters.filter((entry) => characterIds.has(entry.id)),
    settings: pack.settings.filter((entry) => settingIds.has(entry.id)),
    problems: pack.problems.filter((entry) => problemIds.has(entry.id)),
  };
}

/**
 * The family that tells the selected trio's story, or undefined when no
 * family supports it. Deterministic: pack author order breaks ties.
 */
export function findFamilyFor(
  pack: StoryPack,
  selection: StorySelection
): StoryFamily | undefined {
  return familiesSupporting(pack, selection)[0];
}
