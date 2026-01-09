Implement Component Rotation and Breadboard Orientation Controls

## Source Review
`planning/reviews/review-2026-01-08.md` — Section 6: Rotation & Orientation (lines 123-134)

## Review Items Addressed

This task fully implements **Section 6: Rotation & Orientation** from the 2026-01-08 review, which is listed under "High Priority UX Improvements" in Section 12.

### Section 6.1: Component Rotation (lines 125-126)

**Original Issues:**
- ❌ "There is **no obvious way to rotate components**"
- ❌ "Rotation is essential for realistic placement"

**Requirements:**
- Add UI affordances for component rotation
- Support multiple rotation triggers:
  - Keyboard shortcut (R key) for selected components
  - On-screen rotate handle/button when component is selected
  - Touch-friendly rotation control for mobile/tablet users
- Rotation should work in 90° increments (0° / 90° / 180° / 270°)
- Visual feedback during rotation (preview ghost/outline)
- Rotation must preserve pin positions relative to component body
- Rotation must update electrical netlist connections correctly

**Implementation Details:**

1. **Keyboard Rotation (R Key):**
   - When a component is selected, pressing 'R' rotates it 90° clockwise
   - Add keyboard event handler to BreadboardApp
   - Only active when a component is selected (not during drag, not on multiple selection)
   - Provides quickest rotation method for power users

2. **On-Screen Rotation Handle:**
   - When a component is selected, display a small circular rotation button/handle
   - Position handle at top-right corner of component bounding box (or appropriate position)
   - Clicking handle rotates component 90° clockwise
   - Handle should be visually distinct (rotation icon: ↻ or similar)
   - Handle should have hover state for discoverability

3. **Touch-Friendly Rotation:**
   - Rotation handle must be large enough for touch targets (min 44×44px touch area)
   - Consider two-finger rotation gesture as enhancement (optional, defer if complex)
   - Ensure rotation works reliably on touch devices

4. **Rotation Data Model:**
   - Add `rotation` property to component state (0, 90, 180, 270)
   - Update PixiRenderer to apply rotation transform when rendering components
   - Ensure pin positions are calculated correctly after rotation
   - Update netlist generation to account for rotated pin positions

5. **Visual Feedback:**
   - Show rotation angle indicator during rotation (e.g., "90°" label)
   - Optional: show ghost/outline preview of rotated component position
   - Ensure component visual updates immediately after rotation

6. **Constraints & Validation:**
   - Some components may have rotation constraints (e.g., power supplies are directional)
   - Rotation should be undoable (integrate with undo/redo system)
   - Rotation should not break existing wire connections (maintain electrical connectivity)
   - If rotation would cause collision or invalid placement, either prevent rotation or show error

### Section 6.2: Breadboard Orientation (lines 128-134)

**Original Issues:**
- ❌ "The breadboard is currently oriented vertically (portrait)"
- ❌ "This is unusual; most breadboards are shown horizontally (landscape)"

**Requirements:**
- Add a button in the main pane to rotate the entire breadboard canvas
- Support rotation in 90° increments (90 / 180 / 270 / 360)
- Breadboard orientation is a **view transformation**, not a data model change
- All components and wires rotate with the breadboard
- Breadboard orientation persists across sessions (save to localStorage or circuit file)

**Implementation Details:**

1. **Breadboard Rotation Button:**
   - Add button in top toolbar or main canvas controls
   - Button icon: rotation symbol (↻ 90°) or breadboard icon with rotation indicator
   - Button label: "Rotate Board" or "Board Orientation"
   - Clicking button rotates breadboard 90° clockwise
   - Button should show current orientation angle (0° / 90° / 180° / 270°)

2. **View Transformation:**
   - Apply CSS transform or canvas rotation to entire breadboard container
   - Rotation is purely visual; data model coordinates remain unchanged (row/column system stays fixed)
   - Update mouse coordinate transformations to account for breadboard rotation
   - Ensure hit detection works correctly after rotation

3. **Coordinate Mapping:**
   - Mouse events must be transformed from rotated canvas space to logical breadboard space
   - Pin positions, hole positions, and wire routing must account for rotation
   - Snap-to-grid calculations must work correctly regardless of orientation

4. **Persistence:**
   - Save breadboard orientation angle to localStorage (`breadboard_orientation`)
   - Restore orientation on app load
   - Include orientation in circuit save/load JSON (optional, for portability)

5. **UI/UX Considerations:**
   - Rotation should feel smooth (CSS transition or animation)
   - Rotation should not disrupt user workflow (don't reset selection, don't clear undo history)
   - Rotation button should be easily discoverable but not intrusive
   - Consider adding orientation to "View Controls" section if reorganizing right sidebar

6. **Edge Cases:**
   - Ensure rotation works with all breadboard sizes (half, full, custom)
   - Ensure rotation works with power rails visible/hidden
   - Ensure voltage heatmap overlays rotate correctly with breadboard
   - Ensure X-ray mode visual overlays rotate correctly

## Acceptance Criteria

### Component Rotation:
- [ ] Selected components can be rotated via 'R' key
- [ ] Selected components show rotation handle when selected
- [ ] Rotation handle is clickable and rotates component 90° clockwise
- [ ] Rotation handle is touch-friendly (≥44×44px touch target)
- [ ] Component visual updates immediately after rotation
- [ ] Pin positions are recalculated correctly after rotation
- [ ] Wire connections are preserved after component rotation
- [ ] Rotation is undoable via undo system
- [ ] Rotation works for all component types (resistors, LEDs, power supplies, etc.)

