/**
 * Kennedi's Story Stage — the storytelling route view.
 *
 * The runtime deliberately has NO event sink: story choices are narrative
 * preferences, never assessments, so this module cannot emit attempt
 * events, skill evidence, or correctness of any kind. It takes the local
 * speech service and nothing else.
 *
 * Two phases inside the one route (arc slice 3):
 *
 * 1. SETUP — Pick Three: character → place → problem, one focused step at
 *    a time. Tapping a card speaks its authored line and shows a selected
 *    state without advancing; a large Next control (enabled only once the
 *    step has a pick) moves forward; a visual summary with one large
 *    Start control launches the story. Steps only offer entities some
 *    family supports given the picks so far, so every reachable trio
 *    resolves to a real story.
 * 2. STORY — the resolved tale plays exactly as slice 2 shipped it: each
 *    scene shows its illustration and a one-line caption, narrates one
 *    beat, and waits; no autoplay between scenes; endings offer Tell It
 *    Again, New Story (back to setup), and Home.
 */

import type { SpeechServiceInterface } from '../../types/runtime';
import { FIRST_STORY_PACK } from './first-tale';
import type {
  ResolvedScene,
  ResolvedStory,
  StorySelection,
} from './story-pack.types';
import { resolveStory } from './story-resolver';
import { findFamilyFor, selectableEntities } from './story-selection';
import { storyCardSvg, storyChoiceSvg, storySceneSvg } from './story-art';

interface StoryStageOptions {
  speech: SpeechServiceInterface;
}

interface SetupCardEntity {
  id: string;
  label: string;
  spokenIntro: string;
  art: string;
}

const SETUP_STEPS: Array<{
  key: keyof StorySelection;
  prompt: string;
}> = [
  { key: 'characterId', prompt: 'Who is the story about?' },
  { key: 'settingId', prompt: 'Where does it happen?' },
  { key: 'problemId', prompt: 'What happens?' },
];

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];
let activeSpeech: SpeechServiceInterface | null = null;

