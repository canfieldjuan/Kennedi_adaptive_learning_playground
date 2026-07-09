import type { LearningActivity } from '../../types/activity';
import type { ActivityAttemptEvent, SkillAttemptOutcome } from '../../types/events';
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
import { renderDecorationArt } from './decoration-art';

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

export interface ChoiceAccessibilityState {
  ariaLabel: string;
  ariaPressed: 'true' | 'false';
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

export const BEAR_CAFE_CHILD_CONTROL_LABELS = {
  home: '⌂',
  repeat: '↻',
  check: '✓',
  deliver: '🧺',
  next: '→',
  restart: '↻',
} as const;

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
  let selectionAttemptNumber = 0;
  let hintShown = false;
  let replayCount = 0;
  let phoneIntroSpoken = false;
  let roundStartedAt = Date.now();
  let attemptStartedAt = roundStartedAt;
  let hintedSkillIds: string[] = [];
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

    renderShiftPanel(container, content);

    if (stage === 'phone') {
      if (!phoneIntroSpoken) {
        phoneIntroSpoken = true;
        options.speech.speak(`${content.character.name} is calling.`);
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
          hintedSkillIds,
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
        const wasSelected = (tray.foodCounts[food.id] ?? 0) > 0;
        updateFoodSelection(content, tray, food.id);
        selectionAttemptNumber += 1;
        emitFoodSelectionEvent({
          options,
          content,
          tray,
          food,
          wasSelected,
          attemptNumber: selectionAttemptNumber,
          responseTimeMs: Date.now() - attemptStartedAt,
          hintShown,
          replayCount,
        });
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
          hintedSkillIds,
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
          hintedSkillIds = getUniqueSkillIds([
            ...hintedSkillIds,
            ...getHintedSkillIdsForIssue(options.activity.skill_ids, result.issue),
          ]);
          emitAttemptEvent({
            options,
            content,
            tray,
            outcome: 'hint_used',
            attemptNumber,
            responseTimeMs,
            hintShown,
            hintedSkillIds,
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
  homeButton.textContent = BEAR_CAFE_CHILD_CONTROL_LABELS.home;
  homeButton.setAttribute('aria-label', 'Return home');
  homeButton.addEventListener('click', () => {
    window.location.hash = '#home';
  });
  topBar.appendChild(homeButton);

  const repeatButton = document.createElement('button');
  repeatButton.className = 'activity-icon-button';
  repeatButton.type = 'button';
  repeatButton.textContent = BEAR_CAFE_CHILD_CONTROL_LABELS.repeat;
  repeatButton.setAttribute('aria-label', 'Repeat order');
  repeatButton.addEventListener('click', onRepeat);
  topBar.appendChild(repeatButton);

  return topBar;
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
  `;
  phone.addEventListener('click', onAnswer);

  phoneCard.appendChild(phone);
  parent.appendChild(phoneCard);
}

function renderShiftPanel(parent: HTMLElement, content: BearCafeContent): void {
  const panel = document.createElement('section');
  panel.className = 'bear-cafe-shift';
  panel.setAttribute(
    'aria-label',
    typeof content.round_index === 'number' && typeof content.round_total === 'number'
      ? `Cafe shift progress, order ${content.round_index} of ${content.round_total}`
      : 'Cafe shift progress'
  );

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

  parent.appendChild(panel);
}

function renderOrderCard(parent: HTMLElement, content: BearCafeContent): void {
  const order = document.createElement('section');
  order.className = 'bear-cafe-order';
  order.setAttribute('aria-label', content.order_ticket);
  order.innerHTML = `
    <div class="bear-cafe-order__bear" aria-hidden="true">${renderBearArt(content.character.id, 'waiting')}</div>
    <div class="bear-cafe-order__ticket" aria-hidden="true">
      ${renderOrderTicketVisual(content)}
    </div>
  `;
  parent.appendChild(order);
}

export function renderOrderTicketVisual(content: BearCafeContent): string {
  const required = content.required_order;
  if (!required) {
    const firstFood = content.foods[0];
    return `<span class="bear-cafe-ticket-item">${firstFood ? renderFoodArt(firstFood.id) : '★'}</span>`;
  }

  const parts: string[] = [];
  if (required.food_counts) {
    for (const [foodId, count] of Object.entries(required.food_counts)) {
      parts.push(renderTicketFood(content, foodId, count));
    }
  } else if (required.food_ids) {
    const sound = getTargetSound(content);
    if (sound) {
      parts.push(`<span class="bear-cafe-ticket-letter">${sound.toUpperCase()}</span>`);
    }
    for (const foodId of required.food_ids) {
      parts.push(renderTicketFood(content, foodId));
    }
  } else if (required.food_id) {
    parts.push(renderTicketFood(content, required.food_id, required.quantity));
  }

  if (required.color_id) {
    const color = content.colors?.find((entry) => entry.id === required.color_id);
    parts.push(
      `<span class="bear-cafe-ticket-swatch" style="--bear-cafe-ticket-color: ${color?.value ?? '#f472b6'}"></span>`
    );
  }

  return parts.join('');
}

function renderTicketFood(
  content: BearCafeContent,
  foodId: string,
  count?: number
): string {
  const label = getFoodLabel(content, foodId);
  return `
    <span class="bear-cafe-ticket-item" aria-label="${label}">
      ${typeof count === 'number' && count > 1 ? `<span class="bear-cafe-ticket-count">${count}</span>` : ''}
      ${renderFoodArt(foodId)}
    </span>
  `;
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

  const plate = document.createElement('div');
  plate.className = 'bear-cafe-plate';
  const trayColor = content.colors?.find((color) => color.id === tray.colorId);
  if (trayColor) {
    plate.style.setProperty('--bear-cafe-plate-ring', trayColor.value);
    plate.dataset.colored = 'true';
  }

  const foodEntries = Object.entries(tray.foodCounts).filter(([, count]) => count > 0);
  if (foodEntries.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'bear-cafe-tray__empty';
    empty.textContent = '+';
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
    decorationBadge.innerHTML = renderDecorationArt(decoration.id);
    plate.appendChild(decorationBadge);
  }

  trayArea.appendChild(plate);

  const colorLabel = content.colors?.find((color) => color.id === tray.colorId)?.label;
  const colorValue = content.colors?.find((color) => color.id === tray.colorId)?.value;
  const decorationLabel = content.decorations?.find((decorationEntry) => (
    decorationEntry.id === tray.decorationId
  ))?.label;
  if (colorLabel || decorationLabel) {
    const details = document.createElement('p');
    details.className = 'bear-cafe-tray__details';
    details.setAttribute('aria-label', [colorLabel, decorationLabel].filter(Boolean).join(' and '));
    details.innerHTML = [
      colorValue
        ? `<span class="bear-cafe-ticket-swatch" style="--bear-cafe-ticket-color: ${colorValue}"></span>`
        : '',
      tray.decorationId ? renderDecorationArt(tray.decorationId) : '',
    ].join('');
    trayArea.appendChild(details);
  }

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
    const count = tray.foodCounts[food.id] ?? 0;
    const accessibility = getFoodChoiceAccessibilityState(food.label, count);
    const button = document.createElement('button');
    button.className = 'bear-cafe-food';
    button.type = 'button';
    button.dataset.selected = count > 0 ? 'true' : 'false';
    button.setAttribute('aria-label', accessibility.ariaLabel);
    button.setAttribute('aria-pressed', accessibility.ariaPressed);
    button.innerHTML = `
      <span class="bear-cafe-food__icon" aria-hidden="true">${renderFoodArt(food.id)}</span>
      ${count > 0 ? `<span class="bear-cafe-food__count">${count}</span>` : ''}
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
      const accessibility = getToggleChoiceAccessibilityState(
        color.label,
        tray.colorId === color.id
      );
      const button = document.createElement('button');
      button.className = 'bear-cafe-swatch';
      button.type = 'button';
      button.style.setProperty('--bear-cafe-swatch', color.value);
      button.dataset.selected = tray.colorId === color.id ? 'true' : 'false';
      button.innerHTML = '<span aria-hidden="true"></span>';
      button.setAttribute('aria-label', accessibility.ariaLabel);
      button.setAttribute('aria-pressed', accessibility.ariaPressed);
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
      const accessibility = getToggleChoiceAccessibilityState(
        decoration.label,
        tray.decorationId === decoration.id
      );
      const button = document.createElement('button');
      button.className = 'bear-cafe-decoration';
      button.type = 'button';
      button.dataset.selected = tray.decorationId === decoration.id ? 'true' : 'false';
      button.setAttribute('aria-label', accessibility.ariaLabel);
      button.setAttribute('aria-pressed', accessibility.ariaPressed);
      button.innerHTML = `
        <span aria-hidden="true">${renderDecorationArt(decoration.id)}</span>
      `;
      button.addEventListener('click', () => handlers.onDecorationTap(decoration));
      decorationGrid.appendChild(button);
    }
    kitchen.appendChild(decorationGrid);
  }

  parent.appendChild(kitchen);
}

export function getFoodChoiceAccessibilityState(
  foodLabel: string,
  count: number
): ChoiceAccessibilityState {
  if (count <= 0) {
    return {
      ariaLabel: `Choose ${foodLabel}, none on tray`,
      ariaPressed: 'false',
    };
  }

  return {
    ariaLabel: `Choose ${foodLabel}, ${count} on tray`,
    ariaPressed: 'true',
  };
}

export function getToggleChoiceAccessibilityState(
  label: string,
  selected: boolean
): ChoiceAccessibilityState {
  return {
    ariaLabel: `Choose ${label}, ${selected ? 'selected' : 'not selected'}`,
    ariaPressed: selected ? 'true' : 'false',
  };
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
  checkButton.textContent = BEAR_CAFE_CHILD_CONTROL_LABELS.check;
  checkButton.setAttribute('aria-label', stage === 'fix' ? 'Fixed it' : 'Check order');
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
  text.textContent = 'Plating';

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
  text.textContent = 'Delivering';

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
    <div class="bear-cafe-ready" role="status" aria-label="Order ready">
      <span class="bear-cafe-ready__bell" aria-hidden="true">🔔</span>
    </div>
  `;

  const button = document.createElement('button');
  button.className = 'child-button bear-cafe-deliver-button';
  button.type = 'button';
  button.textContent = BEAR_CAFE_CHILD_CONTROL_LABELS.deliver;
  button.setAttribute('aria-label', 'Deliver order');
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
    <p class="bear-cafe-complete__text">${content.shift_restart_activity_id ? 'Orders delivered.' : 'Order delivered.'}</p>
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
    nextButton.textContent = BEAR_CAFE_CHILD_CONTROL_LABELS.next;
    nextButton.setAttribute('aria-label', content.next_label ?? 'Next order');
    nextButton.addEventListener('click', () => {
      window.location.hash = `#activity/${content.next_activity_id}`;
    });
    actions.appendChild(nextButton);
  }

  if (content.shift_restart_activity_id) {
    const restartButton = document.createElement('button');
    restartButton.className = 'child-button';
    restartButton.type = 'button';
    restartButton.textContent = BEAR_CAFE_CHILD_CONTROL_LABELS.restart;
    restartButton.setAttribute('aria-label', 'Play again');
    restartButton.addEventListener('click', () => {
      window.location.hash = `#activity/${content.shift_restart_activity_id}`;
    });
    actions.appendChild(restartButton);
  }

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
  homeButton.textContent = BEAR_CAFE_CHILD_CONTROL_LABELS.home;
  homeButton.setAttribute('aria-label', 'Return home');
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

  if (required.food_counts) {
    const selectedFoodIds = getSelectedFoodIds(tray);
    const requiredFoodIds = Object.keys(required.food_counts).filter((foodId) => (
      (required.food_counts?.[foodId] ?? 0) > 0
    ));
    const hasOnlyRequiredFoods = selectedFoodIds.every((foodId) => requiredFoodIds.includes(foodId));
    if (!hasOnlyRequiredFoods) return { correct: false, issue: 'food' };

    for (const foodId of requiredFoodIds) {
      const selectedCount = tray.foodCounts[foodId] ?? 0;
      const requiredCount = required.food_counts[foodId] ?? 0;
      if (selectedCount !== requiredCount) {
        return {
          correct: false,
          issue: selectedCount < requiredCount ? 'quantity_under' : 'quantity_over',
        };
      }
    }

    return { correct: true, issue: 'none' };
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

function evaluateFoodSelection(
  content: BearCafeContent,
  tray: TrayState,
  foodId: string,
  wasSelected: boolean
): { correct: boolean; issue: string } {
  const required = content.required_order;
  if (!required) return { correct: true, issue: 'none' };

  if (required.food_counts) {
    const expectedCount = required.food_counts[foodId] ?? 0;
    const selectedCount = tray.foodCounts[foodId] ?? 0;
    if (expectedCount <= 0) return { correct: false, issue: 'food' };
    return {
      correct: selectedCount <= expectedCount,
      issue: selectedCount <= expectedCount ? 'none' : 'quantity_over',
    };
  }

  if (required.food_ids) {
    const isRequired = required.food_ids.includes(foodId);
    if (!wasSelected) {
      return {
        correct: isRequired,
        issue: isRequired ? 'none' : 'first_sound_sort',
      };
    }

    return {
      correct: !isRequired,
      issue: isRequired ? 'food_removed' : 'distractor_removed',
    };
  }

  if (required.food_id) {
    const selectedCount = tray.foodCounts[foodId] ?? 0;
    const requiredQuantity = required.quantity ?? 1;
    if (foodId !== required.food_id) return { correct: false, issue: 'food' };
    return {
      correct: selectedCount <= requiredQuantity,
      issue: selectedCount <= requiredQuantity ? 'none' : 'quantity_over',
    };
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
      return `${content.character.name} asked for ${getRequestedQuantity(required) ?? 'more'}. Let's count.`;
    case 'color': {
      const colorLabel = content.colors?.find((color) => (
        color.id === required?.color_id
      ))?.label ?? 'that color';
      return `${content.character.name} wanted ${colorLabel}.`;
    }
    case 'first_sound_sort':
      return 'Bear starts with b-b-b. Banana starts with b-b-b.';
    case 'food':
      return `${content.character.name} asked for ${getCorrectAnswer(content)}.`;
    case 'food_removed':
      return "That one belongs in the order.";
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

  if (required.food_counts) {
    return Object.entries(required.food_counts)
      .filter(([, count]) => count > 0)
      .map(([foodId, count]) => {
        const label = getFoodLabel(content, foodId);
        return count > 1 ? `${count} ${label}` : label;
      })
      .join(', ');
  }

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
  hintedSkillIds?: string[];
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
    hintedSkillIds: params.hintedSkillIds,
    replayCount: params.replayCount,
    eventName: params.outcome === 'hint_used' ? 'hint_shown' : 'tray_checked',
    issue: params.issue,
  });

  params.options.onEvent(event);
}

