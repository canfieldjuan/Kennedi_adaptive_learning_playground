/**
 * Kennedi's Dress-Up Studio — the creative-play route view.
 *
 * Like Story Stage, this runtime has NO event sink: dressing a doll is pure
 * expression, never an assessment, so it emits no attempt events, skill
 * evidence, or correctness of any kind. It takes the local speech service and a
 * narrow, non-evaluative fashion-card history sink (never the event log).
 *
 * Flow (ownership-completion contract):
 *   free dress-up (change the doll's world)
 *     -> two bounded ownership flourishes (choose a card frame, add a sticker)
 *     -> Finish -> the doll poses in the chosen scene as a saved Fashion Card
 *     -> child-controlled finish (Play Again / Home); the card stays on screen.
 * Earlier cards live in a bounded revisit shelf; revisit needs no earning.
 */

import type { SpeechServiceInterface } from '../../types/runtime';
import type { OutfitSlot, StudioLook } from './dress-up-studio.types';
import type { FashionCardCompletion } from './fashion-cards';
import { renderFashionCardSvg, renderStudioStageSvg } from './doll-art';
import {
  ACCESSORIES,
  CARD_STICKERS,
  DOLL_NAME,
  FRAMES,
  HAIR_COLORS,
  HAIR_STYLES,
  SCENES,
  TONES,
  defaultLook,
  wardrobeForSlot,
} from './wardrobe-catalog';

/** The narrow, non-evaluative history sink — never the attempt-event log. */
export interface FashionCardSink {
  list(): FashionCardCompletion[];
  append(card: FashionCardCompletion): void;
}

interface DressUpStudioOptions {
  sessionId: string;
  speech: SpeechServiceInterface;
  history?: FashionCardSink;
}

type TabKey =
  | 'doll'
  | 'top'
  | 'bottom'
  | 'dress'
  | 'shoes'
  | 'jacket'
  | 'accessory'
  | 'scene'
  | 'card';

const PROMPT = "Dress up Luna! Pick her clothes, choose a place, then finish the look.";

const TAB_LABELS: Record<TabKey, string> = {
  doll: 'Luna',
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  shoes: 'Shoes',
  jacket: 'Coats',
  accessory: 'Extras',
  scene: 'Place',
  card: 'Card',
};

const TAB_ORDER: TabKey[] = [
  'doll',
  'top',
  'bottom',
  'dress',
  'shoes',
  'jacket',
  'accessory',
  'scene',
  'card',
];

let container: HTMLElement | null = null;