export function renderStoryStage(
  parent: HTMLElement,
  options: StoryStageOptions
): void {
  destroyStoryStage();
  activeSpeech = options.speech;

  const pack = FIRST_STORY_PACK;

  container = document.createElement('div');
  container.className = 'child-container activity-screen story-stage';
  container.id = 'story-stage';

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

  // Screen-reader title; the stage itself carries the visual identity.
  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = 'Story Stage';
  container.appendChild(title);

  // One region swapped between the setup and story phases.
  const body = document.createElement('div');
  body.className = 'story-stage__body';
  container.appendChild(body);

  parent.appendChild(container);

  function say(line: string): void {
    options.speech.stop();
    options.speech.speak(line);
  }

  // ——— Phase 1: Pick Three setup ———

  function renderSetup(): void {
    title.textContent = 'Story Stage';
    const selection: Partial<StorySelection> = {};
    renderSetupStep(0, selection);
  }

  function renderSetupStep(
    stepIndex: number,
    selection: Partial<StorySelection>
  ): void {
    const step = SETUP_STEPS[stepIndex];
    const options_ = selectableEntities(pack, selection);
    const entities: SetupCardEntity[] =
      step.key === 'characterId'
        ? options_.characters
        : step.key === 'settingId'
          ? options_.settings
          : options_.problems;

    body.innerHTML = '';

    const setup = document.createElement('div');
    setup.className = 'story-stage__setup';

    const stepTitle = document.createElement('h2');
    stepTitle.className = 'story-stage__step-title';
    stepTitle.textContent = step.prompt;
    setup.appendChild(stepTitle);

    const cards = document.createElement('div');
    cards.className = 'story-stage__cards';
    const cardButtons: HTMLElement[] = [];

    const nextButton = document.createElement('button');
    nextButton.className = 'child-button story-stage__next';
    nextButton.type = 'button';
    nextButton.textContent = 'Next';
    nextButton.setAttribute('aria-label', 'Next step');
    nextButton.disabled = true;

    for (const entity of entities) {
      const card = document.createElement('button');
      card.className = 'story-stage__card';
      card.type = 'button';
      card.setAttribute('aria-pressed', 'false');
      card.setAttribute('aria-label', entity.label);

      const art = document.createElement('span');
      art.className = 'story-stage__card-art';
      art.setAttribute('aria-hidden', 'true');
      art.innerHTML = storyCardSvg(entity.art);
      card.appendChild(art);

      const label = document.createElement('span');
      label.className = 'story-stage__card-label';
      label.textContent = entity.label;
      card.appendChild(label);

      // Selecting never advances: the child sees the response first and
      // moves on with the Next control (§7).
      const onPick = () => {
        selection[step.key] = entity.id;
        for (const other of cardButtons) {
          other.setAttribute('aria-pressed', 'false');
          other.classList.remove('story-stage__card--selected');
        }
        card.setAttribute('aria-pressed', 'true');
        card.classList.add('story-stage__card--selected');
        nextButton.disabled = false;
        say(entity.spokenIntro);
      };
      card.addEventListener('click', onPick);
      cleanupHandlers.push(() => card.removeEventListener('click', onPick));
      cardButtons.push(card);
      cards.appendChild(card);
    }
    setup.appendChild(cards);

    const onNext = () => {
      if (selection[step.key] === undefined) return;
      if (stepIndex + 1 < SETUP_STEPS.length) {
        renderSetupStep(stepIndex + 1, selection);
      } else {
        renderSummary(selection as StorySelection);
      }
    };
    nextButton.addEventListener('click', onNext);
    cleanupHandlers.push(() => nextButton.removeEventListener('click', onNext));
    setup.appendChild(nextButton);

    body.appendChild(setup);
    say(step.prompt);
  }

  function renderSummary(selection: StorySelection): void {
    body.innerHTML = '';

    const setup = document.createElement('div');
    setup.className = 'story-stage__setup';

    const summaryTitle = document.createElement('h2');
    summaryTitle.className = 'story-stage__step-title';
    summaryTitle.textContent = 'Your story is ready!';
    setup.appendChild(summaryTitle);

    const summary = document.createElement('div');
    summary.className = 'story-stage__summary';
    const maybePicks: Array<SetupCardEntity | undefined> = [
      pack.characters.find((entry) => entry.id === selection.characterId),
      pack.settings.find((entry) => entry.id === selection.settingId),
      pack.problems.find((entry) => entry.id === selection.problemId),
    ];
    const picks = maybePicks.filter(
      (entry): entry is SetupCardEntity => entry !== undefined
    );
    for (const pick of picks) {
      const item = document.createElement('div');
      item.className = 'story-stage__summary-item';

      const art = document.createElement('span');
      art.className = 'story-stage__card-art';
      art.setAttribute('aria-hidden', 'true');
      art.innerHTML = storyCardSvg(pick.art);
      item.appendChild(art);

      const label = document.createElement('span');
      label.className = 'story-stage__card-label';
      label.textContent = pick.label;
      item.appendChild(label);
      summary.appendChild(item);
    }
    setup.appendChild(summary);

    const startButton = document.createElement('button');
    startButton.className = 'child-button story-stage__start';
    startButton.type = 'button';
    startButton.textContent = 'Start the story';
    startButton.setAttribute('aria-label', 'Start the story');
    const onStart = () => {
      const family = findFamilyFor(pack, selection);
      if (!family) return; // unreachable: steps only offer supported combinations
      beginStory(resolveStory(pack, family.id, selection));
    };
    startButton.addEventListener('click', onStart);
    cleanupHandlers.push(() => startButton.removeEventListener('click', onStart));
    setup.appendChild(startButton);

    body.appendChild(setup);
    say('Your story is ready!');
  }

  // ——— Phase 2: the resolved story ———

  function beginStory(tale: ResolvedStory): void {
    const scenesById = new Map(tale.scenes.map((scene) => [scene.id, scene]));
    title.textContent = tale.title;
    container?.classList.remove('story-stage--ended');

    body.innerHTML = '';

    // Neutral story path: beginning → end, no outcomes, no pressure.
    const path = document.createElement('div');
    path.className = 'story-stage__path';
    path.setAttribute('role', 'img');
    path.setAttribute('aria-label', 'Story progress');
    const pathDots: HTMLElement[] = [];
    for (let index = 0; index < tale.pathLength; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'story-stage__path-dot';
      pathDots.push(dot);
      path.appendChild(dot);
    }
    body.appendChild(path);

    const stage = document.createElement('div');
    stage.className = 'story-stage__stage';

    const scenePicture = document.createElement('div');
    scenePicture.className = 'story-stage__scene';
    scenePicture.setAttribute('aria-hidden', 'true');
    stage.appendChild(scenePicture);
    body.appendChild(stage);

    // The one-line story caption — deliberately readable text so an adult
    // can tell the story aloud when speech is disabled.
    const caption = document.createElement('p');
    caption.className = 'story-stage__caption';
    caption.setAttribute('aria-live', 'polite');
    body.appendChild(caption);

    const controls = document.createElement('div');
    controls.className = 'story-stage__controls';
    body.appendChild(controls);

    let endingReached = false;

    function speakScene(scene: ResolvedScene): void {
      options.speech.stop();
      options.speech.speak(scene.narration);
    }

    function renderScene(sceneId: string, step: number): void {
      const scene = scenesById.get(sceneId);
      if (!scene || !container) return;

      for (const [index, dot] of pathDots.entries()) {
        dot.classList.toggle('is-done', index < step);
        dot.classList.toggle('is-current', index === step);
      }

      scenePicture.innerHTML = storySceneSvg(scene.art);
      caption.textContent = scene.narration;
      controls.innerHTML = '';

      if (scene.kind === 'decision' && scene.choices) {
        const choiceRow = document.createElement('div');
        choiceRow.className = 'story-stage__choices';
        for (const choice of scene.choices) {
          const button = document.createElement('button');
          button.className = 'story-stage__choice';
          button.type = 'button';
          button.setAttribute('aria-label', choice.label);

          const art = document.createElement('span');
          art.className = 'story-stage__choice-art';
          art.setAttribute('aria-hidden', 'true');
          art.innerHTML = storyChoiceSvg(choice.art);
          button.appendChild(art);

          const label = document.createElement('span');
          label.className = 'story-stage__choice-label';
          label.textContent = choice.label;
          button.appendChild(label);

          const onChoice = () => {
            renderScene(choice.next, step + 1);
            const nextScene = scenesById.get(choice.next);
            if (nextScene) speakScene(nextScene);
          };
          button.addEventListener('click', onChoice);
          cleanupHandlers.push(() => button.removeEventListener('click', onChoice));
          choiceRow.appendChild(button);
        }
        controls.appendChild(choiceRow);
        return;
      }

      if (scene.kind === 'ending') {
        if (!endingReached) {
          endingReached = true;
          container.classList.add('story-stage--ended');
        }
        const endRow = document.createElement('div');
        endRow.className = 'activity-complete-actions story-stage__end';
        endRow.hidden = false;

        const againButton = document.createElement('button');
        againButton.className = 'child-button';
        againButton.type = 'button';
        againButton.textContent = 'Tell it again';
        againButton.setAttribute('aria-label', 'Tell it again');
        const onAgain = () => {
          endingReached = false;
          container?.classList.remove('story-stage--ended');
          renderScene(tale.entrySceneId, 0);
          options.speech.stop();
          options.speech.speak(tale.opening);
          const entry = scenesById.get(tale.entrySceneId);
          if (entry) options.speech.speak(entry.narration);
        };
        againButton.addEventListener('click', onAgain);
        cleanupHandlers.push(() => againButton.removeEventListener('click', onAgain));
        endRow.appendChild(againButton);

        const newStoryButton = document.createElement('button');
        newStoryButton.className = 'child-button';
        newStoryButton.type = 'button';
        newStoryButton.textContent = 'New story';
        newStoryButton.setAttribute('aria-label', 'New story');
        const onNewStory = () => {
          endingReached = false;
          container?.classList.remove('story-stage--ended');
          renderSetup();
        };
        newStoryButton.addEventListener('click', onNewStory);
        cleanupHandlers.push(() =>
          newStoryButton.removeEventListener('click', onNewStory)
        );
        endRow.appendChild(newStoryButton);

        const homeEnd = document.createElement('button');
        homeEnd.className = 'child-button';
        homeEnd.type = 'button';
        homeEnd.textContent = 'Home';
        homeEnd.addEventListener('click', () => {
          window.location.hash = '#home';
        });
        endRow.appendChild(homeEnd);
        controls.appendChild(endRow);
        return;
      }

      // Non-decision scene: one large Continue control; never autoplay.
      const continueButton = document.createElement('button');
      continueButton.className = 'child-button story-stage__continue';
      continueButton.type = 'button';
      continueButton.textContent = 'What happens next?';
      continueButton.setAttribute('aria-label', 'What happens next?');
      const onContinue = () => {
        if (!scene.next) return;
        renderScene(scene.next, step + 1);
        const nextScene = scenesById.get(scene.next);
        if (nextScene) speakScene(nextScene);
      };
      continueButton.addEventListener('click', onContinue);
      cleanupHandlers.push(() => continueButton.removeEventListener('click', onContinue));
      controls.appendChild(continueButton);
    }

    renderScene(tale.entrySceneId, 0);
    options.speech.stop();
    options.speech.speak(tale.opening);
    const entry = scenesById.get(tale.entrySceneId);
    if (entry) options.speech.speak(entry.narration);
  }

  renderSetup();
}

export function destroyStoryStage(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  // Leaving the story mid-scene must never leave narration running.
  activeSpeech?.stop();
  activeSpeech = null;

  if (container) {
    container.remove();
    container = null;
  }
}
