/**
 * Simple localStorage wrapper for parent settings and local progress.
 */

import type { ParentSettings } from '../types/storage';
import type { StorageServiceInterface } from '../types/runtime';
import type { ActivityAttemptEvent } from '../types/events';
import type { ParentObservation } from '../types/observations';
import type {
  ParentDifficultyAction,
  ParentDifficultyOverride,
} from '../types/parent-actions';
import type { ParentTransferDecision } from '../types/transfer';
import type { ChildProgressProfile } from '../types/progress';
import {
  buildProgressProfileFromEvents,
  createEmptyProgressProfile,
} from './progress';
import { buildProgressExportJson } from './export-data';

const SETTINGS_KEY = 'lp_parent_settings';
const PROGRESS_KEY = 'lp_child_progress_profile';
const OBSERVATIONS_KEY = 'lp_parent_observations';
const DIFFICULTY_ACTIONS_KEY = 'lp_parent_difficulty_actions';
const DIFFICULTY_OVERRIDES_KEY = 'lp_parent_difficulty_overrides';
const TRANSFER_DECISIONS_KEY = 'lp_parent_transfer_decisions';
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

      return profile;
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

  exportProgressData(events: ActivityAttemptEvent[]): string {
    return buildProgressExportJson({
      settings: this.getSettings(),
      childProfile: this.getProgressProfile(DEFAULT_CHILD_ID),
      events,
      observations: this.getParentObservations(),
      actions: this.getParentDifficultyActions(),
      overrides: this.getParentDifficultyOverrides(),
      transferDecisions: this.getParentTransferDecisions(),
    });
  }
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
      observation.updated_at === undefined ||
      typeof observation.updated_at === 'string'
    )
  );
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
