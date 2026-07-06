/**
 * Tap-fill coloring activity runtime.
 * Keeps art interaction preschool-safe: pick a swatch, tap the shape, complete.
 */

import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../types/runtime';

interface ColorOption {
  id: string;
  label: string;
  value: string;
}

interface FeedbackRule {
  speech?: string;
  sound?: string;
}

interface ColoringOptions {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  speech: SpeechServiceInterface;
  audio: AudioServiceInterface;
  onEvent: (event: ActivityAttemptEvent) => void;
}

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];

export function renderColoringActivity(
  parent: HTMLElement,
  options: ColoringOptions
): void {
  destroyColoringActivity();

  const colors = getColors(options.activity);
  if (colors.length === 0) {
    renderColoringUnavailable(parent);
    return;
  }

  let selectedColor: ColorOption | null = null;
  let isComplete = false;
  let attemptNumber = 0;
  const startedAt = Date.now();

  const correctFeedback = getFeedbackRule(options.activity.feedback_rules.correct);
  const hintFeedback = getFeedbackRule(options.activity.feedback_rules.hint);
  const defaultColor = getStringContent(
    options.activity.content.default_color,
    '#ffffff'
  );
  const promptText = getPrompt(options.activity);

  container = document.createElement('div');
  container.className = 'child-container activity-screen coloring-screen';
  container.id = `activity-${options.activity.id}`;

  const topBar = document.createElement('div');
  topBar.className = 'activity-topbar';

  const homeButton = document.createElement('button');
  homeButton.className = 'activity-icon-button';
  homeButton.type = 'button';
  homeButton.textContent = 'Home';
  homeButton.setAttribute('aria-label', 'Return home');
  homeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  topBar.appendChild(homeButton);

  const repeatButton = document.createElement('button');
  repeatButton.className = 'activity-icon-button';
  repeatButton.type = 'button';
  repeatButton.textContent = 'Repeat';
  repeatButton.setAttribute('aria-label', 'Repeat prompt');
  repeatButton.addEventListener('click', () => {
    options.speech.repeatLast();
  });
  topBar.appendChild(repeatButton);
  container.appendChild(topBar);

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = options.activity.title;
  container.appendChild(title);

  const prompt = document.createElement('p');
  prompt.className = 'activity-prompt';
  prompt.textContent = promptText;
  container.appendChild(prompt);

  const swatchGrid = document.createElement('div');
  swatchGrid.className = 'coloring-swatches';
  swatchGrid.setAttribute('aria-label', 'Color choices');

  const swatchButtons = new Map<string, HTMLButtonElement>();

  for (const color of colors) {
    const swatch = document.createElement('button');
    swatch.className = 'coloring-swatch';
    swatch.type = 'button';
    swatch.style.setProperty('--swatch-color', color.value);
    swatch.setAttribute('aria-label', color.label);
    swatch.dataset.colorId = color.id;

    const label = document.createElement('span');
    label.className = 'coloring-swatch__label';
    label.textContent = color.label;
    swatch.appendChild(label);

    const onSwatchClick = () => {
      if (isComplete) return;
      selectedColor = color;
      markSelectedSwatch(swatchButtons, color.id);
      feedback.textContent = color.label;
      feedback.dataset.tone = 'hint';

    };

    swatch.addEventListener('click', onSwatchClick);
    cleanupHandlers.push(() => swatch.removeEventListener('click', onSwatchClick));
    swatchButtons.set(color.id, swatch);
    swatchGrid.appendChild(swatch);
  }

  container.appendChild(swatchGrid);

  const shapeButton = document.createElement('button');
  shapeButton.className = 'coloring-shape';
  shapeButton.type = 'button';
  shapeButton.setAttribute('aria-label', 'Color the circle');
  shapeButton.style.setProperty('--shape-fill', defaultColor);

  const shapeInner = document.createElement('span');
  shapeInner.className = 'coloring-shape__circle';
  shapeInner.setAttribute('aria-hidden', 'true');
  shapeButton.appendChild(shapeInner);

  const onShapeClick = () => {
    if (isComplete) return;

    if (!selectedColor) {
      showFeedback(feedback, hintFeedback.speech ?? 'Pick a color first.', 'support');
      speakAndPlay(options, hintFeedback);
      return;
    }

    attemptNumber += 1;
    isComplete = true;
    shapeButton.style.setProperty('--shape-fill', selectedColor.value);
    shapeButton.classList.add('is-complete');
    disableSwatches(swatchButtons);

    const responseTimeMs = Date.now() - startedAt;
    options.onEvent(createColorEvent({
      activity: options.activity,
      childId: options.childId,
      sessionId: options.sessionId,
      outcome: 'correct',
      promptText,
      attemptNumber,
      responseTimeMs,
      color: selectedColor,
    }));
    options.onEvent(createColorEvent({
      activity: options.activity,
      childId: options.childId,
      sessionId: options.sessionId,
      outcome: 'completed',
      promptText,
      attemptNumber,
      responseTimeMs,
      color: selectedColor,
    }));

    showFeedback(feedback, correctFeedback.speech ?? 'You colored it.', 'success');
    speakAndPlay(options, correctFeedback);
    completeActions.hidden = false;
  };

  shapeButton.addEventListener('click', onShapeClick);
  cleanupHandlers.push(() => shapeButton.removeEventListener('click', onShapeClick));
  container.appendChild(shapeButton);

  const feedback = document.createElement('p');
  feedback.className = 'activity-feedback';
  feedback.setAttribute('aria-live', 'polite');
  container.appendChild(feedback);

  const completeActions = document.createElement('div');
  completeActions.className = 'activity-complete-actions';
  completeActions.hidden = true;

  const doneHomeButton = document.createElement('button');
  doneHomeButton.className = 'child-button';
  doneHomeButton.type = 'button';
  doneHomeButton.textContent = 'Home';
  doneHomeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  completeActions.appendChild(doneHomeButton);
  container.appendChild(completeActions);

  parent.appendChild(container);
  options.speech.speak(promptText);
}

