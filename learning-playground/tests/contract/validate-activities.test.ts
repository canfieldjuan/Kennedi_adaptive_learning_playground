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
  image?: string;
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

      if (activity.transfer.context_type === 'category_sort') {
        expect(hasCategorySortContent(activity)).toBe(true);
        continue;
      }

      expect([
        'different_interaction_model',
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

  test('approved spoken blending activity implements its brief honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'blend-listen-dog'
    ));

    expect(activity).toMatchObject({
      title: 'Listen and Blend',
      skill_ids: ['blending'],
      originating_brief_id: 'brief-blending-different_prompt_mode',
      transfer: {
        context_type: 'different_prompt_mode',
        context_id: 'listen-blend-choose-picture',
        example_set_id: 'dog-cat-sun',
        prompt_mode: 'spoken',
      },
    });
    expect(activity).toBeDefined();
    expect(hasDifferentPromptModeContent(activity!)).toBe(true);
  });

  test('approved symbolic word builder implements its brief honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'build-model-map'
    ));

    expect(activity).toMatchObject({
      title: 'Copy the Word',
      skill_ids: ['word_building'],
      originating_brief_id: 'brief-word_building-different_prompt_mode',
      transfer: {
        context_type: 'different_prompt_mode',
        context_id: 'copy-printed-word',
        example_set_id: 'map-model-1',
        prompt_mode: 'symbolic',
      },
    });
    expect(activity).toBeDefined();
    expect(hasDifferentPromptModeContent(activity!)).toBe(true);

    const mismatchedModel = {
      ...activity!,
      content: { ...activity!.content, word_model: 'sun' },
    };
    expect(hasDifferentPromptModeContent(mismatchedModel)).toBe(false);
  });

  test('approved visual color request implements its brief honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'art-match-blue-card'
    ));

    expect(activity).toMatchObject({
      title: 'Match the Color Card',
      skill_ids: ['color_fill'],
      originating_brief_id: 'brief-color_fill-different_prompt_mode',
      transfer: {
        context_type: 'different_prompt_mode',
        context_id: 'match-color-request-card',
        example_set_id: 'blue-request-1',
        prompt_mode: 'visual',
      },
    });
    expect(activity).toBeDefined();
    expect(hasDifferentPromptModeContent(activity!)).toBe(true);

    const mismatchedRule = {
      ...activity!,
      success_rules: { ...activity!.success_rules, correct_color_id: 'berry-pink' },
    };
    expect(hasDifferentPromptModeContent(mismatchedRule)).toBe(false);
  });

  test('approved spatial scene prompt implements its brief honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'shapes-roof-in-scene'
    ));

    expect(activity).toMatchObject({
      title: 'Roof Shape Match',
      skill_ids: ['shape_match'],
      originating_brief_id: 'brief-shape_match-different_prompt_mode',
      transfer: {
        context_type: 'different_prompt_mode',
        context_id: 'identify-shape-in-scene',
        example_set_id: 'little-house-roof-1',
        prompt_mode: 'mixed',
      },
    });
    expect(activity).toBeDefined();
    expect(hasDifferentPromptModeContent(activity!)).toBe(true);

    const answerInPrompt = {
      ...activity!,
      content: {
        ...activity!.content,
        prompt_audio: 'Find the triangle roof.',
      },
    };
    expect(hasDifferentPromptModeContent(answerInPrompt)).toBe(false);
  });

  test('approved Bear Cafe category-sort activity implements its brief honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'kennedis-orders-b-foods-001'
    ));

    expect(activity).toMatchObject({
      title: 'B-Food Order',
      originating_brief_id: 'brief-initial_sound-category_sort',
      transfer: {
        context_type: 'category_sort',
        context_id: 'phonics-food-sort',
        example_set_id: 'b-foods-set-1',
      },
    });
    expect(activity).toBeDefined();
    expect(hasCategorySortContent(activity!)).toBe(true);
  });

  test('approved Bear Cafe fix-order activity implements different prompt mode honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'kennedis-orders-fix-berries-001'
    ));

    expect(activity).toMatchObject({
      title: 'Fix the Berry Order',
      originating_brief_id: 'brief-vocabulary-different_prompt_mode',
      transfer: {
        context_type: 'different_prompt_mode',
        context_id: 'error-correction-order-fix',
        example_set_id: 'bear-cafe-starter-foods',
      },
    });
    expect(activity).toBeDefined();
    expect(hasDifferentPromptModeContent(activity!)).toBe(true);
  });

  test('approved video response implements a separate vocabulary check honestly', () => {
    const activity = allActivities.find((item) => (
      item.id === 'video-bear-bakes-bread-response'
    ));

    expect(activity).toMatchObject({
      title: "Bear's Bakery",
      skill_ids: ['vocabulary'],
      originating_brief_id: 'brief-vocabulary-different_prompt_mode',
      transfer: {
        context_type: 'different_prompt_mode',
        context_id: 'recall-object-from-local-video',
        example_set_id: 'bear-bakes-bread-v1',
        prompt_mode: 'mixed',
      },
    });
    expect(activity).toBeDefined();
    expect(hasDifferentPromptModeContent(activity!)).toBe(true);
  });

  test('language vocabulary truth checks are not tied to the Bear video example', () => {
    const videoResponse = allActivities.find((item) => (
      item.id === 'video-bear-bakes-bread-response'
    ));
    expect(videoResponse).toBeDefined();

    const generalVocabularyResponse: ActivityJson = {
      ...videoResponse!,
      id: 'clothing-vocabulary-response',
      title: 'What Can You Wear?',
      content: {
        prompt_audio: 'Which picture shows something you can wear?',
        choices: [
          { id: 'hat', label: 'hat', image: '/assets/images/hat.svg', correct: true },
          { id: 'apple', label: 'apple', image: '/assets/images/apple.svg', correct: false },
          { id: 'bread', label: 'bread', image: '/assets/images/bread.svg', correct: false },
        ],
      },
      success_rules: {
        correct_choice_id: 'hat',
        required_correct_count: 1,
        max_attempts_before_hint: 2,
      },
    };

    expect(hasDifferentPromptModeContent(generalVocabularyResponse)).toBe(true);
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
  if (isKennedisOrdersFixOrder(activity)) return true;
  if (activity.domain === 'language' && activity.skill_ids.includes('vocabulary')) {
    return hasLanguageVocabularyResponse(activity);
  }
  if (activity.domain === 'phonics' && activity.skill_ids.includes('blending')) {
    return hasSpokenBlendingPrompt(activity);
  }
  if (activity.domain === 'phonics' && activity.skill_ids.includes('word_building')) {
    return hasSymbolicWordBuildingPrompt(activity);
  }
  if (activity.domain === 'art' && activity.skill_ids.includes('color_fill')) {
    return hasVisualColorRequest(activity);
  }
  if (activity.domain === 'spatial' && activity.skill_ids.includes('shape_match')) {
    return hasShapeScenePrompt(activity);
  }
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

function hasLanguageVocabularyResponse(activity: ActivityJson): boolean {
  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const choices = getChoices(activity);
  const correctChoiceId = getString(activity.success_rules.correct_choice_id);
  const declaredCorrectChoices = choices.filter((choice) => choice.correct === true);
  const correctChoice = choices.find((choice) => choice.id === correctChoiceId);

  return (
    activity.interaction_model === 'tap_to_match' &&
    (activity.transfer.prompt_mode === 'mixed' ||
      activity.transfer.prompt_mode === 'spoken') &&
    promptAudio.length > 0 &&
    choices.length >= 2 &&
    choices.length <= 6 &&
    choices.every((choice) => choice.image?.startsWith('/assets/images/')) &&
    choices.every((choice) => choice.label.trim().length > 0) &&
    declaredCorrectChoices.length === 1 &&
    correctChoice === declaredCorrectChoices[0] &&
    !promptAudio.includes(correctChoice.label.toLowerCase())
  );
}

function hasVisualColorRequest(activity: ActivityJson): boolean {
  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const targetColorId = getString(activity.content.target_color_id);
  const successColorId = getString(activity.success_rules.correct_color_id);
  const shape = getString(activity.content.shape);
  const colors = getRecordArray(activity.content.colors);
  const matchingColors = colors.filter((color) => getString(color.id) === targetColorId);
  const targetLabel = matchingColors.length === 1
    ? getString(matchingColors[0].label).toLowerCase()
    : '';

  return (
    activity.interaction_model === 'color_fill' &&
    activity.transfer.prompt_mode === 'visual' &&
    promptAudio.includes('color card') &&
    targetColorId.length > 0 &&
    successColorId === targetColorId &&
    shape.length > 0 &&
    colors.length >= 3 &&
    matchingColors.length === 1 &&
    targetLabel.length > 0 &&
    !promptAudio.includes(targetLabel)
  );
}

function hasShapeScenePrompt(activity: ActivityJson): boolean {
  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const promptImages = getStringArray(activity.content.prompt_images);
  const promptVisualLayout = getString(activity.content.prompt_visual_layout);
  const targetShape = getString(activity.content.target_shape).toLowerCase();
  const scene = isRecord(activity.content.prompt_scene)
    ? activity.content.prompt_scene
    : {};
  const sceneImage = getString(scene.image);
  const targetObjectLabel = getString(scene.target_object_label).toLowerCase();
  const sceneTargetShape = getString(scene.target_shape_id).toLowerCase();
  const choices = getChoices(activity);
  const correctChoiceId = getString(activity.success_rules.correct_choice_id);
  const correctChoice = choices.find((choice) => (
    choice.id === correctChoiceId || choice.correct === true
  ));

  return (
    activity.interaction_model === 'tap_to_match' &&
    activity.transfer.prompt_mode === 'mixed' &&
    promptVisualLayout === 'scene' &&
    promptImages.length === 1 &&
    promptImages[0] === sceneImage &&
    sceneImage.startsWith('/assets/images/') &&
    targetObjectLabel.length > 0 &&
    promptAudio.includes(targetObjectLabel) &&
    targetShape.length > 0 &&
    sceneTargetShape === targetShape &&
    correctChoice?.id === targetShape &&
    correctChoice.label.toLowerCase() === targetShape &&
    choices.length >= 3 &&
    !promptAudio.includes(targetShape)
  );
}

function hasSymbolicWordBuildingPrompt(activity: ActivityJson): boolean {
  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const wordModel = getString(activity.content.word_model).toLowerCase();
  const targetWord = getString(activity.content.target_word).toLowerCase();
  const successTarget = getString(activity.success_rules.target_word).toLowerCase();
  const picture = getString(activity.content.picture);
  const tiles = getStringArray(activity.content.tiles).map((tile) => tile.toLowerCase());
  const targetLetters = targetWord.split('');

  return (
    activity.interaction_model === 'tap_then_place' &&
    activity.transfer.prompt_mode === 'symbolic' &&
    wordModel.length > 0 &&
    wordModel === targetWord &&
    successTarget === targetWord &&
    picture.length === 0 &&
    !promptAudio.includes(targetWord) &&
    tiles.length === targetLetters.length &&
    [...tiles].sort().join('') === [...targetLetters].sort().join('')
  );
}

function hasSpokenBlendingPrompt(activity: ActivityJson): boolean {
  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const spokenSegments = getStringArray(activity.content.spoken_segments)
    .map((segment) => segment.toLowerCase());
  const visualSegments = getStringArray(activity.content.segments);
  const targetWord = getString(activity.content.target_word).toLowerCase();
  const choices = getChoices(activity);
  const correctChoiceId = getString(activity.success_rules.correct_choice_id);
  const correctChoice = choices.find((choice) => (
    choice.id === correctChoiceId || choice.correct === true
  ));

  return (
    activity.interaction_model === 'tap_to_match' &&
    activity.transfer.prompt_mode === 'spoken' &&
    spokenSegments.length >= 2 &&
    spokenSegments.every((segment) => promptAudio.includes(segment)) &&
    visualSegments.length === 0 &&
    targetWord.length > 0 &&
    !promptAudio.includes(targetWord) &&
    correctChoice?.label.toLowerCase() === targetWord &&
    typeof correctChoice.image === 'string' &&
    correctChoice.image.length > 0 &&
    choices.length >= 2
  );
}

function hasCategorySortContent(activity: ActivityJson): boolean {
  if (
    activity.interaction_model !== 'tap_then_place' ||
    activity.content.game !== 'kennedis-orders' ||
    activity.content.mode !== 'first_sound_sort'
  ) {
    return false;
  }

  const foods = getRecordArray(activity.content.foods);
  const requiredOrder = isRecord(activity.content.required_order)
    ? activity.content.required_order
    : {};
  const requiredFoodIds = getStringArray(requiredOrder.food_ids);
  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();

  if (
    foods.length < 4 ||
    requiredFoodIds.length < 2 ||
    !promptAudio.includes('start') ||
    !promptAudio.includes('b')
  ) {
    return false;
  }

  const requiredFoods = foods.filter((food) => (
    requiredFoodIds.includes(getString(food.id))
  ));
  const distractorFoods = foods.filter((food) => (
    !requiredFoodIds.includes(getString(food.id))
  ));

  return (
    requiredFoods.length === requiredFoodIds.length &&
    requiredFoods.every((food) => getString(food.first_sound).toLowerCase() === 'b') &&
    distractorFoods.length > 0 &&
    distractorFoods.every((food) => getString(food.first_sound).toLowerCase() !== 'b')
  );
}

function isKennedisOrdersFixOrder(activity: ActivityJson): boolean {
  if (
    activity.interaction_model !== 'tap_then_place' ||
    activity.content.game !== 'kennedis-orders' ||
    activity.content.mode !== 'fix_order'
  ) {
    return false;
  }

  const promptAudio = getString(activity.content.prompt_audio).toLowerCase();
  const startingTray = isRecord(activity.content.starting_tray)
    ? activity.content.starting_tray
    : {};
  const foodCounts = isRecord(startingTray.foodCounts) ? startingTray.foodCounts : {};
  const requiredOrder = isRecord(activity.content.required_order)
    ? activity.content.required_order
    : {};
  const requiredFoodId = getString(requiredOrder.food_id);
  const selectedFoodIds = Object.entries(foodCounts)
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .map(([foodId]) => foodId);

  return (
    activity.transfer.prompt_mode === 'spoken' &&
    promptAudio.includes('oops') &&
    promptAudio.includes('fix') &&
    requiredFoodId.length > 0 &&
    selectedFoodIds.length > 0 &&
    !selectedFoodIds.includes(requiredFoodId)
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

function getRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is Record<string, unknown> => isRecord(item));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
