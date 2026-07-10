import { APPROVED_ACTIVITIES } from '../content/activity-catalog';
import type { LearningActivity } from '../types/activity';
import {
  loadCurriculumGraph,
  type CurriculumGraph,
  type CurriculumSkillLevel,
} from './curriculum-graph';

export type DifficultyCoverageStatus = 'covered' | 'blocked_by_content_gap';

export interface DifficultyCoverageLevel {
  level: number;
  label: string;
  min_difficulty_level: number;
  max_difficulty_level: number;
  approved_activity_ids: string[];
}

export interface DifficultyCoverageGap extends DifficultyCoverageLevel {
  skill_id: string;
}

export interface SkillDifficultyCoverage {
  skill_id: string;
  current_level: number;
  current_level_label: string;
  current_min_difficulty_level: number;
  current_max_difficulty_level: number;
  status: DifficultyCoverageStatus;
  approved_activity_ids: string[];
  covered_level_count: number;
  total_level_count: number;
  missing_levels: DifficultyCoverageLevel[];
  reason: string;
}

export interface EvaluateDifficultyCoverageInput {
  skill_id: string;
  current_level: number;
  activities?: LearningActivity[];
  graph?: CurriculumGraph;
}

export function evaluateSkillDifficultyCoverage(
  input: EvaluateDifficultyCoverageInput
): SkillDifficultyCoverage | undefined {
  const graph = input.graph ?? loadCurriculumGraph();
  const skill = graph.getSkill(input.skill_id);
  const currentLevel = graph.getSkillLevel(input.skill_id, input.current_level);
  if (!skill || !currentLevel) return undefined;

  const activities = input.activities ?? APPROVED_ACTIVITIES;
  const levels = skill.levels
    .map((level) => buildLevelCoverage(input.skill_id, level, activities))
    .sort((a, b) => a.level - b.level);
  const currentCoverage = levels.find((level) => (
    level.level === input.current_level
  ));
  if (!currentCoverage) return undefined;

  const missingLevels = levels.filter((level) => (
    level.approved_activity_ids.length === 0
  ));
  const status: DifficultyCoverageStatus =
    currentCoverage.approved_activity_ids.length > 0
      ? 'covered'
      : 'blocked_by_content_gap';

  return {
    skill_id: input.skill_id,
    current_level: currentCoverage.level,
    current_level_label: currentCoverage.label,
    current_min_difficulty_level: currentCoverage.min_difficulty_level,
    current_max_difficulty_level: currentCoverage.max_difficulty_level,
    status,
    approved_activity_ids: currentCoverage.approved_activity_ids,
    covered_level_count: levels.length - missingLevels.length,
    total_level_count: levels.length,
    missing_levels: missingLevels,
    reason: buildCoverageReason(currentCoverage, status),
  };
}

export function listCurriculumDifficultyGaps(
  activities: LearningActivity[] = APPROVED_ACTIVITIES,
  graph: CurriculumGraph = loadCurriculumGraph()
): DifficultyCoverageGap[] {
  return graph.data.skills
    .flatMap((skill) => skill.levels.map((level) => ({
      skill_id: skill.id,
      ...buildLevelCoverage(skill.id, level, activities),
    })))
    .filter((level) => level.approved_activity_ids.length === 0)
    .sort((a, b) => (
      a.skill_id.localeCompare(b.skill_id) || a.level - b.level
    ));
}

function buildLevelCoverage(
  skillId: string,
  level: CurriculumSkillLevel,
  activities: LearningActivity[]
): DifficultyCoverageLevel {
  const approvedActivityIds = activities
    .filter((activity) => (
      activity.skill_ids.includes(skillId) &&
      activity.difficulty.level >= level.min_difficulty_level &&
      activity.difficulty.level <= level.max_difficulty_level
    ))
    .map((activity) => activity.id)
    .sort((a, b) => a.localeCompare(b));

  return {
    level: level.level,
    label: level.label,
    min_difficulty_level: level.min_difficulty_level,
    max_difficulty_level: level.max_difficulty_level,
    approved_activity_ids: approvedActivityIds,
  };
}

function buildCoverageReason(
  level: DifficultyCoverageLevel,
  status: DifficultyCoverageStatus
): string {
  const band = `${level.min_difficulty_level}-${level.max_difficulty_level}`;
  if (status === 'blocked_by_content_gap') {
    return `No approved activity practices ${level.label} at difficulty ${band}. ` +
      'This is a content gap in the app, not a judgment about the child.';
  }

  const activityLabel = level.approved_activity_ids.length === 1
    ? 'activity practices'
    : 'activities practice';
  return `${level.approved_activity_ids.length} approved ${activityLabel} ` +
    `${level.label} at difficulty ${band}.`;
}
