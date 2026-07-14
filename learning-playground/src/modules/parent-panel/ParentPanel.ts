/**
 * Parent Panel — settings and local progress behind parent gate.
 */

import type { StorageServiceInterface, SpeechServiceInterface } from '../../types/runtime';
import type { ParentSettings } from '../../types/storage';
import type {
  ParentObservation,
  ParentObservationCategory,
} from '../../types/observations';
import type {
  ParentDifficultyAction,
  ParentDifficultyActionType,
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from '../../types/parent-actions';
import type {
  ParentTransferDecision,
  ParentTransferDecisionType,
} from '../../types/transfer';
import type {
  ParentActivityBriefDecision,
  ParentActivityBriefDecisionType,
} from '../../types/activity-briefs';
import type {
  ParentMasterySnapshot,
  ParentReviewScheduleRecord,
} from '../../types/mastery-records';
import type { SkillMasteryState } from '../../types/progress';
import { SpeechService, listSpeechVoices } from '../../core/speech';
import {
  VoicePackSpeech,
  VOICE_PACK_URI_PREFIX,
  DEVICE_VOICE_URI,
} from '../../core/voice-pack';
import type { VoiceManifest } from '../../core/voice-lines';
import emmaVoiceManifest from '../../content/voice/emma-voice-manifest.json';
import taraVoiceManifest from '../../content/voice/tara-voice-manifest.json';
import dadVoiceManifest from '../../content/voice/dad-voice-manifest.json';
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
import { buildRecentStories } from '../../core/story-history';
import { FIRST_STORY_PACK } from '../story-stage/first-tale';
import {
  isParentObservationCategory,
  PARENT_OBSERVATION_CATEGORIES,
} from '../../core/parent-observation-signals';
import {
  buildParentDifficultyActionHistory,
  formatParentDifficultyActionLabel,
  type ParentDifficultyActionHistoryItem,
} from '../../core/parent-difficulty-actions';
import {
  buildParentAppliedFitReviews,
  type ParentAppliedFitReview,
} from '../../core/parent-applied-fit-review';
import {
  buildActiveParentDifficultyOverrideHistory,
  getParentDifficultyOverrideTypeForRecommendation,
  type ParentDifficultyOverrideHistoryItem,
} from '../../core/parent-difficulty-overrides';
import {
  buildActivityBriefDesignQueue,
  type ActivityBriefDesignQueueItem,
} from '../../core/activity-brief-design-queue';
import { buildLocalDataHealth } from '../../core/export-data';
import { scheduleReview } from '../../core/review-scheduler';
import {
  formatTransferContextType,
  formatTransferStrength,
  type ActivityVariantBrief,
} from '../../core/content-gap-engine';
import {
  formatParentDataHealth,
  getParentEmptyStateMessage,
  type ParentDataHealthSummary,
} from '../../core/parent-panel-summary';
import { loadCurriculumGraph } from '../../core/curriculum-graph';
import type { DifficultyCoverageLevel } from '../../core/difficulty-coverage';
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

const BEAR_CAFE_FIRST_ACTIVITY_ID = 'kennedis-orders-banana-001';
const BEAR_CAFE_ROUTE = `#activity/${BEAR_CAFE_FIRST_ACTIVITY_ID}`;
const VIDEO_VAULT_ACTIVITY_ID = 'video-vault';
const VIDEO_VAULT_ROUTE = `#activity/${VIDEO_VAULT_ACTIVITY_ID}`;
const STORY_STAGE_ROUTE = '#story-stage';
const CURRICULUM_GRAPH = loadCurriculumGraph();

interface SettingRow {
  label: string;
  value: string;
}

interface ParentPanelContext {
  childId: string;
  sessionId: string;
  speech?: SpeechServiceInterface;
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
  const transferDecisions = storage.getParentTransferDecisions();
  const activityBriefDecisions = storage.getParentActivityBriefDecisions();
  const existingMasterySnapshots = storage.getParentMasterySnapshots();
  const existingReviewScheduleRecords = storage.getParentReviewScheduleRecords();
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
    sessionEvents,
    { skill_states: progress.skill_mastery }
  );
  syncParentMasteryRecords(
    storage,
    context,
    skillInterpretations,
    existingMasterySnapshots,
    existingReviewScheduleRecords
  );
  const masterySnapshots = storage.getParentMasterySnapshots();
  const reviewScheduleRecords = storage.getParentReviewScheduleRecords();
  const appliedFitReviews = buildParentAppliedFitReviews(
    events,
    difficultyOverrides,
    ACTIVITY_TITLE_LOOKUP
  );
  const localDataHealth = buildLocalDataHealth(
    events,
    observations,
    difficultyActions,
    transferDecisions,
    activityBriefDecisions,
    masterySnapshots,
    reviewScheduleRecords
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

  _container.appendChild(createParentGameLaunchSection(settings));
  _container.appendChild(createStoryModeSection(
    settings,
    storage,
    parent,
    context
  ));
  _container.appendChild(createRecentStoriesSection(storage));
  _container.appendChild(createParentGateSettingsSection(
    settings,
    storage,
    parent,
    context
  ));
  _container.appendChild(createVoiceSettingsSection(
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
    transferDecisions,
    activityBriefDecisions,
    masterySnapshots,
    reviewScheduleRecords,
    appliedFitReviews,
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

function createParentGameLaunchSection(settings: ParentSettings): HTMLElement {
  const videoEnabled = settings.video_enabled;
  const section = document.createElement('div');
  section.className = 'parent-section parent-game-launch';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Parent-Started Games';
  section.appendChild(title);

  section.appendChild(createParentGameLaunchCard({
    title: 'Bear Cafe',
    status: 'Kennedi\'s Orders',
    metrics: [
      { label: 'Entry', value: 'Banana Order' },
      { label: 'Home Grid', value: 'Hidden' },
    ],
    buttonLabel: 'Start Bear Cafe',
    activityId: BEAR_CAFE_FIRST_ACTIVITY_ID,
    route: BEAR_CAFE_ROUTE,
  }));
  section.appendChild(createParentGameLaunchCard({
    title: 'Video Observation',
    status: 'Bear Bakes Bread + separate question',
    metrics: [
      { label: 'Entry', value: 'Local Video Vault' },
      { label: 'Evidence', value: 'Exposure + response' },
      { label: 'Playback', value: videoEnabled ? 'Enabled' : 'Off' },
    ],
    buttonLabel: 'Start Video Observation',
    activityId: VIDEO_VAULT_ACTIVITY_ID,
    route: VIDEO_VAULT_ROUTE,
    disabled: !videoEnabled,
  }));
  const storyModeLabel =
    settings.story_mode === 'together' ? 'Tell It Together' : 'Tell Me a Story';
  section.appendChild(createParentGameLaunchCard({
    title: 'Story Stage',
    status: `${storyModeLabel} — Pick Three story builder`,
    metrics: [
      { label: 'Entry', value: 'Pick Three setup' },
      { label: 'Mode', value: storyModeLabel },
      { label: 'Evidence', value: 'None (creative play)' },
    ],
    buttonLabel: 'Start Story Stage',
    activityId: 'story-stage',
    route: STORY_STAGE_ROUTE,
  }));

  return section;
}

function createParentGameLaunchCard(config: {
  title: string;
  status: string;
  metrics: SettingRow[];
  buttonLabel: string;
  activityId: string;
  route: string;
  disabled?: boolean;
}): HTMLElement {
  const card = document.createElement('div');
  card.className = 'parent-game-launch__card';

  const details = document.createElement('div');
  details.className = 'parent-game-launch__details';

  const gameTitle = document.createElement('h3');
  gameTitle.className = 'parent-game-launch__title';
  gameTitle.textContent = config.title;
  details.appendChild(gameTitle);

  const status = document.createElement('p');
  status.className = 'parent-game-launch__status';
  status.textContent = config.status;
  details.appendChild(status);

  const meta = document.createElement('div');
  meta.className = 'parent-game-launch__meta';
  for (const metric of config.metrics) {
    meta.appendChild(createProgressMetric(metric.label, metric.value));
  }
  details.appendChild(meta);

  const launchButton = document.createElement('button');
  launchButton.className = 'parent-panel__back parent-game-launch__button';
  launchButton.type = 'button';
  launchButton.textContent = config.buttonLabel;
  launchButton.setAttribute('aria-label', config.buttonLabel);
  launchButton.dataset.activityId = config.activityId;
  launchButton.disabled = config.disabled ?? false;
  launchButton.addEventListener('click', () => {
    window.location.hash = config.route;
  });

  card.appendChild(details);
  card.appendChild(launchButton);
  return card;
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

/**
 * Recent Stories (spec §21): simple, parent-readable, non-evaluative —
 * which story, which mode, completed or left early, when. No trait
 * inference from the child's choices, ever.
 */
function createRecentStoriesSection(
  storage: StorageServiceInterface
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section parent-recent-stories';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Recent Stories';
  section.appendChild(title);

  const items = buildRecentStories(storage.getStoryHistory(), FIRST_STORY_PACK);
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-recent-stories__empty';
    empty.textContent = 'No stories yet — Story Stage sessions will show up here.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'parent-recent-stories__list';
  for (const item of items) {
    const row = document.createElement('li');
    row.className = 'parent-recent-stories__item';

    const line = document.createElement('p');
    line.className = 'parent-recent-stories__title';
    line.textContent = `${item.title} — ${item.problemLabel}`;
    row.appendChild(line);

    const meta = document.createElement('p');
    meta.className = 'parent-recent-stories__meta';
    meta.textContent = `${item.modeLabel} · ${item.statusLabel} · ${item.startedOn}`;
    row.appendChild(meta);
    list.appendChild(row);
  }
  section.appendChild(list);

  return section;
}

/**
 * Story Stage narration ownership (spec: the child never chooses modes).
 * Living inside the parent panel keeps the choice parent-gated by
 * location — there is deliberately no per-scene gating in the story.
 */
function createStoryModeSection(
  settings: ParentSettings,
  storage: StorageServiceInterface,
  parent: HTMLElement,
  context: ParentPanelContext
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section parent-story-mode';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Story Stage Mode';
  section.appendChild(title);

  const explanation = document.createElement('p');
  explanation.className = 'parent-story-mode__explanation';
  explanation.textContent =
    'Tell Me a Story narrates every scene. Tell It Together stays quiet and shows you storyteller cues instead — you tell the story, and a Play control can read the written line if you get stuck.';
  section.appendChild(explanation);

  const options = document.createElement('div');
  options.className = 'parent-story-mode__options';
  const modes: Array<{ value: ParentSettings['story_mode']; label: string }> = [
    { value: 'narrated', label: 'Tell Me a Story' },
    { value: 'together', label: 'Tell It Together' },
  ];
  for (const mode of modes) {
    const active = settings.story_mode === mode.value;
    const button = document.createElement('button');
    button.className = active
      ? 'parent-story-mode__option parent-story-mode__option--active'
      : 'parent-story-mode__option';
    button.type = 'button';
    button.textContent = mode.label;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.addEventListener('click', () => {
      if (settings.story_mode === mode.value) return;
      storage.saveSettings({
        ...settings,
        story_mode: mode.value,
      });
      destroyParentPanel();
      renderParentPanel(parent, storage, context);
    });
    options.appendChild(button);
  }
  section.appendChild(options);

  return section;
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

function createVoiceSettingsSection(
  settings: ParentSettings,
  storage: StorageServiceInterface,
  parent: HTMLElement,
  context: ParentPanelContext
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'parent-section parent-voice-settings';

  const title = document.createElement('h2');
  title.className = 'parent-section__title';
  title.textContent = 'Voice';
  section.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'parent-voice-settings__summary';
  summary.textContent =
    'Choose the spoken-prompt voice. Local device voice only — no cloud, no recording.';
  section.appendChild(summary);

  const voices = listSpeechVoices();

  const form = document.createElement('form');
  form.className = 'parent-voice-settings__form';

  const label = document.createElement('label');
  label.className = 'parent-voice-settings__label';
  label.htmlFor = 'parent-voice-setting';
  label.textContent = 'Prompt Voice';
  form.appendChild(label);

  const select = document.createElement('select');
  select.className = 'parent-voice-settings__select';
  select.id = 'parent-voice-setting';

  const taraOption = document.createElement('option');
  taraOption.value = `${VOICE_PACK_URI_PREFIX}tara`;
  taraOption.textContent = 'Tara — storyteller (recorded, default)';
  if (
    !settings.speech_voice_uri ||
    settings.speech_voice_uri === `${VOICE_PACK_URI_PREFIX}tara`
  ) {
    taraOption.selected = true;
  }
  select.appendChild(taraOption);

  const dadOption = document.createElement('option');
  dadOption.value = `${VOICE_PACK_URI_PREFIX}dad`;
  dadOption.textContent = 'Dad — recorded at home';
  if (settings.speech_voice_uri === `${VOICE_PACK_URI_PREFIX}dad`) {
    dadOption.selected = true;
  }
  select.appendChild(dadOption);

  const emmaOption = document.createElement('option');
  emmaOption.value = `${VOICE_PACK_URI_PREFIX}emma`;
  emmaOption.textContent = 'Emma — storyteller (recorded)';
  if (settings.speech_voice_uri === `${VOICE_PACK_URI_PREFIX}emma`) {
    emmaOption.selected = true;
  }
  select.appendChild(emmaOption);

  const defaultOption = document.createElement('option');
  defaultOption.value = DEVICE_VOICE_URI;
  defaultOption.textContent = 'Device default';
  if (settings.speech_voice_uri === DEVICE_VOICE_URI) defaultOption.selected = true;
  select.appendChild(defaultOption);

  for (const voice of voices) {
    const option = document.createElement('option');
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (settings.speech_voice_uri === voice.voiceURI) option.selected = true;
    select.appendChild(option);
  }
  form.appendChild(select);

  const note = document.createElement('p');
  note.className = 'parent-voice-settings__note';
  note.textContent = voices.length > 0
    ? 'Preview with Test, then Save to use it for prompts. Speech must be On.'
    : 'Voice options load on your device; the device default is used until then.';
  form.appendChild(note);

  // Some browsers load Web Speech voices asynchronously; repopulate the picker
  // once they arrive so the parent isn't stuck seeing only "Device default".
  if (voices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
    const synth = window.speechSynthesis;
    const onVoicesChanged = (): void => {
      const loaded = listSpeechVoices();
      if (loaded.length === 0) return;
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      for (const voice of loaded) {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (settings.speech_voice_uri === voice.voiceURI) option.selected = true;
        select.appendChild(option);
      }
      note.textContent =
        'Preview with Test, then Save to use it for prompts. Speech must be On.';
    };
    synth.addEventListener('voiceschanged', onVoicesChanged);
  }

  const actions = document.createElement('div');
  actions.className = 'parent-voice-settings__actions';

  const testButton = document.createElement('button');
  testButton.className = 'parent-voice-settings__test';
  testButton.type = 'button';
  testButton.textContent = '🔊 Test voice';
  testButton.addEventListener('click', () => {
    // Preview honors the parent speech toggle (silent when speech is off) and
    // routes through the pack so the Emma option previews the real recording.
    const preview = new VoicePackSpeech(new SpeechService(settings.speech_enabled), [
      taraVoiceManifest as unknown as VoiceManifest,
      emmaVoiceManifest as unknown as VoiceManifest,
      dadVoiceManifest as unknown as VoiceManifest,
    ]);
    preview.setVoiceURI(select.value || undefined);
    preview.speak('Hi! Let us play and learn.');
  });
  actions.appendChild(testButton);

  const saveButton = document.createElement('button');
  saveButton.className = 'parent-panel__back';
  saveButton.type = 'submit';
  saveButton.textContent = 'Save Voice';
  actions.appendChild(saveButton);

  form.appendChild(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const voiceURI = select.value || undefined;
    storage.saveSettings({
      ...settings,
      speech_voice_uri: voiceURI,
    });
    // Apply to the live speech service so child prompts use the new voice
    // immediately, not only after a page reload.
    context.speech?.setVoiceURI?.(voiceURI);
    destroyParentPanel();
    renderParentPanel(parent, storage, context);
  });

  section.appendChild(form);
  return section;
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
      storage.clearParentTransferDecisions();
      storage.clearParentActivityBriefDecisions();
      storage.clearParentMasterySnapshots();
      storage.clearParentReviewScheduleRecords();
      storage.clearStoryHistory();
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
    formatList(review.completed_activity_refs
      ? review.completed_activity_refs.map((activity) => (
          resolveActivityTitle(
            activity.activity_id,
            ACTIVITY_TITLE_LOOKUP,
            activity.activity_version
          )
        ))
      : formatActivityTitleList(review.completed_activities, ACTIVITY_TITLE_LOOKUP))
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
    review.most_repeated_activity_ref
      ? resolveActivityTitle(
          review.most_repeated_activity_ref.activity_id,
          ACTIVITY_TITLE_LOOKUP,
          review.most_repeated_activity_ref.activity_version
        )
      : review.most_repeated_activity
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
    if (attempt.parent_guidance_label) {
      details.appendChild(createProgressMetric(
        'Parent Guidance',
        attempt.parent_guidance_label
      ));
    }
    row.appendChild(details);

    wrapper.appendChild(row);
  }

  return wrapper;
}

function createParentGuidanceSection(
  interpretations: ParentSkillInterpretation[],
  actions: ParentDifficultyAction[],
  overrides: ParentDifficultyOverride[],
  transferDecisions: ParentTransferDecision[],
  activityBriefDecisions: ParentActivityBriefDecision[],
  masterySnapshots: ParentMasterySnapshot[],
  reviewScheduleRecords: ParentReviewScheduleRecord[],
  appliedFitReviews: ParentAppliedFitReview[],
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
    section.appendChild(createAppliedFitReviewSection(appliedFitReviews));
    section.appendChild(createParentActionHistory(actions));
    section.appendChild(createParentTransferDecisionHistory(transferDecisions));
    section.appendChild(createParentActivityBriefDesignQueueSection(
      activityBriefDecisions
    ));
    section.appendChild(createParentActivityBriefDecisionHistory(
      activityBriefDecisions
    ));
    section.appendChild(createParentMasterySnapshotHistory(masterySnapshots));
    section.appendChild(createParentReviewScheduleHistory(reviewScheduleRecords));
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
      },
      (decisionType, transferActivityId) => {
        storage.saveParentTransferDecision(createParentTransferDecision(
          decisionType,
          interpretation,
          context
        ));

        if (transferActivityId && decisionType === 'approve_transfer_activity') {
          window.location.hash = `#activity/${transferActivityId}`;
          return;
        }

        destroyParentPanel();
        renderParentPanel(parent, storage, context);
      },
      (decisionType) => {
        storage.saveParentActivityBriefDecision(createParentActivityBriefDecision(
          decisionType,
          interpretation,
          context
        ));
        destroyParentPanel();
        renderParentPanel(parent, storage, context);
      },
      getLatestBriefDecisionForInterpretation(
        interpretation,
        activityBriefDecisions
      )
    ));
  }

  section.appendChild(list);
  section.appendChild(createActiveParentGuidanceSection(
    overrides,
    (overrideId) => {
      deactivateParentDifficultyOverride(overrideId);
    }
  ));
  section.appendChild(createAppliedFitReviewSection(appliedFitReviews));
  section.appendChild(createParentActionHistory(actions));
  section.appendChild(createParentTransferDecisionHistory(transferDecisions));
  section.appendChild(createParentActivityBriefDesignQueueSection(
    activityBriefDecisions
  ));
  section.appendChild(createParentActivityBriefDecisionHistory(
    activityBriefDecisions
  ));
  section.appendChild(createParentMasterySnapshotHistory(masterySnapshots));
  section.appendChild(createParentReviewScheduleHistory(reviewScheduleRecords));
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
  onApplyOverride: (overrideType: ParentDifficultyOverrideType) => void,
  onTransferDecision: (
    decisionType: ParentTransferDecisionType,
    transferActivityId?: string
  ) => void,
  onBriefDecision: (decisionType: ParentActivityBriefDecisionType) => void,
  latestBriefDecision?: ParentActivityBriefDecision
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

  if (interpretation.mastery_status) {
    row.appendChild(createMasteryEvidenceGroup(interpretation));
  }

  if (interpretation.difficulty_coverage) {
    row.appendChild(createDifficultyCoverageGroup(interpretation));
  }

  if (interpretation.transfer_coverage_status) {
    row.appendChild(createTransferCoverageGroup(
      interpretation,
      onTransferDecision,
      onBriefDecision,
      latestBriefDecision
    ));
  }

  return row;
}

