import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent } from '../../types/events';
import type {
  AudioServiceInterface,
  SpeechServiceInterface,
} from '../../types/runtime';
import type {
  BearCafeColor,
  BearCafeContent,
  BearCafeDecoration,
  BearCafeFood,
  BearCafeRequiredOrder,
} from './kennedis-orders.types';
import { renderBearArt } from './bear-art';
import { renderFoodArt } from './food-art';

interface KennedisOrdersOptions {
  activity: LearningActivity;
  childId: string;
  sessionId: string;
  speech: SpeechServiceInterface;
  audio: AudioServiceInterface;
  onEvent: (event: ActivityAttemptEvent) => void;
}

export interface TrayState {
  foodCounts: Record<string, number>;
  colorId?: string;
  decorationId?: string;
}

type ViewStage = 'phone' | 'make' | 'fix' | 'plating' | 'delivery' | 'handoff' | 'complete';

// Duration of the delivery handoff beat (the plated food travels to the bear and
// the bear receives it) before the round completes. Kept in sync with the
// cafeHandoffTravel/cafeHandoffReceive CSS animations.
const HANDOFF_DURATION_MS = 900;

// Duration of the cook/plating beat (the order assembles/plates up) between a
// correct check and the "Order ready!" delivery stage. Cosmetic only — the
// tray_checked event is already emitted synchronously on the check, so an
// interrupted beat drops no evidence.
const PLATING_DURATION_MS = 800;

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];
let idleNudgeTimer: number | null = null;

// After this long with no interaction on the make/fix stage, gently nudge the
// order card to re-draw attention to the task. Bounded — fires once per idle
// period and is re-armed on any interaction (every render clears + re-arms it),
// so it is neither a speech nag nor an autoplay loop.
const IDLE_NUDGE_MS = 9000;

