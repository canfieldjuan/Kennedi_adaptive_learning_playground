import { HOME_CARD_ICONS } from '../home/home-icons';
import type { SpeechServiceInterface } from '../../types/runtime';
import background from '../../../design-source/addition-garden/garden.svg';
import tree from '../../../design-source/addition-garden/tree.svg';
import bear from '../../../design-source/addition-garden/bear.svg';
import apple from '../../../design-source/addition-garden/apple.svg';
import explorer from '../../../design-source/addition-garden/explorer.svg?raw';
import table from '../../../design-source/addition-garden/table.svg?raw';
import {
  APPLE_IDS, BEAR_APPLES, REQUESTED_APPLES, START, TREE_STOP, BEAR_STOP, WALK_SPEED,
  newGarden, fruitAt, near, pickApple, returnApple, deliver, answer, totalOnTable,
  pathTo, walk, type Point, type AppleId, type Cloth,
} from './garden-model';
import './garden.css';

const HOME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10h-6v-7H9v7H3Z" fill="currentColor"/></svg>';
const SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-5v16l-5-5H3ZM16 8q5 4 0 8m3-11q8 7 0 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const appleImage = () => `<img src="${apple}" alt="" draggable="false">`;
let teardown: (() => void) | undefined;

export function destroyGarden(): void { teardown?.(); teardown = undefined; }

export function renderMathGardenMenu(parent: HTMLElement, speech: SpeechServiceInterface): void {
  const root = document.createElement('section');
  root.className = 'garden-menu';
  root.innerHTML = `<a class="garden-utility garden-menu-home" href="#home" aria-label="Return home">${HOME}</a>
    <h1>What shall we play?</h1><p>A little adventure with numbers.</p>
    <nav aria-label="Math games"><a class="garden-menu-card garden-menu-card--garden" href="#garden"><img src="${tree}" alt=""><span>Apple garden</span><small>Pick, carry & add</small></a>
    <a class="garden-menu-card garden-menu-card--train" href="#activity/number-train"><span class="garden-train-icon" aria-hidden="true">${HOME_CARD_ICONS['home-math']}</span><span>Number Train</span><small>All aboard!</small></a></nav>`;
  parent.append(root);
  void speech.speak('What shall we play? Apple garden, or Number Train?');
}

