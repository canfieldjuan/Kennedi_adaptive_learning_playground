/**
 * Simple localStorage wrapper for parent settings and local progress.
 */

import type { ParentSettings } from '../types/storage';
import {
  TRAIN_TRIP_HISTORY_LIMIT,
  toTrainTripCompletion,
  type TrainTripCompletion,
} from '../modules/number-train/trip-history';
import {
  FASHION_CARD_HISTORY_LIMIT,
  toFashionCardCompletion,
  type FashionCardCompletion,
} from '../modules/dress-up-studio/fashion-cards';
import type { StorageServiceInterface } from '../types/runtime';
import type { ActivityAttemptEvent } from '../types/events';
import type { ParentObservation } from '../types/observations';
import { isParentObservationCategory } from './parent-observation-signals';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from '../types/parent-actions';
import type { ParentTransferDecision } from '../types/transfer';
import type { StoryHistoryRecord } from '../types/story-history';
import {
  CAFE_ORDER_BAG_COLORS,
  CAFE_ORDER_CALLER_IDS,
  CAFE_ORDER_FOOD_COLOR_IDS,
  CAFE_ORDER_FOOD_DECORATION_IDS,
  CAFE_ORDER_FOOD_IDS,
  CAFE_ORDER_HISTORY_LIMIT,
  CAFE_ORDER_SEALS,
  type CafeOrderBagColorId,
  type CafeOrderCallerId,
  type CafeOrderCompletion,
  type CafeOrderFoodColorId,
  type CafeOrderFoodDecorationId,
  type CafeOrderFoodId,
  type CafeOrderFoodItem,
  type CafeOrderSealId,
} from '../types/cafe-order-completion';
import type { ParentActivityBriefDecision } from '../types/activity-briefs';
import type {
  ParentMasterySnapshot,
  ParentReviewScheduleRecord,
} from '../types/mastery-records';
import type { ChildProgressProfile } from '../types/progress';
import {
  buildProgressProfileFromEvents,
  createEmptyProgressProfile,
  normalizeProgressProfileLevels,
} from './progress';
import { buildProgressExportJson } from './export-data';

const SETTINGS_KEY = 'lp_parent_settings';
const PROGRESS_KEY = 'lp_child_progress_profile';
const OBSERVATIONS_KEY = 'lp_parent_observations';
const DIFFICULTY_ACTIONS_KEY = 'lp_parent_difficulty_actions';
const DIFFICULTY_OVERRIDES_KEY = 'lp_parent_difficulty_overrides';
const TRANSFER_DECISIONS_KEY = 'lp_parent_transfer_decisions';
const ACTIVITY_BRIEF_DECISIONS_KEY = 'lp_parent_activity_brief_decisions';
const MASTERY_SNAPSHOTS_KEY = 'lp_parent_mastery_snapshots';
const REVIEW_SCHEDULE_RECORDS_KEY = 'lp_parent_review_schedule_records';
const STORY_HISTORY_KEY = 'lp_story_history';
const CAFE_ORDER_HISTORY_KEY = 'lp_cafe_order_history';
const TRAIN_TRIP_HISTORY_KEY = 'lp_train_trip_history';
const FASHION_CARD_HISTORY_KEY = 'lp_fashion_card_history';
const DEFAULT_CHILD_ID = 'local-child';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DEFAULT_SETTINGS: ParentSettings = {
  child_display_name: 'Explorer',
  session_limit_minutes: 20,
  sound_enabled: true,
  speech_enabled: true,
  video_enabled: true,
  max_activity_choices: 4,
  difficulty_mode: 'adaptive',
  story_mode: 'narrated',
  allowed_domains: [
    'literacy', 'phonics', 'math', 'logic', 'spatial',
    'memory', 'science', 'music', 'art', 'emotional',
    'language', 'coding_concepts',
  ],
  parent_gate_enabled: true,
  parent_gate_phrase: 'PARENT',
};

export class StorageService implements StorageServiceInterface {
  private readonly localStore: KeyValueStorage;

  constructor(localStore: KeyValueStorage = globalThis.localStorage) {
    this.localStore = localStore;
  }

