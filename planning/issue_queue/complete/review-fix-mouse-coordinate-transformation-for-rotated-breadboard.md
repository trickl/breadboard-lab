Fix mouse coordinate transformation for rotated breadboard interactions

## Source Review

`planning/reviews/review-2026-01-08.md` - Section 6 follow-up requirement

## Review Items Addressed

This task addresses the **critical limitation** explicitly documented in PR #303's known limitations section within `review-2026-01-08.actions.md` (lines 859-881).

### Background

PR #303 successfully implemented breadboard orientation controls (0°/90°/180°/270° rotation) and component rotation handles. However, it documented a **HIGH PRIORITY** limitation:

> **Mouse Coordinate Transformations Not Implemented ⚠️**
>
> - Breadboard rotation applies CSS transform to canvas container
> - Mouse event coordinates are in rotated canvas space
> - App logic expects coordinates in logical breadboard space (0° orientation)
> - No transformation currently implemented
>
> **Impact:** Interactions at non-zero breadboard angles do not work correctly. Clicking holes, dragging components, routing wires will have incorrect positions.

This limitation makes the rotation feature **unusable in practice**. Users can rotate the breadboard, but cannot interact with it at non-zero angles.

### Critical Priority Justification

This is the **most urgent** unaddressed item from the review because:

1. **Feature is already shipped but broken**: PR #303 merged rotation controls, but they don't work for interactions
2. **Clear technical requirement**: The fix is well-defined (inverse rotation transform for mouse coordinates)
3. **Blocks user workflow**: Users cannot use the breadboard in landscape orientation (90°), which the review identified as the more natural orientation
4. **Cascading issue**: All mouse interactions are affected - clicking holes, dragging components, routing wires, selecting elements

### Specific Review Item Referenced

From `review-2026-01-08.actions.md` (lines 859-881):

**Issue:**

- Breadboard rotation applies CSS transform to canvas container
- Mouse event coordinates are in rotated canvas space
- App logic expects coordinates in logical breadboard space (0° orientation)
- No transformation currently implemented

**Impact:**

- Interactions at non-zero breadboard angles do not work correctly
- Clicking holes, dragging components, routing wires have incorrect positions
- Offset/rotation depends on angle (90°/180°/270° each need different transforms)

**Example:**

- At 90° rotation: mouse (100, 200) in rotated space needs to map to logical coordinates
- Requires inverse rotation matrix: `[x', y'] = rotate([x, y], -90°)`
- Must also account for canvas dimensions and center point

**Required Fix:**

- Add `transformMouseCoordinates(mouseX, mouseY, orientation)` method
- Apply inverse rotation to all mouse event handlers
- Transform before hit detection, snapping, and position calculations

---

## Detailed Implementation Instructions

### Goal

Enable all mouse interactions to work correctly when the breadboard is rotated to 90°, 180°, or 270°.

### Technical Approach

The breadboard rotation feature applies a CSS `transform: rotate()` to the canvas container. This creates a coordinate space mismatch:

- **Canvas Space**: Mouse event coordinates after CSS rotation (what the browser reports)
- **Logical Space**: The underlying breadboard grid coordinate system (what the app logic expects)

We need to transform coordinates from canvas space to logical space using an **inverse rotation matrix**.

### Step 1: Implement Coordinate Transformation Method

Create a method `transformMouseCoordinates(mouseX: number, mouseY: number, orientation: 0 | 90 | 180 | 270): { x: number, y: number }` in `breadboard-app.ts`.

**Location**: Add as a utility method near other coordinate conversion methods.

**Algorithm**:

1. Get canvas element and its bounding rectangle
2. Calculate mouse position relative to canvas center:
   - `centerX = canvasRect.width / 2`
   - `centerY = canvasRect.height / 2`
   - `relX = mouseX - centerX`
   - `relY = mouseY - centerY`

3. Apply inverse rotation based on orientation:
   - **0°**: No transformation: `(relX, relY)`
   - **90°**: Inverse is -90° rotation: `(relY, -relX)`
   - **180°**: Inverse is -180° rotation: `(-relX, -relY)`
   - **270°**: Inverse is -270° (or +90°) rotation: `(-relY, relX)`

4. Convert back to canvas-absolute coordinates:
   - `logicalX = transformedRelX + centerX`
   - `logicalY = transformedRelY + centerY`

**Implementation**:

