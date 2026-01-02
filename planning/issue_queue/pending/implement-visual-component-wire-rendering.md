Implement visual rendering of components and wires on breadboard

## Context

Breadboard Lab currently places components and wires on a breadboard grid, but these elements are completely invisible. The UI only shows which holes are "occupied" with a small marker, making it impossible to visually understand the circuit layout. The planning document emphasizes a "best-in-class breadboard UI" as a core objective, but without visible components and wires, the interface is abstract and unintuitive.

## Gap Analysis

**Long-term goal**: A physically authentic breadboard interface where users can see components (resistors, LEDs, wires) rendered with recognizable visual representations (planning/vision/goal.md, lines 47-51, 207-212).

**Current state**: Components and wires exist in the data model and participate in circuit extraction and simulation, but they have no visual representation. Users see only:
- Breadboard holes as circles
- "Occupied" markers on holes (small fill)
- Voltage heatmap overlays (implemented in PR #12)
- Circuit info panel with text statistics

(planning/state/system_capabilities.md, lines 89-96)

**Gap**: The most critical missing capability is visual rendering of components and wires, which is:
1. A prerequisite for many other features (current animation, component selection/manipulation, drag-and-drop)
2. Essential for educational value (students need to see what they're building)
3. Necessary for the tool to resemble an actual breadboard
4. Required before implementing current animation (can't animate invisible wires)

## Proposed Development Task

**Implement visual rendering of all component types and wire paths on the breadboard canvas**

### Scope

Create visual representations for:
1. **Wires**: Render as colored lines connecting two holes
2. **Resistors**: Render as rectangles with "1kΩ" label spanning two holes
3. **LEDs**: Render as small circles/triangles with direction indicator
4. **Power Supply**: Render as "+" symbol at connected hole
5. **Ground**: Render as ground symbol (⏚) at connected hole

### Technical Approach

**Component Rendering Layer:**
- Add a rendering pass after breadboard holes but before voltage overlay
- For each component in state, render appropriate SVG/Canvas graphics
- Position components based on their pin positions
- Use color coding: red wires, brown resistors, red/green LEDs, etc.

**Wire Rendering:**
- Draw SVG/Canvas line from start position to end position
- Start with straight lines (MVP); orthogonal/curved paths can come later
- Use different colors for different wires (red, black, yellow, green, blue)
- Optional: Add slight curve/physics for more natural appearance (stretch goal)

**Coordinate Mapping:**
- Map breadboard hole positions (row, col) to pixel coordinates (x, y)
- Calculate center points of holes for component pin placement
- Handle center gap between left (cols 0-4) and right (cols 5-9) sides

**Graphics Approach Decision:**
- Option A: SVG elements for each component (good for accessibility, easier selection)
- Option B: Canvas rendering (better performance for many components)
- Recommendation: Start with SVG for clarity and ease of implementation

**Asset Strategy:**
- DO NOT reuse Fritzing graphics (licensing restrictions, planning/vision/goal.md lines 161-164)
- Create simple geometric shapes: rectangles for resistors, circles for LEDs
- Use text labels for component values (e.g., "1kΩ", "5V")
- Color-code components for quick recognition
- Consider accessibility: use patterns in addition to colors

### Success Criteria

- [ ] All wire components are visible as colored lines between their endpoints
- [ ] All resistor components show as rectangles with "1kΩ" label
- [ ] All LED components show with directional indicator (anode vs cathode)
- [ ] All power supply components show "+" symbol or "5V" label
- [ ] All ground components show ground symbol
- [ ] Component rendering does not obscure voltage heatmap overlay
- [ ] Visual representation updates immediately when components are placed
- [ ] No visual glitches or overlapping rendering issues
- [ ] Components are visually distinguishable from each other
- [ ] Circuit is recognizable as a breadboard layout to someone familiar with electronics

### Educational Impact

This feature is foundational for the tool's educational value:
- **Visual learning**: Students understand circuit topology by seeing it
- **Physical authenticity**: Resembles actual breadboard prototyping
- **Error prevention**: Users can visually verify correct placement before simulation
- **Mental model**: Bridges gap between abstract circuit concepts and physical implementation
- **Debugging**: Visual inspection reveals wiring mistakes

Without visual components, Breadboard Lab is essentially a data entry form for circuit simulation. With visual components, it becomes an interactive learning environment.

### Alignment with Roadmap

This task is fundamental to MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 Listed as implicit requirement: "best-in-class breadboard UI" requires visible components
- Prerequisite for "Current animation overlay" (can't animate invisible wires)
- Enables future drag-and-drop interaction
- Required for component selection and manipulation
- Foundation for physical authenticity principle

The completed voltage heatmap task (planning/issue_queue/complete/implement-voltage-heatmap-overlay.md) suggested "current animation on wires" as the next step, but that logically requires visible wires first.

### Estimated Effort

3-4 days of focused development
- Day 1: Implement wire rendering (lines between holes)
- Day 2: Implement resistor and LED rendering (geometric shapes)
- Day 3: Implement power/ground symbols, coordinate mapping refinement
- Day 4: Polish visual design, handle edge cases (overlapping components), accessibility

### Dependencies

**None** - All required data exists in current system:
- Component positions are in state
- Breadboard layout provides hole positions
- Component types are known

**Prerequisite for:**
- Current animation overlay (needs visible wires)
- Drag-and-drop interaction (needs visible components to drag)
- Component selection UI (needs visual targets to select)
- Component rotation handles (needs visible components to rotate)

### Risks

1. **Visual clutter**: Many components may create cluttered appearance
   - Mitigation: Use z-index layering, semi-transparent overlays, clean visual design

2. **Performance**: Rendering many SVG/Canvas elements may impact performance
   - Mitigation: Start with SVG (simpler), optimize later if needed, consider canvas for 100+ components

3. **Coordinate mapping complexity**: Center gap and hole spacing require careful calculation
   - Mitigation: Write unit tests for coordinate conversion, validate visually

4. **Accessibility**: Purely visual rendering may not work for screen readers
   - Mitigation: Maintain semantic component list in info panel, add ARIA labels

5. **Asset licensing**: Must create original graphics, not reuse Fritzing parts
   - Mitigation: Use simple geometric shapes, clearly not derivative works

### Design Decisions Required

1. **Wire color assignment**: Random per wire, or user-selectable, or semantic (power=red, ground=black)?
   - Recommendation: Start with random from palette, add user selection later

2. **Component scale**: How large should components be relative to holes?
   - Recommendation: Resistors span 2-3 holes, LEDs are 1-2 holes, wires are thin lines

3. **Layer ordering**: What renders on top? (holes, wires, components, overlays)
   - Recommendation: holes → wires → components → voltage overlay → tooltips

4. **Center gap handling**: Should wires cross the gap visually?
   - Recommendation: Yes, wires can cross gap but components cannot span it

## Why This Task Now

This is the next most important gap because:

1. **Foundational**: Visual rendering is a prerequisite for many other planned features
2. **Educational value**: Without visible components, the tool has limited learning value
3. **User experience**: Current "invisible components" is confusing and non-intuitive
4. **Logical dependency**: The suggested next task (current animation) requires visible wires
5. **Quick win**: Relatively straightforward implementation with high visual impact
6. **MVP requirement**: Implicit in "best-in-class breadboard UI" goal
7. **Differentiator**: Planning document emphasizes physical authenticity as core principle

## Current Workarounds and Their Limitations

Users currently must:
- Memorize which holes are occupied (no visual reminder)
- Refer to text component list in info panel to understand circuit
- Mentally visualize connections between components
- Cannot visually verify circuit correctness before simulation

These workarounds are untenable for an educational tool. Visual representation is not a "nice to have" - it's essential for the core value proposition.

## Next Steps After This Task

Once components and wires are visible:
1. Implement current animation overlay (planning/vision/goal.md, lines 792-815)
2. Add component selection and manipulation (click to select, delete, move)
3. Implement drag-and-drop placement (planning/vision/goal.md, lines 231-237)
4. Add component rotation UI (on-screen handles)
5. Improve wire rendering with orthogonal routing or curves

## References

- Planning document UI/UX requirements: planning/vision/goal.md, lines 205-393
- System capabilities documentation: planning/state/system_capabilities.md, lines 86-96 (known limitations)
- Licensing constraints (no Fritzing graphics): planning/vision/goal.md, lines 161-180
- MVP roadmap: planning/vision/goal.md, lines 1041-1069
- Component placement interaction model: planning/vision/goal.md, lines 229-280

## Acceptance Testing Plan

**Test circuits to verify:**
1. Simple LED circuit: Power → Resistor → LED → Ground (should see all 4 components)
2. Voltage divider: Power → Resistor → Resistor → Ground (resistors should be distinguishable)
3. Multiple wires: Several wires connecting different points (wires should not overlap confusingly)
4. Complex circuit: 10+ components placed (should remain visually clear)

**Visual inspection checklist:**
- [ ] Can identify component type by appearance alone
- [ ] Can trace current path by following wires visually
- [ ] Voltage heatmap overlay is still visible and not obscured
- [ ] No rendering artifacts or glitches
- [ ] Performance is smooth (no lag when placing components)

## Implementation Notes

**Suggested file structure:**
- `src/ui/component-renderer.ts`: Component rendering logic
- `src/ui/wire-renderer.ts`: Wire path rendering
- `src/ui/component-graphics.ts`: SVG/Canvas graphics for each component type
- Update `src/ui/breadboard-app.ts`: Integrate rendering into breadboard display

**Suggested approach:**
1. Start with wire rendering (simplest case: draw line between two points)
2. Add resistor rendering (rectangle + label)
3. Add LED rendering (directional indicator)
4. Add power/ground symbols
5. Integrate with existing voltage overlay system
6. Polish and test with various circuits

**Testing strategy:**
- Visual regression tests (screenshots of reference circuits)
- Unit tests for coordinate mapping
- Manual testing with real breadboard circuits
- Accessibility testing (keyboard navigation, screen reader)
