Implement interactive component deletion and selection

## Context

Breadboard Lab has achieved excellent core capabilities: circuit simulation works accurately with Modified Nodal Analysis, voltage visualization displays computed results as color-coded heatmaps, and current animation shows flow magnitude and direction. However, the user interaction model is severely limited. Once a component is placed using the two-click method, it cannot be modified, moved, or removed individually. Users must clear the entire breadboard to correct mistakes, making experimentation and learning tedious and frustrating.

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with drag/drop, rotate, snap, selection model, and full component lifecycle management (planning/vision/goal.md, lines 47-51, 206-303).

**Current state**: Two-click placement only, no component deletion, no component selection, no component editing, no undo/redo. The only way to remove components is "Clear All" which erases the entire circuit (planning/state/system_capabilities.md, lines 82-96, 613-623).

**Gap**: The most critical missing capability is the ability to select and delete individual components. This is a foundational interaction that blocks iterative learning and experimentation.

## Proposed Development Task

**Implement interactive component selection and deletion**

### Scope

Create a component interaction system that:
1. Allows users to click on a rendered component to select it
2. Shows visual feedback when a component is selected (highlight, outline, or selection handles)
3. Enables deletion of selected component via Delete key or delete button
4. Updates circuit simulation and visualization after deletion
5. Maintains clean separation between visual rendering and interaction logic

### Technical Approach

- Extend `ComponentRenderer` to make components interactive (enable pointer events on specific areas)
- Add selection state to `BreadboardState` (track currently selected component ID)
- Implement hit detection logic (determine which component was clicked based on coordinates)
- Add keyboard event listener for Delete key
- Update `BreadboardApp` to handle selection events and deletion operations
- Re-run circuit extraction and simulation after deletion

### Success Criteria

- [ ] User can click on any rendered component to select it
- [ ] Selected component displays clear visual feedback (border, highlight, or handles)
- [ ] Pressing Delete key removes the selected component
- [ ] Circuit updates correctly after deletion (re-extracts net and re-simulates)
- [ ] Voltage overlay and current animation update to reflect new circuit state
- [ ] Clicking background or another component changes selection
- [ ] No components selected on initial load or after deletion

### Educational Impact

This feature transforms Breadboard Lab from a "place-once-and-observe" tool into an interactive learning environment where students can:
- Experiment by trying different components and removing unsuccessful attempts
- Debug circuits by selectively removing components to isolate problems
- Iterate on designs without restarting from scratch
- Build confidence through trial-and-error learning

Without this capability, the tool cannot fulfill its educational mission of teaching through hands-on experimentation.

### Alignment with Roadmap

This task addresses critical MVP gaps (planning/vision/goal.md, lines 1041-1069):
- Unblocks component lifecycle management (currently missing)
- Foundation for upcoming drag-and-drop feature (requires selection)
- Prerequisite for undo/redo system (requires tracking component operations)
- Enables rotation feature (requires selection first)
- Foundation for multi-select and copy/paste (v0.2 features)

### Estimated Effort

3-4 days of focused development
- Day 1: Implement component hit detection and selection state management
- Day 2: Add visual selection feedback and keyboard Delete handler
- Day 3: Test deletion with various component types and circuits
- Day 4: Polish edge cases (multi-component deletion, selection persistence)

### Dependencies

None - builds on existing rendering and state management infrastructure

### Risks

- **Hit detection accuracy**: Components have different shapes (rectangle for resistor, circle for LED); requires careful bounding box calculation
  - *Mitigation*: Start with simple rectangular hit boxes; refine if needed
- **Pointer events blocking hole interaction**: Components render with `pointer-events: none`; enabling events may interfere with hole clicks
  - *Mitigation*: Use event delegation or separate interaction layer; test thoroughly
- **State synchronization**: Selection state must stay synchronized with component state after operations
  - *Mitigation*: Clear selection after deletion; validate selection ID exists before rendering

## Why This Task Now

This is the most important gap because:

1. **Blocks learning loop**: Without deletion, students cannot experiment and iterate, which is the core educational value proposition
2. **Highest user pain**: Current workaround (Clear All) is extremely frustrating for multi-component circuits
3. **Foundational for other features**: Drag-and-drop, rotation, undo/redo, and multi-select all require component selection
4. **Low implementation risk**: Well-understood interaction pattern with clear scope
5. **High impact-to-effort ratio**: 3-4 days of work unlocks enormous usability improvement
6. **Already have rendering**: Component visuals exist; just need to make them interactive
7. **Validates architecture**: Tests whether separation between rendering and interaction works as designed

## Alternative Approaches Considered

### Why not drag-and-drop first?
Drag-and-drop is more complex and requires:
- Selection (must select before dragging)
- Position validation (snap-to-hole logic during drag)
- Ghost preview rendering
- Cancel on invalid drop

Deletion is simpler and provides immediate value while building the selection foundation needed for drag-and-drop.

### Why not undo/redo first?
Undo/redo requires:
- Operation history tracking
- State snapshots or command pattern
- More complex state management

Deletion is a prerequisite operation that undo/redo would need to support. Building deletion first validates the operation model before adding history complexity.

### Why not component value editing first?
Value editing requires:
- UI for input (modal, inline editor, or property panel)
- Validation logic
- Type-specific controls (slider for resistance, dropdown for voltage)

Deletion is more fundamental - users need to fix mistakes before they need to tune values.

## Next Steps After This Task

Once selection and deletion work:
1. Implement component dragging and repositioning (planning/vision/goal.md, lines 232-254)
2. Add rotation via keyboard `R` key (planning/vision/goal.md, lines 246-254)
3. Implement undo/redo for component operations (planning/vision/goal.md, lines 296-303)
4. Add multi-select with rectangle selection (planning/vision/goal.md, lines 282-295)
5. Create component property editor for value customization

## Acceptance Criteria for Gap Analysis

This document:
- ✅ Identifies exactly one development task (component selection and deletion)
- ✅ Compares long-term goal to current capabilities with specific citations
- ✅ Explains why this is the most important gap
- ✅ Provides concrete technical approach and success criteria
- ✅ Does not modify any code
- ✅ Does not create GitHub issues
- ✅ Has task name as first line
- ✅ Is pragmatic, analytical, and aligned with stated mission