function createDifficultyCoverageGroup(
  interpretation: ParentSkillInterpretation
): HTMLElement {
  const coverage = interpretation.difficulty_coverage;
  const evidenceGroup = document.createElement('div');
  evidenceGroup.className = 'parent-guidance-row__evidence-group';
  evidenceGroup.appendChild(createGuidanceLabel('Difficulty Coverage'));

  if (!coverage) return evidenceGroup;

  const metrics = document.createElement('div');
  metrics.className = 'parent-guidance-row__evidence';
  metrics.appendChild(createProgressMetric(
    'Coverage Status',
    coverage.status === 'covered' ? 'Current rung covered' : 'Blocked by content gap'
  ));
  metrics.appendChild(createProgressMetric(
    'Current Rung',
    coverage.current_level_label
  ));
  metrics.appendChild(createProgressMetric(
    'Difficulty Band',
    `${coverage.current_min_difficulty_level}-${coverage.current_max_difficulty_level}`
  ));
  metrics.appendChild(createProgressMetric(
    'Approved Activities',
    String(coverage.approved_activity_ids.length)
  ));
  metrics.appendChild(createProgressMetric(
    'Playable Rungs',
    `${coverage.covered_level_count}/${coverage.total_level_count}`
  ));
  metrics.appendChild(createProgressMetric(
    'Missing Rungs',
    formatMissingDifficultyLevels(coverage.missing_levels)
  ));
  metrics.appendChild(createProgressMetric('Coverage Note', coverage.reason));

  evidenceGroup.appendChild(metrics);
  return evidenceGroup;
}