### Breadboard Orientation:
- [ ] Breadboard rotation button is visible and discoverable
- [ ] Clicking button rotates breadboard 90° clockwise
- [ ] Breadboard can rotate through all four orientations (0° / 90° / 180° / 270°)
- [ ] Mouse interactions work correctly at all orientations (clicking holes, dragging components)
- [ ] Wire routing renders correctly at all orientations
- [ ] Voltage heatmap overlays rotate with breadboard
- [ ] X-ray mode overlays rotate with breadboard
- [ ] Breadboard orientation persists across page reloads (localStorage)
- [ ] Rotation animation is smooth and non-disruptive

### Constraints:
- [ ] No changes to data model row/column coordinate system (orientation is view-only)
- [ ] All existing functionality preserved (drag-and-drop, wire routing, selection, etc.)
- [ ] No breaking changes to circuit save/load format
- [ ] All existing tests pass
- [ ] Code linting passes

## Implementation Approach

### Phase 1: Component Rotation Foundation
1. Add `rotation` property to component state (in data model)
2. Update PixiRenderer to apply rotation transform to component containers
3. Update pin position calculation to account for rotation
4. Add keyboard event handler for 'R' key rotation
5. Test rotation with simple components (resistors, LEDs)

### Phase 2: Rotation UI Affordances
1. Add rotation handle rendering to selected components
2. Implement click handler for rotation handle
3. Style rotation handle with hover states and touch-friendly sizing
4. Add rotation angle indicator during rotation
5. Test rotation handle interaction (mouse and touch)

### Phase 3: Rotation Validation & Integration
1. Integrate rotation with undo/redo system
2. Ensure wire connections update correctly after rotation
3. Test rotation with all component types
4. Handle rotation constraints (if any components have them)
5. Verify netlist generation works correctly with rotated components

### Phase 4: Breadboard Orientation
1. Add breadboard rotation button to UI (top toolbar or view controls)
2. Implement breadboard rotation transform (CSS or canvas)
3. Update mouse coordinate transformations for rotated breadboard
4. Test hit detection and interactions at all orientations
5. Implement orientation persistence (localStorage)

### Phase 5: Orientation Visual Consistency
1. Ensure voltage heatmap overlays rotate with breadboard
2. Ensure X-ray mode overlays rotate with breadboard
3. Test with power rails visible/hidden
4. Verify all visual overlays align correctly at all orientations

### Phase 6: Testing & Polish
1. Test component rotation with complex circuits
2. Test breadboard orientation with large circuits
3. Test on touch devices (rotation handle touch target size)
4. Test keyboard shortcuts (R key) in various contexts
5. Verify no regressions in existing functionality

## Refactor Safety Rules (Mandatory)

If this task requires moving code across files:
1. Move code **verbatim** into new location first
2. Update imports/call sites to make it run
3. Fix visibility, scope, parameterization on migrated code
4. Only then do targeted improvements

## Constraints (Mandatory)

1. **Do not change logic** unless identified as clear bug
2. **Do not maintain legacy endpoints** for backwards compatibility
3. **Always delete unused code** left over from changes
4. **Do not leave comments** on changes made within code
5. **Do not rewrite functions from scratch** during refactors
6. **Ensure all tests and linting pass** after each change

## Technical Notes

### Component Rotation Implementation

The component rotation feature requires changes to:
- **Data Model:** Add `rotation` field to ComponentState (0 | 90 | 180 | 270)
- **Renderer:** Apply rotation transform in PixiRenderer.renderComponent()
- **Pin Calculation:** Rotate pin offsets based on component rotation
- **Event Handlers:** Add keyboard and click handlers for rotation triggers
- **Undo/Redo:** Add RotateComponentAction to undo system

### Breadboard Orientation Implementation

The breadboard orientation feature requires changes to:
- **View Transform:** Apply rotation to breadboard container (CSS transform or PixiJS rotation)
- **Coordinate Mapping:** Transform mouse events from rotated canvas space to logical breadboard space
- **Persistence:** Save/restore orientation to localStorage
- **UI:** Add rotation button to toolbar or view controls

### Coordinate System Invariants

**CRITICAL:** Breadboard orientation is a **view transformation only**. The underlying data model coordinate system (rows/columns) must remain unchanged:
- Row 0 is always the top row (data model)
- Column A is always the left column (data model)
- When breadboard is rotated 90°, visual rendering rotates but data model stays fixed
- Mouse clicks must be transformed from rotated view space to data model space

This ensures:
- Circuit save/load files are orientation-independent
- Netlist generation is orientation-independent
- Undo/redo works correctly regardless of orientation

### Testing Strategy

**Unit Tests:**
- Test component rotation state transitions (0° → 90° → 180° → 270° → 0°)
- Test pin position calculation with rotation
- Test coordinate transformations for breadboard orientation

**Integration Tests:**
- Test component rotation with wire connections
- Test breadboard orientation with complex circuits
- Test undo/redo with rotation operations

**Manual Tests:**
- Test rotation handle on touch devices
- Test keyboard shortcut in various contexts
- Test visual overlays at all breadboard orientations

## Related Files (Likely to Change)

- `src/ui/breadboard-app.ts` — Add rotation event handlers and state management
- `src/ui/pixi-renderer.ts` — Apply rotation transforms to components and breadboard
- `src/model/component.ts` — Add rotation property to component data model
- `src/style.css` — Style rotation handle and breadboard rotation button
- `src/ui/undo-redo.ts` — Add RotateComponentAction (if undo system is separate)
- Tests for rotation functionality

## Priority Justification

This task addresses **High Priority UX Improvements** from the review (Section 12, lines 222-227). Component rotation is essential for realistic breadboard usage, and breadboard orientation addresses a common user expectation (landscape orientation).

The review explicitly states:
> "Rotation is essential for realistic placement" (line 126)
> "Most breadboards are shown horizontally (landscape)" (line 130)

This is the next logical task after resolving blocking issues (PRs #285, #291, #297).
