import type { LocalDataHealth } from './export-data';
import type { ParentSkillInterpretation } from './parent-interpretation';
import {
  formatActivityTitleList,
  formatSkillLabel,
  type ActivityTitleLookup,
  type ParentRecentAttempt,
} from './parent-review-format';
import type { ParentSessionReview } from './session-review';

export type Phase2CoverageState =
  | 'Answered'
  | 'Needs more data'
  | 'Not applicable yet';

export interface Phase2ChecklistItem {
  question: string;
  state: Phase2CoverageState;
  answer: string;
  evidence: string[];
  source_labels: string[];
}

export type Phase2FitStatus =
  | 'Too easy'
  | 'Good fit'
  | 'Needs support'
  | 'Not enough data';

export interface Phase2FitSummary {
  status: Phase2FitStatus;
  summary: string;
  evidence: string[];
}

export interface Phase2ChecklistCoverage {
  answered_count: number;
  total_count: number;
  fit_summary: Phase2FitSummary;
  items: Phase2ChecklistItem[];
}

export interface Phase2ChecklistInput {
  review: ParentSessionReview;
  recentAttempts: ParentRecentAttempt[];
  interpretations: ParentSkillInterpretation[];
  dataHealth: LocalDataHealth;
  activityTitleLookup: ActivityTitleLookup;
}

export function buildPhase2ChecklistCoverage(
  input: Phase2ChecklistInput
): Phase2ChecklistCoverage {
  const items = [
    buildDidQuestion(input),
    buildSkillsQuestion(input),
    buildEasyQuestion(input),
    buildDifficultQuestion(input),
    buildNextQuestion(input),
    buildRecommendationWhyQuestion(input),
    buildExportQuestion(input.dataHealth),
    buildDeleteQuestion(),
    buildChildExperienceQuestion(),
    buildSafetyQuestion(),
  ];

  return {
    answered_count: items.filter((item) => item.state === 'Answered').length,
    total_count: items.length,
    fit_summary: buildFitSummary(input.interpretations),
    items,
  };
}

function buildDidQuestion(input: Phase2ChecklistInput): Phase2ChecklistItem {
  const completedTitles = formatActivityTitleList(
    input.review.completed_activities,
    input.activityTitleLookup
  );
  const recentTitles = getUniqueValues(
    input.recentAttempts.map((attempt) => attempt.activity_title)
  );

  if (completedTitles.length > 0) {
    return answered(
      'What did my child do?',
      `Completed ${formatReadableList(completedTitles)}.`,
      [`${input.recentAttempts.length} recent attempt(s) shown.`],
      ['Session Review', 'Recent Attempts']
    );
  }

  if (recentTitles.length > 0) {
    return answered(
      'What did my child do?',
      `Worked on ${formatReadableList(recentTitles)}.`,
      [`${input.recentAttempts.length} recent attempt(s) shown.`],
      ['Recent Attempts']
    );
  }

  return needsMoreData(
    'What did my child do?',
    'No local activity attempts have been recorded for this session yet.',
    ['Session Review', 'Recent Attempts']
  );
}

function buildSkillsQuestion(input: Phase2ChecklistInput): Phase2ChecklistItem {
  const skillLabels = input.review.skills_touched.map(formatSkillLabel);

  if (skillLabels.length === 0) {
    return needsMoreData(
      'What skills were practiced?',
      'No skill practice has been recorded for this session yet.',
      ['Session Review']
    );
  }

  return answered(
    'What skills were practiced?',
    formatReadableList(skillLabels),
    [`${skillLabels.length} skill(s) touched.`],
    ['Session Review']
  );
}

function buildEasyQuestion(input: Phase2ChecklistInput): Phase2ChecklistItem {
  const readySkills = input.interpretations.filter((interpretation) => (
    interpretation.status === 'Ready for next challenge'
  ));

  if (readySkills.length > 0) {
    return answered(
      'What seemed easy?',
      `${formatReadableList(readySkills.map((skill) => skill.skill_label))} looked ready for more challenge.`,
      readySkills.map((skill) => skill.status_reason),
      ['Parent Guidance']
    );
  }

  if (input.interpretations.length > 0) {
    return needsMoreData(
      'What seemed easy?',
      'No clear easy pattern yet.',
      ['Parent Guidance']
    );
  }

  return notApplicableYet(
    'What seemed easy?',
    'This needs a few reviewed attempts first.',
    ['Parent Guidance']
  );
}

function buildDifficultQuestion(input: Phase2ChecklistInput): Phase2ChecklistItem {
  const supportSkills = input.interpretations.filter((interpretation) => (
    interpretation.status === 'Needs more support'
  ));

  if (supportSkills.length > 0) {
    return answered(
      'What seemed difficult?',
      `${formatReadableList(supportSkills.map((skill) => skill.skill_label))} may need support.`,
      supportSkills.map((skill) => skill.status_reason),
      ['Parent Guidance']
    );
  }

  if (input.interpretations.length > 0) {
    return needsMoreData(
      'What seemed difficult?',
      'No clear difficulty pattern yet.',
      ['Parent Guidance']
    );
  }

  return notApplicableYet(
    'What seemed difficult?',
    'This needs a few reviewed attempts first.',
    ['Parent Guidance']
  );
}

