/**
 * Contract tests: Validate all sample activities against the activity schema.
 *
 * Tests:
 * 1. All activities match the activity schema.
 * 2. No activity exceeds 300 seconds.
 * 3. All child activities require parent approval.
 * 4. All child activities set external_links_allowed to false.
 */

import { describe, test, expect } from 'vitest';
import type { AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import activitySchema from '../../src/contracts/activity.schema.json';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import {
  getTransferContextStrength,
  type TransferContextType,
  type TransferPromptMode,
} from '../../src/types/activity';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(activitySchema as AnySchema);

interface ActivityJson {
  id: string;
  title: string;
  domain: string;
  estimated_duration_seconds: number;
  skill_ids: string[];
  originating_brief_id?: string;
  transfer: {
    skill_ids: string[];
    context_type: TransferContextType;
    context_id: string;
    example_set_id: string;
    prompt_mode: TransferPromptMode;
  };
  safety: {
    requires_parent_approval: boolean;
    external_links_allowed: boolean;
    contains_video?: boolean;
    contains_audio?: boolean;
  };
  interaction_model: string;
  content: Record<string, unknown>;
  success_rules: Record<string, unknown>;
  [key: string]: unknown;
}

interface ChoiceJson {
  id: string;
  label: string;
  correct?: boolean;
}

const allActivities = APPROVED_ACTIVITIES as unknown as ActivityJson[];

describe('activity schema contract', () => {
  test('all activities match the activity schema', () => {
    for (const activity of allActivities) {
      const valid = validate(activity);
      if (!valid) {
        console.error(`Activity "${activity.id}" failed validation:`, validate.errors);
      }
      expect(valid).toBe(true);
    }
  });

  test('no activity exceeds 300 seconds estimated duration', () => {
    for (const activity of allActivities) {
      expect(activity.estimated_duration_seconds).toBeLessThanOrEqual(300);
    }
  });

  test('all child activities require parent approval', () => {
    for (const activity of allActivities) {
      expect(activity.safety.requires_parent_approval).toBe(true);
    }
  });

  test('all child activities set external_links_allowed to false', () => {
    for (const activity of allActivities) {
      expect(activity.safety.external_links_allowed).toBe(false);
    }
  });

  test('every activity declares aligned transfer metadata', () => {
    for (const activity of allActivities) {
      expect(activity.transfer.context_type).toBeTruthy();
      expect(activity.transfer.context_id).toBeTruthy();
      expect(activity.transfer.example_set_id).toBeTruthy();
      expect(activity.transfer.prompt_mode).toBeTruthy();
      expect(activity.transfer.skill_ids).toEqual(activity.skill_ids);
    }
  });

  test('implemented activities can reference an originating brief without schema migration', () => {
    const implementedFromBrief = {
      ...allActivities[0],
      id: 'brief-origin-test-activity',
      originating_brief_id: 'brief-initial_sound-category_sort',
    };

    expect(validate(implementedFromBrief)).toBe(true);
  });

  test('implemented rich transfer activities reference originating briefs', () => {
    const richActivities = allActivities.filter((activity) => (
      getTransferContextStrength(activity.transfer.context_type) !== 'weak'
    ));

    expect(richActivities.length).toBeGreaterThan(0);

    for (const activity of richActivities) {
      expect(activity.originating_brief_id).toMatch(
        new RegExp(`^brief-.+-${activity.transfer.context_type}$`)
      );
    }
  });

  test('rich transfer metadata matches detectable activity content', () => {
    for (const activity of allActivities) {
      if (getTransferContextStrength(activity.transfer.context_type) === 'weak') {
        continue;
      }

      if (activity.transfer.context_type === 'reverse_mapping') {
        expect(hasReverseMappingContent(activity)).toBe(true);
        continue;
      }

      if (activity.transfer.context_type === 'different_prompt_mode') {
        expect(hasDifferentPromptModeContent(activity)).toBe(true);
        continue;
      }

      expect([
        'different_interaction_model',
        'category_sort',
        'delayed_review',
        'parent_observed_real_world',
      ]).not.toContain(activity.transfer.context_type);
    }
  });

  test('approved phonics reverse-mapping activity implements its brief honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'phonics-banana-starting-letter'
    ));

    expect(activity).toMatchObject({
      title: 'Banana Starting Letter',
      originating_brief_id: 'brief-initial_sound-reverse_mapping',
      transfer: {
        context_type: 'reverse_mapping',
        context_id: 'tap-letter-from-word',
        example_set_id: 'banana-letter-b',
      },
    });
    expect(activity).toBeDefined();
    expect(hasReverseMappingContent(activity!)).toBe(true);
  });

  test('approved math different-prompt activity implements its brief honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'math-dot-card-three'
    ));

    expect(activity).toMatchObject({
      title: 'Dot Card Number Match',
      originating_brief_id: 'brief-counting-different_prompt_mode',
      transfer: {
        context_type: 'different_prompt_mode',
        context_id: 'tap-number-from-dot-card',
        example_set_id: 'three-dot-card',
      },
    });
    expect(activity).toBeDefined();
    expect(hasDifferentPromptModeContent(activity!)).toBe(true);
  });
});

