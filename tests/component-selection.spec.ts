import { test, expect } from '@playwright/test';

test('Component can be re-selected by clicking drag hotspot', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);

  // Start from a clean slate.
  await page.getByRole('button', { name: 'Clear circuit' }).click();
  await page.waitForTimeout(250);

  // Add a single LED.
  await page.locator('.component-button').filter({ hasText: 'LED' }).click();
  await page.waitForTimeout(750);

  // Adding selects it; the inspector should show LED properties.
  await expect(page.locator('#prop-led-color')).toBeVisible();

  // Deselect by clicking empty space.
  // (The breadboard background has pointer-events disabled, so clicks land on the area.)
  await page.locator('.breadboard-container').click({ position: { x: 40, y: 40 } });
  await page.waitForTimeout(250);
  await expect(page.locator('#prop-led-color')).not.toBeVisible();

  // Re-select by clicking inside the drag-hotspot rectangle.
  const hitTest = await page.locator('[data-testid="drag-hotspot"]').first().evaluate((el) => {
    const r = (el as HTMLElement).getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y) as HTMLElement | null;
    return {
      hotspotComponentId: (el as HTMLElement).dataset.componentId ?? null,
      topTag: top?.tagName ?? null,
      topTestId: top?.getAttribute('data-testid') ?? null,
      topComponentId: top?.getAttribute('data-component-id') ?? null,
    };
  });
  expect(hitTest.topTestId).toBe('drag-hotspot');
  expect(hitTest.hotspotComponentId).not.toBeNull();

  await page.locator('[data-testid="drag-hotspot"]').first().click();
  await page.waitForTimeout(250);

  await expect(page.locator('#prop-led-color')).toBeVisible();
});
