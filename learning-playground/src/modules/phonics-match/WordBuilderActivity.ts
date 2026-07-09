/**
 * Word-builder runtime — the top rung of the Word game (issue #27). The child
 * builds a pictured word by tapping letter tiles into slots in order (a
 * tap-then-place interaction, a mode of the phonics Word-game runtime, not a new
 * top-level game type). Reuses Pip; emits the same ActivityAttemptEvent shape as
 * the matcher. The completion cheer + picture pop is a single deterministic
 * reaction — not a reward loop. Kept separate from the matcher so that merged,
 * tested runtime stays untouched.
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
import type { PhonicsFeedbackRule } from './phonics-match.types';
import {
  renderPhonicsCharacterArt,
  mouthForSound,
  type CharacterMouth,
} from './phonics-character-art';

interface WordBuilderOptions {
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

export function renderWordBuilderActivity(
  parent: HTMLElement,
  options: WordBuilderOptions
): void {
  destroyWordBuilderActivity();

  const targetWord = getTargetWord(options.activity);
  const tiles = getTiles(options.activity);

  if (!targetWord || tiles.length === 0) {
    renderActivityUnavailable(parent);
    return;
  }

  const letters = targetWord.split('');
  let nextIndex = 0;
  let attemptNumber = 0;
  let wrongStreak = 0;
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

  const picturePath = getPicture(options.activity);
  let pictureImage: HTMLImageElement | null = null;
  if (picturePath) {
    const pictureWrap = document.createElement('div');
    pictureWrap.className = 'word-builder__picture';
    pictureWrap.setAttribute('aria-hidden', 'true');
    pictureImage = document.createElement('img');
    pictureImage.className = 'word-builder__picture-image';
    pictureImage.src = picturePath;
    pictureImage.alt = '';
    pictureWrap.appendChild(pictureImage);
    container.appendChild(pictureWrap);
  }

  // Pip rests on the first sound of the word being built.
  const character = document.createElement('div');
  character.className = 'phonics-character';
  const restMouth = mouthForSound(letters[0]);
  character.dataset.mouth = restMouth;
  character.setAttribute('aria-hidden', 'true');
  const characterArt = document.createElement('div');
  characterArt.className = 'phonics-character__art';
  characterArt.innerHTML = renderPhonicsCharacterArt(restMouth);
  character.appendChild(characterArt);
  container.appendChild(character);

  const setCharacterMouth = (mouth: CharacterMouth): void => {
    character.dataset.mouth = mouth;
    characterArt.innerHTML = renderPhonicsCharacterArt(mouth);
  };

  const slotsRow = document.createElement('div');
  slotsRow.className = 'word-builder__slots';
  slotsRow.setAttribute('role', 'img');
  slotsRow.setAttribute('aria-label', `Build the word ${targetWord}`);
  const slotEls: HTMLElement[] = [];
  for (let index = 0; index < letters.length; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'word-builder__slot';
    slot.dataset.index = String(index);
    slotsRow.appendChild(slot);
    slotEls.push(slot);
  }
  container.appendChild(slotsRow);

  const tray = document.createElement('div');
  tray.className = 'word-builder__tray';
  tray.setAttribute('aria-label', 'Letter tiles');

  const feedback = document.createElement('p');
  feedback.className = 'activity-feedback';
  feedback.setAttribute('aria-live', 'polite');

  const completeActions = document.createElement('div');
  completeActions.className = 'activity-complete-actions';
  completeActions.hidden = true;

  const tileButtons: HTMLButtonElement[] = [];

  const clearHint = (): void => {
    for (const tile of tileButtons) {
      tile.classList.remove('is-hinted');
    }
  };

  const highlightExpectedTile = (expected: string): void => {
    for (const tile of tileButtons) {
      if (!tile.disabled && tile.dataset.letter === expected) {
        tile.classList.add('is-hinted');
        return;
      }
    }
  };

  for (const tileLetter of tiles) {
    const button = document.createElement('button');
    button.className = 'word-builder__tile';
    button.type = 'button';
    button.dataset.letter = tileLetter;
    button.setAttribute('aria-label', `Letter ${tileLetter}`);
    button.textContent = tileLetter;

    const onTileClick = () => {
      if (isComplete || button.disabled) return;

      attemptNumber += 1;
      const responseTimeMs = Date.now() - attemptStartedAt;
      const expected = letters[nextIndex];

      if (tileLetter === expected) {
        button.disabled = true;
        button.classList.add('is-placed');
        const slot = slotEls[nextIndex];
        slot.textContent = tileLetter;
        slot.classList.add('is-filled');
        nextIndex += 1;
        wrongStreak = 0;
        clearHint();
        attemptStartedAt = Date.now();

        if (nextIndex >= letters.length) {
          isComplete = true;
          options.onEvent(
            createAttemptEvent({
              activity: options.activity,
              childId: options.childId,
              sessionId: options.sessionId,
              outcome: 'correct',
              promptText,
              selectedId: targetWord,
              selectedLabel: targetWord,
              correctId: targetWord,
              correctLabel: targetWord,
              attemptNumber,
              responseTimeMs,
              hintShown,
              parentGuidance: options.parentGuidance,
            })
          );
          options.onEvent(
            createAttemptEvent({
              activity: options.activity,
              childId: options.childId,
              sessionId: options.sessionId,
              outcome: 'completed',
              promptText,
              selectedId: targetWord,
              selectedLabel: targetWord,
              correctId: targetWord,
              correctLabel: targetWord,
              attemptNumber,
              responseTimeMs,
              hintShown,
              parentGuidance: options.parentGuidance,
            })
          );

          showFeedback(feedback, correctFeedback.speech ?? 'You built it!', 'success');
          speakAndPlay(options, correctFeedback);
          setCharacterMouth('cheer');
          character.classList.add('is-cheering');
          pictureImage?.classList.add('is-alive');
          completeActions.hidden = false;
        }
        return;
      }

      wrongStreak += 1;
      button.classList.add('is-wrong');
      window.setTimeout(() => {
        button.classList.remove('is-wrong');
      }, 500);

      options.onEvent(
        createAttemptEvent({
          activity: options.activity,
          childId: options.childId,
          sessionId: options.sessionId,
          outcome: 'incorrect',
          promptText,
          selectedId: tileLetter,
          selectedLabel: tileLetter,
          correctId: expected,
          correctLabel: expected,
          attemptNumber,
          responseTimeMs,
          hintShown,
          parentGuidance: options.parentGuidance,
        })
      );

      showFeedback(feedback, incorrectFeedback.speech ?? 'Try another letter.', 'support');
      speakAndPlay(options, incorrectFeedback);

      if (!hintShown && wrongStreak >= maxAttemptsBeforeHint) {
        hintShown = true;
        showFeedback(feedback, hintFeedback.speech ?? 'This letter comes next.', 'hint');
        speakAndPlay(options, hintFeedback);
        if (hintFeedback.highlight_target !== false) {
          highlightExpectedTile(expected);
        }
        options.onEvent(
          createAttemptEvent({
            activity: options.activity,
            childId: options.childId,
            sessionId: options.sessionId,
            outcome: 'hint_used',
            promptText,
            selectedId: expected,
            selectedLabel: expected,
            correctId: expected,
            correctLabel: expected,
            attemptNumber,
            responseTimeMs,
            hintShown,
            parentGuidance: options.parentGuidance,
          })
        );
      }

      attemptStartedAt = Date.now();
    };

    button.addEventListener('click', onTileClick);
    cleanupHandlers.push(() => button.removeEventListener('click', onTileClick));
    tileButtons.push(button);
    tray.appendChild(button);
  }

  container.appendChild(tray);
  container.appendChild(feedback);

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
}

export function destroyWordBuilderActivity(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  if (container) {
    container.remove();
    container = null;
  }
}

function getTargetWord(activity: LearningActivity): string | undefined {
  const word = activity.content.target_word;
  return typeof word === 'string' && word.trim().length > 0 ? word : undefined;
}

function getTiles(activity: LearningActivity): string[] {
  const tiles = activity.content.tiles;
  if (!Array.isArray(tiles)) return [];
  return tiles.filter((tile): tile is string => (
    typeof tile === 'string' && tile.trim().length > 0
  ));
}

function getPicture(activity: LearningActivity): string | undefined {
  const picture = activity.content.picture;
  return typeof picture === 'string' ? picture : undefined;
}

function getPrompt(activity: LearningActivity): string {
  const promptAudio = activity.content.prompt_audio;
  return typeof promptAudio === 'string' ? promptAudio : activity.title;
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

function speakAndPlay(options: WordBuilderOptions, feedback: PhonicsFeedbackRule): void {
  if (feedback.speech) {
    options.speech.speak(feedback.speech);
  }
  if (feedback.sound) {
    options.audio.play(feedback.sound);
  }
}

function createAttemptEvent(params: {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  outcome: ActivityAttemptEvent['outcome'];
  promptText: string;
  selectedId: string;
  selectedLabel: string;
  correctId: string;
  correctLabel: string;
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
    selected_choice_id: params.selectedId,
    correct_choice_id: params.correctId,
    selected_answer: params.selectedLabel,
    correct_answer: params.correctLabel,
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