export function renderDressUpStudio(
  parent: HTMLElement,
  options: DressUpStudioOptions
): void {
  destroyDressUpStudio();

  const speech = options.speech;
  const history = options.history;
  let look: StudioLook = defaultLook();
  let activeTab: TabKey = 'doll';
  let finished = false;

  container = el('div', 'child-container activity-screen dress-up-studio');
  container.id = 'dress-up-studio';

  // — Top bar —
  const topBar = el('div', 'activity-topbar');
  topBar.appendChild(
    iconButton('Home', 'Return home', () => {
      window.location.hash = '#home';
    })
  );
  topBar.appendChild(
    iconButton('Repeat', 'Repeat prompt', () => {
      speech.repeatLast();
    })
  );
  container.appendChild(topBar);

  const title = el('h1', 'activity-title');
  title.textContent = 'Dress-Up Studio';
  container.appendChild(title);

  // — Studio section (dressing) —
  const studio = el('div', 'dress-up-studio__studio');

  const stage = el('div', 'dress-up-studio__doll');
  stage.setAttribute('aria-hidden', 'true');
  studio.appendChild(stage);

  const tabs = el('div', 'dress-up-studio__tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Dress-up choices');
  studio.appendChild(tabs);

  const tray = el('div', 'dress-up-studio__tray');
  tray.setAttribute('aria-label', 'Choices');
  studio.appendChild(tray);

  const finishButton = el('button', 'child-button dress-up-studio__finish') as HTMLButtonElement;
  finishButton.type = 'button';
  finishButton.textContent = 'Finish the look';
  finishButton.setAttribute('aria-label', 'Finish the look');
  onClick(finishButton, () => finish());
  studio.appendChild(finishButton);

  const shelf = el('div', 'dress-up-studio__shelf');
  shelf.setAttribute('aria-label', 'Your saved looks');
  studio.appendChild(shelf);

  container.appendChild(studio);

  // — Payoff section (the finished fashion card) —
  const payoff = el('div', 'dress-up-studio__payoff');
  payoff.hidden = true;
  const cardHolder = el('div', 'dress-up-studio__card');
  cardHolder.setAttribute('aria-hidden', 'true');
  payoff.appendChild(cardHolder);
  const payoffActions = el('div', 'activity-complete-actions dress-up-studio__payoff-actions');
  payoff.appendChild(payoffActions);
  container.appendChild(payoff);

  parent.appendChild(container);

  // — Rendering helpers —

  function renderPreview(): void {
    stage.innerHTML = renderStudioStageSvg(look);
  }

  function renderTabs(): void {
    clear(tabs);
    for (const key of TAB_ORDER) {
      const tab = el('button', 'dress-up-studio__tab') as HTMLButtonElement;
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-label', TAB_LABELS[key]);
      tab.classList.toggle('is-active', key === activeTab);
      tab.setAttribute('aria-selected', key === activeTab ? 'true' : 'false');
      const label = el('span', 'dress-up-studio__tab-label');
      label.textContent = TAB_LABELS[key];
      tab.appendChild(label);
      onClick(tab, () => {
        activeTab = key;
        renderTabs();
        renderTray();
      });
      tabs.appendChild(tab);
    }
  }

  function renderTray(): void {
    clear(tray);
    switch (activeTab) {
      case 'doll':
        renderDollTray();
        break;
      case 'accessory':
        renderAccessoryTray();
        break;
      case 'scene':
        renderSceneTray();
        break;
      case 'card':
        renderCardTray();
        break;
      default:
        renderSlotTray(activeTab);
        break;
    }
  }

  function renderSlotTray(slot: OutfitSlot): void {
    const group = choiceGroup(TAB_LABELS[slot]);
    for (const item of wardrobeForSlot(slot)) {
      const selected = look[slot] === item.id;
      group.appendChild(
        swatchChip({
          label: item.label,
          color: item.value,
          selected,
          onTap: () => {
            const nextValue = look[slot] === item.id ? null : item.id;
            look = { ...look, [slot]: nextValue };
            // A dress and a top/bottom cannot show at once.
            if (slot === 'dress' && nextValue) {
              look = { ...look, top: null, bottom: null };
            } else if ((slot === 'top' || slot === 'bottom') && nextValue) {
              look = { ...look, dress: null };
            }
            speech.speak(item.label);
            renderPreview();
            renderTray();
          },
        })
      );
    }
    tray.appendChild(group);
  }

  function renderDollTray(): void {
    const skin = choiceGroup('Skin');
    for (const tone of TONES) {
      skin.appendChild(
        swatchChip({
          label: tone.label,
          color: tone.value,
          selected: look.toneId === tone.id,
          onTap: () => {
            look = { ...look, toneId: tone.id };
            speech.speak(tone.label);
            renderPreview();
            renderTray();
          },
        })
      );
    }
    tray.appendChild(skin);

    const hair = choiceGroup('Hair');
    for (const style of HAIR_STYLES) {
      const color = HAIR_COLORS.find((c) => c.id === look.hairColorId) ?? HAIR_COLORS[0];
      hair.appendChild(
        swatchChip({
          label: style.label,
          color: color.value,
          selected: look.hairId === style.id,
          onTap: () => {
            look = { ...look, hairId: style.id };
            speech.speak(style.label);
            renderPreview();
            renderTray();
          },
        })
      );
    }
    tray.appendChild(hair);

    const hairColor = choiceGroup('Hair color');
    for (const color of HAIR_COLORS) {
      hairColor.appendChild(
        swatchChip({
          label: color.label,
          color: color.value,
          selected: look.hairColorId === color.id,
          onTap: () => {
            look = { ...look, hairColorId: color.id };
            speech.speak(color.label);
            renderPreview();
            renderTray();
          },
        })
      );
    }
    tray.appendChild(hairColor);

    const glasses = choiceGroup('Glasses');
    glasses.appendChild(
      swatchChip({
        label: look.glasses ? 'Take off glasses' : 'Add glasses',
        color: '#dfe6ef',
        selected: look.glasses,
        onTap: () => {
          look = { ...look, glasses: !look.glasses };
          speech.speak(look.glasses ? 'Glasses on' : 'Glasses off');
          renderPreview();
          renderTray();
        },
      })
    );
    tray.appendChild(glasses);
  }

  function renderAccessoryTray(): void {
    const group = choiceGroup('Extras');
    for (const accessory of ACCESSORIES) {
      const selected = look.accessoryIds.includes(accessory.id);
      group.appendChild(
        swatchChip({
          label: accessory.label,
          color: accessory.value,
          selected,
          onTap: () => {
            const next = selected
              ? look.accessoryIds.filter((id) => id !== accessory.id)
              : [...look.accessoryIds, accessory.id];
            look = { ...look, accessoryIds: next };
            speech.speak(accessory.label);
            renderPreview();
            renderTray();
          },
        })
      );
    }
    tray.appendChild(group);
  }

  function renderSceneTray(): void {
    const group = choiceGroup('Place');
    for (const scene of SCENES) {
      group.appendChild(
        swatchChip({
          label: scene.label,
          color: scene.value,
          selected: look.sceneId === scene.id,
          onTap: () => {
            look = { ...look, sceneId: scene.id };
            speech.speak(scene.label);
            renderPreview();
            renderTray();
          },
        })
      );
    }
    tray.appendChild(group);
  }

  function renderCardTray(): void {
    const frames = choiceGroup('Frame');
    for (const frame of FRAMES) {
      frames.appendChild(
        swatchChip({
          label: frame.label,
          color: frame.value,
          selected: look.frameId === frame.id,
          onTap: () => {
            look = { ...look, frameId: frame.id };
            speech.speak(frame.label);
            renderTray();
          },
        })
      );
    }
    tray.appendChild(frames);

    const stickers = choiceGroup('Sticker');
    for (const sticker of CARD_STICKERS) {
      const selected = look.stickerId === sticker.id;
      stickers.appendChild(
        swatchChip({
          label: sticker.label,
          color: '#fff3c4',
          selected,
          onTap: () => {
            look = { ...look, stickerId: selected ? null : sticker.id };
            speech.speak(sticker.label);
            renderTray();
          },
        })
      );
    }
    tray.appendChild(stickers);
  }

  function refreshShelf(): void {
    clear(shelf);
    const saved = history?.list() ?? [];
    if (saved.length === 0) {
      shelf.hidden = true;
      return;
    }
    shelf.hidden = false;
    // Newest first, bounded by the list the sink already caps.
    for (const card of [...saved].reverse()) {
      const mini = el('button', 'dress-up-studio__mini') as HTMLButtonElement;
      mini.type = 'button';
      mini.setAttribute('aria-label', 'Saved look');
      mini.innerHTML = renderFashionCardSvg(card);
      onClick(mini, () => showPayoff(card, true));
      shelf.appendChild(mini);
    }
  }

  function finish(): void {
    if (finished) return;
    finished = true;
    const card = buildFashionCard(look, options.sessionId);
    history?.append(card);
    showPayoff(card, false);
    speech.speak(`${DOLL_NAME} looks wonderful!`);
  }

  function showPayoff(card: FashionCardCompletion, revisit: boolean): void {
    studio.hidden = true;
    payoff.hidden = false;
    container?.classList.add('is-finished');
    cardHolder.innerHTML = renderFashionCardSvg(card);
    // One-shot pose reveal; CSS drops the motion under prefers-reduced-motion.
    cardHolder.classList.remove('is-revealing');
    cardHolder.classList.add('is-revealing');

    clear(payoffActions);
    if (revisit) {
      payoffActions.appendChild(
        primaryButton('Back', 'Back to the studio', () => showStudio())
      );
    } else {
      payoffActions.appendChild(
        primaryButton('Play Again', 'Make a new look', () => {
          look = defaultLook();
          finished = false;
          showStudio();
        })
      );
    }
    payoffActions.appendChild(
      primaryButton('Home', 'Return home', () => {
        window.location.hash = '#home';
      })
    );
  }

  function showStudio(): void {
    finished = false;
    payoff.hidden = true;
    studio.hidden = false;
    container?.classList.remove('is-finished');
    renderPreview();
    renderTabs();
    renderTray();
    refreshShelf();
  }

  // — Initial paint —
  renderPreview();
  renderTabs();
  renderTray();
  refreshShelf();
  speech.speak(PROMPT);
}

