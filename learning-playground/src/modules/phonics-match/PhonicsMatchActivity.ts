/**
 * Word game (phonics) runtime.
 *
 * First slice of the Word-game arc (issue #27): a dedicated home for the phonics
 * activities, taken off the shared generic tap-choice grid so the Word game can
 * grow (rhyming, blending, word-building) without disturbing Math/Shapes. This
 * slice reproduces the current sound-to-picture matcher exactly — same DOM and
 * classes (identical visual), same events, same hint behavior. Later slices
 * extend this module; they do not touch the generic tap-choice runtime.
 */

import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../types/runtime';
import {
  buildParentGuidanceEventMetadata,
  type AppliedParentGuidance,
} from '../../core/parent-difficulty-application';
import type { PhonicsMatchChoice, PhonicsFeedbackRule } from './phonics-match.types';
import {
  renderPhonicsCharacterArt,
  mouthForSound,
  type CharacterMouth,
} from './phonics-character-art';

interface PhonicsMatchOptions {
  activity: LearningActivity;
  parentGuidance?: AppliedParentGuidance;
  childId: string;
  sessionId: string;
  speech: SpeechServiceInterface;
  audio: AudioServiceInterface;
  onEvent: (event: ActivityAttemptEvent) => void;
}

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];

export function renderPhonicsMatchActivity(
  parent: HTMLElement,
  options: PhonicsMatchOptions
): void {
  destroyPhonicsMatchActivity();

  const choices = getChoices(options.activity);
  const correctChoice = getCorrectChoice(options.activity, choices);

  if (!correctChoice || choices.length === 0) {
    renderActivityUnavailable(parent);
    return;
  }

  let attemptNumber = 0;
  let hintShown = false;
  let isComplete = false;
  let attemptStartedAt = Date.now();

  const maxAttemptsBeforeHint = getNumberRule(
    options.activity.success_rules.max_attempts_before_hint,
    2
  );
  const correctFeedback = getFeedbackRule(options.activity.feedback_rules.correct);
  const incorrectFeedback = getFeedbackRule(options.activity.feedback_rules.incorrect);
  const hintFeedback = getFeedbackRule(options.activity.feedback_rules.hint);
  const promptText = getPrompt(options.activity);

  container = document.createElement('div');
  container.className = 'child-container activity-screen';
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
    pulseCharacterSpeak();
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

  const promptImages = getPromptImages(options.activity);
  if (promptImages.length > 0) {
    const promptVisual = document.createElement('div');
    promptVisual.className = 'activity-prompt-visual';
    promptVisual.setAttribute('aria-hidden', 'true');

    for (const imagePath of promptImages) {
      const image = document.createElement('img');
      image.className = 'activity-prompt-visual__image';
      image.src = imagePath;
      image.alt = '';
      promptVisual.appendChild(image);
    }

    container.appendChild(promptVisual);
  }

  // Pip — the recurring Word-game character. Pip's mouth shows how the target
  // sound is made, and Pip "comes alive" (cheers) when the word is found. This
  // is affect only: the same attempt events fire; there is no reward loop.
  const targetMouth = mouthForSound(getTargetSound(options.activity));
  const character = document.createElement('div');
  character.className = 'phonics-character';
  character.dataset.mouth = targetMouth;
  character.setAttribute('aria-hidden', 'true');

  const characterArt = document.createElement('div');
  characterArt.className = 'phonics-character__art';
  characterArt.innerHTML = renderPhonicsCharacterArt(targetMouth);
  character.appendChild(characterArt);
  container.appendChild(character);

  const setCharacterMouth = (mouth: CharacterMouth): void => {
    character.dataset.mouth = mouth;
    characterArt.innerHTML = renderPhonicsCharacterArt(mouth);
  };

  const pulseCharacterSpeak = (): void => {
    if (isComplete) return;
    character.classList.remove('is-speaking');
    // Force reflow so the pulse restarts when the prompt is repeated (no-op
    // outside a real DOM).
    void character.offsetWidth;
    character.classList.add('is-speaking');
  };

  const grid = document.createElement('div');
  grid.className = 'activity-choice-grid';
  grid.setAttribute('aria-label', 'Answer choices');

  const choiceButtons = new Map<string, HTMLButtonElement>();

  for (const choice of choices) {
    const button = document.createElement('button');
    button.className = 'activity-choice';
    button.type = 'button';
    button.setAttribute('aria-label', choice.label);
    button.dataset.choiceId = choice.id;

    if (choice.image) {
      const image = document.createElement('img');
      image.className = 'activity-choice__image';
      image.src = choice.image;
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      button.appendChild(image);
    }

    const label = document.createElement('span');
    label.className = 'activity-choice__label';
    label.textContent = choice.label;
    button.appendChild(label);

    const onChoiceClick = () => {
      if (isComplete) return;

      attemptNumber += 1;
      const responseTimeMs = Date.now() - attemptStartedAt;
      const isCorrect = choice.id === correctChoice.id;

      options.onEvent(
        createAttemptEvent({
          activity: options.activity,
          childId: options.childId,
          sessionId: options.sessionId,
          outcome: isCorrect ? 'correct' : 'incorrect',
          promptText,
          selectedChoice: choice,
          correctChoice,
          attemptNumber,
          responseTimeMs,
          hintShown,
          parentGuidance: options.parentGuidance,
        })
      );

      if (isCorrect) {
        isComplete = true;
        button.classList.add('is-correct');
        // The found word comes alive: the picture pops and Pip cheers. One-time,
        // deterministic — not a reward loop.
        button.classList.add('is-alive');
        character.classList.remove('is-speaking');
        setCharacterMouth('cheer');
        character.classList.add('is-cheering');
        disableChoices(choiceButtons);
        showFeedback(feedback, correctFeedback.speech ?? 'You found it.', 'success');
        speakAndPlay(options, correctFeedback);

        options.onEvent(
          createAttemptEvent({
            activity: options.activity,
            childId: options.childId,
            sessionId: options.sessionId,
            outcome: 'completed',
            promptText,
            selectedChoice: choice,
            correctChoice,
            attemptNumber,
            responseTimeMs,
            hintShown,
            parentGuidance: options.parentGuidance,
          })
        );

        completeActions.hidden = false;
        return;
      }

      button.classList.add('is-incorrect');
      window.setTimeout(() => {
        button.classList.remove('is-incorrect');
      }, 500);

      showFeedback(feedback, incorrectFeedback.speech ?? 'Try another one.', 'support');
      speakAndPlay(options, incorrectFeedback);

      if (!hintShown && attemptNumber >= maxAttemptsBeforeHint) {
        hintShown = true;
        showFeedback(feedback, hintFeedback.speech ?? 'Look closely.', 'hint');
        speakAndPlay(options, hintFeedback);

        if (hintFeedback.highlight_target !== false) {
          choiceButtons.get(correctChoice.id)?.classList.add('is-hinted');
        }

        options.onEvent(
          createAttemptEvent({
            activity: options.activity,
            childId: options.childId,
            sessionId: options.sessionId,
            outcome: 'hint_used',
            promptText,
            selectedChoice: choice,
            correctChoice,
            attemptNumber,
            responseTimeMs,
            hintShown,
            parentGuidance: options.parentGuidance,
          })
        );
      }

      attemptStartedAt = Date.now();
    };

    button.addEventListener('click', onChoiceClick);
    cleanupHandlers.push(() => button.removeEventListener('click', onChoiceClick));
    choiceButtons.set(choice.id, button);
    grid.appendChild(button);
  }

  container.appendChild(grid);

  const feedback = document.createElement('p');
  feedback.className = 'activity-feedback';
  feedback.setAttribute('aria-live', 'polite');
  container.appendChild(feedback);

  const completeActions = document.createElement('div');
  completeActions.className = 'activity-complete-actions';
  completeActions.hidden = true;

  // Chain into the next word so the Word game is a multi-round session, not a
  // single dead-end tap. The child stays parent-approved (fixed hand-authored
  // chain), no auto-difficulty routing.
  const nextActivityId = getNextActivityId(options.activity);
  if (nextActivityId) {
    const nextButton = document.createElement('button');
    nextButton.className = 'child-button';
    nextButton.type = 'button';
    nextButton.textContent = getNextLabel(options.activity);
    nextButton.addEventListener('click', () => {
      window.location.hash = `#activity/${nextActivityId}`;
    });
    completeActions.appendChild(nextButton);
  }

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
  pulseCharacterSpeak();
}

