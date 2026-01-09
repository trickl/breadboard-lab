Remove PixiJS and legacy rendering code (Milestone 7 — Final Cleanup)

## Source Review
`planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`

## Review Items Addressed
This task implements **Milestone 7 — Remove PixiJS** from the source review (lines 351-364).

**Milestone status:** Not started (Milestones 0-6 complete with 100% feature parity)

## Context

The React UI implementation (`?react=true`) has achieved complete feature parity with the legacy PixiJS UI across six milestones:
- ✅ Milestone 0: React infrastructure with feature flag
- ✅ Milestone 1: Renderer-agnostic controller
- ✅ Milestone 2: SVG breadboard substrate
- ✅ Milestone 3: Component rendering and manipulation
- ✅ Milestone 4: Rete graph layer alignment
- ✅ Milestone 5: Interactive connection creation
- ✅ Milestone 6: Voltage overlay, current animation, and error badges

The React UI now provides all functionality previously available in the PixiJS UI:
- Breadboard substrate with interactive holes and hole highlighting
- Component rendering with drag/drop, rotate, and delete operations
- Interactive connection creation with one-connector-per-hole constraint
- Voltage heatmap overlay (V key)
- Current flow animation (C key)
- Error badges with click-to-explain functionality
- Full keyboard shortcut support (R, Delete, Escape, V, C)

**This milestone is a pure cleanup task:** Remove PixiJS dependency and legacy code paths. There is NO feature work required.

## Objective

Remove the PixiJS rendering engine and all associated legacy code, completing the migration to React/SVG rendering.

## Tasks (from review lines 351-364)

### 1. Delete PixiJS renderer module
**Review reference:** Line 356

Delete the main PixiJS renderer implementation:
- File: `src/ui/pixi-renderer.ts`
- This file contains ~1500+ lines of canvas-based rendering logic
- All functionality has been reimplemented in React/SVG in Milestones 2-6

**Verification:** File no longer exists; no imports reference it

### 2. Remove Pixi-specific code paths
**Review reference:** Line 357

Identify and remove all code paths that depend on or reference PixiJS:
- Search codebase for `pixi` references (case-insensitive)
- Remove imports of PixiJS types and classes
- Remove PixiJS-specific event handlers
- Remove canvas-specific pointer coordinate transforms
- Remove any conditional code branches that check for Pixi availability

**Key files to examine:**
- `src/ui/breadboard-app.ts` (if it still has PixiJS initialization logic)
- `src/main-legacy.ts` (may become obsolete)
- Any files importing from `src/ui/pixi-renderer.ts`

**Verification:** 
- `git grep -i pixi` returns only references in:
  - This planning document
  - Historical documentation
  - package.json (next step will remove)
  - No code references remain

### 3. Remove legacy entry point
**Review reference:** Lines 356-357

Evaluate and potentially remove the legacy entry point:
- File: `src/main-legacy.ts`
- This file loads the PixiJS-based `BreadboardApp`
- Evaluate whether any initialization logic should be preserved
- If `BreadboardApp` depends entirely on PixiJS, this file can be deleted

**Decision criteria:**
- If `BreadboardApp` has no reusable initialization logic → DELETE
- If `BreadboardApp` has reusable logic → EXTRACT to shared module, THEN DELETE

**Verification:** No references to `main-legacy.ts` outside of feature flag logic

### 4. Remove feature flag routing
**Review reference:** Implicit in Milestone 7 completion

Once PixiJS is removed, the feature flag is no longer needed:
- File: `src/main.tsx`
- Remove `USE_REACT_UI` flag check and conditional routing
- Remove dynamic import of `./main-legacy`
- React UI should become the only UI
- Update `index.html` if needed (currently references `main.tsx`)

**Modified code:**
```typescript
// Before:
const USE_REACT_UI = new URLSearchParams(window.location.search).get('react') === 'true';
if (USE_REACT_UI) {
  createRoot(rootElement).render(<App />);
} else {
  import('./main-legacy');
}

// After:
createRoot(rootElement).render(<App />);
```

**Verification:** Application always loads React UI regardless of query parameters

