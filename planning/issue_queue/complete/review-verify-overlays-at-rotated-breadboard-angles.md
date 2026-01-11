Verify and fix visual overlays rendering at rotated breadboard orientations

## Source Review Items

This task addresses a **Known Limitation** identified in `review-2026-01-08.actions.md` following PRs #303, #309, and #321.

### Primary Source: Actions File Lines 1101-1150

**Known Limitation #2: Visual Overlays Not Tested at Rotated Angles ⚠️**

From the actions file (lines 1101-1124):

> **Original Issue:**
>
> - Voltage heatmap and X-ray mode rendering use absolute pixel coordinates
> - These may not render correctly when breadboard is rotated
> - No testing performed at 90°/180°/270° angles
>
> **Current Status:**
>
> - PR #309 focused on mouse interaction transformations
> - Visual overlay rendering was not modified
> - Manual testing of overlays at rotated angles not documented in MOUSE_COORDINATE_TRANSFORMATION_TESTING.md
>
> **Impact:**
>
> - **Voltage heatmap alignment at rotated angles: UNKNOWN** (needs verification)
> - **X-ray mode rail highlighting at rotated angles: UNKNOWN** (needs verification)
> - Core interactions work, but educational/visual features may have alignment issues
>
> **Remaining work:**
>
> - Load a circuit with voltage simulation and test at all orientations
> - Enable X-ray mode and verify rail highlighting at all orientations
> - If issues found, implement coordinate transformation for overlay rendering
> - Document overlay behavior at rotated angles
>
> **Priority:** MEDIUM — Core functionality works; this is a polish/educational feature verification

### Additional Context: PR #321 X-Ray Mode Implementation

From the actions file (lines 1867-1892), the same limitation applies to the newly implemented X-ray mode:

> **Known Limitation: X-Ray Mode at Rotated Breadboard Angles**
>
> **Issue:**
>
> - X-ray mode rendering uses absolute pixel coordinates
> - Visual overlays may not render correctly when breadboard is rotated to 90°/180°/270°
> - No testing performed at rotated angles in PR #321
>
> **Status:** Not tested ⚠️
>
> **Impact:**
>
> - **Internal connectivity traces may appear misaligned** when breadboard is rotated
> - Gold traces for power rails and terminal strips may not match rotated breadboard geometry
> - Educational value of X-ray mode may be reduced at non-zero angles
>
> **Required Verification:**
>
> 1. Enable X-ray mode with breadboard at 0° (default) — verify gold traces align correctly ✅ (confirmed by PR screenshots)
> 2. Rotate breadboard to 90° → enable X-ray mode → verify traces still align
> 3. Rotate breadboard to 180° → enable X-ray mode → verify traces still align
> 4. Rotate breadboard to 270° → enable X-ray mode → verify traces still align
> 5. Test with components placed → verify transparency effects work at all angles

## Task Objective

**Verify that visual overlays (voltage heatmap and X-ray mode) render correctly at all breadboard orientations (0°, 90°, 180°, 270°).**

If misalignment or rendering issues are discovered:

- Implement coordinate transformation for overlay rendering to match the breadboard rotation
- Ensure overlays align correctly with the rotated breadboard geometry
- Update documentation with verified behavior

## Detailed Instructions

### Phase 1: Verification Testing (Required First)

1. **Test X-Ray Mode at All Orientations**

   For each orientation (0°, 90°, 180°, 270°):

   a. Rotate breadboard to target orientation using the "🔄 Rotate Board" button

   b. Place several components on the breadboard (resistors, LEDs, wires) spanning multiple rows and columns

   c. Enable X-ray mode using the "X-Ray Mode" toggle

   d. Verify that:
   - Gold traces for 4 vertical power rails (columns 0, 1, 12, 13) align correctly with breadboard holes
   - Gold traces for 60 horizontal terminal strips (30 rows × 2 sides, 5 holes each) align correctly with breadboard holes
   - Internal connectivity overlay appears "behind" holes (correct depth perception)
   - Components and wires become transparent (50% opacity) and greyscale as expected

   e. Take screenshots showing X-ray mode at each orientation (especially if misalignment is visible)

   f. Document findings for each angle

2. **Test Voltage Heatmap at All Orientations**

   For each orientation (0°, 90°, 180°, 270°):

   a. Rotate breadboard to target orientation

   b. Load or create a circuit with voltage simulation enabled (e.g., power supply + resistor network)

   c. Run simulation to generate voltage values

   d. Observe voltage heatmap overlay rendering

   e. Verify that:
   - Voltage colors align with the correct net/connection points
   - Heatmap overlays appear on the correct holes and wires
   - Color gradients or voltage indicators match the logical circuit topology

   f. Take screenshots showing voltage heatmap at each orientation (especially if misalignment is visible)

   g. Document findings for each angle