function createMasteryEvidenceGroup(
  interpretation: ParentSkillInterpretation
): HTMLElement {
  const evidenceGroup = document.createElement('div');
  evidenceGroup.className = 'parent-guidance-row__evidence-group';
  evidenceGroup.appendChild(createGuidanceLabel('Skill Graph Evidence'));

  const metrics = document.createElement('div');
  metrics.className = 'parent-guidance-row__evidence';
  metrics.appendChild(createProgressMetric(
    'Current Status',
    formatInternalMasteryLabel(interpretation.mastery_status ?? 'not_started')
  ));
  metrics.appendChild(createProgressMetric(
    'Next Action',
    formatInternalMasteryLabel(
      interpretation.mastery_recommended_action ?? 'practice'
    )
  ));
  metrics.appendChild(createProgressMetric(
    'Confidence',
    formatPercent(interpretation.mastery_confidence ?? 0)
  ));
  metrics.appendChild(createProgressMetric(
    'Evidence',
    interpretation.mastery_evidence_summary ?? 'No evidence yet'
  ));
  metrics.appendChild(createProgressMetric(
    'Graph Rule',
    interpretation.skill_graph_rule ?? 'No graph rule'
  ));
  metrics.appendChild(createProgressMetric(
    'Source Refs',
    formatSourceRefs(
      interpretation.mastery_source_event_ids ?? [],
      interpretation.mastery_source_observation_ids ?? []
    )
  ));

  evidenceGroup.appendChild(metrics);
  return evidenceGroup;
}

