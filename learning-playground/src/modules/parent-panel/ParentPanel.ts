/**
 * Parent Panel — settings and local progress behind parent gate.
 */

import type { StorageServiceInterface } from '../../types/runtime';
import type { ParentSettings } from '../../types/storage';
import type { ParentObservation } from '../../types/observations';
import type {
  ParentDifficultyAction,
  ParentDifficultyActionType,
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../../types/parent-actions';
import type { SkillMasteryState } from '../../types/progress';
import {
  buildParentSessionReview,
  type ParentSessionReview,
  type SkillAccuracySummary,
} from '../../core/session-review';
import { clearEvents, getEvents } from '../../core/event-log';
import {
  buildPhase2ChecklistCoverage,
  type Phase2ChecklistCoverage,
  type Phase2ChecklistItem,
  type Phase2FitSummary,
} from '../../core/phase2-checklist';
import {
  buildParentSkillInterpretations,
  type ParentSkillInterpretation,
} from '../../core/parent-interpretation';
import {
  buildParentNoteHistory,
  type ParentNoteHistoryItem,
} from '../../core/parent-notes-history';
import {
  buildParentDifficultyActionHistory,
  formatParentDifficultyActionLabel,
  type ParentDifficultyActionHistoryItem,
} from '../../core/parent-difficulty-actions';
import {
  buildActiveParentDifficultyOverrideHistory,
  getParentDifficultyOverrideTypeForRecommendation,
  type ParentDifficultyOverrideHistoryItem,
} from '../../core/parent-difficulty-overrides';
import { buildLocalDataHealth } from '../../core/export-data';
import {
  formatParentDataHealth,
  getParentEmptyStateMessage,
  type ParentDataHealthSummary,
} from '../../core/parent-panel-summary';
import {
  formatActivityTitleList,
  formatRecentAttempts,
  formatSkillLabel,
  resolveActivityTitle,
  type ParentRecentAttempt,
} from '../../core/parent-review-format';
import {
  DEFAULT_PARENT_GATE_PHRASE,
  getParentGatePhrase,
} from '../../core/parent-gate';
import { ACTIVITY_TITLE_LOOKUP } from '../../content/activity-title-lookup';

let _container: HTMLElement | null = null;

const PARENT_ACTION_TYPES: ParentDifficultyActionType[] = [
  'use_suggestion',
  'keep_stable',
  'add_support',
  'promote_gently',
  'review_later',
  'ignore_for_now',
];

interface SettingRow {
  label: string;
  value: string;
}

interface ParentPanelContext {
  childId: string;
  sessionId: string;
}

export function renderParentPanel(
  parent: HTMLElement,
  storage: StorageServiceInterface,
  context: ParentPanelContext = {
    childId: 'local-child',
    sessionId: 'local-session',
  }
): void {
  const settings = storage.getSettings();
  const progress = storage.getProgressProfile(context.childId);
  const skillStates = Object.values(progress.skill_mastery)
    .sort((a, b) => a.skill_id.localeCompare(b.skill_id));
  const events = getEvents();
  const observations = storage.getParentObservations();
  const difficultyActions = storage.getParentDifficultyActions();
  const difficultyOverrides = storage.getParentDifficultyOverrides();
  const sessionReview = buildParentSessionReview(
    events,
    observations,
    context.sessionId
  );
  const sessionEvents = events.filter((event) => (
    event.session_id === sessionReview.session_id
  ));
  const recentAttempts = formatRecentAttempts(
    sessionEvents,
    ACTIVITY_TITLE_LOOKUP
  );
  const skillInterpretations = buildParentSkillInterpretations(
    sessionReview,
    sessionEvents
  );
  const localDataHealth = buildLocalDataHealth(
    events,
    observations,
    difficultyActions
  );
  const dataHealthSummary = formatParentDataHealth(
    localDataHealth
  );
  const phase2ChecklistCoverage = buildPhase2ChecklistCoverage(
    {
      review: sessionReview,
      recentAttempts,
      interpretations: skillInterpretations,
      dataHealth: localDataHealth,
      activityTitleLookup: ACTIVITY_TITLE_LOOKUP,
    }
  );

  _container = document.createElement('div');
  _container.className = 'parent-panel';
  _container.id = 'parent-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'parent-panel__header';

  const title = document.createElement('h1');
  title.className = 'parent-panel__title';
  title.textContent = '⚙ Parent Panel';

  const backBtn = document.createElement('button');
  backBtn.className = 'parent-panel__back';
  backBtn.id = 'parent-back-btn';
  backBtn.textContent = '← Back to Playground';
  backBtn.addEventListener('click', () => {
    window.location.hash = '#home';
  });

  header.appendChild(title);
  header.appendChild(backBtn);
  _container.appendChild(header);

  // Child Profile Section
  _container.appendChild(
    createSection('Child Profile', [
      { label: 'Display Name', value: settings.child_display_name },
      { label: 'Difficulty Mode', value: settings.difficulty_mode },
      { label: 'Skills Tracked', value: String(skillStates.length) },
    ])
  );

  _container.appendChild(createParentGateSettingsSection(
    settings,
    storage,
    parent,
    context
  ));
  _container.appendChild(createLocalDataSnapshotSection(dataHealthSummary));
  _container.appendChild(createPhase2ReviewSection(phase2ChecklistCoverage));
  _container.appendChild(createProgressSection(skillStates));
  _container.appendChild(createSessionReviewSection(
    sessionReview,
    recentAttempts,
    storage,
    context,
    parent
  ));
  _container.appendChild(createParentGuidanceSection(
    skillInterpretations,
    difficultyActions,
    difficultyOverrides,
    storage,
    context,
    parent
  ));

  // Session Settings
  _container.appendChild(
    createSection('Session Settings', [
      { label: 'Session Limit', value: `${settings.session_limit_minutes} minutes` },
      { label: 'Max Choices per Screen', value: String(settings.max_activity_choices) },
    ])
  );

  // Audio Settings
  _container.appendChild(
    createSection('Audio Settings', [
      { label: 'Sound Effects', value: settings.sound_enabled ? '✅ On' : '❌ Off' },
      { label: 'Speech Prompts', value: settings.speech_enabled ? '✅ On' : '❌ Off' },
      { label: 'Video Playback', value: settings.video_enabled ? '✅ On' : '❌ Off' },
    ])
  );

  // Enabled Modules
  const modulesSection = createSection('Enabled Learning Domains', []);
  const domainList = document.createElement('div');
  domainList.style.display = 'flex';
  domainList.style.flexWrap = 'wrap';
  domainList.style.gap = '0.5rem';
  domainList.style.marginTop = '0.5rem';

  for (const domain of settings.allowed_domains) {
    const chip = document.createElement('span');
    chip.style.cssText = `
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      background: var(--parent-primary);
      color: #fff;
      font-size: 0.8rem;
      font-weight: 600;
    `;
    chip.textContent = domain;
    domainList.appendChild(chip);
  }

  modulesSection.appendChild(domainList);
  _container.appendChild(modulesSection);

  _container.appendChild(createDataManagementSection(
    dataHealthSummary,
    storage,
    parent,
    context
  ));
  parent.appendChild(_container);
}

function createLocalDataSnapshotSection(
  summary: ParentDataHealthSummary
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section parent-data-snapshot';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Local Data Snapshot';
  section.appendChild(title);

  const status = document.createElement('p');
  status.className = 'parent-data-snapshot__status';
  status.textContent = `${summary.status_label}. ${summary.status_detail}`;
  section.appendChild(status);

  const metrics = document.createElement('div');
  metrics.className = 'parent-data-snapshot__metrics';
  for (const metric of summary.compact_metrics) {
    metrics.appendChild(createProgressMetric(metric.label, metric.value));
  }
  section.appendChild(metrics);

  return section;
}

function createPhase2ReviewSection(
  coverage: Phase2ChecklistCoverage
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Phase 2 Review';
  section.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'parent-phase2-review__summary';
  summary.textContent = `${coverage.answered_count}/${coverage.total_count} checklist answers ready.`;
  section.appendChild(summary);

  section.appendChild(createPhase2FitSummary(coverage.fit_summary));

  const list = document.createElement('div');
  list.className = 'parent-phase2-review';
  for (const item of coverage.items) {
    list.appendChild(createPhase2ReviewItem(item));
  }

  section.appendChild(list);
  return section;
}

function createPhase2FitSummary(fitSummary: Phase2FitSummary): HTMLElement {
  const block = document.createElement('div');
  block.className = 'parent-phase2-fit';
  block.dataset.fit = fitSummary.status;

  const label = document.createElement('span');
  label.className = 'parent-phase2-fit__label';
  label.textContent = 'Current fit';
  block.appendChild(label);

  const status = document.createElement('strong');
  status.className = 'parent-phase2-fit__status';
  status.textContent = fitSummary.status;
  block.appendChild(status);

  const summary = document.createElement('p');
  summary.className = 'parent-phase2-fit__summary';
  summary.textContent = fitSummary.summary;
  block.appendChild(summary);

  if (fitSummary.evidence.length > 0) {
    const evidence = document.createElement('p');
    evidence.className = 'parent-phase2-fit__evidence';
    evidence.textContent = fitSummary.evidence.join(' ');
    block.appendChild(evidence);
  }

  return block;
}

function createPhase2ReviewItem(item: Phase2ChecklistItem): HTMLElement {
  const row = document.createElement('div');
  row.className = 'parent-phase2-review__item';

  const heading = document.createElement('div');
  heading.className = 'parent-phase2-review__heading';

  const question = document.createElement('span');
  question.className = 'parent-phase2-review__question';
  question.textContent = item.question;
  heading.appendChild(question);

  const state = document.createElement('span');
  state.className = 'parent-phase2-review__state';
  state.dataset.state = item.state;
  state.textContent = item.state;
  heading.appendChild(state);
  row.appendChild(heading);

  const answer = document.createElement('p');
  answer.className = 'parent-phase2-review__answer';
  answer.textContent = item.answer;
  row.appendChild(answer);

  if (item.evidence.length > 0) {
    const evidence = document.createElement('p');
    evidence.className = 'parent-phase2-review__evidence';
    evidence.textContent = item.evidence.join(' ');
    row.appendChild(evidence);
  }

  if (item.source_labels.length > 0) {
    const source = document.createElement('p');
    source.className = 'parent-phase2-review__source';
    source.textContent = `Source: ${item.source_labels.join(', ')}`;
    row.appendChild(source);
  }

  return row;
}

function createParentGateSettingsSection(
  settings: ParentSettings,
  storage: StorageServiceInterface,
  parent: HTMLElement,
  context: ParentPanelContext
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section parent-gate-settings';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Parent Gate Settings';
  section.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'parent-gate-settings__summary';
  summary.textContent = 'Local adult friction only. This is not an account login or cloud password.';
  section.appendChild(summary);

  const form = document.createElement('form');
  form.className = 'parent-gate-settings__form';

  const label = document.createElement('label');
  label.className = 'parent-gate-settings__label';
  label.htmlFor = 'parent-gate-phrase-setting';
  label.textContent = 'Gate Phrase';
  form.appendChild(label);

  const input = document.createElement('input');
  input.className = 'parent-gate-settings__input';
  input.id = 'parent-gate-phrase-setting';
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = getParentGatePhrase(settings);
  input.placeholder = DEFAULT_PARENT_GATE_PHRASE;
  form.appendChild(input);

  const note = document.createElement('p');
  note.className = 'parent-gate-settings__note';
  note.textContent = `Blank saves the default phrase: ${DEFAULT_PARENT_GATE_PHRASE}.`;
  form.appendChild(note);

  const actions = document.createElement('div');
  actions.className = 'parent-gate-settings__actions';

  const saveButton = document.createElement('button');
  saveButton.className = 'parent-panel__back';
  saveButton.type = 'submit';
  saveButton.textContent = 'Save Gate Phrase';
  actions.appendChild(saveButton);

  const resetButton = document.createElement('button');
  resetButton.className = 'parent-gate-settings__reset';
  resetButton.type = 'button';
  resetButton.textContent = 'Use Default';
  resetButton.addEventListener('click', () => {
    saveParentGatePhrase(DEFAULT_PARENT_GATE_PHRASE);
  });
  actions.appendChild(resetButton);
  form.appendChild(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveParentGatePhrase(input.value);
  });

  section.appendChild(form);
  return section;

  function saveParentGatePhrase(rawPhrase: string): void {
    const parentGatePhrase = rawPhrase.trim() || DEFAULT_PARENT_GATE_PHRASE;
    storage.saveSettings({
      ...settings,
      parent_gate_phrase: parentGatePhrase,
    });
    destroyParentPanel();
    renderParentPanel(parent, storage, context);
  }
}

