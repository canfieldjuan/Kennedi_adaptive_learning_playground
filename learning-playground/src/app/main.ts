/**
 * Learning Playground — Main entry point.
 *
 * "The app adapts cognitive difficulty upward while keeping
 * physical interaction and emotional feedback preschool-safe."
 */

import '../styles/base.css';
import '../styles/child-ui.css';
import '../styles/parent-ui.css';

import { initRouter } from './router';
import type { Route } from './router';
import { createSessionId, SessionTimer } from './session';
import { registerActivity, getActivity } from '../core/activity-registry';
import { appendEvent, getEvents } from '../core/event-log';
import {
  createParentGateState,
  getParentGatePhrase,
  shouldRequireParentGate,
  unlockParentGate,
} from '../core/parent-gate';
import { AudioService } from '../core/audio';
import { SpeechService } from '../core/speech';
import { StorageService } from '../core/storage';
import { applyParentApprovedDifficulty } from '../core/parent-difficulty-application';
import type { LearningActivity } from '../types/activity';
import type { ActivityAttemptEvent } from '../types/events';
import { renderHomeScreen, destroyHomeScreen } from '../modules/home/HomeScreen';
import { renderParentPanel, destroyParentPanel } from '../modules/parent-panel/ParentPanel';
import { renderParentGate, destroyParentGate } from '../modules/parent-gate/ParentGate';
import {
  renderTapChoiceActivity,
  destroyTapChoiceActivity,
} from '../modules/tap-choice/TapChoiceActivity';
import {
  renderColoringActivity,
  destroyColoringActivity,
} from '../modules/coloring-book/ColoringActivity';
import {
  renderVideoVault,
  destroyVideoVault,
} from '../modules/video-vault/VideoVault';
import type { VideoVaultManifest } from '../modules/video-vault/video-vault.types';
import phonicsFindB from '../content/activities/phonics-find-b.json';
import shapesFindCircle from '../content/activities/shapes-find-circle.json';
import mathCountStarsThree from '../content/activities/math-count-stars-three.json';
import artColorCircle from '../content/activities/art-color-circle.json';
import videoVault from '../content/activities/video-vault.json';
import familySafeVideos from '../content/videos/family-safe-videos.v1.json';

registerActivity(phonicsFindB as LearningActivity);
registerActivity(shapesFindCircle as LearningActivity);
registerActivity(mathCountStarsThree as LearningActivity);
registerActivity(artColorCircle as LearningActivity);
registerActivity(videoVault as LearningActivity);

// — Services —
const storage = new StorageService();
const settings = storage.getSettings();
const speech = new SpeechService(settings.speech_enabled);
const audio = new AudioService(settings.sound_enabled);
const sessionId = createSessionId();
const childId = 'local-child';
const sessionTimer = new SessionTimer(settings.session_limit_minutes);
const parentGateState = createParentGateState();

// — App container —
const app = document.getElementById('app')!;

// — Session timer —
sessionTimer.onLimitReached(() => {
  speech.speak("Time for a break! You did great today.");
});
sessionTimer.start();

// — Route handler —
function handleRoute(route: Route): void {
  // Destroy existing views
  destroyHomeScreen();
  destroyParentGate();
  destroyParentPanel();
  destroyTapChoiceActivity();
  destroyColoringActivity();
  destroyVideoVault();
  app.innerHTML = '';

  switch (route.view) {
    case 'home':
      renderHomeScreen(app, speech);
      break;
    case 'parent': {
      const parentGateSettings = storage.getSettings();
      if (shouldRequireParentGate({
        routeView: route.view,
        settings: parentGateSettings,
        state: parentGateState,
      })) {
        renderParentGate(app, {
          challengePhrase: getParentGatePhrase(parentGateSettings),
          onUnlock: () => {
            unlockParentGate(parentGateState);
            destroyParentGate();
            app.innerHTML = '';
            renderParentPanel(app, storage, { childId, sessionId });
          },
          onCancel: () => {
            window.location.hash = '#home';
          },
        });
        break;
      }
      renderParentPanel(app, storage, { childId, sessionId });
      break;
    }
    case 'activity':
      renderActivityRoute(route.activityId);
      break;
  }
}

initRouter(handleRoute);

function renderActivityRoute(activityId: string): void {
  const activity = getActivity(activityId);

  if (!activity) {
    renderComingSoon();
    return;
  }

  const appliedDifficulty = applyParentApprovedDifficulty(
    activity,
    storage.getParentDifficultyOverrides()
  );
  const runtimeActivity = appliedDifficulty.activity;

  if (runtimeActivity.interaction_model === 'color_fill') {
    renderColoringActivity(app, {
      activity: runtimeActivity,
      childId,
      sessionId,
      speech,
      audio,
      onEvent: handleActivityEvent,
    });
    return;
  }

  if (runtimeActivity.interaction_model === 'watch_then_do') {
    renderVideoVault(app, {
      activity: runtimeActivity,
      childId,
      sessionId,
      speech,
      videoManifest: familySafeVideos as VideoVaultManifest,
      onEvent: handleActivityEvent,
    });
    return;
  }

  renderTapChoiceActivity(app, {
    activity: runtimeActivity,
    parentGuidance: appliedDifficulty.appliedGuidance,
    childId,
    sessionId,
    speech,
    audio,
    onEvent: handleActivityEvent,
  });
}

function handleActivityEvent(event: ActivityAttemptEvent): void {
  const stored = appendEvent(event);
  if (!stored) return;

  storage.updateProgressFromEvents(childId, getEvents());
}

function renderComingSoon(): void {
  const container = document.createElement('div');
  container.className = 'child-container activity-screen';

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = 'Coming soon';
  container.appendChild(title);

  const homeButton = document.createElement('button');
  homeButton.className = 'child-button';
  homeButton.type = 'button';
  homeButton.textContent = 'Home';
  homeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  container.appendChild(homeButton);

  app.appendChild(container);
}