export function destroyColoringActivity(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  if (container) {
    container.remove();
    container = null;
  }
}

function getColors(activity: LearningActivity): ColorOption[] {
  const colors = activity.content.colors;
  if (!Array.isArray(colors)) return [];

  return colors.filter((color): color is ColorOption => {
    if (typeof color !== 'object' || color === null) return false;
    const value = color as Record<string, unknown>;
    return (
      typeof value.id === 'string' &&
      typeof value.label === 'string' &&
      typeof value.value === 'string'
    );
  });
}

function getPrompt(activity: LearningActivity): string {
  return getStringContent(activity.content.prompt_audio, activity.title);
}

function getStringContent(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function getFeedbackRule(value: unknown): FeedbackRule {
  if (typeof value !== 'object' || value === null) return {};

  const rule = value as Record<string, unknown>;
  return {
    speech: typeof rule.speech === 'string' ? rule.speech : undefined,
    sound: typeof rule.sound === 'string' ? rule.sound : undefined,
  };
}

function markSelectedSwatch(
  swatchButtons: Map<string, HTMLButtonElement>,
  selectedColorId: string
): void {
  for (const [colorId, swatch] of swatchButtons) {
    swatch.classList.toggle('is-selected', colorId === selectedColorId);
  }
}

function disableSwatches(swatchButtons: Map<string, HTMLButtonElement>): void {
  for (const swatch of swatchButtons.values()) {
    swatch.disabled = true;
  }
}

function showFeedback(
  element: HTMLElement,
  message: string,
  tone: 'success' | 'support' | 'hint'
): void {
  element.textContent = message;
  element.dataset.tone = tone;
}

function speakAndPlay(options: ColoringOptions, feedback: FeedbackRule): void {
  if (feedback.speech) {
    options.speech.speak(feedback.speech);
  }

  if (feedback.sound) {
    options.audio.play(feedback.sound);
  }
}

function createColorEvent(params: {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  outcome: ActivityAttemptEvent['outcome'];
  promptText: string;
  attemptNumber: number;
  responseTimeMs: number;
  color: ColorOption;
}): ActivityAttemptEvent {
  return {
    event_id: createEventId(),
    session_id: params.sessionId,
    child_id: params.childId,
    activity_id: params.activity.id,
    activity_version: params.activity.version,
    skill_ids: params.activity.skill_ids,
    timestamp: new Date().toISOString(),
    prompt_text: params.promptText,
    outcome: params.outcome,
    selected_choice_id: params.color.id,
    selected_answer: params.color.label,
    correct_answer: params.color.label,
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: params.activity.difficulty.level,
    choice_count: params.activity.difficulty.choice_count,
    distractor_strength: params.activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: false,
    metadata: {
      color_label: params.color.label,
      color_value: params.color.value,
    },
  };
}

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderColoringUnavailable(parent: HTMLElement): void {
  container = document.createElement('div');
  container.className = 'child-container activity-screen';

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = 'Coloring needs setup';
  container.appendChild(title);

  const homeButton = document.createElement('button');
  homeButton.className = 'child-button';
  homeButton.type = 'button';
  homeButton.textContent = 'Home';
  homeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  container.appendChild(homeButton);

  parent.appendChild(container);
}
