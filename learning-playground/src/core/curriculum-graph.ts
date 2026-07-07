import curriculumData from '../content/curriculum/curriculum.v1.json';
import type { TransferContextType } from '../types/activity';

export interface CurriculumDomain {
  id: string;
  label: string;
}

export interface CurriculumSkillLevel {
  level: number;
  label: string;
}

export interface CurriculumEvidenceRequirements {
  min_attempts: number;
  min_accuracy: number;
  max_hint_rate: number;
  max_average_response_ms: number;
  min_contexts_for_transfer: number;
  requires_retention: boolean;
}

export interface CurriculumReviewPolicy {
  likely_mastered_hours: number;
  first_review_days: number;
  second_review_days: number;
}

export interface CurriculumSkill {
  id: string;
  label: string;
  domain: string;
  levels: CurriculumSkillLevel[];
  prerequisites: string[];
  unlocks: string[];
  activity_contexts: string[];
  planned_transfer_contexts: TransferContextType[];
  evidence_requirements: CurriculumEvidenceRequirements;
  review_policy: CurriculumReviewPolicy;
}

export interface CurriculumGraphData {
  version: number;
  domains: CurriculumDomain[];
  skills: CurriculumSkill[];
}

export interface CurriculumGraph {
  data: CurriculumGraphData;
  getSkill(skillId: string): CurriculumSkill | undefined;
  getPrerequisites(skillId: string): CurriculumSkill[];
  getUnlockedSkills(skillId: string): CurriculumSkill[];
}

const DEFAULT_CURRICULUM = curriculumData as CurriculumGraphData;
const TRANSFER_CONTEXT_TYPES = new Set<string>([
  'same_format_same_examples',
  'same_format_new_examples',
  'different_prompt_mode',
  'different_interaction_model',
  'reverse_mapping',
  'category_sort',
  'delayed_review',
  'parent_observed_real_world',
]);

export function loadCurriculumGraph(
  data: CurriculumGraphData = DEFAULT_CURRICULUM
): CurriculumGraph {
  const errors = validateCurriculumGraph(data);
  if (errors.length > 0) {
    throw new Error(`Invalid curriculum graph: ${errors.join('; ')}`);
  }

  const skillsById = new Map(data.skills.map((skill) => [skill.id, skill]));

  return {
    data,
    getSkill(skillId) {
      return skillsById.get(skillId);
    },
    getPrerequisites(skillId) {
      const skill = skillsById.get(skillId);
      if (!skill) return [];
      return skill.prerequisites
        .map((prerequisiteId) => skillsById.get(prerequisiteId))
        .filter((prerequisite): prerequisite is CurriculumSkill => (
          prerequisite !== undefined
        ));
    },
    getUnlockedSkills(skillId) {
      const skill = skillsById.get(skillId);
      if (!skill) return [];
      return skill.unlocks
        .map((unlockedSkillId) => skillsById.get(unlockedSkillId))
        .filter((unlockedSkill): unlockedSkill is CurriculumSkill => (
          unlockedSkill !== undefined
        ));
    },
  };
}

export function validateCurriculumGraph(data: CurriculumGraphData): string[] {
  const errors: string[] = [];
  const domainIds = new Set(data.domains.map((domain) => domain.id));
  const skillIds = new Set<string>();

  for (const skill of data.skills) {
    if (skillIds.has(skill.id)) {
      errors.push(`Duplicate skill id: ${skill.id}`);
    }
    skillIds.add(skill.id);

    if (!domainIds.has(skill.domain)) {
      errors.push(`Skill ${skill.id} references missing domain ${skill.domain}`);
    }

    if (skill.unlocks.includes(skill.id)) {
      errors.push(`Skill ${skill.id} cannot unlock itself`);
    }

    if (skill.planned_transfer_contexts.length === 0) {
      errors.push(`Skill ${skill.id} needs at least one planned transfer context`);
    }

    for (const contextType of skill.planned_transfer_contexts) {
      if (!TRANSFER_CONTEXT_TYPES.has(contextType)) {
        errors.push(`Skill ${skill.id} has unknown transfer context ${contextType}`);
      }
    }

    for (const prerequisiteId of skill.prerequisites) {
      if (!skillIds.has(prerequisiteId) && !hasSkill(data, prerequisiteId)) {
        errors.push(`Skill ${skill.id} has missing prerequisite ${prerequisiteId}`);
      }
    }

    for (const unlockedSkillId of skill.unlocks) {
      if (!skillIds.has(unlockedSkillId) && !hasSkill(data, unlockedSkillId)) {
        errors.push(`Skill ${skill.id} unlocks missing skill ${unlockedSkillId}`);
      }
    }
  }

  errors.push(...detectPrerequisiteCycles(data));
  return errors;
}

function detectPrerequisiteCycles(data: CurriculumGraphData): string[] {
  const errors: string[] = [];
  const skillById = new Map(data.skills.map((skill) => [skill.id, skill]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const skill of data.skills) {
    visit(skill.id, []);
  }

  return errors;

  function visit(skillId: string, path: string[]): void {
    if (visited.has(skillId)) return;

    if (visiting.has(skillId)) {
      const cycleStartIndex = path.indexOf(skillId);
      const cyclePath = [...path.slice(Math.max(0, cycleStartIndex)), skillId];
      errors.push(`Circular prerequisite chain: ${cyclePath.join(' -> ')}`);
      return;
    }

    const skill = skillById.get(skillId);
    if (!skill) return;

    visiting.add(skillId);
    for (const prerequisiteId of skill.prerequisites) {
      visit(prerequisiteId, [...path, skillId]);
    }
    visiting.delete(skillId);
    visited.add(skillId);
  }
}

function hasSkill(data: CurriculumGraphData, skillId: string): boolean {
  return data.skills.some((skill) => skill.id === skillId);
}