### 5. Remove pixi.js from dependencies
**Review reference:** Line 358

Remove PixiJS from package dependencies:
- File: `package.json`
- Remove `pixi.js` from `dependencies` section
- Run `npm install` to update `package-lock.json`
- Verify application still builds and runs

**Command sequence:**
```bash
npm uninstall pixi.js
npm install  # Update lock file
npm run build  # Verify build succeeds
npm run dev  # Verify dev server works
```

**Verification:**
- `pixi.js` not present in `package.json`
- `pixi.js` not present in `package-lock.json`
- `npm run build` succeeds
- `npm run dev` starts without errors

### 6. Update TypeScript configuration (if needed)
**Review reference:** Implicit in dependency removal

Check if TypeScript configuration has PixiJS-specific settings:
- File: `tsconfig.json`
- Verify no PixiJS type references or path mappings
- If PixiJS types were explicitly included, remove them

**Verification:** TypeScript compilation succeeds without PixiJS types

### 7. Update tests
**Review reference:** Line 361

Review and update test files that may reference PixiJS:
- Search for test files importing or mocking PixiJS
- Update tests to use controller tests (no rendering dependencies)
- Remove any canvas-specific test utilities
- Ensure all unit tests pass

**Command:**
```bash
npm test  # All tests must pass
```

**Verification:** All unit tests pass without PixiJS references

### 8. Update Playwright visual regression baselines
**Review reference:** Line 362

Update visual regression test baselines to reflect React/SVG UI:
- Run Playwright tests to capture new baselines
- Review baseline changes carefully (expect significant visual differences)
- Ensure all interactive scenarios still work
- Document any intentional visual changes

**Command sequence:**
```bash
npm run test:e2e  # Run existing Playwright tests (may fail with baseline mismatches)
npm run test:e2e -- --update-snapshots  # Update baselines if visual changes are expected
npm run test:e2e  # Verify tests pass with new baselines
```

**Verification:** Playwright tests pass with updated baselines

### 9. Remove canvas-specific coordinate transforms
**Review reference:** Line 359

Search for and remove canvas-specific coordinate transformation code:
- Canvas-to-world coordinate conversions (if any remain outside pixi-renderer.ts)
- Screen-to-canvas transforms
- Any `canvas.getBoundingClientRect()` logic not used by React UI

**Note:** React UI uses SVG coordinate system (`screenToSVG()` in ComponentsLayer and BreadboardScene), which is different from canvas transforms.

**Verification:** 
- `git grep -i "canvas\."` returns only necessary SVG references
- No legacy canvas coordinate code remains

### 10. Update documentation
**Review reference:** Implicit in Milestone 7 completion

Update documentation to reflect React-only UI:
- Update README if it mentions PixiJS or feature flag
- Update ARCHITECTURE.md to remove PixiJS references
- Add migration completion notes
- Document that React/SVG is now the rendering engine

**Files to review:**
- `README.md`
- `ARCHITECTURE.md`
- Any `IMPLEMENTATION_SUMMARY*.md` files
- Planning documents (update review actions document)

**Verification:** Documentation accurately reflects current architecture

### 11. Verify build output
**Review reference:** Line 360

After all changes, verify the build:
- No PixiJS references in build output
- Build size reduced (PixiJS is ~400KB minified)
- No console warnings about missing dependencies
- Application starts and runs correctly

**Commands:**
```bash
npm run build
npm run preview  # Test production build locally
```

**Verification:**
- Build succeeds
- Bundle size reduced by ~400KB
- Production build runs correctly
- No PixiJS in bundle analysis

## Acceptance Criteria (from review lines 360-364)

From the source review, this milestone is complete when:

✅ **`pixi.js` is not present in runtime dependencies** (line 361)
   - Removed from `package.json` and `package-lock.json`
   - Build succeeds without PixiJS

✅ **The application renders entirely via React DOM/SVG** (line 362)
   - No canvas rendering
   - No WebGL usage
   - All visuals produced by React components

✅ **All major interactions work** (line 363)
   - Select, drag, rotate, connect (already verified in Milestones 2-6)
   - Re-verification after cleanup ensures no regressions

