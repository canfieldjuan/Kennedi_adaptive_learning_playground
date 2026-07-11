/**
 * Bear Art Studio runtime — the Art game (arc slice 1).
 *
 * The child is the artist for the Bear family: a bear asks for an art piece
 * (portrait + icon-first request card + short spoken prompt), the child works
 * one art board with large swatches and stickers, the game checks the request
 * only when the mode calls for it, and the bear reacts. Five modes climb the
 * ask, never the physical difficulty: free_decorate (no wrong answers),
 * color_request (match the asked color), quantity_decorate (counting —
 * evaluated only on Check, never per tap), pattern (color sequencing), and
 * fix_art (find and repaint the one wrong region).
 *
 * Evidence honesty: every event uses the shared ActivityAttemptEvent shape;
 * incorrect work never emits `completed`; quantity taps emit nothing until
 * Check; hints glow, they never auto-fill.
 */

import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent, AttemptOutcome } from '../../types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../types/runtime';
import { renderBearArt } from '../kennedis-orders/bear-art';
import {
  derivePieceFromCompletion,
  type GalleryPiece,
} from '../../core/art-gallery';
import { galleryMiniSvg } from './gallery-art';
import { createStudioEnvironment } from '../coloring-book/studio-environment';
import {
  isStudioShapeId,
  posterSurfaceSvg,
  shirtSurfaceSvg,
  studioShapeSvg,
  wallFrameSurfaceSvg,
  type StudioShapeId,
} from './studio-art';
import type {
  ArtMode,
  ColorRequestContent,
  StoryCardContent,
  FixArtContent,
  FixRegion,
  FreeDecorateContent,
  PatternContent,
  QuantityDecorateContent,
  StudioChain,
  StudioCharacter,
  StudioColor,
  StudioContent,
} from './bear-art-studio.types';

interface FeedbackRule {
  speech?: string;
  sound?: string;
}

interface BearArtStudioOptions {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  speech: SpeechServiceInterface;
  audio: AudioServiceInterface;
  onEvent: (event: ActivityAttemptEvent) => void;
  /** Earlier finished pieces, derived from the event log by the app shell. */
  gallery?: GalleryPiece[];
}

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];
let timeoutHandles: number[] = [];

