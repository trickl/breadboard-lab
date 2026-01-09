# Mouse Coordinate Transformation Testing Guide

## Overview

This document describes the implementation of mouse coordinate transformation for rotated breadboard interactions and provides a comprehensive testing checklist.

## Implementation Summary

### What Was Fixed

The breadboard rotation feature (0°/90°/180°/270°) was previously applying CSS transforms to the canvas container, but mouse event coordinates were not being transformed back to logical breadboard space. This caused all mouse interactions to fail at non-zero rotation angles.

### Solution

Implemented inverse rotation matrix transformation that converts mouse coordinates from rotated canvas space back to logical breadboard space:

- **0°**: No transformation (identity)
- **90°**: Inverse 90° CCW rotation: `(x,y) → (y,-x)`
- **180°**: Inverse 180° rotation: `(x,y) → (-x,-y)`
- **270°**: Inverse 90° CW rotation: `(x,y) → (-y,x)`

### Files Modified

1. **src/ui/breadboard-app.ts**:
   - Added `transformMouseCoordinates()` method (lines ~2082-2145)
   - Updated 6 mouse event handlers to apply transformation:
     - `handleComponentDragStart()`
     - `updateDragPreview()`
     - `updateFloatingComponentDragPreview()`
     - `handleFloatingComponentDragStart()`
     - `handleConnectionEndpointDragStart()`
     - `updateConnectionRerouteDragPreview()`

2. **src/ui/pixi-renderer.ts**:
   - Verified `getCanvas()` method exists (already present at line 162)

## Manual Testing Checklist

### Prerequisites

1. Build and run the application:
   ```bash
   npm install
   npm run dev
   ```

