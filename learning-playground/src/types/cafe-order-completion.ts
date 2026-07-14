export const CAFE_ORDER_HISTORY_LIMIT = 48;

export const CAFE_ORDER_CALLER_IDS = [
  'baby-polar-bear',
  'mama-bear',
  'daddy-bear',
] as const;

export const CAFE_ORDER_FOOD_IDS = [
  'cupcake',
  'berry',
  'banana',
  'bread',
  'cookie',
  'soup',
  'apple',
] as const;

export const CAFE_ORDER_FOOD_COLOR_IDS = [
  'pink',
  'yellow',
  'red',
  'orange',
  'blue',
] as const;

export const CAFE_ORDER_FOOD_DECORATION_IDS = [
  'sprinkles',
  'stars',
  'hearts',
  'bubbles',
] as const;

export const CAFE_ORDER_BAG_COLORS = [
  { id: 'pink', label: 'Pink', value: '#f5a9c4' },
  { id: 'yellow', label: 'Yellow', value: '#f4cd58' },
  { id: 'orange', label: 'Orange', value: '#f3a45c' },
  { id: 'blue', label: 'Blue', value: '#70b9dc' },
] as const;

export const CAFE_ORDER_SEALS = [
  { id: 'heart', label: 'Heart' },
  { id: 'star', label: 'Star' },
  { id: 'bubbles', label: 'Bubbles' },
] as const;

export type CafeOrderCallerId = typeof CAFE_ORDER_CALLER_IDS[number];
export type CafeOrderFoodId = typeof CAFE_ORDER_FOOD_IDS[number];
export type CafeOrderFoodColorId = typeof CAFE_ORDER_FOOD_COLOR_IDS[number];
export type CafeOrderFoodDecorationId = typeof CAFE_ORDER_FOOD_DECORATION_IDS[number];
export type CafeOrderBagColorId = typeof CAFE_ORDER_BAG_COLORS[number]['id'];
export type CafeOrderSealId = typeof CAFE_ORDER_SEALS[number]['id'];

export interface CafeOrderFoodItem {
  readonly food_id: CafeOrderFoodId;
  readonly count: number;
}

export interface CafeOrderCompletion {
  readonly schema_version: 1;
  readonly game: 'kennedis-orders';
  readonly completion_id: string;
  readonly session_id: string;
  readonly child_id: string;
  readonly activity_id: string;
  readonly activity_version: number;
  readonly caller_id: CafeOrderCallerId;
  readonly food_items: readonly CafeOrderFoodItem[];
  readonly food_color_id?: CafeOrderFoodColorId;
  readonly food_decoration_id?: CafeOrderFoodDecorationId;
  readonly bag_color_id: CafeOrderBagColorId;
  readonly seal_id: CafeOrderSealId;
  readonly completed_at: string;
}

export interface CafeOrderHistoryPort {
  list(): CafeOrderCompletion[];
  append(record: CafeOrderCompletion): void;
}