export function destroyDressUpStudio(): void {
  // Removing the container detaches the whole subtree; the tray/tabs/shelf are
  // rebuilt fresh on every render and never referenced from module scope, so
  // their listeners are collected with the detached nodes. No handler registry
  // is kept (an accumulating one would itself pin every past chip in memory).
  if (container) {
    container.remove();
    container = null;
  }
}

// — Completion object —

function buildFashionCard(look: StudioLook, sessionId: string): FashionCardCompletion {
  const outfit: Record<string, string> = {};
  if (look.dress) {
    outfit.dress = look.dress;
  } else {
    if (look.top) outfit.top = look.top;
    if (look.bottom) outfit.bottom = look.bottom;
  }
  if (look.shoes) outfit.shoes = look.shoes;
  if (look.jacket) outfit.jacket = look.jacket;

  return {
    completion_id: makeId(),
    session_id: sessionId,
    doll_id: look.dollId,
    tone_id: look.toneId,
    hair_id: look.hairId,
    hair_color_id: look.hairColorId,
    glasses: look.glasses,
    outfit,
    accessory_ids: [...look.accessoryIds],
    scene_id: look.sceneId,
    frame_id: look.frameId,
    ...(look.stickerId ? { sticker_id: look.stickerId } : {}),
    created_at: new Date().toISOString(),
  };
}