function emitFoodSelectionEvent(params: {
  options: KennedisOrdersOptions;
  content: BearCafeContent;
  tray: TrayState;
  food: BearCafeFood;
  wasSelected: boolean;
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
  replayCount: number;
}): void {
  const result = evaluateFoodSelection(
    params.content,
    params.tray,
    params.food.id,
    params.wasSelected
  );
  const event = createKennedisOrdersEvent({
    activity: params.options.activity,
    content: params.content,
    sessionId: params.options.sessionId,
    childId: params.options.childId,
    outcome: result.correct ? 'correct' : 'incorrect',
    tray: params.tray,
    attemptNumber: params.attemptNumber,
    responseTimeMs: params.responseTimeMs,
    hintShown: params.hintShown,
    replayCount: params.replayCount,
    eventName: 'food_selected',
    issue: result.issue,
    selectedChoiceId: params.food.id,
    selectedAnswer: params.food.label,
    extraMetadata: {
      selected_food_id: params.food.id,
      selected_food_count: params.tray.foodCounts[params.food.id] ?? 0,
    },
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
  hintedSkillIds?: string[];
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
    hintedSkillIds: params.hintedSkillIds,
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
  hintedSkillIds?: string[];
  replayCount?: number;
  eventName: string;
  issue?: string;
  selectedChoiceId?: string;
  correctChoiceId?: string;
  selectedAnswer?: string;
  correctAnswer?: string;
  extraMetadata?: Record<string, string | number | boolean>;
}): ActivityAttemptEvent {
  const selectedFoodIds = getSelectedFoodIds(params.tray);
  const skillOutcomes = createSkillOutcomesForEvent(params);

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
    ...(skillOutcomes !== undefined ? { skill_outcomes: skillOutcomes } : {}),
    selected_choice_id: params.selectedChoiceId ?? selectedFoodIds.join(','),
    correct_choice_id: params.correctChoiceId ?? getCorrectChoiceId(params.content.required_order),
    selected_answer: params.selectedAnswer ?? getSelectedAnswer(params.content, params.tray),
    correct_answer: params.correctAnswer ?? getCorrectAnswer(params.content),
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
      ...(params.hintedSkillIds?.length
        ? { hinted_skill_ids: params.hintedSkillIds.join(',') }
        : {}),
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
      ...params.extraMetadata,
    },
  };
}

