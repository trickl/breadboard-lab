Implement component drag-and-drop repositioning

## Context

Breadboard Lab supports two-click component placement and value editing, but components cannot be moved after placement. Users must delete and recreate components to adjust layouts. The planning document explicitly defines drag-and-drop movement as a core interaction pattern (planning/vision/goal.md, lines 230-254), with detailed requirements for dragging, snapping, collision detection, and visual feedback.

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with drag/drop, rotate, snap-to-grid interaction model that feels like working with a real breadboard (planning/vision/goal.md, lines 47-49, 230-254, 342-356).

**Current state**:

- Component placement works via two-click interaction (click first hole, click second hole)
- Components render visually with selection support (planning/state/system_capabilities.md, lines 89-107)
- Component values can be edited via property editor (planning/state/system_capabilities.md, lines 117-151)
- **BUT**: Once placed, component positions are immutable
- **AND**: Users must delete and recreate components to adjust layouts
- **RESULT**: Trial-and-error experimentation is tedious and error-prone

**Gap**: The most critical usability limitation is the inability to reposition components after placement. This violates the principle of "physical authenticity" where real breadboards allow easy component movement.

## Proposed Development Task

**Implement drag-and-drop repositioning for placed components**

### Scope

Create an interaction system that allows users to:

1. Select a placed component (already implemented)
2. Drag the selected component to a new position
3. See a ghost preview during drag showing new position
4. Snap component pins to valid breadboard holes
5. Validate placement (no collisions, pins align to holes)
6. Drop to confirm new position or Escape to cancel
7. Automatically update circuit extraction and simulation after move

### Technical Approach

**Interaction flow** (per planning/vision/goal.md, lines 342-356):

```
IDLE → [pointer down on component] → COMPONENT_SELECTED
COMPONENT_SELECTED → [drag] → COMPONENT_DRAGGING
COMPONENT_DRAGGING → [release on valid position] → COMPONENT_PLACED
COMPONENT_DRAGGING → [Escape key] → IDLE (cancel)
```

**Implementation strategy**:

- Extend `BreadboardApp` with drag state management
- Add mousedown/mousemove/mouseup handlers to rendered components
- Calculate new pin positions based on mouse position and snap-to-grid
- Show ghost preview overlay during drag (semi-transparent component)
- Validate new position against existing components (collision detection)
- Update component positions in state on successful drop
- Trigger circuit re-extraction and simulation after position change

**Visual feedback** (per planning/vision/goal.md, lines 234-245):

- Ghost preview shows component at cursor position
- Preview snaps to nearest valid alignment (all pins align to holes)
- Invalid positions show error indicator (red overlay or red border)
- Valid positions show normal preview
- Original component remains visible (faded) until drop or cancel

**Validation rules**:

- All component pins must align to valid breadboard holes
- No overlap with existing components (collision detection)
- Components must stay within breadboard bounds
- Cannot place component if any pin would be invalid

### Success Criteria

- [ ] User can drag a selected component to a new position
- [ ] Ghost preview displays during drag with correct pin alignment
- [ ] Preview snaps to nearest valid hole positions
- [ ] Invalid positions show visual error feedback (cannot drop)
- [ ] Valid positions allow drop and update component location
- [ ] Escape key cancels drag and returns component to original position
- [ ] Circuit automatically re-extracts and re-simulates after successful move
- [ ] Voltage overlay and current animation update to reflect new circuit topology
- [ ] Component selection persists after move (component remains selected)
- [ ] No visual glitches or flickering during drag

### User Experience Impact

This feature dramatically improves usability:

- **Experimentation**: Users can try different layouts without deleting components
- **Error correction**: Fix accidental placements without starting over
- **Learning**: Explore how circuit behavior changes with different topologies
- **Workflow**: Natural interaction model matching physical breadboards
- **Reduced friction**: No need to remember component values when recreating

The interaction feels "physical and authentic" (planning/vision/goal.md, line 208), making the tool more approachable for beginners.

### Alignment with Roadmap

This capability is foundational to the UI/UX vision:

