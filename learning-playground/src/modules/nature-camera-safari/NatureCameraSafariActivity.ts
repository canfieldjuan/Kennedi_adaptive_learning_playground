import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../types/runtime';
import {
  createNatureCameraEvent,
  evaluateSafariSelection,
  formatObjectLabels,
  getCorrectObjectIds,
  getNatureCameraContent,
} from './nature-camera-safari.logic';
import type {
  NatureCameraContent,
  NatureSceneObject,
} from './nature-camera-safari.types';

interface NatureCameraSafariOptions {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  speech: SpeechServiceInterface;
  audio: AudioServiceInterface;
  onEvent: (event: ActivityAttemptEvent) => void;
}

type SafariStage = 'intro' | 'explore' | 'save' | 'complete';

let container: HTMLElement | null = null;

export function renderNatureCameraSafariActivity(
  parent: HTMLElement,
  options: NatureCameraSafariOptions
): void {
  destroyNatureCameraSafariActivity();

  const content = getNatureCameraContent(options.activity);
  if (!content) {
    renderActivityUnavailable(parent);
    return;
  }

  let stage: SafariStage = 'intro';
  let selectedObjectIds: string[] = [];
  let attemptNumber = 0;
  let hintShown = false;
  let startedAt = Date.now();
  let attemptStartedAt = startedAt;
  let feedbackText = '';
  let feedbackTone: 'success' | 'support' | 'hint' = 'support';

  container = document.createElement('div');
  container.className = 'child-container activity-screen nature-camera';
  container.id = `activity-${options.activity.id}`;

  const render = () => {
    if (!container) return;
    container.innerHTML = '';

    container.appendChild(createTopBar(() => {
      attemptStartedAt = Date.now();
      options.speech.speak(content.prompt_audio);
      emitPromptReplayEvent(options, content);
    }));

    const title = document.createElement('h1');
    title.className = 'activity-title nature-camera__title';
    title.textContent = 'Nature Camera Safari';
    container.appendChild(title);
    renderWalkPanel(container, content);

    if (stage === 'intro') {
      renderIntro(container, content, () => {
        stage = 'explore';
        selectedObjectIds = [];
        startedAt = Date.now();
        attemptStartedAt = startedAt;
        options.speech.speak(content.prompt_audio);
        render();
      });
      return;
    }

    if (stage === 'save') {
      renderSaveStage(container, content, selectedObjectIds, () => {
        stage = 'complete';
        options.audio.play('soft_chime');
        options.speech.speak(content.completion_line);
        options.onEvent(createNatureCameraEvent({
          activity: options.activity,
          content,
          sessionId: options.sessionId,
          childId: options.childId,
          outcome: 'completed',
          selectedObjectIds,
          attemptNumber: Math.max(1, attemptNumber),
          responseTimeMs: Date.now() - startedAt,
          hintShown,
          eventName: 'photo_saved_to_album',
        }));
        render();
      });
      return;
    }

    if (stage === 'complete') {
      renderCompleteStage(container, content);
      return;
    }

    renderPrompt(container, content);
    renderCameraActions(container, selectedObjectIds, (eventName) => {
      attemptNumber += 1;
      const responseTimeMs = Date.now() - attemptStartedAt;
      const evaluation = evaluateSafariSelection(content, selectedObjectIds);

      options.onEvent(createNatureCameraEvent({
        activity: options.activity,
        content,
        sessionId: options.sessionId,
        childId: options.childId,
        outcome: evaluation.correct ? 'correct' : 'incorrect',
        selectedObjectIds,
        attemptNumber,
        responseTimeMs,
        hintShown,
        eventName,
        issue: evaluation.issue,
      }));

      if (evaluation.canComplete) {
        feedbackTone = 'success';
        feedbackText = 'Photo saved.';
        options.audio.play('soft_shutter');
        options.speech.speak('Photo saved.');
        stage = 'save';
        render();
        return;
      }

      hintShown = hintShown || attemptNumber >= 2;
      feedbackTone = hintShown ? 'hint' : 'support';
      feedbackText = getCheckFeedback(content, evaluation.issue);
      options.audio.play('soft_boing');
      options.speech.speak(feedbackText);

      if (hintShown) {
        emitHintEvent(options, content, selectedObjectIds, attemptNumber, responseTimeMs);
      }

      attemptStartedAt = Date.now();
      render();
    });
    renderScene(container, content, selectedObjectIds, hintShown, (object) => {
      const nextSelection = updateSelectedObjects(content, selectedObjectIds, object.id);
      const evaluation = evaluateSafariSelection(content, nextSelection);
      const tappedWrongObject = !evaluation.correctObjectIds.includes(object.id);

      selectedObjectIds = nextSelection;
      feedbackText = '';

      if (tappedWrongObject || isSingleTargetMode(content)) {
        attemptNumber += 1;
        const responseTimeMs = Date.now() - attemptStartedAt;

        options.onEvent(createNatureCameraEvent({
          activity: options.activity,
          content,
          sessionId: options.sessionId,
          childId: options.childId,
          outcome: evaluation.correct ? 'correct' : 'incorrect',
          selectedObjectIds: [object.id],
          attemptNumber,
          responseTimeMs,
          hintShown,
          eventName: 'photo_captured',
          issue: evaluation.issue,
        }));

        if (evaluation.correct) {
          feedbackTone = 'success';
          feedbackText = 'Photo saved.';
          options.audio.play('soft_shutter');
          options.speech.speak('You found it.');
          stage = 'save';
          render();
          return;
        }

        hintShown = hintShown || attemptNumber >= 2;
        feedbackTone = hintShown ? 'hint' : 'support';
        feedbackText = getIncorrectFeedback(content, object, hintShown);
        options.audio.play('soft_boing');
        options.speech.speak(feedbackText);

        if (hintShown) {
          emitHintEvent(options, content, selectedObjectIds, attemptNumber, responseTimeMs);
        }

        attemptStartedAt = Date.now();
      }

      render();
    });

    renderPhotoTray(container, content, selectedObjectIds);

    if (feedbackText) {
      const feedback = document.createElement('p');
      feedback.className = 'activity-feedback';
      feedback.dataset.tone = feedbackTone;
      feedback.setAttribute('aria-live', 'polite');
      feedback.textContent = feedbackText;
      container.appendChild(feedback);
    }
  };

  parent.appendChild(container);
  render();
}