function createSkillOutcomesForEvent(params: {
  activity: LearningActivity;
  content: BearCafeContent;
  outcome: ActivityAttemptEvent['outcome'];
  tray: TrayState;
  eventName: string;
  issue?: string;
}): SkillAttemptOutcome[] | undefined {
  if (params.eventName === 'food_selected') return [];
  if (params.content.mode !== 'two_part') return undefined;

  if (params.eventName === 'hint_shown' && params.outcome === 'hint_used') {
    return createTwoPartHintSkillOutcomes(params.activity.skill_ids, params.issue);
  }

  if (
    params.eventName !== 'tray_checked' ||
    (params.outcome !== 'correct' && params.outcome !== 'incorrect')
  ) {
    return undefined;
  }

  const required = params.content.required_order;
  if (!required) return undefined;

  const outcomes: SkillAttemptOutcome[] = [];
  if (
    params.activity.skill_ids.includes('counting') &&
    typeof getRequestedQuantity(required) === 'number'
  ) {
    const selectedCount = getSelectedCountForRequiredQuantity(params.tray, required);
    const quantityMatches = selectedCount === getRequestedQuantity(required);
    outcomes.push({
      skill_id: 'counting',
      outcome: quantityMatches ? 'correct' : 'incorrect',
      reason: quantityMatches ? 'quantity_match' : 'quantity_mismatch',
    });
  }

  if (
    params.activity.skill_ids.includes('color_fill') &&
    typeof required.color_id === 'string'
  ) {
    const colorMatches = params.tray.colorId === required.color_id;
    outcomes.push({
      skill_id: 'color_fill',
      outcome: colorMatches ? 'correct' : 'incorrect',
      reason: colorMatches ? 'color_match' : 'color_mismatch',
    });
  }

  return outcomes;
}

