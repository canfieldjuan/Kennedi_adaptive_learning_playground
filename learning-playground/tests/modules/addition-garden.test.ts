// @ts-expect-error Node is test-only; app ships no Node typings.
import { Worker } from 'node:worker_threads';
import { describe, expect, test } from 'vitest';
import { APPLE_IDS, BEAR_STOP, TREE_STOP, START, REACH, WALK_SPEED, answer, deliver, fruitAt, near, newGarden, pathTo, pickApple, returnApple, totalOnTable, walk, walkable } from '../../src/modules/addition-garden/garden-model';

function picked(n = 3) {
  const state = newGarden();
  for (const id of APPLE_IDS.slice(0, n)) expect(pickApple(state, id, TREE_STOP)).toBe(true);
  return state;
}
describe('addition garden fruit owner', () => {
  test('exact delivery combines actual fruit and requires the correct total', () => {
    const state = picked();
    expect(deliver(state, BEAR_STOP)).toBe('delivered');
    expect(totalOnTable(state)).toBe(5);
    expect(fruitAt(state, 'basket')).toEqual([]);
    expect(fruitAt(state, 'table')).toHaveLength(3);
    expect(state.phase).toBe('counting');
    for (const n of [0, 4, 6, 50]) expect(answer(state, n)).toBe(false);
    expect(answer(state, 5)).toBe(true);
    expect(state.phase).toBe('complete');
  });
  test.each([0, 1, 2, 4, 5])('rejects delivery of %i without losing any fruit; return/pick repairs it', n => {
    const state = picked(n);
    const before = structuredClone(state);
    expect(deliver(state, BEAR_STOP)).toBe(n < 3 ? 'need-more' : 'bring-fewer');
    expect(state).toEqual(before);
    while (fruitAt(state, 'basket').length > 3) expect(returnApple(state, TREE_STOP)).toBe(true);
    while (fruitAt(state, 'basket').length < 3) expect(pickApple(state, fruitAt(state, 'tree')[0]!, TREE_STOP)).toBe(true);
    expect(deliver(state, BEAR_STOP)).toBe('delivered');
    expect(Object.values(state.apples)).toHaveLength(5);
  });
  test('no remote picking, return or delivery; reach boundary is inclusive', () => {
    const state = newGarden();
    expect(pickApple(state, 'a', START)).toBe(false);
    expect(pickApple(state, 'a', { x: TREE_STOP.x + REACH, y: TREE_STOP.y })).toBe(true);
    expect(pickApple(state, 'b', { x: TREE_STOP.x + REACH + 1, y: TREE_STOP.y })).toBe(false);
    expect(returnApple(state, START)).toBe(false);
    expect(deliver(state, START)).toBe('not-near');
    expect(near(TREE_STOP, TREE_STOP)).toBe(true);
    expect(returnApple(state, TREE_STOP)).toBe(true);
    expect(returnApple(state, TREE_STOP)).toBe(false);
    expect(Object.keys(state.apples)).toEqual([...APPLE_IDS]);
  });
  test('one apple cannot be picked twice, and each can be returned and repicked', () => {
    const state = newGarden();
    expect(pickApple(state, 'a', TREE_STOP)).toBe(true);
    expect(pickApple(state, 'a', TREE_STOP)).toBe(false);
    expect(fruitAt(state, 'basket')).toEqual(['a']);
    expect(returnApple(state, TREE_STOP)).toBe(true);
    expect(pickApple(state, 'a', TREE_STOP)).toBe(true);
  });
  test('out of order answers and post-delivery interactions cannot change the picnic', () => {
    const state = picked();
    expect(answer(state, 2)).toBe(false);
    expect(answer(state, 5)).toBe(false);
    expect(deliver(state, BEAR_STOP)).toBe('delivered');
    const delivered = structuredClone(state);
    expect(pickApple(state, 'd', TREE_STOP)).toBe(false);
    expect(returnApple(state, TREE_STOP)).toBe(false);
    expect(deliver(state, BEAR_STOP)).toBe('already-delivered');
    expect(state).toEqual(delivered);
    expect(answer(state, 5)).toBe(true);
    expect(answer(state, 5)).toBe(false);
    expect(deliver(state, BEAR_STOP)).toBe('already-delivered');
    expect(totalOnTable(state)).toBe(5);
    const replay = newGarden();
    expect(replay.phase).toBe('collecting');
    expect(fruitAt(replay, 'tree')).toHaveLength(5);
    expect(totalOnTable(replay)).toBe(2);
  });
});
describe('garden movement', () => {
  test.each([
    [79, 500], [1121, 500], [500, 319], [500, 741], [255, 395], [800, 400], [1010, 710],
    [740, 400], [970, 400], [800, 360], [800, 500],
  ])('feet cannot enter obstacle or boundary at %i,%i', (x, y) => {
    expect(walkable({ x, y })).toBe(false);
  });
  test.each([[80, 500], [1120, 500], [500, 320], [500, 740], [360, 460], [700, 530]])('grass stays walkable at %i,%i', (x, y) => {
    expect(walkable({ x, y })).toBe(true);
  });
  test('idle has no motion; diagonal speed equals straight speed', () => {
    expect(walk(START, 0, 0, 1)).toEqual(START);
    const straight = walk(START, 1, 0, .1);
    const diagonal = walk(START, 1, 1, .1);
    expect(Math.hypot(diagonal.x - START.x, diagonal.y - START.y)).toBeCloseTo(WALK_SPEED * .1);
    expect(straight.x - START.x).toBeCloseTo(WALK_SPEED * .1);
  });
  test('keyboard cannot tunnel through table or pond on a long frame', () => {
    const horizontal = walk({ x: 700, y: 430 }, 1, 0, 2);
    expect(horizontal.x).toBeLessThan(740);
    const vertical = walk({ x: 850, y: 330 }, 0, 1, 2);
    expect(vertical.y).toBeLessThan(360);
    expect(walkable(walk({ x: 800, y: 700 }, 1, 0, 2))).toBe(true);
  });
  test.each([TREE_STOP, BEAR_STOP, { x: 1000, y: 520 }, { x: 80, y: 320 }, { x: 800, y: 400 }, { x: 1010, y: 710 }])('path is collision free to %j, including obstacle clicks', target => {
    const path = pathTo(START, target);
    expect(path.length).toBeGreaterThan(0);
    let from = START;
    for (const to of path) {
      for (let i = 0; i <= 20; i++) expect(walkable({ x: from.x + (to.x - from.x) * i / 20, y: from.y + (to.y - from.y) * i / 20 })).toBe(true);
      from = to;
    }
    if (walkable(target)) expect(Math.hypot(from.x - target.x, from.y - target.y)).toBeLessThanOrEqual(20);
  });
});


test('path search refuses cycles and completes a two-step route within its worker budget', async () => {
  const url = new URL('../../src/modules/addition-garden/garden-model.ts', import.meta.url).href;
  const result = await new Promise<string>((resolve, reject) => {
    const worker = new Worker(`import { parentPort } from 'node:worker_threads';
      import { pathTo } from ${JSON.stringify(url)};
      parentPort.postMessage('ready');
      parentPort.on('message', () => {
        const route = pathTo({x:500,y:640},{x:540,y:640});
        parentPort.postMessage(route.at(-1).x === 540 ? 'complete' : 'wrong-path');
      });`, { eval: true });
    let timer: ReturnType<typeof setTimeout>;
    worker.on('message', (message: string) => {
      if (message === 'ready') {
        timer = setTimeout(() => { void worker.terminate(); resolve('deadline'); }, 250);
        worker.postMessage('go');
      } else { clearTimeout(timer); void worker.terminate(); resolve(message); }
    });
    worker.on('error', (error: Error) => { clearTimeout(timer); reject(error); });
  });
  expect(result).toBe('complete');
});
