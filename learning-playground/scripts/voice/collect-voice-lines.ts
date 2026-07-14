/**
 * Enumerate every spoken line the voice pack covers — shared by the manifest
 * builder (scripts/voice/build-voice-manifest.ts, run with vite-node) and the
 * contract test that keeps the manifest honest.
 *
 * Sources, in order:
 * 1. Activity JSON: prompts (content.prompt_audio ?? title), feedback speech
 *    (correct/incorrect/hint), and the phonics letter-first composed prompt.
 * 2. Bear Cafe: character call/happy lines, every fix-feedback line
 *    (via the shared cafe-lines builders), and the static stage lines.
 * 3. Number Train: plans are SEEDED in the JSON, so every round is
 *    deterministic — prompts, success lines, hints, and the full
 *    reachable support/structural space (via the shared train-lines
 *    builders and the real buildSessionPlan).
 * 4. Story Stage: the Pick Three setup lines (step prompts + entity
 *    spoken intros) and EVERY resolvable story through the real resolver.
 * 5. System lines: session break, home speech labels, parent voice preview.
 *
 * This enumeration is intended to be TOTAL: the device voice remains only
 * as the fail-open path (missing clip, autoplay refusal, future content
 * added without regeneration — which the lockstep contract test catches).
 */

import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { FIRST_STORY_PACK } from '../../src/modules/story-stage/first-tale';
import { resolveStory } from '../../src/modules/story-stage/story-resolver';
import { buildSessionPlan } from '../../src/modules/number-train/round-plan';
import {
  DEFAULT_SUCCESS_TAIL,
  countSuccessLine,
  loadSuccessLine,
  sequenceSuccessLine,
  loadSupportLine,
  loadStructuralHintLine,
  buildCountingHint,
  buildSequenceHint,
  loadSeatCapacity,
} from '../../src/modules/number-train/train-lines';
import { getFixFeedback } from '../../src/modules/kennedis-orders/cafe-lines';
import type { BearCafeContent } from '../../src/modules/kennedis-orders/kennedis-orders.types';
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

    // Bear Cafe character lines + every fix-feedback line the cafe can say.
    const character = content.character as
      | { name?: unknown; happyLine?: unknown }
      | undefined;
    if (character && typeof character.name === 'string') {
      add(`${character.name} is calling.`);
      add(character.happyLine);
      const cafeContent = content as unknown as BearCafeContent;
      for (const issue of [
        'quantity_under',
        'color',
        'first_sound_sort',
        'food',
        'food_removed',
        'other',
      ]) {
        add(getFixFeedback(cafeContent, issue, 1));
        add(getFixFeedback(cafeContent, issue, 2));
      }
    }

    // Number Train: plans are seeded in the JSON, so every round — and every
    // line the round can produce — is deterministic and enumerable.
    if (typeof content.seed === 'number' && typeof content.max_quantity === 'number') {
      const tailRule = activity.feedback_rules?.correct as
        | { speech?: unknown }
        | undefined;
      const tail =
        typeof tailRule?.speech === 'string' ? tailRule.speech : DEFAULT_SUCCESS_TAIL;
      add(
        typeof content.arrival_audio === 'string'
          ? content.arrival_audio
          : 'The train reached the station! What a trip!'
      );
      const plan = buildSessionPlan({
        seed: content.seed as number,
        round_count:
          typeof content.round_count === 'number' ? (content.round_count as number) : 6,
        max_quantity: content.max_quantity as number,
      });
      for (const round of plan.rounds) {
        add(round.prompt);
        if (round.kind === 'count_train') {
          add(countSuccessLine(round.quantity, tail));
          add(buildCountingHint(round.quantity));
        } else if (round.kind === 'load_train') {
          add(loadSuccessLine(round.target, tail));
          const capacity = loadSeatCapacity(round.target);
          for (let built = 0; built <= capacity; built += 1) {
            const diff = round.target - built;
            if (diff === 0) continue;
            add(loadSupportLine(diff));
            add(loadStructuralHintLine(built, diff));
          }
        } else {
          add(sequenceSuccessLine(round.sequence, tail));
          add(buildSequenceHint(round));
        }
      }
    }
  }

  // — Story Stage setup phase (Pick Three) —
  add('Who is the story about?');
  add('Where does it happen?');
  add('What happens?');
  add('Your story is ready!');
  for (const entity of [
    ...FIRST_STORY_PACK.characters,
    ...FIRST_STORY_PACK.settings,
    ...FIRST_STORY_PACK.problems,
  ]) {
    add(entity.spokenIntro, 'story');
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
  add('Order packed.');
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
