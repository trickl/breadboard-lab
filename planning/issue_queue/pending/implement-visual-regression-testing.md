Implement visual regression testing with Playwright screenshot comparison

## Context

Breadboard Lab has successfully implemented core visualization features including voltage heatmap overlays, animated current flow, error detection with visual icons, and an educational explain panel. These visual features are the primary educational differentiator of the tool, as stated in the mission: *"A web-first breadboard UI that is not merely a drawing tool: it maintains a first-class electrical net model and can visualise real computed circuit behaviour directly on the breadboard."*

However, there is currently **no automated testing** to protect these visual features from accidental breakage. All 109 existing tests are unit and integration tests that validate logic and data structures, but none verify that the visual output renders correctly.

Without visual regression testing, any code change risks breaking:
- Voltage color overlays on breadboard holes
- Current animation particles on wires and components
- Error icon positioning and styling
- Component rendering (resistors, LEDs, power supplies)
- Breadboard grid layout and hole positioning
- Explain panel presentation

## Gap Analysis

**Long-term goal** (`planning/vision/goal.md`, lines 443-463):
> "Visual Regression Testing (required)"
> - Run the application in a headless browser in CI
> - Capture screenshots of breadboard view, overlays, schematic view
> - Compare screenshots against baselines to detect layout shifts, rendering errors, overlay regressions
> - Visual regression tests run as a **required part of CI**

**Current state** (`planning/state/system_capabilities.md`, lines 1154-1166):
- ❌ No visual regression testing
- ❌ No screenshot comparison in CI
- ❌ No visual change detection
- 109 unit/integration tests exist but don't validate visual rendering
- Tests documented as "Coverage Gaps: No UI/end-to-end tests"

**Gap**: The planning document explicitly requires visual regression testing as part of the testing strategy, but it is completely absent from the current implementation.

## Proposed Development Task

**Implement visual regression testing with Playwright screenshot comparison**

### Scope

Create an automated visual regression testing system that:
1. Runs Breadboard Lab in a headless browser (Playwright)
2. Loads canonical example circuits programmatically
3. Captures screenshots of breadboard states with overlays
4. Compares screenshots against baseline images
5. Fails CI on visual regressions
6. Integrates into existing CI pipeline (GitHub Actions)

### Technical Approach

**Phase 1: Playwright Setup**
- Add Playwright as dev dependency (`@playwright/test`)
- Configure Playwright for headless Chromium
- Create test harness that launches dev server
- Write helper to programmatically load circuits from example JSON

**Phase 2: Screenshot Capture Infrastructure**
- Create screenshot test suite (`tests/visual/`)
- Implement per-example test cases:
  - Load example circuit
  - Wait for simulation to complete
  - Wait for overlays to render (voltage, current animation)
  - Capture breadboard viewport screenshot
- Configure screenshot comparison settings:
  - Pixel difference threshold
  - Max diff percentage
  - Screenshot dimensions

**Phase 3: Baseline Management**
- Generate initial baseline screenshots for all 4 example circuits:
  - `led-resistor-baseline.png`
  - `voltage-divider-baseline.png`
  - `parallel-leds-baseline.png`
  - `short-circuit-demo-baseline.png`
- Store baselines in `tests/visual/baselines/`
- Document baseline update process for intentional visual changes

**Phase 4: CI Integration**
- Add Playwright test job to GitHub Actions workflow
- Install Playwright browsers in CI
- Run visual regression tests on every PR
- Upload diff images as artifacts when tests fail
- Configure required checks to block merge on visual regression

**Phase 5: Test Coverage**
- Screenshot tests for each canonical example circuit
- Separate test for each visual feature:
  - Voltage overlay colors (check gradient rendering)
  - Current animation presence (capture at animation mid-frame)
  - Error icon rendering (short-circuit-demo example)
  - Component visual rendering (all component types)
- Test both "clean circuit" and "error state" scenarios

### Success Criteria

- [ ] Playwright installed and configured for visual testing
- [ ] Screenshot tests run in headless browser
- [ ] Baseline screenshots exist for all 4 example circuits
- [ ] Tests compare current screenshots against baselines
- [ ] Visual differences fail the test with clear diff output
- [ ] CI pipeline runs visual tests automatically on PR
- [ ] Failed tests upload diff images as artifacts
- [ ] Documentation explains how to update baselines
- [ ] At least 4 visual regression tests (one per example circuit)
- [ ] Tests verify voltage overlay, current animation, and error icons are present

### Educational and Development Impact

**Protects educational features:**
The core value proposition of Breadboard Lab is visual feedback on circuit behavior. Visual regression testing ensures these features don't break:
- Students see voltage distribution across nets (color overlays)
- Students see current flow direction and magnitude (animation)
- Students see circuit errors highlighted (error icons)
- Visual consistency maintained across code changes

**Enables confident refactoring:**
With visual regression tests in place, developers can:
- Refactor rendering code safely
- Upgrade dependencies without fear
- Optimize performance while preserving appearance
- Implement new features without breaking existing visuals

**CI/CD best practice:**
Visual regression testing is industry standard for UI-heavy applications. This brings Breadboard Lab's testing strategy in line with professional frontend development practices.

### Alignment with Vision

This task directly implements a **required** capability from the planning document:

- `goal.md` lines 443-463: "Visual Regression Testing (required)"
  - Acceptance criterion: "Screenshot delta comparison is executed in CI"
  - Acceptance criterion: "An unintended visual change fails CI"

The task is listed in the Testing Strategy section (goal.md, lines 437-475) as a mandatory requirement, not an optional enhancement.

### Priority Justification

This is the most important next task because:

1. **Protects significant investment**: Voltage visualization, current animation, and error detection represent weeks of development work that currently has no visual validation

