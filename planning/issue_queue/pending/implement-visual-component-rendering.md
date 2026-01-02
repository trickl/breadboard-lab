Implement visual component rendering on breadboard

## Context

Breadboard Lab currently places components on the breadboard and simulates their behavior, but components are invisible to users. Only "occupied" hole markers show where components have been placed, making it extremely difficult to understand circuit layout or debug issues. The planning document emphasizes physical authenticity and immediate feedback as core design principles (planning/vision/goal.md, lines 207-213).

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with drag/drop, rotate, snap-to-grid, and intuitive wiring. Components should have clear visual representations similar to physical breadboard prototyping (planning/vision/goal.md, lines 46-53).

**Current state**: Components are placed using a two-click interaction model, but there is no visual rendering of the components themselves. Users see only:
- Occupied hole markers (grey dots)
- Voltage color overlays on holes
- Text listing of components in the info panel

The UI shows *where* components occupy holes but not *what* components are there or *how* they're oriented (planning/state/system_capabilities.md, lines 85-97).

**Gap**: The most critical usability issue is the absence of visual component representations. Users cannot:
- See what components they've placed
- Distinguish between resistors, LEDs, wires, and other components visually
- Understand component orientation or polarity
- Select or interact with components visually
- Debug circuit layout effectively

## Proposed Development Task

**Implement visual rendering of components on the breadboard**

### Scope

Create a visual representation system that:
1. Renders components as graphical elements (not just Fritzing-style realistic parts, but clear functional representations)
2. Shows component type clearly (resistor symbol, LED with polarity, wire lines, etc.)
3. Displays component orientation and position
4. Renders wires as lines connecting holes
5. Uses custom graphics (not Fritzing parts - see licensing constraints in planning/vision/goal.md, lines 155-177)
6. Works with existing voltage overlay system

### Technical Approach

**Rendering strategy options:**
- **Option 1 (Recommended)**: Use CSS/SVG overlays positioned absolutely over breadboard holes
  - Lightweight, no new dependencies
  - Works with current DOM-based breadboard
  - Easy to layer with voltage overlays
  
- **Option 2**: Migrate to Canvas/Konva.js (as planned in architecture)
  - Better for future features (drag-and-drop, animations)
  - More complex migration
  - Defer to future task after basic visuals work

**Component visual designs:**
- **Resistor**: Rectangular box with zigzag/band pattern, labeled with resistance value (1kΩ)
- **LED**: Triangle/diode symbol with anode (+) and cathode (-) markers, or simplified LED icon
- **Wire**: Straight or orthogonal line connecting two holes
- **Power Supply**: Red "+" symbol or battery icon
- **Ground**: Standard ground symbol (⏚) or horizontal lines

**Implementation steps:**
1. Create a `ComponentRenderer` class or module
2. For each component in state, calculate visual representation based on positions
3. Render components as SVG elements or styled divs
4. Position components to align with hole grid
5. Layer components between holes and voltage overlays
6. Ensure components don't obscure voltage colors (semi-transparent or styled appropriately)

### Success Criteria

- [ ] All placed components are visible on the breadboard
- [ ] Component type is clearly distinguishable (resistor vs LED vs wire)
- [ ] Component orientation is visible (which hole is which pin)
- [ ] Visual rendering updates immediately after placement
- [ ] Components don't interfere with voltage heatmap visibility
- [ ] Custom graphics used (no Fritzing parts reused)
- [ ] Visual design is clean and educational (not toy-like, not overly complex)

### Educational Impact

This feature transforms Breadboard Lab from a simulation engine with a minimal UI into a true visual circuit builder. Students will:
- Understand circuit topology at a glance
- See the relationship between physical layout and electrical behavior
- Debug placement errors more easily
- Learn component recognition and polarity

Without visual components, the tool is essentially unusable for educational purposes - students cannot see what they're building.

### Alignment with Roadmap

This task is foundational for MVP completion (planning/vision/goal.md, lines 1041-1069):
- Prerequisite for drag-and-drop (can't drag invisible components)
- Prerequisite for rotation (need to see orientation)
- Prerequisite for selection model (need to click on visible components)
- Enables wire editing (need to see wires to manipulate them)

The planning document states drag & drop is part of MVP but current implementation has two-click placement. Visual rendering is the first step toward improving the interaction model.

### Estimated Effort

3-5 days of focused development
- Day 1: Design component visual representations (sketch/prototype)
- Day 2: Implement ComponentRenderer and basic shapes
- Day 3: Integrate rendering into BreadboardApp, handle layering
- Day 4: Polish visuals, test with various circuits
- Day 5: Accessibility review, ensure voltage overlays still work

### Dependencies

None - all required data exists in current component state

### Risks

- **Visual clutter**: Too many overlays (holes, voltage colors, components) may be confusing
  - *Mitigation*: Use semi-transparency, clear layering, and minimalist designs
  
- **Licensing**: Must not reuse Fritzing graphics
  - *Mitigation*: Create original SVG symbols or use geometric shapes with labels
  
- **Performance**: Rendering 300 holes + components + overlays may be slow
  - *Mitigation*: Use efficient DOM updates, consider canvas later if needed

## Why This Task Now

This is the most important gap because:

1. **Fundamental usability**: The tool is nearly unusable without seeing components. This is more critical than advanced features like current animation or error detection.

2. **Prerequisite for other features**: Many planned features depend on visual components:
   - Selection and manipulation require visible components
   - Drag-and-drop requires rendering during drag
   - Rotation handles need a visual element to attach to
   - Wire editing requires visible wires

3. **User feedback priority**: Any user testing would immediately identify invisible components as the #1 issue.

4. **Natural progression**: 
   - ✅ Breadboard grid rendering
   - ✅ Component placement logic
   - ✅ Circuit extraction
   - ✅ Simulation
   - ✅ Voltage visualization
   - ⏭️ **Component visualization** ← We are here
   - ⏯️ Current animation
   - ⏯️ Error detection

5. **Quick win with high impact**: This is a well-defined task with clear success criteria and high user value.

## Comparison with Other Gaps

**Why not current animation?** Current animation is the next visualization feature in the roadmap, but it's less critical than seeing the components themselves. Users need to see *what* they've built before seeing *how* electricity flows through it.

**Why not error detection?** Error detection and helpful messages would be valuable, but without visual components, users can't see what's wrong anyway. Visual rendering must come first.

**Why not undo/redo?** Undo/redo is a quality-of-life feature, but it's useless if users can't see what they're undoing. Visual feedback is more fundamental.

**Why not better circuit simulation?** The simulation already works for basic circuits. Better algorithms don't help if users can't see their circuits.

## Next Steps After This Task

Once component visualization works:
1. Improve interaction model (drag-and-drop, ghost preview during placement)
2. Add selection model (click to select components, show handles)
3. Implement component deletion (Del key, or click to delete)
4. Add rotation capability (R key, rotation handles)
5. Then move to current animation (next visualization feature)