export function renderBearArtStudioActivity(
  parent: HTMLElement,
  options: BearArtStudioOptions
): void {
  destroyBearArtStudioActivity();

  const content = parseStudioContent(options.activity);
  if (!content) {
    renderStudioUnavailable(parent);
    return;
  }

  const correctFeedback = getFeedbackRule(options.activity.feedback_rules.correct);
  const incorrectFeedback = getFeedbackRule(options.activity.feedback_rules.incorrect);
  const hintFeedback = getFeedbackRule(options.activity.feedback_rules.hint);

  container = document.createElement('div');
  container.className =
    'child-container activity-screen coloring-studio bear-art-studio';
  container.id = `activity-${options.activity.id}`;

  // The studio scene (shipped by the visual arc): inert, all-neutral, so
  // color on this screen belongs to the palette, stickers, and the art.
  container.appendChild(createStudioEnvironment());

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

  // The requester: bear portrait + icon-first visual request card.
  const requester = document.createElement('div');
  requester.className = 'bear-art-studio__requester';

  const portrait = document.createElement('span');
  portrait.className = 'bear-art-studio__bear';
  portrait.setAttribute('aria-hidden', 'true');
  portrait.innerHTML = renderBearArt(content.character.id, 'waiting');
  requester.appendChild(portrait);

  const requestCard = buildRequestCard(content);
  requester.appendChild(requestCard);
  container.appendChild(requester);

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = options.activity.title;
  container.appendChild(title);

  const prompt = document.createElement('p');
  prompt.className = 'activity-prompt';
  prompt.textContent = content.promptAudio;
  container.appendChild(prompt);

  const board = document.createElement('div');
  board.className = 'bear-art-studio__board';
  container.appendChild(board);

  const tray = document.createElement('div');
  tray.className = 'bear-art-studio__tray';
  tray.setAttribute('aria-label', 'Art supplies');
  container.appendChild(tray);

  const actions = document.createElement('div');
  actions.className = 'bear-art-studio__actions';
  container.appendChild(actions);

  const feedback = document.createElement('p');
  feedback.className = 'activity-feedback';
  feedback.setAttribute('aria-live', 'polite');
  container.appendChild(feedback);

  // The gallery shelf appears only on finish: the just-made piece slides in
  // ahead of up to three earlier pieces (derived from the event log).
  const shelf = document.createElement('div');
  shelf.className = 'bear-art-studio__shelf';
  shelf.setAttribute('aria-label', 'Your art gallery');
  shelf.hidden = true;
  container.appendChild(shelf);

  const completeActions = document.createElement('div');
  completeActions.className = 'activity-complete-actions';
  completeActions.hidden = true;

  if (content.chain.nextActivityId) {
    const nextButton = document.createElement('button');
    nextButton.className = 'child-button bear-art-studio__next';
    nextButton.type = 'button';
    nextButton.textContent = content.chain.nextLabel ?? 'Next art';
    nextButton.setAttribute('aria-label', content.chain.nextLabel ?? 'Next art');
    nextButton.addEventListener('click', () => {
      window.location.hash = `#activity/${content.chain.nextActivityId}`;
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

  const shared: SharedRefs = {
    options,
    content,
    portrait,
    board,
    tray,
    actions,
    feedback,
    shelf,
    completeActions,
    correctFeedback,
    incorrectFeedback,
    hintFeedback,
  };

  switch (content.mode) {
    case 'free_decorate':
      renderFreeDecorate(shared, content);
      break;
    case 'color_request':
      renderColorRequest(shared, content);
      break;
    case 'quantity_decorate':
      renderQuantityDecorate(shared, content);
      break;
    case 'pattern':
      renderPattern(shared, content);
      break;
    case 'fix_art':
      renderFixArt(shared, content);
      break;
    case 'story_card':
      renderStoryCard(shared, content);
      break;
  }

  options.speech.speak(content.promptAudio);
}

export function destroyBearArtStudioActivity(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  for (const handle of timeoutHandles) {
    window.clearTimeout(handle);
  }
  timeoutHandles = [];

  if (container) {
    container.remove();
    container = null;
  }
}

// — Shared plumbing —

interface SharedRefs {
  options: BearArtStudioOptions;
  content: StudioContent;
  portrait: HTMLElement;
  board: HTMLElement;
  tray: HTMLElement;
  actions: HTMLElement;
  feedback: HTMLElement;
  shelf: HTMLElement;
  completeActions: HTMLElement;
  correctFeedback: FeedbackRule;
  incorrectFeedback: FeedbackRule;
  hintFeedback: FeedbackRule;
}

function bearReacts(shared: SharedRefs, face: 'waiting' | 'receiving' | 'happy'): void {
  shared.portrait.innerHTML = renderBearArt(shared.content.character.id, face);
}

function finishPiece(shared: SharedRefs, message: string, piece?: HTMLElement): void {
  // The finished art becomes a kept piece: a one-shot lift-and-frame beat
  // (reduced-motion disables the animation; the frame ring remains).
  piece?.classList.add('is-gallery');
  bearReacts(shared, 'happy');
  showFeedback(shared.feedback, message, 'success');
  speakAndPlay(shared.options, {
    speech: message,
    sound: shared.correctFeedback.sound,
  });
  shared.completeActions.hidden = false;
  // The shelf and the Next/Home buttons must be visible without hunting:
  // instant (non-animated) scroll, so reduced-motion needs no special case.
  shared.completeActions.scrollIntoView?.({ block: 'nearest' });
}

function wiggle(element: HTMLElement): void {
  element.classList.add('is-wrong');
  timeoutHandles.push(
    window.setTimeout(() => element.classList.remove('is-wrong'), 520)
  );
}

function emitStudioEvent(shared: SharedRefs, params: {
  outcome: AttemptOutcome;
  attemptNumber: number;
  responseTimeMs: number;
  selectedChoiceId?: string;
  correctChoiceId?: string;
  selectedAnswer: string;
  correctAnswer: string;
  hintShown: boolean;
  metadata?: Record<string, string | number | boolean>;
}): void {
  const { activity } = shared.options;
  const event: ActivityAttemptEvent = {
    event_id: createEventId(),
    session_id: shared.options.sessionId,
    child_id: shared.options.childId,
    activity_id: activity.id,
    activity_version: activity.version,
    skill_ids: activity.skill_ids,
    timestamp: new Date().toISOString(),
    prompt_text: shared.content.promptAudio,
    outcome: params.outcome,
    skill_outcomes: activity.skill_ids.map((skillId) => ({
      skill_id: skillId,
      outcome: params.outcome,
    })),
    ...(params.selectedChoiceId ? { selected_choice_id: params.selectedChoiceId } : {}),
    ...(params.correctChoiceId ? { correct_choice_id: params.correctChoiceId } : {}),
    selected_answer: params.selectedAnswer,
    correct_answer: params.correctAnswer,
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: activity.difficulty.level,
    choice_count: activity.difficulty.choice_count,
    distractor_strength: activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: params.hintShown,
    metadata: {
      game: 'bear-art-studio',
      art_mode: shared.content.mode,
      ...(params.metadata ?? {}),
    },
  };
  shared.options.onEvent(event);

  if (event.outcome === 'completed' && event.metadata) {
    const livePiece = derivePieceFromCompletion({
      eventId: event.event_id,
      activityId: event.activity_id,
      timestamp: event.timestamp,
      metadata: event.metadata,
    });
    if (livePiece) showGalleryShelf(shared, livePiece);
  }
}

function showGalleryShelf(shared: SharedRefs, livePiece: GalleryPiece): void {
  const earlier = (shared.options.gallery ?? []).slice(0, 3);
  shared.shelf.innerHTML = '';

  const addMini = (piece: GalleryPiece, isNew: boolean) => {
    const mini = document.createElement('span');
    mini.className = isNew
      ? 'bear-art-studio__mini bear-art-studio__mini--new'
      : 'bear-art-studio__mini';
    mini.setAttribute('aria-hidden', 'true');
    mini.innerHTML = galleryMiniSvg(piece);
    shared.shelf.appendChild(mini);
  };

  addMini(livePiece, true);
  for (const piece of earlier) addMini(piece, false);
  shared.shelf.hidden = false;
}

function buildSwatches(
  shared: SharedRefs,
  colors: StudioColor[],
  onPick: (color: StudioColor, swatch: HTMLButtonElement) => void
): Map<string, HTMLButtonElement> {
  const grid = document.createElement('div');
  grid.className = 'coloring-swatches bear-art-studio__swatches';
  grid.setAttribute('aria-label', 'Color choices');

  const swatches = new Map<string, HTMLButtonElement>();
  for (const color of colors) {
    const swatch = document.createElement('button');
    swatch.className = 'coloring-swatch';
    swatch.type = 'button';
    swatch.style.setProperty('--swatch-color', color.value);
    swatch.setAttribute('aria-label', color.label);
    swatch.dataset.colorId = color.id;

    const label = document.createElement('span');
    label.className = 'coloring-swatch__label';
    label.textContent = color.label;
    swatch.appendChild(label);

    const onClick = () => onPick(color, swatch);
    swatch.addEventListener('click', onClick);
    cleanupHandlers.push(() => swatch.removeEventListener('click', onClick));
    swatches.set(color.id, swatch);
    grid.appendChild(swatch);
  }

  shared.tray.appendChild(grid);
  return swatches;
}

function markSelected(
  swatches: Map<string, HTMLButtonElement>,
  selectedId: string
): void {
  for (const [id, swatch] of swatches) {
    swatch.classList.toggle('is-selected', id === selectedId);
  }
}

function disableAll(buttons: Iterable<HTMLButtonElement>): void {
  for (const button of buttons) {
    button.disabled = true;
  }
}

function buildRequestCard(content: StudioContent): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bear-art-studio__request';
  card.setAttribute('role', 'img');

  switch (content.mode) {
    case 'free_decorate': {
      card.setAttribute(
        'aria-label',
        `${content.character.name} asks for any picture you like`
      );
      card.innerHTML = content.stickers
        .slice(0, 3)
        .map((shape) => `<span class="bear-art-studio__request-item">${studioShapeSvg(shape)}</span>`)
        .join('');
      break;
    }
    case 'color_request': {
      card.setAttribute(
        'aria-label',
        `${content.character.name} wants the ${content.subjectShape} to be ${content.targetColor.label}`
      );
      card.innerHTML = `<span class="bear-art-studio__request-item">${studioShapeSvg(content.subjectShape, content.targetColor.value)}</span>`;
      break;
    }
    case 'quantity_decorate': {
      card.setAttribute(
        'aria-label',
        `${content.character.name} wants ${content.targetQuantity} ${content.targetSticker} stickers`
      );
      card.innerHTML = Array.from({ length: content.targetQuantity })
        .map(() => `<span class="bear-art-studio__request-item bear-art-studio__request-item--mini">${studioShapeSvg(content.targetSticker)}</span>`)
        .join('');
      break;
    }
    case 'pattern': {
      const unitLabels = content.patternColorIds
        .map((id) => content.colors.find((color) => color.id === id)?.label ?? id)
        .join(', ');
      card.setAttribute(
        'aria-label',
        `${content.character.name} wants the pattern ${unitLabels}, repeating`
      );
      card.innerHTML = content.patternColorIds
        .map((id) => {
          const color = content.colors.find((entry) => entry.id === id);
          return `<span class="bear-art-studio__request-dot" style="--request-dot-color: ${color?.value ?? '#ffffff'}"></span>`;
        })
        .join('');
      break;
    }
    case 'story_card': {
      card.setAttribute(
        'aria-label',
        `${content.character.name}'s story needs ${content.storyStickers.length} stickers`
      );
      card.innerHTML = content.storyStickers
        .map(() => '<span class="bear-art-studio__request-slot"></span>')
        .join('');
      break;
    }
    case 'fix_art': {
      card.setAttribute(
        'aria-label',
        `${content.character.name} shows how the card should look`
      );
      card.innerHTML = content.regions
        .map((region) => {
          const color = content.colors.find((entry) => entry.id === region.colorId);
          return `<span class="bear-art-studio__request-item bear-art-studio__request-item--mini">${studioShapeSvg(region.shape, color?.value)}</span>`;
        })
        .join('');
      break;
    }
  }

  return card;
}

// — Mode: free decorate (no wrong answers) —

function renderFreeDecorate(shared: SharedRefs, content: FreeDecorateContent): void {
  const startedAt = Date.now();
  let selectedSticker: StudioShapeId | null = null;
  let cardColor: StudioColor | null = null;
  let done = false;
  const placements = new Map<number, StudioShapeId>();

  // Every non-card surface is a repaintable backdrop SVG; the plain card
  // tints its own background instead.
  const SURFACE_ART: Partial<Record<typeof content.surface, (fill: string) => string>> = {
    shirt: shirtSurfaceSvg,
    poster: posterSurfaceSvg,
    wall_frame: wallFrameSurfaceSvg,
  };
  const SURFACE_CLASS: Record<typeof content.surface, string> = {
    card: 'bear-art-studio__card',
    shirt: 'bear-art-studio__card bear-art-studio__card--shirt',
    poster: 'bear-art-studio__card bear-art-studio__card--poster',
    wall_frame: 'bear-art-studio__card bear-art-studio__card--wall-frame',
  };
  const SURFACE_ID: Record<typeof content.surface, string> = {
    card: 'decorate-card',
    shirt: 'bear-shirt',
    poster: 'stage-poster',
    wall_frame: 'bear-house-wall',
  };
  const renderSurface = SURFACE_ART[content.surface];
  const surfaceId = SURFACE_ID[content.surface];

  const card = document.createElement('div');
  card.className = SURFACE_CLASS[content.surface];

  let surfaceBackdrop: HTMLElement | null = null;
  if (renderSurface) {
    surfaceBackdrop = document.createElement('span');
    surfaceBackdrop.className = 'bear-art-studio__surface';
    surfaceBackdrop.setAttribute('aria-hidden', 'true');
    surfaceBackdrop.innerHTML = renderSurface('#fbf8f1');
    card.appendChild(surfaceBackdrop);
  }

  const slots: HTMLButtonElement[] = [];
  for (let index = 0; index < content.slotCount; index += 1) {
    const slot = document.createElement('button');
    slot.className = 'bear-art-studio__slot';
    slot.type = 'button';
    slot.setAttribute('aria-label', `Art spot ${index + 1}`);

    const onSlot = () => {
      if (done) return;
      if (!selectedSticker) {
        showFeedback(shared.feedback, 'Pick a sticker first.', 'hint');
        return;
      }
      slot.innerHTML = studioShapeSvg(selectedSticker);
      slot.classList.add('is-filled');
      if (placements.size === 0) bearReacts(shared, 'receiving');
      placements.set(index, selectedSticker);
      doneButton.disabled = false;
      showFeedback(shared.feedback, 'You made it.', 'success');
    };
    slot.addEventListener('click', onSlot);
    cleanupHandlers.push(() => slot.removeEventListener('click', onSlot));
    slots.push(slot);
    card.appendChild(slot);
  }
  shared.board.appendChild(card);

  const swatches = buildSwatches(shared, content.colors, (color) => {
    if (done) return;
    cardColor = color;
    if (surfaceBackdrop && renderSurface) {
      surfaceBackdrop.innerHTML = renderSurface(color.value);
    } else {
      card.style.setProperty('--art-card-color', color.value);
    }
    markSelected(swatches, color.id);
    doneButton.disabled = false;
    showFeedback(shared.feedback, color.label, 'hint');
  });

  const stickerTray = document.createElement('div');
  stickerTray.className = 'bear-art-studio__stickers';
  stickerTray.setAttribute('aria-label', 'Sticker choices');
  const stickerButtons: HTMLButtonElement[] = [];
  for (const shape of content.stickers) {
    const chip = document.createElement('button');
    chip.className = 'bear-art-studio__sticker';
    chip.type = 'button';
    chip.setAttribute('aria-label', `${shape} sticker`);
    chip.innerHTML = studioShapeSvg(shape);
    const onChip = () => {
      if (done) return;
      selectedSticker = shape;
      for (const other of stickerButtons) {
        other.classList.toggle('is-selected', other === chip);
      }
    };
    chip.addEventListener('click', onChip);
    cleanupHandlers.push(() => chip.removeEventListener('click', onChip));
    stickerButtons.push(chip);
    stickerTray.appendChild(chip);
  }
  shared.tray.appendChild(stickerTray);

  const doneButton = document.createElement('button');
  doneButton.className = 'child-button bear-art-studio__done';
  doneButton.type = 'button';
  doneButton.textContent = 'Finish art';
  doneButton.setAttribute('aria-label', 'Finish art');
  doneButton.disabled = true;
  const onDone = () => {
    if (done) return;
    done = true;
    const responseTimeMs = Date.now() - startedAt;
    const stickerList = [...placements.values()];
    const summary = `${stickerList.length} stickers`;
    disableAll([...slots, ...stickerButtons, ...swatches.values(), doneButton]);

    emitStudioEvent(shared, {
      outcome: 'correct',
      attemptNumber: 1,
      responseTimeMs,
      selectedAnswer: summary,
      correctAnswer: summary,
      hintShown: false,
      metadata: {
        stickers_placed: stickerList.length,
        sticker_ids: stickerList.join(','),
        card_color_id: cardColor?.id ?? 'none',
        art_surface_id: surfaceId,
      },
    });
    emitStudioEvent(shared, {
      outcome: 'completed',
      attemptNumber: 1,
      responseTimeMs,
      selectedAnswer: summary,
      correctAnswer: summary,
      hintShown: false,
      metadata: {
        stickers_placed: stickerList.length,
        sticker_ids: stickerList.join(','),
        card_color_id: cardColor?.id ?? 'none',
        art_surface_id: surfaceId,
      },
    });
    finishPiece(shared, shared.correctFeedback.speech ?? 'Art finished.', card);
  };
  doneButton.addEventListener('click', onDone);
  cleanupHandlers.push(() => doneButton.removeEventListener('click', onDone));
  shared.actions.appendChild(doneButton);
}

// — Mode: color request —

function renderColorRequest(shared: SharedRefs, content: ColorRequestContent): void {
  let selectedColor: StudioColor | null = null;
  let done = false;
  let attemptNumber = 0;
  let hintShown = false;
  let attemptStartedAt = Date.now();

  const subject = document.createElement('button');
  subject.className = 'bear-art-studio__subject';
  subject.type = 'button';
  subject.setAttribute('aria-label', `Color the ${content.subjectShape}`);
  subject.innerHTML = studioShapeSvg(content.subjectShape, '#fbf8f1');
  shared.board.appendChild(subject);

  const swatches = buildSwatches(shared, content.colors, (color) => {
    if (done) return;
    selectedColor = color;
    markSelected(swatches, color.id);
    showFeedback(shared.feedback, color.label, 'hint');
  });

  const onSubject = () => {
    if (done) return;
    if (!selectedColor) {
      showFeedback(shared.feedback, shared.hintFeedback.speech ?? 'Pick a color first.', 'support');
      speakAndPlay(shared.options, shared.hintFeedback);
      return;
    }

    attemptNumber += 1;
    const responseTimeMs = Date.now() - attemptStartedAt;
    subject.innerHTML = studioShapeSvg(content.subjectShape, selectedColor.value);
    const isCorrect = selectedColor.id === content.targetColor.id;

    if (!isCorrect) {
      wiggle(subject);
      emitStudioEvent(shared, {
        outcome: 'incorrect',
        attemptNumber,
        responseTimeMs,
        selectedChoiceId: selectedColor.id,
        correctChoiceId: content.targetColor.id,
        selectedAnswer: selectedColor.label,
        correctAnswer: content.targetColor.label,
        hintShown,
        metadata: {
          requested_color_id: content.targetColor.id,
          selected_color_id: selectedColor.id,
          art_surface_id: `${content.subjectShape}-card`,
        },
      });
      showFeedback(
        shared.feedback,
        shared.incorrectFeedback.speech ?? "Let's check the card.",
        'support'
      );
      speakAndPlay(shared.options, shared.incorrectFeedback);

      if (!hintShown && attemptNumber >= shared.content.maxAttemptsBeforeHint) {
        hintShown = true;
        swatches.get(content.targetColor.id)?.classList.add('is-hinted');
        showFeedback(shared.feedback, shared.hintFeedback.speech ?? 'Find the matching color.', 'hint');
        speakAndPlay(shared.options, shared.hintFeedback);
        emitStudioEvent(shared, {
          outcome: 'hint_used',
          attemptNumber,
          responseTimeMs,
          selectedChoiceId: selectedColor.id,
          correctChoiceId: content.targetColor.id,
          selectedAnswer: selectedColor.label,
          correctAnswer: content.targetColor.label,
          hintShown: true,
          metadata: {
            requested_color_id: content.targetColor.id,
          },
        });
      }
      attemptStartedAt = Date.now();
      return;
    }

    done = true;
    subject.classList.add('is-complete');
    disableAll([...swatches.values(), subject]);
    emitStudioEvent(shared, {
      outcome: 'correct',
      attemptNumber,
      responseTimeMs,
      selectedChoiceId: selectedColor.id,
      correctChoiceId: content.targetColor.id,
      selectedAnswer: selectedColor.label,
      correctAnswer: content.targetColor.label,
      hintShown,
      metadata: {
        requested_color_id: content.targetColor.id,
        selected_color_id: selectedColor.id,
        art_surface_id: `${content.subjectShape}-card`,
      },
    });
    emitStudioEvent(shared, {
      outcome: 'completed',
      attemptNumber,
      responseTimeMs,
      selectedChoiceId: selectedColor.id,
      correctChoiceId: content.targetColor.id,
      selectedAnswer: selectedColor.label,
      correctAnswer: content.targetColor.label,
      hintShown,
      metadata: {
        requested_color_id: content.targetColor.id,
        art_surface_id: `${content.subjectShape}-card`,
      },
    });
    finishPiece(shared, shared.correctFeedback.speech ?? 'That matches.', subject);
  };
  subject.addEventListener('click', onSubject);
  cleanupHandlers.push(() => subject.removeEventListener('click', onSubject));
}

// — Mode: quantity decorate (counting; evaluated only on Check) —

function renderQuantityDecorate(
  shared: SharedRefs,
  content: QuantityDecorateContent
): void {
  let done = false;
  let attemptNumber = 0;
  let hintShown = false;
  let attemptStartedAt = Date.now();
  const applied = new Set<number>();

  const card = document.createElement('div');
  card.className = 'bear-art-studio__card bear-art-studio__card--count';

  const slots: HTMLButtonElement[] = [];
  for (let index = 0; index < content.slotCount; index += 1) {
    const slot = document.createElement('button');
    slot.className = 'bear-art-studio__slot';
    slot.type = 'button';
    slot.setAttribute('aria-label', `Sticker spot ${index + 1}`);

    // Add/remove freely; nothing is judged until Check (counting honesty).
    const onSlot = () => {
      if (done) return;
      if (applied.has(index)) {
        applied.delete(index);
        slot.innerHTML = '';
        slot.classList.remove('is-filled');
      } else {
        applied.add(index);
        slot.innerHTML = studioShapeSvg(content.targetSticker);
        slot.classList.add('is-filled');
      }
    };
    slot.addEventListener('click', onSlot);
    cleanupHandlers.push(() => slot.removeEventListener('click', onSlot));
    slots.push(slot);
    card.appendChild(slot);
  }
  shared.board.appendChild(card);

  const checkButton = document.createElement('button');
  checkButton.className = 'child-button bear-art-studio__check';
  checkButton.type = 'button';
  checkButton.textContent = 'Check';
  checkButton.setAttribute('aria-label', 'Check the stickers');
  const onCheck = () => {
    if (done) return;
    attemptNumber += 1;
    const responseTimeMs = Date.now() - attemptStartedAt;
    const appliedQuantity = applied.size;
    const isCorrect = appliedQuantity === content.targetQuantity;
    const baseMetadata = {
      requested_quantity: content.targetQuantity,
      applied_quantity: appliedQuantity,
      sticker_id: content.targetSticker,
      art_surface_id: 'count-card',
    };

    if (!isCorrect) {
      wiggle(card);
      emitStudioEvent(shared, {
        outcome: 'incorrect',
        attemptNumber,
        responseTimeMs,
        selectedAnswer: String(appliedQuantity),
        correctAnswer: String(content.targetQuantity),
        hintShown,
        metadata: {
          ...baseMetadata,
          count_difference: appliedQuantity - content.targetQuantity,
        },
      });
      showFeedback(
        shared.feedback,
        shared.incorrectFeedback.speech ?? "Let's count the stickers.",
        'support'
      );
      speakAndPlay(shared.options, shared.incorrectFeedback);

      if (!hintShown && attemptNumber >= shared.content.maxAttemptsBeforeHint) {
        // Count-along hint: pulse what is already placed; never auto-fill.
        hintShown = true;
        for (const index of applied) {
          slots[index]?.classList.add('is-hinted');
        }
        showFeedback(shared.feedback, shared.hintFeedback.speech ?? "Let's count together.", 'hint');
        speakAndPlay(shared.options, shared.hintFeedback);
        emitStudioEvent(shared, {
          outcome: 'hint_used',
          attemptNumber,
          responseTimeMs,
          selectedAnswer: String(appliedQuantity),
          correctAnswer: String(content.targetQuantity),
          hintShown: true,
          metadata: baseMetadata,
        });
      }
      attemptStartedAt = Date.now();
      return;
    }

    done = true;
    card.classList.add('is-complete');
    disableAll([...slots, checkButton]);
    emitStudioEvent(shared, {
      outcome: 'correct',
      attemptNumber,
      responseTimeMs,
      selectedAnswer: String(appliedQuantity),
      correctAnswer: String(content.targetQuantity),
      hintShown,
      metadata: baseMetadata,
    });
    emitStudioEvent(shared, {
      outcome: 'completed',
      attemptNumber,
      responseTimeMs,
      selectedAnswer: String(appliedQuantity),
      correctAnswer: String(content.targetQuantity),
      hintShown,
      metadata: baseMetadata,
    });
    finishPiece(shared, shared.correctFeedback.speech ?? 'You made it.', card);
  };
  checkButton.addEventListener('click', onCheck);
  cleanupHandlers.push(() => checkButton.removeEventListener('click', onCheck));
  shared.actions.appendChild(checkButton);
}

// — Mode: pattern (color sequencing on a scarf) —

function renderPattern(shared: SharedRefs, content: PatternContent): void {
  let done = false;
  let hintShown = false;
  let missesAtPosition = 0;
  let attemptStartedAt = Date.now();
  let attemptNumber = 0;

  const expected: string[] = Array.from(
    { length: content.patternLength },
    (_, index) => content.patternColorIds[index % content.patternColorIds.length]
  );
  let position = content.patternPrefill;
  const appliedIds: string[] = expected.slice(0, content.patternPrefill);

  const scarf = document.createElement('div');
  scarf.className = 'bear-art-studio__scarf';
  scarf.setAttribute('role', 'img');
  scarf.setAttribute('aria-label', 'Scarf pattern');

  const segments: HTMLElement[] = [];
  for (let index = 0; index < content.patternLength; index += 1) {
    const segment = document.createElement('span');
    segment.className = 'bear-art-studio__segment';
    if (index < content.patternPrefill) {
      const color = content.colors.find((entry) => entry.id === expected[index]);
      segment.style.setProperty('--segment-color', color?.value ?? '#ffffff');
      segment.classList.add('is-filled');
    }
    segments.push(segment);
    scarf.appendChild(segment);
  }
  segments[position]?.classList.add('is-next');
  shared.board.appendChild(scarf);

  const swatches = buildSwatches(shared, content.colors, (color) => {
    if (done) return;
    attemptNumber += 1;
    const responseTimeMs = Date.now() - attemptStartedAt;
    const expectedId = expected[position];
    const expectedColor = content.colors.find((entry) => entry.id === expectedId);
    const isCorrect = color.id === expectedId;
    const positionMetadata = {
      pattern_position: position,
      requested_pattern: expected.join(','),
      expected_color_id: expectedId,
      selected_color_id: color.id,
      art_surface_id: 'scarf',
    };

    if (!isCorrect) {
      missesAtPosition += 1;
      const segment = segments[position];
      if (segment) wiggle(segment);
      emitStudioEvent(shared, {
        outcome: 'incorrect',
        attemptNumber,
        responseTimeMs,
        selectedChoiceId: color.id,
        correctChoiceId: expectedId,
        selectedAnswer: color.label,
        correctAnswer: expectedColor?.label ?? expectedId,
        hintShown,
        metadata: positionMetadata,
      });
      showFeedback(
        shared.feedback,
        shared.incorrectFeedback.speech ?? "Let's check the pattern.",
        'support'
      );
      speakAndPlay(shared.options, shared.incorrectFeedback);

      if (!hintShown && missesAtPosition >= shared.content.maxAttemptsBeforeHint) {
        hintShown = true;
        swatches.get(expectedId)?.classList.add('is-hinted');
        showFeedback(shared.feedback, shared.hintFeedback.speech ?? 'Look at the pattern start.', 'hint');
        speakAndPlay(shared.options, shared.hintFeedback);
        emitStudioEvent(shared, {
          outcome: 'hint_used',
          attemptNumber,
          responseTimeMs,
          selectedChoiceId: color.id,
          correctChoiceId: expectedId,
          selectedAnswer: color.label,
          correctAnswer: expectedColor?.label ?? expectedId,
          hintShown: true,
          metadata: positionMetadata,
        });
      }
      attemptStartedAt = Date.now();
      return;
    }

    // Correct color for this position.
    const segment = segments[position];
    if (segment) {
      segment.style.setProperty('--segment-color', color.value);
      segment.classList.add('is-filled');
      segment.classList.remove('is-next');
    }
    appliedIds.push(color.id);
    swatches.get(expectedId)?.classList.remove('is-hinted');
    emitStudioEvent(shared, {
      outcome: 'correct',
      attemptNumber,
      responseTimeMs,
      selectedChoiceId: color.id,
      correctChoiceId: expectedId,
      selectedAnswer: color.label,
      correctAnswer: color.label,
      hintShown,
      metadata: positionMetadata,
    });

    position += 1;
    missesAtPosition = 0;
    hintShown = false;
    attemptStartedAt = Date.now();

    if (position < content.patternLength) {
      segments[position]?.classList.add('is-next');
      showFeedback(shared.feedback, 'That matches.', 'success');
      return;
    }

    done = true;
    scarf.classList.add('is-complete');
    disableAll(swatches.values());
    emitStudioEvent(shared, {
      outcome: 'completed',
      attemptNumber,
      responseTimeMs,
      selectedAnswer: appliedIds.join(','),
      correctAnswer: expected.join(','),
      hintShown: false,
      metadata: {
        requested_pattern: expected.join(','),
        applied_pattern: appliedIds.join(','),
        art_surface_id: 'scarf',
      },
    });
    finishPiece(shared, shared.correctFeedback.speech ?? 'You finished the pattern.', scarf);
  });
}

// — Mode: fix the art (find and repaint the one wrong region) —

function renderFixArt(shared: SharedRefs, content: FixArtContent): void {
  let selectedColor: StudioColor | null = null;
  let done = false;
  let attemptNumber = 0;
  let hintShown = false;
  let attemptStartedAt = Date.now();

  const colorById = new Map(content.colors.map((color) => [color.id, color]));
  const intendedColor = colorById.get(
    content.regions.find((region) => region.id === content.wrongRegionId)?.colorId ?? ''
  );

  const card = document.createElement('div');
  card.className = 'bear-art-studio__card bear-art-studio__card--fix';

  const regionButtons = new Map<string, HTMLButtonElement>();
  for (const region of content.regions) {
    const isWrong = region.id === content.wrongRegionId;
    const paintedId = isWrong ? content.wrongColorId : region.colorId;
    const painted = colorById.get(paintedId);

    const button = document.createElement('button');
    button.className = 'bear-art-studio__region';
    button.type = 'button';
    button.setAttribute('aria-label', `${region.shape} on the card`);
    button.innerHTML = studioShapeSvg(region.shape, painted?.value);
    regionButtons.set(region.id, button);
    card.appendChild(button);
  }
  shared.board.appendChild(card);

  const swatches = buildSwatches(shared, content.colors, (color) => {
    if (done) return;
    selectedColor = color;
    markSelected(swatches, color.id);
    showFeedback(shared.feedback, color.label, 'hint');
  });

  for (const region of content.regions) {
    const button = regionButtons.get(region.id);
    if (!button) continue;
    const isWrongRegion = region.id === content.wrongRegionId;

    const onRegion = () => {
      if (done) return;
      if (!selectedColor) {
        showFeedback(shared.feedback, 'Pick a color first.', 'support');
        return;
      }

      attemptNumber += 1;
      const responseTimeMs = Date.now() - attemptStartedAt;
      const fixed = isWrongRegion && selectedColor.id === region.colorId;

      if (!fixed) {
        wiggle(button);
        emitStudioEvent(shared, {
          outcome: 'incorrect',
          attemptNumber,
          responseTimeMs,
          selectedChoiceId: selectedColor.id,
          correctChoiceId: intendedColor?.id,
          selectedAnswer: selectedColor.label,
          correctAnswer: intendedColor?.label ?? '',
          hintShown,
          metadata: {
            region_id: region.id,
            region_already_matching: !isWrongRegion,
            wrong_region_id: content.wrongRegionId,
            selected_color_id: selectedColor.id,
            art_surface_id: 'fix-card',
          },
        });
        showFeedback(
          shared.feedback,
          isWrongRegion
            ? (shared.incorrectFeedback.speech ?? "Let's check the card.")
            : 'That one already matches the card.',
          'support'
        );
        speakAndPlay(shared.options, shared.incorrectFeedback);

        if (!hintShown && attemptNumber >= shared.content.maxAttemptsBeforeHint) {
          hintShown = true;
          regionButtons.get(content.wrongRegionId)?.classList.add('is-hinted');
          showFeedback(shared.feedback, shared.hintFeedback.speech ?? 'Find the one that looks different.', 'hint');
          speakAndPlay(shared.options, shared.hintFeedback);
          emitStudioEvent(shared, {
            outcome: 'hint_used',
            attemptNumber,
            responseTimeMs,
            selectedAnswer: selectedColor.label,
            correctAnswer: intendedColor?.label ?? '',
            hintShown: true,
            metadata: {
              wrong_region_id: content.wrongRegionId,
              art_surface_id: 'fix-card',
            },
          });
        }
        attemptStartedAt = Date.now();
        return;
      }

      done = true;
      button.innerHTML = studioShapeSvg(region.shape, selectedColor.value);
      button.classList.remove('is-hinted');
      button.classList.add('is-complete');
      disableAll([...regionButtons.values(), ...swatches.values()]);
      emitStudioEvent(shared, {
        outcome: 'correct',
        attemptNumber,
        responseTimeMs,
        selectedChoiceId: selectedColor.id,
        correctChoiceId: region.colorId,
        selectedAnswer: selectedColor.label,
        correctAnswer: intendedColor?.label ?? selectedColor.label,
        hintShown,
        metadata: {
          detected_mismatch: true,
          corrected_mismatch: true,
          wrong_region_id: content.wrongRegionId,
          wrong_color_id: content.wrongColorId,
          requested_color_id: region.colorId,
          art_surface_id: 'fix-card',
        },
      });
      emitStudioEvent(shared, {
        outcome: 'completed',
        attemptNumber,
        responseTimeMs,
        selectedChoiceId: selectedColor.id,
        correctChoiceId: region.colorId,
        selectedAnswer: selectedColor.label,
        correctAnswer: intendedColor?.label ?? selectedColor.label,
        hintShown,
        metadata: {
          corrected_mismatch: true,
          wrong_region_id: content.wrongRegionId,
          art_surface_id: 'fix-card',
        },
      });
      finishPiece(shared, shared.correctFeedback.speech ?? 'You fixed it.', card);
    };
    button.addEventListener('click', onRegion);
    cleanupHandlers.push(() => button.removeEventListener('click', onRegion));
  }
}

// — Mode: story card (vocabulary — which stickers belong to the story?) —

function renderStoryCard(shared: SharedRefs, content: StoryCardContent): void {
  let done = false;
  let attemptNumber = 0;
  let hintShown = false;
  let attemptStartedAt = Date.now();
  const placed = new Set<StudioShapeId>();

  const card = document.createElement('div');
  card.className = 'bear-art-studio__card bear-art-studio__card--story';

  const slots: HTMLElement[] = [];
  for (let index = 0; index < content.storyStickers.length; index += 1) {
    const slot = document.createElement('span');
    slot.className = 'bear-art-studio__slot bear-art-studio__slot--story';
    slot.setAttribute('aria-hidden', 'true');
    slots.push(slot);
    card.appendChild(slot);
  }
  shared.board.appendChild(card);

  const stickerTray = document.createElement('div');
  stickerTray.className = 'bear-art-studio__stickers';
  stickerTray.setAttribute('aria-label', 'Sticker choices');
  const stickerButtons = new Map<StudioShapeId, HTMLButtonElement>();

  for (const shape of content.stickerPool) {
    const chip = document.createElement('button');
    chip.className = 'bear-art-studio__sticker';
    chip.type = 'button';
    chip.setAttribute('aria-label', `${shape} sticker`);
    chip.innerHTML = studioShapeSvg(shape);

    const onChip = () => {
      if (done || placed.has(shape)) return;
      attemptNumber += 1;
      const responseTimeMs = Date.now() - attemptStartedAt;
      const belongs = content.storyStickers.includes(shape);
      const pickMetadata = {
        story_theme: content.storyTheme,
        sticker_id: shape,
        belongs_to_story: belongs,
        art_surface_id: 'story-card',
      };

      if (!belongs) {
        wiggle(chip);
        emitStudioEvent(shared, {
          outcome: 'incorrect',
          attemptNumber,
          responseTimeMs,
          selectedChoiceId: shape,
          selectedAnswer: shape,
          correctAnswer: content.storyStickers.join(','),
          hintShown,
          metadata: pickMetadata,
        });
        showFeedback(
          shared.feedback,
          shared.incorrectFeedback.speech ?? 'Does that belong in the story?',
          'support'
        );
        speakAndPlay(shared.options, shared.incorrectFeedback);

        if (!hintShown && attemptNumber - placed.size >= shared.content.maxAttemptsBeforeHint) {
          hintShown = true;
          const missing = content.storyStickers.find((id) => !placed.has(id));
          if (missing) stickerButtons.get(missing)?.classList.add('is-hinted');
          showFeedback(shared.feedback, shared.hintFeedback.speech ?? 'Think about the story.', 'hint');
          speakAndPlay(shared.options, shared.hintFeedback);
          emitStudioEvent(shared, {
            outcome: 'hint_used',
            attemptNumber,
            responseTimeMs,
            selectedAnswer: shape,
            correctAnswer: content.storyStickers.join(','),
            hintShown: true,
            metadata: { story_theme: content.storyTheme, art_surface_id: 'story-card' },
          });
        }
        attemptStartedAt = Date.now();
        return;
      }

      // The sticker belongs: it pops onto the next open story slot.
      const slot = slots[placed.size];
      if (slot) {
        slot.innerHTML = studioShapeSvg(shape);
        slot.classList.add('is-filled');
      }
      placed.add(shape);
      chip.classList.remove('is-hinted');
      chip.classList.add('is-placed');
      chip.disabled = true;
      if (placed.size === 1) bearReacts(shared, 'receiving');
      emitStudioEvent(shared, {
        outcome: 'correct',
        attemptNumber,
        responseTimeMs,
        selectedChoiceId: shape,
        selectedAnswer: shape,
        correctAnswer: content.storyStickers.join(','),
        hintShown,
        metadata: pickMetadata,
      });
      attemptStartedAt = Date.now();

      if (placed.size < content.storyStickers.length) {
        showFeedback(shared.feedback, 'That belongs in the story.', 'success');
        return;
      }

      done = true;
      card.classList.add('is-complete');
      disableAll(stickerButtons.values());
      emitStudioEvent(shared, {
        outcome: 'completed',
        attemptNumber,
        responseTimeMs,
        selectedAnswer: [...placed].join(','),
        correctAnswer: content.storyStickers.join(','),
        hintShown,
        metadata: {
          story_theme: content.storyTheme,
          selected_sticker_ids: [...placed].join(','),
          required_sticker_ids: content.storyStickers.join(','),
          art_surface_id: 'story-card',
        },
      });
      finishPiece(shared, shared.correctFeedback.speech ?? 'Story art finished.', card);
    };
    chip.addEventListener('click', onChip);
    cleanupHandlers.push(() => chip.removeEventListener('click', onChip));
    stickerButtons.set(shape, chip);
    stickerTray.appendChild(chip);
  }
  shared.tray.appendChild(stickerTray);
}

// — Content parsing (fail-closed) —

function parseStudioContent(activity: LearningActivity): StudioContent | null {
  const raw = activity.content as Record<string, unknown>;
  if (raw.game !== 'bear-art-studio') return null;

  const mode = raw.art_mode;
  const character = parseCharacter(raw.character);
  const promptAudio = typeof raw.prompt_audio === 'string'
    ? raw.prompt_audio
    : activity.title;
  if (!character) return null;

  const chain: StudioChain = {
    nextActivityId: optionalString(raw.next_activity_id),
    nextLabel: optionalString(raw.next_label),
  };
  const rules = activity.success_rules as Record<string, unknown>;
  const maxAttemptsBeforeHint =
    typeof rules.max_attempts_before_hint === 'number'
      ? rules.max_attempts_before_hint
      : 2;

  const base = { character, promptAudio, chain, maxAttemptsBeforeHint };
  const colors = parseColors(raw.colors);

  switch (mode as ArtMode) {
    case 'free_decorate': {
      const stickers = parseStickers(raw.stickers);
      const slotCount = boundedNumber(raw.slot_count, 1, 8);
      const knownSurfaces = ['card', 'shirt', 'poster', 'wall_frame'] as const;
      const surface = knownSurfaces.find((id) => id === raw.surface) ?? 'card';
      if (raw.surface !== undefined && !knownSurfaces.some((id) => id === raw.surface)) {
        return null;
      }
      if (colors.length === 0 || stickers.length === 0 || slotCount === null) return null;
      return { ...base, mode: 'free_decorate', colors, stickers, slotCount, surface };
    }
    case 'color_request': {
      const subjectShape = raw.subject_shape;
      const targetColor = colors.find((color) => color.id === raw.target_color_id);
      if (!isStudioShapeId(subjectShape) || colors.length < 2 || !targetColor) return null;
      return { ...base, mode: 'color_request', colors, subjectShape, targetColor };
    }
    case 'quantity_decorate': {
      const targetSticker = raw.target_sticker_id;
      const slotCount = boundedNumber(raw.slot_count, 2, 8);
      const targetQuantity = boundedNumber(raw.target_quantity, 1, 8);
      if (
        !isStudioShapeId(targetSticker) ||
        slotCount === null ||
        targetQuantity === null ||
        targetQuantity > slotCount
      ) return null;
      return {
        ...base,
        mode: 'quantity_decorate',
        targetSticker,
        targetQuantity,
        slotCount,
      };
    }
    case 'pattern': {
      const patternColorIds = Array.isArray(raw.pattern_colors)
        ? raw.pattern_colors.filter((id): id is string => typeof id === 'string')
        : [];
      const patternLength = boundedNumber(raw.pattern_length, 3, 10);
      const patternPrefill = boundedNumber(raw.pattern_prefill, 1, 8);
      const allKnown = patternColorIds.every((id) =>
        colors.some((color) => color.id === id)
      );
      if (
        colors.length < 2 ||
        patternColorIds.length < 2 ||
        !allKnown ||
        patternLength === null ||
        patternPrefill === null ||
        patternPrefill >= patternLength
      ) return null;
      return {
        ...base,
        mode: 'pattern',
        colors,
        patternColorIds,
        patternLength,
        patternPrefill,
      };
    }
    case 'story_card': {
      const storyTheme = optionalString(raw.story_theme);
      const stickerPool = parseStickers(raw.sticker_pool);
      const storyStickers = parseStickers(raw.story_sticker_ids);
      const poolHasAll = storyStickers.every((id) => stickerPool.includes(id));
      const hasDistractor = stickerPool.some((id) => !storyStickers.includes(id));
      const uniquePool = new Set(stickerPool).size === stickerPool.length;
      if (
        !storyTheme ||
        storyStickers.length < 1 ||
        stickerPool.length < storyStickers.length + 1 ||
        !poolHasAll ||
        !hasDistractor ||
        !uniquePool
      ) return null;
      return { ...base, mode: 'story_card', storyTheme, stickerPool, storyStickers };
    }
    case 'fix_art': {
      const regions = parseRegions(raw.regions);
      const wrongRegionId = optionalString(raw.wrong_region_id);
      const wrongColorId = optionalString(raw.wrong_color_id);
      const wrongRegion = regions.find((region) => region.id === wrongRegionId);
      const regionColorsKnown = regions.every((region) =>
        colors.some((color) => color.id === region.colorId)
      );
      if (
        colors.length < 2 ||
        regions.length < 2 ||
        !wrongRegion ||
        !wrongColorId ||
        !regionColorsKnown ||
        !colors.some((color) => color.id === wrongColorId) ||
        wrongColorId === wrongRegion.colorId
      ) return null;
      return {
        ...base,
        mode: 'fix_art',
        colors,
        regions,
        wrongRegionId: wrongRegion.id,
        wrongColorId,
      };
    }
    default:
      return null;
  }
}

function parseCharacter(value: unknown): StudioCharacter | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return { id: raw.id, name: raw.name };
}

function parseColors(value: unknown): StudioColor[] {
  if (!Array.isArray(value)) return [];
  return value.filter((color): color is StudioColor => {
    if (typeof color !== 'object' || color === null) return false;
    const raw = color as Record<string, unknown>;
    return (
      typeof raw.id === 'string' &&
      typeof raw.label === 'string' &&
      typeof raw.value === 'string'
    );
  });
}

function parseStickers(value: unknown): StudioShapeId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStudioShapeId);
}

function parseRegions(value: unknown): FixRegion[] {
  if (!Array.isArray(value)) return [];
  const regions: FixRegion[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    if (
      typeof raw.id === 'string' &&
      isStudioShapeId(raw.shape) &&
      typeof raw.color_id === 'string'
    ) {
      regions.push({ id: raw.id, shape: raw.shape, colorId: raw.color_id });
    }
  }
  return regions;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function boundedNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) &&
    value >= min && value <= max
    ? value
    : null;
}

function getFeedbackRule(value: unknown): FeedbackRule {
  if (typeof value !== 'object' || value === null) return {};
  const rule = value as Record<string, unknown>;
  return {
    speech: typeof rule.speech === 'string' ? rule.speech : undefined,
    sound: typeof rule.sound === 'string' ? rule.sound : undefined,
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

function speakAndPlay(options: BearArtStudioOptions, feedback: FeedbackRule): void {
  if (feedback.speech) {
    options.speech.speak(feedback.speech);
  }
  if (feedback.sound) {
    options.audio.play(feedback.sound);
  }
}

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderStudioUnavailable(parent: HTMLElement): void {
  container = document.createElement('div');
  container.className = 'child-container activity-screen';

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = 'Art studio needs setup';
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
