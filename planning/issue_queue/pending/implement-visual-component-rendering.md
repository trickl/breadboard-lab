# Implement visual component rendering on breadboard

## Context

Breadboard Lab has working circuit simulation and voltage visualization, but components themselves are invisible. Users see voltage heatmaps on breadboard holes but cannot see the resistors, LEDs, wires, or other components they've placed. This creates a critical usability and educational gap: **students cannot understand their circuit because they cannot see it.**

## Gap Analysis

**Long-term goal**: A breadboard-first UI that models physical component placement with visual authenticity (planning/vision/goal.md, lines 45-86). The planning document emphasizes "best-in-class breadboard UI" with drag/drop, rotate, snap, and visual wiring.

**Current state**: Components are tracked in the data model and affect simulation, but the UI only shows "occupied" markers on holes. No component graphics are rendered. Wires are completely invisible except for endpoint markers (planning/state/system_capabilities.md, lines 93-95).

**Gap**: The most critical missing UI capability is **visual rendering of placed components and wires**.

### Evidence of the Gap

From system_capabilities.md:
- Line 94: "No visual representation of placed components (only 'occupied' marker on holes)"
- Line 95: "No wire rendering (wires are invisible except for hole markers)"
- Line 439: "No visual components: Components are not drawn (only hole occupancy shown)"
- Line 440: "No wire rendering: Wires are invisible"

From user perspective:
1. Place a resistor → see two dots marked "occupied"
2. Place an LED → see two more dots
3. Place a wire → see two more dots
4. Result: Cannot tell which component is which, cannot understand circuit topology

This fundamentally breaks the educational value proposition: students cannot learn circuit design if they cannot see what they've built.

## Proposed Development Task

**Implement visual component and wire rendering on the breadboard**

### Scope

Create a visual rendering system that:
1. Draws component graphics for each placed component (resistor, LED, power supply, ground)
2. Renders wire paths between connected holes
3. Uses simple, clear SVG or canvas graphics (not photorealistic)
4. Positions components correctly based on pin placement
5. Updates rendering automatically when components are placed
6. Maintains the existing voltage overlay system (render components below voltage overlay)

### Technical Approach

**Architecture Decision:** Based on planning document recommendation (planning/vision/goal.md, lines 427-457), use **Konva.js** or similar canvas library for interactive rendering.

However, for MVP simplicity, consider starting with **SVG rendering** first:
- Easier to implement basic shapes (rectangles, lines, circles)
- Better for accessibility (semantic elements)
- CSS styling for colors and effects
- Can migrate to Konva later if performance becomes an issue

**Implementation Strategy:**

1. **Component Graphics Layer**
   - Add SVG overlay layer to breadboard grid
   - For each component in state, render appropriate graphic:
     - **Resistor**: Rectangle between two holes with zigzag pattern and "1kΩ" label
     - **LED**: Triangle pointing from anode to cathode with circle base
     - **Wire**: Straight or curved line between two holes
     - **Power Supply**: "+" symbol at hole with "5V" label
     - **Ground**: Ground symbol (⏚) at hole
   
2. **Position Calculation**
   - Convert breadboard hole positions (row, column) to pixel coordinates
   - Calculate component orientation based on pin positions
   - Handle both horizontal and vertical component placement

3. **Rendering Order** (back to front):
   - Background: Breadboard grid
   - Layer 1: Wires (below components)
   - Layer 2: Component bodies
   - Layer 3: Component labels (resistance values, voltages)
   - Layer 4: Voltage heatmap overlay (existing, keep on top)
   - Layer 5: Selection/hover effects (future)

4. **Styling**
   - Use color-blind friendly colors
   - High contrast for accessibility
   - Clear labels with readable fonts
   - Distinct visual styles for each component type

### Component Design Specifications

Following planning document constraints (planning/vision/goal.md, lines 152-173):

**DO NOT use Fritzing graphics** (license restriction). Create original designs or use MIT-licensed alternatives.

**Simple Geometric Designs:**

```
Resistor (horizontal):
  ┌─────────────────┐
  │  /\/\/\/\/\     │  "1kΩ"
  └─────────────────┘

LED (pointing right):
      ▶|
     /  |
    ◄   |  "LED"

Wire:
  ─────────  (straight line, 2-3px thick)

Power Supply:
   ⚡ +5V

Ground:
   ⏚ GND
```

These designs are:
- Clear and recognizable
- Easy to implement as SVG paths
- Accessible (high contrast, semantic)
- License-safe (original geometric designs)

### Success Criteria

- [ ] All placed components display appropriate graphics on the breadboard
- [ ] Component graphics accurately reflect pin positions
- [ ] Wires render as visible lines between connected holes
- [ ] Component labels show key parameters (resistance, voltage)
- [ ] Graphics layer does not interfere with voltage overlay
- [ ] Rendering performance remains acceptable (< 100ms for typical circuits)
- [ ] Visual design is clear and educational
- [ ] Graphics scale appropriately with breadboard zoom (if applicable)

