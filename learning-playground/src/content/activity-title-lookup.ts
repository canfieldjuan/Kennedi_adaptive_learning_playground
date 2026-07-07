import { APPROVED_ACTIVITIES } from './activity-catalog';

export const ACTIVITY_TITLE_LOOKUP: Record<string, string> = Object.fromEntries(
  APPROVED_ACTIVITIES.map((activity) => [activity.id, activity.title])
);
