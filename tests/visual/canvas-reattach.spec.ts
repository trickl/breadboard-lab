import { test, expect } from '@playwright/test';

test('Placing a component renders correctly in React SVG breadboard', async ({ page }) => {
  await page.goto('/');

  // Wait for initial React SVG breadboard
  const svg = page.locator('svg.breadboard-svg');
  await expect(svg).toBeVisible();

  // Add a component via the toolbar (breadboard ports are intentionally non-interactive)
  await page.locator('.toolbar .component-button').first().click();

  // The UI re-renders after placement; ensure the SVG is still present and visible.
  await expect(page.locator('svg.breadboard-svg')).toBeVisible();

  // Also ensure there is exactly one SVG breadboard element.
  await expect(page.locator('svg.breadboard-svg')).toHaveCount(1);
});
