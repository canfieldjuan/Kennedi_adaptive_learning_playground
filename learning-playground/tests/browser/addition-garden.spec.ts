import { expect, test, type Page } from '@playwright/test';

async function pick(page: Page, count: number) {
  for (let i = 1; i <= count; i++) {
    await page.getByRole('button', { name: 'Pick an apple from the tree', exact: true }).click();
    await expect(page.getByLabel(`${i} apples in your basket`, { exact: true })).toBeVisible({ timeout: 8_000 });
  }
}
async function giveThree(page: Page) {
  for (let i = 0; i < 3; i++) {
    const give = page.getByRole('button', { name: 'Give an apple to Bear', exact: true });
    await expect(give).toBeEnabled({ timeout: 8000 });
    await give.click();
    await expect(page.locator('.garden-bear-apples img')).toHaveCount(3 + i);
  }
}
async function deliverThree(page: Page) {
  await pick(page, 3);
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await giveThree(page);
  await expect(page.getByRole('heading', { name: 'How many altogether?' })).toBeVisible({ timeout: 8_000 });
}
test.beforeEach(async ({ page }) => {
  await page.goto('/#garden');
});

test('wide short viewport keeps the tree and Bear framed', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 660 });
  await page.screenshot({ path: testInfo.outputPath('garden-desktop.png') });
  const viewport = await page.locator('.garden-viewport').boundingBox();
  for (const selector of ['.garden-tree', '.garden-bear']) {
    const box = await page.locator(selector).boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(viewport!.y);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.y + viewport!.height);
  }
});