export function renderKennedisOrdersActivity(
  parent: HTMLElement,
  options: KennedisOrdersOptions
): void {
  destroyKennedisOrdersActivity();

  const content = getBearCafeContent(options.activity);
  if (!content) {
    renderActivityUnavailable(parent);
    return;
  }

  const tray: TrayState = createInitialTray(content);
  let stage: ViewStage = 'phone';
  let attemptNumber = 0;
  let hintShown = false;
  let replayCount = 0;
  let phoneIntroSpoken = false;
  let roundStartedAt = Date.now();
  let attemptStartedAt = roundStartedAt;
  let feedbackTone: 'success' | 'support' | 'hint' = 'support';
  let feedbackText = '';

  container = document.createElement('div');
  container.className = 'child-container activity-screen bear-cafe';
  container.id = `activity-${options.activity.id}`;

  const render = () => {
    if (!container) return;
    container.innerHTML = '';

    // Any render means the stage changed or the child interacted — reset the
    // idle nudge so it only fires after a genuine pause.
    if (idleNudgeTimer !== null) {
      window.clearTimeout(idleNudgeTimer);
      idleNudgeTimer = null;
    }

    container.appendChild(createTopBar(() => {
      // Replaying the prompt is a no-penalty repeat, not a hint or an attempt.
      // The count still reaches parent evidence via the replay_count metadata
      // on the real tray_checked/order_delivered events. Emitting a separate
      // event here would have to pick an AttemptOutcome, and every outcome
      // pollutes a parent-facing metric (hint_used inflates the hint count).
      replayCount += 1;
      attemptStartedAt = Date.now();
      options.speech.speak(content.prompt_audio);
    }));

    const title = document.createElement('h1');
    title.className = 'activity-title bear-cafe__title';
    title.textContent = 'Bear Cafe';
    container.appendChild(title);
    renderShiftPanel(container, content);
    renderRoleBadge(container, stage);

    if (stage === 'phone') {
      if (!phoneIntroSpoken) {
        phoneIntroSpoken = true;
        options.speech.speak(`${content.character.name} is calling. You're the order taker.`);
      }
      renderPhoneStage(container, content, () => {
        stage = 'make';
        roundStartedAt = Date.now();
        attemptStartedAt = roundStartedAt;
        options.speech.speak(content.prompt_audio);
        render();
      });
      return;
    }

    if (stage === 'plating') {
      renderPlatingStage(container, content, tray);
      const platingTimer = window.setTimeout(() => {
        options.audio.play('soft_chime');
        options.speech.speak('Order ready.');
        stage = 'delivery';
        render();
      }, PLATING_DURATION_MS);
      cleanupHandlers.push(() => window.clearTimeout(platingTimer));
      return;
    }

    if (stage === 'delivery') {
      renderDeliveryStage(container, content, options, () => {
        // Emit completion synchronously on the delivery commit, before the
        // cosmetic handoff beat. Tapping Home during the beat tears the view
        // down and clears the handoff timer, so the order_delivered event must
        // not depend on that timer firing.
        emitCompletedEvent({
          options,
          content,
          tray,
          attemptNumber: Math.max(1, attemptNumber),
          responseTimeMs: Date.now() - roundStartedAt,
          hintShown,
          replayCount,
        });
        stage = 'handoff';
        render();
      });
      return;
    }

    if (stage === 'handoff') {
      renderHandoffStage(container, content, tray);
      const handoffTimer = window.setTimeout(() => {
        stage = 'complete';
        options.audio.play('soft_chime');
        options.speech.speak(content.character.happyLine);
        render();
      }, HANDOFF_DURATION_MS);
      cleanupHandlers.push(() => window.clearTimeout(handoffTimer));
      return;
    }

    if (stage === 'complete') {
      renderCompleteStage(container, content);
      return;
    }

    const workbench = document.createElement('section');
    workbench.className = 'bear-cafe-workbench';
    workbench.setAttribute('aria-label', 'Bear Cafe workbench');

    const orderColumn = document.createElement('div');
    orderColumn.className = 'bear-cafe-workbench__order';
    const kitchenColumn = document.createElement('div');
    kitchenColumn.className = 'bear-cafe-workbench__kitchen';
    workbench.append(orderColumn, kitchenColumn);
    container.appendChild(workbench);

    const handlers = {
      onFoodTap: (food: BearCafeFood) => {
        updateFoodSelection(content, tray, food.id);
        feedbackText = '';
        render();
      },
      onColorTap: (color: BearCafeColor) => {
        tray.colorId = color.id;
        feedbackText = '';
        render();
      },
      onDecorationTap: (decoration: BearCafeDecoration) => {
        tray.decorationId = decoration.id;
        feedbackText = '';
        render();
      },
      onCheck: () => {
        attemptNumber += 1;
        const result = evaluateTray(content, tray);
        const responseTimeMs = Date.now() - attemptStartedAt;

        emitAttemptEvent({
          options,
          content,
          tray,
          outcome: result.correct ? 'correct' : 'incorrect',
          attemptNumber,
          responseTimeMs,
          hintShown,
          replayCount,
          issue: result.issue,
        });

        if (result.correct) {
          feedbackTone = 'success';
          feedbackText = 'Order ready.';
          // Play the cook/plating beat first; the "Order ready" chime + speech
          // fire when it resolves to the delivery stage.
          stage = 'plating';
          render();
          return;
        }

        stage = 'fix';
        feedbackTone = attemptNumber >= 2 ? 'hint' : 'support';
        hintShown = hintShown || attemptNumber >= 2;
        feedbackText = getFixFeedback(content, result.issue, attemptNumber);
        options.audio.play('soft_boing');
        options.speech.speak(feedbackText);

        if (hintShown) {
          emitAttemptEvent({
            options,
            content,
            tray,
            outcome: 'hint_used',
            attemptNumber,
            responseTimeMs,
            hintShown,
            replayCount,
            issue: result.issue,
          });
        }

        attemptStartedAt = Date.now();
        render();
      },
    };

    renderOrderCard(orderColumn, content);
    renderCheckAction(orderColumn, stage, !hasAnyFood(tray), handlers.onCheck);
    renderTray(orderColumn, content, tray, (foodId) => {
      removeOneFood(tray, foodId);
      feedbackText = '';
      render();
    });
    renderKitchenStage(kitchenColumn, content, tray, handlers);

    if (feedbackText) {
      const feedback = document.createElement('p');
      feedback.className = 'activity-feedback';
      feedback.dataset.tone = feedbackTone;
      feedback.setAttribute('aria-live', 'polite');
      feedback.textContent = feedbackText;
      container.appendChild(feedback);
    }

    // Arm the idle nudge for this make/fix render (other stages return earlier
    // and never reach here). Cleared at the top of the next render/teardown.
    idleNudgeTimer = window.setTimeout(() => {
      container
        ?.querySelector('.bear-cafe-order')
        ?.classList.add('bear-cafe-order--nudge');
    }, IDLE_NUDGE_MS);
  };

  parent.appendChild(container);
  render();
}

export function destroyKennedisOrdersActivity(): void {
  for (const cleanup of cleanupHandlers) cleanup();
  cleanupHandlers = [];

  if (idleNudgeTimer !== null) {
    window.clearTimeout(idleNudgeTimer);
    idleNudgeTimer = null;
  }

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
  repeatButton.setAttribute('aria-label', 'Repeat order');
  repeatButton.addEventListener('click', onRepeat);
  topBar.appendChild(repeatButton);

  return topBar;
}