✅ **Overlays are rendered and tied to solver output** (line 364)
   - Voltage overlay shows node voltages (already verified in Milestone 6)
   - Current animation shows edge currents (already verified in Milestone 6)
   - Error badges show simulation errors (already verified in Milestone 6)
   - Re-verification after cleanup ensures no regressions

✅ **Tests pass and visual baselines are updated** (line 365)
   - All unit tests pass
   - Playwright tests pass with updated baselines
   - No test references to PixiJS

## Definition of Done (from review lines 419-425)

This migration is complete when:
- ✅ `pixi.js` is not present in runtime dependencies
- ✅ The application renders entirely via React DOM/SVG
- ✅ All major interactions (select, drag, rotate, connect) work
- ✅ Overlays (voltage/current/errors) are rendered and tied to solver output
- ✅ Tests pass and visual baselines are updated

## Implementation Approach

### Phase 1: Identify all PixiJS references
1. Run comprehensive search: `git grep -i pixi`
2. Create list of all files that reference PixiJS
3. Categorize references:
   - Code imports/usage (must be removed)
   - Documentation (update to reflect migration completion)
   - Historical notes (leave as-is)

### Phase 2: Remove PixiJS code
1. Delete `src/ui/pixi-renderer.ts`
2. Delete `src/main-legacy.ts` (or extract reusable logic first)
3. Update `src/main.tsx` to remove feature flag
4. Remove any remaining imports/references

### Phase 3: Update dependencies
1. Run `npm uninstall pixi.js`
2. Verify `package.json` and `package-lock.json` updated
3. Run `npm install` to ensure clean state

### Phase 4: Verify build and tests
1. Run `npm run build` to verify build succeeds
2. Run `npm test` to verify unit tests pass
3. Run `npm run dev` to verify dev server starts
4. Manually test all interactions in browser

### Phase 5: Update visual regression tests
1. Run `npm run test:e2e` to see baseline mismatches
2. Review all visual differences carefully
3. Update baselines: `npm run test:e2e -- --update-snapshots`
4. Verify tests pass: `npm run test:e2e`

### Phase 6: Update documentation
1. Update README.md to remove feature flag instructions
2. Update ARCHITECTURE.md to document React/SVG as rendering engine
3. Update review actions document to mark Milestone 7 complete

### Phase 7: Final verification
1. Build production bundle: `npm run build`
2. Test production build: `npm run preview`
3. Verify bundle size reduction (~400KB)
4. Verify no console errors or warnings
5. Manually test all features:
   - Breadboard substrate and hole highlighting
   - Component drag/rotate/delete
   - Connection creation with constraint enforcement
   - Voltage overlay (V key)
   - Current animation (C key)
   - Error badges (click to see details)
   - Pan/zoom
   - All keyboard shortcuts

## Constraints

From the review and task template:

1. **Do not change logic** unless it's a clear bug in PixiJS-specific code
2. **Do not maintain legacy endpoints** — remove feature flag and legacy entry point entirely
3. **Always delete unused code** — no commented-out PixiJS code should remain
4. **Do not leave comments on changes** in the code (documentation updates are fine)
5. **Do not rewrite from scratch** — this is deletion/cleanup, not refactoring
6. **Ensure all tests and linting pass** after changes

## Safety Checks

Before finalizing this milestone:

### Build verification
- ✅ `npm run build` succeeds
- ✅ Build output contains no PixiJS references
- ✅ Bundle size reduced by ~400KB

### Test verification
- ✅ `npm test` passes (all unit tests)
- ✅ `npm run test:e2e` passes (all Playwright tests)
- ✅ No test failures or warnings

### Manual verification
- ✅ Application loads at `http://localhost:5173/` (no query param needed)
- ✅ Breadboard substrate renders correctly
- ✅ Components render correctly
- ✅ Connections render correctly
- ✅ All interactions work (drag, rotate, delete, connect)
- ✅ All overlays work (voltage, current, errors)
- ✅ All keyboard shortcuts work (R, Delete, Escape, V, C)
- ✅ Pan/zoom works correctly
- ✅ No console errors