test('walk, carry, combine, recover a wrong answer, choose a cloth, and replay', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await deliverThree(page);
  await expect(page.getByLabel('0 apples in your basket', { exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: /Count picnic apple/ })).toHaveCount(5);
  await page.getByRole('button', { name: 'Answer 4', exact: true }).click();
  await expect(page.getByText('Let’s touch each apple and count together.', { exact: true })).toBeVisible();
  for (let i = 1; i <= 5; i++) await page.getByRole('button', { name: `Count picnic apple ${i}`, exact: true }).click();
  await expect(page.locator('.is-counted')).toHaveCount(5);
  await page.getByRole('button', { name: 'Answer 5', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'We made a picnic!' })).toBeVisible();
  await expect(page.locator('.garden-equation')).toHaveText('2 + 3 = 5');
  await page.screenshot({ path: testInfo.outputPath('garden-picnic.png') });
  await page.getByRole('button', { name: 'Sky picnic cloth', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sky picnic cloth', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'See our picnic in the garden', exact: true }).click();
  await expect(page.locator('.garden-scene')).toHaveCSS('--picnic-cloth', '#78afb6');
  await page.getByRole('button', { name: 'Count the picnic apples', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sky picnic cloth', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  await expect(page.getByLabel('0 apples in your basket', { exact: true })).toBeVisible();
  await expect(page.locator('.garden-scene')).toHaveAttribute('data-phase', 'collecting');
  expect(errors).toEqual([]);
});

test('too few and too many apples retain the basket, return repairs the request', async ({ page }) => {
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await expect(page.getByText('You brought 0. Pick 3 more apples for Bear.', { exact: true })).toBeVisible({ timeout: 8_000 });
  await pick(page, 4);
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await expect(page.getByText('You brought 4. Put 1 back on the tree, then come see Bear.', { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: 'Put an apple back on the tree', exact: true }).click();
  await expect(page.getByLabel('3 apples in your basket', { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await giveThree(page);
  await expect(page.getByRole('heading', { name: 'How many altogether?' })).toBeVisible({ timeout: 8_000 });
});

test('Math offers garden and preserves Number Train', async ({ page }) => {
  await page.goto('/#home');
  await page.getByRole('link', { name: 'Math', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What shall we play?' })).toBeVisible();
  await page.getByRole('link', { name: /Number Train/ }).click();
  await expect(page.getByRole('heading', { name: 'Which world today?' })).toBeVisible();
  await page.goto('/#math');
  await page.getByRole('link', { name: /Apple garden/ }).click();
  await expect(page.getByLabel('Apple garden addition game')).toBeVisible();
});

test('retargeting cancels pending fruit and leaving during travel tears down the scene', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: 'Pick an apple from the tree', exact: true }).click();
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await expect(page.getByText('You brought 0. Pick 3 more apples for Bear.', { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: 'Pick an apple from the tree', exact: true }).click();
  await page.getByRole('link', { name: 'Back to math games', exact: true }).click();
  await expect(page.getByLabel('Apple garden addition game')).toHaveCount(0);
  await page.getByRole('link', { name: /Apple garden/ }).click();
  await expect(page.getByLabel('0 apples in your basket', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('touch-sized portrait scene completes without overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('garden-mobile.png') });
  await deliverThree(page);
  await page.getByRole('button', { name: 'Answer 5', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'We made a picnic!' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('garden-mobile-picnic.png') });
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight }));
  expect(size.width).toBe(size.viewportWidth);
  expect(size.height).toBe(size.viewportHeight);
});

test('keyboard moves the explorer, Space picks nearby, and blur cancels travel', async ({ page }) => {
  const player = page.getByTestId('garden-player');
  const x = Number(await player.getAttribute('data-x'));
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number(await player.getAttribute('data-x'))).toBeGreaterThan(x + 30);
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: 'Pick an apple from the tree', exact: true }).click();
  await expect(page.getByLabel('1 apples in your basket', { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.getByLabel('2 apples in your basket', { exact: true })).toBeVisible();
  // Controlled event ordering, with the actual frame scheduler and DOM.
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const stopped = await player.getAttribute('data-x');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(player).toHaveAttribute('data-x', stopped!);
  await expect(page.getByLabel('2 apples in your basket', { exact: true })).toBeVisible();
});

test('duplicate clicks while walking pick one apple; keyboard retarget cancels the pending pick', async ({ page }) => {
  const pickButton = page.getByRole('button', { name: 'Pick an apple from the tree', exact: true });
  await pickButton.dblclick();
  await expect(page.getByLabel('1 apples in your basket', { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.goto('/#math');
  await page.getByRole('link', { name: /Apple garden/ }).click();
  await page.getByRole('button', { name: 'Pick an apple from the tree', exact: true }).click();
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number(await page.getByTestId('garden-player').getAttribute('data-x'))).toBeGreaterThan(550);
  await page.keyboard.up('ArrowRight');
  await expect(page.getByLabel('0 apples in your basket', { exact: true })).toBeVisible();
});

test('reduced motion removes gait animation without disabling movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Pick an apple from the tree', exact: true }).click();
  await expect(page.locator('.garden-leg-left')).toHaveCSS('animation-name', 'none');
  await expect(page.getByLabel('1 apples in your basket', { exact: true })).toBeVisible({ timeout: 8_000 });
});

test('clicking an orchard apple approaches it without the ground stealing the interaction', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.getByRole('button', { name: 'Pick apple 1', exact: true }).click();
  await expect(page.getByLabel('1 apples in your basket', { exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('button', { name: 'Pick apple 1', exact: true })).toHaveCount(0);
});

test('scheduler orders repeated keys, blur, canceled callbacks and route teardown', async ({ page }) => {
  // A controlled clock exposes reachable timing orderings without sleeping.
  await page.evaluate(() => {
    let id = 0;
    let time = performance.now();
    const pending = new Map<number, FrameRequestCallback>();
    const canceled: FrameRequestCallback[] = [];
    const clock = {
      pending,
      tick(delta = 16) {
        time = Math.max(time, performance.now()) + delta;
        const batch = [...pending.values()];
        pending.clear();
        for (const callback of batch) callback(time);
      },
      stall() { this.tick(5000); },
      flush() { for (let i = 0; i < 500 && pending.size; i++) this.tick(); },
      stale() { for (const callback of canceled) callback(time + 16); },
    };
    Object.assign(window, { gardenTestClock: clock });
    window.requestAnimationFrame = callback => { pending.set(++id, callback); return id; };
    window.cancelAnimationFrame = handle => { const cb = pending.get(handle); if (cb) canceled.push(cb); pending.delete(handle); };
  });
  const clock = (method: 'tick' | 'flush' | 'stale' | 'stall' | 'size') => page.evaluate(method => {
    const c = (window as unknown as { gardenTestClock: { tick(): void; flush(): void; stale(): void; stall(): void; pending: Map<number, unknown> } }).gardenTestClock;
    if (method === 'size') return c.pending.size;
    c[method]();
    return c.pending.size;
  }, method);
  await page.locator('.garden-viewport').focus();
  await page.keyboard.press('x');
  expect(await clock('size')).toBe(0);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  expect(await clock('size')).toBe(1);
  await clock('tick');
  expect(await clock('size')).toBe(1);
  const beforeStall = Number(await page.getByTestId('garden-player').getAttribute('data-x'));
  await clock('stall');
  const afterStall = Number(await page.getByTestId('garden-player').getAttribute('data-x'));
  expect(afterStall - beforeStall).toBeLessThanOrEqual(11);
  await page.keyboard.up('ArrowRight');
  await clock('tick');
  expect(await clock('size')).toBe(0);
  await page.getByRole('button', { name: 'Pick an apple from the tree', exact: true }).click();
  await clock('flush');
  await expect(page.getByLabel('1 apples in your basket', { exact: true })).toBeVisible();
  await page.locator('.garden-viewport').focus();
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.getByLabel('2 apples in your basket', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await clock('size')).toBe(0);
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  expect(await clock('size')).toBe(1);
  await page.getByRole('link', { name: 'Back to math games', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What shall we play?' })).toBeVisible();
  expect(await clock('size')).toBe(0);
  await clock('stale');
  expect(await clock('size')).toBe(0);
  await expect(page.getByLabel('Apple garden addition game')).toHaveCount(0);
  const intercepted = await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(intercepted).toBe(false);
});

test('counting holds movement and a completed picnic remains until the child acts', async ({ page }) => {
  await deliverThree(page);
  const x = await page.getByTestId('garden-player').getAttribute('data-x');
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.keyboard.up('ArrowRight');
  await expect(page.getByTestId('garden-player')).toHaveAttribute('data-x', x!);
  await page.getByRole('button', { name: 'Answer 5', exact: true }).click();
  await page.getByRole('button', { name: 'See our picnic in the garden', exact: true }).click();
  await page.getByRole('button', { name: 'Walk to Bear and bring the apples', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'We made a picnic!' })).toBeVisible();
});

test('counting keeps keyboard focus on the picnic instead of background actions', async ({ page }) => {
  await deliverThree(page);
  await page.getByRole('button', { name: 'Answer 4', exact: true }).focus();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), inPicnic: document.activeElement?.closest('.garden-counting') !== null, modal: document.querySelector('dialog')?.matches(':modal')}));
    // BODY represents browser chrome during Tab traversal, not a background control.
    expect(focus.tag === 'BODY' || focus.inPicnic).toBe(true);
    expect(focus.modal).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'How many altogether?' })).toBeHidden();
  await page.getByRole('button', { name: 'Count the picnic apples', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How many altogether?' })).toBeVisible();
});


async function walkByKey(page: Page, key: string, axis: 'x' | 'y', target: number, direction: 'less' | 'greater') {
  await page.keyboard.down(key);
  const coordinate = () => page.getByTestId('garden-player').getAttribute(`data-${axis}`).then(Number);
  try {
    if (direction === 'less') await expect.poll(coordinate, { intervals: [16], timeout: 4000 }).toBeLessThanOrEqual(target);
    else await expect.poll(coordinate, { intervals: [16], timeout: 4000 }).toBeGreaterThanOrEqual(target);
  } finally { await page.keyboard.up(key); }
}

for (const interaction of ['Space', 'e']) {
  test(`keyboard from Math picks and delivers with ${interaction} without a focus setup`, async ({ page }) => {
    await page.goto('/#math');
    await page.getByRole('link', { name: /Apple garden/ }).click();
    await expect(page.getByLabel('Apple garden addition game')).toBeVisible();
    const goToTree = async () => {
      await walkByKey(page, 'ArrowLeft', 'x', 370, 'less');
      await walkByKey(page, 'ArrowUp', 'y', 475, 'less');
    };
    await goToTree();
    for (let count = 1; count <= 3; count++) {
      await page.keyboard.press(interaction);
      await expect(page.getByLabel(`${count} apples in your basket`, { exact: true })).toBeVisible();
    }
    await walkByKey(page, 'ArrowDown', 'y', 550, 'greater');
    await walkByKey(page, 'ArrowRight', 'x', 690, 'greater');
    await page.keyboard.press(interaction);
    await expect(page.locator('.garden-scene')).toHaveAttribute('data-phase', 'sharing');
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press(interaction);
      await expect(page.locator('.garden-bear-apples img')).toHaveCount(3 + i);
    }
    await expect(page.getByRole('heading', { name: 'How many altogether?' })).toBeVisible();
    await page.getByRole('button', { name: 'Answer 5', exact: true }).click();
    await page.getByRole('button', { name: 'Play again', exact: true }).click();
    await goToTree();
    await page.keyboard.press(interaction);
    await expect(page.getByLabel('1 apples in your basket', { exact: true })).toBeVisible();
  });
}

