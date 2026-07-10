import type { ParentObservation } from '../types/observations';
import { formatSkillLabel } from './parent-review-format';
import { formatParentObservationCategory } from './parent-observation-signals';

export interface ParentNoteHistoryItem {
  observation_id: string;
  note: string;
  category_label: string;
  skill_labels: string[];
  created_at: string;
  updated_at?: string;
  timestamp_label: string;
}

export function buildParentNoteHistory(
  observations: ParentObservation[]
): ParentNoteHistoryItem[] {
  return [...observations]
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      b.observation_id.localeCompare(a.observation_id)
    ))
    .map((observation) => ({
      observation_id: observation.observation_id,
      note: observation.note,
      category_label: formatParentObservationCategory(observation.category),
      skill_labels: (observation.skill_ids ?? []).map(formatSkillLabel),
      created_at: observation.created_at,
      updated_at: observation.updated_at,
      timestamp_label: formatNoteTimestamp(observation.updated_at ?? observation.created_at),
    }));
}

function formatNoteTimestamp(timestamp: string): string {
  const [date = '', timeWithZone = ''] = timestamp.split('T');
  const time = timeWithZone.slice(0, 5);
  if (!date || !time) return timestamp;

  return `${date} ${time} UTC`;
}
