import type { Page } from '@playwright/test';

/**
 * Helper functions for visual regression testing
 */

/**
 * Load an example circuit by ID
 * @param page - Playwright page object
 * @param exampleId - ID of the example circuit to load
 */
export async function loadExample(page: Page, exampleId: string): Promise<void> {
  // Navigate to the application (React UI is now the default)
  await page.goto('/');
  
  // Wait for the React app to load (SVG-based breadboard)
  await page.waitForSelector('.breadboard-container', { timeout: 10000 });
  
  // Wait for SVG breadboard to be visible
  await page.waitForSelector('svg.breadboard-svg', { timeout: 10000 });
  
  // Click the Examples button
  await page.click('#examples-btn');
  
  // Wait for the examples modal to appear
  await page.waitForSelector('#examples-modal.visible', { timeout: 5000 });
  
  // Click the specific example
  const exampleSelector = `#examples-modal .list-item[data-example-id="${exampleId}"]`;
  await page.waitForSelector(exampleSelector, { timeout: 5000 });
  await page.click(exampleSelector);
  
  // Wait for the modal to close
  await page.waitForSelector('#examples-modal', { state: 'detached', timeout: 5000 });

  // Wait for React SVG rendering to complete
  await page.waitForFunction(
    () => {
      const svg = document.querySelector('svg.breadboard-svg');
      if (!svg) return false;
      // Ensure the SVG has a rendered size
      const rect = svg.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    { timeout: 10000 }
  );
  
  // Additional wait to ensure animations have started and stabilized
  await page.waitForTimeout(1500);
}

/**
 * Wait for the breadboard to be ready for screenshot
 * This ensures all dynamic content has loaded and stabilized
 */
export async function waitForBreadboardReady(page: Page): Promise<void> {
  // Wait for the main container
  await page.waitForSelector('.breadboard-container', { timeout: 10000 });

  // Wait for React SVG breadboard
  await page.waitForSelector('svg.breadboard-svg', { timeout: 10000 });
  
  // Give animations time to stabilize
  await page.waitForTimeout(500);
}

/**
 * Get the breadboard container element
 * This is the main element we'll screenshot for visual regression tests
 */
export function getBreadboardContainer(page: Page) {
  return page.locator('.breadboard-container');
}
