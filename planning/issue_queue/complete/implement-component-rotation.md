Implement component rotation with keyboard shortcut and visual handle

## Context

Breadboard Lab allows users to place, select, move, and delete components, but there is currently no way to rotate them. Real breadboard prototyping frequently requires rotating components to fit them properly or to avoid crossing wires. The planning document explicitly identifies component rotation as a core interaction feature in the UI/UX requirements, with keyboard shortcuts and visual handles specified in detail.

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with rotate functionality (planning/vision/goal.md, lines 239-253):

- Keyboard shortcut: Press `R` to rotate selected component 90° clockwise
- On-screen handle: Circular rotation handle visible when component is selected
- Touch support: Two-finger rotate gesture (optional, stretch goal)
- Multi-select rotation: Rotates all components around group center
- Acceptance criteria include rotation handle visibility and functional keyboard shortcut

**Current state**: Component interaction capabilities exist (planning/state/system_capabilities.md):

- Component selection works with visual feedback (blue drop-shadow)
- Component drag-and-drop repositioning with ghost preview
- Component deletion via keyboard (Delete/Backspace)
- Component value customization via property editor
- **BUT**: No rotation capability exists
- **AND**: Known limitation explicitly documented (line 213: "No component rotation")

**Gap**: The most important missing interaction feature for completing the MVP is component rotation.

## Proposed Development Task

**Implement component rotation with keyboard shortcut and visual rotation handle**

### Scope

Create a rotation system that:

1. Allows rotating selected component 90° clockwise via `R` key
2. Displays visual rotation handle when component is selected
3. Tracks component rotation state (0°, 90°, 180°, 270°)
4. Updates visual rendering to reflect rotation
5. Validates rotated positions (all pins must align to valid holes)
6. Prevents invalid rotations (collision detection)
7. Updates circuit extraction and simulation after rotation

### Technical Approach

**Data model extension**:

- Add `rotation` property to component types (already defined in planning document: `rotation: 0 | 90 | 180 | 270`)
- Default rotation is 0° for newly placed components
- Rotation state persists with component

**Keyboard interaction**:

- Listen for `R` key press when a component is selected
- Rotate selected component 90° clockwise (0° → 90° → 180° → 270° → 0°)
- Validate new pin positions after rotation
- Reject rotation if any pin would be out of bounds or collide with existing component
- Visual feedback for invalid rotation (red flash or error indicator)

**Visual handle** (optional for MVP, keyboard is primary):

- Render circular rotation handle above selected component
- Click-and-drag to rotate (more complex, can be deferred)
- For MVP: keyboard shortcut is sufficient

**Rendering updates**:

- Extend `ComponentRenderer` to apply rotation transform to component visuals
- Use SVG `transform` attribute for rotation around component center
- Ensure pin positions in data model match visual rotation
- Update wire endpoints if needed

**Position validation**:

- After rotation, recalculate all pin positions
- Check if rotated pins align to valid breadboard holes
- Check for collisions with existing components
- If invalid, reject rotation and show feedback

### Success Criteria

- [ ] Pressing `R` key rotates selected component 90° clockwise
- [ ] Component can be rotated through all four orientations (0°, 90°, 180°, 270°)
- [ ] Visual rendering reflects rotation correctly (resistors, LEDs, power supplies)
- [ ] Invalid rotations are prevented (out of bounds, collisions)
- [ ] Circuit re-extracts and re-simulates after successful rotation
- [ ] Voltage overlay and current animation update to reflect new orientation
- [ ] Rotation state persists until component is moved or deleted
- [ ] User receives feedback for invalid rotation attempts
- [ ] Rotation works for all component types (resistor, LED, power supply, wire, ground)

### Educational Impact

Component rotation is essential for authentic breadboard experience:

- **Physical realism**: Real breadboards require rotating components to fit layouts
- **Wire management**: Rotation reduces wire crossings and improves circuit clarity
- **Polarity awareness**: Rotating LEDs/power supplies teaches polarity concepts
- **Design flexibility**: Enables more compact and organized circuit layouts

### Alignment with Roadmap

This task completes a core MVP interaction feature (planning/vision/goal.md, lines 239-253):

- 🎯 Explicitly listed in UI/UX requirements as essential interaction
- 🎯 Keyboard shortcut `R` specified in detail
- 🎯 Acceptance criteria defined in planning document
- 🎯 Foundation for multi-select rotation (future enhancement)
- 🎯 Prerequisite for touch gestures (v0.2+)

