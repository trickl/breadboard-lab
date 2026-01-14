import { test, expect } from '@playwright/test';

test('Adding a second component does not move an existing moved component', async ({ page }) => {
  await page.goto('/');

  // Ensure debug overlays are ON so node titles exist (stable locator).
  const debugToggle = page.getByTitle('Toggle debug overlays (Ctrl+Shift+D)');
  await expect(debugToggle).toBeVisible();
  const toggleText = (await debugToggle.textContent())?.trim();
  if (toggleText === 'Off') {
    await debugToggle.click();
    await expect(debugToggle).toHaveText('On');
  }

  // Add first resistor.
  await page.locator('.toolbar .component-button', { hasText: 'Resistor' }).click();

  const resistorNodes = page.locator('[data-testid="node"]', {
    has: page.locator('[data-testid="title"]', { hasText: 'Resistor' }),
  });
  await expect(resistorNodes).toHaveCount(1);

  // Drag the resistor node a bit.
  const node = resistorNodes.first();
  const beforeDrag = await node.boundingBox();
  expect(beforeDrag, 'expected resistor node to have a bounding box').toBeTruthy();

  const start = {
    x: beforeDrag!.x + beforeDrag!.width / 2,
    y: beforeDrag!.y + beforeDrag!.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y + 60);
  await page.mouse.up();

  const afterDrag = await node.boundingBox();
  expect(afterDrag, 'expected resistor node to have a bounding box after drag').toBeTruthy();

  // Add second resistor.
  await page.locator('.toolbar .component-button', { hasText: 'Resistor' }).click();

  await expect(resistorNodes).toHaveCount(2);

  // After adding another component, the first resistor should not jump.
  const rects = await resistorNodes.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })
  );

  const target = { x: afterDrag!.x, y: afterDrag!.y };
  const nearest = rects.reduce(
    (best, r) => {
      const dx = r.x - target.x;
      const dy = r.y - target.y;
      const d2 = dx * dx + dy * dy;
      return !best || d2 < best.d2 ? { r, d2 } : best;
    },
    null as null | { r: { x: number; y: number; width: number; height: number }; d2: number }
  );
  expect(nearest, 'expected to find a nearest resistor node').toBeTruthy();

  // Allow a tiny tolerance for sub-pixel rounding.
  const tol = 1.5;
  expect(Math.abs(nearest!.r.x - afterDrag!.x)).toBeLessThanOrEqual(tol);
  expect(Math.abs(nearest!.r.y - afterDrag!.y)).toBeLessThanOrEqual(tol);
});
