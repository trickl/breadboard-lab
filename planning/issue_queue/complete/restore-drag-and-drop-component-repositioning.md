Restore drag-and-drop component repositioning after PixiJS migration

## Context

The PixiJS migration (PR #167) successfully migrated rendering from SVG to WebGL-based Canvas rendering, enabling future visual enhancements like LED glow effects and wire depth cues. However, during this migration, the drag-and-drop component repositioning functionality was removed as a "known limitation" due to incompatibility between the PixiJS event model (FederatedPointerEvents) and the previous SVG-based mousedown handlers.

This removal represents a critical regression in user experience. Users can place components on the breadboard but cannot reposition them after placement, forcing them to delete and re-place components whenever they want to adjust circuit layout—a common and frequent operation in circuit design.

## Gap Analysis

**Long-term goal** (`planning/vision/goal.md`, lines 115-127):

> "Component placement: Components are draggable from a component library panel."
> "Selection and editing: Single selection for components/wires. Multi-selection via shift+click and marquee. Delete/copy/paste and undo/redo."

The goal document doesn't explicitly mention repositioning, but it's a fundamental expectation of any drag-and-drop interface that placed items can be moved.

**Previous capability** (`planning/state/system_capabilities.md`, lines 313-362):

> "Component Drag-and-Drop Repositioning"
> "Repositioning system: After placing a component, users can drag it to a new position with real-time visual feedback."
>
> - Drag interaction flow (5 steps)
> - Visual feedback during drag (ghost preview, valid/invalid indicators)
> - Position validation
> - Circuit integration (automatic re-extraction after move)

This was fully implemented with comprehensive visual feedback, snap-to-grid, collision detection, and ghost preview.

**Current state** (`PIXI_MIGRATION_STATUS.md`, lines 44-74):

> "The drag-and-drop functionality was removed in PR #167 as a 'known limitation'."
> Status: TODO
> Priority: HIGH - "Critical user-facing functionality"
> 5 tests marked as TODO awaiting implementation

**Gap**: A core user interaction that was working is now broken. Users cannot reposition placed components.

## Impact

This regression affects:

1. **User experience**: Cannot adjust circuit layout without deleting and re-placing components
2. **Educational workflow**: Students experimenting with layouts must start over when repositioning is needed
3. **Productivity**: Circuit refinement becomes tedious and error-prone
4. **System completeness**: A basic editor feature is missing
5. **Test coverage**: 5 tests are disabled waiting for this feature

## Proposed Development Task

**Objective:** Restore drag-and-drop component repositioning by integrating PixiJS pointer events with the existing drag state management infrastructure.

### Scope

1. Add PixiJS `pointerdown` event handler to component containers in `pixi-renderer.ts`
2. Define `onComponentDragStart` callback in `PixiEventHandlers` interface
3. Wire up event handler to BreadboardApp's existing drag state management
4. Verify existing drag logic (`DragState`, `handleMouseMove`, `handleMouseUp`) works with new event source
5. Re-enable and verify 5 disabled drag-and-drop tests

### Technical Approach

**Phase 1: Extend PixiEventHandlers Interface**

Add drag start callback to event handlers:

```typescript
export interface PixiEventHandlers {
  onHoleClick?: (position: Position) => void;
  onComponentClick?: (componentId: string) => void;
  onErrorIconClick?: (error: CircuitError) => void;
  onComponentDragStart?: (componentId: string, globalX: number, globalY: number) => void; // NEW
}
```

**Phase 2: Add Pointer Event in PixiRenderer**

Modify component rendering to capture pointerdown:

```typescript
// In renderComponents method, for each component container:
container.eventMode = 'static';
container.cursor = 'pointer';

container.on('pointerdown', (event: FederatedPointerEvent) => {
  event.stopPropagation(); // Prevent hole click
  this.eventHandlers.onComponentDragStart?.(component.id, event.global.x, event.global.y);
});
```

**Phase 3: Wire Up in BreadboardApp**

Connect PixiJS event to existing drag infrastructure:

```typescript
private async initPixiRenderer(): Promise<void> {
  await this.pixiRenderer.init(this.breadboard, {
    onHoleClick: (pos) => this.handleHoleClick(pos),
    onComponentClick: (id) => this.handleComponentClick(id),
    onErrorIconClick: (err) => this.showErrorDialog(err),
    onComponentDragStart: (id, x, y) => this.handleComponentDragStart(id, x, y), // NEW
  });
}

private handleComponentDragStart(componentId: string, mouseX: number, mouseY: number): void {
  const component = this.state.components.find((c) => c.id === componentId);
  if (!component) return;

  // Select component if not already selected
  if (this.state.selectedComponentId !== componentId) {
    this.state.selectedComponentId = componentId;
  }

  // Calculate offset from mouse to first pin (for smooth dragging)
  const firstPinPixels = this.positionToPixels(component.position1);
  const offsetX = firstPinPixels.x - mouseX;
  const offsetY = firstPinPixels.y - mouseY;

  // Initialize drag state
  this.dragState = {
    componentId: componentId,
    startMousePos: { x: mouseX, y: mouseY },
    currentMousePos: { x: mouseX, y: mouseY },
    originalPositions: [component.position1, component.position2],
    previewPositions: null,
    offsetFromFirstPin: { x: offsetX, y: offsetY },
  };

  // Attach global mouse handlers for move and up
  document.addEventListener('mousemove', this.handleMouseMoveBound);
  document.addEventListener('mouseup', this.handleMouseUpBound);

  this.render();
}
```

**Phase 4: Verify Existing Drag Logic**

The existing `handleMouseMove` and `handleMouseUp` methods should work without modification:

- `handleMouseMove`: Updates `dragState.currentMousePos`, calculates preview positions, validates placement
- `handleMouseUp`: Commits new position if valid, clears drag state, removes event listeners
- Escape key cancellation already implemented

**Phase 5: Re-enable Tests**

Remove `TODO` markers from 5 disabled tests in `breadboard-app.test.ts`:

- "initiates drag operation when component is clicked and held"
- "updates ghost preview position during drag"
- "completes drag and updates component position on mouseup"
- "cancels drag operation when Escape key is pressed"
- "shows valid/invalid position indicators during drag"

### Success Criteria

- [ ] Clicking and holding a component initiates drag operation
- [ ] Ghost preview renders at cursor position during drag
- [ ] Preview snaps to valid grid positions
- [ ] Valid positions show green indicator
- [ ] Invalid positions show red indicator and prevent drop
- [ ] Mouseup commits new position if valid
- [ ] Circuit automatically re-extracts and re-simulates after move
- [ ] Escape key cancels drag and keeps original position
- [ ] Component selection persists after successful drag
- [ ] All 5 drag-and-drop tests pass
- [ ] Manual testing confirms smooth drag experience
- [ ] No performance regression (60fps maintained during drag)

### Estimated Complexity

**Small (2-3 hours)**

- Infrastructure already exists (DragState, mouse handlers, validation logic)
- Only need to wire up PixiJS pointerdown event
- Tests are already written and waiting
- Well-scoped with clear acceptance criteria

### Risks and Mitigations

**Risk**: PixiJS global coordinates may differ from DOM event coordinates

- _Mitigation_: Use `event.global.x/y` for PixiJS coordinates; existing `handleMouseMove` uses DOM coordinates; verify coordinate systems are compatible

**Risk**: Event propagation conflicts (hole click vs component drag)

- _Mitigation_: Use `event.stopPropagation()` on component pointerdown to prevent hole click

**Risk**: Drag performance may be lower with Canvas rendering

- _Mitigation_: Profile during drag; PixiJS should be faster than SVG; existing rendering is already optimized

**Risk**: Tests may need adjustments for new event source

- _Mitigation_: Tests use public API (`clickComponent`, `getState`) which should remain compatible; verify and adjust if needed

### Dependencies

All required infrastructure exists:

- ✅ DragState interface and management in BreadboardApp
- ✅ Mouse event handlers (handleMouseMove, handleMouseUp)
- ✅ Position validation logic
- ✅ Snap-to-grid calculation
- ✅ Ghost preview rendering in PixiRenderer
- ✅ Circuit re-extraction after position change
- ✅ Component selection state management
- ✅ 5 disabled tests waiting to be enabled

New additions required:

- Add `onComponentDragStart` to PixiEventHandlers interface
- Add `pointerdown` event listener in PixiRenderer component rendering
- Add `handleComponentDragStart` method in BreadboardApp
- Wire up event handler during PixiRenderer initialization

### Why This Is the Most Important Next Step

1. **Critical regression**: This was working functionality that was removed, not a new feature

2. **Explicitly prioritized**: `PIXI_MIGRATION_STATUS.md` marks this as "HIGH" priority and "Critical user-facing functionality"

3. **User-blocking**: Circuit editing is severely limited without the ability to reposition components

4. **High frequency operation**: Users need to adjust layouts constantly during circuit design and experimentation

5. **Low implementation cost**: Infrastructure exists; only needs event wiring (~2-3 hours estimated)

6. **High impact**: Restores complete editing capability with minimal effort

7. **Test-ready**: 5 tests are written and waiting, providing immediate validation

8. **Completes PixiJS migration**: Addresses last major regression from PR #167 before moving to new features

9. **Unblocks visual test updates**: Visual regression tests can't be properly updated until UI interactions are fully restored

10. **Educational context**: Students learning electronics need to freely experiment with circuit layouts; inability to move components is a major usability barrier

### Non-Goals

This task specifically does **NOT** include:

- Multi-component drag (still single selection only)
- Drag from component library browser (separate interaction)
- Undo/redo for drag operations (broader feature)
- Copy/paste functionality (separate feature)
- Rotation during drag (use R key separately)
- Touch/mobile drag gestures (desktop mouse only)

### References

- `PIXI_MIGRATION_STATUS.md` - Lines 44-74: Drag-and-drop TODO with implementation plan
- `planning/state/system_capabilities.md` - Lines 313-362: Original drag-and-drop specification
- `planning/vision/goal.md` - Lines 115-127: Component placement and interaction requirements
- `src/ui/breadboard-app.ts` - Lines 30-38: DragState interface already defined
- `src/ui/breadboard-app.ts` - Lines 62-63: Mouse handlers already bound
- `src/ui/__tests__/breadboard-app.test.ts` - 5 tests marked as TODO

### Success Metrics

After implementation:

1. ✅ Component drag-and-drop working in live application
2. ✅ All 5 drag tests passing
3. ✅ No performance regression during drag (profiled at 60fps)
4. ✅ Visual feedback (ghost preview, valid/invalid indicators) matches original behavior
5. ✅ Circuit re-extraction and simulation work correctly after move
6. ✅ Manual testing confirms smooth UX
7. ✅ Documentation updated (PIXI_MIGRATION_STATUS.md marks drag-and-drop as COMPLETE)

This task completes the PixiJS migration by restoring critical user interaction, unblocking both visual test updates and user adoption of the system.