function createDataManagementSection(
  dataHealthSummary: ParentDataHealthSummary,
  storage: StorageServiceInterface,
  parent: HTMLElement,
  context: ParentPanelContext
): HTMLElement {
  const dataSection = document.createElement('div');
  dataSection.className = 'parent-section';

  const dataTitle = document.createElement('h2');
  dataTitle.className = 'parent-section__title';
  dataTitle.textContent = 'Data Management';
  dataSection.appendChild(dataTitle);

  dataSection.appendChild(createDataHealthSummary(dataHealthSummary));

  const actions = document.createElement('div');
  actions.className = 'parent-data-actions';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'parent-panel__back';
  exportBtn.id = 'export-data-btn';
  exportBtn.textContent = '📥 Export Progress Data';
  exportBtn.addEventListener('click', () => {
    const data = storage.exportProgressData(getEvents());
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  actions.appendChild(exportBtn);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'parent-panel__back';
  clearBtn.id = 'clear-data-btn';
  clearBtn.style.background = 'var(--parent-danger)';
  clearBtn.textContent = '🗑 Clear Progress Data';
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all progress data? This cannot be undone.')) {
      clearEvents();
      storage.resetProgress();
      storage.clearParentObservations();
      storage.clearParentDifficultyActions();
      storage.clearParentDifficultyOverrides();
      alert('Progress data cleared.');
      destroyParentPanel();
      renderParentPanel(parent, storage, context);
    }
  });
  actions.appendChild(clearBtn);

  dataSection.appendChild(actions);
  return dataSection;
}

