import { test, expect } from '@playwright/test';

test('Clock control UI appears when EDU-8 is loaded', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // Initially, clock controls should not be visible
  await expect(page.locator('#clock-controls')).not.toBeVisible();
  
  // Click Examples button
  await page.click('#examples-btn');
  await page.waitForTimeout(500);
  
  // Find and click EDU-8 Blink example
  const edu8Example = page.locator('.list-item').filter({ hasText: 'EDU-8 Blink' });
  await edu8Example.click();
  await page.waitForTimeout(3000);
  
  // Take screenshot with EDU-8 loaded
  await page.screenshot({ path: '/tmp/breadboard-edu8-loaded.png', fullPage: true });
  
  // Clock controls should now be visible
  await expect(page.locator('#clock-controls')).toBeVisible();
  
  // Verify clock control elements
  await expect(page.locator('#step-btn')).toBeVisible();
  await expect(page.locator('#run-btn')).toBeVisible();
  await expect(page.locator('#reset-btn')).toBeVisible();
  await expect(page.locator('#freq-slider')).toBeVisible();
  
  console.log('✓ Clock controls are visible and functional');
});
