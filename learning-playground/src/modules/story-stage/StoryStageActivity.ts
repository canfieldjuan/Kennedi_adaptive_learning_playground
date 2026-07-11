/**
 * Kennedi's Story Stage — slice 1: one fixed, fully narrated story.
 *
 * The runtime deliberately has NO event sink: story decisions are
 * narrative preferences, never assessments, so this module cannot emit
 * attempt events, skill evidence, or correctness of any kind. It takes
 * the local speech service and nothing else.
 *
 * Flow: each scene shows its illustration and a one-line caption (short,
 * readable by an adult when speech is off), narrates one beat, and waits —
 * the child advances with a Continue tap or by choosing one of exactly two
 * illustrated choices. No autoplay between scenes. Endings offer Tell It
 * Again and Home.
 */

import type { SpeechServiceInterface } from '../../types/runtime';
import { FIRST_TALE } from './first-tale';
import type { StoryScene } from './story-stage.types';
import { storyChoiceSvg, storySceneSvg } from './story-art';

interface StoryStageOptions {
  speech: SpeechServiceInterface;
}

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];
let activeSpeech: SpeechServiceInterface | null = null;

export function renderStoryStage(
  parent: HTMLElement,
  options: StoryStageOptions
): void {
  destroyStoryStage();
  activeSpeech = options.speech;

  const tale = FIRST_TALE;
  const scenesById = new Map(tale.scenes.map((scene) => [scene.id, scene]));

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
  title.textContent = tale.title;
  container.appendChild(title);

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
  container.appendChild(path);

  const stage = document.createElement('div');
  stage.className = 'story-stage__stage';

  const scenePicture = document.createElement('div');
  scenePicture.className = 'story-stage__scene';
  scenePicture.setAttribute('aria-hidden', 'true');
  stage.appendChild(scenePicture);
  container.appendChild(stage);

  // The one-line story caption — deliberately readable text so an adult
  // can tell the story aloud when speech is disabled.
  const caption = document.createElement('p');
  caption.className = 'story-stage__caption';
  caption.setAttribute('aria-live', 'polite');
  container.appendChild(caption);

  const controls = document.createElement('div');
  controls.className = 'story-stage__controls';
  container.appendChild(controls);

  parent.appendChild(container);

  let endingReached = false;

  function speakScene(scene: StoryScene): void {
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
  options.speech.speak(tale.opening);
  const entry = scenesById.get(tale.entrySceneId);
  if (entry) options.speech.speak(entry.narration);
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