test('keyboard ownership respects focused controls and counting before arrow takeover', async ({ page }) => {
  await pick(page, 1);
  const repeat = page.getByRole('button', { name: 'Hear the instructions again', exact: true });
  await repeat.click();
  await expect(repeat).toBeFocused();
  await page.keyboard.press('x');
  await page.keyboard.press('Space');
  await page.keyboard.press('e');
  await expect(repeat).toBeFocused();
  await expect(page.getByLabel('1 apples in your basket', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.garden-viewport')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('2 apples in your basket', { exact: true })).toBeVisible();
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await giveThree(page);
  const wrongAnswer = page.getByRole('button', { name: 'Answer 4', exact: true });
  await wrongAnswer.click();
  const player = page.getByTestId('garden-player');
  const x = await player.getAttribute('data-x');
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.keyboard.up('ArrowRight');
  await expect(wrongAnswer).toBeFocused();
  await expect(player).toHaveAttribute('data-x', x!);
});

async function arriveForHandoff(page: Page) {
  await pick(page, 3);
  await page.getByRole('button', { name: 'Bring apples to Bear', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Give an apple to Bear', exact: true })).toBeEnabled({ timeout: 8000 });
}

test('handoff visibly offers receives and places each apple before counting', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1200, height: 900 });
  await arriveForHandoff(page);
  await expect(page.locator('.garden-carried img')).toHaveCount(3);
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(2);
  await expect(page.locator('.garden-counting')).not.toBeVisible();
  await page.getByRole('button', { name: 'Give an apple to Bear', exact: true }).click();
  for (const stage of ['offering', 'receiving', 'placing']) {
    await expect(page.locator('.garden-scene')).toHaveAttribute('data-handoff', stage);
    await expect(page.locator('.garden-handoff-apple')).toBeVisible();
    await expect(page.locator('.garden-bear-apples img')).toHaveCount(2);
    await expect(page.locator('.garden-counting')).not.toBeVisible();
    if (stage === 'receiving') await expect(page.locator('.garden-bear-hand')).not.toHaveCSS('transform', 'none');
    await page.screenshot({ path: testInfo.outputPath(`handoff-${stage}.png`) });
  }
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(3);
  await expect(page.getByLabel('2 apples in your basket', { exact: true })).toBeVisible();
  await expect(page.locator('.garden-counting')).not.toBeVisible();
  for (const count of [4, 5]) {
    await page.getByRole('button', { name: 'Give an apple to Bear', exact: true }).click();
    await expect(page.locator('.garden-bear-apples img')).toHaveCount(count);
  }
  await expect(page.getByRole('heading', { name: 'How many altogether?' })).toBeVisible();
});

test('handoff repeated input and interruption preserve the current and placed apples', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await arriveForHandoff(page);
  const give = page.getByRole('button', { name: 'Give an apple to Bear', exact: true });
  await give.click();
  await expect(give).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Walk to Bear and bring the apples', exact: true })).toBeDisabled();
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(3);
  await expect(page.getByLabel('2 apples in your basket', { exact: true })).toBeVisible();
  for (const interruption of ['arrow', 'blur', 'hidden', 'ground']) {
    await give.click();
    await expect(page.locator('.garden-handoff-apple')).toBeVisible();
    if (interruption === 'arrow') await page.keyboard.press('ArrowLeft');
    if (interruption === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    if (interruption === 'hidden') await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      Reflect.deleteProperty(document, 'hidden');
    });
    if (interruption === 'ground') await page.locator('.garden-viewport').click({ position: { x: 20, y: 400 } });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('.garden-handoff-apple')).toBeHidden();
    await expect(page.getByLabel('2 apples in your basket', { exact: true })).toBeVisible();
    await expect(page.locator('.garden-bear-apples img')).toHaveCount(3);
    await expect(give).toBeEnabled();
  }
  await page.getByRole('button', { name: 'Give an apple to Bear', exact: true }).click();
  await expect(page.locator('.garden-handoff-apple')).toBeVisible({ timeout: 8000 });
  await page.getByRole('link', { name: 'Back to math games', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What shall we play?' })).toBeVisible();
  await page.getByRole('link', { name: /Apple garden/ }).click();
  await expect(page.getByLabel('0 apples in your basket', { exact: true })).toBeVisible();
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(2);
});