function hasReverseMappingContent(activity: ActivityJson): boolean {
  const sourceWord = getString(activity.content.source_word).toLowerCase();
  const targetLetter = getString(activity.content.target_letter).toLowerCase();
  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const choices = getChoices(activity);
  const correctChoiceId = getString(activity.success_rules.correct_choice_id);
  const correctChoice = choices.find((choice) => (
    choice.id === correctChoiceId || choice.correct === true
  ));

  return (
    activity.interaction_model === 'tap_to_match' &&
    sourceWord.length > 0 &&
    targetLetter.length === 1 &&
    sourceWord.startsWith(targetLetter) &&
    promptAudio.includes(sourceWord) &&
    promptAudio.includes('letter') &&
    correctChoice?.label.toLowerCase() === targetLetter &&
    choices.length >= 2 &&
    choices.every((choice) => /^[a-z]$/i.test(choice.label)) &&
    choices.every((choice) => choice.label.toLowerCase() !== sourceWord)
  );
}

function hasDifferentPromptModeContent(activity: ActivityJson): boolean {
  if (activity.domain !== 'math') return false;

  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const targetQuantity = getNumber(activity.content.target_quantity);
  const promptCard = isRecord(activity.content.prompt_card)
    ? activity.content.prompt_card
    : {};
  const promptCardType = getString(promptCard.type);
  const promptCardQuantity = getNumber(promptCard.quantity);
  const promptImages = getStringArray(activity.content.prompt_images);
  const choices = getChoices(activity);
  const correctChoiceId = getString(activity.success_rules.correct_choice_id);
  const correctChoice = choices.find((choice) => (
    choice.id === correctChoiceId || choice.correct === true
  ));

  return (
    activity.interaction_model === 'tap_to_match' &&
    activity.transfer.prompt_mode === 'visual' &&
    promptAudio.includes('card') &&
    !promptAudio.includes('how many') &&
    promptCardType === 'quantity_card' &&
    Number.isInteger(targetQuantity) &&
    targetQuantity > 0 &&
    targetQuantity === promptCardQuantity &&
    promptImages.length === targetQuantity &&
    correctChoice?.label === String(targetQuantity) &&
    choices.length >= 2 &&
    choices.every((choice) => /^\d+$/.test(choice.label))
  );
}

function getChoices(activity: ActivityJson): ChoiceJson[] {
  const choices = activity.content.choices;
  if (!Array.isArray(choices)) return [];

  return choices.filter((choice): choice is ChoiceJson => {
    if (!isRecord(choice)) return false;

    return (
      typeof choice.id === 'string' &&
      typeof choice.label === 'string' &&
      (
        choice.correct === undefined ||
        typeof choice.correct === 'boolean'
      )
    );
  });
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number.NaN;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
