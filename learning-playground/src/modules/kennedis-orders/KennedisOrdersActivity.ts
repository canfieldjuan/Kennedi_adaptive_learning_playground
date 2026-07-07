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

type ViewStage =
  | 'phone'
  | 'make'
  | 'fix'
  | 'delivery'
  | 'complete';

let container: HTMLElement | null = null;
let cleanupHandlers: Array<() => void> = [];

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

    const topBar = createTopBar(content, options, () => {
      attemptStartedAt = Date.now();
      options.speech.speak(content.prompt_audio);
    });
    container.appendChild(topBar);

    const title = document.createElement('h1');
    title.className = 'activity-title bear-cafe__title';
    title.textContent = 'Bear Cafe';
    container.appendChild(title);
    renderShiftPanel(container, content);

    if (stage === 'phone') {
      renderPhoneStage(container, content, () => {
        stage = 'make';
        roundStartedAt = Date.now();
        attemptStartedAt = roundStartedAt;
        options.speech.speak(content.prompt_audio);
        render();
      });
      return;
    }

    if (stage === 'delivery') {
      renderDeliveryStage(container, content, options, () => {
        stage = 'complete';
        options.audio.play('soft_chime');
        options.speech.speak(content.character.happyLine);
        emitCompletedEvent({
          options,
          content,
          tray,
          attemptNumber: Math.max(1, attemptNumber),
          responseTimeMs: Date.now() - roundStartedAt,
          hintShown,
        });
        render();
      });
      return;
    }

    if (stage === 'complete') {
      renderCompleteStage(container, content);
      return;
    }

    renderOrderCard(container, content);
    renderTray(container, content, tray, (foodId: string) => {
      removeOneFood(tray, foodId);
      feedbackText = '';
      render();
    });

    const kitchenHandlers = {
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
          issue: result.issue,
        });

        if (result.correct) {
          feedbackTone = 'success';
          feedbackText = 'Order ready.';
          options.audio.play('soft_chime');
          options.speech.speak('Order ready.');
          stage = 'delivery';
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
            issue: result.issue,
          });
        }

        attemptStartedAt = Date.now();
        render();
      },
    };

    renderCheckAction(container, stage, !hasAnyFood(tray), kitchenHandlers.onCheck);
    renderKitchenStage(container, content, tray, kitchenHandlers);

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

export function destroyKennedisOrdersActivity(): void {
  for (const cleanup of cleanupHandlers) {
    cleanup();
  }
  cleanupHandlers = [];

  if (container) {
    container.remove();
    container = null;
  }
}

function createTopBar(
  content: BearCafeContent,
  options: KennedisOrdersOptions,
  onRepeat: () => void
): HTMLElement {
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
  repeatButton.addEventListener('click', () => {
    onRepeat();
    emitPromptReplayEvent(options, content);
  });
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
    <span class="bear-cafe-phone__icon" aria-hidden="true">☎</span>
    <span class="bear-cafe-phone__caller">${content.character.name} is calling</span>
    <span class="bear-cafe-phone__shift">${content.round_label ?? 'Order time'}</span>
    <span class="bear-cafe-phone__line">${content.character.callLine}</span>
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
    <div class="bear-cafe-order__bear" aria-hidden="true">${content.character.icon}</div>
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

  const foodEntries = Object.entries(tray.foodCounts)
    .filter(([, count]) => count > 0);

  if (foodEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bear-cafe-tray__empty';
    empty.textContent = 'Pick food for the order.';
    trayArea.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'bear-cafe-tray__items';
    for (const [foodId, count] of foodEntries) {
      const food = content.foods.find((entry) => entry.id === foodId);
      if (!food) continue;
      const chip = document.createElement('button');
      chip.className = 'bear-cafe-tray__chip';
      chip.type = 'button';
      chip.setAttribute('aria-label', `Remove one ${food.label}`);
      chip.innerHTML = `
        <span aria-hidden="true">${food.icon}</span>
        <span>${food.label}${count > 1 ? ` x${count}` : ''}</span>
      `;
      chip.addEventListener('click', () => onFoodRemove(foodId));
      list.appendChild(chip);
    }
    trayArea.appendChild(list);
  }

  const details = document.createElement('p');
  details.className = 'bear-cafe-tray__details';
  const colorLabel = content.colors?.find((color) => color.id === tray.colorId)?.label;
  const decorationLabel = content.decorations?.find((decoration) => (
    decoration.id === tray.decorationId
  ))?.label;
  details.textContent = [
    colorLabel ? `${colorLabel}` : '',
    decorationLabel ? `${decorationLabel}` : '',
  ].filter(Boolean).join(' + ');
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
      <span class="bear-cafe-food__icon" aria-hidden="true">${food.icon}</span>
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

function renderDeliveryStage(
  parent: HTMLElement,
  content: BearCafeContent,
  options: KennedisOrdersOptions,
  onDeliver: () => void
): void {
  const delivery = document.createElement('section');
  delivery.className = 'bear-cafe-delivery';
  delivery.innerHTML = `
    <div class="bear-cafe-delivery__basket" aria-hidden="true">
      <span>🧺</span>
      <span>Order ready</span>
    </div>
    <div class="bear-cafe-delivery__window" aria-hidden="true">
      <span>${content.character.icon}</span>
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
  parent.appendChild(delivery);
}

function renderCompleteStage(
  parent: HTMLElement,
  content: BearCafeContent
): void {
  const complete = document.createElement('section');
  complete.className = 'bear-cafe-complete';
  complete.innerHTML = `
    <div class="bear-cafe-complete__bear" aria-hidden="true">${content.character.icon}</div>
    <p class="bear-cafe-complete__text">Order delivered.</p>
  `;

  const actions = document.createElement('div');
  actions.className = 'activity-complete-actions bear-cafe-complete__actions';

  if (content.next_activity_id) {
    const nextButton = document.createElement('button');
    nextButton.className = 'child-button';
    nextButton.type = 'button';
    nextButton.textContent = 'Next order';
    nextButton.addEventListener('click', () => {
      window.location.hash = `#activity/${content.next_activity_id}`;
    });
    actions.appendChild(nextButton);
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

  if (content.mode === 'quantity') {
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
    const sameSet = (
      selectedFoodIds.length === correctFoodIds.length &&
      selectedFoodIds.every((foodId, index) => foodId === correctFoodIds[index])
    );
    return {
      correct: sameSet,
      issue: sameSet ? 'none' : 'first_sound_sort',
    };
  }

  if (required.food_id && !tray.foodCounts[required.food_id]) {
    return { correct: false, issue: 'food' };
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
  if (attemptNumber < 2) {
    return 'Let’s check the order.';
  }

  const required = content.required_order;
  switch (issue) {
    case 'quantity_under':
    case 'quantity_over':
      return `Daddy Bear asked for ${required?.quantity ?? 'more'}. Let’s count.`;
    case 'color':
      return `${content.character.name} wanted ${required?.color_id ?? 'that color'}.`;
    case 'first_sound_sort':
      return 'Bear starts with b-b-b. Banana starts with b-b-b.';
    case 'food':
      return `${content.character.name} asked for ${getFoodLabel(content, required?.food_id)}.`;
    default:
      return 'You can fix it.';
  }
}