### Code verification
- ✅ `git grep -i pixi` returns only documentation/historical references
- ✅ No imports from `src/ui/pixi-renderer.ts`
- ✅ No imports of `pixi.js` types
- ✅ Feature flag removed from `src/main.tsx`
- ✅ `src/main-legacy.ts` deleted or integrated

### Documentation verification
- ✅ README updated to reflect React-only UI
- ✅ ARCHITECTURE updated to document rendering engine
- ✅ Review actions document updated to mark Milestone 7 complete

## Success Metrics

This milestone succeeds when:
1. **Zero PixiJS references in code** (excluding docs/history)
2. **Bundle size reduced by ~400KB** (PixiJS removal)
3. **All tests pass** (unit + Playwright)
4. **Application works identically** to Milestone 6 completion state
5. **Feature flag removed** — React UI is the only UI

## Risk Mitigation

**Risk:** Breaking changes during cleanup
**Mitigation:** 
- Make changes incrementally
- Run tests after each deletion
- Keep git history clean (commit after each successful step)
- If something breaks, identify dependency and extract before deleting

**Risk:** Test failures after PixiJS removal
**Mitigation:**
- Review all test files before making changes
- Update tests to use controller layer (already done in Milestone 1)
- Keep Playwright baselines version controlled

**Risk:** Missed PixiJS references
**Mitigation:**
- Use comprehensive search: `git grep -i pixi`
- Review TypeScript compilation errors carefully
- Test application thoroughly after removal

## Notes

- This is a **pure cleanup milestone** — no new features
- React UI already has 100% feature parity (Milestones 0-6 complete)
- All functionality has been reimplemented in React/SVG
- This task is **low risk** because React UI is already working
- Feature flag allowed safe incremental migration; now it's time to remove it
- PixiJS removal will reduce bundle size significantly (~400KB)
- No simulation logic changes (as in all previous milestones)
- No component library changes (as in all previous milestones)

## Related PRs (for context)

Migration PRs that led to this cleanup:
- PR #465: Milestone 0 — React infrastructure setup
- PR #471: Milestone 1 — Controller extraction
- PR #477: Milestone 2 — SVG breadboard substrate
- PR #483: Milestone 3 — Component rendering and manipulation
- PR #489: Milestone 4 — Rete graph layer alignment
- PR #495: Milestone 5 — Interactive connection creation
- PR #501: Milestone 6 — Overlays (voltage, current, errors)

This PR completes the migration sequence.

## Post-Completion Actions

After this milestone:
1. Update review actions document: Mark Milestone 7 complete (100% migration complete)
2. Close feature flag-related issues
3. Announce migration completion
4. Plan post-migration enhancements:
   - Better voltage overlay (per-net region shading)
   - Better current animation (particle system)
   - Error explain panel (modal/toast system)
   - Component palette integration
   - Connection editing features (delete, reroute, select)

## Checklist Summary

This task is complete when ALL of the following are checked:

- [ ] `src/ui/pixi-renderer.ts` deleted
- [ ] `src/main-legacy.ts` deleted or integrated
- [ ] Feature flag removed from `src/main.tsx`
- [ ] All PixiJS imports removed from code
- [ ] `pixi.js` removed from `package.json`
- [ ] `package-lock.json` updated via `npm install`
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (all unit tests)
- [ ] `npm run test:e2e` passes (all Playwright tests)
- [ ] Playwright baselines updated and committed
- [ ] README.md updated
- [ ] ARCHITECTURE.md updated
- [ ] Review actions document updated
- [ ] Manual testing confirms all features work
- [ ] Bundle size reduced by ~400KB
- [ ] No console errors or warnings
- [ ] No PixiJS references in code (excluding docs/history)

## Estimated Scope

**Effort:** Small to medium (2-4 hours)
- Most work is deletion, not creation
- Some careful review needed to ensure no breakage
- Visual regression baseline updates may take time to review

**Files changed:** 5-10 files
- Deletions: 2-3 files (~2000 lines removed)
- Modifications: 3-5 files (small changes each)
- Documentation: 2-3 files (minor updates)

**Risk level:** Low
- React UI already proven working
- Tests provide safety net
- Feature flag allows rollback if needed (but shouldn't be)