### Estimated Effort

2-4 days of focused development

- Day 1: Add rotation property to data model, implement keyboard handler
- Day 2: Update rendering logic to apply rotation transforms
- Day 3: Implement position validation and collision detection
- Day 4: Polish visual feedback, test with all component types, accessibility review

### Dependencies

- Component selection system ✅ (already implemented in PR #89)
- Component drag-and-drop repositioning ✅ (already implemented in PR #101)
- Component rendering with SVG ✅ (already implemented in PR #71)
- Circuit extraction and simulation ✅ (already implemented)

### Risks

- **Pin alignment complexity**: Rotated components must still snap to grid
  - _Mitigation_: Carefully calculate pin positions relative to rotation center
- **Collision detection**: Rotated components may collide with existing components
  - _Mitigation_: Reuse existing collision detection from drag-and-drop system
- **Wire rendering**: Wires connected to rotated components need correct endpoints
  - _Mitigation_: Wire endpoints are already based on pin positions, so should update automatically
- **Visual clarity**: Some components (like resistors) may look similar at 0° and 180°
  - _Mitigation_: Add visual asymmetry (e.g., resistance label position) to indicate orientation

## Why This Task Now

This is the most important gap because:

1. **Completes core interaction model**: Rotation is the last essential manipulation operation (place → move → rotate → delete)
2. **Explicit MVP requirement**: Planning document specifies rotation as part of MVP UI/UX
3. **User expectation**: After drag-and-drop repositioning, users will naturally expect rotation
4. **Physical authenticity**: Real breadboards require rotation; without it, the tool feels incomplete
5. **Foundation for advanced features**: Multi-select rotation and touch gestures build on single-component rotation
6. **Natural next step**: Builds directly on recently completed drag-and-drop (PR #101) and selection (PR #89)
7. **High impact, manageable scope**: Well-defined interaction with clear success criteria

The tool has all core visualization features (voltage heatmap, current animation) and basic manipulation (place, move, delete, edit). Adding rotation completes the MVP interaction model and delivers a truly breadboard-authentic experience.

## Implementation Details

### Rotation Data Model

Component interface already supports rotation (from planning document):

```typescript
interface Placement {
  id: string;
  componentType: ComponentType;
  pins: PinPlacement[];
  rotation: 0 | 90 | 180 | 270; // Already defined in planning
  metadata: Record<string, unknown>;
}
```

Current implementation needs to add this property and ensure it's initialized to 0°.

### Rotation Transform Logic

For a component centered at (cx, cy) with pins at positions [(x1, y1), (x2, y2)]:

- Rotate 90° clockwise: (x, y) → (cy + (y - cy), cx - (x - cx))
- Rotate 180°: (x, y) → (2*cx - x, 2*cy - y)
- Rotate 270° clockwise: (x, y) → (cy - (y - cy), cx + (x - cx))

Or use standard rotation matrix applied to SVG:

```svg
<g transform="rotate(90, cx, cy)">
  <!-- component visual -->
</g>
```

### Keyboard Handler

Extend existing keyboard event listener in `BreadboardApp`:

```typescript
// In setupEventListeners():
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (this.state.selectedComponentId) {
      this.rotateSelectedComponent();
    }
  }
  // ... existing Delete/Backspace handling
});
```

### Testing Strategy

Unit tests to add (in `breadboard-app.test.ts`):

- [ ] Pressing `R` rotates component from 0° to 90°
- [ ] Multiple `R` presses cycle through 0° → 90° → 180° → 270° → 0°
- [ ] Rotation updates visual rendering (SVG transform applied)
- [ ] Invalid rotation rejected (pins out of bounds)
- [ ] Invalid rotation rejected (collision with existing component)
- [ ] Circuit re-simulates after rotation
- [ ] Rotation state persists after rotation

## Next Steps After This Task

Once component rotation works:

1. Implement error detection overlays with helpful messages (short circuits, floating nodes, reversed LEDs)
2. Add undo/redo functionality (track rotation in history stack)
3. Add multi-select capability with group rotation
4. Consider visual rotation handle for mouse-based rotation (optional)
5. Consider touch gesture support for mobile devices (v0.2+)
6. Implement schematic view generation (v0.2)
