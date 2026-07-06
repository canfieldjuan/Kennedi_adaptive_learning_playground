/**
 * Local event logger.
 * Stores ActivityAttemptEvents in localStorage.
 * Never sends data anywhere without explicit parent action.
 */

import type { ActivityAttemptEvent } from '../types/events';

const STORAGE_KEY = 'lp_activity_events';

export interface EventLogStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Light validation — checks the minimum shape of an event before storing.
 */
export function isValidEvent(event: unknown): event is ActivityAttemptEvent {
  if (typeof event !== 'object' || event === null) return false;
  const e = event as Record<string, unknown>;
  return (
    typeof e.event_id === 'string' &&
    typeof e.session_id === 'string' &&
    typeof e.child_id === 'string' &&
    typeof e.activity_id === 'string' &&
    typeof e.activity_version === 'number' &&
    Array.isArray(e.skill_ids) &&
    typeof e.timestamp === 'string' &&
    typeof e.prompt_text === 'string' &&
    typeof e.outcome === 'string' &&
    typeof e.selected_answer === 'string' &&
    typeof e.correct_answer === 'string' &&
    typeof e.attempt_number === 'number' &&
    typeof e.response_time_ms === 'number' &&
    typeof e.difficulty_level === 'number' &&
    typeof e.choice_count === 'number' &&
    typeof e.distractor_strength === 'string' &&
    typeof e.input_type === 'string' &&
    typeof e.hint_shown === 'boolean'
  );
}

/**
 * Append a new event to the local log.
 * Returns true if the event was valid and stored, false otherwise.
 */
export function appendEvent(
  event: ActivityAttemptEvent,
  localStore: EventLogStorage = globalThis.localStorage
): boolean {
  if (!isValidEvent(event)) {
    console.warn('[EventLog] Invalid event shape, not stored:', event);
    return false;
  }
  const events = getEvents(localStore);
  events.push(event);
  try {
    localStore.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch (err) {
    console.error('[EventLog] Failed to write to localStorage:', err);
    return false;
  }
}

/**
 * Retrieve all stored events.
 */
export function getEvents(
  localStore: EventLogStorage = globalThis.localStorage
): ActivityAttemptEvent[] {
  try {
    const raw = localStore.getItem(STORAGE_KEY);
    if (!raw) return [];
    const storedEvents = JSON.parse(raw) as unknown[];
    const events = storedEvents
      .map(normalizeStoredEvent)
      .filter((event): event is ActivityAttemptEvent => event !== null);

    if (events.length !== storedEvents.length || hasLegacyStoredEvents(storedEvents)) {
      localStore.setItem(STORAGE_KEY, JSON.stringify(events));
    }

    return events;
  } catch {
    return [];
  }
}

/**
 * Clear all stored events. Requires explicit call (parent action).
 */
export function clearEvents(
  localStore: EventLogStorage = globalThis.localStorage
): void {
  localStore.removeItem(STORAGE_KEY);
}

/**
 * Export events as a JSON string for parent download.
 */
export function exportEvents(
  localStore: EventLogStorage = globalThis.localStorage
): string {
  return JSON.stringify(getEvents(localStore), null, 2);
}

function normalizeStoredEvent(event: unknown): ActivityAttemptEvent | null {
  if (isValidEvent(event)) return event;
  if (!isLegacyEventBase(event)) return null;

  const metadata = getMetadata(event.metadata);
  const selectedAnswer = getOptionalString(metadata.selected_answer) ??
    getOptionalString(metadata.selected_label) ??
    getOptionalString(metadata.choice_label) ??
    getOptionalString(metadata.color_label) ??
    getOptionalString(metadata.video_title) ??
    getOptionalString(event.selected_choice_id) ??
    'Unknown answer';
  const correctAnswer = getOptionalString(metadata.correct_answer) ??
    getOptionalString(metadata.correct_label) ??
    getOptionalString(event.correct_choice_id) ??
    selectedAnswer;

  const normalized: ActivityAttemptEvent = {
    event_id: event.event_id,
    session_id: event.session_id,
    child_id: event.child_id,
    activity_id: event.activity_id,
    activity_version: event.activity_version,
    skill_ids: event.skill_ids,
    timestamp: event.timestamp,
    prompt_text:
      getOptionalString(metadata.prompt_text) ??
      getOptionalString(metadata.prompt) ??
      event.activity_id,
    outcome: event.outcome,
    selected_choice_id: getOptionalString(event.selected_choice_id),
    correct_choice_id: getOptionalString(event.correct_choice_id),
    selected_answer: selectedAnswer,
    correct_answer: correctAnswer,
    attempt_number: event.attempt_number,
    response_time_ms: event.response_time_ms,
    difficulty_level: event.difficulty_level,
    choice_count: event.choice_count,
    distractor_strength: event.distractor_strength,
    input_type: event.input_type,
    hint_shown: event.hint_shown,
    metadata: {
      ...metadata,
      migrated_from_legacy: true,
    },
  };

  return isValidEvent(normalized) ? normalized : null;
}

function hasLegacyStoredEvents(events: unknown[]): boolean {
  return events.some((event) => (
    isLegacyEventBase(event) && !isValidEvent(event)
  ));
}

function isLegacyEventBase(
  event: unknown
): event is Omit<ActivityAttemptEvent, 'prompt_text' | 'selected_answer' | 'correct_answer'> {
  if (typeof event !== 'object' || event === null) return false;
  const e = event as Record<string, unknown>;
  return (
    typeof e.event_id === 'string' &&
    typeof e.session_id === 'string' &&
    typeof e.child_id === 'string' &&
    typeof e.activity_id === 'string' &&
    typeof e.activity_version === 'number' &&
    Array.isArray(e.skill_ids) &&
    e.skill_ids.every((skillId) => typeof skillId === 'string') &&
    typeof e.timestamp === 'string' &&
    typeof e.outcome === 'string' &&
    typeof e.attempt_number === 'number' &&
    typeof e.response_time_ms === 'number' &&
    typeof e.difficulty_level === 'number' &&
    typeof e.choice_count === 'number' &&
    typeof e.distractor_strength === 'string' &&
    typeof e.input_type === 'string' &&
    typeof e.hint_shown === 'boolean'
  );
}

function getMetadata(value: unknown): Record<string, string | number | boolean> {
  if (typeof value !== 'object' || value === null) return {};

  const metadata: Record<string, string | number | boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean'
    ) {
      metadata[key] = entry;
    }
  }

  return metadata;
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