  getSettings(): ParentSettings {
    try {
      const raw = this.localStore.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(settings: ParentSettings): void {
    try {
      this.localStore.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('[Storage] Failed to save settings:', err);
    }
  }

  getProgressProfile(childId = DEFAULT_CHILD_ID): ChildProgressProfile {
    try {
      const raw = this.localStore.getItem(PROGRESS_KEY);
      if (!raw) return createEmptyProgressProfile(childId);

      const profile = JSON.parse(raw) as ChildProgressProfile;
      if (profile.child_id !== childId) {
        return createEmptyProgressProfile(childId);
      }

      const normalization = normalizeProgressProfileLevels(profile);
      if (normalization.changed) {
        this.saveProgressProfile(normalization.profile);
      }

      return normalization.profile;
    } catch {
      return createEmptyProgressProfile(childId);
    }
  }

  saveProgressProfile(profile: ChildProgressProfile): void {
    try {
      this.localStore.setItem(PROGRESS_KEY, JSON.stringify(profile));
    } catch (err) {
      console.error('[Storage] Failed to save progress profile:', err);
    }
  }

  updateProgressFromEvents(
    childId: string,
    events: ActivityAttemptEvent[]
  ): ChildProgressProfile {
    const profile = buildProgressProfileFromEvents(
      childId,
      events,
      this.getProgressProfile(childId)
    );
    this.saveProgressProfile(profile);
    return profile;
  }

  resetProgress(): void {
    this.localStore.removeItem(PROGRESS_KEY);
  }

  getParentObservations(): ParentObservation[] {
    try {
      const raw = this.localStore.getItem(OBSERVATIONS_KEY);
      if (!raw) return [];

      const observations = JSON.parse(raw) as ParentObservation[];
      return observations.filter(isParentObservation);
    } catch {
      return [];
    }
  }

  saveParentObservation(observation: ParentObservation): void {
    const observations = this.getParentObservations();
    const index = observations.findIndex((stored) => (
      stored.observation_id === observation.observation_id
    ));

    const nextObservations = [...observations];
    if (index >= 0) {
      nextObservations[index] = observation;
    } else {
      nextObservations.push(observation);
    }

    try {
      this.localStore.setItem(OBSERVATIONS_KEY, JSON.stringify(nextObservations));
    } catch (err) {
      console.error('[Storage] Failed to save parent observation:', err);
    }
  }

  clearParentObservations(): void {
    this.localStore.removeItem(OBSERVATIONS_KEY);
  }

  getParentDifficultyActions(): ParentDifficultyAction[] {
    try {
      const raw = this.localStore.getItem(DIFFICULTY_ACTIONS_KEY);
      if (!raw) return [];

      const actions = JSON.parse(raw) as ParentDifficultyAction[];
      return actions.filter(isParentDifficultyAction);
    } catch {
      return [];
    }
  }

  saveParentDifficultyAction(action: ParentDifficultyAction): void {
    const actions = this.getParentDifficultyActions();
    const index = actions.findIndex((stored) => (
      stored.action_id === action.action_id
    ));

    const nextActions = [...actions];
    if (index >= 0) {
      nextActions[index] = action;
    } else {
      nextActions.push(action);
    }

    try {
      this.localStore.setItem(DIFFICULTY_ACTIONS_KEY, JSON.stringify(nextActions));
    } catch (err) {
      console.error('[Storage] Failed to save parent difficulty action:', err);
    }
  }

  clearParentDifficultyActions(): void {
    this.localStore.removeItem(DIFFICULTY_ACTIONS_KEY);
  }

  getParentDifficultyOverrides(): ParentDifficultyOverride[] {
    try {
      const raw = this.localStore.getItem(DIFFICULTY_OVERRIDES_KEY);
      if (!raw) return [];

      const overrides = JSON.parse(raw) as ParentDifficultyOverride[];
      return overrides.filter(isParentDifficultyOverride);
    } catch {
      return [];
    }
  }

  saveParentDifficultyOverride(override: ParentDifficultyOverride): void {
    const overrides = this.getParentDifficultyOverrides();
    let foundOverride = false;
    const nextOverrides = overrides.map((stored) => {
      if (stored.override_id === override.override_id) {
        foundOverride = true;
        return override;
      }

      if (
        override.active &&
        stored.active &&
        stored.child_id === override.child_id &&
        stored.skill_id === override.skill_id
      ) {
        return {
          ...stored,
          active: false,
          deactivated_at: override.created_at,
        };
      }

      return stored;
    });

    if (!foundOverride) {
      nextOverrides.push(override);
    }

    try {
      this.localStore.setItem(
        DIFFICULTY_OVERRIDES_KEY,
        JSON.stringify(nextOverrides)
      );
    } catch (err) {
      console.error('[Storage] Failed to save parent difficulty override:', err);
    }
  }

  clearParentDifficultyOverrides(): void {
    this.localStore.removeItem(DIFFICULTY_OVERRIDES_KEY);
  }

  getParentTransferDecisions(): ParentTransferDecision[] {
    try {
      const raw = this.localStore.getItem(TRANSFER_DECISIONS_KEY);
      if (!raw) return [];

      const decisions = JSON.parse(raw) as ParentTransferDecision[];
      return decisions.filter(isParentTransferDecision);
    } catch {
      return [];
    }
  }

  saveParentTransferDecision(decision: ParentTransferDecision): void {
    const decisions = this.getParentTransferDecisions();
    const index = decisions.findIndex((stored) => (
      stored.decision_id === decision.decision_id
    ));

    const nextDecisions = [...decisions];
    if (index >= 0) {
      nextDecisions[index] = decision;
    } else {
      nextDecisions.push(decision);
    }

    try {
      this.localStore.setItem(
        TRANSFER_DECISIONS_KEY,
        JSON.stringify(nextDecisions)
      );
    } catch (err) {
      console.error('[Storage] Failed to save parent transfer decision:', err);
    }
  }

  clearParentTransferDecisions(): void {
    this.localStore.removeItem(TRANSFER_DECISIONS_KEY);
  }

  getParentActivityBriefDecisions(): ParentActivityBriefDecision[] {
    try {
      const raw = this.localStore.getItem(ACTIVITY_BRIEF_DECISIONS_KEY);
      if (!raw) return [];

      const decisions = JSON.parse(raw) as ParentActivityBriefDecision[];
      return decisions.filter(isParentActivityBriefDecision);
    } catch {
      return [];
    }
  }

  saveParentActivityBriefDecision(decision: ParentActivityBriefDecision): void {
    const decisions = this.getParentActivityBriefDecisions();
    const index = decisions.findIndex((stored) => (
      stored.decision_id === decision.decision_id
    ));

    const nextDecisions = [...decisions];
    if (index >= 0) {
      nextDecisions[index] = decision;
    } else {
      nextDecisions.push(decision);
    }

    try {
      this.localStore.setItem(
        ACTIVITY_BRIEF_DECISIONS_KEY,
        JSON.stringify(nextDecisions)
      );
    } catch (err) {
      console.error('[Storage] Failed to save parent activity brief decision:', err);
    }
  }

  clearParentActivityBriefDecisions(): void {
    this.localStore.removeItem(ACTIVITY_BRIEF_DECISIONS_KEY);
  }

  getParentMasterySnapshots(): ParentMasterySnapshot[] {
    try {
      const raw = this.localStore.getItem(MASTERY_SNAPSHOTS_KEY);
      if (!raw) return [];

      const snapshots = JSON.parse(raw) as ParentMasterySnapshot[];
      return snapshots.filter(isParentMasterySnapshot);
    } catch {
      return [];
    }
  }

  saveParentMasterySnapshot(snapshot: ParentMasterySnapshot): void {
    const snapshots = this.getParentMasterySnapshots();
    const index = snapshots.findIndex((stored) => (
      stored.snapshot_id === snapshot.snapshot_id
    ));

    const nextSnapshots = [...snapshots];
    if (index >= 0) {
      nextSnapshots[index] = snapshot;
    } else {
      nextSnapshots.push(snapshot);
    }

    try {
      this.localStore.setItem(MASTERY_SNAPSHOTS_KEY, JSON.stringify(nextSnapshots));
    } catch (err) {
      console.error('[Storage] Failed to save parent mastery snapshot:', err);
    }
  }

  clearParentMasterySnapshots(): void {
    this.localStore.removeItem(MASTERY_SNAPSHOTS_KEY);
  }

  getParentReviewScheduleRecords(): ParentReviewScheduleRecord[] {
    try {
      const raw = this.localStore.getItem(REVIEW_SCHEDULE_RECORDS_KEY);
      if (!raw) return [];

      const records = JSON.parse(raw) as ParentReviewScheduleRecord[];
      return records.filter(isParentReviewScheduleRecord);
    } catch {
      return [];
    }
  }

  saveParentReviewScheduleRecord(record: ParentReviewScheduleRecord): void {
    const records = this.getParentReviewScheduleRecords();
    const index = records.findIndex((stored) => (
      stored.schedule_id === record.schedule_id
    ));

    const nextRecords = [...records];
    if (index >= 0) {
      nextRecords[index] = record;
    } else {
      nextRecords.push(record);
    }

    try {
      this.localStore.setItem(
        REVIEW_SCHEDULE_RECORDS_KEY,
        JSON.stringify(nextRecords)
      );
    } catch (err) {
      console.error('[Storage] Failed to save parent review schedule:', err);
    }
  }

  clearParentReviewScheduleRecords(): void {
    this.localStore.removeItem(REVIEW_SCHEDULE_RECORDS_KEY);
  }

  getStoryHistory(): StoryHistoryRecord[] {
    try {
      const raw = this.localStore.getItem(STORY_HISTORY_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Rebuild from the allowlist, never return stored objects as-is:
      // a tampered entry carrying extra keys (a score, narration text)
      // must not leak into export or survive the next append.
      return parsed.filter(isStoryHistoryRecord).map(toStoryHistoryRecord);
    } catch {
      return [];
    }
  }

  appendStoryHistory(record: StoryHistoryRecord): void {
    try {
      const records = this.getStoryHistory();
      records.push(record);
      this.localStore.setItem(STORY_HISTORY_KEY, JSON.stringify(records));
    } catch (err) {
      console.error('[Storage] Failed to append story history:', err);
    }
  }

  clearStoryHistory(): void {
    this.localStore.removeItem(STORY_HISTORY_KEY);
  }

  getCafeOrderHistory(): CafeOrderCompletion[] {
    try {
      const raw = this.localStore.getItem(CAFE_ORDER_HISTORY_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map(toCafeOrderCompletion)
        .filter((record): record is CafeOrderCompletion => record !== null)
        .sort(compareCafeOrdersOldestFirst)
        .slice(-CAFE_ORDER_HISTORY_LIMIT);
    } catch {
      return [];
    }
  }

  appendCafeOrderHistory(record: CafeOrderCompletion): void {
    try {
      const safeRecord = toCafeOrderCompletion(record);
      if (!safeRecord) return;

      const records = this.getCafeOrderHistory();
      if (records.some((stored) => stored.completion_id === safeRecord.completion_id)) {
        return;
      }

      const nextRecords = [...records, safeRecord]
        .sort(compareCafeOrdersOldestFirst)
        .slice(-CAFE_ORDER_HISTORY_LIMIT);
      this.localStore.setItem(CAFE_ORDER_HISTORY_KEY, JSON.stringify(nextRecords));
    } catch (err) {
      console.error('[Storage] Failed to append cafe order history:', err);
    }
  }

  getTrainTripHistory(): TrainTripCompletion[] {
    try {
      const raw = this.localStore.getItem(TRAIN_TRIP_HISTORY_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(toTrainTripCompletion)
        .filter((record): record is TrainTripCompletion => record !== null)
        .slice(-TRAIN_TRIP_HISTORY_LIMIT);
    } catch {
      return [];
    }
  }

  appendTrainTripHistory(record: TrainTripCompletion): void {
    try {
      const safeRecord = toTrainTripCompletion(record);
      if (!safeRecord) return;
      const records = this.getTrainTripHistory();
      if (records.some((stored) => stored.completion_id === safeRecord.completion_id)) {
        return;
      }
      const nextRecords = [...records, safeRecord].slice(-TRAIN_TRIP_HISTORY_LIMIT);
      this.localStore.setItem(TRAIN_TRIP_HISTORY_KEY, JSON.stringify(nextRecords));
    } catch (err) {
      console.error('[Storage] Failed to append train trip history:', err);
    }
  }

  clearTrainTripHistory(): void {
    this.localStore.removeItem(TRAIN_TRIP_HISTORY_KEY);
  }

  getFashionCardHistory(): FashionCardCompletion[] {
    try {
      const raw = this.localStore.getItem(FASHION_CARD_HISTORY_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(toFashionCardCompletion)
        .filter((record): record is FashionCardCompletion => record !== null)
        .slice(-FASHION_CARD_HISTORY_LIMIT);
    } catch {
      return [];
    }
  }

  appendFashionCardHistory(record: FashionCardCompletion): void {
    try {
      const safeRecord = toFashionCardCompletion(record);
      if (!safeRecord) return;
      const records = this.getFashionCardHistory();
      if (records.some((stored) => stored.completion_id === safeRecord.completion_id)) {
        return;
      }
      const nextRecords = [...records, safeRecord].slice(-FASHION_CARD_HISTORY_LIMIT);
      this.localStore.setItem(FASHION_CARD_HISTORY_KEY, JSON.stringify(nextRecords));
    } catch (err) {
      console.error('[Storage] Failed to append fashion card history:', err);
    }
  }

  clearFashionCardHistory(): void {
    this.localStore.removeItem(FASHION_CARD_HISTORY_KEY);
  }

  clearCafeOrderHistory(): void {
    this.localStore.removeItem(CAFE_ORDER_HISTORY_KEY);
  }

  exportProgressData(events: ActivityAttemptEvent[]): string {
    return buildProgressExportJson({
      settings: this.getSettings(),
      childProfile: this.getProgressProfile(DEFAULT_CHILD_ID),
      events,
      observations: this.getParentObservations(),
      actions: this.getParentDifficultyActions(),
      overrides: this.getParentDifficultyOverrides(),
      transferDecisions: this.getParentTransferDecisions(),
      activityBriefDecisions: this.getParentActivityBriefDecisions(),
      masterySnapshots: this.getParentMasterySnapshots(),
      reviewScheduleRecords: this.getParentReviewScheduleRecords(),
      storyHistory: this.getStoryHistory(),
      cafeOrderHistory: this.getCafeOrderHistory(),
      trainTripHistory: this.getTrainTripHistory(),
      fashionCardHistory: this.getFashionCardHistory(),
    });
  }
}

const CAFE_ORDER_CALLER_ID_SET = new Set<string>(CAFE_ORDER_CALLER_IDS);
const CAFE_ORDER_FOOD_ID_SET = new Set<string>(CAFE_ORDER_FOOD_IDS);
const CAFE_ORDER_FOOD_COLOR_ID_SET = new Set<string>(CAFE_ORDER_FOOD_COLOR_IDS);
const CAFE_ORDER_FOOD_DECORATION_ID_SET = new Set<string>(CAFE_ORDER_FOOD_DECORATION_IDS);
const CAFE_ORDER_BAG_COLOR_ID_SET = new Set<string>(CAFE_ORDER_BAG_COLORS.map((item) => item.id));
const CAFE_ORDER_SEAL_ID_SET = new Set<string>(CAFE_ORDER_SEALS.map((item) => item.id));

function toCafeOrderCompletion(value: unknown): CafeOrderCompletion | null {
  if (typeof value !== 'object' || value === null) return null;

  const record = value as Record<string, unknown>;
  if (
    record.schema_version !== 1 ||
    record.game !== 'kennedis-orders' ||
    !isBoundedIdentifier(record.completion_id) ||
    !isBoundedIdentifier(record.session_id) ||
    !isBoundedIdentifier(record.child_id) ||
    !isBoundedIdentifier(record.activity_id) ||
    !Number.isInteger(record.activity_version) ||
    (record.activity_version as number) < 1 ||
    (record.activity_version as number) > 1000 ||
    !isAllowedString(record.caller_id, CAFE_ORDER_CALLER_ID_SET) ||
    !isAllowedString(record.bag_color_id, CAFE_ORDER_BAG_COLOR_ID_SET) ||
    !isAllowedString(record.seal_id, CAFE_ORDER_SEAL_ID_SET) ||
    !isIsoTimestamp(record.completed_at)
  ) {
    return null;
  }

  const foodItems = toCafeOrderFoodItems(record.food_items);
  if (!foodItems) return null;

  if (
    record.food_color_id !== undefined &&
    !isAllowedString(record.food_color_id, CAFE_ORDER_FOOD_COLOR_ID_SET)
  ) {
    return null;
  }
  if (
    record.food_decoration_id !== undefined &&
    !isAllowedString(record.food_decoration_id, CAFE_ORDER_FOOD_DECORATION_ID_SET)
  ) {
    return null;
  }

  return {
    schema_version: 1,
    game: 'kennedis-orders',
    completion_id: record.completion_id,
    session_id: record.session_id,
    child_id: record.child_id,
    activity_id: record.activity_id,
    activity_version: record.activity_version as number,
    caller_id: record.caller_id as CafeOrderCallerId,
    food_items: foodItems,
    ...(record.food_color_id !== undefined
      ? { food_color_id: record.food_color_id as CafeOrderFoodColorId }
      : {}),
    ...(record.food_decoration_id !== undefined
      ? { food_decoration_id: record.food_decoration_id as CafeOrderFoodDecorationId }
      : {}),
    bag_color_id: record.bag_color_id as CafeOrderBagColorId,
    seal_id: record.seal_id as CafeOrderSealId,
    completed_at: record.completed_at,
  };
}

function toCafeOrderFoodItems(value: unknown): CafeOrderFoodItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null;

  const items: CafeOrderFoodItem[] = [];
  const seenFoodIds = new Set<string>();
  let totalCount = 0;

  for (const valueItem of value) {
    if (typeof valueItem !== 'object' || valueItem === null) return null;
    const item = valueItem as Record<string, unknown>;
    if (
      !isAllowedString(item.food_id, CAFE_ORDER_FOOD_ID_SET) ||
      seenFoodIds.has(item.food_id) ||
      !Number.isInteger(item.count) ||
      (item.count as number) < 1 ||
      (item.count as number) > 5
    ) {
      return null;
    }

    seenFoodIds.add(item.food_id);
    totalCount += item.count as number;
    items.push({
      food_id: item.food_id as CafeOrderFoodId,
      count: item.count as number,
    });
  }

  return totalCount <= 12 ? items : null;
}

function isAllowedString(value: unknown, allowed: Set<string>): value is string {
  return typeof value === 'string' && allowed.has(value);
}

function isBoundedIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 120 &&
    value.trim() === value
  );
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 40) return false;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function compareCafeOrdersOldestFirst(
  first: CafeOrderCompletion,
  second: CafeOrderCompletion
): number {
  return (
    first.completed_at.localeCompare(second.completed_at) ||
    first.completion_id.localeCompare(second.completion_id)
  );
}

/** The §21 allowlist made literal: only these fields ever come back out. */
function toStoryHistoryRecord(record: StoryHistoryRecord): StoryHistoryRecord {
  return {
    story_session_id: record.story_session_id,
    mode: record.mode,
    family_id: record.family_id,
    character_id: record.character_id,
    setting_id: record.setting_id,
    problem_id: record.problem_id,
    choice_path: [...record.choice_path],
    ...(record.ending_id !== undefined ? { ending_id: record.ending_id } : {}),
    started_at: record.started_at,
    ...(record.completed_at !== undefined ? { completed_at: record.completed_at } : {}),
    status: record.status,
  };
}

function isStoryHistoryRecord(value: unknown): value is StoryHistoryRecord {
  if (typeof value !== 'object' || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.story_session_id === 'string' &&
    (record.mode === 'narrated' || record.mode === 'together') &&
    typeof record.family_id === 'string' &&
    typeof record.character_id === 'string' &&
    typeof record.setting_id === 'string' &&
    typeof record.problem_id === 'string' &&
    Array.isArray(record.choice_path) &&
    record.choice_path.every((choice) => typeof choice === 'string') &&
    (record.ending_id === undefined || typeof record.ending_id === 'string') &&
    typeof record.started_at === 'string' &&
    (record.completed_at === undefined || typeof record.completed_at === 'string') &&
    (record.status === 'completed' || record.status === 'left_early')
  );
}

function isParentObservation(value: unknown): value is ParentObservation {
  if (typeof value !== 'object' || value === null) return false;

  const observation = value as Record<string, unknown>;
  return (
    typeof observation.observation_id === 'string' &&
    typeof observation.session_id === 'string' &&
    typeof observation.child_id === 'string' &&
    typeof observation.note === 'string' &&
    typeof observation.created_at === 'string' &&
    (
      observation.category === undefined ||
      isParentObservationCategory(observation.category)
    ) &&
    (
      observation.skill_ids === undefined ||
      isParentObservationSkillIds(observation.skill_ids)
    ) &&
    (
      observation.updated_at === undefined ||
      typeof observation.updated_at === 'string'
    )
  );
}

function isParentObservationSkillIds(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  if (!value.every((skillId) => (
    typeof skillId === 'string' &&
    skillId.trim().length > 0 &&
    skillId.trim() === skillId
  ))) return false;

  return new Set(value).size === value.length;
}

function isParentDifficultyAction(
  value: unknown
): value is ParentDifficultyAction {
  if (typeof value !== 'object' || value === null) return false;

  const action = value as Record<string, unknown>;
  return (
    typeof action.action_id === 'string' &&
    typeof action.session_id === 'string' &&
    typeof action.child_id === 'string' &&
    typeof action.skill_id === 'string' &&
    typeof action.skill_label === 'string' &&
    isParentDifficultyActionType(action.action_type) &&
    typeof action.source_recommendation === 'string' &&
    typeof action.source_status === 'string' &&
    typeof action.source_reason === 'string' &&
    typeof action.created_at === 'string'
  );
}

function isParentDifficultyActionType(value: unknown): boolean {
  return (
    value === 'use_suggestion' ||
    value === 'keep_stable' ||
    value === 'add_support' ||
    value === 'promote_gently' ||
    value === 'review_later' ||
    value === 'ignore_for_now'
  );
}

function isParentDifficultyOverride(
  value: unknown
): value is ParentDifficultyOverride {
  if (typeof value !== 'object' || value === null) return false;

  const override = value as Record<string, unknown>;
  return (
    typeof override.override_id === 'string' &&
    typeof override.child_id === 'string' &&
    typeof override.skill_id === 'string' &&
    typeof override.skill_label === 'string' &&
    isParentDifficultyOverrideType(override.override_type) &&
    typeof override.source_recommendation === 'string' &&
    typeof override.source_status === 'string' &&
    typeof override.source_reason === 'string' &&
    typeof override.active === 'boolean' &&
    typeof override.created_at === 'string' &&
    (
      override.deactivated_at === undefined ||
      typeof override.deactivated_at === 'string'
    )
  );
}

function isParentDifficultyOverrideType(value: unknown): boolean {
  return (
    value === 'keep_current' ||
    value === 'add_support' ||
    value === 'promote_gently' ||
    value === 'review_later'
  );
}

function isParentTransferDecision(
  value: unknown
): value is ParentTransferDecision {
  if (typeof value !== 'object' || value === null) return false;

  const decision = value as Record<string, unknown>;
  return (
    typeof decision.decision_id === 'string' &&
    typeof decision.session_id === 'string' &&
    typeof decision.child_id === 'string' &&
    typeof decision.skill_id === 'string' &&
    typeof decision.skill_label === 'string' &&
    isParentTransferDecisionType(decision.decision_type) &&
    typeof decision.source_recommendation === 'string' &&
    typeof decision.source_status === 'string' &&
    typeof decision.source_reason === 'string' &&
    typeof decision.missing_context_type === 'string' &&
    typeof decision.suggested_activity_template === 'string' &&
    (
      decision.transfer_activity_id === undefined ||
      typeof decision.transfer_activity_id === 'string'
    ) &&
    (
      decision.transfer_activity_title === undefined ||
      typeof decision.transfer_activity_title === 'string'
    ) &&
    typeof decision.created_at === 'string'
  );
}

function isParentTransferDecisionType(value: unknown): boolean {
  return (
    value === 'approve_transfer_activity' ||
    value === 'hold_transfer_activity'
  );
}

function isParentActivityBriefDecision(
  value: unknown
): value is ParentActivityBriefDecision {
  if (typeof value !== 'object' || value === null) return false;

  const decision = value as Record<string, unknown>;
  return (
    typeof decision.decision_id === 'string' &&
    typeof decision.session_id === 'string' &&
    typeof decision.child_id === 'string' &&
    typeof decision.skill_id === 'string' &&
    typeof decision.skill_label === 'string' &&
    isParentActivityBriefDecisionType(decision.decision_type) &&
    typeof decision.brief_id === 'string' &&
    typeof decision.required_context_type === 'string' &&
    isParentActivityBriefStrength(decision.required_strength) &&
    typeof decision.suggested_game_family === 'string' &&
    typeof decision.suggested_activity_pattern === 'string' &&
    typeof decision.reason === 'string' &&
    typeof decision.status_at_decision === 'string' &&
    typeof decision.created_at === 'string'
  );
}

function isParentActivityBriefDecisionType(value: unknown): boolean {
  return (
    value === 'approve_brief' ||
    value === 'hold_brief' ||
    value === 'archive_brief'
  );
}

function isParentActivityBriefStrength(value: unknown): boolean {
  return (
    value === 'medium' ||
    value === 'strong' ||
    value === 'retention'
  );
}

function isParentMasterySnapshot(value: unknown): value is ParentMasterySnapshot {
  if (typeof value !== 'object' || value === null) return false;

  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.snapshot_id === 'string' &&
    typeof snapshot.session_id === 'string' &&
    typeof snapshot.child_id === 'string' &&
    typeof snapshot.skill_id === 'string' &&
    typeof snapshot.skill_label === 'string' &&
    isMasteryStatus(snapshot.previous_status) &&
    isMasteryStatus(snapshot.next_status) &&
    typeof snapshot.confidence === 'number' &&
    isRecommendedMasteryAction(snapshot.recommended_action) &&
    typeof snapshot.reason === 'string' &&
    typeof snapshot.evidence_summary === 'string' &&
    typeof snapshot.skill_graph_rule === 'string' &&
    isStringArray(snapshot.source_event_ids) &&
    isStringArray(snapshot.source_observation_ids) &&
    isOptionalTransferCoverageStatus(snapshot.transfer_status) &&
    isOptionalNumber(snapshot.transfer_required_context_count) &&
    isOptionalNumber(snapshot.transfer_approved_context_count) &&
    isOptionalNumber(snapshot.transfer_successful_context_count) &&
    isOptionalTransferStrengthArray(snapshot.transfer_successful_strengths) &&
    isOptionalTransferStrength(snapshot.transfer_strongest_context_strength) &&
    typeof snapshot.created_at === 'string'
  );
}

function isParentReviewScheduleRecord(
  value: unknown
): value is ParentReviewScheduleRecord {
  if (typeof value !== 'object' || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.schedule_id === 'string' &&
    typeof record.snapshot_id === 'string' &&
    typeof record.session_id === 'string' &&
    typeof record.child_id === 'string' &&
    typeof record.skill_id === 'string' &&
    typeof record.skill_label === 'string' &&
    isMasteryStatus(record.mastery_status) &&
    typeof record.interval_label === 'string' &&
    (record.next_review_at === undefined || typeof record.next_review_at === 'string') &&
    isMasteryStatus(record.status_after_review) &&
    isRecommendedMasteryAction(record.recommended_action) &&
    typeof record.created_at === 'string'
  );
}

function isMasteryStatus(value: unknown): boolean {
  return (
    value === 'not_started' ||
    value === 'introduced' ||
    value === 'practicing' ||
    value === 'single_context_fluent' ||
    value === 'transfer_ready' ||
    value === 'likely_mastered' ||
    value === 'mastered' ||
    value === 'needs_review' ||
    value === 'regressed' ||
    value === 'blocked_by_content_gap'
  );
}

function isRecommendedMasteryAction(value: unknown): boolean {
  return (
    value === 'introduce' ||
    value === 'practice' ||
    value === 'increase_difficulty' ||
    value === 'test_transfer' ||
    value === 'schedule_review' ||
    value === 'add_support' ||
    value === 'pause_skill'
  );
}

function isOptionalTransferCoverageStatus(value: unknown): boolean {
  return (
    value === undefined ||
    value === 'covered' ||
    value === 'needs_more_content' ||
    value === 'ready_for_transfer' ||
    value === 'blocked_by_content_gap'
  );
}

function isOptionalTransferStrength(value: unknown): boolean {
  return value === undefined || isTransferStrength(value);
}

function isOptionalTransferStrengthArray(value: unknown): boolean {
  return value === undefined || (
    Array.isArray(value) &&
    value.every(isTransferStrength)
  );
}

function isTransferStrength(value: unknown): boolean {
  return (
    value === 'weak' ||
    value === 'medium' ||
    value === 'strong' ||
    value === 'retention'
  );
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === 'number';
}