```typescript
/**
 * Transform mouse coordinates from rotated canvas space to logical breadboard space.
 *
 * The breadboard can be rotated via CSS transform, which changes the coordinate space
 * of mouse events. This method applies the inverse rotation to map canvas coordinates
 * back to logical breadboard coordinates.
 *
 * @param mouseX - Mouse X coordinate in canvas space (after CSS rotation)
 * @param mouseY - Mouse Y coordinate in canvas space (after CSS rotation)
 * @param orientation - Current breadboard rotation angle (0, 90, 180, or 270 degrees)
 * @returns Transformed coordinates in logical breadboard space
 */
private transformMouseCoordinates(
  mouseX: number,
  mouseY: number,
  orientation: 0 | 90 | 180 | 270
): { x: number; y: number } {
  // No transformation needed at 0°
  if (orientation === 0) {
    return { x: mouseX, y: mouseY };
  }

  // Get canvas dimensions
  const canvas = this.renderer.getCanvas();
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Convert to center-relative coordinates
  const relX = mouseX - centerX;
  const relY = mouseY - centerY;

  // Apply inverse rotation
  let transformedRelX: number;
  let transformedRelY: number;

  switch (orientation) {
    case 90:
      // Inverse of 90° CW is 90° CCW: (x,y) -> (y,-x)
      transformedRelX = relY;
      transformedRelY = -relX;
      break;
    case 180:
      // Inverse of 180°: (x,y) -> (-x,-y)
      transformedRelX = -relX;
      transformedRelY = -relY;
      break;
    case 270:
      // Inverse of 270° CW (or 90° CCW) is 90° CW: (x,y) -> (-y,x)
      transformedRelX = -relY;
      transformedRelY = relX;
      break;
    default:
      transformedRelX = relX;
      transformedRelY = relY;
  }

  // Convert back to canvas-absolute coordinates
  return {
    x: transformedRelX + centerX,
    y: transformedRelY + centerY,
  };
}
```

### Step 2: Add Canvas Accessor to PixiRenderer

The `transformMouseCoordinates` method needs access to the canvas element. Add a getter to `pixi-renderer.ts`:

**Location**: Add as a public method in the PixiRenderer class.

```typescript
/**
 * Get the canvas element for coordinate calculations.
 */
public getCanvas(): HTMLCanvasElement {
  return this.app.canvas;
}
```

### Step 3: Apply Transformation to All Mouse Event Handlers

Identify all mouse event handlers that process canvas-relative coordinates and apply the transformation. These handlers are in `breadboard-app.ts`:

**Handlers that need transformation**:

1. **`handleCanvasClick(e: MouseEvent)`** (lines ~1451-1494)
   - Used for: hole selection, component spawning placement, wire endpoint selection
   - Transform: `{ x, y } = this.transformMouseCoordinates(e.offsetX, e.offsetY, this.breadboardOrientation)`
   - Replace all usages of `e.offsetX` and `e.offsetY` with transformed coordinates

2. **`handleCanvasMouseMove(e: MouseEvent)`** (lines ~1496-1569)
   - Used for: drag preview updates, hover states, wire routing preview
   - Transform: `{ x, y } = this.transformMouseCoordinates(e.offsetX, e.offsetY, this.breadboardOrientation)`
   - Replace all usages of `e.offsetX` and `e.offsetY` with transformed coordinates

3. **`handleComponentDragStart(componentId: string, e: MouseEvent)`** (lines ~1604-1647)
   - Used for: calculating drag offset when starting to drag a component
   - Transform: `{ x, y } = this.transformMouseCoordinates(e.offsetX, e.offsetY, this.breadboardOrientation)`
   - Use transformed coordinates for `mouseX` and `mouseY` variables

4. **`handleComponentDrag(e: MouseEvent)`** (lines ~1649-1706)
   - Used for: updating component position during drag
   - Transform: `{ x, y } = this.transformMouseCoordinates(e.offsetX, e.offsetY, this.breadboardOrientation)`
   - Use transformed coordinates for `mouseX` and `mouseY` variables

5. **`handleWireDrag(e: MouseEvent)`** (lines ~1904-1942)
   - Used for: updating wire control point during drag
   - Transform: `{ x, y } = this.transformMouseCoordinates(e.offsetX, e.offsetY, this.breadboardOrientation)`
   - Use transformed coordinates for `mouseX` and `mouseY` variables

**Pattern for each handler**:

```typescript
// Before:
handleSomeMouseEvent(e: MouseEvent) {
  const mouseX = e.offsetX;
  const mouseY = e.offsetY;
  // ... rest of logic
}

// After:
handleSomeMouseEvent(e: MouseEvent) {
  const { x: mouseX, y: mouseY } = this.transformMouseCoordinates(
    e.offsetX,
    e.offsetY,
    this.breadboardOrientation
  );
  // ... rest of logic (unchanged)
}
```

### Step 4: Verify Downstream Dependencies

Ensure that no other code assumes untransformed coordinates. Check:

- ✅ `snapToGrid()` - receives pixels, returns grid positions (no changes needed)
- ✅ `pixelsToPosition()` - receives pixels, returns grid positions (no changes needed)
- ✅ `positionToPixels()` - receives grid positions, returns pixels (no changes needed)
- ✅ Hit detection in PixiRenderer - operates on logical coordinates (no changes needed)

