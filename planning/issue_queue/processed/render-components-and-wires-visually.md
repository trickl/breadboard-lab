Render components and wires visually on the breadboard

## Context

Breadboard Lab currently simulates circuits and displays voltage heatmaps, but the components and wires themselves are invisible. Users place components through a two-click interaction, but only see "occupied" markers on breadboard holes—not the actual resistors, LEDs, wires, or power supplies. This creates a fundamental usability problem: the voltage heatmap visualizes an invisible circuit.

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with drag/drop, rotate, snap, and intuitive visual representation of all components (planning/vision/goal.md, lines 47-51, 221-283).

**Current state**: 
- Component placement works functionally (two-click interaction)
- Components exist in application state and circuit simulation
- Voltage overlay displays correctly on holes
- **BUT**: No visual representation of components (planning/state/system_capabilities.md, line 94)
- **AND**: No wire rendering—wires are completely invisible (planning/state/system_capabilities.md, line 95, line 439)

**Gap**: The most critical missing capability is visual rendering of placed components and wires on the breadboard canvas.

## Proposed Development Task

**Implement visual rendering of components and wires on the breadboard**

### Scope

Create a visual rendering system that:
1. Draws each component type with a distinctive visual representation
2. Renders wires as visible paths between connected holes
3. Shows component orientation and position on the breadboard
4. Maintains visual clarity when voltage overlays are enabled
5. Provides visual feedback that components are successfully placed

### Technical Approach

**Component rendering options** (per planning/vision/goal.md, lines 162-169):
- Use geometric shapes with labels (e.g., rectangle + "1kΩ" for resistor)
- Create simple SVG representations for each component type
- Ensure components render above the breadboard grid but below interaction overlays

**Wire rendering**:
- Draw straight lines between wire start and end positions (MVP)
- Use distinct colors for different wires (e.g., red, black, yellow)
- Consider orthogonal routing (Manhattan-style) for better visual clarity
- Render wires below components (layering)

**Implementation strategy**:
- Extend `BreadboardApp.renderBreadboard()` to include component rendering pass
- Add rendering methods for each component type (resistor, LED, power supply, ground, wire)
- Use SVG or Canvas overlays on top of the breadboard grid
- Ensure components don't obscure hole positions (users still need to click holes)

### Success Criteria

- [ ] All five component types (wire, resistor, LED, power supply, ground) render visibly
- [ ] Components render at correct breadboard positions
- [ ] Wires display as visible paths connecting their endpoints
- [ ] Visual distinction between component types is clear
- [ ] Voltage heatmap overlay remains visible alongside components
- [ ] Component rendering updates immediately after placement
- [ ] Visual representation does not interfere with hole clicking
- [ ] Component visuals follow accessibility guidelines (high contrast, clear shapes)

### Educational Impact

This feature is fundamental to usability and learning:
- **Usability**: Users can see what they've built, making the tool actually usable
- **Understanding**: Visual representation helps students connect physical components to circuit behavior
- **Debugging**: Seeing component placement errors visually (e.g., wrong orientation) aids learning
- **Confidence**: Visual feedback confirms successful operations

Without component rendering, the tool is confusing and frustrating. With it, the breadboard becomes an intuitive workspace.

### Alignment with Roadmap

This task is essential for MVP (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Component placement" with visual feedback is a core MVP requirement
- 🎯 "Wiring (hole-to-hole connections)" must include visual rendering
- Foundation for drag-and-drop improvements (post-MVP)
- Prerequisite for component rotation visual feedback
- Enables users to actually understand what they're building

### Estimated Effort

3-4 days of focused development
- Day 1: Design component visual representations (simple geometric shapes/SVGs)
- Day 2: Implement rendering logic for all five component types
- Day 3: Implement wire rendering with proper layering
- Day 4: Polish visual design, test with voltage overlay, ensure accessibility

### Dependencies

None - all required data exists in `BreadboardState` and component definitions

### Risks

- **Visual clutter**: Components plus voltage overlay plus holes may create visual noise
  - *Mitigation*: Use layering and semi-transparency; iterate on visual design
- **Licensing**: Cannot reuse Fritzing graphics (planning/vision/goal.md, lines 161-169)
  - *Mitigation*: Use simple geometric shapes and text labels (fully original)
- **Performance**: Rendering 300+ holes plus components may impact performance
  - *Mitigation*: Use efficient DOM updates; profile rendering performance

## Why This Task Now

This is the most important gap because:

1. **Fundamental usability**: Users cannot effectively use a tool where they can't see what they're building
2. **Prerequisite for all UI improvements**: Drag-and-drop, rotation, and selection all require visible components
3. **Educational value**: Students need to see components to learn about breadboard layout
4. **Validates voltage heatmap**: The newly-completed voltage visualization (PR #12) only makes sense when overlaying visible components
5. **Unblocks user testing**: Cannot conduct meaningful user testing when circuits are invisible
6. **MVP requirement**: Explicitly listed in planning document as core MVP capability

Currently, the tool has excellent circuit simulation and voltage visualization, but lacks the most basic UI requirement: showing users what they've built. This is the logical next step.

## Next Steps After This Task

Once component rendering works:
1. Improve simulation to handle parallel circuits (current limitation per system_capabilities.md, lines 172-175)
2. Add component deletion and editing capabilities (currently missing per system_capabilities.md, line 89)
3. Implement current animation on wires (planning/vision/goal.md, lines 792-815)
4. Add error detection and visual error overlays (planning/vision/goal.md, lines 832-849)
5. Improve component placement UX with drag-and-drop (planning/vision/goal.md, lines 230-256)