test('handoff portrait frames both actors and follows the child walking away', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await arriveForHandoff(page);
  await page.getByRole('button', { name: 'Give an apple to Bear', exact: true }).click();
  await expect(page.locator('.garden-scene')).toHaveAttribute('data-handoff', 'receiving');
  const view = (await page.locator('.garden-viewport').boundingBox())!;
  for (const selector of ['.garden-player', '.garden-bear']) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(view.x);
    expect(box.x + box.width).toBeLessThanOrEqual(view.x + view.width);
  }
  await page.screenshot({ path: testInfo.outputPath('handoff-portrait.png') });
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(3);
  await walkByKey(page, 'ArrowLeft', 'x', 300, 'less');
  const explorer = (await page.locator('.garden-player').boundingBox())!;
  expect(explorer.x).toBeGreaterThanOrEqual(view.x);
  const player = page.getByTestId('garden-player');
  await expect(player).toHaveCSS('z-index', String(Math.round(Number(await player.getAttribute('data-y')))));
  await page.getByRole('button', { name: 'Give an apple to Bear', exact: true }).click();
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(4, { timeout: 8000 });
});


for (const motion of ['reduce', 'no-preference'] as const) {
 test(`handoff frame scheduling rejects duplicate input and late completion after leaving (${motion})`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: motion });
  await arriveForHandoff(page);
  await page.evaluate(() => {
    let id = 0, time = performance.now();
    const pending = new Map<number, FrameRequestCallback>();
    const canceled: FrameRequestCallback[] = [];
    const clock = { pending, lastPlacement: null as null | { distance: number; arm: number },
      tick(delta = 16) {
        time += delta; const batch = [...pending.values()]; pending.clear(); for (const cb of batch) cb(time);
        if (document.querySelector('.garden-scene')?.getAttribute('data-handoff') === 'placing') {
          const fruit = document.querySelector('.garden-handoff-apple')!.getBoundingClientRect();
          const count = document.querySelectorAll('.garden-bear-apples img').length;
          const slot = document.querySelector(`[data-table-slot="${count}"]`)!.getBoundingClientRect();
          this.lastPlacement = { distance: Math.hypot(fruit.x + fruit.width/2 - slot.x - slot.width/2, fruit.y + fruit.height/2 - slot.y - slot.height/2), arm: Math.atan2(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.garden-give-arm')!).transform).b, new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.garden-give-arm')!).transform).a) * 180 / Math.PI };
        }
      },
      flush() { for (let i = 0; i < 200 && pending.size; i++) this.tick(); },
      stale() { for (const cb of canceled) cb(time + 5000); },
    };
    Object.assign(window, { handoffClock: clock });
    window.requestAnimationFrame = cb => { pending.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { const cb = pending.get(key); if (cb) canceled.push(cb); pending.delete(key); };
  });
  const step = (method: 'tick' | 'flush' | 'stale', delta?: number) => page.evaluate(({method, delta}) => {
    const c = (window as unknown as {handoffClock: {tick(delta?: number): void; flush(): void; stale(): void}}).handoffClock;
    if (method === 'tick') c.tick(delta); else c[method]();
  }, {method, delta});
  await page.getByRole('button', { name: 'Give an apple to Bear', exact: true }).click();
  await page.keyboard.press('Space');
  await step('tick', 5000);
  await expect(page.locator('.garden-handoff-apple')).toBeVisible();
  const held = await page.locator('.garden-handoff-apple').boundingBox();
  const hand = await page.locator('.garden-offer-anchor').boundingBox();
  if (motion === 'reduce') {
  expect(Math.abs(held!.x + held!.width / 2 - hand!.x - hand!.width / 2)).toBeLessThan(2);
  expect(Math.abs(held!.y + held!.height / 2 - hand!.y - hand!.height / 2)).toBeLessThan(2);
  await step('tick');
  expect(await page.locator('.garden-handoff-apple').boundingBox()).toEqual(held);
  }
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(2);
  await expect(page.locator('.garden-scene')).toHaveAttribute('data-phase', 'sharing');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.garden-handoff-apple')).toBeVisible();
  await step('flush');
  const placed = await page.evaluate(() => (window as unknown as {handoffClock: {lastPlacement: {distance: number; arm: number}}}).handoffClock.lastPlacement);
  expect(placed.distance).toBeLessThan(2);
  expect(Math.abs(placed.arm)).toBeLessThan(.01);
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Give an apple to Bear', exact: true })).toBeEnabled();
  await expect(page.locator('.garden-counting')).not.toBeVisible();
  await page.getByRole('button', { name: 'Give an apple to Bear', exact: true }).click();
  await page.getByRole('link', { name: 'Back to math games', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What shall we play?' })).toBeVisible();
  const pending = await page.evaluate(() => (window as unknown as {handoffClock: {pending: Map<number, unknown>}}).handoffClock.pending.size);
  expect(pending).toBe(0);
  await step('stale');
  await page.getByRole('link', { name: /Apple garden/ }).click();
  await expect(page.getByLabel('0 apples in your basket', { exact: true })).toBeVisible();
  await expect(page.locator('.garden-bear-apples img')).toHaveCount(2);
});

}