export function destroyNatureCameraSafariActivity(): void {
  if (container) {
    container.remove();
    container = null;
  }
}

function createTopBar(onRepeat: () => void): HTMLElement {
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
  repeatButton.setAttribute('aria-label', 'Repeat picture walk prompt');
  repeatButton.addEventListener('click', onRepeat);
  topBar.appendChild(repeatButton);

  return topBar;
}

function renderIntro(
  parent: HTMLElement,
  content: NatureCameraContent,
  onStart: () => void
): void {
  const intro = document.createElement('section');
  intro.className = 'nature-camera-intro';
  intro.innerHTML = `
    <div class="nature-camera-intro__guide" aria-hidden="true">${content.guide.icon}</div>
    <p class="nature-camera-intro__line">${content.guide.intro_line}</p>
  `;

  const startButton = document.createElement('button');
  startButton.className = 'child-button nature-camera-start';
  startButton.type = 'button';
  startButton.textContent = 'Start walk';
  startButton.addEventListener('click', onStart);
  intro.appendChild(startButton);
  parent.appendChild(intro);
}

function renderWalkPanel(parent: HTMLElement, content: NatureCameraContent): void {
  const panel = document.createElement('section');
  panel.className = 'nature-camera-walk';
  panel.setAttribute('aria-label', 'Picture walk progress');

  const label = document.createElement('p');
  label.className = 'nature-camera-walk__label';
  label.textContent = content.walk_label ?? 'Picture walk';
  panel.appendChild(label);

  if (typeof content.round_index === 'number' && typeof content.round_total === 'number') {
    const progress = document.createElement('div');
    progress.className = 'nature-camera-walk__dots';
    progress.setAttribute('aria-hidden', 'true');

    for (let index = 1; index <= content.round_total; index += 1) {
      const dot = document.createElement('span');
      dot.dataset.active = index <= content.round_index ? 'true' : 'false';
      progress.appendChild(dot);
    }

    panel.appendChild(progress);
  }

  const round = document.createElement('p');
  round.className = 'nature-camera-walk__round';
  round.textContent = content.round_label ?? 'Take a picture';
  panel.appendChild(round);

  parent.appendChild(panel);
}

