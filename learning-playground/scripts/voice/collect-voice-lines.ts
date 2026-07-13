/**
 * Enumerate every spoken line the voice pack covers — shared by the manifest
 * builder (scripts/voice/build-voice-manifest.ts, run with vite-node) and the
 * contract test that keeps the manifest honest.
 *
 * Sources, in order:
 * 1. Activity JSON: prompts (content.prompt_audio ?? title), feedback speech
 *    (correct/incorrect/hint), and the phonics letter-first composed prompt.
 * 2. Story Stage: EVERY resolvable story — all families x their compatible
 *    character/setting/problem selections through the real resolver, so the
 *    narration Emma performs is exactly what the game can ever say.
 * 3. Bear Cafe: character call/happy lines and the static stage lines.
 * 4. System lines: session break, home speech labels, parent voice preview.
 *
 * Anything OUTSIDE this enumeration (e.g. Number Train's templated count
 * lines, cafe fix-feedback with quantities) falls back to the device voice by
 * design; those move into the pack when their line builders are extracted.
 */

import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { FIRST_STORY_PACK } from '../../src/modules/story-stage/first-tale';
import { resolveStory } from '../../src/modules/story-stage/story-resolver';
import {
  normalizeVoiceLine,
  voiceLineId,
  type VoiceLineEntry,
  type VoiceLineStyle,
} from '../../src/core/voice-lines';

const PHONICS_PATTERN = /\b(starts with|says|sound)\b|(\b[a-z]-[a-z]-[a-z]\b)/i;

function styleFor(text: string, hint?: VoiceLineStyle): VoiceLineStyle {
  if (hint) return hint;
  return PHONICS_PATTERN.test(text) ? 'phonics' : 'prompt';
}

export function collectVoiceLines(): VoiceLineEntry[] {
  const byId = new Map<string, VoiceLineEntry>();

  const add = (raw: unknown, hint?: VoiceLineStyle): void => {
    if (typeof raw !== 'string') return;
    const text = normalizeVoiceLine(raw);
    if (!text) return;
    const id = voiceLineId(text);
    if (!byId.has(id)) {
      byId.set(id, { id, text, style: styleFor(text, hint) });
    }
  };

  // — 1. Activity JSON lines —
  for (const activity of APPROVED_ACTIVITIES) {
    const content = activity.content as Record<string, unknown>;
    add(content.prompt_audio ?? activity.title);
    for (const key of ['correct', 'incorrect', 'hint'] as const) {
      const rule = activity.feedback_rules?.[key] as
        | { speech?: unknown }
        | undefined;
      add(rule?.speech);
    }

    // Phonics letter-first prompt (composed in PhonicsMatchActivity): fires
    // for initial_sound activities with no segments and a one-letter target.
    const target = content.target_sound;
    const segments = content.segments;
    if (
      activity.skill_ids?.includes('initial_sound') &&
      (!Array.isArray(segments) || segments.length === 0) &&
      typeof target === 'string' &&
      /^[a-z]$/i.test(target)
    ) {
      add(
        `Find the word that starts with the letter ${target.toUpperCase()}.`,
        'phonics'
      );
    }

    // Bear Cafe character lines.
    const character = content.character as
      | { name?: unknown; happyLine?: unknown }
      | undefined;
    if (character && typeof character.name === 'string') {
      add(`${character.name} is calling.`);
      add(character.happyLine);
    }
  }

  // — 2. Story Stage: the full resolvable story space —
  for (const family of FIRST_STORY_PACK.families) {
    for (const characterId of family.characterIds) {
      for (const settingId of family.settingIds) {
        for (const problemId of family.problemIds) {
          const story = resolveStory(FIRST_STORY_PACK, family.id, {
            characterId,
            settingId,
            problemId,
          });
          add(story.opening, 'story');
          for (const scene of story.scenes) {
            add(scene.narration, 'story');
          }
        }
      }
    }
  }

  // — 3. Bear Cafe stage lines (static, from KennedisOrdersActivity) —
  add('Order ready.');
  add('You delivered it.');
  add("Let's check the order.");
  add('Bear starts with b-b-b. Banana starts with b-b-b.', 'phonics');

  // — 4. System lines —
  add('Time for a break! You did great today.'); // session timer (main.ts)
  add('Hi! Let us play and learn.'); // parent panel voice preview
  add('All done.'); // video vault completion default
  for (const label of ['Words', 'Bear Cafe', 'Math', 'Art']) {
    add(label); // home card speech labels
  }

  // Drop the token-guard artifact if it produced a nonsense line.
  for (const [id, entry] of byId) {
    if (entry.text.includes('{') || entry.text.includes('}')) byId.delete(id);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
