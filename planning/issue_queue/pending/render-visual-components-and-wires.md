# Render Visual Components and Wires on Breadboard

## Context

Breadboard Lab currently has a functional circuit simulation with voltage visualization, but placed components and wires are **invisible to users**. Only small "occupied" markers on holes indicate that components exist. This creates a significant usability and educational barrier: users cannot see the circuit they are building.

## Gap Analysis

**Long-term goal**: A best-in-class breadboard UI where components and wires are rendered visually with clear graphics, similar to real breadboard prototyping (planning/vision/goal.md, lines 47-82).

**Current state**: 
- Components exist in the data model and simulation works correctly
- Holes show small "occupied" markers when components are placed
- No graphical representation of resistors, LEDs, wires, power supplies, or ground connections
- Voltage overlays display correctly, but without visible components, the circuit topology is unclear
(planning/state/system_capabilities.md, lines 86-96)

**Gap**: Users cannot see their circuit. This is the most critical visual/UX gap preventing the tool from being truly educational.

## Proposed Development Task

**Implement visual rendering of components and wires on the breadboard canvas**

### Scope

Create visual representations for all five component types:

1. **Wire** - Colored line (red/black/yellow) connecting two holes
2. **Resistor** - Rectangular body with color bands, spanning between two holes  
3. **LED** - Bulb shape with anode/cathode indication
4. **Power Supply** - Recognizable power symbol (⚡ or voltage source icon)
5. **Ground** - Ground symbol (⏚ or triangle)

### Technical Approach

**Option A: CSS/HTML-based rendering (Recommended for MVP)**
- Render components as absolutely positioned `<div>` elements with CSS styling
- Use CSS transforms to position and orient components between holes
- Wires: Use CSS borders or SVG lines
- Components: Use Unicode symbols + styled boxes
- Pros: Simple, no new dependencies, accessible, easy to modify
- Cons: Limited visual quality, may not scale to complex graphics

**Option B: SVG-based rendering**
- Render components as SVG elements embedded in the breadboard
- Define SVG paths for each component type
- Use transforms to position and rotate
- Pros: Crisp graphics, scalable, professional appearance
- Cons: More complex implementation, need to create SVG assets

**Option C: Canvas-based rendering (Future, with Konva.js)**
- Migrate to Konva.js or PixiJS for full canvas rendering
- Implement as per planning document decision record DR-001
- Pros: Best performance, professional look, enables advanced interactions
- Cons: Significant refactoring, adds dependency, overkill for MVP

**Recommendation**: Start with **Option A** (CSS/HTML) for MVP, migrate to **Option C** (Canvas) in v0.2.

### Implementation Plan

#### Phase 1: Wire Rendering
1. Calculate wire path between two hole positions
2. Render as SVG `<line>` or CSS div with border
3. Support wire colors (red, black, yellow for visual distinction)
4. Layer wires below components (z-index management)

#### Phase 2: Component Rendering  
1. Create component rendering functions for each type
2. Calculate component position and orientation from pin positions
3. Render resistor with color bands (1kΩ = brown-black-red)
4. Render LED with polarity indicator (anode longer leg)
5. Render power/ground with clear symbols

#### Phase 3: Integration
1. Integrate rendering into `BreadboardApp.render()` method
2. Ensure voltage overlays still work (layer above components)
3. Update on every component placement
4. Add visual tests (manual or screenshot-based)

### Visual Design Specifications

**Wire:**
- Width: 3-4px
- Colors: Red (power), Black (ground), Yellow/Blue (signal)
- Style: Straight line with rounded ends
- Draw from hole center to hole center

**Resistor (1kΩ):**
- Body: 8mm length × 3mm diameter (scaled to UI)
- Color bands: Brown (1), Black (0), Red (×100), Gold (±5%)
- Orientation: Horizontal or vertical based on pin positions
- Leads extend to holes

**LED:**
- Body: 5mm diameter circle
- Color: Amber/yellow fill when not lit, bright when lit (future: use voltage)
- Anode: Longer lead (visual indicator)
- Cathode: Shorter lead, flat edge on body

**Power Supply:**
- Symbol: ⚡ or standard voltage source symbol
- Size: Fits within 2-3 hole spacing
- Label: "5V" text overlay

**Ground:**
- Symbol: ⏚ or three horizontal lines (decreasing length)
- Size: Fits within 1-2 hole spacing
- Color: Black

### Success Criteria

- [ ] All five component types are visually rendered on the breadboard
- [ ] Wires display as colored lines connecting holes
- [ ] Resistors show recognizable color bands (1kΩ pattern)
- [ ] LEDs show polarity (anode/cathode distinction)
- [ ] Power and ground symbols are clear and recognizable
- [ ] Components layer correctly (wires below components, voltage overlay above)
- [ ] Rendering updates immediately after placement
- [ ] Visual design is consistent with breadboard prototyping conventions
- [ ] No visual conflicts with voltage heatmap overlay
- [ ] Rendering works on different screen sizes/resolutions