function renderPrompt(parent: HTMLElement, content: NatureCameraContent): void {
  const prompt = document.createElement('p');
  prompt.className = 'activity-prompt nature-camera-prompt';
  prompt.textContent = content.prompt_audio;
  parent.appendChild(prompt);
}

function renderScene(
  parent: HTMLElement,
  content: NatureCameraContent,
  selectedObjectIds: string[],
  hintShown: boolean,
  onObjectTap: (object: NatureSceneObject) => void
): void {
  const scene = document.createElement('section');
  scene.className = 'nature-camera-scene';
  scene.setAttribute('aria-label', content.scene_label);

  const sky = document.createElement('div');
  sky.className = 'nature-camera-scene__sky';
  scene.appendChild(sky);

  const grass = document.createElement('div');
  grass.className = 'nature-camera-scene__grass';
  scene.appendChild(grass);

  const path = document.createElement('div');
  path.className = 'nature-camera-scene__path';
  scene.appendChild(path);

  const tree = document.createElement('div');
  tree.className = 'nature-camera-scene__tree';
  scene.appendChild(tree);

  const correctObjectIds = getCorrectObjectIds(content);
  for (const object of content.objects) {
    const button = document.createElement('button');
    button.className = 'nature-camera-object';
    button.type = 'button';
    button.style.setProperty('--safari-x', `${object.x}%`);
    button.style.setProperty('--safari-y', `${object.y}%`);
    button.style.setProperty('--safari-size', `${object.size}px`);
    button.style.setProperty('--safari-tap-size', `${object.tap_area_px}px`);
    button.dataset.selected = selectedObjectIds.includes(object.id) ? 'true' : 'false';
    button.dataset.hinted = (
      hintShown && correctObjectIds.includes(object.id)
    ) ? 'true' : 'false';
    button.setAttribute('aria-label', `Take picture of ${object.label}`);

    const image = document.createElement('img');
    image.src = object.image;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    button.appendChild(image);

    const label = document.createElement('span');
    label.className = 'nature-camera-object__label';
    label.textContent = object.label;
    button.appendChild(label);

    button.addEventListener('click', () => onObjectTap(object));
    scene.appendChild(button);
  }

  parent.appendChild(scene);
}

function renderPhotoTray(
  parent: HTMLElement,
  content: NatureCameraContent,
  selectedObjectIds: string[]
): void {
  const tray = document.createElement('section');
  tray.className = 'nature-camera-tray';
  tray.setAttribute('aria-label', 'Nature photo cards');

  const label = document.createElement('p');
  label.className = 'nature-camera-tray__label';
  label.textContent = 'Nature book';
  tray.appendChild(label);

  if (selectedObjectIds.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'nature-camera-tray__empty';
    empty.textContent = 'Take a picture.';
    tray.appendChild(empty);
  } else {
    const cards = document.createElement('div');
    cards.className = 'nature-camera-cards';
    for (const objectId of selectedObjectIds) {
      const object = content.objects.find((entry) => entry.id === objectId);
      if (!object) continue;

      const card = document.createElement('div');
      card.className = 'nature-camera-card';
      card.innerHTML = `
        <img src="${object.image}" alt="" aria-hidden="true" />
        <span>${object.label}</span>
      `;
      cards.appendChild(card);
    }
    tray.appendChild(cards);
  }

  parent.appendChild(tray);
}

function renderCameraActions(
  parent: HTMLElement,
  selectedObjectIds: string[],
  onCheck: (eventName: string) => void
): void {
  const actions = document.createElement('div');
  actions.className = 'nature-camera-actions';

  const cameraButton = document.createElement('button');
  cameraButton.className = 'child-button nature-camera-button';
  cameraButton.type = 'button';
  cameraButton.disabled = selectedObjectIds.length === 0;
  cameraButton.innerHTML = '<span aria-hidden="true">📷</span><span>Take picture</span>';
  cameraButton.addEventListener('click', () => onCheck('photo_check'));
  actions.appendChild(cameraButton);

  parent.appendChild(actions);
}