function createTransferCoverageGroup(
  interpretation: ParentSkillInterpretation,
  onTransferDecision: (
    decisionType: ParentTransferDecisionType,
    transferActivityId?: string
  ) => void,
  onBriefDecision: (decisionType: ParentActivityBriefDecisionType) => void,
  latestBriefDecision?: ParentActivityBriefDecision
): HTMLElement {
  const evidenceGroup = document.createElement('div');
  evidenceGroup.className = 'parent-guidance-row__evidence-group';
  evidenceGroup.appendChild(createGuidanceLabel('Transfer Coverage'));

  const metrics = document.createElement('div');
  metrics.className = 'parent-guidance-row__evidence';
  metrics.appendChild(createProgressMetric(
    'Transfer Status',
    formatInternalMasteryLabel(
      interpretation.transfer_coverage_status ?? 'needs_more_content'
    )
  ));
  metrics.appendChild(createProgressMetric(
    'Successful Contexts',
    `${interpretation.transfer_successful_context_count ?? 0}/${interpretation.transfer_required_context_count ?? 0}`
  ));
  metrics.appendChild(createProgressMetric(
    'Approved Contexts',
    `${interpretation.transfer_approved_context_count ?? 0}/${interpretation.transfer_required_context_count ?? 0}`
  ));
  metrics.appendChild(createProgressMetric(
    'Missing Contexts',
    formatTransferContextList(interpretation.transfer_missing_context_types ?? [])
  ));
  metrics.appendChild(createProgressMetric(
    'Transfer Quality',
    formatTransferQuality(
      interpretation.transfer_successful_strengths ?? [],
      interpretation.transfer_strongest_context_strength
    )
  ));
  metrics.appendChild(createProgressMetric(
    'Missing Strengths',
    formatTransferStrengthList(interpretation.transfer_missing_strengths ?? [])
  ));
  if (interpretation.transfer_content_recommendation) {
    metrics.appendChild(createProgressMetric(
      'Suggested Template',
      interpretation.transfer_content_recommendation.suggested_activity_template
    ));
    metrics.appendChild(createProgressMetric(
      'Suggested Strength',
      formatTransferStrength(
        interpretation.transfer_content_recommendation.missing_context_strength
      )
    ));
  }
  if (interpretation.transfer_activity_recommendation) {
    metrics.appendChild(createProgressMetric(
      'Suggested Activity',
      interpretation.transfer_activity_recommendation.activity_title
    ));
    metrics.appendChild(createProgressMetric(
      'Transfer Context',
      formatInternalMasteryLabel(
        interpretation.transfer_activity_recommendation.context_type
      )
    ));
  }
  evidenceGroup.appendChild(metrics);

  const activityVariantBrief =
    interpretation.transfer_content_recommendation?.activity_variant_brief;
  if (activityVariantBrief) {
    evidenceGroup.appendChild(createActivityVariantBriefGroup(
      activityVariantBrief,
      onBriefDecision,
      latestBriefDecision
    ));
  }

  if (
    interpretation.transfer_content_recommendation ||
    interpretation.transfer_activity_recommendation
  ) {
    const controls = document.createElement('div');
    controls.className = 'parent-guidance-row__actions';
    controls.appendChild(createGuidanceLabel('Transfer decision'));

    const buttons = document.createElement('div');
    buttons.className = 'parent-guidance-row__action-buttons';

    const approveButton = document.createElement('button');
    approveButton.className = 'parent-guidance-action';
    approveButton.type = 'button';
    approveButton.textContent = interpretation.transfer_activity_recommendation
      ? 'Start transfer activity'
      : 'Approve transfer plan';
    approveButton.addEventListener('click', () => {
      onTransferDecision(
        'approve_transfer_activity',
        interpretation.transfer_activity_recommendation?.activity_id
      );
    });
    buttons.appendChild(approveButton);

    const holdButton = document.createElement('button');
    holdButton.className = 'parent-guidance-action';
    holdButton.type = 'button';
    holdButton.textContent = interpretation.transfer_activity_recommendation
      ? 'Hold transfer activity'
      : 'Hold transfer plan';
    holdButton.addEventListener('click', () => {
      onTransferDecision('hold_transfer_activity');
    });
    buttons.appendChild(holdButton);

    controls.appendChild(buttons);
    evidenceGroup.appendChild(controls);
  }

  return evidenceGroup;
}