function renderRoleBadge(parent: HTMLElement, stage: ViewStage): void {
  const role = getStageRole(stage);
  if (!role) return;

  const badge = document.createElement('p');
  badge.className = 'bear-cafe-role';
  badge.innerHTML = `
    <span aria-hidden="true">${role.icon}</span>
    <span>You're the ${role.label}</span>
  `;
  parent.appendChild(badge);
}

function getStageRole(stage: ViewStage): { icon: string; label: string } | null {
  switch (stage) {
    case 'phone':
      return { icon: '☎', label: 'order taker' };
    case 'make':
      return { icon: '🧑‍🍳', label: 'chef' };
    case 'fix':
      return { icon: '🔍', label: 'order checker' };
    case 'delivery':
      return { icon: '🛎️', label: 'delivery boss' };
    default:
      return null;
  }
}

function renderPhoneStage(
  parent: HTMLElement,
  content: BearCafeContent,
  onAnswer: () => void
): void {
  const phoneCard = document.createElement('section');
  phoneCard.className = 'bear-cafe-phone';

  const phone = document.createElement('button');
  phone.className = 'bear-cafe-phone__button';
  phone.type = 'button';
  phone.setAttribute('aria-label', `${content.character.name} is calling`);
  phone.innerHTML = `
    <span class="bear-cafe-phone__icon bear-cafe-phone__icon--ringing" aria-hidden="true">☎</span>
    <span class="bear-cafe-phone__portrait" aria-hidden="true">${renderBearArt(content.character.id, 'happy')}</span>
    <span class="bear-cafe-phone__caller">${content.character.name} is calling</span>
    <span class="bear-cafe-phone__shift">${content.round_label ?? 'Order time'}</span>
    <span class="bear-cafe-phone__line">${content.character.callLine}</span>
    <span class="bear-cafe-phone__answer">Tap to answer</span>
  `;
  phone.addEventListener('click', onAnswer);

  phoneCard.appendChild(phone);
  parent.appendChild(phoneCard);
}

function renderShiftPanel(parent: HTMLElement, content: BearCafeContent): void {
  const panel = document.createElement('section');
  panel.className = 'bear-cafe-shift';
  panel.setAttribute('aria-label', 'Cafe shift progress');

  const label = document.createElement('p');
  label.className = 'bear-cafe-shift__label';
  label.textContent = content.shift_label ?? 'Bear Cafe shift';
  panel.appendChild(label);

  if (typeof content.round_index === 'number' && typeof content.round_total === 'number') {
    const progress = document.createElement('div');
    progress.className = 'bear-cafe-shift__dots';
    progress.setAttribute('aria-hidden', 'true');

    for (let index = 1; index <= content.round_total; index += 1) {
      const dot = document.createElement('span');
      dot.dataset.active = index <= content.round_index ? 'true' : 'false';
      progress.appendChild(dot);
    }

    panel.appendChild(progress);
  }

  const round = document.createElement('p');
  round.className = 'bear-cafe-shift__round';
  round.textContent = content.round_label ?? 'Make the order';
  panel.appendChild(round);

  parent.appendChild(panel);
}

function renderOrderCard(parent: HTMLElement, content: BearCafeContent): void {
  const order = document.createElement('section');
  order.className = 'bear-cafe-order';
  order.innerHTML = `
    <div class="bear-cafe-order__bear" aria-hidden="true">${renderBearArt(content.character.id, 'waiting')}</div>
    <div>
      <p class="bear-cafe-order__caller">${content.character.name}</p>
      <p class="bear-cafe-order__meta">Order ticket</p>
      <p class="bear-cafe-order__ticket">${content.order_ticket}</p>
    </div>
  `;
  parent.appendChild(order);
}

