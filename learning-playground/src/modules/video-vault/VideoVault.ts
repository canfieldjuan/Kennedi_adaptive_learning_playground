/**
 * Approved local video vault runtime.
 * Renders finite, manual-start local videos only.
 */

import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type { SpeechServiceInterface } from '../../types/runtime';
import type { ApprovedVideo, VideoVaultManifest } from './video-vault.types';
import { createVideoCompletionEvent } from './video-evidence';
import { validateVideoManifest } from './video-manifest';

interface VideoVaultOptions {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  speech: SpeechServiceInterface;
  videoManifest: VideoVaultManifest;
  onEvent: (event: ActivityAttemptEvent) => void;
}

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];

export function renderVideoVault(
  parent: HTMLElement,
  options: VideoVaultOptions
): void {
  destroyVideoVault();

  const promptText = getStringContent(
    options.activity.content.prompt_audio,
    options.activity.title
  );
  const expectedManifestId = getStringContent(options.activity.content.manifest_id, '');
  const manifestValidation = validateVideoManifest(
    options.videoManifest,
    expectedManifestId
  );
  const videos = manifestValidation.playable_videos;
  const startedAt = Date.now();
  let completedCount = 0;

  container = document.createElement('div');
  container.className = 'child-container activity-screen video-vault-screen';
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

  if (videos.length === 0) {
    renderEmptyVault(container, options.activity);
  } else {
    const grid = document.createElement('div');
    grid.className = 'video-vault-grid';
    grid.setAttribute('aria-label', options.videoManifest.title);

    for (const video of videos) {
      const card = renderVideoCard(video, options, () => {
        completedCount += 1;
        options.onEvent(createVideoCompletionEvent({
          activity: options.activity,
          childId: options.childId,
          sessionId: options.sessionId,
          manifestId: options.videoManifest.id,
          promptText,
          video,
          attemptNumber: completedCount,
          responseTimeMs: Date.now() - startedAt,
        }));
      });
      grid.appendChild(card);
    }

    container.appendChild(grid);
  }

  parent.appendChild(container);
  options.speech.speak(promptText);
}

export function destroyVideoVault(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  if (container) {
    const videos = container.querySelectorAll('video');
    for (const video of videos) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    container.remove();
    container = null;
  }
}

function renderVideoCard(
  video: ApprovedVideo,
  options: VideoVaultOptions,
  onCompleted: () => void
): HTMLElement {
  const card = document.createElement('section');
  card.className = 'video-vault-card';

  const title = document.createElement('h2');
  title.className = 'video-vault-card__title';
  title.textContent = video.title;
  card.appendChild(title);

  const player = document.createElement('video');
  player.className = 'video-vault-player';
  player.controls = true;
  player.autoplay = false;
  player.loop = false;
  player.preload = 'metadata';
  player.src = video.path;
  player.setAttribute('aria-label', video.title);

  if (video.thumbnail_path) {
    player.poster = video.thumbnail_path;
  }

  const onEnded = () => {
    onCompleted();
    options.speech.speak(
      getFeedbackSpeech(options.activity.feedback_rules.correct, 'All done.')
    );
  };

  player.addEventListener('ended', onEnded);
  cleanupHandlers.push(() => player.removeEventListener('ended', onEnded));

  card.appendChild(player);

  const meta = document.createElement('p');
  meta.className = 'video-vault-card__meta';
  meta.textContent = formatDuration(video.duration_seconds);
  card.appendChild(meta);

  return card;
}

function renderEmptyVault(parent: HTMLElement, activity: LearningActivity): void {
  const emptyState = document.createElement('div');
  emptyState.className = 'video-vault-empty';

  const icon = document.createElement('span');
  icon.className = 'video-vault-empty__icon';
  icon.textContent = '▶';
  icon.setAttribute('aria-hidden', 'true');
  emptyState.appendChild(icon);

  const message = document.createElement('p');
  message.className = 'video-vault-empty__message';
  message.textContent = getStringContent(
    activity.content.empty_message,
    'No videos yet.'
  );
  emptyState.appendChild(message);

  const homeButton = document.createElement('button');
  homeButton.className = 'child-button';
  homeButton.type = 'button';
  homeButton.textContent = 'Home';
  homeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  emptyState.appendChild(homeButton);

  parent.appendChild(emptyState);
}

function getStringContent(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function getFeedbackSpeech(value: unknown, fallback: string): string {
  if (typeof value !== 'object' || value === null) return fallback;

  const feedback = value as Record<string, unknown>;
  return typeof feedback.speech === 'string' ? feedback.speech : fallback;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
