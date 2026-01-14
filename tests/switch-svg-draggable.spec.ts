import { test, expect } from '@playwright/test';

test('Switch node can be dragged in the Rete layer', async ({ page }) => {
  await page.goto('/');

  // Ensure debug overlays are ON so node titles exist (stable locator).
  const debugToggle = page.getByTitle('Toggle debug overlays (Ctrl+Shift+D)');
  await expect(debugToggle).toBeVisible();
  const toggleText = (await debugToggle.textContent())?.trim();
  if (toggleText === 'Off') {
    await debugToggle.click();
    await expect(debugToggle).toHaveText('On');
  }

  // Add a switch via the toolbar.
  await page.locator('.toolbar .component-button', { hasText: 'Switch' }).click();

  const switchNodes = page.locator('[data-testid="node"]', {
    has: page.locator('[data-testid="title"]', { hasText: 'Switch' }),
  });
  await expect(switchNodes).toHaveCount(1);

  const node = switchNodes.first();
  const hotspot = node.locator('[data-testid="drag-hotspot"]').first();
  await expect(hotspot, 'expected a drag hotspot inside the node').toBeVisible();

  const beforeDrag = await node.boundingBox();
  expect(beforeDrag, 'expected switch node to have a bounding box').toBeTruthy();

  const start = {
    x: beforeDrag!.x + beforeDrag!.width / 2,
    y: beforeDrag!.y + beforeDrag!.height / 2,
  };

  // Drag from the node center (via the hotspot) to avoid accidentally starting a connection.
  await hotspot.hover();
  await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y + 60);
  await page.mouse.up();

  const afterDrag = await node.boundingBox();
  expect(afterDrag, 'expected switch node to have a bounding box after drag').toBeTruthy();

  const movedPx = Math.hypot(afterDrag!.x - beforeDrag!.x, afterDrag!.y - beforeDrag!.y);
  expect(movedPx).toBeGreaterThan(5);
});
