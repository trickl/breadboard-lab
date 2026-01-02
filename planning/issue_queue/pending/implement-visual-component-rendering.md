Implement visual component rendering on breadboard

## Context

Breadboard Lab has a functional circuit simulation engine with voltage visualization, but placed components are invisible. Only "occupied" markers on breadboard holes indicate component presence (planning/state/system_capabilities.md, lines 94-95). This creates a severe usability and educational barrier: users cannot see what they've built.

The vision document emphasizes that this is a "breadboard UI" not a "drawing tool" (planning/vision/goal.md, lines 13-15), yet without visual components, users experience the opposite—an invisible circuit that exists only in memory.

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with drag/drop, rotate, snap, and visual component rendering (planning/vision/goal.md, lines 46-51).

**Current state**: 
- Components are placed via two-click interaction
- Only "occupied" class on holes indicates component presence
- No graphical representation of resistors, LEDs, wires, or other components
- Voltage heatmap works, but users cannot see what is creating those voltages

**Gap**: The most critical usability gap blocking effective learning and user adoption.

## Proposed Development Task

**Implement visual rendering for all five component types on the breadboard**

### Scope

Create visual representations that:
1. Render graphical components overlaid on breadboard holes
2. Show component type clearly (resistor, LED, wire, power supply, ground)
3. Display component orientation (which holes are connected)
4. Update immediately when components are placed
5. Scale appropriately to breadboard grid
6. Follow accessibility guidelines (sufficient contrast, clear shapes)

### Technical Approach

#### Rendering Strategy
- Add a component rendering layer in the DOM/Canvas between holes and overlays
- Use SVG or canvas-based shapes for components
- Position components based on pin hole coordinates
- Ensure components don't obscure voltage heatmap (use semi-transparency or layering)

#### Component Visual Designs (Avoiding Fritzing Graphics - DR-004)

Per the vision document's licensing constraints (planning/vision/goal.md, lines 153-177), we must create original graphics:

1. **Resistor** (1kΩ)
   - Rectangle body with color bands (brown-black-red)
   - Wire leads extending to hole positions
   - Label: "1kΩ"

2. **LED** 
   - Triangle pointing in forward direction (anode → cathode)
   - Rounded dome top
   - Color: Red or amber
   - Polarity indicators (flat edge on cathode side)

3. **Wire**
   - Solid line from hole to hole
   - Optional: Curved/bezier path for aesthetics
   - Color: Configurable (red, black, yellow, etc.)
   - Width: 2-3px

4. **Power Supply** (5V)
   - Battery symbol (+ and - terminals)
   - "5V" label
   - Red color for positive

5. **Ground**
   - Standard ground symbol (three horizontal lines decreasing in width)
   - Black color
   - "GND" label

#### Implementation Details

- Extend `BreadboardApp` to include component rendering pass
- Create utility functions: `renderResistor()`, `renderLED()`, `renderWire()`, etc.
- Calculate component position/rotation from pin positions
- Layer order (bottom to top):
  1. Breadboard holes
  2. Voltage heatmap overlay
  3. Components
  4. Selection indicators (future)

#### CSS/Canvas Considerations
- If using SVG: Clean, scalable, accessible, but may be slower with many components
- If using Canvas: Fast, but requires manual drawing logic
- Recommendation: Start with SVG for clarity, optimize to canvas if needed

### Success Criteria

- [ ] All five component types are visually rendered on placement
- [ ] Components are clearly distinguishable by type
- [ ] Component orientation/polarity is obvious
- [ ] Rendering updates immediately when components are placed
- [ ] Visual components do not obscure voltage heatmap
- [ ] Components scale appropriately to breadboard grid (no overlap, proper alignment)
- [ ] Visuals are accessible (sufficient contrast, clear for color-blind users)
- [ ] No performance degradation (60fps maintained with 20+ components)

### Educational Impact

This feature transforms the tool from "invisible circuit simulator" to "visual breadboard builder":
- Students see what they're building, not just text descriptions
- Component types are immediately recognizable
- Circuit topology becomes visually clear
- Voltage heatmap overlay gains context (users see *which components* create voltage drops)
- Foundation for future features (drag-to-move, rotation indicators, error highlights)

### Alignment with Roadmap

This task is **blocking multiple MVP features** (planning/vision/goal.md, lines 1041-1069):

1. ✅ Voltage heatmap overlay (complete)
2. ⚠️ Current animation overlay (requires visual wires to animate)
3. ⚠️ Component placement UI (works but invisible)
4. ⚠️ Rotation (R key) (no visual to rotate)
5. ⚠️ Error detection overlays (requires visual context)

Without visual components, the MVP is incomplete and unusable for real users.

### Estimated Effort

3-5 days of focused development
- Day 1: Design SVG component templates (resistor, LED, wire)
- Day 2: Implement rendering functions and integration with BreadboardApp
- Day 3: Add power supply and ground symbols
- Day 4: Polish positioning, scaling, and layering
- Day 5: Test with various circuits, accessibility review

### Dependencies

- Voltage heatmap overlay (complete in PR #12)
- BreadboardApp rendering infrastructure (exists)
- Component placement logic (exists)

### Risks

- **Graphics design**: May require iteration to find clear, accessible designs (mitigated by starting with simple geometric shapes)
- **Performance**: SVG may be slow with many components (mitigated by canvas fallback if needed)
- **Positioning accuracy**: Components must align precisely to holes (mitigated by using hole coordinates directly)
- **License compliance**: Must not use Fritzing graphics (mitigated by creating original designs)

## Why This Task Now

This is the most urgent gap because:

1. **Usability blocker**: Without visual components, the tool is barely usable
2. **Educational blocker**: Students cannot learn circuit building if they can't see circuits
3. **Foundation for MVP completion**: Blocks current animation, rotation, drag-drop, error detection
4. **High user impact**: Every user interaction requires seeing components
5. **Prerequisite for dogfooding**: Developers cannot effectively test/demo invisible circuits
6. **Marketing/adoption**: Screenshots of invisible circuits won't attract users

The voltage heatmap (PR #12) laid the foundation for visualization. Now we must make the circuits themselves visible so users can understand what they're building and how voltage flows through it.

## Next Steps After This Task

Once visual components exist:
1. Implement current animation overlay on rendered wires (planning/vision/goal.md, lines 792-815)
2. Add component rotation visual indicators (planning/vision/goal.md, lines 238-243)
3. Implement error detection overlays on components (planning/vision/goal.md, lines 832-849)
4. Add drag-and-drop for moving components (planning/vision/goal.md, lines 230-237)
