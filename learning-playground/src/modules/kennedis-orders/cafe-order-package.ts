import type { LearningActivity } from '../../types/activity';
import {
  CAFE_ORDER_BAG_COLORS,
  CAFE_ORDER_CALLER_IDS,
  CAFE_ORDER_FOOD_COLOR_IDS,
  CAFE_ORDER_FOOD_DECORATION_IDS,
  CAFE_ORDER_FOOD_IDS,
  CAFE_ORDER_SEALS,
  type CafeOrderBagColorId,
  type CafeOrderCallerId,
  type CafeOrderCompletion,
  type CafeOrderFoodColorId,
  type CafeOrderFoodDecorationId,
  type CafeOrderFoodId,
  type CafeOrderSealId,
} from '../../types/cafe-order-completion';
import type { BearCafeContent } from './kennedis-orders.types';
import { renderDecorationArt } from './decoration-art';
import { renderFoodArt } from './food-art';

export const DEFAULT_CAFE_ORDER_BAG_COLOR_ID: CafeOrderBagColorId = 'pink';
export const DEFAULT_CAFE_ORDER_SEAL_ID: CafeOrderSealId = 'heart';

export { CAFE_ORDER_BAG_COLORS, CAFE_ORDER_SEALS };

const CALLER_ID_SET = new Set<string>(CAFE_ORDER_CALLER_IDS);
const FOOD_ID_SET = new Set<string>(CAFE_ORDER_FOOD_IDS);
const FOOD_COLOR_ID_SET = new Set<string>(CAFE_ORDER_FOOD_COLOR_IDS);
const FOOD_DECORATION_ID_SET = new Set<string>(CAFE_ORDER_FOOD_DECORATION_IDS);
const BAG_COLOR_ID_SET = new Set<string>(CAFE_ORDER_BAG_COLORS.map((item) => item.id));
const SEAL_ID_SET = new Set<string>(CAFE_ORDER_SEALS.map((item) => item.id));
const FOOD_COLOR_VALUES: Record<CafeOrderFoodColorId, string> = {
  pink: '#f5a9c4',
  yellow: '#f4cd58',
  red: '#ef5b62',
  orange: '#f3a45c',
  blue: '#70b9dc',
};

export function createCafeOrderCompletion(params: {
  activity: LearningActivity;
  content: BearCafeContent;
  tray: {
    foodCounts: Record<string, number>;
    colorId?: string;
    decorationId?: string;
  };
  sessionId: string;
  childId: string;
  bagColorId: CafeOrderBagColorId;
  sealId: CafeOrderSealId;
  completionId?: string;
  completedAt?: string;
}): CafeOrderCompletion | null {
  if (
    !CALLER_ID_SET.has(params.content.character.id) ||
    !BAG_COLOR_ID_SET.has(params.bagColorId) ||
    !SEAL_ID_SET.has(params.sealId)
  ) {
    return null;
  }

  const foodItems = params.content.foods.flatMap((food) => {
    const count = params.tray.foodCounts[food.id] ?? 0;
    if (!FOOD_ID_SET.has(food.id) || !Number.isInteger(count) || count < 1) return [];

    return [{
      food_id: food.id as CafeOrderFoodId,
      count,
    }];
  });
  const totalFoodCount = foodItems.reduce((total, item) => total + item.count, 0);
  if (
    foodItems.length < 1 ||
    foodItems.length > 6 ||
    new Set(foodItems.map((item) => item.food_id)).size !== foodItems.length ||
    foodItems.some((item) => item.count > 5) ||
    totalFoodCount > 12
  ) {
    return null;
  }

  const foodColorId = FOOD_COLOR_ID_SET.has(params.tray.colorId ?? '')
    ? params.tray.colorId as CafeOrderFoodColorId
    : undefined;
  const foodDecorationId = FOOD_DECORATION_ID_SET.has(params.tray.decorationId ?? '')
    ? params.tray.decorationId as CafeOrderFoodDecorationId
    : undefined;

  return {
    schema_version: 1,
    game: 'kennedis-orders',
    completion_id: params.completionId ?? createCompletionId(),
    session_id: params.sessionId,
    child_id: params.childId,
    activity_id: params.activity.id,
    activity_version: params.activity.version,
    caller_id: params.content.character.id as CafeOrderCallerId,
    food_items: foodItems,
    ...(foodColorId ? { food_color_id: foodColorId } : {}),
    ...(foodDecorationId ? { food_decoration_id: foodDecorationId } : {}),
    bag_color_id: params.bagColorId,
    seal_id: params.sealId,
    completed_at: params.completedAt ?? new Date().toISOString(),
  };
}