function createDataHealthSummary(
  summary: ParentDataHealthSummary
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-data-health';

  const status = document.createElement('div');
  status.className = 'parent-data-health__status';

  const statusLabel = document.createElement('span');
  statusLabel.className = 'parent-data-health__status-label';
  statusLabel.textContent = summary.status_label;
  status.appendChild(statusLabel);

  const statusDetail = document.createElement('span');
  statusDetail.className = 'parent-data-health__status-detail';
  statusDetail.textContent = summary.status_detail;
  status.appendChild(statusDetail);
  wrapper.appendChild(status);

  const metrics = document.createElement('div');
  metrics.className = 'parent-data-health__metrics';
  for (const metric of summary.metrics) {
    metrics.appendChild(createProgressMetric(metric.label, metric.value));
  }
  wrapper.appendChild(metrics);

  return wrapper;
}

function createSessionReviewSection(
  review: ParentSessionReview,
  recentAttempts: ParentRecentAttempt[],
  storage: StorageServiceInterface,
  context: ParentPanelContext,
  parent: HTMLElement
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Session Review';
  section.appendChild(title);

  const summary = document.createElement('div');
  summary.className = 'parent-review-grid';
  summary.appendChild(createReviewMetric(
    'Completed Activities',
    formatList(formatActivityTitleList(review.completed_activities, ACTIVITY_TITLE_LOOKUP))
  ));
  summary.appendChild(createReviewMetric(
    'Skills Touched',
    formatList(review.skills_touched.map(formatSkillLabel))
  ));
  summary.appendChild(createReviewMetric('Hints Used', String(review.hints_used)));
  summary.appendChild(createReviewMetric(
    'Abandoned Activities',
    formatList(formatActivityTitleList(review.abandoned_activities, ACTIVITY_TITLE_LOOKUP))
  ));
  summary.appendChild(createReviewMetric(
    'Most Repeated Activity',
    review.most_repeated_activity
      ? resolveActivityTitle(review.most_repeated_activity, ACTIVITY_TITLE_LOOKUP)
      : 'None'
  ));
  section.appendChild(summary);

  section.appendChild(createSkillAccuracyList(review.accuracy_by_skill));
  section.appendChild(createRecentAttemptsList(recentAttempts));
  section.appendChild(createParentNotesEditor(review, storage, context, parent));

  return section;
}