export function renderGarden(parent: HTMLElement, speech: SpeechServiceInterface): void {
  destroyGarden();
  let state = newGarden();
  let position: Point = START;
  let route: Point[] = [];
  type Intent = { kind: 'pick'; id: AppleId } | { kind: 'return' } | { kind: 'deliver' };
  let intent: Intent | undefined;
  const keys = new Set<string>();
  let frame: number | undefined;
  let previousTime = 0;
  let disposed = false;
  let scale = 1;
  let cameraX = 0;
  let cameraY = 0;
  let facing = 1;
  let message = 'Bear has 2 apples. Bring him 3 more!';
  let counted = new Set<number>();
  const controller = new AbortController();
  const signal = controller.signal;
  const root = document.createElement('section');
  root.className = 'garden-scene';
  root.setAttribute('aria-label', 'Apple garden addition game');
  root.innerHTML = `<header class="garden-header">
      <a class="garden-utility" href="#math" aria-label="Back to math games">${HOME}</a>
      <div class="garden-title"><span>Bear’s picnic</span><small>Apple garden</small></div>
      <button class="garden-utility" data-repeat aria-label="Hear the instructions again">${SOUND}</button>
    </header>
    <div class="garden-viewport" tabindex="0" aria-label="Walk in the garden. Use arrow keys or tap the ground. Press Space near the tree to pick an apple, or near Bear to deliver.">
      <div class="garden-world">
        <img class="garden-ground" src="${background}" alt="" draggable="false">
        <img class="garden-tree" src="${tree}" alt="" draggable="false">
        <div class="garden-table">${table}</div>
        <img class="garden-bear" src="${bear}" alt="" draggable="false">
        <button class="garden-bear-target" aria-label="Walk to Bear and bring the apples"><span>Bear’s picnic</span><span class="garden-bear-apples">${appleImage()}${appleImage()}</span></button>
        <div class="garden-orchard"></div>
        <div class="garden-destination" hidden></div>
        <div class="garden-player" data-testid="garden-player" aria-label="Your explorer"><div class="garden-player-shadow"></div><div class="garden-player-art">${explorer}<div class="garden-carried"></div></div></div>
      </div>
    </div>
    <div class="garden-dialogue"><img src="${bear}" alt=""><div><span class="garden-speaker">Bear</span><p data-message role="status" aria-live="polite"></p></div><button class="garden-dialogue-repeat" aria-label="Hear Bear again">${SOUND}</button></div>
    <footer class="garden-tray"><div class="garden-basket"><span class="garden-basket-caption">Your basket</span><div class="garden-basket-fruit" aria-label="Empty basket"></div></div><div class="garden-actions"></div></footer>
    <p class="garden-help">Tap a place to walk · Arrows to move · Space to help</p>
    <dialog class="garden-counting" aria-labelledby="garden-picnic-title"></dialog>`;
  parent.append(root);
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const viewport = get('.garden-viewport');
  viewport.style.setProperty('--garden-backdrop', `url("${background}")`);
  const world = get('.garden-world');
  const player = get('.garden-player');
  const art = get('.garden-player-art');
  const destination = get('.garden-destination');
  const orchard = get('.garden-orchard');
  const basket = get('.garden-basket-fruit');
  const actions = get('.garden-actions');
  const counting = get<HTMLDialogElement>('.garden-counting');
  const messageNode = get('[data-message]');
  const treeButtons = new Map<AppleId, HTMLButtonElement>();
  const points = [[140, 115], [245, 90], [330, 165], [155, 195], [285, 200]];
  APPLE_IDS.forEach((id, i) => {
    const button = document.createElement('button');
    button.className = 'garden-tree-apple';
    button.setAttribute('aria-label', `Pick apple ${i + 1}`);
    button.dataset.apple = id;
    button.innerHTML = appleImage();
    button.style.left = `${points[i]![0]}px`;
    button.style.top = `${points[i]![1]}px`;
    button.addEventListener('click', () => approach(TREE_STOP, { kind: 'pick', id }), { signal });
    orchard.append(button);
    treeButtons.set(id, button);
  });
  function say(text: string): void {
    message = text;
    messageNode.textContent = text;
    void speech.speak(text);
  }
  function paintCamera(): void {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    scale = height / 800;
    const horizontalRoom = 1200 - width / scale;
    cameraX = horizontalRoom < 0 ? horizontalRoom / 2
      : Math.max(0, Math.min(horizontalRoom, position.x - width / scale / 2));
    cameraY = 0;
    world.style.setProperty('--hit-size', `${Math.max(90, 80 / scale)}px`);
    world.style.transform = `translate(${-cameraX * scale}px, ${-cameraY * scale}px) scale(${scale})`;
  }
  function paintPosition(moving = false): void {
    player.style.left = `${position.x}px`;
    player.style.top = `${position.y}px`;
    player.style.zIndex = String(Math.round(position.y));
    player.dataset.x = String(position.x);
    player.dataset.y = String(position.y);
    player.classList.toggle('is-walking', moving);
    art.style.transform = `scaleX(${facing})`;
    paintCamera();
  }
  function button(label: string, html: string, onClick: () => void, secondary = false): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `garden-action${secondary ? ' garden-action--secondary' : ''}`;
    el.setAttribute('aria-label', label);
    el.innerHTML = html;
    el.addEventListener('click', onClick, { signal });
    return el;
  }
  function paint(): void {
    root.dataset.phase = state.phase;
    for (const [id, el] of treeButtons) el.hidden = state.apples[id] !== 'tree';
    const carried = fruitAt(state, 'basket');
    basket.innerHTML = carried.length ? carried.map(appleImage).join('') : '<span class="garden-empty-basket" aria-hidden="true">⌒</span>';
    basket.setAttribute('aria-label', `${carried.length} apples in your basket`);
    get('.garden-carried').innerHTML = carried.map(appleImage).join('');
    get('.garden-bear-apples').innerHTML = Array.from({ length: totalOnTable(state) }, appleImage).join('');
    actions.replaceChildren();
    if (state.phase === 'collecting') {
      actions.append(button('Pick an apple from the tree', `${appleImage()}<span>Pick an apple</span>`, () => {
        const id = fruitAt(state, 'tree')[0];
        if (id) approach(TREE_STOP, { kind: 'pick', id });
        else say('You picked all the apples! Bring three to Bear. You can put the extras back.');
      }));
      if (carried.length) actions.append(button('Put an apple back on the tree', '↶<span>Put one back</span>', () => approach(TREE_STOP, { kind: 'return' }), true));
      actions.append(button('Bring apples to Bear', `<img src="${bear}" alt=""><span>To Bear</span>`, () => approach(BEAR_STOP, { kind: 'deliver' })));
    } else {
      actions.append(button('Count the picnic apples', `${appleImage()}<span>Our picnic</span>`, () => showCounting()));
    }
  }
  function interact(next: Intent): void {
    if (next.kind === 'pick') {
      if (pickApple(state, next.id, position)) {
        const n = fruitAt(state, 'basket').length;
        say(n === REQUESTED_APPLES ? 'Three apples! Bring your basket to Bear.' : `${n} ${n === 1 ? 'apple' : 'apples'} in your basket.`);
      }
    } else if (next.kind === 'return') {
      if (returnApple(state, position)) say(`${fruitAt(state, 'basket').length} apples in your basket. Bear asked for three.`);
    } else {
      const result = deliver(state, position);
      const n = fruitAt(state, 'basket').length;
      if (result === 'need-more') say(`You brought ${n}. Pick ${REQUESTED_APPLES - n} more ${REQUESTED_APPLES - n === 1 ? 'apple' : 'apples'} for Bear.`);
      if (result === 'bring-fewer') say(`You brought ${n}. Put ${n - REQUESTED_APPLES} back on the tree, then come see Bear.`);
      if (result === 'delivered') {
        say('I had two. You brought three! How many apples do we have altogether?');
        showCounting();
      }
      if (result === 'already-delivered') showCounting();
    }
    paint();
  }
  function approach(target: Point, next?: Intent): void {
    stopMoving();
    counting.close();
    intent = next;
    if (next && near(position, target)) {
      intent = undefined;
      interact(next);
      return;
    }
    route = pathTo(position, target);
    const end = route.at(-1)!;
    destination.style.left = `${end.x}px`;
    destination.style.top = `${end.y}px`;
    destination.hidden = false;
    schedule();
  }
  function schedule(): void {
    if (frame !== undefined || disposed) return;
    previousTime = performance.now();
    frame = requestAnimationFrame(tick);
  }
  function tick(time: number): void {
    frame = undefined;
    if (disposed) return;
    // Ignore suspended-tab time; a delayed frame must not teleport the child.
    const seconds = Math.min((time - previousTime) / 1000, .05);
    previousTime = time;
    const before = position;
    if (keys.size) {
      const dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      const dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
      position = walk(position, dx, dy, seconds);
    } else if (route.length) {
      const next = route[0]!;
      const distance = Math.hypot(next.x - position.x, next.y - position.y);
      if (distance <= WALK_SPEED * seconds) {
        position = next;
        route.shift();
      } else position = walk(position, next.x - position.x, next.y - position.y, seconds);
    }
    if (position.x !== before.x) facing = position.x > before.x ? 1 : -1;
    const moving = position.x !== before.x || position.y !== before.y;
    paintPosition(moving);
    if (keys.size || route.length) frame = requestAnimationFrame(tick);
    else {
      player.classList.remove('is-walking');
      destination.hidden = true;
      const arrived = intent;
      intent = undefined;
      if (arrived) interact(arrived);
    }
  }
  function stopMoving(): void {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    route = [];
    intent = undefined;
    keys.clear();
    destination.hidden = true;
    player.classList.remove('is-walking');
  }
  function showCounting(): void {
    stopMoving();
    const done = state.phase === 'complete';
    counting.innerHTML = `<section class="garden-picnic-panel" aria-label="Our apple picnic">
      <button class="garden-panel-close garden-utility" aria-label="Back to the garden">×</button>
      <span class="garden-picnic-flower" aria-hidden="true">✿</span>
      <h1 id="garden-picnic-title">${done ? 'We made a picnic!' : 'How many altogether?'}</h1>
      <p>${done ? 'Two from Bear. Three from you. Five to share.' : 'Bear’s apples + your apples'}</p>
      <div class="garden-count-fruit" aria-label="Picnic apples"></div>
      <div class="garden-equation" aria-live="polite">${BEAR_APPLES} + ${fruitAt(state, 'table').length} = <span>${done ? totalOnTable(state) : '?'}</span></div>
      <div class="garden-answer-row"></div>
      <p class="garden-answer-hint" role="status">${done ? 'Choose a cloth for our picnic.' : 'Tap each apple if you want to count.'}</p>
      <div class="garden-cloth-row" aria-label="Choose a picnic cloth"></div>
      <div class="garden-finish-row"></div></section>`;
    counting.querySelector('.garden-panel-close')!.addEventListener('click', () => { counting.close(); }, { signal });
    const fruit = counting.querySelector('.garden-count-fruit')!;
    for (let i = 0; i < totalOnTable(state); i++) {
      const el = button(`Count picnic apple ${i + 1}`, appleImage(), () => {
        counted.add(i);
        el.classList.add('is-counted');
        void speech.speak(String(counted.size));
      });
      el.className = `garden-count-apple${i < BEAR_APPLES ? ' garden-count-apple--bear' : ''}`;
      if (counted.has(i)) el.classList.add('is-counted');
      fruit.append(el);
    }
    if (!done) {
      for (const value of [4, 5, 6]) counting.querySelector('.garden-answer-row')!.append(button(`Answer ${value}`, String(value), () => {
        if (answer(state, value)) {
          say('Two plus three makes five. We made a picnic!');
          paint();
          showCounting();
        } else {
          counting.querySelector('.garden-answer-hint')!.textContent = 'Let’s touch each apple and count together.';
          void speech.speak('Let’s touch each apple and count together.');
        }
      }));
    } else {
      for (const [color, name] of [['rose', 'Rose'], ['sky', 'Sky'], ['honey', 'Honey']] as const) {
        const el = button(`${name} picnic cloth`, '<span aria-hidden="true">✓</span>', () => {
          state.cloth = color;
          applyCloth();
          showCounting();
        });
        el.className = `garden-cloth garden-cloth--${color}`;
        el.setAttribute('aria-pressed', String(state.cloth === color));
        counting.querySelector('.garden-cloth-row')!.append(el);
      }
      counting.querySelector('.garden-finish-row')!.append(
        button('See our picnic in the garden', 'See our picnic', () => { counting.close(); }),
        button('Play again', 'Play again', replay, true),
      );
    }
    if (!counting.open) counting.showModal();
  }
  function applyCloth(): void {
    const colors: Record<Cloth, string> = { rose: '#d98987', sky: '#78afb6', honey: '#d6b65d' };
    root.style.setProperty('--picnic-cloth', colors[state.cloth]);
  }
  function replay(): void {
    stopMoving();
    state = newGarden();
    counted = new Set();
    position = START;
    facing = 1;
    counting.close();
    applyCloth();
    paint();
    paintPosition();
    say('Bear has two apples. Pick three more and bring them to the picnic.');
  }
  get('[data-repeat]').addEventListener('click', () => void speech.speak(message), { signal });
  get('.garden-dialogue-repeat').addEventListener('click', () => void speech.speak(message), { signal });
  get('.garden-bear-target').addEventListener('click', () => approach(BEAR_STOP, { kind: 'deliver' }), { signal });
  viewport.addEventListener('click', event => {
    if ((event.target as Element).closest('button')) return;
    const bounds = viewport.getBoundingClientRect();
    viewport.focus({ preventScroll: true });
    approach({ x: (event.clientX - bounds.left) / scale + cameraX, y: (event.clientY - bounds.top) / scale + cameraY });
  }, { signal });
  const movementKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', event => {
    if (counting.open) return;
    if (movementKeys.has(event.key)) {
      event.preventDefault();
      route = [];
      intent = undefined;
      destination.hidden = true;
      keys.add(event.key);
      schedule();
    } else if ((event.key === ' ' || event.key.toLowerCase() === 'e') && event.target === viewport) {
      event.preventDefault();
      if (event.repeat) return;
      if (near(position, TREE_STOP)) {
        const id = fruitAt(state, 'tree')[0];
        if (id) interact({ kind: 'pick', id });
      } else if (near(position, BEAR_STOP)) interact({ kind: 'deliver' });
      else say('Walk closer to the apple tree or Bear.');
    }
  }, { signal });
  window.addEventListener('keyup', event => { keys.delete(event.key); }, { signal });
  window.addEventListener('blur', stopMoving, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMoving(); }, { signal });
  const resize = new ResizeObserver(paintCamera);
  resize.observe(viewport);
  paint();
  paintPosition();
  messageNode.textContent = message;
  void speech.speak('Bear has two apples. Pick three more and bring them to the picnic.');
  teardown = () => {
    disposed = true;
    stopMoving();
    controller.abort();
    resize.disconnect();
    speech.stop();
    root.remove();
  };
}