function renderSaveStage(
  parent: HTMLElement,
  content: NatureCameraContent,
  selectedObjectIds: string[],
  onSave: () => void
): void {
  const save = document.createElement('section');
  save.className = 'nature-camera-save';

  const card = document.createElement('div');
  card.className = 'nature-camera-save__card';
  card.innerHTML = `
    <p>${formatObjectLabels(content, selectedObjectIds)}</p>
    <span aria-hidden="true">📸</span>
    <small>Photo saved</small>
  `;
  save.appendChild(card);

  const saveButton = document.createElement('button');
  saveButton.className = 'child-button nature-camera-save-button';
  saveButton.type = 'button';
  saveButton.textContent = 'Put in nature book';
  saveButton.addEventListener('click', onSave);
  save.appendChild(saveButton);

  parent.appendChild(save);
}

function renderCompleteStage(
  parent: HTMLElement,
  content: NatureCameraContent
): void {
  const complete = document.createElement('section');
  complete.className = 'nature-camera-complete';
  complete.innerHTML = `
    <div class="nature-camera-complete__bear" aria-hidden="true">${content.guide.icon}</div>
    <p class="nature-camera-complete__line">${content.completion_line}</p>
  `;

  const actions = document.createElement('div');
  actions.className = 'activity-complete-actions nature-camera-complete__actions';

  if (content.next_activity_id) {
    const nextButton = document.createElement('button');
    nextButton.className = 'child-button';
    nextButton.type = 'button';
    nextButton.textContent = 'Next picture';
    nextButton.addEventListener('click', () => {
      window.location.hash = `#activity/${content.next_activity_id}`;
    });
    actions.appendChild(nextButton);
  }

  const homeButton = document.createElement('button');
  homeButton.className = 'child-button';
  homeButton.type = 'button';
  homeButton.textContent = 'Home';
  homeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  actions.appendChild(homeButton);

  complete.appendChild(actions);
  parent.appendChild(complete);
}

function updateSelectedObjects(
  content: NatureCameraContent,
  selectedObjectIds: string[],
  objectId: string
): string[] {
  if (isSingleTargetMode(content)) {
    return [objectId];
  }

  if (selectedObjectIds.includes(objectId)) {
    return selectedObjectIds.filter((id) => id !== objectId);
  }

  return [...selectedObjectIds, objectId];
}

function isSingleTargetMode(content: NatureCameraContent): boolean {
  return (
    content.mode === 'free_picture_walk' ||
    content.mode === 'target_photo' ||
    content.mode === 'album_review'
  );
}

function getIncorrectFeedback(
  content: NatureCameraContent,
  object: NatureSceneObject,
  hintShown: boolean
): string {
  if (hintShown) {
    const correctObject = content.objects.find((entry) => (
      getCorrectObjectIds(content).includes(entry.id)
    ));
    return correctObject?.hint ?? 'Look for the glowing picture.';
  }

  return `That’s the ${object.label}. Look again.`;
}

function getCheckFeedback(
  content: NatureCameraContent,
  issue: string
): string {
  if (issue === 'under_count') {
    return `Take ${content.required_task.quantity ?? 'more'} pictures.`;
  }

  if (issue === 'over_count') {
    return 'Let’s check the photo cards.';
  }

  if (issue === 'first_sound') {
    return 'Bird starts with b-b-b.';
  }

  return 'Let’s check the pictures.';
}

function emitPromptReplayEvent(
  options: NatureCameraSafariOptions,
  content: NatureCameraContent
): void {
  options.onEvent(createNatureCameraEvent({
    activity: options.activity,
    content,
    sessionId: options.sessionId,
    childId: options.childId,
    outcome: 'hint_used',
    selectedObjectIds: [],
    attemptNumber: 0,
    responseTimeMs: 0,
    hintShown: true,
    eventName: 'safari_prompt_replayed',
  }));
}

function emitHintEvent(
  options: NatureCameraSafariOptions,
  content: NatureCameraContent,
  selectedObjectIds: string[],
  attemptNumber: number,
  responseTimeMs: number
): void {
  options.onEvent(createNatureCameraEvent({
    activity: options.activity,
    content,
    sessionId: options.sessionId,
    childId: options.childId,
    outcome: 'hint_used',
    selectedObjectIds,
    attemptNumber,
    responseTimeMs,
    hintShown: true,
    eventName: 'safari_hint_shown',
  }));
}

function renderActivityUnavailable(parent: HTMLElement): void {
  container = document.createElement('div');
  container.className = 'child-container activity-screen';

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = 'Safari needs setup';
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