function createReviewMetric(labelText: string, valueText: string): HTMLElement {
  const metric = document.createElement('div');
  metric.className = 'parent-review-metric';

  const label = document.createElement('span');
  label.className = 'parent-review-metric__label';
  label.textContent = labelText;
  metric.appendChild(label);

  const value = document.createElement('span');
  value.className = 'parent-review-metric__value';
  value.textContent = valueText;
  metric.appendChild(value);

  return metric;
}

function createSkillAccuracyList(
  accuracyBySkill: SkillAccuracySummary[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-review-accuracy';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Accuracy by Skill';
  wrapper.appendChild(title);

  if (accuracyBySkill.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = getParentEmptyStateMessage('accuracy');
    wrapper.appendChild(empty);
    return wrapper;
  }

  for (const summary of accuracyBySkill) {
    const row = document.createElement('div');
    row.className = 'parent-review-accuracy__row';
    row.appendChild(createProgressMetric('Skill', formatSkillLabel(summary.skill_id)));
    row.appendChild(createProgressMetric('Attempts', `${summary.correct_attempts}/${summary.total_attempts}`));
    row.appendChild(createProgressMetric('Accuracy', formatPercent(summary.accuracy)));
    wrapper.appendChild(row);
  }

  return wrapper;
}

function createRecentAttemptsList(
  recentAttempts: ParentRecentAttempt[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-recent-attempts';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Recent Attempts';
  wrapper.appendChild(title);

  if (recentAttempts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = getParentEmptyStateMessage('recent_attempts');
    wrapper.appendChild(empty);
    return wrapper;
  }

  for (const attempt of recentAttempts) {
    const row = document.createElement('div');
    row.className = 'parent-recent-attempts__row';

    const heading = document.createElement('div');
    heading.className = 'parent-recent-attempts__heading';

    const activity = document.createElement('span');
    activity.className = 'parent-recent-attempts__activity';
    activity.textContent = attempt.activity_title;
    heading.appendChild(activity);

    const outcome = document.createElement('span');
    outcome.className = 'parent-recent-attempts__outcome';
    outcome.textContent = attempt.outcome_label;
    heading.appendChild(outcome);
    row.appendChild(heading);

    const details = document.createElement('div');
    details.className = 'parent-recent-attempts__details';
    details.appendChild(createProgressMetric('Skill', formatList(attempt.skill_labels)));
    details.appendChild(createProgressMetric('Prompt', attempt.prompt_text));
    details.appendChild(createProgressMetric('Picked', attempt.selected_answer));
    details.appendChild(createProgressMetric('Correct Answer', attempt.correct_answer));
    details.appendChild(createProgressMetric('Hint', attempt.hint_used ? 'Used' : 'Not used'));
    details.appendChild(createProgressMetric('Response Time', attempt.response_time_label));
    row.appendChild(details);

    wrapper.appendChild(row);
  }

  return wrapper;
}

function createParentGuidanceSection(
  interpretations: ParentSkillInterpretation[],
  actions: ParentDifficultyAction[],
  overrides: ParentDifficultyOverride[],
  storage: StorageServiceInterface,
  context: ParentPanelContext,
  parent: HTMLElement
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Parent Guidance';
  section.appendChild(title);

  if (interpretations.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = getParentEmptyStateMessage('guidance');
    section.appendChild(empty);
    section.appendChild(createActiveParentGuidanceSection(
      overrides,
      (overrideId) => {
        deactivateParentDifficultyOverride(overrideId);
      }
    ));
    section.appendChild(createParentActionHistory(actions));
    return section;
  }

  const list = document.createElement('div');
  list.className = 'parent-guidance-list';

  for (const interpretation of interpretations) {
    list.appendChild(createParentGuidanceRow(
      interpretation,
      (actionType) => {
        storage.saveParentDifficultyAction(createParentDifficultyAction(
          actionType,
          interpretation,
          context
        ));
        destroyParentPanel();
        renderParentPanel(parent, storage, context);
      },
      (overrideType) => {
        const actionType = getParentDifficultyActionTypeForOverride(
          overrideType
        );
        const createdAt = new Date().toISOString();
        storage.saveParentDifficultyAction(createParentDifficultyAction(
          actionType,
          interpretation,
          context,
          createdAt
        ));
        storage.saveParentDifficultyOverride(createParentDifficultyOverride(
          overrideType,
          interpretation,
          context,
          createdAt
        ));
        destroyParentPanel();
        renderParentPanel(parent, storage, context);
      }
    ));
  }

  section.appendChild(list);
  section.appendChild(createActiveParentGuidanceSection(
    overrides,
    (overrideId) => {
      deactivateParentDifficultyOverride(overrideId);
    }
  ));
  section.appendChild(createParentActionHistory(actions));
  return section;

  function deactivateParentDifficultyOverride(overrideId: string): void {
    const override = overrides.find((item) => item.override_id === overrideId);
    if (!override) return;

    storage.saveParentDifficultyOverride({
      ...override,
      active: false,
      deactivated_at: new Date().toISOString(),
    });
    destroyParentPanel();
    renderParentPanel(parent, storage, context);
  }
}

function createParentGuidanceRow(
  interpretation: ParentSkillInterpretation,
  onAction: (actionType: ParentDifficultyActionType) => void,
  onApplyOverride: (overrideType: ParentDifficultyOverrideType) => void
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'parent-guidance-row';

  const header = document.createElement('div');
  header.className = 'parent-guidance-row__header';

  const skill = document.createElement('span');
  skill.className = 'parent-guidance-row__skill';
  skill.textContent = interpretation.skill_label;
  header.appendChild(skill);

  header.appendChild(createGuidanceSignal('Status', interpretation.status));
  row.appendChild(header);

  const nextStep = document.createElement('div');
  nextStep.className = 'parent-guidance-row__next';
  nextStep.appendChild(createGuidanceLabel('Suggested next step'));

  const nextStepText = document.createElement('span');
  nextStepText.className = 'parent-guidance-row__next-value';
  nextStepText.textContent = interpretation.recommendation;
  nextStep.appendChild(nextStepText);
  row.appendChild(nextStep);

  const reason = document.createElement('div');
  reason.className = 'parent-guidance-row__why';
  reason.appendChild(createGuidanceLabel('Reason'));

  const reasonText = document.createElement('p');
  reasonText.className = 'parent-guidance-row__reason';
  reasonText.textContent = `${interpretation.status_reason} ${interpretation.recommendation_reason}`;
  reason.appendChild(reasonText);
  row.appendChild(reason);

  const actions = document.createElement('div');
  actions.className = 'parent-guidance-row__actions';
  actions.appendChild(createGuidanceLabel('Record parent choice'));

  const actionButtons = document.createElement('div');
  actionButtons.className = 'parent-guidance-row__action-buttons';
  for (const actionType of PARENT_ACTION_TYPES) {
    const button = document.createElement('button');
    button.className = 'parent-guidance-action';
    button.type = 'button';
    button.textContent = formatParentDifficultyActionLabel(actionType);
    button.addEventListener('click', () => onAction(actionType));
    actionButtons.appendChild(button);
  }
  actions.appendChild(actionButtons);
  row.appendChild(actions);

  const overrideType = getParentDifficultyOverrideTypeForRecommendation(
    interpretation.recommendation
  );
  if (overrideType) {
    const apply = document.createElement('button');
    apply.className = 'parent-guidance-apply';
    apply.type = 'button';
    apply.textContent = 'Apply as active guidance';
    apply.addEventListener('click', () => onApplyOverride(overrideType));
    row.appendChild(apply);
  }

  const evidenceGroup = document.createElement('div');
  evidenceGroup.className = 'parent-guidance-row__evidence-group';
  evidenceGroup.appendChild(createGuidanceLabel('Evidence'));

  const metrics = document.createElement('div');
  metrics.className = 'parent-guidance-row__evidence';
  metrics.appendChild(createProgressMetric('Accuracy', formatPercent(interpretation.recent_accuracy)));
  metrics.appendChild(createProgressMetric('Attempts', String(interpretation.attempts)));
  metrics.appendChild(createProgressMetric('Hints', String(interpretation.hints_used)));
  metrics.appendChild(createProgressMetric('Stops', String(interpretation.abandoned_count)));

  if (interpretation.repeated_error_pattern) {
    metrics.appendChild(createProgressMetric(
      'Repeated Answer',
      interpretation.repeated_error_pattern
    ));
  }

  evidenceGroup.appendChild(metrics);
  row.appendChild(evidenceGroup);
  return row;
}

function createActiveParentGuidanceSection(
  overrides: ParentDifficultyOverride[],
  onReset: (overrideId: string) => void
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-active-guidance';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Active Parent Guidance';
  wrapper.appendChild(title);

  const history = buildActiveParentDifficultyOverrideHistory(overrides);
  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No active parent guidance has been applied yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('div');
  list.className = 'parent-active-guidance__list';
  for (const override of history) {
    list.appendChild(createActiveParentGuidanceItem(override, onReset));
  }
  wrapper.appendChild(list);

  return wrapper;
}

function createActiveParentGuidanceItem(
  override: ParentDifficultyOverrideHistoryItem,
  onReset: (overrideId: string) => void
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'parent-active-guidance__item';

  const meta = document.createElement('span');
  meta.className = 'parent-active-guidance__meta';
  meta.textContent = `${override.timestamp_label} · ${override.skill_label}`;
  item.appendChild(meta);

  const choice = document.createElement('strong');
  choice.className = 'parent-active-guidance__choice';
  choice.textContent = `Active: ${override.override_label}`;
  item.appendChild(choice);

  const reason = document.createElement('p');
  reason.className = 'parent-active-guidance__reason';
  reason.textContent = `Based on ${override.recommendation_label}. ${override.source_reason}`;
  item.appendChild(reason);

  const resetButton = document.createElement('button');
  resetButton.className = 'parent-guidance-action';
  resetButton.type = 'button';
  resetButton.textContent = 'Reset active guidance';
  resetButton.addEventListener('click', () => onReset(override.override_id));
  item.appendChild(resetButton);

  return item;
}

function createParentActionHistory(
  actions: ParentDifficultyAction[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-action-history';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Recent Parent Actions';
  wrapper.appendChild(title);

  const history = buildParentDifficultyActionHistory(actions);
  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No parent difficulty actions recorded yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('div');
  list.className = 'parent-action-history__list';
  for (const action of history) {
    list.appendChild(createParentActionHistoryItem(action));
  }
  wrapper.appendChild(list);

  return wrapper;
}

function createParentActionHistoryItem(
  action: ParentDifficultyActionHistoryItem
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'parent-action-history__item';

  const meta = document.createElement('span');
  meta.className = 'parent-action-history__meta';
  meta.textContent = `${action.timestamp_label} · ${action.skill_label}`;
  item.appendChild(meta);

  const choice = document.createElement('strong');
  choice.className = 'parent-action-history__choice';
  choice.textContent = `Choice: ${action.action_label}`;
  item.appendChild(choice);

  const reason = document.createElement('p');
  reason.className = 'parent-action-history__reason';
  reason.textContent = `Recommendation was ${action.recommendation_label}. ${action.source_reason}`;
  item.appendChild(reason);

  return item;
}

function createParentDifficultyAction(
  actionType: ParentDifficultyActionType,
  interpretation: ParentSkillInterpretation,
  context: ParentPanelContext,
  createdAt = new Date().toISOString()
): ParentDifficultyAction {
  return {
    action_id: createDifficultyActionId(),
    session_id: context.sessionId,
    child_id: context.childId,
    skill_id: interpretation.skill_id,
    skill_label: interpretation.skill_label,
    action_type: actionType,
    source_recommendation: interpretation.recommendation,
    source_status: interpretation.status,
    source_reason: `${interpretation.status_reason} ${interpretation.recommendation_reason}`,
    created_at: createdAt,
  };
}

function createParentDifficultyOverride(
  overrideType: ParentDifficultyOverrideType,
  interpretation: ParentSkillInterpretation,
  context: ParentPanelContext,
  createdAt: string
): ParentDifficultyOverride {
  return {
    override_id: createDifficultyOverrideId(),
    child_id: context.childId,
    skill_id: interpretation.skill_id,
    skill_label: interpretation.skill_label,
    override_type: overrideType,
    source_recommendation: interpretation.recommendation,
    source_status: interpretation.status,
    source_reason: `${interpretation.status_reason} ${interpretation.recommendation_reason}`,
    active: true,
    created_at: createdAt,
  };
}

function getParentDifficultyActionTypeForOverride(
  overrideType: ParentDifficultyOverrideType
): ParentDifficultyActionType {
  if (overrideType === 'keep_current') return 'keep_stable';
  return overrideType;
}

function createGuidanceSignal(labelText: string, valueText: string): HTMLElement {
  const signal = document.createElement('div');
  signal.className = 'parent-guidance-signal';
  signal.appendChild(createGuidanceLabel(labelText));

  const value = document.createElement('span');
  value.className = 'parent-guidance-signal__value';
  value.textContent = valueText;
  signal.appendChild(value);

  return signal;
}

function createGuidanceLabel(labelText: string): HTMLElement {
  const label = document.createElement('span');
  label.className = 'parent-guidance-signal__label';
  label.textContent = labelText;
  return label;
}

function createParentNotesEditor(
  review: ParentSessionReview,
  storage: StorageServiceInterface,
  context: ParentPanelContext,
  parent: HTMLElement
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-notes';

  const label = document.createElement('label');
  label.className = 'parent-notes__label';
  label.htmlFor = 'parent-session-note';
  label.textContent = 'Parent Notes';
  wrapper.appendChild(label);

  const noteHistory = buildParentNoteHistory(review.parent_notes);
  if (noteHistory.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-notes__empty';
    empty.textContent = getParentEmptyStateMessage('parent_notes');
    wrapper.appendChild(empty);
  } else {
    wrapper.appendChild(createParentNotesHistory(noteHistory));
  }

  const textarea = document.createElement('textarea');
  textarea.className = 'parent-notes__textarea';
  textarea.id = 'parent-session-note';
  textarea.rows = 3;
  textarea.placeholder = 'Add a new parent note for this session.';
  wrapper.appendChild(textarea);

  const saveButton = document.createElement('button');
  saveButton.className = 'parent-panel__back';
  saveButton.type = 'button';
  saveButton.textContent = 'Save Notes';
  saveButton.addEventListener('click', () => {
    const note = textarea.value.trim();
    if (!note) return;

    const nowIso = new Date().toISOString();
    const observation: ParentObservation = {
      observation_id: createObservationId(),
      session_id: review.session_id,
      child_id: context.childId,
      note,
      created_at: nowIso,
    };

    storage.saveParentObservation(observation);
    destroyParentPanel();
    renderParentPanel(parent, storage, context);
  });
  wrapper.appendChild(saveButton);

  return wrapper;
}

function createParentNotesHistory(
  notes: ParentNoteHistoryItem[]
): HTMLElement {
  const list = document.createElement('div');
  list.className = 'parent-notes__history';

  for (const note of notes) {
    const item = document.createElement('div');
    item.className = 'parent-notes__item';

    const meta = document.createElement('span');
    meta.className = 'parent-notes__meta';
    meta.textContent = note.timestamp_label;
    item.appendChild(meta);

    const text = document.createElement('p');
    text.className = 'parent-notes__note';
    text.textContent = note.note;
    item.appendChild(text);

    list.appendChild(item);
  }

  return list;
}

function createProgressSection(skillStates: SkillMasteryState[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Progress Summary';
  section.appendChild(title);

  if (skillStates.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = getParentEmptyStateMessage('progress');
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'parent-progress-list';

  for (const state of skillStates) {
    list.appendChild(createProgressRow(state));
  }

  section.appendChild(list);
  return section;
}

function createProgressRow(state: SkillMasteryState): HTMLElement {
  const row = document.createElement('div');
  row.className = 'parent-progress-row';

  const skill = document.createElement('div');
  skill.className = 'parent-progress-row__skill';
  skill.textContent = formatSkillLabel(state.skill_id);
  row.appendChild(skill);

  row.appendChild(createProgressMetric('Level', String(state.current_level)));
  row.appendChild(createProgressMetric('Attempts', `${state.correct_attempts}/${state.total_attempts}`));
  row.appendChild(createProgressMetric('Accuracy', formatPercent(state.recent_accuracy)));
  row.appendChild(createProgressMetric('Confidence', formatPercent(state.confidence)));
  row.appendChild(createProgressMetric('Review', state.needs_review ? 'Yes' : 'No'));

  return row;
}

function createProgressMetric(labelText: string, valueText: string): HTMLElement {
  const metric = document.createElement('div');
  metric.className = 'parent-progress-metric';

  const label = document.createElement('span');
  label.className = 'parent-progress-metric__label';
  label.textContent = labelText;
  metric.appendChild(label);

  const value = document.createElement('span');
  value.className = 'parent-progress-metric__value';
  value.textContent = valueText;
  metric.appendChild(value);

  return metric;
}

function createSection(titleText: string, rows: SettingRow[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = titleText;
  section.appendChild(title);

  for (const row of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'parent-setting-row';

    const label = document.createElement('span');
    label.className = 'parent-setting-row__label';
    label.textContent = row.label;

    const value = document.createElement('span');
    value.className = 'parent-setting-row__value';
    value.textContent = row.value;

    rowEl.appendChild(label);
    rowEl.appendChild(value);
    section.appendChild(rowEl);
  }

  return section;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'None';
}

function createObservationId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `observation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDifficultyActionId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `difficulty-action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDifficultyOverrideId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `difficulty-override-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function destroyParentPanel(): void {
  if (_container) {
    _container.remove();
    _container = null;
  }
}
