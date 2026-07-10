/**
 * Tap-fill coloring activity runtime.
 * Keeps art interaction preschool-safe: pick a swatch, tap the shape, complete.
 */

import type { LearningActivity } from '../../types/activity';
import { createStudioEnvironment } from './studio-environment';
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

  const configuredTargetColorId = getOptionalStringContent(
    options.activity.content.target_color_id
  );
  const successTargetColorId = getOptionalStringContent(
    options.activity.success_rules.correct_color_id
  );
  const hasTargetMode = configuredTargetColorId !== undefined ||
    successTargetColorId !== undefined;
  const targetColor = configuredTargetColorId === undefined
    ? undefined
    : colors.find((color) => color.id === configuredTargetColorId);

  if (
    hasTargetMode &&
    (
      targetColor === undefined ||
      successTargetColorId === undefined ||
      successTargetColorId !== configuredTargetColorId
    )
  ) {
    renderColoringUnavailable(parent);
    return;
  }

  let selectedColor: ColorOption | null = null;
  let isComplete = false;
  let attemptNumber = 0;
  let hintShown = false;
  let attemptStartedAt = Date.now();

  const correctFeedback = getFeedbackRule(options.activity.feedback_rules.correct);
  const incorrectFeedback = getFeedbackRule(options.activity.feedback_rules.incorrect);
  const hintFeedback = getFeedbackRule(options.activity.feedback_rules.hint);
  const maxAttemptsBeforeHint = getNumberRule(
    options.activity.success_rules.max_attempts_before_hint,
    2
  );
  const defaultColor = getStringContent(
    options.activity.content.default_color,
    '#ffffff'
  );
  const promptText = getPrompt(options.activity);

  container = document.createElement('div');
  container.className = [
    'child-container activity-screen coloring-screen coloring-studio',
    targetColor ? 'coloring-screen--request' : '',
  ].filter(Boolean).join(' ');
  container.id = `activity-${options.activity.id}`;

  // The Art studio: an all-neutral decorative scene (inert — aria-hidden, no
  // pointer events), so color belongs only to the palette and the shape.
  container.appendChild(createStudioEnvironment());

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

  if (targetColor) {
    const requestCard = document.createElement('div');
    requestCard.className = 'coloring-request-card';
    requestCard.setAttribute('role', 'img');
    requestCard.setAttribute('aria-label', `Match the ${targetColor.label} color`);

    const requestSwatch = document.createElement('span');
    requestSwatch.className = 'coloring-request-card__swatch';
    requestSwatch.style.setProperty('--request-color', targetColor.value);
    requestSwatch.setAttribute('aria-hidden', 'true');
    requestCard.appendChild(requestSwatch);
    container.appendChild(requestCard);
  }

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
    shapeButton.style.setProperty('--shape-fill', selectedColor.value);
    const responseTimeMs = Date.now() - attemptStartedAt;
    const isCorrect = targetColor === undefined || selectedColor.id === targetColor.id;

    if (!isCorrect) {
      shapeButton.classList.add('is-wrong');
      window.setTimeout(() => shapeButton.classList.remove('is-wrong'), 500);
      options.onEvent(createColorEvent({
        activity: options.activity,
        childId: options.childId,
        sessionId: options.sessionId,
        outcome: 'incorrect',
        promptText,
        attemptNumber,
        responseTimeMs,
        color: selectedColor,
        targetColor,
        hintShown,
      }));

      showFeedback(
        feedback,
        incorrectFeedback.speech ?? 'Check the color card and try again.',
        'support'
      );
      speakAndPlay(options, incorrectFeedback);

      if (!hintShown && attemptNumber >= maxAttemptsBeforeHint) {
        hintShown = true;
        swatchButtons.get(targetColor.id)?.classList.add('is-hinted');
        showFeedback(feedback, hintFeedback.speech ?? 'Find the matching color.', 'hint');
        speakAndPlay(options, hintFeedback);
        options.onEvent(createColorEvent({
          activity: options.activity,
          childId: options.childId,
          sessionId: options.sessionId,
          outcome: 'hint_used',
          promptText,
          attemptNumber,
          responseTimeMs,
          color: selectedColor,
          targetColor,
          hintShown: true,
        }));
      }

      attemptStartedAt = Date.now();
      return;
    }

    isComplete = true;
    shapeButton.classList.remove('is-wrong');
    shapeButton.classList.add('is-complete');
    disableSwatches(swatchButtons);

    options.onEvent(createColorEvent({
      activity: options.activity,
      childId: options.childId,
      sessionId: options.sessionId,
      outcome: 'correct',
      promptText,
      attemptNumber,
      responseTimeMs,
      color: selectedColor,
      targetColor,
      hintShown,
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
      targetColor,
      hintShown,
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

function getOptionalStringContent(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getNumberRule(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
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
  targetColor?: ColorOption;
  hintShown: boolean;
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
    ...(params.targetColor ? { correct_choice_id: params.targetColor.id } : {}),
    selected_answer: params.color.label,
    correct_answer: params.targetColor?.label ?? params.color.label,
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: params.activity.difficulty.level,
    choice_count: params.activity.difficulty.choice_count,
    distractor_strength: params.activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: params.hintShown,
    metadata: {
      color_label: params.color.label,
      color_value: params.color.value,
      ...(params.targetColor
        ? {
            target_color_id: params.targetColor.id,
            target_color_label: params.targetColor.label,
            target_color_value: params.targetColor.value,
          }
        : {}),
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