3. **Create Testing Summary Document**

   Create or update a testing document (e.g., `OVERLAY_ROTATION_TESTING.md`) with:
   - Test results for each orientation
   - Screenshots demonstrating correct or incorrect rendering
   - List of specific issues discovered (if any)
   - Severity assessment for each issue

### Phase 2: Implementation (Only if Issues Found)

**If verification reveals rendering issues at non-zero angles:**

1. **Analyze Root Cause**

   Likely causes based on PR #309's mouse coordinate transformation work:
   - Overlay rendering uses canvas-relative coordinates without rotation transformation
   - CSS transform rotates the canvas container, but overlays render in un-rotated space
   - Overlays need inverse rotation transform (similar to mouse coordinate transformation)

2. **Review Existing Rotation Transform**

   Reference: `src/ui/breadboard-app.ts` lines ~2093-2146 (from PR #309)

   The `transformMouseCoordinates()` method applies inverse rotation:
   - **0°**: Identity (no transformation): `(x,y) → (x,y)`
   - **90°**: Inverse 90° CCW rotation: `(x,y) → (y,-x)`
   - **180°**: Inverse 180° rotation: `(x,y) → (-x,-y)`
   - **270°**: Inverse 90° CW rotation: `(x,y) → (-y,x)`

   This same transformation pattern may be needed for overlay coordinate calculations.

3. **Identify Overlay Rendering Code**

   Locate the rendering code for:

   **X-ray mode internal connectivity:**
   - File: `src/ui/pixi-renderer.ts`
   - Method: `renderInternalConnectivity()` (added in PR #321)
   - Renders gold traces for power rails and terminal strips

   **Voltage heatmap:**
   - File: Search for voltage heatmap rendering code (likely in `pixi-renderer.ts` or related files)
   - Look for code that draws voltage color overlays on nets/components

4. **Implement Coordinate Transformation for Overlays**

   **Option A: Apply CSS Transform to Overlay Container**
   - If overlays are rendered in a separate PixiJS container
   - Apply the same CSS rotation transform to overlay container as breadboard container
   - This keeps overlay rendering code unchanged

   **Option B: Transform Overlay Coordinates**
   - Modify overlay rendering to account for breadboard orientation
   - Before rendering overlay at position (x, y), apply inverse rotation transformation
   - Similar pattern to `transformMouseCoordinates()` from PR #309

   **Option C: Render Overlays in Logical Space**
   - Render overlays using logical grid positions (row, column) instead of pixel coordinates
   - Convert grid positions to pixels using existing `positionToPixels()` method
   - This approach is rotation-agnostic since grid positions don't change

   **Recommended Approach:** Option C (logical space rendering) is most robust and aligns with the data model design (breadboard orientation is a view transformation, not a data transformation).

5. **Implement Fixes with Minimal Changes**

   For X-ray mode internal connectivity:

   ```typescript
   // Example approach - render using logical positions
   private renderInternalConnectivity(): void {
     const overlay = new Graphics();
     const traceColor = 0xFFD700;
     overlay.alpha = 0.8;

     // Render vertical power rails using logical column positions
     const railColumns = [0, 1, 12, 13];
     for (const col of railColumns) {
       for (let row = 0; row < 30; row++) {
         const pos = { row, column: col };
         const pixels = this.positionToPixels(pos);
         // Render rail segment at pixels.x, pixels.y
         // positionToPixels() handles rotation internally via canvas transform
       }
     }

     // Render horizontal terminal strips using logical row/column positions
     // Similar pattern: use logical positions, convert to pixels
   }
   ```

   For voltage heatmap:
   - Apply the same pattern: use logical net/component positions
   - Convert to pixels for rendering
   - Let canvas transform handle rotation

6. **Test Fixes at All Orientations**

   After implementing fixes:
   - Repeat Phase 1 verification testing
   - Confirm overlays now align correctly at all angles (0°, 90°, 180°, 270°)
   - Take "after" screenshots showing correct alignment

### Phase 3: Documentation

1. **Update Testing Guide**

   Update or create `OVERLAY_ROTATION_TESTING.md` with:
   - Verified behavior: overlays work correctly at all orientations
   - Testing checklist for future overlay features
   - Screenshots demonstrating correct rendering at each angle

2. **Update Actions File**

   Add a new section to `planning/reviews/review-2026-01-08.actions.md`:

   ```markdown
   ## PR #XXX: Verify and fix visual overlays at rotated breadboard angles

   **Merged:** [date]  
   **Branch:** [branch name]  
   **Files changed:** [files]  
   **Changes:** [summary]

   ### Review Items Addressed

   This PR fully resolves the **Known Limitation #2** from PR #303 follow-up work (lines 1101-1150) regarding visual overlay rendering at non-zero breadboard orientations.

   #### Verification Results

   - X-ray mode at 0°: [result]
   - X-ray mode at 90°: [result]
   - X-ray mode at 180°: [result]
   - X-ray mode at 270°: [result]
   - Voltage heatmap at 0°: [result]
   - Voltage heatmap at 90°: [result]
   - Voltage heatmap at 180°: [result]
   - Voltage heatmap at 270°: [result]

   #### Implementation (if fixes were needed)

   [Describe fixes implemented]

   #### Results

   - ✅ Visual overlays verified to work correctly at all breadboard orientations
   - ✅ X-ray mode internal connectivity traces align with rotated breadboard
   - ✅ Voltage heatmap overlays align with rotated circuit topology
   - ✅ Educational value of overlays preserved at all angles
   ```

## Priority and Scope

**Priority:** MEDIUM (per actions file lines 1150)

**Scope:** Testing and potential rendering fixes

**Estimated Complexity:**

- If no issues found: LOW (testing + documentation only)
- If issues found: MEDIUM (coordinate transformation similar to PR #309)

**Batch Reasoning:**

This task addresses a single, related concern: visual overlay rendering at rotated breadboard angles. Both X-ray mode and voltage heatmap are visual overlays that share the same root cause (absolute pixel coordinates + CSS rotation). They should be tested and fixed together in one PR to maintain coherent state.

This is separate from the other unaddressed item (Section 5.2: individual leg repositioning), which is a much larger feature requiring data model changes and is deferred.

## Success Criteria

**For verification-only outcome:**

- [ ] X-ray mode tested at 0°, 90°, 180°, 270° orientations
- [ ] Voltage heatmap tested at 0°, 90°, 180°, 270° orientations
- [ ] Screenshots captured showing overlay behavior at each angle
- [ ] Testing document created with verified behavior
- [ ] No rendering issues discovered, or issues are documented as known limitations

**For verification + fixes outcome:**

- [ ] All verification criteria above
- [ ] Rendering issues identified and root cause analyzed
- [ ] Fixes implemented using minimal code changes (surgical approach)
- [ ] Overlays verified to align correctly at all angles after fixes
- [ ] "After" screenshots demonstrate correct alignment
- [ ] Code changes follow existing patterns (e.g., logical space rendering or coordinate transformation)
- [ ] Actions file updated with PR details

## Constraints

1. **Do not modify rendering behavior when breadboard is at 0° (default orientation)**
   - Existing rendering is correct at 0°; preserve it
2. **Do not change data models or circuit topology**
   - Breadboard orientation is a view transformation only
   - Circuit save/load format unchanged
3. **Maintain educational value of overlays**
   - X-ray mode must clearly show internal connections at all angles
   - Voltage heatmap must accurately represent circuit voltages at all angles
4. **Follow PR #309 patterns for coordinate transformations**
   - If coordinate transformation is needed, follow established patterns
   - Use inverse rotation matrices consistent with mouse coordinate transformation
5. **Testing before implementation**
   - Always verify the issue exists before implementing fixes
   - Document what works and what doesn't at each orientation
6. **Minimal changes**
   - If fixes are needed, make surgical, focused changes
   - Do not refactor unrelated rendering code

## Related Work

- **PR #303**: Implemented breadboard rotation controls (introduced the limitation)
- **PR #309**: Fixed mouse coordinate transformation for rotated interactions (established transformation patterns)
- **PR #321**: Implemented X-ray mode with internal connectivity visualization (one of the overlays to verify)
- **Known voltage heatmap feature**: Existing overlay system (other overlay to verify)

## Notes

- This task is **verification-first**: testing may reveal that overlays already work correctly at all angles, in which case only documentation is needed
- If issues are found, the fix should follow the successful pattern from PR #309 (coordinate transformation)
- The most robust fix is likely rendering overlays in logical grid space (row/column positions) and letting `positionToPixels()` handle the transformation
- This task completes the follow-up work from the breadboard rotation feature implementation
