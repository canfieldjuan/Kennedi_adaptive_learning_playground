/**
 * Number Train runtime — the first real Math game (arc slice 2: session).
 *
 * The child rides one continuous train trip: a deterministic, seeded session of
 * graduated Count-the-Train rounds. Each car holds ten seats in a stable 2×5
 * layout so groups of five and ten are visually obvious (7 = seven occupied
 * seats; 14 = one full car and four seats). A journey strip of station markers
 * shows the trip's progress — the train reaching the station is the progress
 * representation; there are no points, streaks, or timers. The trip ends in a
 * one-time deterministic arrival with large Play Again / Home controls; replay
 * builds a new valid plan from the next stable seed. Load-the-Train and
 * Missing Station rounds land in later slices.
 */

import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../types/runtime';
import type {
  CountTrainRound,
  NumberTrainPlan,
  NumberTrainSessionConfig,
} from './number-train.types';
import { buildSessionPlan } from './round-plan';
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
let timeoutHandles: number[] = [];

export function renderNumberTrainActivity(
  parent: HTMLElement,
  options: NumberTrainOptions
): void {
  destroyNumberTrainActivity();

  const config = getSessionConfig(options.activity);
  const correctFeedback = getFeedbackRule(options.activity.feedback_rules.correct);
  const incorrectFeedback = getFeedbackRule(options.activity.feedback_rules.incorrect);
  const hintFeedback = getFeedbackRule(options.activity.feedback_rules.hint);
  const maxAttemptsBeforeHint = getNumberRule(
    options.activity.success_rules.max_attempts_before_hint,
    2
  );

  container = document.createElement('div');
  container.className = 'child-container activity-screen number-train-screen';
  container.id = `activity-${options.activity.id}`;
  parent.appendChild(container);

  let replayIndex = 0;

  startSession(replayIndex);

  /**
   * (Re)build the whole trip for one seed offset. Play Again advances the
   * offset so every replay is a fresh but still deterministic plan.
   */
  function startSession(seedOffset: number): void {
    if (!container) return;
    runSessionCleanup();
    container.innerHTML = '';

    let plan: NumberTrainPlan;
    try {
      plan = buildSessionPlan({ ...config, seed: config.seed + seedOffset });
    } catch {
      renderSessionUnavailable();
      return;
    }

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

    // Journey strip: one station marker per round; the trip's only progress
    // representation (no score, no points).
    const journey = document.createElement('div');
    journey.className = 'number-train__journey';
    journey.setAttribute('role', 'img');
    journey.setAttribute('aria-label', `Trip with ${plan.rounds.length} stations`);
    const stations: HTMLElement[] = [];
    for (let index = 0; index < plan.rounds.length; index += 1) {
      const station = document.createElement('span');
      station.className = 'number-train__station';
      journey.appendChild(station);
      stations.push(station);
    }
    container.appendChild(journey);

    const prompt = document.createElement('p');
    prompt.className = 'activity-prompt';
    container.appendChild(prompt);

    const stage = document.createElement('div');
    stage.className = 'number-train__stage';
    container.appendChild(stage);

    const grid = document.createElement('div');
    grid.className = 'activity-choice-grid number-train__choices';
    grid.setAttribute('aria-label', 'Number choices');
    container.appendChild(grid);

    const feedback = document.createElement('p');
    feedback.className = 'activity-feedback';
    feedback.setAttribute('aria-live', 'polite');
    container.appendChild(feedback);

    const completeActions = document.createElement('div');
    completeActions.className = 'activity-complete-actions';
    completeActions.hidden = true;
    container.appendChild(completeActions);

    renderRound(0);

    function renderRound(roundIndex: number): void {
      const round = plan.rounds[roundIndex];
      if (!round || round.kind !== 'count_train') {
        renderSessionUnavailable();
        return;
      }

      let attemptNumber = 0;
      let hintShown = false;
      let roundDone = false;
      let attemptStartedAt = Date.now();

      for (const [index, station] of stations.entries()) {
        station.classList.remove('is-current');
        if (index === roundIndex) station.classList.add('is-current');
        if (index < roundIndex) station.classList.add('is-done');
      }

      prompt.textContent = round.prompt;
      feedback.textContent = '';
      completeActions.hidden = true;
      completeActions.innerHTML = '';

      stage.innerHTML = '';
      const train = buildTrainVisual(round.quantity);
      stage.appendChild(train);

      grid.innerHTML = '';
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
          if (roundDone) return;

          attemptNumber += 1;
          const responseTimeMs = Date.now() - attemptStartedAt;
          const isCorrect = choice === round.quantity;

          options.onEvent(
            createAttemptEvent({
              options,
              round,
              plan,
              roundIndex,
              outcome: isCorrect ? 'correct' : 'incorrect',
              selected: choice,
              attemptNumber,
              responseTimeMs,
              hintShown,
            })
          );

          if (isCorrect) {
            roundDone = true;
            button.classList.add('is-correct');
            for (const other of choiceButtons.values()) other.disabled = true;
            stations[roundIndex]?.classList.add('is-done');

            const isLastRound = roundIndex === plan.rounds.length - 1;
            showFeedback(
              feedback,
              `Yes! ${round.quantity} ${round.quantity === 1 ? 'passenger' : 'passengers'}. ${correctFeedback.speech ?? 'All aboard!'}`,
              'success'
            );
            options.speech.speak(
              `Yes! ${round.quantity} ${round.quantity === 1 ? 'passenger' : 'passengers'}. ${correctFeedback.speech ?? 'All aboard!'}`
            );
            if (correctFeedback.sound) options.audio.play(correctFeedback.sound);

            if (isLastRound) {
              finishSession(round, roundIndex, attemptNumber, responseTimeMs, hintShown);
            } else {
              const nextButton = document.createElement('button');
              nextButton.className = 'child-button number-train__next';
              nextButton.type = 'button';
              nextButton.textContent = 'Next station';
              nextButton.addEventListener('click', () => {
                renderRound(roundIndex + 1);
              });
              completeActions.appendChild(nextButton);
              completeActions.hidden = false;
            }
            return;
          }

          button.classList.add('is-incorrect');
          const handle = window.setTimeout(() => {
            button.classList.remove('is-incorrect');
          }, 500);
          timeoutHandles.push(handle);

          showFeedback(
            feedback,
            incorrectFeedback.speech ?? 'Let us count again.',
            'support'
          );
          speakAndPlay(options, incorrectFeedback);

          if (!hintShown && attemptNumber >= maxAttemptsBeforeHint) {
            hintShown = true;
            train.classList.add('is-counting');
            const hintText = buildCountingHint(round.quantity);
            showFeedback(feedback, hintText, 'hint');
            options.speech.speak(hintText);
            if (hintFeedback.sound) options.audio.play(hintFeedback.sound);
            if (hintFeedback.highlight_target !== false) {
              choiceButtons.get(round.quantity)?.classList.add('is-hinted');
            }

            options.onEvent(
              createAttemptEvent({
                options,
                round,
                plan,
                roundIndex,
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

      options.speech.speak(round.prompt);
    }

    /** One-time deterministic arrival: the trip ends, no reward loop. */
    function finishSession(
      round: CountTrainRound,
      roundIndex: number,
      attemptNumber: number,
      responseTimeMs: number,
      hintShown: boolean
    ): void {
      options.onEvent(
        createAttemptEvent({
          options,
          round,
          plan,
          roundIndex,
          outcome: 'completed',
          selected: round.quantity,
          attemptNumber,
          responseTimeMs,
          hintShown,
        })
      );

      container?.classList.add('is-arrived');
      stage.classList.add('number-train__stage--arrived');
      const arrivalText = getArrivalAudio(options.activity);
      showFeedback(feedback, arrivalText, 'success');
      options.speech.speak(arrivalText);

      const playAgainButton = document.createElement('button');
      playAgainButton.className = 'child-button number-train__play-again';
      playAgainButton.type = 'button';
      playAgainButton.textContent = 'Play Again';
      playAgainButton.addEventListener('click', () => {
        container?.classList.remove('is-arrived');
        replayIndex += 1;
        startSession(replayIndex);
      });
      completeActions.appendChild(playAgainButton);

      const doneHomeButton = document.createElement('button');
      doneHomeButton.className = 'child-button';
      doneHomeButton.type = 'button';
      doneHomeButton.textContent = 'Home';
      doneHomeButton.addEventListener('click', () => {
        window.location.hash = '#home';
      });
      completeActions.appendChild(doneHomeButton);
      completeActions.hidden = false;
    }
  }

  function renderSessionUnavailable(): void {
    if (!container) return;
    container.innerHTML = '';

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
  }
}

export function destroyNumberTrainActivity(): void {
  runSessionCleanup();

  if (container) {
    container.remove();
    container = null;
  }
}

function runSessionCleanup(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  for (const handle of timeoutHandles) {
    if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
      window.clearTimeout(handle);
    }
  }
  timeoutHandles = [];
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

/**
 * Structural counting hint. Up to ten: count along seat by seat. Above ten:
 * teach the tens structure — one full car is ten, then count on.
 */
function buildCountingHint(quantity: number): string {
  if (quantity <= SEATS_PER_CAR) {
    const counts = Array.from({ length: quantity }, (_, i) => String(i + 1));
    return `Count each passenger: ${counts.join(', ')}.`;
  }
  const countOn = Array.from(
    { length: quantity - SEATS_PER_CAR + 1 },
    (_, i) => String(SEATS_PER_CAR + i)
  );
  return `One full car is ten passengers. Count on: ${countOn.join(', ')}.`;
}

function getSessionConfig(activity: LearningActivity): NumberTrainSessionConfig {
  const content = activity.content as Record<string, unknown>;
  return {
    seed: typeof content.seed === 'number' ? content.seed : 1,
    round_count: typeof content.round_count === 'number' ? content.round_count : 6,
    max_quantity: typeof content.max_quantity === 'number' ? content.max_quantity : 20,
  };
}

function getArrivalAudio(activity: LearningActivity): string {
  const value = activity.content.arrival_audio;
  return typeof value === 'string'
    ? value
    : 'The train reached the station! What a trip!';
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
  roundIndex: number;
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
      round_index: params.roundIndex + 1,
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
