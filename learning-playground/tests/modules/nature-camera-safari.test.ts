import { describe, expect, test } from 'vitest';
import type { AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import activitySchema from '../../src/contracts/activity.schema.json';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { appendEvent, type EventLogStorage } from '../../src/core/event-log';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import {
  createNatureCameraEvent,
  evaluateSafariSelection,
  getNatureCameraContent,
  hasLargeTapAreas,
} from '../../src/modules/nature-camera-safari/nature-camera-safari.logic';
import runtimeSource from '../../src/modules/nature-camera-safari/NatureCameraSafariActivity.ts?raw';
import logicSource from '../../src/modules/nature-camera-safari/nature-camera-safari.logic.ts?raw';
import type { LearningActivity } from '../../src/types/activity';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(activitySchema as AnySchema);

const safariActivities = APPROVED_ACTIVITIES.filter((activity) => (
  activity.content.game === 'nature-camera-safari'
));

describe('Nature Camera Safari contract', () => {
  test('registers the mature local picture walk activities', () => {
    expect(safariActivities.map((activity) => activity.id)).toEqual([
      'nature-camera-free-picture-walk',
      'nature-camera-bird-photo',
      'nature-camera-squirrel-photo',
      'nature-camera-count-two-birds',
      'nature-camera-b-sound-safari',
      'nature-camera-album-review',
    ]);
  });

  test('every Safari activity validates and declares transfer metadata', () => {
    for (const activity of safariActivities) {
      expect(validate(activity)).toBe(true);
      expect(activity.transfer.skill_ids).toEqual(activity.skill_ids);
      expect(activity.transfer.context_type).toBeTruthy();
      expect(activity.transfer.context_id).toBeTruthy();
      expect(activity.transfer.example_set_id).toBeTruthy();
      expect(activity.transfer.prompt_mode).toBeTruthy();
    }
  });

  test('every Safari skill exists in the curriculum graph', () => {
    const graph = loadCurriculumGraph();

    for (const activity of safariActivities) {
      for (const skillId of activity.skill_ids) {
        expect(graph.getSkill(skillId)?.id).toBe(skillId);
        expect(graph.getSkill(skillId)?.planned_transfer_contexts).toContain(
          activity.transfer.context_type
        );
      }
    }
  });

  test('keeps child-facing safety boundaries', () => {
    for (const activity of safariActivities) {
      expect(activity.safety.requires_parent_approval).toBe(true);
      expect(activity.safety.external_links_allowed).toBe(false);
      expect(JSON.stringify(activity)).not.toMatch(/https?:\/\//);

      const content = getRequiredContent(activity);
      expect(content.uses_real_camera).toBe(false);
      expect(hasLargeTapAreas(content)).toBe(true);
    }
  });

  test('does not request real camera permissions or direct media APIs', () => {
    const combinedSource = `${runtimeSource}\n${logicSource}`;

    expect(combinedSource).not.toMatch(/getUserMedia|mediaDevices|enumerateDevices/);
    expect(combinedSource).not.toMatch(/speechSynthesis|new Audio/);
  });

  test('emits valid correct and completion events through the existing logger', () => {
    const activity = getActivity('nature-camera-bird-photo');
    const content = getRequiredContent(activity);
    const correctEvent = createNatureCameraEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      selectedObjectIds: ['bird'],
      attemptNumber: 1,
      responseTimeMs: 1200,
      hintShown: false,
      eventName: 'photo_captured',
    });
    const completionEvent = createNatureCameraEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'completed',
      selectedObjectIds: ['bird'],
      attemptNumber: 1,
      responseTimeMs: 1800,
      hintShown: false,
      eventName: 'photo_saved_to_album',
    });
    const store = createMemoryStore();

    expect(appendEvent(correctEvent, store)).toBe(true);
    expect(appendEvent(completionEvent, store)).toBe(true);

    const stored = JSON.parse(store.getItem('lp_activity_events') ?? '[]') as Array<{
      outcome: string;
      selected_answer: string;
      correct_answer: string;
      metadata: Record<string, string | number | boolean>;
    }>;
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({
      outcome: 'correct',
      selected_answer: 'bird',
      correct_answer: 'bird',
    });
    expect(stored[1]).toMatchObject({
      outcome: 'completed',
      selected_answer: 'bird',
    });
    expect(stored[1]?.metadata.event_name).toBe('photo_saved_to_album');
  });

  test('incorrect target taps do not evaluate as completion', () => {
    const content = getRequiredContent(getActivity('nature-camera-bird-photo'));
    const evaluation = evaluateSafariSelection(content, ['squirrel']);

    expect(evaluation.correct).toBe(false);
    expect(evaluation.canComplete).toBe(false);
    expect(evaluation.issue).toBe('target');
  });

  test('counting and first-sound variants require the intended selections', () => {
    const freeContent = getRequiredContent(getActivity('nature-camera-free-picture-walk'));
    expect(evaluateSafariSelection(freeContent, ['flower'])).toMatchObject({
      correct: true,
      canComplete: true,
    });

    const countContent = getRequiredContent(getActivity('nature-camera-count-two-birds'));
    expect(evaluateSafariSelection(countContent, ['bird-1']).canComplete).toBe(false);
    expect(evaluateSafariSelection(countContent, ['bird-1', 'bird-2'])).toMatchObject({
      correct: true,
      canComplete: true,
    });

    const soundContent = getRequiredContent(getActivity('nature-camera-b-sound-safari'));
    expect(evaluateSafariSelection(soundContent, ['bird', 'squirrel']).canComplete).toBe(false);
    expect(evaluateSafariSelection(soundContent, ['bird', 'butterfly'])).toMatchObject({
      correct: true,
      canComplete: true,
    });
  });
});

function getActivity(activityId: string): LearningActivity {
  const activity = safariActivities.find((entry) => entry.id === activityId);
  if (!activity) throw new Error(`Missing Safari activity ${activityId}`);
  return activity;
}

function getRequiredContent(activity: LearningActivity) {
  const content = getNatureCameraContent(activity);
  if (!content) throw new Error(`Invalid Safari content ${activity.id}`);
  return content;
}

function createMemoryStore(): EventLogStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}