function renderTray(
  parent: HTMLElement,
  content: BearCafeContent,
  tray: TrayState,
  onFoodRemove: (foodId: string) => void
): void {
  const trayArea = document.createElement('section');
  trayArea.className = 'bear-cafe-tray';
  trayArea.setAttribute('aria-label', 'Order tray');

  const trayTitle = document.createElement('p');
  trayTitle.className = 'bear-cafe-tray__title';
  trayTitle.textContent = 'Tray';
  trayArea.appendChild(trayTitle);

  const plate = document.createElement('div');
  plate.className = 'bear-cafe-plate';
  const trayColor = content.colors?.find((color) => color.id === tray.colorId);
  if (trayColor) {
    plate.style.setProperty('--bear-cafe-plate-ring', trayColor.value);
    plate.dataset.colored = 'true';
  }

  const foodEntries = Object.entries(tray.foodCounts).filter(([, count]) => count > 0);
  if (foodEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bear-cafe-tray__empty';
    empty.textContent = 'Pick food for the order.';
    plate.appendChild(empty);
  } else {
    for (const [foodId, count] of foodEntries) {
      const food = content.foods.find((entry) => entry.id === foodId);
      if (!food) continue;
      for (let index = 0; index < count; index += 1) {
        const item = document.createElement('button');
        item.className = 'bear-cafe-plate__food';
        item.type = 'button';
        item.setAttribute('aria-label', `Remove one ${food.label}`);
        item.innerHTML = renderFoodArt(food.id);
        item.addEventListener('click', () => onFoodRemove(foodId));
        plate.appendChild(item);
      }
    }
  }

  const decoration = content.decorations?.find((entry) => entry.id === tray.decorationId);
  if (decoration) {
    const decorationBadge = document.createElement('span');
    decorationBadge.className = 'bear-cafe-plate__decoration';
    decorationBadge.setAttribute('aria-hidden', 'true');
    decorationBadge.textContent = decoration.icon;
    plate.appendChild(decorationBadge);
  }

  trayArea.appendChild(plate);

  const details = document.createElement('p');
  details.className = 'bear-cafe-tray__details';
  const colorLabel = content.colors?.find((color) => color.id === tray.colorId)?.label;
  const decorationLabel = content.decorations?.find((decorationEntry) => (
    decorationEntry.id === tray.decorationId
  ))?.label;
  details.textContent = [colorLabel, decorationLabel].filter(Boolean).join(' + ');
  trayArea.appendChild(details);

  parent.appendChild(trayArea);
}

function renderKitchenStage(
  parent: HTMLElement,
  content: BearCafeContent,
  tray: TrayState,
  handlers: {
    onFoodTap: (food: BearCafeFood) => void;
    onColorTap: (color: BearCafeColor) => void;
    onDecorationTap: (decoration: BearCafeDecoration) => void;
  }
): void {
  const kitchen = document.createElement('section');
  kitchen.className = 'bear-cafe-kitchen';

  const foodGrid = document.createElement('div');
  foodGrid.className = 'bear-cafe-choice-grid';
  foodGrid.setAttribute('aria-label', 'Food choices');

  for (const food of content.foods) {
    const button = document.createElement('button');
    button.className = 'bear-cafe-food';
    button.type = 'button';
    button.dataset.selected = tray.foodCounts[food.id] ? 'true' : 'false';
    button.setAttribute('aria-label', `Choose ${food.label}`);
    button.innerHTML = `
      <span class="bear-cafe-food__icon" aria-hidden="true">${renderFoodArt(food.id)}</span>
      <span class="bear-cafe-food__label">${food.label}</span>
      ${tray.foodCounts[food.id] ? `<span class="bear-cafe-food__count">${tray.foodCounts[food.id]}</span>` : ''}
    `;
    button.addEventListener('click', () => handlers.onFoodTap(food));
    foodGrid.appendChild(button);
  }

  kitchen.appendChild(foodGrid);

  if (shouldShowColors(content)) {
    const colorGrid = document.createElement('div');
    colorGrid.className = 'bear-cafe-swatches';
    colorGrid.setAttribute('aria-label', 'Color choices');
    for (const color of content.colors ?? []) {
      const button = document.createElement('button');
      button.className = 'bear-cafe-swatch';
      button.type = 'button';
      button.style.setProperty('--bear-cafe-swatch', color.value);
      button.dataset.selected = tray.colorId === color.id ? 'true' : 'false';
      button.textContent = color.label;
      button.setAttribute('aria-label', `Choose ${color.label}`);
      button.addEventListener('click', () => handlers.onColorTap(color));
      colorGrid.appendChild(button);
    }
    kitchen.appendChild(colorGrid);
  }

  if (shouldShowDecorations(content)) {
    const decorationGrid = document.createElement('div');
    decorationGrid.className = 'bear-cafe-decorations';
    decorationGrid.setAttribute('aria-label', 'Decoration choices');
    for (const decoration of content.decorations ?? []) {
      const button = document.createElement('button');
      button.className = 'bear-cafe-decoration';
      button.type = 'button';
      button.dataset.selected = tray.decorationId === decoration.id ? 'true' : 'false';
      button.setAttribute('aria-label', `Choose ${decoration.label}`);
      button.innerHTML = `
        <span aria-hidden="true">${decoration.icon}</span>
        <span>${decoration.label}</span>
      `;
      button.addEventListener('click', () => handlers.onDecorationTap(decoration));
      decorationGrid.appendChild(button);
    }
    kitchen.appendChild(decorationGrid);
  }

  parent.appendChild(kitchen);
}