function buildNextQuestion(input: Phase2ChecklistInput): Phase2ChecklistItem {
  const recommendation = getPrimaryRecommendation(input.interpretations);

  if (!recommendation) {
    return notApplicableYet(
      'What should we try next?',
      'No next-step recommendation until more review data is available.',
      ['Parent Guidance']
    );
  }

  return answered(
    'What should we try next?',
    `${recommendation.recommendation} for ${recommendation.skill_label}.`,
    [recommendation.recommendation_reason],
    ['Parent Guidance']
  );
}

function buildRecommendationWhyQuestion(
  input: Phase2ChecklistInput
): Phase2ChecklistItem {
  const recommendation = getPrimaryRecommendation(input.interpretations);

  if (!recommendation) {
    return notApplicableYet(
      'Why is the app making that recommendation?',
      'The app has not made a recommendation yet.',
      ['Parent Guidance']
    );
  }

  return answered(
    'Why is the app making that recommendation?',
    `${recommendation.status_reason} ${recommendation.recommendation_reason}`,
    [
      `${recommendation.attempts} attempt(s).`,
      `${Math.round(recommendation.recent_accuracy * 100)}% accuracy.`,
    ],
    ['Parent Guidance']
  );
}

function buildExportQuestion(
  dataHealth: LocalDataHealth
): Phase2ChecklistItem {
  return answered(
    'Can I export everything?',
    'Yes. Export Progress Data downloads local settings, progress, activity events, parent observations, parent difficulty actions, and active parent guidance.',
    [
      `${dataHealth.total_events} event(s).`,
      `${dataHealth.total_observations} parent note(s).`,
      `${dataHealth.total_parent_actions} parent action(s).`,
    ],
    ['Data Management']
  );
}

function buildDeleteQuestion(): Phase2ChecklistItem {
  return answered(
    'Can I delete everything?',
    'Yes. Clear Progress Data removes local events, progress, and parent observations.',
    ['Data Management includes the clear action.'],
    ['Data Management']
  );
}

function buildChildExperienceQuestion(): Phase2ChecklistItem {
  return answered(
    'Does the child experience remain identical?',
    'Yes. This review is parent-only and does not change child screens or activity flow.',
    ['Parent Panel only.'],
    ['Product Contract']
  );
}

function buildSafetyQuestion(): Phase2ChecklistItem {
  return answered(
    'Does every safety guarantee still hold?',
    'Yes. Review, export, and delete use local data only, with no backend, account, cloud sync, or open web path.',
    ['Local-only parent review.'],
    ['Product Contract']
  );
}

function buildFitSummary(
  interpretations: ParentSkillInterpretation[]
): Phase2FitSummary {
  const usableInterpretations = interpretations.filter((interpretation) => (
    interpretation.status !== 'Not enough data yet' &&
    interpretation.recommendation !== 'Not enough data'
  ));

  if (usableInterpretations.length === 0) {
    return {
      status: 'Not enough data',
      summary: 'Current fit needs a few more reviewed attempts before the app can describe it.',
      evidence: ['Parent Guidance has not found a stable pattern yet.'],
    };
  }

  const supportSkills = usableInterpretations.filter((interpretation) => (
    interpretation.status === 'Needs more support' ||
    interpretation.recommendation === 'Add support' ||
    interpretation.recommendation === 'Review later'
  ));

  if (supportSkills.length > 0) {
    return {
      status: 'Needs support',
      summary: 'Some current activities may need more support or simplification.',
      evidence: supportSkills.map((interpretation) => (
        `${interpretation.skill_label}: ${interpretation.status_reason}`
      )),
    };
  }

  const readySkills = usableInterpretations.filter((interpretation) => (
    interpretation.status === 'Ready for next challenge' ||
    interpretation.recommendation === 'Promote gently'
  ));

  if (readySkills.length > 0) {
    return {
      status: 'Too easy',
      summary: 'Some current activities may be ready for a gentle challenge.',
      evidence: readySkills.map((interpretation) => (
        `${interpretation.skill_label}: ${interpretation.status_reason}`
      )),
    };
  }

  return {
    status: 'Good fit',
    summary: 'Current activities look like a steady fit for practice.',
    evidence: usableInterpretations.map((interpretation) => (
      `${interpretation.skill_label}: ${interpretation.status_reason}`
    )),
  };
}

function getPrimaryRecommendation(
  interpretations: ParentSkillInterpretation[]
): ParentSkillInterpretation | undefined {
  const actionable = interpretations.filter((interpretation) => (
    interpretation.recommendation !== 'Not enough data'
  ));
  const priority = [
    'Add support',
    'Review later',
    'Promote gently',
    'Keep stable',
  ];

  return [...actionable].sort((a, b) => (
    priority.indexOf(a.recommendation) - priority.indexOf(b.recommendation) ||
    a.skill_label.localeCompare(b.skill_label)
  ))[0];
}

function answered(
  question: string,
  answer: string,
  evidence: string[],
  sourceLabels: string[]
): Phase2ChecklistItem {
  return {
    question,
    state: 'Answered',
    answer,
    evidence,
    source_labels: sourceLabels,
  };
}

function needsMoreData(
  question: string,
  answer: string,
  sourceLabels: string[]
): Phase2ChecklistItem {
  return {
    question,
    state: 'Needs more data',
    answer,
    evidence: [],
    source_labels: sourceLabels,
  };
}

function notApplicableYet(
  question: string,
  answer: string,
  sourceLabels: string[]
): Phase2ChecklistItem {
  return {
    question,
    state: 'Not applicable yet',
    answer,
    evidence: [],
    source_labels: sourceLabels,
  };
}

function formatReadableList(values: string[]): string {
  if (values.length === 0) return 'None yet';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function getUniqueValues(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
