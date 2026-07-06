/**
 * Simple localStorage wrapper for parent settings and local progress.
 */

import type { ParentSettings } from '../types/storage';
import type { StorageServiceInterface } from '../types/runtime';
import type { ActivityAttemptEvent } from '../types/events';
import type { ParentObservation } from '../types/observations';
import type { ChildProgressProfile } from '../types/progress';
import {
  buildProgressProfileFromEvents,
  createEmptyProgressProfile,
} from './progress';
import { buildProgressExportJson } from './export-data';

const SETTINGS_KEY = 'lp_parent_settings';
const PROGRESS_KEY = 'lp_child_progress_profile';
const OBSERVATIONS_KEY = 'lp_parent_observations';
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

  exportProgressData(events: ActivityAttemptEvent[]): string {
    return buildProgressExportJson({
      settings: this.getSettings(),
      childProfile: this.getProgressProfile(DEFAULT_CHILD_ID),
      events,
      observations: this.getParentObservations(),
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