function renderCheckAction(
  parent: HTMLElement,
  stage: Extract<ViewStage, 'make' | 'fix'>,
  disabled: boolean,
  onCheck: () => void
): void {
  const actionRow = document.createElement('div');
  actionRow.className = 'bear-cafe-actions';

  const checkButton = document.createElement('button');
  checkButton.className = 'child-button bear-cafe-check';
  checkButton.type = 'button';
  checkButton.textContent = stage === 'fix' ? 'Fixed it' : 'Check order';
  checkButton.disabled = disabled;
  checkButton.addEventListener('click', onCheck);
  actionRow.appendChild(checkButton);

  parent.appendChild(actionRow);
}

function renderPlatingStage(
  parent: HTMLElement,
  content: BearCafeContent,
  tray: TrayState
): void {
  const plating = document.createElement('section');
  plating.className = 'bear-cafe-plating';

  const plate = document.createElement('div');
  plate.className = 'bear-cafe-plating__plate';
  plate.setAttribute('aria-hidden', 'true');
  const foodIcons = getPlatedFoodIcons(content, tray);
  plate.innerHTML = foodIcons || renderFoodArt('plate');

  const text = document.createElement('p');
  text.className = 'bear-cafe-plating__text';
  text.setAttribute('role', 'status');
  text.textContent = 'Plating your order…';

  plating.appendChild(plate);
  plating.appendChild(text);
  parent.appendChild(plating);
}

function renderHandoffStage(
  parent: HTMLElement,
  content: BearCafeContent,
  tray: TrayState
): void {
  const handoff = document.createElement('section');
  handoff.className = 'bear-cafe-handoff';

  const track = document.createElement('div');
  track.className = 'bear-cafe-handoff__track';

  const trayEl = document.createElement('div');
  trayEl.className = 'bear-cafe-handoff__tray';
  trayEl.setAttribute('aria-hidden', 'true');
  const foodIcons = getPlatedFoodIcons(content, tray);
  trayEl.innerHTML = foodIcons || renderFoodArt('plate');

  const bear = document.createElement('div');
  bear.className = 'bear-cafe-handoff__bear';
  bear.setAttribute('aria-hidden', 'true');
  bear.innerHTML = renderBearArt(content.character.id, 'receiving');

  track.appendChild(trayEl);
  track.appendChild(bear);

  const text = document.createElement('p');
  text.className = 'bear-cafe-handoff__text';
  text.setAttribute('role', 'status');
  text.textContent = 'Delivering…';

  handoff.appendChild(track);
  handoff.appendChild(text);
  parent.appendChild(handoff);
}

function renderDeliveryStage(
  parent: HTMLElement,
  content: BearCafeContent,
  options: KennedisOrdersOptions,
  onDeliver: () => void
): void {
  const delivery = document.createElement('section');
  delivery.className = 'bear-cafe-delivery';
  delivery.innerHTML = `
    <div class="bear-cafe-ready" role="status">
      <span class="bear-cafe-ready__bell" aria-hidden="true">🔔</span>
      <span>Order ready!</span>
    </div>
  `;

  const button = document.createElement('button');
  button.className = 'child-button bear-cafe-deliver-button';
  button.type = 'button';
  button.textContent = 'Deliver it';
  button.addEventListener('click', () => {
    options.speech.speak('You delivered it.');
    onDeliver();
  });
  delivery.appendChild(button);

  const deliveryScene = document.createElement('div');
  deliveryScene.className = 'bear-cafe-delivery__scene';
  deliveryScene.innerHTML = `
    <div class="bear-cafe-delivery__basket" aria-hidden="true">
      <span>🧺</span>
      <span>To the window</span>
    </div>
    <div class="bear-cafe-delivery__window" aria-hidden="true">
      ${renderBearArt(content.character.id, 'waiting')}
    </div>
  `;
  delivery.appendChild(deliveryScene);
  parent.appendChild(delivery);
}