function getSelectedCountForRequiredQuantity(
  tray: TrayState,
  required: BearCafeRequiredOrder
): number {
  if (required.food_counts) return getTotalFoodCount(tray);
  return required.food_id
    ? tray.foodCounts[required.food_id] ?? 0
    : getTotalFoodCount(tray);
}

function createTwoPartHintSkillOutcomes(
  skillIds: string[],
  issue: string | undefined
): SkillAttemptOutcome[] {
  if (
    skillIds.includes('counting') &&
    (issue === 'quantity_under' || issue === 'quantity_over')
  ) {
    return [{
      skill_id: 'counting',
      outcome: 'hint_used',
      reason: issue,
    }];
  }

  if (skillIds.includes('color_fill') && issue === 'color') {
    return [{
      skill_id: 'color_fill',
      outcome: 'hint_used',
      reason: issue,
    }];
  }

  return [];
}

function getHintedSkillIdsForIssue(skillIds: string[], issue: string): string[] {
  if (
    skillIds.includes('counting') &&
    (issue === 'quantity_under' || issue === 'quantity_over')
  ) {
    return ['counting'];
  }

  if (skillIds.includes('color_fill') && issue === 'color') {
    return ['color_fill'];
  }

  return skillIds.length === 1 ? [skillIds[0]] : [];
}

