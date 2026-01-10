import { test, expect } from '@playwright/test';

test.describe('rail-to-rail wiring', () => {
  const idx = 7;
  const sourceRailId = 'rail-right-positive';
  const targets = [
    { railId: 'rail-left-positive', label: 'Rail L+' },
    { railId: 'rail-left-negative', label: 'Rail L−' },
    { railId: 'rail-right-negative', label: 'Rail R−' },
  ];

  test.beforeEach(async ({ page }) => {
    // Ensure a clean start so we don't inherit any persisted circuit.
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  });

  for (const t of targets) {
    test(`click-to-connect: Rail R+ → ${t.label} at same hole index`, async ({ page }) => {
      const src = page.locator(`[data-rail-id="${sourceRailId}"][data-hole-index="${idx}"]`).first();
      const dst = page.locator(`[data-rail-id="${t.railId}"][data-hole-index="${idx}"]`).first();

      await expect(src).toBeVisible();
      await expect(dst).toBeVisible();

      // Click-to-connect flow: first click picks, second click creates.
      await src.click({ force: true });
      await dst.click({ force: true });

      // Ensure it "sticks" (not just a transient render).
      await expect(page.locator('[data-testid="connection"]')).toHaveCount(1);
      await page.waitForTimeout(250);
      await expect(page.locator('[data-testid="connection"]')).toHaveCount(1);
    });

    test(`drag-to-connect: Rail R+ → ${t.label} at same hole index`, async ({ page }) => {
      const src = page.locator(`[data-rail-id="${sourceRailId}"][data-hole-index="${idx}"]`).first();
      const dst = page.locator(`[data-rail-id="${t.railId}"][data-hole-index="${idx}"]`).first();

      await expect(src).toBeVisible();
      await expect(dst).toBeVisible();

      await src.dragTo(dst, { force: true });

      await expect(page.locator('[data-testid="connection"]')).toHaveCount(1);
      await page.waitForTimeout(250);
      await expect(page.locator('[data-testid="connection"]')).toHaveCount(1);
    });
  }
});
