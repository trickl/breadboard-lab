# Render visual representation of components and wires on breadboard

## Context

Breadboard Lab successfully simulates circuits and visualizes voltage levels through color overlays, but the physical components themselves (resistors, LEDs, wires) are completely invisible to users. The only visual feedback is small "occupied" markers on breadboard holes. This creates a fundamental usability and educational barrier: students cannot see what circuit they've built.

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with intuitive visual representation of components matching physical appearance (planning/vision/goal.md, lines 48-49: "Best-in-class breadboard UI — drag/drop, rotate, snap-to-grid, intuitive wiring").

**Current state**: Components exist in memory and function correctly for simulation, but have zero visual representation beyond hole occupancy markers. Users place components by clicking holes, but cannot see the resistor body, LED shape, or wire paths (planning/state/system_capabilities.md, lines 93-96).

**Gap**: The most critical missing capability is visual rendering of placed components and wires.

## Proposed Development Task

**Implement visual rendering of components and wires on the breadboard canvas**

### Scope

Create a visual rendering system that:
1. Draws component bodies between their terminal positions
2. Renders wires as visible paths connecting holes
3. Shows component type identifiers (resistor bands, LED polarity, labels)
4. Uses simple, clear geometric shapes (not photo-realistic)
5. Updates automatically when components are placed or removed

### Technical Approach

**Components to render:**
- **Resistor**: Rectangle spanning two holes, with "1kΩ" label or color bands
- **LED**: Triangle/diode symbol with anode/cathode markers, spanning two holes
- **Wire**: Colored line path between two holes (red/black/yellow options)
- **Power Supply**: "+" symbol or voltage label at hole
- **Ground**: "⏚" ground symbol at hole

**Implementation options:**
1. **Canvas-based** (recommended for MVP):
   - Draw shapes directly on HTML5 canvas
   - Position based on hole coordinates
   - Layer: background → wires → components → overlays
   - Fast rendering, simple implementation

2. **SVG-based** (future enhancement):
   - Use SVG elements for crisp, scalable graphics
   - Better for hover effects and selection
   - More accessible

**Rendering pipeline:**
```
Component placement → Calculate screen coordinates → Render shape → Apply styling
```

### Success Criteria

- [ ] All placed resistors show as rectangles with labels
- [ ] All placed LEDs show as triangular diode symbols
- [ ] All placed wires show as colored lines
- [ ] Power supply and ground show appropriate symbols
- [ ] Components are visually distinct and recognizable
- [ ] Visual rendering updates immediately on placement
- [ ] Components do not overlap readability of voltage overlay
- [ ] Visual style matches educational breadboard aesthetic

### Educational Impact

This feature is **prerequisite for effective learning**:
- Students need to see what they're building to understand circuit topology
- Visual feedback reinforces the connection between physical breadboarding and electronics
- Clear component rendering enables debugging ("why is my LED backwards?")
- Prepares users for understanding current flow visualization (next feature)

Without visual components, the tool is unusable as an educational breadboard simulator - it's just an abstract circuit builder with no spatial or physical context.

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Component placement (resistor, LED, wire, power, ground)" is listed as MVP requirement
- The vision document assumes visual components exist (referenced throughout UI/UX section)
- Required foundation for drag-and-drop and rotation features
- Essential for user testing and feedback

### Estimated Effort

2-4 days of focused development
- Day 1: Design component visual specifications, implement coordinate mapping
- Day 2: Implement canvas rendering for all 5 component types
- Day 3: Polish styling, ensure visibility with voltage overlays
- Day 4: Test with various circuits, refine visual clarity

### Dependencies

None - all required data already exists in BreadboardState and component positions.

### Risks

- **Layering complexity**: Must ensure voltage overlays remain visible over component graphics
  - Mitigation: Use semi-transparent component fills, or render components on separate layer
- **Coordinate calculation**: Mapping breadboard positions to pixel coordinates
  - Mitigation: Reuse existing hole position calculation from BreadboardApp
- **Visual clarity**: Components may clutter the view
  - Mitigation: Use simple, minimal shapes; test with real circuits early

### Design Constraints

**Must comply with licensing (planning/vision/goal.md, lines 153-204):**
- ❌ DO NOT use Fritzing part graphics (explicitly prohibited)
- ✅ Create simple geometric shapes (rectangles, triangles, lines)
- ✅ Use text labels for clarity ("1kΩ", "+5V", "GND")
- ✅ Consider algorithmic rendering (e.g., resistor color bands calculated)

**Visual style guidelines:**
- Clean, minimal, educational aesthetic
- High contrast for accessibility
- Consistent line weights and colors
- Avoid photo-realistic rendering (out of scope)

## Why This Task Now

This is the most important gap because:

1. **Fundamental usability**: Without visual components, the tool is nearly unusable for its intended purpose
2. **Blocks user testing**: Cannot get meaningful feedback when users can't see what they're building
3. **Educational necessity**: Spatial understanding requires visual representation
4. **Foundation for advanced features**: Drag-and-drop, rotation, and selection all require visible components
5. **Voltage visualization is incomplete**: Color overlays show electrical state, but users need to see physical components to understand the relationship
6. **Quick wins available**: Simple geometric rendering can be implemented rapidly

**Priority over other MVP features:**
- Current animation requires visible wires (this task)
- Error detection requires visible components to annotate
- Rotation requires visible components to show orientation
- Drag-and-drop requires visible components to grab

## Next Steps After This Task

Once component rendering works:
1. Add current animation on wires (planning/vision/goal.md, lines 792-815)
   - Now possible with visible wire paths
2. Implement component selection and individual deletion
   - Now possible with visible, clickable components
3. Add rotation handles to components
   - Now possible with visible component bodies
4. Implement error detection overlays (planning/vision/goal.md, lines 832-849)
   - Now possible with components to annotate

## Implementation Notes

**Coordinate system:**
```typescript
interface HoleCoordinates {
  x: number;  // Pixel x position of hole center
  y: number;  // Pixel y position of hole center
}

function getComponentRenderBounds(component: AnyComponent): {
  start: HoleCoordinates;
  end: HoleCoordinates;
  center: HoleCoordinates;
} {
  // Calculate from component positions and hole layout
}
```

**Rendering example (Resistor):**
```typescript
function renderResistor(ctx: CanvasRenderingContext2D, bounds: RenderBounds) {
  const { start, end } = bounds;
  
  // Draw resistor body
  ctx.fillStyle = '#E8D4A2';  // Tan color
  ctx.fillRect(/* rectangle from start to end */);
  
  // Draw leads
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(/* to body edge */);
  // ... similar for end
  ctx.stroke();
  
  // Draw label
  ctx.fillStyle = '#000';
  ctx.fillText('1kΩ', /* center position */);
}
```

**Canvas layer structure:**
```
Layer 1 (bottom): Breadboard background grid
Layer 2: Wire paths (below components)
Layer 3: Component bodies and symbols
Layer 4: Voltage overlays (semi-transparent)
Layer 5 (top): UI elements (selection, tooltips)
```

## Definition of Done

- [ ] All 5 component types have visual representations
- [ ] Visual rendering code is tested (manual or automated)
- [ ] Components are visible on development server
- [ ] Screenshots added to PR showing visual components
- [ ] Voltage overlay still functions correctly over components
- [ ] Code follows existing architecture patterns (core vs UI separation)
- [ ] Performance remains acceptable (< 100ms render for typical circuits)
