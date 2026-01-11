# Visual Regression Tests

This directory contains visual regression tests for Breadboard Lab using Playwright screenshot comparison.

## What Are Visual Regression Tests?

Visual regression tests capture screenshots of the application and compare them against baseline images to detect unintended visual changes. This protects critical educational features like:

- **Voltage overlay colors** - Colored holes showing voltage distribution
- **Current animation** - Animated particles showing current flow
- **Error icons** - Visual indicators for circuit errors (shorts, floating nodes)
- **Component rendering** - Correct display of resistors, LEDs, power supplies
- **Breadboard layout** - Proper hole positioning and grid structure

## Running Tests

### Run all visual tests

```bash
npm run test:visual
```

### Run tests with UI (interactive mode)

```bash
npm run test:visual:ui
```

### Run tests in headed mode (see the browser)

```bash
npx playwright test --headed
```

### Run a specific test file

```bash
npx playwright test tests/visual/examples.spec.ts
```

## Updating Baselines

When you make **intentional** visual changes (e.g., improving colors, adjusting layout), you need to update the baseline screenshots:

```bash
npm run test:visual:update
```

**⚠️ Warning:** Only update baselines after carefully reviewing the visual changes. Make sure the changes are intentional and correct.

### Process for Updating Baselines

1. Make your code changes
2. Run tests to see what changed: `npm run test:visual`
3. Review the diff images in the test results
4. If changes are correct, update baselines: `npm run test:visual:update`
5. Commit the new baseline screenshots with your code changes

## Test Structure

### Test Files

- `examples.spec.ts` - Visual regression tests for all 4 canonical example circuits
- `helpers.ts` - Helper functions for loading examples and waiting for readiness

### Baseline Screenshots

Baseline screenshots are stored in:

```
tests/visual/examples.spec.ts-snapshots/
```

These files are committed to git and used for comparison in CI.

## CI Integration

Visual regression tests run automatically on every pull request via GitHub Actions. If a test fails:

1. The PR check will fail
2. Diff images are uploaded as artifacts
3. You can download the artifacts to see what changed

## Configuration

Visual test configuration is in `playwright.config.ts`:

- **Browser**: Chromium only (for consistency)
- **Threshold**: 0.2 (20% color difference tolerance)
- **Max Diff Pixels**: 100 pixels can differ before failing
- **Viewport**: Desktop Chrome (default 1280x720)

## Troubleshooting

### Tests fail locally but pass in CI (or vice versa)

This can happen due to font rendering or anti-aliasing differences. Solutions:

- Run tests in Docker container matching CI environment
- Adjust `maxDiffPixels` or `threshold` in test configuration
- Ensure you're using the same Playwright version as CI

### Tests are flaky (sometimes pass, sometimes fail)

This usually means animations haven't stabilized. Solutions:

- Increase wait times in `helpers.ts`
- Wait for specific animation frames
- Disable animations during tests (if appropriate)

### Need to test a visual change without updating all baselines

You can update baselines for specific tests:

```bash
npx playwright test examples.spec.ts:12 --update-snapshots
```

(Where `:12` is the line number of the test)

## Best Practices

1. **Review diffs carefully** - Don't blindly update baselines
2. **Keep baselines small** - Screenshot only the necessary area
3. **Test specific features** - Have dedicated tests for voltage, current, errors
4. **Stable timing** - Ensure animations are stabilized before screenshot
5. **Document changes** - Commit message should explain why baselines changed

## Example Test

```typescript
test('LED and Resistor example renders correctly', async ({ page }) => {
  // Load the example circuit
  await loadExample(page, 'led-resistor');

  // Get the breadboard container
  const breadboard = getBreadboardContainer(page);

  // Compare against baseline
  await expect(breadboard).toHaveScreenshot('led-resistor.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  });
});
```

## Additional Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Playwright Test Documentation](https://playwright.dev/docs/intro)
- Project planning: `planning/vision/goal.md` (lines 443-463)