- 🎯 **UI/UX Requirements**: Lines 230-254 explicitly define drag/drop with ghost preview, snapping, and validation
- 🎯 **State Machine**: Lines 307-356 define component dragging state transitions
- 🎯 **Design Principles**: Line 208 emphasizes "Physical authenticity — behave like a real breadboard"
- 🎯 **Acceptance Criteria**: Line 249 requires "Ghost preview shows correct pin alignment"

While not explicitly listed as MVP (MVP focused on placement, not repositioning), drag-and-drop is clearly part of the complete interaction model and is a prerequisite for other features like rotation and multi-select bulk operations.

### Estimated Effort

3-4 days of focused development

- Day 1: Implement drag state management and mouse event handlers
- Day 2: Add ghost preview rendering and snap-to-grid logic
- Day 3: Implement collision detection and position validation
- Day 4: Polish visual feedback, test edge cases, accessibility

### Dependencies

- Component selection ✅ (implemented in PR #89)
- Component rendering ✅ (implemented in PR #71)
- Pin-to-hole mapping ✅ (exists in component placement logic)
- Circuit re-extraction ✅ (automatic after state changes)

### Risks

- **Interaction complexity**: Drag-and-drop with constraints (snapping, validation) can be tricky to get right
  - _Mitigation_: Follow existing two-click placement validation logic, reuse snap calculations
- **Visual feedback**: Ghost preview rendering alongside original component may be visually confusing
  - _Mitigation_: Use semi-transparent preview, fade original component during drag
- **Performance**: Continuous validation during mousemove may impact performance
  - _Mitigation_: Throttle validation to 60fps, optimize collision detection with spatial indexing if needed
- **Touch support**: Mouse-based drag may not work on touch devices
  - _Mitigation_: Handle touch events (touchstart/touchmove/touchend) in addition to mouse events
- **Collision detection accuracy**: Need to check if component pins would occupy same holes as existing components
  - _Mitigation_: Reuse existing position validation logic, check all pin positions

### Implementation Details

**Drag state tracking**:

```typescript
interface DragState {
  componentId: string;
  startMousePos: { x: number; y: number };
  currentMousePos: { x: number; y: number };
  originalPositions: Position[];
  previewPositions: Position[] | null; // null if invalid
}
```

**Mouse event handling**:

- `mousedown` on component: Enter drag mode, store original positions
- `mousemove`: Calculate new positions based on cursor, validate, update preview
- `mouseup`: If valid preview exists, update component positions in state
- `keydown` (Escape): Cancel drag, clear preview, restore original positions

**Position calculation**:

- Calculate mouse offset from component origin
- Map mouse position to breadboard grid coordinates
- Snap to nearest valid hole
- Calculate all pin positions relative to snapped origin
- Validate each pin is within bounds and not colliding

**Rendering changes**:

- During drag: Render original component with reduced opacity (0.3)
- During drag: Render ghost preview at calculated position
- Ghost preview uses same SVG rendering as normal components
- Add visual indicator for invalid preview (red stroke or overlay)

## Why This Task Now

This is the most important gap because:

1. **Usability blocker**: Cannot fix mistakes without delete+recreate workflow
2. **Foundation for other features**: Rotation, multi-select operations, and copy/paste all benefit from drag-and-drop infrastructure
3. **Planning document emphasis**: Extensive documentation (lines 230-356) shows this is a core interaction pattern, not a nice-to-have
4. **User expectation**: After selecting components, users naturally expect to drag them
5. **High impact, moderate risk**: Significant UX improvement with well-defined scope
6. **Enables experimentation**: Users can explore circuit layouts without tedious recreation
7. **Matches physical metaphor**: Real breadboards allow easy component movement

Without drag-and-drop, the tool feels rigid and frustrating. With it, the tool feels natural and exploratory—critical for an educational tool.

## Next Steps After This Task

Once component repositioning works:

1. Implement component rotation (keyboard R key, rotation handle)
2. Add multi-select with rectangle selection (enables bulk move operations)
3. Implement copy/paste (builds on selection + drag infrastructure)
4. Add undo/redo (track position changes in history)
5. Implement error detection overlays (visual feedback for circuit issues)
6. Create "Explain" panel for educational context