function renderCompleteStage(parent: HTMLElement, content: BearCafeContent): void {
  const complete = document.createElement('section');
  complete.className = 'bear-cafe-complete';
  complete.innerHTML = `
    <div class="bear-cafe-complete__bear" aria-hidden="true">${renderBearArt(content.character.id, 'happy')}</div>
    <p class="bear-cafe-complete__text">Order delivered.</p>
  `;

  // A one-time celebration burst on completion (issue #3 "minimal completion
  // payoff"). Consistent every time and deterministic by index — a positive
  // finish cue, not a variable/random reward loop. Reduced-motion hides it.
  const celebrate = document.createElement('div');
  celebrate.className = 'bear-cafe-celebrate';
  celebrate.setAttribute('aria-hidden', 'true');
  const CELEBRATE_GLYPHS = ['🎉', '✨', '⭐', '💛', '🎊', '🌟'];
  const CELEBRATE_PIECES = 12;
  for (let i = 0; i < CELEBRATE_PIECES; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'bear-cafe-celebrate__piece';
    const angle = ((2 * Math.PI) / CELEBRATE_PIECES) * i;
    const distance = 96;
    piece.style.setProperty('--tx', `${Math.round(Math.cos(angle) * distance)}px`);
    piece.style.setProperty('--ty', `${Math.round(Math.sin(angle) * distance)}px`);
    piece.style.setProperty('--delay', `${(i % 3) * 60}ms`);
    piece.textContent = CELEBRATE_GLYPHS[i % CELEBRATE_GLYPHS.length];
    celebrate.appendChild(piece);
  }
  complete.appendChild(celebrate);

  const actions = document.createElement('div');
  actions.className = 'activity-complete-actions bear-cafe-complete__actions';

  if (content.next_activity_id) {
    const nextButton = document.createElement('button');
    nextButton.className = 'child-button';
    nextButton.type = 'button';
    nextButton.textContent = content.next_label ?? 'Next order';
    nextButton.addEventListener('click', () => {
      window.location.hash = `#activity/${content.next_activity_id}`;
    });
    actions.appendChild(nextButton);
  }

  if (content.shift_restart_activity_id) {
    const restartButton = document.createElement('button');
    restartButton.className = 'child-button';
    restartButton.type = 'button';
    restartButton.textContent = 'New shift';
    restartButton.addEventListener('click', () => {
      window.location.hash = `#activity/${content.shift_restart_activity_id}`;
    });
    actions.appendChild(restartButton);
  }

  const homeButton = document.createElement('button');
  homeButton.className = 'child-button';
  homeButton.type = 'button';
  homeButton.textContent = 'Done';
  homeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  actions.appendChild(homeButton);

  complete.appendChild(actions);
  parent.appendChild(complete);
}

