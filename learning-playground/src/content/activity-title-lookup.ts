import { APPROVED_ACTIVITIES } from './activity-catalog';
import type { ActivityTitleLookup } from '../core/parent-review-format';

const CURRENT_ACTIVITY_TITLES: Record<string, string> = Object.fromEntries(
  APPROVED_ACTIVITIES.map((activity) => [activity.id, activity.title])
);

export const ACTIVITY_TITLE_LOOKUP: ActivityTitleLookup = {
  ...CURRENT_ACTIVITY_TITLES,
  'kennedis-orders-two-cookies-001': {
    current: CURRENT_ACTIVITY_TITLES['kennedis-orders-two-cookies-001'] ?? 'Four Cookies Order',
    versions: {
      1: 'Two Cookies Order',
    },
  },
  'kennedis-orders-pink-berries-001': {
    current: CURRENT_ACTIVITY_TITLES['kennedis-orders-pink-berries-001'] ?? 'Banana Cookie Order',
    versions: {
      1: 'Three Pink Berries Order',
    },
  },
};
