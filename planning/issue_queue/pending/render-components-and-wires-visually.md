# Render components and wires visually on the breadboard

## Context

Breadboard Lab successfully simulates circuits and visualizes voltage with color overlays (PR #12), but users cannot actually **see** the components and wires they place. Currently, only hole occupancy markers indicate where components are located. This creates a critical usability barrier: **students cannot see what they've built**, making the tool feel abstract and disconnected from physical breadboard prototyping.

The planning document emphasizes physical authenticity and immediate visual feedback as core design principles (planning/vision/goal.md, lines 207-213). Without visible components and wires, the breadboard is just a grid of colored holes—not an authentic representation of electronics prototyping.

## Gap Analysis

### Long-term goal

A "best-in-class breadboard UI" with visual component rendering, wire paths, and physical authenticity (planning/vision/goal.md, lines 46-51). The UI should look and feel like a real breadboard with actual components and jumper wires.

### Current state

From planning/state/system_capabilities.md:
- Line 94: "No visual representation of placed components (only 'occupied' marker on holes)"
- Line 95: "No wire rendering (wires are invisible except for hole markers)"
- Line 439: "Components are not drawn (only hole occupancy shown)"
- Line 440: "Wires are invisible"

Users can place components, but all they see is:
- Occupied hole markers (small filled circles)
- Voltage color overlays
- Text list in the info panel

### Gap

The most fundamental UX gap: **components and wires are completely invisible on the breadboard canvas**. This is not just a polish issue—it makes the tool barely usable for learning or prototyping.

## Proposed Development Task

**Implement visual rendering of components and wires on the breadboard**

### Scope

Create visual representations for:
1. **Wires** - Rendered as colored paths between holes (MVP: straight lines; stretch goal: curved)
2. **Resistors** - Rendered as rectangles with color bands or "1kΩ" label
3. **LEDs** - Rendered as small triangles or LED symbols with polarity indicators
4. **Power Supply** - Rendered with "5V" label or voltage source symbol
5. **Ground** - Rendered with ground symbol or "GND" label

All components should:
- Be positioned relative to their pin holes
- Scale appropriately to breadboard grid
- Not obscure voltage color overlays (render below or with transparency)
- Use simple geometric shapes (per planning document: avoid Fritzing graphics, create custom)

### Technical Approach

**Option 1: SVG overlays (recommended)**
- Add SVG layer on top of breadboard grid
- Render components as SVG paths/shapes
- Position using breadboard coordinates
- Lightweight, accessible, easy to style

**Option 2: Canvas rendering**
- Use HTML5 canvas for component layer
- Higher performance for many components
- More complex interaction handling

**Option 3: CSS/HTML elements**
- Create positioned div elements for each component
- Simplest implementation
- May have performance issues at scale

**Recommendation**: Start with SVG overlays—good balance of simplicity, performance, and visual quality.

### Implementation phases

**Phase 1: Wire rendering (highest impact)**
- Draw straight lines between wire endpoints
- Use distinct wire colors (red, black, yellow, green, blue) from a palette
- Render below voltage overlay layer (wires should be visible but not obstruct voltage colors)

**Phase 2: Component rendering**
- Resistor: Rectangle with "1kΩ" label
- LED: Triangle pointing from anode to cathode with small circle for LED body
- Power supply: Circle with "5V" label or lightning bolt symbol
- Ground: Standard ground symbol (three horizontal lines descending)

**Phase 3: Polish**
- Add component shadows for depth
- Improve visual hierarchy (wires → components → overlays)
- Optional: curved wire rendering for more natural appearance

### Success Criteria

- [ ] All wires are visible as colored lines connecting their endpoints
- [ ] All components have distinct visual representations
- [ ] Component type is recognizable from visual alone (without consulting info panel)
- [ ] Visual elements do not obscure voltage overlay colors
- [ ] Circuit layout is immediately understandable at a glance
- [ ] Rendering performance is acceptable (< 100ms to render typical circuit)
- [ ] Visual design follows planning document constraint: original graphics, not Fritzing assets

### Educational Impact

This feature transforms Breadboard Lab from a "circuit calculator with colored holes" into an **authentic breadboard simulator**. Students will:
- See the physical layout of their circuit (spatial reasoning)
- Recognize component types visually (component identification)
- Understand connections and topology (circuit comprehension)
- Debug placement errors visually (immediate feedback)
- Experience familiar breadboard metaphor (transfer to physical prototyping)

**Blocking factors**: Without visual components, user testing and feedback are severely limited. No one will want to use a breadboard tool where they can't see their components.

### Alignment with Roadmap

This feature is **implicitly required** for MVP (planning/vision/goal.md, lines 1041-1069):
- MVP success criterion: "User can build a simple LED circuit and see voltage heatmap" (line 1061)
  - Current state: User can build circuit and see heatmap, but **cannot see the LED or resistor**
  - This success criterion assumes components are visible
- "Interaction model may feel clunky" (line 1056) is directly caused by invisible components
- All future UI features (drag-drop, rotation, selection) require visible components

The planning document lists "Visual representation of wires and components" as a **Future Enhancement** (README.md, line 103), but this is outdated—it's actually critical for MVP usability.

### Estimated Effort

3-5 days of focused development:
- Day 1: Implement SVG rendering infrastructure and wire drawing
- Day 2: Implement resistor and LED rendering with basic shapes
- Day 3: Implement power supply and ground rendering
- Day 4: Polish visual design (colors, shadows, hierarchy)
- Day 5: Testing with various circuit layouts, performance validation

### Dependencies

None—all required data exists:
- Component positions are in `BreadboardState`
- Component types are known
- Breadboard layout coordinates are available
- Rendering infrastructure exists (DOM, CSS)

### Risks

1. **Performance**: 50+ components with SVG elements may impact rendering speed
   - **Mitigation**: Profile early; optimize rendering; use canvas if needed
   
2. **Visual design quality**: Custom component graphics may look amateurish
   - **Mitigation**: Start with simple geometric shapes; iterate based on user feedback
   
3. **Licensing constraints**: Must not use Fritzing graphics (planning/vision/goal.md, lines 163-168)
   - **Mitigation**: Create original SVG graphics or use geometric primitives

4. **Overlay conflicts**: Components may obscure voltage colors
   - **Mitigation**: Careful layering (wires at bottom, components with transparency, voltage overlay on holes)

## Why This Task Now

This is the highest-priority gap because:

1. **Blocks user adoption**: No one will seriously use a breadboard tool where components are invisible
2. **Fundamental UX issue**: Not a polish or nice-to-have—it's a basic requirement for usability
3. **Educational blocker**: Students cannot learn circuit layout without seeing circuit layout
4. **Foundation for other features**: Drag-drop, rotation, selection all require visible components
5. **High impact, clear scope**: Well-defined deliverable with immediate user value
6. **Already behind schedule**: Planning document assumed visual components would exist by MVP

### Priority justification

Compared to other missing MVP features:
- **Current animation** (lines 792-815): Educational value, but less critical than seeing components at all
- **Error detection** (line 1053): Important, but users must see their circuit first before debugging it
- **Drag & drop** (line 1046): Better UX, but meaningless when you can't see what you're dragging

**Visual component rendering unlocks everything else**. It should have been part of the initial UI implementation.

## Next Steps After This Task

Once components and wires are visible:
1. Implement component selection and deletion (prerequisite for undo/redo)
2. Add drag-and-drop interaction with visual preview
3. Implement rotation with visual feedback
4. Add current animation overlays on visible wires
5. Implement error detection with visual error icons on components

## Alternative Considered

**Alternative**: Implement current animation next (as listed in MVP roadmap line 1052)

**Why rejected**: Current animation is meaningless on invisible wires. Students need to see the circuit structure before they can understand current flow. Visual rendering is the prerequisite.

---

**Acceptance criteria summary**:
- All component types have distinct, recognizable visual representations
- All wires are visible as colored lines
- Visual elements do not obscure voltage overlays
- Performance is acceptable (< 100ms render time)
- Visual design uses original graphics (no licensing issues)
