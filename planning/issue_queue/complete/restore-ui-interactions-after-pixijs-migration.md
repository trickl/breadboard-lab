Restore UI Interactions After PixiJS Migration

## Context

PR #167 migrated rendering from SVG to PixiJS Canvas-based WebGL rendering. This was a significant architectural improvement that enables better performance and future visual enhancements. However, the migration introduced critical regressions:

1. **31 tests failing** (12% test failure rate):
   - 16 breadboard-app.test.ts failures (component selection, drag-and-drop, rotation)
   - 9 property-editor.test.ts failures (editor visibility and interaction)
   - 6 visual regression test failures (screenshot baselines need regeneration)

2. **Critical features removed** (noted as "known limitations" in PR #167):
   - Component drag-and-drop initiation removed due to event model incompatibility
   - Voltage tooltips on hover removed (Canvas event mapping needed)

3. **Zero test coverage for new renderer**:
   - PixiJS renderer (768 lines in `pixi-renderer.ts`) has no tests
   - Core rendering logic untested

## Gap Analysis

**Goal state**: All UI interactions working with comprehensive test coverage protecting against regressions.

**Current state**:

- Rendering works visually but lacks interactive features
- Test suite has 12% failure rate
- New renderer code has 0% test coverage
- Critical interaction features removed

**Gap**: UI interaction system is broken and unverified after architectural change.

## Proposed Development Task

**Title**: Restore and verify UI interactions after PixiJS migration

**Scope**: Fix all 31 failing tests and restore removed interactive features.

**Deliverables**:

1. **Fix broken test infrastructure** (25 tests):
   - Update breadboard-app.test.ts to test via app state instead of querying SVG DOM
   - Update property-editor.test.ts to work with Canvas-based component selection
   - Restore component selection verification without relying on SVG elements
   - Ensure tests verify behavior through public API, not DOM implementation details

2. **Restore drag-and-drop initiation** (removed in PR #167):
   - Implement drag initiation using PixiJS FederatedPointerEvent system
   - Wire up mousedown → drag → mouseup event flow
   - Add ghost preview rendering during drag
   - Restore snap-to-grid validation
   - Verify with existing test suite (5 drag-and-drop tests should pass)

3. **Restore voltage tooltips on hover**:
   - Map Canvas coordinates to breadboard positions using PixiJS event system
   - Display voltage tooltip at cursor position
   - Show exact voltage value and qualitative level
   - Only display when simulation succeeds

4. **Regenerate visual regression baselines** (6 tests):
   - Run `npm run test:visual:update` to capture new Canvas-based screenshots
   - Manually verify that visual appearance is correct
   - Commit updated baseline screenshots
   - Ensure visual tests pass in CI

5. **Add basic PixiJS renderer tests** (optional but recommended):
   - Test coordinate mapping (positionToPixels)
   - Test component rendering produces expected Graphics objects
   - Test event handler registration
   - Test layer container setup

**Success Criteria**:

- All 260 tests passing (100% pass rate)
- Component drag-and-drop working in live application
- Voltage tooltips appearing on hover in live application
- Visual regression tests passing in CI
- No user-facing functionality regressions from PixiJS migration

**Priority**: HIGH - This task restores critical user-facing functionality and fixes a broken test suite.

**Estimated Effort**: 2-3 days

- 1 day: Fix test infrastructure (update 25 tests to work with Canvas)
- 1 day: Restore drag-and-drop and voltage tooltips
- 0.5 days: Regenerate visual baselines and verify
- 0.5 days: Add basic PixiJS renderer tests (optional)

**Dependencies**: None - can start immediately

**Risk**: Medium - Requires understanding PixiJS event model and coordinate systems, but no architectural changes needed.

## Why This Task?

This task is the most important next step because:

1. **Restores user experience**: Users lost critical interaction features (drag-and-drop, tooltips)
2. **Fixes test coverage**: 12% test failure rate is unacceptable for maintaining quality
3. **Enables future work**: Can't confidently build new features on broken test foundation
4. **Addresses technical debt**: PR #167 left known limitations that need resolution
5. **High impact, bounded scope**: Clear deliverables with measurable success criteria

Without this task, the codebase has broken tests and missing features that block progress on other enhancements in the goal document (LED glow effects, advanced visualizations, etc.).
