/**
 * Home Screen — the child's main landing.
 * Shows exactly 4 large, tappable icons.
 * Icon-first. No reading required. Speech on tap.
 */

import type { SpeechServiceInterface } from '../../types/runtime';
import { createCafeBackdrop } from './cafe-scene';

let _container: HTMLElement | null = null;

interface HomeOption {
  id: string;
  icon: string;
  label: string;
  color: string;
  speechLabel: string;
  route: string;
}

const HOME_OPTIONS: HomeOption[] = [
  {
    id: 'home-words',
    icon: '📖',
    label: 'Words',
    color: 'pink',
    speechLabel: 'Words',
    route: '#activity/phonics-find-b',
  },
  {
    id: 'home-cafe',
    icon: '☎️',
    label: 'Cafe',
    color: 'blue',
    speechLabel: 'Bear Cafe',
    route: '#activity/kennedis-orders-banana-001',
  },
  {
    id: 'home-math',
    icon: '🔢',
    label: 'Math',
    color: 'green',
    speechLabel: 'Math',
    route: '#activity/number-train',
  },
  {
    id: 'home-art',
    icon: '🎨',
    label: 'Art',
    color: 'orange',
    speechLabel: 'Art',
    route: '#activity/art-color-circle',
  },
];

export function renderHomeScreen(
  parent: HTMLElement,
  speech: SpeechServiceInterface
): void {
  _container = document.createElement('div');
  _container.className = 'child-container';
  _container.id = 'home-screen';

  // Cafe environment backdrop (softened, behind the cards).
  _container.appendChild(createCafeBackdrop());

  // Greeting
  const greeting = document.createElement('h1');
  greeting.className = 'home-greeting';
  greeting.textContent = "Let's play!";
  _container.appendChild(greeting);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'home-grid';
  grid.setAttribute('role', 'navigation');
  grid.setAttribute('aria-label', 'Activities');

  for (const option of HOME_OPTIONS) {
    const card = document.createElement('button');
    card.className = 'home-card';
    card.id = option.id;
    card.dataset.color = option.color;
    card.setAttribute('aria-label', option.label);
    card.setAttribute('role', 'link');

    const icon = document.createElement('span');
    icon.className = 'home-card__icon';
    icon.textContent = option.icon;
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'home-card__label';
    label.textContent = option.label;

    card.appendChild(icon);
    card.appendChild(label);

    card.addEventListener('click', async () => {
      card.disabled = true;
      await Promise.all([
        speech.speak(option.speechLabel),
        wait(350),
      ]);
      window.location.hash = option.route;
    });

    grid.appendChild(card);
  }

  _container.appendChild(grid);

  // Parent access stays outside the four child activity choices.
  const parentGate = document.createElement('button');
  parentGate.className = 'parent-gate-hint';
  parentGate.id = 'parent-gate-trigger';
  parentGate.textContent = 'Parent';
  parentGate.setAttribute('aria-label', 'Open parent check');
  parentGate.title = 'Parent tools';

  parentGate.addEventListener('click', () => {
    window.location.hash = '#parent';
  });

  _container.appendChild(parentGate);
  parent.appendChild(_container);
}

export function destroyHomeScreen(): void {
  if (_container) {
    _container.remove();
    _container = null;
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
