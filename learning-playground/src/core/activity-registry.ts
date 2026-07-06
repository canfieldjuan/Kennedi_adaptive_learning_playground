/**
 * Activity registry.
 * Maintains a map of activity IDs to their JSON definitions.
 */

import type { LearningActivity } from '../types/activity';

const registry = new Map<string, LearningActivity>();

export function registerActivity(activity: LearningActivity): void {
  registry.set(activity.id, activity);
}

export function getActivity(id: string): LearningActivity | undefined {
  return registry.get(id);
}

export function getAllActivities(): LearningActivity[] {
  return Array.from(registry.values());
}

export function clearRegistry(): void {
  registry.clear();
}