function getUniqueSkillIds(skillIds: string[]): string[] {
  return [...new Set(skillIds)].sort((a, b) => a.localeCompare(b));
}

function createEvidenceMetadata(content: BearCafeContent): Record<string, string | number | boolean> {
  const requiredQuantity = getRequestedQuantity(content.required_order);
  const targetSound = getTargetSound(content);

  return {
    game_mode: content.mode,
    order_type: content.mode,
    caller_id: content.character.id,
    ...(typeof content.round_index === 'number' ? { round_index: content.round_index } : {}),
    ...(typeof content.round_index === 'number' ? { round_number: content.round_index } : {}),
    ...(typeof content.round_total === 'number' ? { round_total: content.round_total } : {}),
    ...(typeof requiredQuantity === 'number'
      ? {
          required_quantity: requiredQuantity,
          requested_quantity: requiredQuantity,
        }
      : {}),
    ...(content.required_order?.food_counts
      ? { required_food_counts: serializeFoodCounts(content.required_order.food_counts) }
      : {}),
    ...(content.required_order?.color_id ? { required_color_id: content.required_order.color_id } : {}),
    ...(targetSound ? { target_sound: targetSound } : {}),
    correction_required: Boolean(content.starting_tray),
    shift_completed: Boolean(content.shift_restart_activity_id),
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
  if (required.food_counts) return serializeFoodCounts(required.food_counts);
  if (required.food_ids) return required.food_ids.join(',');
  return required.food_id;
}

function getRequestedQuantity(required: BearCafeRequiredOrder | undefined): number | undefined {
  if (!required) return undefined;
  if (typeof required.quantity === 'number') return required.quantity;
  if (required.food_counts) {
    return Object.values(required.food_counts).reduce((sum, count) => sum + count, 0);
  }
  if (required.food_ids) return required.food_ids.length;
  return undefined;
}

function getTargetSound(content: BearCafeContent): string | undefined {
  const requiredFoodIds = content.required_order?.food_ids;
  if (!requiredFoodIds?.length) return undefined;

  const sounds = requiredFoodIds
    .map((foodId) => content.foods.find((food) => food.id === foodId)?.first_sound)
    .filter((sound): sound is string => typeof sound === 'string' && sound.length > 0);
  const uniqueSounds = [...new Set(sounds)];
  return uniqueSounds.length === 1 ? uniqueSounds[0] : undefined;
}

function serializeFoodCounts(foodCounts: Record<string, number>): string {
  return Object.entries(foodCounts)
    .filter(([, count]) => count > 0)
    .sort(([firstFoodId], [secondFoodId]) => firstFoodId.localeCompare(secondFoodId))
    .map(([foodId, count]) => `${foodId}:${count}`)
    .join(',');
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