2. Open the application in a browser (typically http://localhost:5173)

### Test Scenarios

For **each orientation** (0°, 90°, 180°, 270°), perform the following tests:

#### 1. Hole Selection and Highlighting

- [ ] **0°**: Hover over various breadboard holes
  - Verify hover highlight appears at cursor location
  - Verify correct hole coordinates shown in tooltip/info

- [ ] **90°**: Click "🔄 Rotate Board" button once
  - Hover over holes in all quadrants
  - Verify highlights follow cursor accurately
  - Verify clicking selects the hole under cursor

- [ ] **180°**: Click "🔄 Rotate Board" button again
  - Repeat hover and click tests
  - Verify hole selection is accurate

- [ ] **270°**: Click "🔄 Rotate Board" button again
  - Repeat hover and click tests
  - Verify hole selection is accurate

#### 2. Component Placement from Quick Select

- [ ] **At each orientation** (0°, 90°, 180°, 270°):
  - Click a component in the Quick Select bar (e.g., Resistor)
  - Move mouse over breadboard
  - Verify floating component preview follows cursor
  - Move to different areas (top-left, top-right, bottom-left, bottom-right)
  - Click to place component
  - Verify component places at cursor location
  - Verify component legs snap to correct holes

#### 3. Component Dragging

- [ ] **At each orientation**:
  - Place a component (resistor or LED)
  - Click and drag the component
  - Verify component follows cursor during drag
  - Drag horizontally, vertically, and diagonally
  - Release to place
  - Verify component snaps to correct grid position
  - Verify component places where you expect

#### 4. Wire Routing (if using two-click wire placement)

- [ ] **At each orientation**:
  - Select Wire from component list
  - Click a hole to start wire
  - Move cursor to route wire
  - Verify wire preview follows cursor
  - Click destination hole
  - Verify wire connects to the correct holes

#### 5. Wire Connection Rerouting (if Rete.js interactive mode enabled)

- [ ] **At each orientation**:
  - Select an existing wire/connection
  - Drag a wire endpoint
  - Verify endpoint follows cursor
  - Move to different holes
  - Release to reconnect
  - Verify wire reconnects to the hole under cursor

#### 6. Edge Cases

- [ ] **Near canvas edges**:
  - Test interactions near all four edges at each rotation
  - Verify coordinates transform correctly even at edges

- [ ] **Rapid rotation changes**:
  - Rotate breadboard multiple times quickly
  - Place a component after each rotation
  - Verify interactions remain accurate

- [ ] **After window resize**:
  - Resize browser window
  - Rotate breadboard
  - Verify interactions still work correctly

### Expected Results

✅ **All interactions should work identically at every orientation**

The user should not be able to tell that there is a coordinate transformation happening - interactions should feel natural regardless of breadboard rotation.

### Known Working Configuration

This implementation was tested with:
- Canvas dimensions are dynamic (based on breadboard layout)
- Transformation uses `getBoundingClientRect()` for accurate canvas dimensions
- Center point calculated as `(width/2, height/2)`
- Transformation applied before all coordinate-dependent operations (snapping, hit detection)

## Automated Testing

### Unit Tests

The existing unit tests in `src/ui/__tests__/breadboard-app.test.ts` continue to pass because:
- Tests use the public API (e.g., `placeComponentInteractive()`)
- Coordinate transformation is internal implementation detail
- Tests don't depend on specific mouse coordinate values

### Visual Tests

If adding Playwright visual tests for rotation:

```typescript
test('interactions work at 90° rotation', async ({ page }) => {
  await page.goto('/');
  
  // Rotate breadboard to 90°
  await page.click('#rotate-board-btn');
  
  // Place a component
  await page.click('.quick-select-resistor');
  await page.click('#breadboard', { position: { x: 400, y: 300 } });
  
  // Verify component was placed
  const components = await page.evaluate(() => {
    return window.app.getComponents();
  });
  expect(components.length).toBe(1);
});
```

## Debugging

If interactions seem inaccurate at a specific rotation:

1. **Check canvas dimensions**:
   - Open browser dev tools
   - Inspect the canvas element
   - Verify `getBoundingClientRect()` returns expected dimensions

2. **Verify transformation is being called**:
   - Add console.log in `transformMouseCoordinates()`:
     ```typescript
     console.log(`Transform: orientation=${orientation}, input=(${mouseX},${mouseY}), output=(${result.x},${result.y})`);
     ```

3. **Check breadboardOrientation state**:
   - Verify `this.breadboardOrientation` matches the visual rotation
   - Should be 0, 90, 180, or 270

4. **Verify CSS transform matches**:
   - Check canvas parent's computed style
   - Should have `transform: rotate(${orientation}deg)`

## Future Enhancements

Potential improvements not included in this implementation:

1. **Touch event support**:
   - Current implementation handles MouseEvent
   - Touch events would need similar transformation using `touches[0].clientX/Y`

2. **Nested transform support**:
   - If additional CSS transforms are added to parent elements
   - Would need to account for cumulative transformation matrix

3. **Performance optimization**:
   - Cache canvas rect if dimensions don't change frequently
   - Avoid `getBoundingClientRect()` on every mouse move

## Troubleshooting

### Issue: Interactions still inaccurate at 90°

**Check**: Are you using the latest code with all 6 handlers updated?

**Verify**: All handlers that use `event.clientX` or `globalX` should have transformation applied

### Issue: Coordinates off by a constant offset

**Check**: Is the CSS rotation being applied to the correct container?

**Verify**: The rotation should be on the canvas parent, not the canvas itself

### Issue: Center interactions work but edges are off

**Check**: Is `getBoundingClientRect()` returning the rotated or unrotated dimensions?

**Note**: At 90°/270°, the bounding rect dimensions swap (width↔height). The transformation uses the rect dimensions, which is correct.

## References

- **Original Issue**: [Fix mouse coordinate transformation for rotated breadboard interactions](../planning/issue_queue/processed/review-fix-mouse-coordinate-transformation-for-rotated-breadboard.md)
- **Review Document**: `planning/reviews/review-2026-01-08.actions.md` (lines 859-881)
- **PR Context**: This addresses the known limitation from PR #303

## Contact

If you encounter issues with this implementation, please file an issue with:
- Orientation angle when issue occurs
- Specific interaction that fails (e.g., "component drag at 180°")
- Expected vs actual behavior
- Browser and OS information