2. **Foundational infrastructure**: Visual testing enables faster, safer development of all future visual features (resistor color bands, LED glow, schematic view, etc.)

3. **Explicitly required**: The planning document states visual regression tests are "required" and must run "as a required part of CI"

4. **Prevents regression**: Without visual tests, any refactoring or new feature risks breaking existing educational visualizations

5. **Developer productivity**: Visual tests catch bugs immediately rather than requiring manual inspection of every example circuit

6. **User trust**: Automated visual validation ensures students can rely on the tool's visual feedback being accurate

7. **Prerequisite for major changes**: Before implementing WebGL rendering, schematic view, or other major visual changes, we need baseline protection

### Non-Goals

This task specifically does **NOT** include:
- Cross-browser testing (start with Chromium only)
- Mobile/responsive screenshot testing (desktop viewport only)
- Interaction testing (click, drag, etc.) - focus on visual output
- Performance benchmarking
- Accessibility testing (separate concern)
- Testing features that don't exist yet (schematic view, color-coded resistors)

These can be added incrementally after the foundation is established.

## Implementation Plan

### Step 1: Install and Configure Playwright
```bash
npm install -D @playwright/test
npx playwright install chromium
```

Create `playwright.config.ts`:
```typescript
export default {
  testDir: './tests/visual',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
};
```

### Step 2: Create Visual Test Infrastructure

Create `tests/visual/helpers.ts`:
```typescript
export async function loadExample(page, exampleId: string) {
  await page.goto('/');
  await page.click('button:text("Examples")');
  await page.click(`[data-example-id="${exampleId}"]`);
  await page.waitForSelector('.voltage-overlay', { timeout: 5000 });
  await page.waitForTimeout(500); // Wait for animation to stabilize
}
```

### Step 3: Write Screenshot Tests

Create `tests/visual/examples.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import { loadExample } from './helpers';

test('LED and Resistor example renders correctly', async ({ page }) => {
  await loadExample(page, 'led-resistor');
  await expect(page.locator('.breadboard-container')).toHaveScreenshot('led-resistor.png', {
    maxDiffPixels: 100,
  });
});

test('Voltage Divider example renders correctly', async ({ page }) => {
  await loadExample(page, 'voltage-divider');
  await expect(page.locator('.breadboard-container')).toHaveScreenshot('voltage-divider.png', {
    maxDiffPixels: 100,
  });
});

// Similar tests for parallel-leds and short-circuit-demo
```

### Step 4: Generate Baselines

```bash
npm run test:visual -- --update-snapshots
```

This creates initial baseline screenshots in `tests/visual/examples.spec.ts-snapshots/`.

### Step 5: Integrate into CI

Add to `.github/workflows/ci.yml`:
```yaml
visual-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:visual
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: visual-test-failures
        path: tests/visual/examples.spec.ts-snapshots/*-diff.png
```

Add script to `package.json`:
```json
{
  "scripts": {
    "test:visual": "playwright test"
  }
}
```

### Step 6: Documentation

Create `tests/visual/README.md`:
```markdown
# Visual Regression Tests

## Running Tests
npm run test:visual

## Updating Baselines (for intentional visual changes)
npm run test:visual -- --update-snapshots

## Reviewing Failures
When tests fail, diff images are generated in tests/visual/examples.spec.ts-snapshots/
Compare: actual, expected, and diff images
```

## Estimated Effort

2-3 days of focused development:
- **Day 1**: Playwright setup, dev server integration, helper utilities for loading examples
- **Day 2**: Write screenshot tests for all 4 examples, generate baselines, tune thresholds
- **Day 3**: CI integration, documentation, test on PR workflow, iterate on stability

## Dependencies

All required infrastructure already exists:
- ✅ Canonical example circuits (4 examples with known visual states)
- ✅ Example loading UI (can be automated)
- ✅ Voltage overlay rendering (visual target #1)
- ✅ Current animation rendering (visual target #2)
- ✅ Error icon rendering (visual target #3)
- ✅ Development server (Vite on port 5173)
- ✅ CI pipeline (GitHub Actions)

## Risks and Mitigations

**Risk**: Screenshots differ between CI and local due to font rendering or anti-aliasing
- *Mitigation*: Use Chromium consistently; configure pixel difference threshold; use Docker container for reproducibility if needed

**Risk**: Current animation timing makes screenshots non-deterministic
- *Mitigation*: Wait for specific animation frame or disable animation during screenshot; capture multiple frames and use median

**Risk**: Baseline images become stale as features improve
- *Mitigation*: Document baseline update process; review visual changes in PR before updating; version control baselines

**Risk**: Tests flake due to timing issues
- *Mitigation*: Use Playwright's built-in wait mechanisms; wait for specific elements/conditions; increase timeouts for CI environment

**Risk**: Large baseline images bloat repository
- *Mitigation*: Use PNG compression; consider storing baselines in Git LFS if needed; screenshots are small (<100KB each)

## References

- `planning/vision/goal.md` - Lines 443-463: "Visual Regression Testing (required)"
- `planning/state/system_capabilities.md` - Lines 1154-1166: "Coverage Gaps: No UI/end-to-end tests"
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- Existing examples: `src/examples/` (4 canonical circuits to test)

## Success Metrics

After implementation:
1. ✅ `npm run test:visual` runs Playwright screenshot tests
2. ✅ CI automatically runs visual tests on every PR
3. ✅ Visual changes are detected and fail CI with diff images
4. ✅ Developers can update baselines with documented command
5. ✅ 4 baseline screenshots exist (one per example circuit)
6. ✅ Tests validate voltage overlay, current animation, and error icons render
7. ✅ Failed tests produce clear diff artifacts for debugging

This task establishes the foundation for visual quality assurance, protecting all educational visualization features implemented so far and enabling confident development of future visual enhancements.
