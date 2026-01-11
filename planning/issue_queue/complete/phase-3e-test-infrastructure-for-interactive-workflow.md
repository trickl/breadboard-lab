Enable interactive component placement workflow by completing Phase 3e test infrastructure updates

---

## Context

This task is the **critical blocker** preventing activation of the Rete.js-based interactive component placement workflow required by `goal.md` Section 5.3.1. The workflow implementation (Phase 3d, PR #243) is **complete and functional**, but the feature flag `USE_RETE_INTERACTIVE` remains disabled (false) because 44 tests fail when the flag is enabled.

**Goal.md Requirement (Section 5.3.1 - Component Instantiation):**

```
- Selecting a component does **not** immediately place it on the breadboard.
- The component appears **adjacent to the board**, floating beside it.
- The user:
  1. Drags the component body into position
  2. Connects individual legs to breadboard holes

This avoids visual occlusion and improves comprehension in dense circuits.
```

**Current State:**

- ✅ Phase 3d implementation complete (PR #243)
- ✅ Interactive workflow fully functional when enabled
- ✅ All core features implemented:
  - Floating component creation at canvas edge
  - Component body dragging with real-time preview
  - Interactive leg-to-hole connection with click handling
  - Connection validation (one-connector-per-hole constraint)
  - Auto-placement when all legs connected
  - Escape key cancellation
- ❌ Feature flag `USE_RETE_INTERACTIVE = false` (line 63 in `src/ui/breadboard-app.ts`)
- ❌ 44 tests fail when flag enabled (legacy two-click API usage)
- ❌ Visual regression baselines need updates for new workflow

**Gap:** The system cannot meet goal.md Section 5.3.1 requirements until Phase 3e test updates complete and the feature flag is enabled.

---

## Objective

Complete Phase 3e test infrastructure updates to enable the interactive component placement workflow, bringing the system into full alignment with goal.md Section 5.3.1 requirements.

**Definition of Done:**

1. All 441+ tests pass with `USE_RETE_INTERACTIVE = true`
2. Visual regression baselines updated to reflect interactive workflow
3. Feature flag `USE_RETE_INTERACTIVE` set to `true` by default
4. Zero breaking changes to existing functionality
5. All example circuits work identically with new workflow
6. Documentation updated to reflect interactive workflow as primary

---

## Problem Analysis

### Test Failure Root Cause

The 44 failing tests use the **legacy two-click placement API**:

```typescript
// Legacy API (currently used in tests)
app.clickHole(row1, col1); // First click sets placementStart
app.clickHole(row2, col2); // Second click creates component
```

With `USE_RETE_INTERACTIVE = true`, the workflow changes to:

```typescript
// Interactive workflow (goal.md Section 5.3.1)
app.selectComponentType('resistor'); // Creates floating component
// User drags floating component body (not hole clicks)
// User clicks leg 1, then hole 1 (connects leg 1)
// User clicks leg 2, then hole 2 (connects leg 2)
// Component auto-places when all legs connected
```

**Key insight:** The failing tests are **test infrastructure issues**, not bugs in Phase 3d implementation. The implementation is correct and functional.

---

## Technical Scope

### 1. Test API Updates

**Files to update:**

- `src/ui/__tests__/breadboard-app.test.ts` (25 tests)
- `src/ui/__tests__/property-editor.test.ts` (12 tests)
- `src/core/__tests__/circuit-extractor.test.ts` (potential, verify)
- Other test files that programmatically place components (audit required)

**Required changes:**

#### A. Extend Public Testing API

Add methods to `BreadboardApp` for interactive workflow testing:

```typescript
// In src/ui/breadboard-app.ts (public API section)

/**
 * Get current floating component (test helper)
 */
public getFloatingComponent(): FloatingComponent | null {
  return this.floatingComponent;
}

/**
 * Click a component leg (test helper)
 * @param legIndex - Index of leg to click (0-based)
 */
public clickComponentLeg(legIndex: number): void {
  if (!this.floatingComponent) {
    throw new Error('No floating component to click leg on');
  }
  // Trigger leg click logic
  this.handleLegClick(legIndex);
}

/**
 * Drag floating component to position (test helper)
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 */
public dragFloatingComponentTo(canvasX: number, canvasY: number): void {
  if (!this.floatingComponent) {
    throw new Error('No floating component to drag');
  }
  // Update floating component position
  this.floatingComponent.canvasX = canvasX;
  this.floatingComponent.canvasY = canvasY;
  this.render();
}

/**
 * Complete leg-to-hole connection (test helper)
 * @param legIndex - Index of component leg
 * @param row - Breadboard row
 * @param col - Breadboard column
 */
public connectLegToHole(legIndex: number, row: number, col: number): void {
  if (!this.floatingComponent) {
    throw new Error('No floating component to connect');
  }

  // Simulate click on leg, then click on hole
  this.clickComponentLeg(legIndex);
  this.clickHole(row, col);
}

/**
 * Place component interactively (test helper convenience method)
 * @param componentType - Type of component to place
 * @param legPositions - Array of {row, col} for each leg
 */
public placeComponentInteractive(
  componentType: ComponentType,
  legPositions: Array<{ row: number; col: number }>
): void {
  // Select component (creates floating component)
  this.selectComponentType(componentType);

  // Connect each leg to specified hole
  legPositions.forEach((pos, index) => {
    this.connectLegToHole(index, pos.row, pos.col);
  });

  // Component auto-places when all legs connected
  // Verify component was placed
  if (this.floatingComponent !== null) {
    throw new Error('Component did not auto-place after all legs connected');
  }
}
```

#### B. Update Test Cases

Replace legacy two-click patterns with interactive workflow:

**Before:**

```typescript
// Legacy two-click placement
app.selectComponentType('resistor');
app.clickHole(5, 2);
app.clickHole(5, 6);
```

**After:**

```typescript
// Interactive workflow (goal.md Section 5.3.1)
app.placeComponentInteractive('resistor', [
  { row: 5, col: 2 },
  { row: 5, col: 6 },
]);

// Or for more granular control:
app.selectComponentType('resistor');
expect(app.getFloatingComponent()).not.toBeNull();
app.connectLegToHole(0, 5, 2);
app.connectLegToHole(1, 5, 6);
expect(app.getFloatingComponent()).toBeNull(); // Auto-placed
```

**Test updates required:**

1. Component placement tests (25+ tests)
2. Property editor tests (component placement setup code)
3. Drag-and-drop tests (placement setup)
4. Rotation tests (placement setup)
5. Circuit extraction tests (placement setup)
6. Any integration tests using programmatic placement

**Approach:**

- Add new helper methods to public API (backward compatible)
- Update tests incrementally (file by file)
- Maintain both APIs during transition (feature flag approach)
- Run tests after each file update to isolate failures

### 2. Visual Regression Test Updates

**Files to update:**

- `tests/visual/examples.spec.ts` (7 tests)
- Baseline screenshots in `tests/visual/examples.spec.ts-snapshots/`

**Required changes:**

#### A. Update Test Expectations

The interactive workflow may produce **subtle visual differences**:

- Component creation shows floating component briefly (before legs connected)
- Connection animation/feedback may differ
- Timing differences in test execution

**Approach:**

1. Run visual tests with `USE_RETE_INTERACTIVE = true`
2. Manually inspect diff images to verify differences are expected
3. Update baselines using `npm run test:visual:update`
4. Document visual changes in commit message

#### B. Update Test Helpers

The `loadExample()` helper in `tests/visual/helpers.ts` uses programmatic placement. Update if needed:

```typescript
// In tests/visual/helpers.ts
export async function loadExample(page: Page, exampleName: string) {
  await page.goto('/');

  // Wait for app initialization
  await page.waitForSelector('#breadboard-container');

  // Load example using Examples modal (UI-based, no API changes needed)
  await page.click('button:has-text("Examples")');
  await page.click(`button:has-text("${exampleName}")`);

  // Wait for example to load and render
  await page.waitForTimeout(500);
}
```

**Note:** If `loadExample()` uses JSON deserialization (likely), no changes needed. The interactive workflow only affects **new component placement**, not loading saved circuits.

### 3. Feature Flag Activation

**Files to update:**

- `src/ui/breadboard-app.ts` (line 63)

**Change required:**

```typescript
// Before
const USE_RETE_INTERACTIVE = false;

// After
const USE_RETE_INTERACTIVE = true;
```

**When to activate:**

- Only after all tests pass with flag enabled
- Only after visual regression baselines updated
- Only after manual verification of all example circuits

### 4. Documentation Updates

**Files to update:**

- `README.md` (Update "How to Use" section)
- `planning/state/system_capabilities.md` (Update feature flag status, Phase 3e completion)
- `RETE_MIGRATION_PHASE3_SUMMARY.md` (potential update)

**Changes required:**

#### A. README.md

Update component placement instructions to reflect interactive workflow:

**Before:**

```markdown
### Placing Components

1. Click a component type button in the toolbar
2. Click a breadboard hole for the first leg
3. Click another hole for the second leg
```

**After:**

```markdown
### Placing Components

1. Click a component type in the Component Library (📦 button)
2. The component appears floating next to the breadboard
3. Drag the component body to position it (optional)
4. Click a component leg, then click a breadboard hole to connect
5. Repeat for each leg
6. The component places automatically when all legs are connected
7. Press Escape to cancel placement
```

#### B. system_capabilities.md

Update feature flag status and Phase 3e completion:

```markdown
### Rete.js Integration Status

**Phase 3e Complete:** Test infrastructure updates (PR #XXX)

- `USE_RETE` feature flag **ACTIVE** (`true`) — enables graph-based circuit extraction
- `USE_RETE_INTERACTIVE` feature flag **ACTIVE** (`true`) — enables interactive connection UI

**Interactive Workflow (Active):**

- Floating component placement workflow (goal.md Section 5.3.1) ✅
- Component legs as interactive targets ✅
- One-connector-per-hole validation ✅
- Auto-placement on full connection ✅
- All 441+ tests passing with interactive workflow ✅
```

---

## Implementation Strategy

### Phase 1: Test API Extension (Low Risk)

1. Add new public testing methods to `BreadboardApp`
   - `getFloatingComponent()`
   - `clickComponentLeg(legIndex)`
   - `connectLegToHole(legIndex, row, col)`
   - `placeComponentInteractive(type, positions)`

2. Verify methods work with `USE_RETE_INTERACTIVE = false` (no-op or error)

3. Test API additions separately before test updates

**Acceptance Criteria:**

- New methods added to public API section
- Methods documented with JSDoc comments
- No breaking changes to existing public API
- Methods verified in isolation

### Phase 2: Test Updates (Incremental)

**Approach: File-by-File Updates**

1. Update `breadboard-app.test.ts` (25 tests)
   - Replace all `clickHole()` pairs with `placeComponentInteractive()`
   - Add tests for floating component state
   - Add tests for leg connection sequencing
   - Add test for Escape key cancellation
   - Verify all 25 tests pass with `USE_RETE_INTERACTIVE = true`

2. Update `property-editor.test.ts` (12 tests)
   - Update component placement setup code
   - Verify property editor works with interactive workflow
   - Verify all 12 tests pass with `USE_RETE_INTERACTIVE = true`

3. Audit and update other test files
   - Search for `clickHole()` usage patterns: `grep -r "clickHole.*clickHole" src/`
   - Update any tests using two-click placement pattern
   - Verify each file's tests pass after update

4. Run full test suite with `USE_RETE_INTERACTIVE = true`
   - Expect 441+ tests passing
   - Address any remaining failures

**Acceptance Criteria:**

- All unit and integration tests pass with flag enabled
- No test uses legacy two-click API when flag enabled
- Tests verify interactive workflow behaves correctly
- Zero breaking changes to non-test code

### Phase 3: Visual Regression Updates (Manual Review Required)

1. Enable feature flag temporarily: `const USE_RETE_INTERACTIVE = true;`

2. Run visual tests: `npm run test:visual`

3. Review diff images for each failing test:
   - Are differences expected? (floating component, connection feedback)
   - Are differences minimal? (timing, animation frames)
   - Are differences acceptable? (no visual regressions)

4. If differences acceptable, update baselines: `npm run test:visual:update`

5. Commit updated baselines with descriptive message

6. Re-run visual tests to verify baselines match

**Acceptance Criteria:**

- All visual tests pass with new baselines
- Diff images reviewed and documented
- Baselines committed with clear explanation
- No unexpected visual regressions

### Phase 4: Feature Flag Activation (Permanent)

1. Set `USE_RETE_INTERACTIVE = true` in `src/ui/breadboard-app.ts`

2. Run full test suite: `npm test && npm run test:visual`
   - All tests must pass

3. Manual verification:
   - Load each example circuit
   - Verify circuits load and simulate correctly
   - Place new components using interactive workflow
   - Verify selection, rotation, deletion, property editing work
   - Verify audio output, clock controls, explain panel work

4. Build production bundle: `npm run build`
   - Verify no build errors
   - Check bundle size (should be similar)

**Acceptance Criteria:**

- Feature flag permanently enabled
- All automated tests passing
- All example circuits verified manually
- Production build successful
- Zero breaking changes confirmed

### Phase 5: Documentation Updates

1. Update README.md with new component placement workflow

2. Update system_capabilities.md:
   - Feature flag status (both `true`)
   - Phase 3e completion date
   - Remove "Remaining Work" section for Phase 3e

3. Add Phase 3e summary document (optional):
   - `RETE_MIGRATION_PHASE3E_SUMMARY.md`
   - Test updates performed
   - Visual regression changes
   - Verification results

**Acceptance Criteria:**

- User-facing documentation reflects interactive workflow
- System capabilities document accurate
- No outdated information in docs

---

## Testing Requirements

### Unit Test Coverage

**Minimum requirements:**

- All 441+ existing tests pass with `USE_RETE_INTERACTIVE = true`
- No reduction in code coverage
- No new untested code paths introduced

**New test scenarios:**

- Floating component state lifecycle (create → connect → place)
- Partial connection handling (leg 1 connected, leg 2 not)
- Escape key cancellation at various stages
- Invalid connection rejection (occupied hole)
- Edge cases (clicking leg without floating component)

### Visual Regression Coverage

**Minimum requirements:**

- All 7 existing visual tests pass with new baselines
- Baselines reviewed and approved
- Diff images documented

**New visual scenarios (optional future work):**

- Floating component rendering (with instructions)
- Component leg interaction targets (yellow circles)
- Connection line rendering during drag
- Hole hover effects

### Integration Testing

**Manual verification required:**

1. **Example circuits:** Load each example, verify simulation
2. **Component placement:** Place all component types using interactive workflow
3. **Component operations:** Selection, rotation, deletion, property editing
4. **Advanced features:** Audio output, clock controls, explain panel
5. **View switching:** Breadboard ↔ Schematic view transitions
6. **Circuit operations:** Save, load, clear all
7. **Error handling:** Invalid placements, short circuits, floating nodes

**Acceptance criteria:**

- All operations work identically to legacy workflow
- Interactive workflow feels natural and responsive
- No performance degradation observed
- No visual glitches or artifacts

---

## Risk Assessment

### Low Risks (High Confidence)

1. **Test API extension:** Adding public methods is low-risk, non-breaking
2. **Test updates:** Mechanical refactoring, clear before/after pattern
3. **Documentation updates:** Low complexity, no code changes

### Medium Risks (Manageable)

1. **Visual regression baselines:** May need multiple update iterations
   - **Mitigation:** Manual review of all diffs before updating baselines
   - **Mitigation:** Compare old and new screenshots side-by-side

2. **Unexpected test failures:** Edge cases not covered by initial API
   - **Mitigation:** Incremental file-by-file approach isolates failures
   - **Mitigation:** Extend test API as needed during updates

3. **Performance differences:** Interactive workflow may have different timing
   - **Mitigation:** Add explicit waits in tests if needed
   - **Mitigation:** Measure render performance before/after

### High Risks (Require Careful Handling)

1. **Breaking changes to user workflow:** Users accustomed to two-click placement
   - **Mitigation:** Interactive workflow is **required by goal.md**, not optional
   - **Mitigation:** New workflow is more intuitive per goal.md rationale
   - **Mitigation:** Document workflow change in release notes
   - **Impact:** This is an **expected breaking change** per goal.md iteration plan

2. **Unforeseen edge cases in Phase 3d implementation:** Tests may reveal bugs
   - **Mitigation:** Phase 3d implementation thoroughly reviewed in PR #243
   - **Mitigation:** Manual testing performed during Phase 3d
   - **Mitigation:** If bugs found, fix in Phase 3d code, not test infrastructure
   - **Likelihood:** Low (implementation tested manually)

---

## Success Criteria

### Must Have (Blocking)

1. ✅ All 441+ tests pass with `USE_RETE_INTERACTIVE = true`
2. ✅ Visual regression tests pass with updated baselines
3. ✅ Feature flag `USE_RETE_INTERACTIVE = true` permanently enabled
4. ✅ All example circuits load and work correctly
5. ✅ Zero breaking changes to existing functionality (except placement workflow)
6. ✅ Documentation updated to reflect interactive workflow

### Should Have (Important)

1. ✅ Test API is clean, well-documented, and maintainable
2. ✅ Visual regression diffs reviewed and explained
3. ✅ Manual verification checklist completed
4. ✅ System capabilities document fully updated

### Could Have (Nice to Have)

1. ⚪ Phase 3e summary document created
2. ⚪ Additional tests for floating component edge cases
3. ⚪ Performance benchmarks (before/after comparison)
4. ⚪ User-facing changelog entry

---

## Constraints

### Non-Negotiable

1. **Zero breaking changes to existing functionality** (except placement workflow change required by goal.md)
2. **All tests must pass** before flag activation
3. **Visual regressions must be reviewed** before baseline updates
4. **Manual verification required** before declaring completion

### Design Constraints

1. **Backward compatibility:** Legacy two-click API must continue working with `USE_RETE_INTERACTIVE = false` (for reference, not active use)
2. **Test approach:** Tests must use public API only (no private method access)
3. **No test-only code:** Test helpers should be generally useful, not test-specific hacks

---

## Estimated Effort

**Total: 16-24 hours** (2-3 days of focused work)

### Breakdown

1. **Test API Extension:** 2-3 hours
   - Design API methods: 30 minutes
   - Implement methods: 1 hour
   - Test API in isolation: 1 hour
   - Documentation: 30 minutes

2. **Test Updates:** 8-12 hours
   - Audit test files: 1 hour
   - Update `breadboard-app.test.ts`: 3-4 hours
   - Update `property-editor.test.ts`: 1-2 hours
   - Update other test files: 2-3 hours
   - Debug failures: 1-2 hours
   - Full test suite verification: 1 hour

3. **Visual Regression Updates:** 2-3 hours
   - Run visual tests: 15 minutes
   - Review diff images: 1 hour
   - Update baselines: 15 minutes
   - Re-verify: 30 minutes
   - Document changes: 30 minutes

4. **Feature Flag Activation:** 1-2 hours
   - Enable flag: 5 minutes
   - Full test run: 15 minutes
   - Manual verification: 30-60 minutes
   - Build verification: 15 minutes

5. **Documentation Updates:** 2-3 hours
   - README.md: 30 minutes
   - system_capabilities.md: 1 hour
   - Optional summary document: 1 hour
   - Review and polish: 30 minutes

6. **Buffer for unknowns:** 2-3 hours

---

## Definition of Done Checklist

### Code Changes

- [ ] Test API methods added to `BreadboardApp` public API
- [ ] All test files updated to use interactive workflow API
- [ ] Feature flag `USE_RETE_INTERACTIVE = true` in source code
- [ ] No console errors in browser during manual testing
- [ ] No TypeScript errors in build

### Testing

- [ ] All 441+ unit/integration tests passing with flag enabled
- [ ] All 7 visual regression tests passing with new baselines
- [ ] Manual verification checklist completed (all example circuits)
- [ ] No performance degradation observed (subjective, interactive)
- [ ] No visual glitches during component placement workflow

### Documentation

- [ ] README.md updated with interactive workflow instructions
- [ ] system_capabilities.md updated (Phase 3e complete, flag status)
- [ ] Visual regression changes documented in commit message
- [ ] Test updates documented in commit messages
- [ ] Optional: Phase 3e summary document created

### Verification

- [ ] Production build successful (`npm run build`)
- [ ] Dev server works correctly (`npm run dev`)
- [ ] All example circuits verified manually
- [ ] Component placement workflow verified for all component types
- [ ] Selection, rotation, deletion, property editing verified
- [ ] Audio output, clock controls, explain panel verified
- [ ] View switching (Breadboard ↔ Schematic) verified

### Approval

- [ ] All automated tests passing
- [ ] Manual verification complete
- [ ] Documentation reviewed
- [ ] No breaking changes (except expected placement workflow change)
- [ ] Ready to merge and deploy

---

## References

### Source Files

- `src/ui/breadboard-app.ts` (line 63: feature flag)
- `src/ui/__tests__/breadboard-app.test.ts` (25 tests to update)
- `src/ui/__tests__/property-editor.test.ts` (12 tests to update)
- `tests/visual/examples.spec.ts` (7 visual tests)

### Planning Documents

- `planning/vision/goal.md` (Section 5.3.1: Component Instantiation requirement)
- `planning/state/system_capabilities.md` (Phase 3d/3e status, lines 2468-2551)
- `planning/00-planning.md` (Rete.js migration plan)

### Prior Work

- **PR #243** (Phase 3d implementation): Interactive connection workflow
- **PR #237** (Phase 3b-3c partial): Floating components, hole hover, connection rendering
- **PR #231** (Phase 3a): Connection events and validation
- **PR #225** (Phase 2): Rete graph activation
- **PR #219** (Phase 1): Rete foundation

### Goal.md Quotes

**Section 5.3.1 (Component Instantiation):**

> "Selecting a component does **not** immediately place it on the breadboard.  
> The component appears **adjacent to the board**, floating beside it.  
> The user:
>
> 1. Drags the component body into position
> 2. Connects individual legs to breadboard holes
>
> This avoids visual occlusion and improves comprehension in dense circuits."

**Section 2.1 (Rationale):**

> "The existing PixiJS implementation makes **connector management, snapping, routing, and interaction state** increasingly complex and fragile."

**Section 3.2 (Connectors):**

> "A hole may only accept **one connector**."

---

## Notes for Implementation

### Key Technical Insights

1. **Phase 3d is complete:** The implementation is functional. This task is **test infrastructure only**.

2. **No changes to core logic needed:** All changes are in test files and documentation.

3. **Feature flag pattern successful:** The two-flag approach (`USE_RETE`, `USE_RETE_INTERACTIVE`) enabled incremental rollout without breaking changes.

4. **Interactive workflow is goal.md compliant:** This is not a "nice to have" – it's the **required interaction model** for this iteration.

### Common Pitfalls to Avoid

1. **Don't modify Phase 3d implementation:** If tests reveal issues, investigate carefully. The implementation was thoroughly reviewed.

2. **Don't skip visual regression review:** Automated baseline updates can hide real visual bugs. Manual inspection is required.

3. **Don't rush feature flag activation:** Complete all test updates first. Activating prematurely creates noise.

4. **Don't update tests in bulk:** File-by-file approach isolates failures and makes debugging easier.

### Decision Records

1. **Test API is public, not test-only:** The interactive workflow API is useful for programmatic component placement, not just tests. Future scripting/automation could use it.

2. **Keep legacy two-click API:** The old API remains functional with `USE_RETE_INTERACTIVE = false` for reference, but is not the primary workflow.

3. **Breaking change is acceptable:** goal.md explicitly requires this workflow change. Users must adapt.

4. **No rollback after activation:** Once Phase 3e is complete and flag enabled, the interactive workflow becomes permanent. The legacy workflow is deprecated.

---

## Conclusion

Phase 3e is the **single most important development task** preventing full alignment with goal.md Section 5.3.1. The implementation is complete and functional; only test infrastructure and documentation updates remain.

**Estimated Timeline:** 2-3 days of focused work  
**Complexity:** Medium (mechanical test updates, low technical risk)  
**Importance:** **Critical** (blocks goal.md compliance)  
**Urgency:** **High** (required for current iteration)

Upon completion, the system will fully satisfy goal.md Section 5.3.1 requirements, and users will experience the improved component placement workflow designed to avoid visual occlusion and improve comprehension in dense circuits.
