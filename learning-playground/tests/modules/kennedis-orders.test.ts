import { describe, expect, test } from 'vitest';
import type { AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import activitySchema from '../../src/contracts/activity.schema.json';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { appendEvent, type EventLogStorage } from '../../src/core/event-log';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import {
  createKennedisOrdersEvent,
  evaluateTray,
  getBearCafeContent,
  type TrayState,
} from '../../src/modules/kennedis-orders/KennedisOrdersActivity';
import type { LearningActivity } from '../../src/types/activity';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(activitySchema as AnySchema);

const cafeActivities = APPROVED_ACTIVITIES.filter((activity) => (
  activity.content.game === 'kennedis-orders'
));

describe('Kennedi’s Orders maturity contract', () => {
  test('registers the mature Bear Cafe shift activities', () => {
    expect(cafeActivities.map((activity) => activity.id)).toEqual([
      'kennedis-orders-free-make-001',
      'kennedis-orders-pink-cupcake-001',
      'kennedis-orders-three-berries-001',
      'kennedis-orders-b-foods-001',
      'kennedis-orders-fix-berries-001',
    ]);
  });

  test('covers the requested progression variants', () => {
    expect(cafeActivities.map((activity) => getRequiredContent(activity).mode)).toEqual([
      'free_make',
      'single_attribute',
      'quantity',
      'first_sound_sort',
      'fix_order',
    ]);
  });

  test('every cafe activity validates and declares transfer metadata', () => {
    for (const activity of cafeActivities) {
      expect(validate(activity)).toBe(true);
      expect(activity.transfer.skill_ids).toEqual(activity.skill_ids);
      expect(activity.transfer.context_type).toBeTruthy();
      expect(activity.transfer.context_id).toBeTruthy();
      expect(activity.transfer.example_set_id).toBeTruthy();
      expect(activity.transfer.prompt_mode).toBeTruthy();
    }
  });

  test('every cafe skill exists in the curriculum graph', () => {
    const graph = loadCurriculumGraph();

    for (const activity of cafeActivities) {
      for (const skillId of activity.skill_ids) {
        expect(graph.getSkill(skillId)?.id).toBe(skillId);
        expect(graph.getSkill(skillId)?.planned_transfer_contexts).toContain(
          activity.transfer.context_type
        );
      }
    }
  });

  test('keeps child-facing safety boundaries and parent approval', () => {
    for (const activity of cafeActivities) {
      expect(activity.safety.requires_parent_approval).toBe(true);
      expect(activity.safety.external_links_allowed).toBe(false);
      expect(JSON.stringify(activity)).not.toMatch(/https?:\/\//);
    }
  });

  test('emits valid correct and completion events through the existing logger', () => {
    const activity = getActivity('kennedis-orders-pink-cupcake-001');
    const content = getRequiredContent(activity);
    const tray: TrayState = {
      foodCounts: { cupcake: 1 },
      colorId: 'pink',
    };
    const correctEvent = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      tray,
      attemptNumber: 1,
      responseTimeMs: 900,
      hintShown: false,
      eventName: 'tray_checked',
    });
    const completionEvent = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'completed',
      tray,
      attemptNumber: 1,
      responseTimeMs: 1600,
      hintShown: false,
      eventName: 'order_delivered',
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
      selected_answer: 'cupcake, pink',
      correct_answer: 'pink cupcake',
    });
    expect(stored[1]).toMatchObject({
      outcome: 'completed',
      selected_answer: 'cupcake, pink',
    });
    expect(stored[1]?.metadata.event_name).toBe('order_delivered');
  });

  test('incorrect choices do not evaluate as completion', () => {
    const content = getRequiredContent(getActivity('kennedis-orders-pink-cupcake-001'));

    expect(evaluateTray(content, { foodCounts: { cookie: 1 }, colorId: 'pink' })).toMatchObject({
      correct: false,
      issue: 'food',
    });
  });

  test('fix round starts mismatched and completes after correction', () => {
    const content = getRequiredContent(getActivity('kennedis-orders-fix-berries-001'));
    const startingTray = content.starting_tray?.foodCounts ?? {};

    expect(evaluateTray(content, { foodCounts: startingTray })).toMatchObject({
      correct: false,
      issue: 'food',
    });
    expect(evaluateTray(content, { foodCounts: { berry: 1 } })).toMatchObject({
      correct: true,
      issue: 'none',
    });
  });

  test('multi-round shift chains safely to completion', () => {
    expect(followNextActivityIds('kennedis-orders-free-make-001')).toEqual([
      'kennedis-orders-free-make-001',
      'kennedis-orders-pink-cupcake-001',
      'kennedis-orders-three-berries-001',
      'kennedis-orders-b-foods-001',
      'kennedis-orders-fix-berries-001',
    ]);
  });
});

function getActivity(activityId: string): LearningActivity {
  const activity = cafeActivities.find((entry) => entry.id === activityId);
  if (!activity) throw new Error(`Missing Bear Cafe activity ${activityId}`);
  return activity;
}

function getRequiredContent(activity: LearningActivity) {
  const content = getBearCafeContent(activity);
  if (!content) throw new Error(`Invalid Bear Cafe content ${activity.id}`);
  return content;
}

function followNextActivityIds(firstActivityId: string): string[] {
  const visited: string[] = [];
  let currentId: string | undefined = firstActivityId;

  while (currentId) {
    if (visited.includes(currentId)) throw new Error(`Loop in cafe chain at ${currentId}`);
    visited.push(currentId);

    const activity = getActivity(currentId);
    currentId = getRequiredContent(activity).next_activity_id;
  }

  return visited;
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