export function renderCafeOrderPackage(record: CafeOrderCompletion): string {
  const bagColor = CAFE_ORDER_BAG_COLORS.find((item) => item.id === record.bag_color_id)
    ?? CAFE_ORDER_BAG_COLORS[0];
  const seal = CAFE_ORDER_SEALS.find((item) => item.id === record.seal_id)
    ?? CAFE_ORDER_SEALS[0];

  return `
    <div
      class="bear-cafe-package"
      data-bag-color="${bagColor.id}"
      data-seal="${seal.id}"
      style="--bear-cafe-bag-color: ${bagColor.value}"
      aria-hidden="true"
    >
      <span class="bear-cafe-package__food">${renderCafeOrderFoodIcons(record)}</span>
      <span class="bear-cafe-package__bag">
        <img
          class="bear-cafe-package__frame"
          src="/assets/images/bear-cafe-order-bag-frame.svg"
          alt=""
          draggable="false"
        >
      </span>
      <img
        class="bear-cafe-package__seal"
        src="/assets/images/bear-cafe-seal-${seal.id}.svg"
        alt=""
        draggable="false"
      >
    </div>
  `;
}

export function renderCafeOrderFoodIcons(record: CafeOrderCompletion): string {
  return record.food_items
    .flatMap((item) => Array.from({ length: item.count }, () => renderFoodArt(item.food_id)))
    .join('');
}

export function renderCafeOrderContents(record: CafeOrderCompletion): string {
  return `
    <div class="bear-cafe-order-contents" aria-hidden="true">
      <span class="bear-cafe-order-contents__foods">${renderCafeOrderFoodIcons(record)}</span>
      ${record.food_color_id
        ? `<span class="bear-cafe-order-contents__color" style="--bear-cafe-food-color: ${FOOD_COLOR_VALUES[record.food_color_id]}"></span>`
        : ''}
      ${record.food_decoration_id
        ? `<span class="bear-cafe-order-contents__decoration">${renderDecorationArt(record.food_decoration_id)}</span>`
        : ''}
    </div>
  `;
}

export function getCafeOrderAccessibleLabel(record: CafeOrderCompletion): string {
  const bagColor = CAFE_ORDER_BAG_COLORS.find((item) => item.id === record.bag_color_id)?.label
    ?? 'Pink';
  const seal = CAFE_ORDER_SEALS.find((item) => item.id === record.seal_id)?.label
    ?? 'Heart';

  return `${getCafeOrderFoodSummary(record)} in a ${bagColor} bag with a ${seal} seal`;
}

export function getCafeOrderCallerLabel(callerId: CafeOrderCallerId): string {
  switch (callerId) {
    case 'baby-polar-bear':
      return 'Baby Polar Bear';
    case 'mama-bear':
      return 'Mama Bear';
    case 'daddy-bear':
      return 'Daddy Bear';
  }
}

export function getCafeOrderFoodSummary(record: CafeOrderCompletion): string {
  const foods = record.food_items
    .map((item) => `${item.count} ${getFoodLabel(item.food_id, item.count)}`)
    .join(' and ');
  const color = record.food_color_id ? `, ${record.food_color_id}` : '';
  const decoration = record.food_decoration_id
    ? `, with ${record.food_decoration_id}`
    : '';

  return `${foods}${color}${decoration}`;
}

function getFoodLabel(foodId: CafeOrderFoodId, count: number): string {
  if (count === 1) return foodId;
  if (foodId === 'berry') return 'berries';
  return `${foodId}s`;
}

function createCompletionId(): string {
  if (globalThis.crypto?.randomUUID) {
    return `cafe-order-${globalThis.crypto.randomUUID()}`;
  }

  return `cafe-order-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
