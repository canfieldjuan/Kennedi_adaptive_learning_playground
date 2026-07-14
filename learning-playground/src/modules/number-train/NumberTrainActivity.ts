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
  LoadTrainRound,
  MissingStationRound,
  NumberTrainRound,
  NumberTrainPlan,
  NumberTrainSessionConfig,
} from './number-train.types';
import { buildSessionPlan } from './round-plan';
import {
  NUMBER_TRAIN_WORLDS,
  resolveNumberTrainWorld,
} from './world-registry';
import {
  readWorldPreference,
  saveWorldPreference,
} from './world-preference';
import { worldChromeBackground } from './world-pack.types';
import type { NumberTrainWorldPack } from './world-pack.types';
import {
  SEATS_PER_CAR,
  DEFAULT_SUCCESS_TAIL,
  countSuccessLine,
  loadSuccessLine,
  sequenceSuccessLine,
  loadSupportLine,
  loadStructuralHintLine,
  buildCountingHint,
  buildSequenceHint,
} from './train-lines';

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



// The active world pack: the game's fantasy provider. Resolved per mount;
// the child's world selection slice will pass a saved preference here.
let activeWorld: NumberTrainWorldPack = resolveNumberTrainWorld();

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
  container.className = 'child-container activity-screen number-train-screen train-station';
  container.id = `activity-${options.activity.id}`;
  parent.appendChild(container);

  let replayIndex = 0;

  // "Kennedi picks": with more than one world, the session opens on the
  // world choice — two big picture cards, spoken labels, one Start. The
  // choice is expression, never progression: nothing is locked, priced,
  // starred, or earned. With a single world the selector is skipped.
  if (NUMBER_TRAIN_WORLDS.length > 1) {
    renderWorldChoice();
  } else {
    startSession(replayIndex);
  }

  function renderWorldChoice(): void {
    if (!container) return;
    runSessionCleanup();
    container.innerHTML = '';

    const preselected = resolveNumberTrainWorld(readWorldPreference());
    let selectedId = preselected.id;
    container.dataset.world = selectedId;

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
    container.appendChild(topBar);

    const heading = document.createElement('h1');
    heading.className = 'activity-title world-choice__title';
    heading.textContent = 'Which world today?';
    container.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'world-choice';
    grid.setAttribute('aria-label', 'World choices');

    const cards = new Map<string, HTMLButtonElement>();
    for (const world of NUMBER_TRAIN_WORLDS) {
      const card = document.createElement('button');
      card.className = 'world-choice__card';
      card.type = 'button';
      card.setAttribute('aria-label', world.label);
      card.setAttribute('aria-pressed', String(world.id === selectedId));
      card.innerHTML = `<span class="world-choice__preview" aria-hidden="true">${world.previewSvg()}</span>
        <span class="world-choice__label">${world.label}</span>`;
      const onPick = () => {
        selectedId = world.id;
        if (container) container.dataset.world = selectedId;
        for (const [id, other] of cards) {
          other.classList.toggle('is-selected', id === selectedId);
          other.setAttribute('aria-pressed', String(id === selectedId));
        }
        options.speech.speak(world.spokenLabel);
      };
      card.addEventListener('click', onPick);
      cleanupHandlers.push(() => card.removeEventListener('click', onPick));
      if (world.id === selectedId) card.classList.add('is-selected');
      cards.set(world.id, card);
      grid.appendChild(card);
    }
    container.appendChild(grid);

    const startButton = document.createElement('button');
    startButton.className = 'child-button world-choice__start';
    startButton.type = 'button';
    startButton.textContent = 'Start';
    startButton.setAttribute('aria-label', 'Start the trip');
    const onStart = () => {
      saveWorldPreference(selectedId);
      startSession(replayIndex);
    };
    startButton.addEventListener('click', onStart);
    cleanupHandlers.push(() => startButton.removeEventListener('click', onStart));
    container.appendChild(startButton);

    options.speech.speak('Which world today?');
  }

  /**
   * (Re)build the whole trip for one seed offset. Play Again advances the
   * offset so every replay is a fresh but still deterministic plan.
   */
  function startSession(seedOffset: number): void {
    if (!container) return;
    runSessionCleanup();
    container.innerHTML = '';

    // The world's decorative scene (inert — aria-hidden, no pointer events,
    // nothing countable) remounted with each trip because Play Again rebuilds
    // the container. The world pack also scopes the palette: values the
    // runtime applies as CSS custom properties on the activity container.
    activeWorld = resolveNumberTrainWorld(readWorldPreference());
    container.dataset.world = activeWorld.id;
    container.style.setProperty('--world-vehicle-body', activeWorld.palette.vehicleBody);
    container.style.setProperty('--world-seat-occupied', activeWorld.palette.seatOccupied);
    container.style.setProperty('--world-text-ink', activeWorld.palette.textInk);
    container.style.setProperty('--world-text-soft', activeWorld.palette.textSoft);
    container.style.setProperty('--world-chrome-bg', worldChromeBackground(activeWorld.palette.textInk));
    container.appendChild(activeWorld.mountEnvironment());

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
      if (!round) {
        renderSessionUnavailable();
        return;
      }

      // Common round scaffolding: journey state, prompt, cleared stage/grid.
      for (const [index, station] of stations.entries()) {
        station.classList.remove('is-current');
        if (index === roundIndex) station.classList.add('is-current');
        if (index < roundIndex) station.classList.add('is-done');
      }
      journey.setAttribute(
        'aria-label',
        `Trip: station ${roundIndex + 1} of ${plan.rounds.length}`
      );
      prompt.textContent = round.prompt;
      feedback.textContent = '';
      completeActions.hidden = true;
      completeActions.innerHTML = '';
      stage.innerHTML = '';
      grid.innerHTML = '';

      if (round.kind === 'count_train') {
        renderCountRound(round, roundIndex);
      } else if (round.kind === 'load_train') {
        renderLoadRound(round, roundIndex);
      } else {
        renderMissingStationRound(round, roundIndex);
      }
    }

    function renderCountRound(round: CountTrainRound, roundIndex: number): void {
      let attemptNumber = 0;
      let hintShown = false;
      let roundDone = false;
      let attemptStartedAt = Date.now();

      const { train } = buildTrainVisual(round.quantity);
      stage.appendChild(train);

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
              countSuccessLine(round.quantity, correctFeedback.speech ?? DEFAULT_SUCCESS_TAIL),
              'success'
            );
            options.speech.speak(
              countSuccessLine(round.quantity, correctFeedback.speech ?? DEFAULT_SUCCESS_TAIL)
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

    /**
     * Load the Train — quantity construction. The train renders with enough
     * cars for the target but empty; the child seats passengers by tapping
     * seats or the large Add/Remove controls, then presses Check. Evaluated
     * only on Check (seat taps emit no events); attempt_number counts Checks.
     */
    function renderLoadRound(round: LoadTrainRound, roundIndex: number): void {
      let checkCount = 0;
      let hintShown = false;
      let roundDone = false;
      let attemptStartedAt = Date.now();

      const { train, seats } = buildTrainVisual(0, {
        capacityFor: round.target,
        tappableSeats: true,
      });
      stage.appendChild(train);

      const seatedCount = (): number =>
        seats.filter((seat) => seat.classList.contains('is-occupied')).length;

      const clearSeatHint = (): void => {
        for (const seat of seats) seat.classList.remove('is-next-hint');
      };

      const setSeat = (seat: HTMLElement, occupied: boolean): void => {
        if (occupied) {
          seat.classList.add('is-occupied');
          seat.innerHTML = activeWorld.passengerSvg();
          seat.setAttribute('aria-label', 'Seat with passenger. Tap to remove.');
        } else {
          seat.classList.remove('is-occupied');
          seat.innerHTML = '';
          seat.setAttribute('aria-label', 'Empty seat. Tap to add a passenger.');
        }
      };

      for (const seat of seats) {
        setSeat(seat, false);
        const onSeatTap = () => {
          if (roundDone) return;
          clearSeatHint();
          setSeat(seat, !seat.classList.contains('is-occupied'));
        };
        seat.addEventListener('click', onSeatTap);
        cleanupHandlers.push(() => seat.removeEventListener('click', onSeatTap));
      }

      // Large, preschool-safe controls mirroring the direct seat taps.
      const addButton = document.createElement('button');
      addButton.className = 'child-button number-train__load-control';
      addButton.type = 'button';
      addButton.textContent = 'Add passenger';
      const onAdd = () => {
        if (roundDone) return;
        clearSeatHint();
        const empty = seats.find((seat) => !seat.classList.contains('is-occupied'));
        if (empty) setSeat(empty, true);
      };
      addButton.addEventListener('click', onAdd);
      cleanupHandlers.push(() => addButton.removeEventListener('click', onAdd));
      grid.appendChild(addButton);

      const removeButton = document.createElement('button');
      removeButton.className = 'child-button number-train__load-control';
      removeButton.type = 'button';
      removeButton.textContent = 'Remove';
      const onRemove = () => {
        if (roundDone) return;
        clearSeatHint();
        const occupied = [...seats]
          .reverse()
          .find((seat) => seat.classList.contains('is-occupied'));
        if (occupied) setSeat(occupied, false);
      };
      removeButton.addEventListener('click', onRemove);
      cleanupHandlers.push(() => removeButton.removeEventListener('click', onRemove));
      grid.appendChild(removeButton);

      const checkButton = document.createElement('button');
      checkButton.className = 'child-button number-train__check';
      checkButton.type = 'button';
      checkButton.textContent = 'Check';
      const onCheck = () => {
        if (roundDone) return;

        checkCount += 1;
        const responseTimeMs = Date.now() - attemptStartedAt;
        const built = seatedCount();
        const isCorrect = built === round.target;

        options.onEvent(
          createAttemptEvent({
            options,
            round,
            plan,
            roundIndex,
            outcome: isCorrect ? 'correct' : 'incorrect',
            selected: built,
            attemptNumber: checkCount,
            responseTimeMs,
            hintShown,
          })
        );

        if (isCorrect) {
          roundDone = true;
          clearSeatHint();
          for (const seat of seats) (seat as HTMLButtonElement).disabled = true;
          addButton.disabled = true;
          removeButton.disabled = true;
          checkButton.disabled = true;
          stations[roundIndex]?.classList.add('is-done');

          const line = loadSuccessLine(round.target, correctFeedback.speech ?? DEFAULT_SUCCESS_TAIL);
          showFeedback(feedback, line, 'success');
          options.speech.speak(line);
          if (correctFeedback.sound) options.audio.play(correctFeedback.sound);

          if (roundIndex === plan.rounds.length - 1) {
            finishSession(round, roundIndex, checkCount, responseTimeMs, hintShown);
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

        const diff = round.target - built;
        const supportLine = loadSupportLine(diff);
        showFeedback(feedback, supportLine, 'support');
        options.speech.speak(supportLine);
        if (incorrectFeedback.sound) options.audio.play(incorrectFeedback.sound);

        if (!hintShown && checkCount >= maxAttemptsBeforeHint) {
          hintShown = true;
          // Structural hint: say where the count stands and light the seat to
          // act on next. Never fill or empty seats for the child.
          const hintLine = loadStructuralHintLine(built, diff);
          showFeedback(feedback, hintLine, 'hint');
          options.speech.speak(hintLine);
          if (hintFeedback.sound) options.audio.play(hintFeedback.sound);

          const hintSeat =
            diff > 0
              ? seats.find((seat) => !seat.classList.contains('is-occupied'))
              : [...seats]
                  .reverse()
                  .find((seat) => seat.classList.contains('is-occupied'));
          hintSeat?.classList.add('is-next-hint');

          options.onEvent(
            createAttemptEvent({
              options,
              round,
              plan,
              roundIndex,
              outcome: 'hint_used',
              selected: built,
              attemptNumber: checkCount,
              responseTimeMs,
              hintShown,
            })
          );
        }

        attemptStartedAt = Date.now();
      };
      checkButton.addEventListener('click', onCheck);
      cleanupHandlers.push(() => checkButton.removeEventListener('click', onCheck));
      grid.appendChild(checkButton);

      options.speech.speak(round.prompt);
    }

    /**
     * Missing Station — number sequence. A short consecutive number path of
     * station signs along the track with one blanked numeral; the child picks
     * the missing number. The hint walks the track one number at a time.
     */
    function renderMissingStationRound(
      round: MissingStationRound,
      roundIndex: number
    ): void {
      let attemptNumber = 0;
      let hintShown = false;
      let roundDone = false;
      let attemptStartedAt = Date.now();

      const answer = round.sequence[round.missing_index];

      const path = document.createElement('div');
      path.className = 'number-train__path';
      path.setAttribute('role', 'img');
      path.setAttribute(
        'aria-label',
        `Number track: ${round.sequence
          .map((value, i) => (i === round.missing_index ? 'blank' : String(value)))
          .join(', ')}`
      );

      const engine = document.createElement('div');
      engine.className = 'number-train__engine number-train__engine--path';
      engine.innerHTML = activeWorld.vehicleFrontSvg();
      path.appendChild(engine);

      const stops: HTMLElement[] = [];
      for (const [i, value] of round.sequence.entries()) {
        const stop = document.createElement('span');
        stop.className = 'number-train__path-stop';
        if (i === round.missing_index) {
          stop.classList.add('is-missing');
          stop.textContent = '?';
        } else {
          stop.textContent = String(value);
        }
        stop.style.animationDelay = `${i * 300}ms`;
        path.appendChild(stop);
        stops.push(stop);
      }
      stage.appendChild(path);

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
          const isCorrect = choice === answer;

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

            // The blank fills with the found number.
            const missingStop = stops[round.missing_index];
            if (missingStop) {
              missingStop.textContent = String(answer);
              missingStop.classList.remove('is-missing');
              missingStop.classList.add('is-filled');
            }

            const line = sequenceSuccessLine(round.sequence, correctFeedback.speech ?? DEFAULT_SUCCESS_TAIL);
            showFeedback(feedback, line, 'success');
            options.speech.speak(line);
            if (correctFeedback.sound) options.audio.play(correctFeedback.sound);

            if (roundIndex === plan.rounds.length - 1) {
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
            // Walk the track one number at a time: speak the sequence with the
            // blank and ask what comes next; the signs pulse in order.
            path.classList.add('is-walking');
            const hintText = buildSequenceHint(round);
            showFeedback(feedback, hintText, 'hint');
            options.speech.speak(hintText);
            if (hintFeedback.sound) options.audio.play(hintFeedback.sound);
            if (hintFeedback.highlight_target !== false) {
              choiceButtons.get(answer)?.classList.add('is-hinted');
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
      round: NumberTrainRound,
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
          selected: correctAnswerOf(round),
          attemptNumber,
          responseTimeMs,
          hintShown,
        })
      );

      container?.classList.add('is-arrived');
      stage.classList.add('number-train__stage--arrived');
      const arrivalText =
        activeWorld.flavor?.arrivalLine ?? getArrivalAudio(options.activity);
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
 * at a glance. Works for 0–50 (0 shows one empty car). `capacityFor` sizes the
 * cars for a target the child will build toward; `tappableSeats` renders seats
 * as buttons for the Load-the-Train interaction.
 */
function buildTrainVisual(
  quantity: number,
  options?: { capacityFor?: number; tappableSeats?: boolean }
): { train: HTMLElement; seats: HTMLElement[] } {
  const train = document.createElement('div');
  train.className = 'number-train';
  const allSeats: HTMLElement[] = [];

  if (options?.tappableSeats) {
    train.setAttribute('aria-label', 'Train seats');
  } else {
    train.setAttribute('role', 'img');
    train.setAttribute(
      'aria-label',
      `A train carrying ${quantity} ${quantity === 1 ? 'passenger' : 'passengers'}`
    );
  }

  const engine = document.createElement('div');
  engine.className = 'number-train__engine';
  engine.innerHTML = activeWorld.vehicleFrontSvg();
  train.appendChild(engine);

  const capacityBasis = Math.max(quantity, options?.capacityFor ?? 0);
  const carCount = Math.max(1, Math.ceil(capacityBasis / SEATS_PER_CAR));
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
      const seat = document.createElement(options?.tappableSeats ? 'button' : 'div');
      seat.className = 'number-train__seat';
      if (options?.tappableSeats) {
        seat.classList.add('number-train__seat--tap');
        (seat as HTMLButtonElement).type = 'button';
      }
      if (seatIndex < occupiedInCar) {
        seat.classList.add('is-occupied');
        seat.innerHTML = activeWorld.passengerSvg();
      }
      seats.appendChild(seat);
      allSeats.push(seat);
    }

    car.appendChild(seats);
    train.appendChild(car);
  }

  return { train, seats: allSeats };
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

/** The evaluated answer a round is scored against. */
function correctAnswerOf(round: NumberTrainRound): number {
  if (round.kind === 'count_train') return round.quantity;
  if (round.kind === 'load_train') return round.target;
  return round.sequence[round.missing_index];
}

/**
 * Which curriculum skills a round actually exercises. Count rounds pair
 * counting with reading the written numeral; load rounds pair counting with
 * constructing the quantity; missing-station rounds pair number order with
 * reading the numeral. Never subitizing — structured counting is not
 * subitizing evidence.
 */
function roundSkillIds(round: NumberTrainRound): string[] {
  if (round.kind === 'count_train') return ['counting', 'numeral_recognition'];
  if (round.kind === 'load_train') return ['counting', 'quantity_construction'];
  return ['number_sequence', 'numeral_recognition'];
}

/**
 * Which skills a round's structural hint actually teaches. The count hint is a
 * count-along, the load hint teaches counting on toward the construction, and
 * the sequence hint walks the number order — the highlighted numeral is target
 * marking, not numeral-recognition teaching, so recognition is never marked
 * hinted. Hint evidence attaches only to these skills.
 */
function hintedSkillIdsFor(round: NumberTrainRound): string[] {
  if (round.kind === 'count_train') return ['counting'];
  if (round.kind === 'load_train') return ['counting', 'quantity_construction'];
  return ['number_sequence'];
}

function createAttemptEvent(params: {
  options: NumberTrainOptions;
  round: NumberTrainRound;
  plan: NumberTrainPlan;
  roundIndex: number;
  outcome: ActivityAttemptEvent['outcome'];
  selected: number;
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
}): ActivityAttemptEvent {
  const { options, round, plan } = params;
  const answer = correctAnswerOf(round);
  // Hint events attach only to the skills the hint teaches; other events carry
  // the round's full skill set. Post-hint events name the hinted skills in
  // metadata so per-skill hint attribution stays precise downstream.
  const hintedSkillIds = hintedSkillIdsFor(round);
  const skillIds =
    params.outcome === 'hint_used' ? hintedSkillIds : roundSkillIds(round);
  return {
    event_id: createEventId(),
    session_id: options.sessionId,
    child_id: options.childId,
    activity_id: options.activity.id,
    activity_version: options.activity.version,
    skill_ids: skillIds,
    timestamp: new Date().toISOString(),
    prompt_text: round.prompt,
    outcome: params.outcome,
    skill_outcomes: skillIds.map((skillId) => ({
      skill_id: skillId,
      outcome: params.outcome,
    })),
    selected_choice_id: String(params.selected),
    correct_choice_id: String(answer),
    selected_answer: String(params.selected),
    correct_answer: String(answer),
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
      target_quantity: answer,
      // Names the skills the hint taught so per-skill hint attribution stays
      // precise on post-hint events (skill-outcomes.ts getHintedSkillIds).
      ...(params.hintShown
        ? { hinted_skill_ids: hintedSkillIds.join(',') }
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
