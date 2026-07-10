import { expect, test, type Locator, type Page } from '@playwright/test';

interface Viewport {
  width: number;
  height: number;
}

const HOME_VIEWPORTS: Viewport[] = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 940, height: 480 },
  { width: 941, height: 480 },
  { width: 1024, height: 600 },
];

const CAFE_VIEWPORTS: Viewport[] = [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 703, height: 375 },
  { width: 704, height: 375 },
  { width: 844, height: 390 },
];

test('Home keeps all four primary choices inside accepted viewports', async ({ page }) => {
  for (const viewport of HOME_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto('/#home');
    const cards = page.locator('.home-card');
    await expect(cards).toHaveCount(4);
    await page.waitForTimeout(550);

    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(documentHeight, viewportLabel(viewport)).toBeLessThanOrEqual(viewport.height);
    for (let index = 0; index < 4; index += 1) {
      await expectWithinViewport(cards.nth(index), page, viewportLabel(viewport));
    }
  }
});

test('Cafe keeps active-order choices and Check visible across landscape boundaries', async ({
  page,
}) => {
  for (const viewport of CAFE_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openCafeOrder(page);

    const foods = page.locator('.bear-cafe-food');
    await expect(foods).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expectWithinViewport(foods.nth(index), page, viewportLabel(viewport));
      await expectMinimumSize(foods.nth(index), 80, 80, viewportLabel(viewport));
    }

    const check = page.locator('.bear-cafe-check');
    await expectWithinViewport(check, page, viewportLabel(viewport));
    await expectMinimumSize(check, 96, 56, viewportLabel(viewport));
  }
});

test('Cafe wrong feedback leaves required choices visible', async ({ page }) => {
  const viewport = { width: 667, height: 375 };
  await page.setViewportSize(viewport);
  await openCafeOrder(page);

  await page.getByRole('button', { name: /^Choose berry/ }).click();
  await page.getByRole('button', { name: 'Check order' }).click();
  await expect(page.getByText("Let's check the order.")).toBeVisible();

  const foods = page.locator('.bear-cafe-food');
  for (let index = 0; index < 4; index += 1) {
    await expectWithinViewport(foods.nth(index), page, '667x375 wrong feedback');
  }
});

test('Cafe delivery and completion commands remain reachable at 568x320', async ({ page }) => {
  const viewport = { width: 568, height: 320 };
  await page.setViewportSize(viewport);
  await openCafeOrder(page);

  await page.getByRole('button', { name: /^Choose banana/ }).click();
  await page.getByRole('button', { name: 'Check order' }).click();

  const deliver = page.getByRole('button', { name: 'Deliver order' });
  await expect(deliver).toBeVisible({ timeout: 3_000 });
  await expectWithinViewport(deliver, page, '568x320 delivery');
  await expectMinimumSize(deliver, 96, 56, '568x320 delivery');
  await deliver.click();

  const nextOrder = page.getByRole('button', { name: 'Next order' });
  await expect(nextOrder).toBeVisible({ timeout: 3_000 });
  await expectWithinViewport(nextOrder, page, '568x320 completion');
});

test('Word Builder and Coloring retain 80px play objects at 568x320', async ({ page }) => {
  const viewport = { width: 568, height: 320 };
  await page.setViewportSize(viewport);

  await page.goto('/#activity/build-cat');
  const tiles = page.locator('.word-builder__tile');
  await expect(tiles).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expectMinimumSize(tiles.nth(index), 80, 80, '568x320 Word Builder');
    await expectWithinViewport(tiles.nth(index), page, '568x320 Word Builder');
  }

  await page.goto('/#activity/art-color-circle');
  const swatches = page.locator('.coloring-swatch');
  await expect(swatches).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expectMinimumSize(swatches.nth(index), 80, 80, '568x320 Coloring');
    await expectWithinViewport(swatches.nth(index), page, '568x320 Coloring');
  }
});

async function openCafeOrder(page: Page): Promise<void> {
  await page.goto('/#home');
  await page.goto('/#activity/kennedis-orders-banana-001');
  const caller = page.getByRole('button', { name: /is calling$/ });
  await expect(caller).toBeVisible();
  await caller.click();
  await expect(page.locator('.bear-cafe-workbench')).toBeVisible();
}

async function expectWithinViewport(
  locator: Locator,
  page: Page,
  label: string
): Promise<void> {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, label).not.toBeNull();
  expect(viewport, label).not.toBeNull();
  if (!box || !viewport) return;

  expect(box.x, label).toBeGreaterThanOrEqual(0);
  expect(box.y, label).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, label).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height, label).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectMinimumSize(
  locator: Locator,
  minimumWidth: number,
  minimumHeight: number,
  label: string
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, label).not.toBeNull();
  if (!box) return;

  expect(box.width, label).toBeGreaterThanOrEqual(minimumWidth);
  expect(box.height, label).toBeGreaterThanOrEqual(minimumHeight);
}

function viewportLabel(viewport: Viewport): string {
  return `${viewport.width}x${viewport.height}`;
}