export function destroyPhonicsMatchActivity(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  if (container) {
    container.remove();
    container = null;
  }
}

function getChoices(activity: LearningActivity): PhonicsMatchChoice[] {
  const choices = activity.content.choices;
  if (!Array.isArray(choices)) return [];

  return choices.filter((choice): choice is PhonicsMatchChoice => {
    if (typeof choice !== 'object' || choice === null) return false;
    const value = choice as Record<string, unknown>;
    return (
      typeof value.id === 'string' &&
      typeof value.label === 'string' &&
      (value.image === undefined || typeof value.image === 'string') &&
      (value.correct === undefined || typeof value.correct === 'boolean')
    );
  });
}

function getCorrectChoice(
  activity: LearningActivity,
  choices: PhonicsMatchChoice[]
): PhonicsMatchChoice | undefined {
  const configuredId = activity.success_rules.correct_choice_id;
  if (typeof configuredId === 'string') {
    return choices.find((choice) => choice.id === configuredId);
  }

  return choices.find((choice) => choice.correct === true);
}

function getPrompt(activity: LearningActivity): string {
  const promptAudio = activity.content.prompt_audio;
  return typeof promptAudio === 'string' ? promptAudio : activity.title;
}

function getTargetSound(activity: LearningActivity): string | undefined {
  const sound = activity.content.target_sound;
  return typeof sound === 'string' ? sound : undefined;
}