### Educational Impact

This feature **unlocks true educational value**:

1. **Visual learning**: Students see what they're building, not just data
2. **Circuit topology clarity**: Understand how components connect
3. **Real-world mapping**: Visual similarity to physical breadboards aids learning transfer
4. **Debugging support**: Easier to spot wiring errors when wires are visible
5. **Foundation for current animation**: Current arrows need visible wires to animate on

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- Listed under "Future Enhancements" section of README (line 103)
- Prerequisite for current animation feature (line 1052)
- Necessary for achieving "best-in-class breadboard UI" goal (line 47)

From planning document UI/UX requirements (lines 244-253):
- Supports user understanding of component placement
- Enables visual validation of circuits before simulation
- Necessary for eventual drag-and-drop interactions

### Estimated Effort

**3-5 days of focused development**

- Day 1: Implement wire rendering (SVG lines or CSS borders)
- Day 2: Implement resistor rendering with color bands
- Day 3: Implement LED, power, and ground rendering
- Day 4: Integration, layering, and visual polish
- Day 5: Testing with various circuit configurations, accessibility review

### Dependencies

**None** - all required data exists in current data model:
- Component positions are in `BreadboardState`
- Component types are known
- Breadboard hole positions are calculable

### Risks & Mitigations

**Risk 1: Component graphics may look unprofessional**
- Mitigation: Use simple, clear symbols for MVP; professional graphics in v0.2
- Mitigation: Reference electrical symbol standards (IEEE, IEC)

**Risk 2: Overlapping components may be unclear**
- Mitigation: Use z-index layering carefully (wires < components < overlays)
- Mitigation: Add subtle shadows or borders for depth

**Risk 3: Rendering performance with many components**
- Mitigation: Start with simple CSS/SVG, profile performance
- Mitigation: Optimize by using CSS transforms, avoid layout thrashing

**Risk 4: Licensing concerns with component graphics**
- Mitigation: Create original graphics or use geometric shapes
- Mitigation: DO NOT reuse Fritzing SVG assets (licensing violation)
- Citation: planning/vision/goal.md lines 156-176 (licensing constraints)

### Assets Required

**Create or source:**
1. Resistor color band patterns (procedurally generated is fine)
2. LED shape (simple circle + legs)
3. Power supply symbol (⚡ or standard IEEE symbol)
4. Ground symbol (⏚ or standard IEEE symbol)

All assets must be:
- Original or public domain / CC0 licensed
- Compatible with MIT license
- Not derived from Fritzing parts (see planning/vision/goal.md, line 162)

### Testing Strategy

**Visual validation:**
1. Build reference circuits (LED + resistor, voltage divider)
2. Compare visual output to expected appearance
3. Verify components don't overlap incorrectly
4. Check voltage overlay still visible

**Functional validation:**
1. Verify rendering doesn't break existing functionality
2. Test with all component types
3. Test with multiple components of same type
4. Verify "Clear All" removes rendered components

**Regression testing:**
1. Run existing unit tests (should all pass)
2. Verify circuit simulation still works
3. Verify voltage overlay still works

## Why This Task Now

This is the most important next gap because:

1. **Usability blocker**: Without visual components, the tool is nearly unusable for educational purposes
2. **Foundation for other features**: Current animation (next MVP item) requires visible wires
3. **User feedback loop**: Users need to see what they've built to validate and learn
4. **Low risk, high impact**: Rendering is additive; doesn't break existing simulation
5. **Educational alignment**: Visual learning is core to the breadboard metaphor
6. **Differentiator**: Competitors (Falstad) lack breadboard view; this is our USP

**Priority vs. alternatives:**
- **Current animation** (next in MVP): Requires visible wires first
- **Error detection** (next in MVP): Less impactful without visible components  
- **Drag-and-drop**: Usability improvement but not fundamental
- **Component deletion**: Nice-to-have but not critical for learning

## Next Steps After This Task

Once visual rendering works:

1. **Current animation overlay** (planning/vision/goal.md, lines 792-815)
   - Animate particles flowing through visible wires
   - Show current direction and magnitude
   
2. **Error detection overlays** (planning/vision/goal.md, lines 832-849)
   - Highlight short circuits visually
   - Show floating nodes
   - Indicate reversed LED polarity
   
3. **Component interaction improvements**
   - Click to select (show component details)
   - Delete individual components
   - Edit component values

4. **Drag-and-drop placement** (planning/vision/goal.md, lines 230-254)
   - Ghost preview while dragging
   - Snap-to-grid placement
   - Rotation handles
