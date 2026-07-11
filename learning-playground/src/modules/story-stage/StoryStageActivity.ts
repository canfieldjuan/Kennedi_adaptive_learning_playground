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
 * 2. STORY — the resolved tale: each scene shows its illustration and a
 *    one-line caption, narrates one beat, and waits; no autoplay between
 *    scenes; endings offer Tell It Again, New Story (back to setup), and
 *    Home.
 *
 * Two narration modes (arc slice 5, parent-owned via ParentSettings —
 * the child never chooses):
 *
 * - 'narrated' (default): the game speaks every beat, exactly as above.
 * - 'together': the adult improvises. Scenes stay quiet; a compact adult
 *   cue panel (beat / keep true / ask / silly, collapsible) sits between
 *   the scene and the child controls, and a "Play the story line"
 *   fallback speaks + reveals the authored narration so the session is
 *   never stranded. The panel carries no story decision — child choices
 *   are untouched.
 */

import type { SpeechServiceInterface } from '../../types/runtime';
import type { StoryHistoryRecord } from '../../types/story-history';
import { FIRST_STORY_PACK } from './first-tale';
import type {
  ResolvedScene,
  ResolvedStory,
  StorySelection,
} from './story-pack.types';
import { resolveStory } from './story-resolver';
import { findFamilyFor, selectableEntities } from './story-selection';
import type { SceneArtContext } from './story-art';
import { storyCardSvg, storyChoiceSvg, storySceneSvg } from './story-art';

export type StoryMode = 'narrated' | 'together';

/** The narrow, non-evaluative history sink (spec §21) — never the event log. */
export interface StoryHistorySink {
  append(record: StoryHistoryRecord): void;
}

interface StoryStageOptions {
  speech: SpeechServiceInterface;
  /** Parent-owned narration mode; anything but 'together' plays narrated. */
  storyMode?: StoryMode;
  history?: StoryHistorySink;
}

const MODE_LABELS: Record<StoryMode, string> = {
  narrated: 'Tell Me a Story',
  together: 'Tell It Together',
};

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
let activeHistory: StoryHistorySink | null = null;
let pendingRecord: StoryHistoryRecord | null = null;

function storySessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `story-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Leaving mid-story records the session as left early — facts only. */
function flushPendingRecord(): void {
  if (pendingRecord && activeHistory) {
    activeHistory.append(pendingRecord);
  }
  pendingRecord = null;
}

export function renderStoryStage(
  parent: HTMLElement,
  options: StoryStageOptions
): void {
  destroyStoryStage();
  activeSpeech = options.speech;
  activeHistory = options.history ?? null;

  const pack = FIRST_STORY_PACK;
  const storyMode: StoryMode =
    options.storyMode === 'together' ? 'together' : 'narrated';

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

    // Adult-facing: the active narration mode is visible before the
    // story starts. Informative only — the child never chooses modes.
    const modeBadge = document.createElement('p');
    modeBadge.className = 'story-stage__mode-badge';
    modeBadge.textContent = MODE_LABELS[storyMode];
    setup.appendChild(modeBadge);

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

  function openStoryRecord(tale: ResolvedStory): void {
    pendingRecord = {
      story_session_id: storySessionId(),
      mode: storyMode,
      family_id: tale.familyId,
      character_id: tale.selection.characterId,
      setting_id: tale.selection.settingId,
      problem_id: tale.selection.problemId,
      choice_path: [],
      started_at: new Date().toISOString(),
      status: 'left_early',
    };
  }

  function beginStory(tale: ResolvedStory): void {
    const scenesById = new Map(tale.scenes.map((scene) => [scene.id, scene]));
    openStoryRecord(tale);
    // Scenes compose over the selection: the picked setting is the
    // backdrop and the picked character is the hero in every beat.
    const artCtx: SceneArtContext = {
      characterArt:
        pack.characters.find((entry) => entry.id === tale.selection.characterId)?.art ??
        'poppy',
      settingArt:
        pack.settings.find((entry) => entry.id === tale.selection.settingId)?.art ??
        'forest',
    };
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
    // can tell the story aloud when speech is disabled. In together mode
    // it starts empty: the adult owns the words until the fallback
    // reveals the authored line.
    const caption = document.createElement('p');
    caption.className = 'story-stage__caption';
    caption.setAttribute('aria-live', 'polite');
    body.appendChild(caption);

    // Adult cue surface (together mode only): between the scene and the
    // child controls, never a story-decision target.
    const cuePanel = document.createElement('aside');
    cuePanel.className = 'story-stage__cue';
    if (storyMode === 'together') body.appendChild(cuePanel);
    let cueCollapsed = false;

    const controls = document.createElement('div');
    controls.className = 'story-stage__controls';
    body.appendChild(controls);

    let endingReached = false;

    function speakScene(scene: ResolvedScene): void {
      // Stop always — a fallback playback must never overlap the next
      // scene — but only narrated mode speaks automatically.
      options.speech.stop();
      if (storyMode === 'together') return;
      options.speech.speak(scene.narration);
    }

    function renderCue(scene: ResolvedScene): void {
      cuePanel.innerHTML = '';

      const header = document.createElement('div');
      header.className = 'story-stage__cue-header';

      const cueTitle = document.createElement('span');
      cueTitle.className = 'story-stage__cue-title';
      cueTitle.textContent = 'Storyteller cue';
      header.appendChild(cueTitle);

      const toggle = document.createElement('button');
      toggle.className = 'story-stage__cue-toggle';
      toggle.type = 'button';
      toggle.textContent = cueCollapsed ? 'Show' : 'Hide';
      toggle.setAttribute('aria-label', cueCollapsed ? 'Show cues' : 'Hide cues');
      const onToggle = () => {
        cueCollapsed = !cueCollapsed;
        renderCue(scene);
      };
      toggle.addEventListener('click', onToggle);
      cleanupHandlers.push(() => toggle.removeEventListener('click', onToggle));
      header.appendChild(toggle);
      cuePanel.appendChild(header);

      if (cueCollapsed) return;

      const cueBody = document.createElement('div');
      cueBody.className = 'story-stage__cue-body';

      const beat = document.createElement('p');
      beat.className = 'story-stage__cue-line story-stage__cue-line--beat';
      beat.textContent = scene.cue.beat;
      cueBody.appendChild(beat);

      const keepTrue = document.createElement('p');
      keepTrue.className = 'story-stage__cue-line';
      keepTrue.textContent = `Keep true: ${scene.cue.keepTrue}`;
      cueBody.appendChild(keepTrue);

      const ask = document.createElement('p');
      ask.className = 'story-stage__cue-line';
      ask.textContent = `Ask: ${scene.cue.ask}`;
      cueBody.appendChild(ask);

      if (scene.cue.silly !== undefined) {
        const silly = document.createElement('p');
        silly.className = 'story-stage__cue-line';
        silly.textContent = `Silly twist: ${scene.cue.silly}`;
        cueBody.appendChild(silly);
      }

      // The never-stranded control: play (and reveal) the authored line.
      const fallback = document.createElement('button');
      fallback.className = 'story-stage__cue-fallback';
      fallback.type = 'button';
      fallback.textContent = 'Play the story line';
      fallback.setAttribute('aria-label', 'Play the story line');
      const onFallback = () => {
        options.speech.stop();
        options.speech.speak(scene.narration);
        caption.textContent = scene.narration;
      };
      fallback.addEventListener('click', onFallback);
      cleanupHandlers.push(() => fallback.removeEventListener('click', onFallback));
      cueBody.appendChild(fallback);

      cuePanel.appendChild(cueBody);
    }

    function renderScene(sceneId: string, step: number): void {
      const scene = scenesById.get(sceneId);
      if (!scene || !container) return;

      for (const [index, dot] of pathDots.entries()) {
        dot.classList.toggle('is-done', index < step);
        dot.classList.toggle('is-current', index === step);
      }

      scenePicture.innerHTML = storySceneSvg(scene.art, artCtx);
      caption.textContent = storyMode === 'together' ? '' : scene.narration;
      if (storyMode === 'together') renderCue(scene);
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
            pendingRecord?.choice_path.push(choice.id);
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
        if (pendingRecord) {
          activeHistory?.append({
            ...pendingRecord,
            status: 'completed',
            ending_id: scene.endingId,
            completed_at: new Date().toISOString(),
          });
          pendingRecord = null;
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
          openStoryRecord(tale);
          renderScene(tale.entrySceneId, 0);
          options.speech.stop();
          if (storyMode === 'narrated') {
            options.speech.speak(tale.opening);
            const entry = scenesById.get(tale.entrySceneId);
            if (entry) options.speech.speak(entry.narration);
          }
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
    if (storyMode === 'narrated') {
      options.speech.speak(tale.opening);
      const entry = scenesById.get(tale.entrySceneId);
      if (entry) options.speech.speak(entry.narration);
    }
  }

  renderSetup();
}

export function destroyStoryStage(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  flushPendingRecord();
  activeHistory = null;

  // Leaving the story mid-scene must never leave narration running.
  activeSpeech?.stop();
  activeSpeech = null;

  if (container) {
    container.remove();
    container = null;
  }
}