function getPromptImages(activity: LearningActivity): string[] {
  const promptImages = activity.content.prompt_images;
  if (!Array.isArray(promptImages)) return [];

  return promptImages.filter((imagePath): imagePath is string => (
    typeof imagePath === 'string'
  ));
}

function getNextActivityId(activity: LearningActivity): string | undefined {
  const nextId = activity.content.next_activity_id;
  return typeof nextId === 'string' ? nextId : undefined;
}

function getNextLabel(activity: LearningActivity): string {
  const label = activity.content.next_label;
  return typeof label === 'string' ? label : 'Next word';
}

function getNumberRule(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function getFeedbackRule(value: unknown): PhonicsFeedbackRule {
  if (typeof value !== 'object' || value === null) return {};

  const rule = value as Record<string, unknown>;
  return {
    speech: typeof rule.speech === 'string' ? rule.speech : undefined,
    sound: typeof rule.sound === 'string' ? rule.sound : undefined,
    highlight_target:
      typeof rule.highlight_target === 'boolean' ? rule.highlight_target : undefined,
  };
}

function showFeedback(
  element: HTMLElement,
  message: string,
  tone: 'success' | 'support' | 'hint'
): void {
  element.textContent = message;
  element.dataset.tone = tone;
}

function speakAndPlay(options: PhonicsMatchOptions, feedback: PhonicsFeedbackRule): void {
  if (feedback.speech) {
    options.speech.speak(feedback.speech);
  }

  if (feedback.sound) {
    options.audio.play(feedback.sound);
  }
}

function disableChoices(choiceButtons: Map<string, HTMLButtonElement>): void {
  for (const button of choiceButtons.values()) {
    button.disabled = true;
  }
}

function createAttemptEvent(params: {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  outcome: ActivityAttemptEvent['outcome'];
  promptText: string;
  selectedChoice: PhonicsMatchChoice;
  correctChoice: PhonicsMatchChoice;
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
  parentGuidance?: AppliedParentGuidance;
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
    selected_choice_id: params.selectedChoice.id,
    correct_choice_id: params.correctChoice.id,
    selected_answer: params.selectedChoice.label,
    correct_answer: params.correctChoice.label,
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: params.activity.difficulty.level,
    choice_count: params.activity.difficulty.choice_count,
    distractor_strength: params.activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: params.hintShown,
    metadata: buildParentGuidanceEventMetadata(params.parentGuidance),
  };
}

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderActivityUnavailable(parent: HTMLElement): void {
  container = document.createElement('div');
  container.className = 'child-container activity-screen';

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = 'Activity needs setup';
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
