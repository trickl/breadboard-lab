import { test, expect } from '@playwright/test';

test('Changing resistance unit keeps numeric value text', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);

  // Start from a clean slate.
  await page.getByRole('button', { name: 'Clear circuit' }).click();
  await page.waitForTimeout(250);

  // Add a resistor.
  await page.locator('.component-button').filter({ hasText: 'Resistor' }).click();
  await page.waitForTimeout(750);

  const resistanceInput = page.locator('#prop-resistance-value');
  const unitSelect = page.locator('#prop-resistance-unit');

  await expect(resistanceInput).toBeVisible();
  await expect(unitSelect).toBeVisible();

  // Set a known numeric value.
  await resistanceInput.click();
  await resistanceInput.fill('30');
  await page.waitForTimeout(150);

  // Change unit to kΩ. Numeric text should remain "30" (scale change), not become "0.03".
  await unitSelect.selectOption('kohm');
  await page.waitForTimeout(250);

  await expect(resistanceInput).toHaveValue('30');
});