### Educational Impact

This feature is **foundational for all learning outcomes**:

1. **Visual Understanding**: Students see the physical layout of their circuit
2. **Component Recognition**: Learn to identify components by appearance
3. **Topology Comprehension**: Understand series vs parallel connections
4. **Debugging**: Identify misplaced or missing components
5. **Documentation**: Screenshots become meaningful

**Without this feature, the tool is essentially unusable for education.** Voltage visualization is valuable, but only if users can see what's being measured.

### Alignment with Roadmap

From MVP milestone (planning/vision/goal.md, lines 1041-1069):

The planning document does not explicitly list "Visual wire rendering" in the MVP checklist, but it is implicitly required for:
- ✅ Component placement (exists, but invisible)
- ✅ Wiring (exists, but invisible)
- 🎯 "Visual wire rendering" (lines 159-160 in Architecture, not yet implemented)

The document explicitly states under UI/UX requirements:
- "Component graphics (resistor bands, LED colors)" (line 158)
- "Visual wire rendering (lines between holes)" (line 157)

These are listed as future enhancements but are practically essential for MVP usability.

**Recommendation**: Promote this task to MVP priority based on critical usability need.

### Estimated Effort

3-4 days of focused development:
- Day 1: Design SVG component templates, implement rendering infrastructure
- Day 2: Implement component graphics for all 5 component types
- Day 3: Implement wire rendering with path calculation
- Day 4: Polish, test with various circuits, ensure performance

### Dependencies

- Existing placement logic (src/ui/breadboard-app.ts)
- Breadboard layout coordinates (src/core/breadboard-layout.ts)
- Component state management (already exists)

No external dependencies if using SVG. If using Konva, add dependency:
```bash
npm install konva react-konva
```

### Risks

1. **Performance**: Rendering 20+ components with SVG may be slow
   - **Mitigation**: Profile first; optimize or switch to canvas if needed
   
2. **Design Quality**: Simple geometric shapes may not be recognizable
   - **Mitigation**: User test with target audience; iterate on designs
   
3. **Coordinate Mapping**: Calculating component positions/rotations may be complex
   - **Mitigation**: Start with horizontal-only components; add rotation later
   
4. **Overlap Handling**: Components placed close together may overlap visually
   - **Mitigation**: Accept for MVP; add collision detection in future iteration

## Why This Task Now

This is the most urgent gap because:

1. **Blocks all other features**: Current animation, error overlays, and "Explain" panel all assume users can see components
2. **Critical usability failure**: The tool is barely usable without seeing placed components
3. **Educational prerequisite**: Students cannot learn circuit design from dots on holes
4. **Foundation for improvements**: Enables future enhancements (drag-and-drop, rotation, selection)
5. **High impact, moderate effort**: Visual feedback transforms user experience; implementation is straightforward SVG

### Why This Takes Priority Over Other Gaps

**Current Animation** (next in completed task's roadmap):
- Valuable but not critical if components are invisible
- Requires visible wires as prerequisite

**Error Detection Overlays**:
- Less urgent than seeing what components exist
- Errors are hard to interpret without seeing the circuit

**Component Deletion**:
- Important but workarounds exist (Clear All)
- Less impactful than visibility

**Parallel Circuit Simulation**:
- Solver improvement, not user-facing
- Limited value if users can't see their circuit

**Component Rendering is the bottleneck** preventing the tool from being genuinely useful for education.

## Implementation Notes

### Phase 1: Minimal Visual Rendering (MVP)
- Rectangle for resistor with label
- Triangle for LED with polarity indicator
- Line for wire
- Symbol for power/ground
- No fancy graphics, just clarity

### Phase 2: Enhanced Visuals (Post-MVP)
- Resistor color bands (if educationally valuable)
- LED color (red, green, blue)
- Curved wire paths (bezier or arc)
- Component shadows/depth
- Animations (component placement, selection)

### Phase 3: Advanced Rendering (Future)
- Konva.js migration for performance
- Drag-and-drop visual feedback
- Rotation handles
- Multi-select bounding boxes

## Next Steps After This Task

Once visual component rendering works:
1. Implement current animation on wires (uses rendered wire paths)
2. Add component deletion/editing (requires visible components to select)
3. Improve simulation to handle parallel circuits (now that users can see complex topologies)
4. Add error detection overlays (requires visible components to annotate)
5. Implement "Explain" panel (references visible components)

## References

- Planning document: /planning/vision/goal.md
  - Lines 45-86: Breadboard view as primary interface
  - Lines 157-160: Visual wire and component rendering requirements
  - Lines 427-457: Konva.js rendering decision
  - Lines 152-173: Licensing constraints (DO NOT use Fritzing graphics)

- System capabilities: /planning/state/system_capabilities.md
  - Lines 93-95: Current UI limitations
  - Lines 437-440: Listed as known limitations

- Completed task: /planning/issue_queue/complete/implement-voltage-heatmap-overlay.md
  - Built voltage visualization (now need component visualization to complement it)
