import { test, expect } from '@playwright/test';

test('Backspace in resistance input does not delete the resistor', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);

  // Start from a clean slate.
  await page.getByRole('button', { name: 'Clear circuit' }).click();
  await page.waitForTimeout(250);

  // Add a resistor.
  await page.locator('.component-button').filter({ hasText: 'Resistor' }).click();
  await page.waitForTimeout(750);

  const resistanceInput = page.locator('#prop-resistance-value');
  await expect(resistanceInput).toBeVisible();

  // Focus the input and hit Backspace. This should edit text, not trigger component deletion.
  await resistanceInput.click();
  await resistanceInput.press('End');
  await resistanceInput.press('Backspace');

  // If deletion fired, the inspector would disappear (no selected component).
  await expect(resistanceInput).toBeVisible();
});