function createActivityVariantBriefGroup(
  brief: ActivityVariantBrief,
  onBriefDecision: (decisionType: ParentActivityBriefDecisionType) => void,
  latestBriefDecision?: ParentActivityBriefDecision
): HTMLElement {
  const briefGroup = document.createElement('div');
  briefGroup.className = 'parent-guidance-row__actions';
  briefGroup.appendChild(createGuidanceLabel('Activity brief'));

  const metrics = document.createElement('div');
  metrics.className = 'parent-guidance-row__evidence';
  metrics.appendChild(createProgressMetric(
    'Recommended Brief',
    brief.suggested_activity_pattern
  ));
  metrics.appendChild(createProgressMetric(
    'Required Context',
    formatTransferContextType(brief.required_context_type)
  ));
  metrics.appendChild(createProgressMetric(
    'Required Strength',
    formatTransferStrength(brief.required_strength)
  ));
  metrics.appendChild(createProgressMetric(
    'Game Family',
    formatInternalMasteryLabel(brief.suggested_game_family)
  ));
  metrics.appendChild(createProgressMetric(
    'Required Evidence',
    formatRequiredBriefEvidence(brief)
  ));
  metrics.appendChild(createProgressMetric(
    'Brief Decision',
    latestBriefDecision
      ? formatBriefDecisionLabel(latestBriefDecision.decision_type)
      : 'No decision yet'
  ));
  metrics.appendChild(createProgressMetric('Why', brief.reason));
  briefGroup.appendChild(metrics);

  const controls = document.createElement('div');
  controls.className = 'parent-guidance-row__action-buttons';
  const choices: Array<{
    decisionType: ParentActivityBriefDecisionType;
    label: string;
  }> = [
    { decisionType: 'approve_brief', label: 'Approve brief' },
    { decisionType: 'hold_brief', label: 'Hold brief' },
    { decisionType: 'archive_brief', label: 'Archive brief' },
  ];

  for (const choice of choices) {
    const button = document.createElement('button');
    button.className = 'parent-guidance-action';
    button.type = 'button';
    button.textContent = choice.label;
    button.addEventListener('click', () => {
      onBriefDecision(choice.decisionType);
    });
    controls.appendChild(button);
  }

  briefGroup.appendChild(controls);
  return briefGroup;
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

function createAppliedFitReviewSection(
  reviews: ParentAppliedFitReview[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-applied-fit';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Applied Guidance Review';
  wrapper.appendChild(title);

  if (reviews.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No active guidance is ready for review yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('div');
  list.className = 'parent-applied-fit__list';
  for (const review of reviews) {
    list.appendChild(createAppliedFitReviewItem(review));
  }
  wrapper.appendChild(list);

  return wrapper;
}

function createAppliedFitReviewItem(
  review: ParentAppliedFitReview
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'parent-applied-fit__item';

  const meta = document.createElement('span');
  meta.className = 'parent-active-guidance__meta';
  meta.textContent = `${review.skill_label} · ${formatParentTimestamp(review.active_since)}`;
  item.appendChild(meta);

  const recommendation = document.createElement('strong');
  recommendation.className = 'parent-active-guidance__choice';
  recommendation.textContent = review.recommendation;
  item.appendChild(recommendation);

  const reason = document.createElement('p');
  reason.className = 'parent-active-guidance__reason';
  reason.textContent = review.reason;
  item.appendChild(reason);

  const metrics = document.createElement('div');
  metrics.className = 'parent-applied-fit__metrics';
  metrics.appendChild(createProgressMetric('Guidance', review.override_label));
  metrics.appendChild(createProgressMetric('Attempts', `${review.correct_attempts}/${review.attempt_count}`));
  metrics.appendChild(createProgressMetric('Accuracy', review.accuracy_label));
  metrics.appendChild(createProgressMetric('Hints', String(review.hints_used)));
  metrics.appendChild(createProgressMetric('Stops', String(review.abandoned_count)));
  metrics.appendChild(createProgressMetric(
    'Activities',
    review.activity_titles.length > 0
      ? formatList(review.activity_titles)
      : 'No applied activity yet'
  ));
  metrics.appendChild(createProgressMetric(
    'Latest',
    review.latest_attempt_at
      ? formatParentTimestamp(review.latest_attempt_at)
      : 'No applied attempt yet'
  ));
  item.appendChild(metrics);

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

function createParentTransferDecisionHistory(
  decisions: ParentTransferDecision[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-action-history';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Recent Transfer Choices';
  wrapper.appendChild(title);

  const history = [...decisions]
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      a.skill_label.localeCompare(b.skill_label)
    ))
    .slice(0, 5);

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No transfer content choices recorded yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('div');
  list.className = 'parent-action-history__list';
  for (const decision of history) {
    list.appendChild(createParentTransferDecisionHistoryItem(decision));
  }
  wrapper.appendChild(list);

  return wrapper;
}

function createParentTransferDecisionHistoryItem(
  decision: ParentTransferDecision
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'parent-action-history__item';

  const meta = document.createElement('span');
  meta.className = 'parent-action-history__meta';
  meta.textContent = `${formatParentTimestamp(decision.created_at)} · ${decision.skill_label}`;
  item.appendChild(meta);

  const choice = document.createElement('strong');
  choice.className = 'parent-action-history__choice';
  choice.textContent = `Choice: ${formatTransferDecisionLabel(decision.decision_type)}`;
  item.appendChild(choice);

  const reason = document.createElement('p');
  reason.className = 'parent-action-history__reason';
  reason.textContent = decision.transfer_activity_title
    ? [
      `Activity: ${decision.transfer_activity_title}.`,
      `Context: ${formatTransferContextType(decision.missing_context_type)}.`,
    ].join(' ')
    : [
      `Context: ${formatTransferContextType(decision.missing_context_type)}.`,
      `Template: ${decision.suggested_activity_template}.`,
    ].join(' ');
  item.appendChild(reason);

  return item;
}

function createParentActivityBriefDecisionHistory(
  decisions: ParentActivityBriefDecision[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-action-history';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Recent Activity Brief Choices';
  wrapper.appendChild(title);

  const history = [...decisions]
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      a.skill_label.localeCompare(b.skill_label)
    ))
    .slice(0, 5);

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No activity brief choices recorded yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('div');
  list.className = 'parent-action-history__list';
  for (const decision of history) {
    list.appendChild(createParentActivityBriefDecisionHistoryItem(decision));
  }
  wrapper.appendChild(list);

  return wrapper;
}

function createParentActivityBriefDecisionHistoryItem(
  decision: ParentActivityBriefDecision
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'parent-action-history__item';

  const meta = document.createElement('span');
  meta.className = 'parent-action-history__meta';
  meta.textContent = `${formatParentTimestamp(decision.created_at)} · ${decision.skill_label}`;
  item.appendChild(meta);

  const choice = document.createElement('strong');
  choice.className = 'parent-action-history__choice';
  choice.textContent = `Choice: ${formatBriefDecisionLabel(decision.decision_type)}`;
  item.appendChild(choice);

  const reason = document.createElement('p');
  reason.className = 'parent-action-history__reason';
  reason.textContent = [
    `Brief: ${decision.suggested_activity_pattern}.`,
    `Context: ${formatTransferContextType(decision.required_context_type)}.`,
    `Strength: ${formatTransferStrength(decision.required_strength)}.`,
  ].join(' ');
  item.appendChild(reason);

  return item;
}

function createParentActivityBriefDesignQueueSection(
  decisions: ParentActivityBriefDecision[]
): HTMLElement {
  const queue = buildActivityBriefDesignQueue(decisions);
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-action-history';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Activity Brief Design Queue';
  wrapper.appendChild(title);

  if (queue.total_count === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No activity briefs are queued yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  wrapper.appendChild(createActivityBriefDesignQueueGroup(
    'Approved Briefs',
    queue.approved,
    'No approved briefs waiting for design.'
  ));
  wrapper.appendChild(createActivityBriefDesignQueueGroup(
    'Held Briefs',
    queue.held,
    'No held briefs.'
  ));
  wrapper.appendChild(createActivityBriefDesignQueueGroup(
    'Archived Briefs',
    queue.archived,
    'No archived briefs.'
  ));

  return wrapper;
}

function createActivityBriefDesignQueueGroup(
  titleText: string,
  items: ActivityBriefDesignQueueItem[],
  emptyText: string
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'parent-action-history__list';

  const title = document.createElement('strong');
  title.className = 'parent-action-history__choice';
  title.textContent = titleText;
  group.appendChild(title);

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = emptyText;
    group.appendChild(empty);
    return group;
  }

  for (const item of items) {
    group.appendChild(createActivityBriefDesignQueueItem(item));
  }

  return group;
}

function createActivityBriefDesignQueueItem(
  item: ActivityBriefDesignQueueItem
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'parent-action-history__item';

  const meta = document.createElement('span');
  meta.className = 'parent-action-history__meta';
  meta.textContent = `${formatParentTimestamp(item.decided_at)} · ${item.skill_label}`;
  row.appendChild(meta);

  const pattern = document.createElement('strong');
  pattern.className = 'parent-action-history__choice';
  pattern.textContent = item.suggested_activity_pattern;
  row.appendChild(pattern);

  const reason = document.createElement('p');
  reason.className = 'parent-action-history__reason';
  reason.textContent = item.reason;
  row.appendChild(reason);

  const metrics = document.createElement('div');
  metrics.className = 'parent-applied-fit__metrics';
  metrics.appendChild(createProgressMetric(
    'Status',
    formatInternalMasteryLabel(item.status)
  ));
  metrics.appendChild(createProgressMetric(
    'Context',
    formatTransferContextType(item.required_context_type)
  ));
  metrics.appendChild(createProgressMetric(
    'Strength',
    formatTransferStrength(item.required_strength)
  ));
  metrics.appendChild(createProgressMetric(
    'Game Family',
    formatInternalMasteryLabel(item.suggested_game_family)
  ));
  row.appendChild(metrics);

  return row;
}

function createParentMasterySnapshotHistory(
  snapshots: ParentMasterySnapshot[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-action-history';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Recent Mastery Checks';
  wrapper.appendChild(title);

  const history = [...snapshots]
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      a.skill_label.localeCompare(b.skill_label)
    ))
    .slice(0, 5);

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No mastery checks recorded yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('div');
  list.className = 'parent-action-history__list';
  for (const snapshot of history) {
    list.appendChild(createParentMasterySnapshotHistoryItem(snapshot));
  }
  wrapper.appendChild(list);

  return wrapper;
}

function createParentMasterySnapshotHistoryItem(
  snapshot: ParentMasterySnapshot
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'parent-action-history__item';

  const meta = document.createElement('span');
  meta.className = 'parent-action-history__meta';
  meta.textContent = `${formatParentTimestamp(snapshot.created_at)} · ${snapshot.skill_label}`;
  item.appendChild(meta);

  const status = document.createElement('strong');
  status.className = 'parent-action-history__choice';
  status.textContent = [
    'Status:',
    formatInternalMasteryLabel(snapshot.previous_status),
    '->',
    formatInternalMasteryLabel(snapshot.next_status),
  ].join(' ');
  item.appendChild(status);

  const reason = document.createElement('p');
  reason.className = 'parent-action-history__reason';
  reason.textContent = snapshot.reason;
  item.appendChild(reason);

  const metrics = document.createElement('div');
  metrics.className = 'parent-applied-fit__metrics';
  metrics.appendChild(createProgressMetric('Confidence', formatPercent(snapshot.confidence)));
  metrics.appendChild(createProgressMetric(
    'Next Action',
    formatInternalMasteryLabel(snapshot.recommended_action)
  ));
  metrics.appendChild(createProgressMetric('Evidence', snapshot.evidence_summary));
  metrics.appendChild(createProgressMetric(
    'Transfer',
    snapshot.transfer_successful_context_count !== undefined &&
      snapshot.transfer_required_context_count !== undefined
      ? `${snapshot.transfer_successful_context_count}/${snapshot.transfer_required_context_count}`
      : 'Not evaluated'
  ));
  item.appendChild(metrics);

  return item;
}

function createParentReviewScheduleHistory(
  records: ParentReviewScheduleRecord[]
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'parent-action-history';

  const title = document.createElement('h3');
  title.className = 'parent-review-accuracy__title';
  title.textContent = 'Review Schedule';
  wrapper.appendChild(title);

  const history = [...records]
    .sort((a, b) => (
      b.created_at.localeCompare(a.created_at) ||
      a.skill_label.localeCompare(b.skill_label)
    ))
    .slice(0, 5);

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'parent-section__placeholder';
    empty.textContent = 'No review plans recorded yet.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('div');
  list.className = 'parent-action-history__list';
  for (const record of history) {
    list.appendChild(createParentReviewScheduleHistoryItem(record));
  }
  wrapper.appendChild(list);

  return wrapper;
}

function createParentReviewScheduleHistoryItem(
  record: ParentReviewScheduleRecord
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'parent-action-history__item';

  const meta = document.createElement('span');
  meta.className = 'parent-action-history__meta';
  meta.textContent = `${formatParentTimestamp(record.created_at)} · ${record.skill_label}`;
  item.appendChild(meta);

  const interval = document.createElement('strong');
  interval.className = 'parent-action-history__choice';
  interval.textContent = record.interval_label;
  item.appendChild(interval);

  const detail = document.createElement('p');
  detail.className = 'parent-action-history__reason';
  detail.textContent = record.next_review_at
    ? `Next parent review: ${formatParentTimestamp(record.next_review_at)}.`
    : 'No timed review is scheduled yet.';
  item.appendChild(detail);

  return item;
}

function syncParentMasteryRecords(
  storage: StorageServiceInterface,
  context: ParentPanelContext,
  interpretations: ParentSkillInterpretation[],
  existingSnapshots: ParentMasterySnapshot[],
  existingScheduleRecords: ParentReviewScheduleRecord[]
): void {
  for (const interpretation of interpretations) {
    if (!interpretation.mastery_status) continue;

    const snapshot = createParentMasterySnapshot(
      interpretation,
      context,
      existingSnapshots
    );
    storage.saveParentMasterySnapshot(snapshot);
    storage.saveParentReviewScheduleRecord(createParentReviewScheduleRecord(
      snapshot,
      existingScheduleRecords
    ));
  }
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

function createParentTransferDecision(
  decisionType: ParentTransferDecisionType,
  interpretation: ParentSkillInterpretation,
  context: ParentPanelContext,
  createdAt = new Date().toISOString()
): ParentTransferDecision {
  const recommendation = interpretation.transfer_content_recommendation;
  const activityRecommendation = interpretation.transfer_activity_recommendation;
  if (!recommendation && !activityRecommendation) {
    throw new Error('Cannot save transfer decision without a transfer recommendation.');
  }

  return {
    decision_id: createTransferDecisionId(),
    session_id: context.sessionId,
    child_id: context.childId,
    skill_id: interpretation.skill_id,
    skill_label: interpretation.skill_label,
    decision_type: decisionType,
    source_recommendation: interpretation.recommendation,
    source_status: interpretation.mastery_status ?? interpretation.status,
    source_reason: `${interpretation.status_reason} ${interpretation.recommendation_reason}`,
    missing_context_type:
      recommendation?.suggested_context_type ??
      activityRecommendation!.context_type,
    suggested_activity_template:
      recommendation?.suggested_activity_template ??
      activityRecommendation!.activity_id,
    transfer_activity_id: activityRecommendation?.activity_id,
    transfer_activity_title: activityRecommendation?.activity_title,
    created_at: createdAt,
  };
}

function createParentActivityBriefDecision(
  decisionType: ParentActivityBriefDecisionType,
  interpretation: ParentSkillInterpretation,
  context: ParentPanelContext,
  createdAt = new Date().toISOString()
): ParentActivityBriefDecision {
  const brief = interpretation.transfer_content_recommendation?.activity_variant_brief;
  if (!brief) {
    throw new Error('Cannot save activity brief decision without a generated brief.');
  }

  return {
    decision_id: createActivityBriefDecisionId(),
    session_id: context.sessionId,
    child_id: context.childId,
    skill_id: interpretation.skill_id,
    skill_label: interpretation.skill_label,
    decision_type: decisionType,
    brief_id: brief.brief_id,
    required_context_type: brief.required_context_type,
    required_strength: brief.required_strength,
    suggested_game_family: brief.suggested_game_family,
    suggested_activity_pattern: brief.suggested_activity_pattern,
    reason: brief.reason,
    status_at_decision: brief.status,
    created_at: createdAt,
  };
}

function createParentMasterySnapshot(
  interpretation: ParentSkillInterpretation,
  context: ParentPanelContext,
  existingSnapshots: ParentMasterySnapshot[]
): ParentMasterySnapshot {
  const snapshotId = createMasterySnapshotId(interpretation, context);
  const existing = existingSnapshots.find((snapshot) => (
    snapshot.snapshot_id === snapshotId
  ));

  return {
    snapshot_id: snapshotId,
    session_id: context.sessionId,
    child_id: context.childId,
    skill_id: interpretation.skill_id,
    skill_label: interpretation.skill_label,
    previous_status: interpretation.mastery_previous_status ?? 'not_started',
    next_status: interpretation.mastery_status ?? 'not_started',
    confidence: interpretation.mastery_confidence ?? 0,
    recommended_action: interpretation.mastery_recommended_action ?? 'practice',
    reason: interpretation.mastery_reason ?? interpretation.recommendation_reason,
    evidence_summary: interpretation.mastery_evidence_summary ?? 'No mastery evidence yet.',
    skill_graph_rule: interpretation.skill_graph_rule ?? 'No skill graph rule available.',
    source_event_ids: interpretation.mastery_source_event_ids ?? [],
    source_observation_ids: interpretation.mastery_source_observation_ids ?? [],
    transfer_status: interpretation.transfer_coverage_status,
    transfer_required_context_count: interpretation.transfer_required_context_count,
    transfer_approved_context_count: interpretation.transfer_approved_context_count,
    transfer_successful_context_count: interpretation.transfer_successful_context_count,
    transfer_successful_strengths: interpretation.transfer_successful_strengths,
    transfer_strongest_context_strength:
      interpretation.transfer_strongest_context_strength,
    created_at: existing?.created_at ?? new Date().toISOString(),
  };
}

function createParentReviewScheduleRecord(
  snapshot: ParentMasterySnapshot,
  existingRecords: ParentReviewScheduleRecord[]
): ParentReviewScheduleRecord {
  const scheduleId = `review-schedule-${snapshot.snapshot_id}`;
  const existing = existingRecords.find((record) => (
    record.schedule_id === scheduleId
  ));
  const schedule = scheduleReview({
    skill_id: snapshot.skill_id,
    status: snapshot.next_status,
    now_iso: snapshot.created_at,
  });

  return {
    schedule_id: scheduleId,
    snapshot_id: snapshot.snapshot_id,
    session_id: snapshot.session_id,
    child_id: snapshot.child_id,
    skill_id: snapshot.skill_id,
    skill_label: snapshot.skill_label,
    mastery_status: snapshot.next_status,
    interval_label: schedule.interval_label,
    next_review_at: schedule.next_review_at,
    status_after_review: schedule.status_after_review,
    recommended_action: schedule.recommended_action,
    created_at: existing?.created_at ?? snapshot.created_at,
  };
}

function createMasterySnapshotId(
  interpretation: ParentSkillInterpretation,
  context: ParentPanelContext
): string {
  const source = [
    context.childId,
    context.sessionId,
    interpretation.skill_id,
    interpretation.mastery_previous_status ?? 'not_started',
    interpretation.mastery_status ?? 'not_started',
    ...(interpretation.mastery_source_event_ids ?? []),
    ...(interpretation.mastery_source_observation_ids ?? []),
  ].join('|');

  return `mastery-snapshot-${createStableHash(source)}`;
}

function getLatestBriefDecisionForInterpretation(
  interpretation: ParentSkillInterpretation,
  decisions: ParentActivityBriefDecision[]
): ParentActivityBriefDecision | undefined {
  const briefId = interpretation.transfer_content_recommendation
    ?.activity_variant_brief?.brief_id;
  if (!briefId) return undefined;

  return decisions
    .filter((decision) => (
      decision.brief_id === briefId &&
      decision.skill_id === interpretation.skill_id
    ))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
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

  const controls = document.createElement('div');
  controls.className = 'parent-notes__controls';

  const categoryField = document.createElement('label');
  categoryField.className = 'parent-notes__field';
  categoryField.textContent = 'Observation type';
  const categorySelect = document.createElement('select');
  categorySelect.className = 'parent-notes__select';
  categorySelect.id = 'parent-observation-category';
  for (const category of PARENT_OBSERVATION_CATEGORIES) {
    const option = document.createElement('option');
    option.value = category.value;
    option.textContent = category.label;
    categorySelect.appendChild(option);
  }
  categorySelect.value = 'general';
  categoryField.appendChild(categorySelect);
  controls.appendChild(categoryField);

  const skillField = document.createElement('label');
  skillField.className = 'parent-notes__field';
  skillField.textContent = 'Applies to';
  const skillSelect = document.createElement('select');
  skillSelect.className = 'parent-notes__select';
  skillSelect.id = 'parent-observation-skill';
  const sessionOption = document.createElement('option');
  sessionOption.value = '';
  sessionOption.textContent = 'Whole session';
  skillSelect.appendChild(sessionOption);
  for (const skillId of [...review.skills_touched].sort((a, b) => a.localeCompare(b))) {
    const option = document.createElement('option');
    option.value = skillId;
    option.textContent = formatSkillLabel(skillId);
    skillSelect.appendChild(option);
  }
  skillField.appendChild(skillSelect);
  controls.appendChild(skillField);
  wrapper.appendChild(controls);

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
    const category: ParentObservationCategory = isParentObservationCategory(
      categorySelect.value
    ) ? categorySelect.value : 'general';
    const selectedSkillId = review.skills_touched.includes(skillSelect.value)
      ? skillSelect.value
      : undefined;

    const nowIso = new Date().toISOString();
    const observation: ParentObservation = {
      observation_id: createObservationId(),
      session_id: review.session_id,
      child_id: context.childId,
      note,
      category,
      ...(selectedSkillId ? { skill_ids: [selectedSkillId] } : {}),
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

    const tags = document.createElement('div');
    tags.className = 'parent-notes__tags';
    const category = document.createElement('span');
    category.className = 'parent-notes__tag';
    category.textContent = note.category_label;
    tags.appendChild(category);
    for (const skillLabel of note.skill_labels) {
      const skill = document.createElement('span');
      skill.className = 'parent-notes__tag parent-notes__tag--skill';
      skill.textContent = skillLabel;
      tags.appendChild(skill);
    }
    item.appendChild(tags);

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

  row.appendChild(createProgressMetric('Level', formatProgressLevel(state)));
  row.appendChild(createProgressMetric('Attempts', `${state.correct_attempts}/${state.total_attempts}`));
  row.appendChild(createProgressMetric('Accuracy', formatPercent(state.recent_accuracy)));
  row.appendChild(createProgressMetric('Confidence', formatPercent(state.confidence)));
  row.appendChild(createProgressMetric('Review', state.needs_review ? 'Yes' : 'No'));

  return row;
}

function formatProgressLevel(state: SkillMasteryState): string {
  const exactLevel = CURRICULUM_GRAPH.getSkillLevel(
    state.skill_id,
    state.current_level
  );
  const level = exactLevel ?? CURRICULUM_GRAPH.getMaxSkillLevel(state.skill_id);

  if (!level) return String(state.current_level);
  return `${level.level}: ${level.label}`;
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

function formatInternalMasteryLabel(value: string): string {
  return value
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSourceRefs(
  eventIds: string[],
  observationIds: string[]
): string {
  const refs = [
    ...eventIds.map((eventId) => `event:${eventId}`),
    ...observationIds.map((observationId) => `observation:${observationId}`),
  ];

  return refs.length > 0 ? refs.join(', ') : 'None';
}

function formatParentTimestamp(timestamp: string): string {
  const [date = '', timeWithZone = ''] = timestamp.split('T');
  const time = timeWithZone.slice(0, 5);
  if (!date || !time) return timestamp;

  return `${date} ${time} UTC`;
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'None';
}

function formatMissingDifficultyLevels(
  levels: DifficultyCoverageLevel[]
): string {
  return levels.length > 0
    ? levels.map((level) => (
      `${level.label} (difficulty ${level.min_difficulty_level}-${level.max_difficulty_level})`
    )).join(', ')
    : 'None';
}

function formatTransferContextList(values: string[]): string {
  return values.length > 0
    ? values.map((value) => formatInternalMasteryLabel(value)).join(', ')
    : 'None';
}

function formatTransferStrengthList(values: string[]): string {
  return values.length > 0
    ? values.map((value) => formatInternalMasteryLabel(value)).join(', ')
    : 'None';
}

function formatTransferQuality(
  strengths: string[],
  strongest?: string
): string {
  if (strengths.length === 0) return 'No successful transfer yet';
  if (strengths.length === 1 && strengths[0] === 'weak') return 'Weak only';

  const strengthList = formatTransferStrengthList(strengths);
  return strongest
    ? `${strengthList}; strongest: ${formatInternalMasteryLabel(strongest)}`
    : strengthList;
}

function formatRequiredBriefEvidence(brief: ActivityVariantBrief): string {
  const evidence = brief.required_evidence;
  const parts: string[] = [];

  if (evidence.minimum_accuracy !== undefined) {
    parts.push(`${formatPercent(evidence.minimum_accuracy)} accuracy`);
  }
  if (evidence.max_hint_rate !== undefined) {
    parts.push(`${formatPercent(evidence.max_hint_rate)} max hint rate`);
  }
  if (evidence.min_successful_attempts !== undefined) {
    parts.push(`${evidence.min_successful_attempts} successful attempt(s)`);
  }
  if (evidence.requires_retention_gap_hours !== undefined) {
    parts.push(`${evidence.requires_retention_gap_hours}h retention gap`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Evidence threshold not set';
}

function formatTransferDecisionLabel(
  decisionType: ParentTransferDecisionType
): string {
  return decisionType === 'approve_transfer_activity'
    ? 'Approve transfer plan'
    : 'Hold transfer plan';
}

function formatBriefDecisionLabel(
  decisionType: ParentActivityBriefDecisionType
): string {
  if (decisionType === 'approve_brief') return 'Approve brief';
  if (decisionType === 'hold_brief') return 'Hold brief';
  return 'Archive brief';
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

function createTransferDecisionId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `transfer-decision-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createActivityBriefDecisionId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `activity-brief-decision-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function destroyParentPanel(): void {
  if (_container) {
    _container.remove();
    _container = null;
  }
}
