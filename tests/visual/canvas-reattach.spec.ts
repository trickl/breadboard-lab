import { test, expect } from '@playwright/test';

// Matches PixiRenderer constants; keep in sync if layout changes.
const HOLE_SPACING = 20 + 3 * 2; // HOLE_SIZE + HOLE_MARGIN*2
const LABEL_PADDING_X = 20;
const LABEL_PADDING_Y = 25;

function holeCenter(col: number, row: number) {
  return {
    x: LABEL_PADDING_X + col * HOLE_SPACING + HOLE_SPACING / 2,
    y: LABEL_PADDING_Y + row * HOLE_SPACING + HOLE_SPACING / 2,
  };
}

test('Placing a component does not blank the Pixi breadboard canvas', async ({ page }) => {
  await page.goto('/');

  // Wait for initial Pixi canvas
  const canvas = page.locator('#breadboard canvas');
  await expect(canvas).toBeVisible();

  // Select any component from the library (first card is fine)
  await page.click('#component-library-btn');
  await page.waitForSelector('#component-library-modal.visible', { timeout: 5000 });
  await page.locator('#component-library-modal .component-card').first().click();
  await page.waitForSelector('#component-library-modal', { state: 'detached', timeout: 5000 });

  // Click two holes to place the selected component
  // Hole (0,0) then (0,5) for a simple, valid span.
  const p1 = holeCenter(0, 0);
  const p2 = holeCenter(5, 0);

  await canvas.click({ position: p1 });
  await canvas.click({ position: p2 });

  // The UI re-renders after placement; ensure the canvas is still present and visible.
  await expect(page.locator('#breadboard canvas')).toBeVisible();

  // Also ensure there is exactly one canvas attached under #breadboard.
  await expect(page.locator('#breadboard canvas')).toHaveCount(1);
});