function shouldShowColors(content: BearCafeContent): boolean {
  return (
    Array.isArray(content.colors) &&
    (
      content.mode === 'free_make' ||
      content.mode === 'single_attribute' ||
      Boolean(content.required_order?.color_id)
    )
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

function getSelectedAnswer(content: BearCafeContent, tray: TrayState): string {
  const foods = Object.entries(tray.foodCounts)
    .filter(([, count]) => count > 0)
    .map(([foodId, count]) => {
      const label = getFoodLabel(content, foodId);
      return count > 1 ? `${count} ${label}` : label;
    });
  const color = content.colors?.find((entry) => entry.id === tray.colorId)?.label;
  const decoration = content.decorations?.find((entry) => entry.id === tray.decorationId)?.label;

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

function emitPromptReplayEvent(
  options: KennedisOrdersOptions,
  content: BearCafeContent
): void {
  options.onEvent({
    ...createBaseEvent(options, content, {
      outcome: 'hint_used',
      selectedAnswer: 'replayed order',
      correctAnswer: getCorrectAnswer(content),
      attemptNumber: 0,
      responseTimeMs: 0,
      hintShown: true,
    }),
    metadata: {
      ...createTransferMetadata(options.activity),
      event_name: 'order_prompt_replayed',
      game_mode: content.mode,
    },
  });
}

function emitAttemptEvent(params: {
  options: KennedisOrdersOptions;
  content: BearCafeContent;
  tray: TrayState;
  outcome: ActivityAttemptEvent['outcome'];
  attemptNumber: number;
  responseTimeMs: number;
  hintShown: boolean;
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
      event_name: params.eventName,
      game_mode: params.content.mode,
      issue: params.issue ?? 'none',
      selected_food_ids: selectedFoodIds.join(','),
      selected_quantity: getTotalFoodCount(params.tray),
      selected_color_id: params.tray.colorId ?? '',
      selected_decoration_id: params.tray.decorationId ?? '',
      parent_evidence_summary: params.content.parent_evidence_summary ?? '',
    },
  };
}

function createBaseEvent(
  options: KennedisOrdersOptions,
  content: BearCafeContent,
  params: {
    outcome: ActivityAttemptEvent['outcome'];
    selectedAnswer: string;
    correctAnswer: string;
    attemptNumber: number;
    responseTimeMs: number;
    hintShown: boolean;
  }
): ActivityAttemptEvent {
  return {
    event_id: createEventId(),
    session_id: options.sessionId,
    child_id: options.childId,
    activity_id: options.activity.id,
    activity_version: options.activity.version,
    skill_ids: options.activity.skill_ids,
    timestamp: new Date().toISOString(),
    prompt_text: content.prompt_audio,
    outcome: params.outcome,
    selected_answer: params.selectedAnswer,
    correct_answer: params.correctAnswer,
    attempt_number: params.attemptNumber,
    response_time_ms: params.responseTimeMs,
    difficulty_level: options.activity.difficulty.level,
    choice_count: options.activity.difficulty.choice_count,
    distractor_strength: options.activity.difficulty.distractor_strength,
    input_type: 'tap',
    hint_shown: params.hintShown,
  };
}

function createTransferMetadata(
  activity: LearningActivity
): Record<string, string | number | boolean> {
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
