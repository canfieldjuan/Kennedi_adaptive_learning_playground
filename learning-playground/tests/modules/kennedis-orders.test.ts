import { describe, expect, test } from 'vitest';
import type { AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import activitySchema from '../../src/contracts/activity.schema.json';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import { appendEvent, type EventLogStorage } from '../../src/core/event-log';
import { loadCurriculumGraph } from '../../src/core/curriculum-graph';
import {
  BEAR_CAFE_CHILD_CONTROL_LABELS,
  createKennedisOrdersEvent,
  evaluateTray,
  getBearCafeContent,
  getFoodChoiceAccessibilityState,
  getPlatedFoodIcons,
  getToggleChoiceAccessibilityState,
  renderOrderTicketVisual,
  type TrayState,
} from '../../src/modules/kennedis-orders/KennedisOrdersActivity';
import type { LearningActivity } from '../../src/types/activity';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(activitySchema as AnySchema);

const cafeActivities = APPROVED_ACTIVITIES.filter((activity) => (
  activity.content.game === 'kennedis-orders'
));

describe("Kennedi's Orders adapter contract", () => {
  test('registers exactly the Bear Cafe shift activities', () => {
    expect(cafeActivities.map((activity) => activity.id)).toEqual([
      'kennedis-orders-banana-001',
      'kennedis-orders-two-cookies-001',
      'kennedis-orders-pink-berries-001',
      'kennedis-orders-b-foods-001',
      'kennedis-orders-fix-berries-001',
      'kennedis-orders-free-make-001',
    ]);
  });

  test('does not import Nature Camera Safari with the adapter', () => {
    const gameIds = new Set(
      APPROVED_ACTIVITIES
        .map((activity) => activity.content.game)
        .filter((game): game is string => typeof game === 'string')
    );

    expect(gameIds.has('kennedis-orders')).toBe(true);
    expect(gameIds.has('nature-camera-safari')).toBe(false);
  });

  test('covers the requested progression variants', () => {
    expect(cafeActivities.map((activity) => getRequiredContent(activity).mode)).toEqual([
      'single_attribute',
      'quantity',
      'two_part',
      'first_sound_sort',
      'fix_order',
      'free_make',
    ]);
  });

  test('the shift follows the five-round caller order', () => {
    const rounds = cafeActivities
      .map((activity) => getRequiredContent(activity))
      .filter((content) => typeof content.round_index === 'number');

    expect(rounds.map((content) => [content.round_index, content.character.id])).toEqual([
      [1, 'baby-polar-bear'],
      [2, 'daddy-bear'],
      [3, 'mama-bear'],
      [4, 'baby-polar-bear'],
      [5, 'daddy-bear'],
    ]);
  });

  test('every cafe activity validates and declares aligned transfer metadata', () => {
    for (const activity of cafeActivities) {
      expect(validate(activity)).toBe(true);
      expect(activity.transfer.skill_ids).toEqual(activity.skill_ids);
      expect(activity.transfer.context_type).toBeTruthy();
      expect(activity.transfer.context_id).toBeTruthy();
      expect(activity.transfer.example_set_id).toBeTruthy();
      expect(activity.transfer.prompt_mode).toBeTruthy();
    }
  });

  test('rewritten shipped cafe orders bump their activity version', () => {
    expect(getActivity('kennedis-orders-two-cookies-001').version).toBe(2);
    expect(getActivity('kennedis-orders-pink-berries-001').version).toBe(2);
    expect(getActivity('kennedis-orders-free-make-001').version).toBe(2);
  });

  test('every cafe skill exists in the curriculum graph and allows its context', () => {
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

  test('keeps each child order to a small object set', () => {
    for (const activity of cafeActivities) {
      const content = getRequiredContent(activity);
      expect(content.foods.length).toBeLessThanOrEqual(6);
      expect(content.colors?.length ?? 0).toBeLessThanOrEqual(6);
      expect(content.decorations?.length ?? 0).toBeLessThanOrEqual(6);
      expect((content.foods.length + (content.colors?.length ?? 0) + (content.decorations?.length ?? 0)))
        .toBeLessThanOrEqual(6);
    }
  });

  test('child UI hides adult labels behind icon-only controls and visual tickets', () => {
    expect(BEAR_CAFE_CHILD_CONTROL_LABELS).toMatchObject({
      home: '⌂',
      repeat: '↻',
      check: '✓',
      deliver: '🧺',
      next: '→',
      restart: '↻',
    });

    const content = getRequiredContent(getActivity('kennedis-orders-pink-berries-001'));
    const ticket = renderOrderTicketVisual(content);
    expect(ticket).toContain('bear-cafe-ticket-item');
    expect(ticket).not.toContain(content.prompt_audio);
    expect(ticket).not.toContain(content.order_ticket);
  });

  test('rich cafe activities reference originating briefs', () => {
    expect(getActivityWithBrief('kennedis-orders-b-foods-001').originating_brief_id).toBe(
      'brief-initial_sound-category_sort'
    );
    expect(getActivityWithBrief('kennedis-orders-fix-berries-001').originating_brief_id).toBe(
      'brief-vocabulary-different_prompt_mode'
    );
  });

  test('emits valid correct and completion events through the existing logger', () => {
    const activity = getActivity('kennedis-orders-pink-berries-001');
    const content = getRequiredContent(activity);
    const tray: TrayState = {
      foodCounts: {
        banana: 2,
        cookie: 1,
      },
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
      selected_answer: '2 banana, cookie',
      correct_answer: '2 banana, cookie',
    });
    expect(stored[1]).toMatchObject({
      outcome: 'completed',
      selected_answer: '2 banana, cookie',
    });
    expect(stored[1]?.metadata.event_name).toBe('order_delivered');
  });

  test('events carry round, caller, correction, replay, and transfer metadata', () => {
    const activity = getActivity('kennedis-orders-two-cookies-001');
    const content = getRequiredContent(activity);
    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      tray: { foodCounts: { cookie: 4 } },
      attemptNumber: 2,
      responseTimeMs: 4200,
      hintShown: true,
      hintedSkillIds: ['counting'],
      replayCount: 1,
      eventName: 'tray_checked',
    });

    expect(event.metadata).toMatchObject({
      context_type: 'same_format_new_examples',
      game_mode: 'quantity',
      caller_id: 'daddy-bear',
      round_index: 2,
      round_number: 2,
      round_total: 5,
      required_quantity: 4,
      requested_quantity: 4,
      selected_quantity: 4,
      corrected: true,
      hinted_skill_ids: 'counting',
      replay_count: 1,
    });
  });

  test('two-part tray checks emit counting evidence for partial matches', () => {
    const activity = getActivity('kennedis-orders-pink-berries-001');
    const content = getRequiredContent(activity);
    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'incorrect',
      tray: {
        foodCounts: {
          banana: 2,
          berry: 1,
        },
      },
      attemptNumber: 1,
      responseTimeMs: 1400,
      hintShown: false,
      eventName: 'tray_checked',
      issue: 'food',
    });

    expect(event.outcome).toBe('incorrect');
    expect(event.skill_outcomes).toEqual([
      {
        skill_id: 'counting',
        outcome: 'correct',
        reason: 'quantity_match',
      },
    ]);
  });

  test('two-part quantity evidence counts the full requested order', () => {
    const activity = getActivity('kennedis-orders-pink-berries-001');
    const content = getRequiredContent(activity);
    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'incorrect',
      tray: {
        foodCounts: {
          banana: 1,
          cookie: 1,
        },
      },
      attemptNumber: 1,
      responseTimeMs: 1400,
      hintShown: false,
      eventName: 'tray_checked',
      issue: 'quantity_under',
    });

    expect(event.skill_outcomes).toEqual([
      {
        skill_id: 'counting',
        outcome: 'incorrect',
        reason: 'quantity_mismatch',
      },
    ]);
  });

  test('two-part hint events attach only to the hinted skill', () => {
    const activity = getActivity('kennedis-orders-pink-berries-001');
    const content = getRequiredContent(activity);

    const quantityHintEvent = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'hint_used',
      tray: {
        foodCounts: { banana: 1, cookie: 1 },
      },
      attemptNumber: 2,
      responseTimeMs: 1800,
      hintShown: true,
      eventName: 'hint_shown',
      issue: 'quantity_under',
    });
    const foodHintEvent = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'hint_used',
      tray: {
        foodCounts: { soup: 3 },
      },
      attemptNumber: 2,
      responseTimeMs: 1800,
      hintShown: true,
      eventName: 'hint_shown',
      issue: 'food',
    });

    expect(quantityHintEvent.skill_outcomes).toEqual([
      {
        skill_id: 'counting',
        outcome: 'hint_used',
        reason: 'quantity_under',
      },
    ]);
    expect(
      createKennedisOrdersEvent({
        activity,
        content,
        sessionId: 'session-1',
        childId: 'local-child',
        outcome: 'correct',
        tray: {
          foodCounts: {
            banana: 2,
            cookie: 1,
          },
        },
        attemptNumber: 3,
        responseTimeMs: 1600,
        hintShown: true,
        hintedSkillIds: ['counting'],
        eventName: 'tray_checked',
        issue: 'none',
      }).metadata?.hinted_skill_ids
    ).toBe('counting');
    expect(foodHintEvent.skill_outcomes).toEqual([]);
  });

  test('first-attempt success is not marked as corrected', () => {
    const activity = getActivity('kennedis-orders-banana-001');
    const content = getRequiredContent(activity);
    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      tray: { foodCounts: { banana: 1 } },
      attemptNumber: 1,
      responseTimeMs: 1000,
      hintShown: false,
      eventName: 'tray_checked',
    });

    expect(event.metadata?.corrected).toBe(false);
    expect(event.metadata?.replay_count).toBe(0);
  });

  test('incorrect choices do not evaluate as completion', () => {
    const content = getRequiredContent(getActivity('kennedis-orders-banana-001'));

    expect(evaluateTray(content, { foodCounts: { cookie: 1 } })).toMatchObject({
      correct: false,
      issue: 'food',
    });
  });

  test('two-part order requires exact food counts together', () => {
    const content = getRequiredContent(getActivity('kennedis-orders-pink-berries-001'));

    expect(evaluateTray(content, { foodCounts: { banana: 2, cookie: 1 } })).toMatchObject({
      correct: true,
      issue: 'none',
    });
    expect(evaluateTray(content, { foodCounts: { banana: 1, cookie: 1 } })).toMatchObject({
      correct: false,
      issue: 'quantity_under',
    });
    expect(evaluateTray(content, { foodCounts: { banana: 3, cookie: 1 } })).toMatchObject({
      correct: false,
      issue: 'quantity_over',
    });
    expect(evaluateTray(content, { foodCounts: { banana: 2, cookie: 1, berry: 1 } })).toMatchObject({
      correct: false,
      issue: 'food',
    });
  });

  test('extra foods on the tray fail a specific order', () => {
    const content = getRequiredContent(getActivity('kennedis-orders-two-cookies-001'));

    expect(evaluateTray(content, { foodCounts: { cookie: 4, banana: 1 } })).toMatchObject({
      correct: false,
      issue: 'food',
    });
    expect(evaluateTray(content, { foodCounts: { cookie: 4 } })).toMatchObject({
      correct: true,
      issue: 'none',
    });
  });

  test('plated icons preserve quantity so a correct count is not contradicted by the beats', () => {
    // A correct { cookie: 4 } tray must plate four cookies during the cook/plating
    // and handoff beats — not one, which would show wrong-quantity feedback right
    // after a correct quantity answer. The plate is now illustrated SVG, so count
    // is verified by how many food SVGs are emitted.
    const svgCount = (markup: string) => (markup.match(/<svg/g) ?? []).length;
    const twoCookies = getRequiredContent(getActivity('kennedis-orders-two-cookies-001'));
    expect(svgCount(getPlatedFoodIcons(twoCookies, { foodCounts: { cookie: 4 } }))).toBe(4);

    // A single item stays single (no false expansion).
    const banana = getRequiredContent(getActivity('kennedis-orders-banana-001'));
    expect(svgCount(getPlatedFoodIcons(banana, { foodCounts: { banana: 1 } }))).toBe(1);

    // A two-food order plates each requested item.
    const twoPart = getRequiredContent(getActivity('kennedis-orders-pink-berries-001'));
    expect(svgCount(getPlatedFoodIcons(twoPart, { foodCounts: { banana: 2, cookie: 1 } }))).toBe(3);
  });

  test('first sound order emits category-sort evidence through the existing event shape', () => {
    const activity = getActivity('kennedis-orders-b-foods-001');
    const content = getRequiredContent(activity);
    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      tray: {
        foodCounts: {
          banana: 1,
          berry: 1,
          bread: 1,
        },
      },
      attemptNumber: 1,
      responseTimeMs: 2100,
      hintShown: false,
      eventName: 'tray_checked',
    });

    expect(event.metadata).toMatchObject({
      context_type: 'category_sort',
      game_mode: 'first_sound_sort',
      order_type: 'first_sound_sort',
      target_sound: 'b',
      requested_quantity: 3,
      selected_quantity: 3,
    });
  });

  test('food selections emit decision-level events without completing the order', () => {
    const activity = getActivity('kennedis-orders-free-make-001');
    const content = getRequiredContent(activity);
    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'correct',
      tray: { foodCounts: { cupcake: 1 } },
      attemptNumber: 1,
      responseTimeMs: 600,
      hintShown: false,
      eventName: 'food_selected',
      selectedChoiceId: 'cupcake',
      selectedAnswer: 'cupcake',
      extraMetadata: {
        selected_food_id: 'cupcake',
        selected_food_count: 1,
      },
    });

    expect(event.outcome).toBe('correct');
    expect(event.skill_outcomes).toEqual([]);
    expect(event.selected_choice_id).toBe('cupcake');
    expect(event.selected_answer).toBe('cupcake');
    expect(event.metadata).toMatchObject({
      event_name: 'food_selected',
      selected_food_id: 'cupcake',
      selected_food_count: 1,
      selected_quantity: 1,
      shift_completed: false,
    });
  });

  test('completed bake time event marks the cafe shift complete', () => {
    const activity = getActivity('kennedis-orders-free-make-001');
    const content = getRequiredContent(activity);
    const event = createKennedisOrdersEvent({
      activity,
      content,
      sessionId: 'session-1',
      childId: 'local-child',
      outcome: 'completed',
      tray: { foodCounts: { cupcake: 1 } },
      attemptNumber: 1,
      responseTimeMs: 1300,
      hintShown: false,
      eventName: 'order_delivered',
    });

    expect(event.metadata).toMatchObject({
      event_name: 'order_delivered',
      shift_completed: true,
    });
  });

  test('food choices expose tray count and pressed state to assistive tech', () => {
    expect(getFoodChoiceAccessibilityState('Banana', 0)).toEqual({
      ariaLabel: 'Choose Banana, none on tray',
      ariaPressed: 'false',
    });
    expect(getFoodChoiceAccessibilityState('Cookie', 2)).toEqual({
      ariaLabel: 'Choose Cookie, 2 on tray',
      ariaPressed: 'true',
    });
  });

  test('color and decoration choices expose selected state to assistive tech', () => {
    expect(getToggleChoiceAccessibilityState('Pink', true)).toEqual({
      ariaLabel: 'Choose Pink, selected',
      ariaPressed: 'true',
    });
    expect(getToggleChoiceAccessibilityState('Sprinkles', false)).toEqual({
      ariaLabel: 'Choose Sprinkles, not selected',
      ariaPressed: 'false',
    });
  });

  test('bake time finale offers a new shift instead of chaining on', () => {
    const content = getRequiredContent(getActivity('kennedis-orders-free-make-001'));

    expect(content.next_activity_id).toBeUndefined();
    expect(content.shift_restart_activity_id).toBe('kennedis-orders-banana-001');
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
    expect(followNextActivityIds('kennedis-orders-banana-001')).toEqual([
      'kennedis-orders-banana-001',
      'kennedis-orders-two-cookies-001',
      'kennedis-orders-pink-berries-001',
      'kennedis-orders-b-foods-001',
      'kennedis-orders-fix-berries-001',
      'kennedis-orders-free-make-001',
    ]);
  });
});

function getActivity(activityId: string): LearningActivity {
  const activity = cafeActivities.find((entry) => entry.id === activityId);
  if (!activity) throw new Error(`Missing Bear Cafe activity ${activityId}`);
  return activity;
}

function getActivityWithBrief(
  activityId: string
): LearningActivity & { originating_brief_id?: string } {
  return getActivity(activityId) as LearningActivity & { originating_brief_id?: string };
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
