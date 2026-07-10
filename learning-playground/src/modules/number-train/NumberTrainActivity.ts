/**
 * Number Train runtime — the first real Math game (arc slice 1: foundation).
 *
 * The child rides a train of structured quantities: each car holds ten seats in
 * a stable 2×5 layout so groups of five and ten are visually obvious (7 = seven
 * occupied seats; 14 = one full car and four seats). This slice ships the shell
 * and one fixed Count-the-Train round; the deterministic multi-round session,
 * Load-the-Train, and Missing Station land in later slices. Local and
 * deterministic; no reward loops — progress will be the train reaching a
 * station, never points.
 */

import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../types/runtime';
import type { CountTrainRound, NumberTrainPlan } from './number-train.types';
import { buildFoundationPlan } from './round-plan';
import { trainEngineSvg, passengerSvg } from './train-art';

interface NumberTrainOptions {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  speech: SpeechServiceInterface;
  audio: AudioServiceInterface;
  onEvent: (event: ActivityAttemptEvent) => void;
}

interface FeedbackRule {
  speech?: string;
  sound?: string;
  highlight_target?: boolean;
}

const SEATS_PER_CAR = 10;

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];

export function renderNumberTrainActivity(
  parent: HTMLElement,
  options: NumberTrainOptions
): void {
  destroyNumberTrainActivity();

  let plan: NumberTrainPlan;
  try {
    plan = buildFoundationPlan(getMaxQuantity(options.activity));
  } catch {
    renderActivityUnavailable(parent);
    return;
  }

  const round = plan.rounds[0];
  if (!round || round.kind !== 'count_train') {
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

  container = document.createElement('div');
  container.className = 'child-container activity-screen number-train-screen';
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
  prompt.textContent = round.prompt;
  container.appendChild(prompt);

  const train = buildTrainVisual(round.quantity);
  container.appendChild(train);

  const grid = document.createElement('div');
  grid.className = 'activity-choice-grid number-train__choices';
  grid.setAttribute('aria-label', 'Number choices');

  const choiceButtons = new Map<number, HTMLButtonElement>();

  for (const choice of round.choices) {
    const button = document.createElement('button');
    button.className = 'activity-choice number-train__number-choice';
    button.type = 'button';
    button.setAttribute('aria-label', String(choice));
    button.dataset.choiceId = String(choice);

    const label = document.createElement('span');
    label.className = 'activity-choice__label number-train__numeral';
    label.textContent = String(choice);
    button.appendChild(label);

    const onChoiceClick = () => {
      if (isComplete) return;

      attemptNumber += 1;
      const responseTimeMs = Date.now() - attemptStartedAt;
      const isCorrect = choice === round.quantity;

      options.onEvent(
        createAttemptEvent({
          options,
          round,
          plan,
          outcome: isCorrect ? 'correct' : 'incorrect',
          selected: choice,
          attemptNumber,
          responseTimeMs,
          hintShown,
        })
      );

      if (isCorrect) {
        isComplete = true;
        button.classList.add('is-correct');
        for (const other of choiceButtons.values()) other.disabled = true;
        showFeedback(feedback, correctFeedback.speech ?? 'That is right.', 'success');
        speakAndPlay(options, correctFeedback);

        options.onEvent(
          createAttemptEvent({
            options,
            round,
            plan,
            outcome: 'completed',
            selected: choice,
            attemptNumber,
            responseTimeMs,
            hintShown,
          })
        );

        completeActions.hidden = false;
        return;
      }

      button.classList.add('is-incorrect');
      window.setTimeout(() => {
        button.classList.remove('is-incorrect');
      }, 500);

      showFeedback(feedback, incorrectFeedback.speech ?? 'Let us count again.', 'support');
      speakAndPlay(options, incorrectFeedback);

      if (!hintShown && attemptNumber >= maxAttemptsBeforeHint) {
        hintShown = true;
        // Structural hint: emphasize the occupied seats so the child can count
        // them, speak the count, and highlight the matching numeral.
        train.classList.add('is-counting');
        showFeedback(feedback, hintFeedback.speech ?? 'Count each passenger.', 'hint');
        speakAndPlay(options, hintFeedback);
        if (hintFeedback.highlight_target !== false) {
          choiceButtons.get(round.quantity)?.classList.add('is-hinted');
        }

        options.onEvent(
          createAttemptEvent({
            options,
            round,
            plan,
            outcome: 'hint_used',
            selected: choice,
            attemptNumber,
            responseTimeMs,
            hintShown,
          })
        );
      }

      attemptStartedAt = Date.now();
    };

    button.addEventListener('click', onChoiceClick);
    cleanupHandlers.push(() => button.removeEventListener('click', onChoiceClick));
    choiceButtons.set(choice, button);
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
  options.speech.speak(round.prompt);
}

export function destroyNumberTrainActivity(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  if (container) {
    container.remove();
    container = null;
  }
}

/**
 * Build the structured train: an engine plus one car per started group of ten,
 * each car a stable 2×5 seat grid filled left-to-right so fives and tens read
 * at a glance. Works for 0–50 (0 shows one empty car).
 */
function buildTrainVisual(quantity: number): HTMLElement {
  const train = document.createElement('div');
  train.className = 'number-train';
  train.setAttribute('role', 'img');
  train.setAttribute(
    'aria-label',
    `A train carrying ${quantity} ${quantity === 1 ? 'passenger' : 'passengers'}`
  );

  const engine = document.createElement('div');
  engine.className = 'number-train__engine';
  engine.innerHTML = trainEngineSvg();
  train.appendChild(engine);

  const carCount = Math.max(1, Math.ceil(quantity / SEATS_PER_CAR));
  for (let carIndex = 0; carIndex < carCount; carIndex += 1) {
    const car = document.createElement('div');
    car.className = 'number-train__car';

    const seats = document.createElement('div');
    seats.className = 'number-train__seats';

    const occupiedInCar = Math.min(
      Math.max(quantity - carIndex * SEATS_PER_CAR, 0),
      SEATS_PER_CAR
    );

    for (let seatIndex = 0; seatIndex < SEATS_PER_CAR; seatIndex += 1) {
      const seat = document.createElement('div');
      seat.className = 'number-train__seat';
      if (seatIndex < occupiedInCar) {
        seat.classList.add('is-occupied');
        seat.innerHTML = passengerSvg();
      }
      seats.appendChild(seat);
    }

    car.appendChild(seats);
    train.appendChild(car);
  }

  return train;
}

function getMaxQuantity(activity: LearningActivity): number {
  const value = activity.content.max_quantity;
  return typeof value === 'number' ? value : 20;
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

function speakAndPlay(options: NumberTrainOptions, feedback: FeedbackRule): void {
  if (feedback.speech) {
    options.speech.speak(feedback.speech);
  }
  if (feedback.sound) {
    options.audio.play(feedback.sound);
  }
}

function createAttemptEvent(params: {
  options: NumberTrainOptions;
  round: CountTrainRound;
  plan: NumberTrainPlan;
  outcome: ActivityAttemptEvent['outcome'];
  selected: number;
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
}): ActivityAttemptEvent {
  const { options, round, plan } = params;
  return {
    event_id: createEventId(),
    session_id: options.sessionId,
    child_id: options.childId,
    activity_id: options.activity.id,
    activity_version: options.activity.version,
    skill_ids: options.activity.skill_ids,
    timestamp: new Date().toISOString(),
    prompt_text: round.prompt,
    outcome: params.outcome,
    selected_choice_id: String(params.selected),
    correct_choice_id: String(round.quantity),
    selected_answer: String(params.selected),
    correct_answer: String(round.quantity),
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: options.activity.difficulty.level,
    choice_count: options.activity.difficulty.choice_count,
    distractor_strength: options.activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: params.hintShown,
    metadata: {
      game: 'number-train',
      round_type: round.kind,
      round_index: 1,
      round_total: plan.rounds.length,
      target_quantity: round.quantity,
    },
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
