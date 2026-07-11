/**
 * Story-pack validator — pure, exhaustive, and the reason future packs can
 * ship safely: every rule from the arc spec (§13–§14) is a named check
 * with a specific error string. Contract tests prove the approved pack
 * validates AND that every rule actually catches a broken pack.
 */

import type {
  PackScene,
  StoryFamily,
  StoryPack,
} from './story-pack.types';
import { STORY_TOKENS } from './story-pack.types';
import { resolveStory } from './story-resolver';

const KNOWN_TOKENS = new Set<string>(STORY_TOKENS);

export function validateStoryPack(pack: StoryPack): string[] {
  const errors: string[] = [];

  // — Duplicate ids across every entity space —
  checkDuplicates(errors, 'character', pack.characters.map((entry) => entry.id));
  checkDuplicates(errors, 'setting', pack.settings.map((entry) => entry.id));
  checkDuplicates(errors, 'problem', pack.problems.map((entry) => entry.id));
  checkDuplicates(errors, 'family', pack.families.map((entry) => entry.id));

  // — No external URLs anywhere in the pack —
  if (/https?:\/\//.test(JSON.stringify(pack))) {
    errors.push('pack contains an external URL');
  }

  const characterIds = new Set(pack.characters.map((entry) => entry.id));
  const settingIds = new Set(pack.settings.map((entry) => entry.id));
  const problemIds = new Set(pack.problems.map((entry) => entry.id));

  for (const family of pack.families) {
    validateFamily(errors, family, { characterIds, settingIds, problemIds });
  }

  // — Every supported combination must actually resolve —
  // Structural §13: no branch may accidentally depend on an entity the
  // selection cannot supply (e.g. a friend token with a friendless
  // problem). Combination counts are authored-small, so resolve them all.
  if (errors.length === 0) {
    for (const family of pack.families) {
      for (const characterId of family.characterIds) {
        for (const settingId of family.settingIds) {
          for (const problemId of family.problemIds) {
            try {
              resolveStory(pack, family.id, { characterId, settingId, problemId });
            } catch (cause) {
              const reason = cause instanceof Error ? cause.message : String(cause);
              errors.push(
                `family ${family.id}: combination ${characterId}/${settingId}/${problemId} does not resolve (${reason})`
              );
            }
          }
        }
      }
    }
  }

  return errors;
}

function validateFamily(
  errors: string[],
  family: StoryFamily,
  known: { characterIds: Set<string>; settingIds: Set<string>; problemIds: Set<string> }
): void {
  const where = `family ${family.id}`;
  const scenesById = new Map<string, PackScene>();

  checkDuplicates(errors, `${where} scene`, family.scenes.map((scene) => scene.id));
  for (const scene of family.scenes) scenesById.set(scene.id, scene);

  // — Compatibility lists must reference real entities and be non-empty —
  if (family.characterIds.length === 0) errors.push(`${where}: no compatible characters`);
  if (family.settingIds.length === 0) errors.push(`${where}: no compatible settings`);
  if (family.problemIds.length === 0) errors.push(`${where}: no compatible problems`);
  for (const id of family.characterIds) {
    if (!known.characterIds.has(id)) errors.push(`${where}: unknown character ${id}`);
  }
  for (const id of family.settingIds) {
    if (!known.settingIds.has(id)) errors.push(`${where}: unknown setting ${id}`);
  }
  for (const id of family.problemIds) {
    if (!known.problemIds.has(id)) errors.push(`${where}: unknown problem ${id}`);
  }

  // — Entry scene exists —
  if (!scenesById.has(family.entrySceneId)) {
    errors.push(`${where}: missing entry scene ${family.entrySceneId}`);
    return;
  }

  // — Per-scene shape rules —
  for (const scene of family.scenes) {
    const at = `${where} scene ${scene.id}`;

    if (scene.narration.trim().length === 0) errors.push(`${at}: empty narration`);
    if (
      scene.cue.beat.trim().length === 0 ||
      scene.cue.keepTrue.trim().length === 0 ||
      scene.cue.ask.trim().length === 0
    ) {
      errors.push(`${at}: missing adult cue`);
    }
    if (scene.art.trim().length === 0) errors.push(`${at}: missing art key`);

    for (const template of [
      scene.narration,
      scene.cue.beat,
      scene.cue.keepTrue,
      scene.cue.ask,
      scene.cue.silly ?? '',
    ]) {
      for (const token of template.match(/\{[a-zA-Z]+\}/g) ?? []) {
        if (!KNOWN_TOKENS.has(token)) {
          errors.push(`${at}: unknown narration token ${token}`);
        }
      }
    }

    if (scene.kind === 'decision') {
      if (!scene.choices || scene.choices.length !== 2) {
        errors.push(`${at}: decisions need exactly two choices`);
      } else {
        const [a, b] = scene.choices;
        if (a.next === b.next) errors.push(`${at}: fake choice (both lead to ${a.next})`);
        for (const choice of scene.choices) {
          if (choice.label.trim().length === 0) errors.push(`${at}: choice ${choice.id} missing label`);
          if (choice.art.trim().length === 0) errors.push(`${at}: choice ${choice.id} missing art`);
          if (!scenesById.has(choice.next)) {
            errors.push(`${at}: choice ${choice.id} leads to missing scene ${choice.next}`);
          }
        }
      }
      if (scene.next !== undefined) errors.push(`${at}: decisions must not have a continue target`);
    } else if (scene.kind === 'ending') {
      if (scene.next !== undefined || scene.choices !== undefined) {
        errors.push(`${at}: endings must not continue`);
      }
      if (!scene.endingId || scene.endingId.trim().length === 0) {
        errors.push(`${at}: ending without an ending id`);
      }
    } else {
      if (scene.choices !== undefined) errors.push(`${at}: only decisions may have choices`);
      if (scene.next === undefined) {
        errors.push(`${at}: dead end without an ending`);
      } else if (!scenesById.has(scene.next)) {
        errors.push(`${at}: next scene ${scene.next} is missing`);
      }
    }
  }

  // — Graph rules: reachability, cycles, path bounds, endings —
  const reachable = new Set<string>();
  let sawEnding = false;

  const walk = (sceneId: string, depth: number, seen: Set<string>): void => {
    const scene = scenesById.get(sceneId);
    if (!scene) return; // already reported above
    if (seen.has(sceneId)) {
      errors.push(`${where}: circular path through ${sceneId}`);
      return;
    }
    reachable.add(sceneId);
    if (depth > family.maxPathLength) {
      errors.push(`${where}: path through ${sceneId} exceeds max length ${family.maxPathLength}`);
      return;
    }
    const nextSeen = new Set(seen).add(sceneId);
    if (scene.kind === 'ending') {
      sawEnding = true;
      return;
    }
    if (scene.kind === 'decision' && scene.choices?.length === 2) {
      walk(scene.choices[0].next, depth + 1, nextSeen);
      walk(scene.choices[1].next, depth + 1, nextSeen);
      return;
    }
    if (scene.next) walk(scene.next, depth + 1, nextSeen);
  };
  walk(family.entrySceneId, 1, new Set());

  if (!sawEnding) errors.push(`${where}: no reachable ending`);
  for (const scene of family.scenes) {
    if (!reachable.has(scene.id)) errors.push(`${where}: unreachable scene ${scene.id}`);
  }
}

function checkDuplicates(errors: string[], label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate ${label} id ${id}`);
    seen.add(id);
  }
}