All coordinate conversion methods already work in logical space, so they don't need changes.

### Step 5: Testing Strategy

**Manual Testing Checklist** (test at each orientation: 0°, 90°, 180°, 270°):

1. **Hole Selection**:
   - Click various breadboard holes
   - Verify hover highlights appear at correct location
   - Verify clicks select the hole under the cursor

2. **Component Placement from Quick Select**:
   - Click Quick Select item to spawn floating component
   - Move mouse over breadboard
   - Verify ghost preview follows cursor accurately
   - Click to place component
   - Verify component places at cursor location

3. **Component Dragging**:
   - Drag existing components
   - Verify component follows cursor during drag
   - Verify component snaps to correct grid position on drop
   - Test horizontal, vertical, and diagonal drags

4. **Wire Routing**:
   - Click hole to start wire
   - Move cursor to route wire
   - Verify wire path follows cursor
   - Click destination hole
   - Verify wire connects to correct holes

5. **Wire Control Point Dragging**:
   - Select wire and drag control point
   - Verify control point follows cursor
   - Verify wire reroutes correctly

6. **Component Selection**:
   - Click components at various locations
   - Verify correct component is selected
   - Verify selection highlight appears at correct location

**Test Circuit Recommendation**:

Load or create a simple circuit:

- 2-3 components (resistor, LED)
- 2-3 wires with bend points
- Test at 0° (baseline), then rotate and verify same interactions work at 90°, 180°, 270°

**Edge Cases**:

- Test near canvas edges (ensure center-relative math handles edge cases)
- Test after window resize (ensure bounding rect is fresh)
- Test rapid orientation changes (ensure transforms stay synchronized)

### Step 6: Known Limitations to Document

After implementing, document any remaining limitations:

1. **Touch events**: This implementation uses `MouseEvent.offsetX/offsetY`. Touch events may need separate handling using `getBoundingClientRect()` + `touches[0].clientX/Y`.

2. **Canvas resize**: If canvas dimensions change while breadboard is rotated, transformation may need recalibration. Current implementation calculates center on each call, so it should handle this correctly.

3. **Nested rotations**: If additional CSS transforms are added to parent elements, they may need to be accounted for. Current implementation assumes only the single breadboard rotation transform.

---

## Implementation Constraints

Following the task template's mandatory constraints:

1. **Do not change logic**: The coordinate transformation is purely a fix for existing rotation feature, not a logic change
2. **Do not maintain legacy endpoints**: No API changes involved
3. **Delete unused code**: No unused code to delete in this task
4. **No comments on changes**: Add only the JSDoc comment on the new method (standard for new methods)
5. **No rewrites**: All handlers retain their existing logic; only coordinate source changes
6. **Tests and linting**: Run existing tests to verify no regressions

---

## Acceptance Criteria

✅ All mouse interactions work correctly at 0° (unchanged behavior)
✅ All mouse interactions work correctly at 90°, 180°, 270°
✅ Hole selection accurate at all orientations
✅ Component dragging accurate at all orientations
✅ Wire routing accurate at all orientations
✅ Component placement from Quick Select accurate at all orientations
✅ Wire control point dragging accurate at all orientations
✅ No regressions in existing functionality
✅ All existing tests pass
✅ Manual testing confirms accuracy at all orientations

---

## Files to Modify

1. **`src/ui/breadboard-app.ts`**:
   - Add `transformMouseCoordinates()` method
   - Update `handleCanvasClick()` - apply transformation
   - Update `handleCanvasMouseMove()` - apply transformation
   - Update `handleComponentDragStart()` - apply transformation
   - Update `handleComponentDrag()` - apply transformation
   - Update `handleWireDrag()` - apply transformation

2. **`src/ui/pixi-renderer.ts`**:
   - Add `getCanvas()` public method

**Estimated changes**: ~80-100 lines added/modified across 2 files

---

## Related Context

- **Original Issue**: Review document Section 6.2 identified breadboard rotation as essential
- **PR #303**: Implemented rotation controls but documented coordinate transformation limitation
- **Actions Document**: Lines 859-881 explicitly call this out as HIGH PRIORITY follow-up work
- **Priority Level**: CRITICAL - Feature is shipped but interactions are broken at non-zero angles

---

## Notes

- This is a **technical fix**, not a feature addition
- The mathematical approach is well-defined (inverse rotation matrix)
- Changes are localized to coordinate processing in mouse handlers
- No data model, rendering, or UI changes required
- The fix unblocks the breadboard rotation feature for actual use
- After this PR, users can work in landscape orientation (90°), which the review identified as more natural than the current vertical orientation
