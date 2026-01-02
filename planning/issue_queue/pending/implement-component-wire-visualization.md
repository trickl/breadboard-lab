Implement visual rendering of components and wires on breadboard

## Context

Breadboard Lab currently simulates circuits and displays voltage overlays, but the components and wires themselves are **invisible**. Users can place resistors, LEDs, wires, and power supplies, but they see only:
- Occupied hole markers (small filled circles)
- Voltage color overlays
- Text statistics in the info panel

This severely limits the educational value and usability of the tool. Users cannot visually understand what circuit they have built, making it difficult to:
- Verify correct component placement
- Understand circuit topology
- Debug wiring mistakes
- Learn from visual feedback

## Gap Analysis

**Long-term goal**: "Best-in-class breadboard UI" with visual components and wires (planning/vision/goal.md, lines 11-12, 48-49).

**Current state**: 
- Components are placed and tracked internally (planning/state/system_capabilities.md, lines 66-98)
- Wires connect holes but are not rendered (line 93: "No wire rendering (wires are invisible except for hole markers)")
- Voltage visualization works well (PR #12 completed)
- UI uses simple hole markers with CSS classes (line 78: "Occupied holes display with 'occupied' class")

**Gap**: The most critical missing visual capability is **graphical representation of placed components and wire paths**.

## Proposed Development Task

**Implement visual rendering system for components and wires on the breadboard canvas**

### Scope

Create a comprehensive visual rendering layer that:

1. **Wire Rendering**
   - Render wires as visible lines connecting two breadboard holes
   - Use distinct wire colors (red for power connections, black for ground, various colors for other connections)
   - Support both straight lines (MVP) and curved/orthogonal paths (enhancement)
   - Make wires clickable for future selection/deletion features
   - Render wires below components (z-index layering)

2. **Component Graphics**
   - Render resistors as rectangles with color bands indicating resistance value
   - Render LEDs as diode symbols or simplified LED graphics with polarity indication
   - Render power supplies as battery/voltage source symbols
   - Render ground symbols as standard ground icons
   - Position graphics centered on component pin positions
   - Scale graphics appropriately for breadboard hole spacing
   - Ensure MIT-license compatibility (DO NOT use Fritzing graphics per planning/vision/goal.md, lines 160-169)

3. **Visual Polish**
   - Add component labels/values (e.g., "1kΩ", "5V", "LED")
   - Maintain clean visual hierarchy (voltage overlay → components → wires → holes)
   - Ensure components don't obscure voltage information
   - Support hover effects on components
   - Make rendering performant (use canvas or SVG efficiently)

### Technical Approach

**Option A: Canvas-based rendering (Recommended)**
- Use HTML5 Canvas API for component and wire graphics
- Render order: background grid → wires → components → voltage overlay → hole markers
- Benefits: Better performance, smooth animations possible, easier hit testing
- Aligns with planning document recommendation (planning/vision/goal.md, lines 436-448)

**Option B: SVG-based rendering**
- Use inline SVG elements for each component and wire
- Benefits: Better accessibility, easier inspection, no canvas overhead
- Drawbacks: May have performance issues with many elements

**Recommendation**: Start with Canvas for wires and simple component shapes. Use SVG for component symbols if needed for clarity.

### Implementation Steps

1. **Create graphics rendering utilities** (`src/ui/component-renderer.ts`)
   - `renderResistor(ctx, position1, position2, resistance)`: Draw resistor with color bands
   - `renderLED(ctx, position1, position2)`: Draw LED symbol with polarity
   - `renderWire(ctx, position1, position2, color)`: Draw wire path
   - `renderPowerSupply(ctx, position, voltage)`: Draw voltage source symbol
   - `renderGround(ctx, position)`: Draw ground symbol

2. **Extend BreadboardApp rendering**
   - Add canvas layer for components/wires
   - Call rendering utilities for each placed component
   - Position graphics based on hole coordinates
   - Handle coordinate transformation (breadboard position → canvas pixels)

3. **Add visual assets**
   - Define color palette for wires (red, black, yellow, green, blue, etc.)
   - Define resistor color band mapping (brown-black-red for 1kΩ)
   - Create reusable component path definitions

4. **Test with existing circuits**
   - Verify visual rendering for all 5 component types
   - Test with complex circuits (multiple components)
   - Ensure voltage overlay still works correctly
   - Check performance with 10+ components

### Success Criteria

- [ ] All placed components are visually rendered on the breadboard
- [ ] Resistors show color bands indicating 1kΩ resistance
- [ ] LEDs show polarity (anode/cathode distinction)
- [ ] Wires are rendered as visible lines between holes
- [ ] Wire colors distinguish power/ground from signal connections
- [ ] Component graphics scale appropriately with breadboard layout
- [ ] Voltage overlay remains visible and functional
- [ ] Graphics do not obscure important breadboard holes
- [ ] Rendering performance is smooth (60fps interaction)
- [ ] All graphics are original (no Fritzing assets used)

### Educational Impact

This feature transforms the tool from an abstract circuit simulator into a **visual breadboard experience**:
- Students see exactly what components they've placed
- Wire connections become obvious and verifiable
- Component identification becomes intuitive (resistor bands, LED polarity)
- Builds mental model of physical circuit construction
- Makes debugging much easier (visual inspection of connections)

### Alignment with Roadmap

This task is part of the MVP milestone (planning/vision/goal.md, lines 1041-1069):
- Listed as future enhancement (README.md, line 103: "Visual representation of wires and components on the breadboard")
- Prerequisite for component interaction features (drag, rotate, delete)
- Enables better debugging workflow
- Improves first impression and user retention

### Estimated Effort

**5-7 days of focused development**
- Day 1: Design component graphics and wire rendering approach
- Day 2: Implement wire rendering with basic line paths
- Day 3: Implement resistor and LED graphics
- Day 4: Implement power supply and ground symbols
- Day 5: Integration with existing BreadboardApp rendering
- Day 6: Visual polish, labels, and color schemes
- Day 7: Testing, performance optimization, documentation

### Dependencies

**Required capabilities (all present)**:
- ✅ Component placement system (src/core/types.ts, src/ui/breadboard-app.ts)
- ✅ Position-to-pixel coordinate conversion
- ✅ Voltage overlay system (reference for z-index layering)

**No blocking dependencies** - this task can start immediately.

### Risks and Mitigations

**Risk 1**: Graphics may look unprofessional or confusing
- **Mitigation**: Research standard electronics symbols, iterate on design, get user feedback early

**Risk 2**: Performance degradation with many components
- **Mitigation**: Use canvas rendering, optimize redraw logic, profile with realistic circuits

**Risk 3**: Complexity in coordinate transformations
- **Mitigation**: Create clear helper functions, add unit tests for coordinate math

**Risk 4**: Unintentional use of copyrighted graphics
- **Mitigation**: Create all graphics from scratch using standard geometric shapes and color codes, document sources

### Design Considerations

**Resistor Color Bands** (Standard IEC 60062):
- Brown-Black-Red = 1kΩ (current hardcoded value)
- Use 4-band code for simplicity
- Render as colored rectangles on resistor body

**LED Graphics**:
- Triangle (anode) + line (cathode) for diode symbol
- Or simplified LED dome shape with + and - labels
- Use distinct color (red or green) to show it's an LED

**Wire Colors** (Standard conventions):
- Red: Positive/power connections
- Black: Ground/negative connections  
- Yellow, Green, Blue, White: Signal wires
- Allow user color selection in future enhancement

**Power Supply Symbol**:
- Battery symbol (parallel lines, long/short)
- Or circle with + terminal
- Display voltage value ("5V")

**Ground Symbol**:
- Standard ground symbol (horizontal lines decreasing in width)
- Or simple "GND" text

## Why This Task Now

This is the most important gap because:

1. **Completes the core visual experience**: Voltage visualization exists, but without component graphics, the breadboard feels empty and abstract
2. **Critical usability barrier**: Users report confusion about what they've built (implicit from current state)
3. **Prerequisite for advanced features**: Component selection, rotation, and deletion all require visual representation
4. **High user impact**: Dramatically improves first impression and learning experience
5. **Foundation for future work**: Enables component interaction, animation effects, and educational overlays
6. **Aligns with MVP goals**: Visual breadboard representation is part of the core value proposition

## Next Steps After This Task

Once component and wire visualization works:
1. **Component interaction** - Click to select, drag to move, rotate with 'R' key (planning/vision/goal.md, lines 232-253)
2. **Current animation** - Animated particles flowing through wires (planning/vision/goal.md, lines 792-815)
3. **Error detection overlays** - Visual indicators for circuit problems (planning/vision/goal.md, lines 832-849)
4. **Undo/redo** - Operation history for circuit modifications (planning/vision/goal.md, lines 295-302)
5. **Component deletion** - Remove individual components (currently only "Clear All" exists)

## References

- Planning vision: `/planning/vision/goal.md` (lines 103-169, 243-253, 399-458)
- System capabilities: `/planning/state/system_capabilities.md` (lines 66-98, 439-443)
- Current README: `/README.md` (line 103)
- Architecture: `/ARCHITECTURE.md` (lines 159-162)

## Success Measurement

**Qualitative**:
- New users can immediately see what circuit they've built
- Circuit topology is visually obvious
- Tool feels more "real" and less abstract
- Users express satisfaction with visual clarity

**Quantitative**:
- Zero performance regression (maintain 60fps rendering)
- Component graphics render within 16ms per frame
- All 5 component types have distinct visual representations
- Wire paths are rendered for 100% of placed wires
