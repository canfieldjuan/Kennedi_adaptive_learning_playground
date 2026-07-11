/**
 * Recent Stories presentation (spec §21) — pure and DOM-free. Turns
 * story history records into simple parent-readable lines: which story,
 * which mode, completed or left early, when. The pack arrives as a
 * PARAMETER so core never imports module content, and nothing here
 * infers character traits from the child's choices — facts only.
 */

import type { StoryHistoryRecord } from '../types/story-history';

/**
 * The labels the formatter needs, structurally — the story pack
 * satisfies this shape, and core stays free of module imports.
 */
export interface StoryPackLabels {
  characters: Array<{ id: string; label: string }>;
  settings: Array<{ id: string; label: string }>;
  problems: Array<{ id: string; label: string }>;
}

export interface RecentStoryItem {
  /** e.g. "Princess Poppy at The Enchanted Forest" */
  title: string;
  /** e.g. "A Missing Friend" */
  problemLabel: string;
  /** "Tell Me a Story" | "Tell It Together" */
  modeLabel: string;
  /** "Completed" | "Left early" */
  statusLabel: string;
  /** Calendar date of the session start (YYYY-MM-DD). */
  startedOn: string;
}

export function buildRecentStories(
  records: StoryHistoryRecord[],
  pack: StoryPackLabels,
  limit = 10
): RecentStoryItem[] {
  const characterLabels = new Map(pack.characters.map((entry) => [entry.id, entry.label]));
  const settingLabels = new Map(pack.settings.map((entry) => [entry.id, entry.label]));
  const problemLabels = new Map(pack.problems.map((entry) => [entry.id, entry.label]));

  return [...records]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, limit)
    .map((record) => ({
      title: `${characterLabels.get(record.character_id) ?? record.character_id} at ${
        settingLabels.get(record.setting_id) ?? record.setting_id
      }`,
      problemLabel: problemLabels.get(record.problem_id) ?? record.problem_id,
      modeLabel: record.mode === 'together' ? 'Tell It Together' : 'Tell Me a Story',
      statusLabel: record.status === 'completed' ? 'Completed' : 'Left early',
      startedOn: record.started_at.slice(0, 10),
    }));
}
