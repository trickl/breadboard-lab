import { test, expect } from '@playwright/test';

test('Adding a component does not create a duplicate (ghost) node', async ({ page }) => {
  await page.goto('/');

  // Ensure debug overlays are ON so the component title is visible.
  const debugToggle = page.getByTitle('Toggle debug overlays (Ctrl+Shift+D)');
  await expect(debugToggle).toBeVisible();

  const toggleText = (await debugToggle.textContent())?.trim();
  if (toggleText === 'Off') {
    await debugToggle.click();
    await expect(debugToggle).toHaveText('On');
  }

  // Add a resistor via the sidebar.
  await page.locator('.toolbar .component-button', { hasText: 'Resistor' }).click();

  const resistorTitles = page.locator('[data-testid="node"] [data-testid="title"]', {
    hasText: 'Resistor',
  });

  // There should be exactly one Resistor node title in the DOM.
  await expect(resistorTitles).toHaveCount(1);

  // Toggling debug overlays should not introduce/retain a duplicate node.
  await debugToggle.click();
  await expect(debugToggle).toHaveText('Off');

  await debugToggle.click();
  await expect(debugToggle).toHaveText('On');

  await expect(resistorTitles).toHaveCount(1);
});