// — Small DOM helpers (kept within the app's mock-friendly DOM surface) —

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function clear(node: HTMLElement): void {
  while (node.children.length > 0) {
    (node.children[node.children.length - 1] as HTMLElement).remove();
  }
}

function onClick(node: HTMLElement, handler: () => void): void {
  // Nodes are discarded via clear() / container.remove(); their listeners go
  // with them, so no manual removeEventListener bookkeeping is tracked.
  node.addEventListener('click', () => handler());
}

function iconButton(label: string, aria: string, handler: () => void): HTMLElement {
  const button = el('button', 'activity-icon-button') as HTMLButtonElement;
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-label', aria);
  onClick(button, handler);
  return button;
}

function primaryButton(label: string, aria: string, handler: () => void): HTMLElement {
  const button = el('button', 'child-button') as HTMLButtonElement;
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-label', aria);
  onClick(button, handler);
  return button;
}

function choiceGroup(labelText: string): HTMLElement {
  // A wrap container: a full-width label heading followed by the chips. Chips
  // are appended straight onto the group by the caller.
  const group = el('div', 'dress-up-studio__group');
  const label = el('span', 'dress-up-studio__group-label');
  label.textContent = labelText;
  label.setAttribute('aria-hidden', 'true');
  group.appendChild(label);
  return group;
}

function swatchChip(config: {
  label: string;
  color: string;
  selected: boolean;
  onTap: () => void;
}): HTMLElement {
  const chip = el('button', 'dress-up-studio__chip') as HTMLButtonElement;
  chip.type = 'button';
  chip.setAttribute('aria-label', config.label);
  chip.classList.toggle('is-selected', config.selected);
  chip.setAttribute('aria-pressed', config.selected ? 'true' : 'false');
  chip.style.setProperty('--du-swatch', config.color);
  const swatch = el('span', 'dress-up-studio__chip-swatch');
  swatch.setAttribute('aria-hidden', 'true');
  chip.appendChild(swatch);
  const label = el('span', 'dress-up-studio__chip-label');
  label.textContent = config.label;
  chip.appendChild(label);
  onClick(chip, config.onTap);
  return chip;
}

function makeId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `look-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