function renderActivityUnavailable(parent: HTMLElement): void {
  container = document.createElement('div');
  container.className = 'child-container activity-screen';

  const title = document.createElement('h1');
  title.className = 'activity-title';
  title.textContent = 'Cafe needs setup';
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

export function getBearCafeContent(activity: LearningActivity): BearCafeContent | null {
  const value = activity.content as Partial<BearCafeContent>;
  if (
    value.game !== 'kennedis-orders' ||
    typeof value.mode !== 'string' ||
    !value.character ||
    typeof value.prompt_audio !== 'string' ||
    typeof value.order_ticket !== 'string' ||
    !Array.isArray(value.foods)
  ) {
    return null;
  }

  return value as BearCafeContent;
}

function updateFoodSelection(
  content: BearCafeContent,
  tray: TrayState,
  foodId: string
): void {
  if (content.mode === 'first_sound_sort') {
    tray.foodCounts[foodId] = tray.foodCounts[foodId] ? 0 : 1;
    return;
  }

  if (content.mode === 'quantity' || content.mode === 'two_part') {
    tray.foodCounts[foodId] = Math.min((tray.foodCounts[foodId] ?? 0) + 1, 5);
    return;
  }

  tray.foodCounts = { [foodId]: 1 };
}

function removeOneFood(tray: TrayState, foodId: string): void {
  const currentCount = tray.foodCounts[foodId] ?? 0;
  if (currentCount <= 1) {
    delete tray.foodCounts[foodId];
    return;
  }

  tray.foodCounts[foodId] = currentCount - 1;
}

export function evaluateTray(
  content: BearCafeContent,
  tray: TrayState
): { correct: boolean; issue: string } {
  const required = content.required_order;

  if (!required) {
    return {
      correct: hasAnyFood(tray),
      issue: hasAnyFood(tray) ? 'none' : 'missing_food',
    };
  }

  if (required.food_ids) {
    const selectedFoodIds = getSelectedFoodIds(tray).sort();
    const correctFoodIds = [...required.food_ids].sort();
    const sameSet = selectedFoodIds.length === correctFoodIds.length &&
      selectedFoodIds.every((foodId, index) => foodId === correctFoodIds[index]);
    return {
      correct: sameSet,
      issue: sameSet ? 'none' : 'first_sound_sort',
    };
  }

  if (required.food_id) {
    if (!tray.foodCounts[required.food_id]) {
      return { correct: false, issue: 'food' };
    }
    const hasOtherFood = getSelectedFoodIds(tray).some((foodId) => (
      foodId !== required.food_id
    ));
    if (hasOtherFood) {
      return { correct: false, issue: 'food' };
    }
  }

  if (typeof required.quantity === 'number') {
    const selectedCount = required.food_id
      ? tray.foodCounts[required.food_id] ?? 0
      : getTotalFoodCount(tray);
    if (selectedCount !== required.quantity) {
      return {
        correct: false,
        issue: selectedCount < required.quantity ? 'quantity_under' : 'quantity_over',
      };
    }
  }

  if (required.color_id && tray.colorId !== required.color_id) {
    return { correct: false, issue: 'color' };
  }

  return { correct: true, issue: 'none' };
}

function getFixFeedback(
  content: BearCafeContent,
  issue: string,
  attemptNumber: number
): string {
  if (attemptNumber < 2) return "Let's check the order.";

  const required = content.required_order;
  switch (issue) {
    case 'quantity_under':
    case 'quantity_over':
      return `${content.character.name} asked for ${required?.quantity ?? 'more'}. Let's count.`;
    case 'color': {
      const colorLabel = content.colors?.find((color) => (
        color.id === required?.color_id
      ))?.label ?? 'that color';
      return `${content.character.name} wanted ${colorLabel}.`;
    }
    case 'first_sound_sort':
      return 'Bear starts with b-b-b. Banana starts with b-b-b.';
    case 'food':
      return `${content.character.name} asked for ${getFoodLabel(content, required?.food_id)}.`;
    default:
      return 'You can fix it.';
  }
}

function shouldShowColors(content: BearCafeContent): boolean {
  return Array.isArray(content.colors) && (
    content.mode === 'free_make' ||
    content.mode === 'single_attribute' ||
    Boolean(content.required_order?.color_id)
  );
}

function shouldShowDecorations(content: BearCafeContent): boolean {
  return Array.isArray(content.decorations) && content.mode === 'free_make';
}

function hasAnyFood(tray: TrayState): boolean {
  return getTotalFoodCount(tray) > 0;
}

function getTotalFoodCount(tray: TrayState): number {
  return Object.values(tray.foodCounts).reduce((sum, count) => sum + count, 0);
}

function getSelectedFoodIds(tray: TrayState): string[] {
  return Object.entries(tray.foodCounts)
    .filter(([, count]) => count > 0)
    .map(([foodId]) => foodId);
}

// Illustrated plate art, expanded by quantity so a correct multi-count order
// (e.g. { cookie: 2 }) shows two cookies, not one. The plating and handoff beats
// must never contradict a correct quantity answer.
export function getPlatedFoodIcons(content: BearCafeContent, tray: TrayState): string {
  return Object.entries(tray.foodCounts)
    .filter(([, count]) => count > 0)
    .flatMap(([foodId, count]) => {
      const known = content.foods.some((food) => food.id === foodId);
      return known ? Array.from({ length: count }, () => renderFoodArt(foodId)) : [];
    })
    .join('');
}

function getSelectedAnswer(content: BearCafeContent, tray: TrayState): string {
  const foods = Object.entries(tray.foodCounts)
    .filter(([, count]) => count > 0)
    .map(([foodId, count]) => {
      const label = getFoodLabel(content, foodId);
      return count > 1 ? `${count} ${label}` : label;
    });
  const color = content.colors?.find((entry) => entry.id === tray.colorId)?.label;
  const decoration = content.decorations?.find((entry) => (
    entry.id === tray.decorationId
  ))?.label;

  return [...foods, color, decoration].filter(Boolean).join(', ') || 'empty tray';
}

function getCorrectAnswer(content: BearCafeContent): string {
  const required = content.required_order;
  if (!required) return 'any snack';

  if (required.food_ids) {
    return required.food_ids.map((foodId) => getFoodLabel(content, foodId)).join(', ');
  }

  const parts = [];
  if (typeof required.quantity === 'number') parts.push(String(required.quantity));
  if (required.color_id) {
    const colorLabel = content.colors?.find((entry) => entry.id === required.color_id)?.label;
    parts.push(colorLabel ?? required.color_id);
  }
  if (required.food_id) parts.push(getFoodLabel(content, required.food_id));
  return parts.join(' ');
}

function getFoodLabel(content: BearCafeContent, foodId: string | undefined): string {
  if (!foodId) return 'food';
  return content.foods.find((food) => food.id === foodId)?.label ?? foodId;
}

function emitAttemptEvent(params: {
  options: KennedisOrdersOptions;
  content: BearCafeContent;
  tray: TrayState;
  outcome: ActivityAttemptEvent['outcome'];
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
  replayCount: number;
  issue: string;
}): void {
  const event = createKennedisOrdersEvent({
    activity: params.options.activity,
    content: params.content,
    sessionId: params.options.sessionId,
    childId: params.options.childId,
    outcome: params.outcome,
    tray: params.tray,
    attemptNumber: params.attemptNumber,
    responseTimeMs: params.responseTimeMs,
    hintShown: params.hintShown,
    replayCount: params.replayCount,
    eventName: params.outcome === 'hint_used' ? 'hint_shown' : 'tray_checked',
    issue: params.issue,
  });

  params.options.onEvent(event);
}

function emitCompletedEvent(params: {
  options: KennedisOrdersOptions;
  content: BearCafeContent;
  tray: TrayState;
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
  replayCount: number;
}): void {
  const event = createKennedisOrdersEvent({
    activity: params.options.activity,
    content: params.content,
    sessionId: params.options.sessionId,
    childId: params.options.childId,
    outcome: 'completed',
    tray: params.tray,
    attemptNumber: params.attemptNumber,
    responseTimeMs: params.responseTimeMs,
    hintShown: params.hintShown,
    replayCount: params.replayCount,
    eventName: 'order_delivered',
  });

  params.options.onEvent(event);
}

export function createKennedisOrdersEvent(params: {
  activity: LearningActivity;
  content: BearCafeContent;
  sessionId: string;
  childId: string;
  outcome: ActivityAttemptEvent['outcome'];
  tray: TrayState;
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
  replayCount?: number;
  eventName: string;
  issue?: string;
}): ActivityAttemptEvent {
  const selectedFoodIds = getSelectedFoodIds(params.tray);

  return {
    event_id: createEventId(),
    session_id: params.sessionId,
    child_id: params.childId,
    activity_id: params.activity.id,
    activity_version: params.activity.version,
    skill_ids: params.activity.skill_ids,
    timestamp: new Date().toISOString(),
    prompt_text: params.content.prompt_audio,
    outcome: params.outcome,
    selected_choice_id: selectedFoodIds.join(','),
    correct_choice_id: getCorrectChoiceId(params.content.required_order),
    selected_answer: getSelectedAnswer(params.content, params.tray),
    correct_answer: getCorrectAnswer(params.content),
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: params.activity.difficulty.level,
    choice_count: params.activity.difficulty.choice_count,
    distractor_strength: params.activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: params.hintShown,
    metadata: {
      ...createTransferMetadata(params.activity),
      ...createEvidenceMetadata(params.content),
      event_name: params.eventName,
      issue: params.issue ?? 'none',
      corrected: (
        (params.outcome === 'correct' || params.outcome === 'completed') &&
        params.attemptNumber > 1
      ),
      replay_count: params.replayCount ?? 0,
      selected_food_ids: selectedFoodIds.join(','),
      selected_quantity: getTotalFoodCount(params.tray),
      selected_color_id: params.tray.colorId ?? '',
      selected_decoration_id: params.tray.decorationId ?? '',
      parent_evidence_summary: params.content.parent_evidence_summary ?? '',
    },
  };
}

function createEvidenceMetadata(content: BearCafeContent): Record<string, string | number | boolean> {
  return {
    game_mode: content.mode,
    caller_id: content.character.id,
    ...(typeof content.round_index === 'number' ? { round_index: content.round_index } : {}),
    ...(typeof content.round_total === 'number' ? { round_total: content.round_total } : {}),
    ...(typeof content.required_order?.quantity === 'number'
      ? { required_quantity: content.required_order.quantity }
      : {}),
    ...(content.required_order?.color_id ? { required_color_id: content.required_order.color_id } : {}),
  };
}

function createTransferMetadata(activity: LearningActivity): Record<string, string | number | boolean> {
  return {
    context_id: activity.transfer.context_id,
    context_type: activity.transfer.context_type,
    example_set_id: activity.transfer.example_set_id,
    prompt_mode: activity.transfer.prompt_mode,
  };
}

function getCorrectChoiceId(required: BearCafeRequiredOrder | undefined): string | undefined {
  if (!required) return undefined;
  if (required.food_ids) return required.food_ids.join(',');
  return required.food_id;
}

function createInitialTray(content: BearCafeContent): TrayState {
  return {
    foodCounts: { ...(content.starting_tray?.foodCounts ?? {}) },
    colorId: content.starting_tray?.colorId,
    decorationId: content.starting_tray?.decorationId,
  };
}

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
