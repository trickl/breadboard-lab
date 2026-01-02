Implement visual component and wire rendering on breadboard

## Context

Breadboard Lab currently simulates circuits and visualizes voltages with a color-coded heatmap overlay. However, **components and wires are not visually rendered**. Users see only "occupied" markers on holes where components are placed, making it impossible to distinguish between different component types or understand circuit topology at a glance.

The planning document explicitly requires visual representation as part of the breadboard UI (planning/vision/goal.md, lines 88-97, 241-279). Without visual rendering, the tool fails to meet its core educational objective: making circuit behavior visible and understandable.

## Gap Analysis

**Long-term goal**: Best-in-class breadboard UI with drag/drop, rotate, snap, and visual component/wire rendering (planning/vision/goal.md, lines 11-12, 198-215).

**Current state**: 
- Circuit extraction and simulation work correctly (planning/state/system_capabilities.md, lines 99-189)
- Voltage heatmap displays computed voltages (planning/state/system_capabilities.md, lines 191-231)
- Component placement uses two-click interaction (planning/state/system_capabilities.md, lines 67-74)
- **No visual representation of components** - only "occupied" class on holes (planning/state/system_capabilities.md, line 94)
- **No wire rendering** - wires are invisible except for hole markers (planning/state/system_capabilities.md, line 95)

**Gap**: Users cannot see what they are building. The breadboard shows voltage colors but not the physical circuit components and connections. This makes the tool nearly unusable for its core educational purpose.

## Proposed Development Task

**Implement visual rendering of components and wires on the breadboard canvas**

### Scope

Create a visual rendering layer that:
1. **Displays component graphics** for all five component types:
   - Wire: Simple colored line between holes
   - Resistor: Rectangle with color bands (brown-black-red for 1kΩ)
   - LED: Triangle/diode symbol with cathode marker
   - Power Supply: Red "+" symbol or battery icon
   - Ground: Standard ground symbol (three horizontal lines)

2. **Renders wire paths** connecting holes:
   - Straight lines for MVP (bezier curves in future)
   - Color-coded wires (red for power, black for ground, varied for signal)
   - Wire paths drawn between occupied holes

3. **Visual feedback during placement**:
   - Ghost preview showing where component will be placed
   - Highlight valid/invalid placement locations
   - Show component orientation before final placement

4. **Component selection visual**:
   - Selected component shows highlight or border
   - Hover effects on components
   - Clear indication of interactive elements

### Technical Approach

**Option 1: Canvas-based rendering (recommended)**
- Use HTML5 Canvas or Canvas-like library (Konva.js, as specified in planning doc)
- Render components as simple geometric shapes with labels
- Layer structure: background grid → wires → components → voltage overlay
- Performance: efficient for 300 holes + components

**Option 2: SVG-based rendering**
- Use SVG for scalable component graphics
- Easier to style and animate
- May have performance issues with many elements
- Better accessibility (semantic markup)

**Recommendation**: Start with simple canvas rendering or Konva.js (per planning doc DR-001, lines 1288-1310). SVG can be evaluated if performance is acceptable.

**Implementation steps:**
1. Create component rendering utilities:
   - `renderResistor(ctx, pos1, pos2)` - draws resistor body with bands
   - `renderLED(ctx, pos1, pos2)` - draws LED symbol with polarity
   - `renderWire(ctx, pos1, pos2, color)` - draws line
   - `renderPowerSupply(ctx, pos)` - draws power symbol
   - `renderGround(ctx, pos)` - draws ground symbol

2. Extend `BreadboardApp.renderBreadboard()`:
   - After rendering holes and voltage overlay
   - Iterate through `this.state.components`
   - Call appropriate render function for each component type
   - Draw wires first (behind components)
   - Draw components on top

3. Add component graphics assets:
   - Create custom SVG icons OR
   - Use procedural drawing (geometric shapes)
   - **Do NOT use Fritzing graphics** (licensing constraint, planning/vision/goal.md, lines 161-176)

4. Implement placement preview:
   - On first hole click, show ghost preview at cursor
   - Preview follows mouse until second click
   - Show red highlight for invalid placements

### Success Criteria

- [ ] All five component types are visually distinguishable on the breadboard
- [ ] Wires are rendered as colored lines between holes
- [ ] Components display correct orientation (LED polarity, resistor bands)
- [ ] Users can identify circuit topology by visual inspection
- [ ] Voltage heatmap remains visible (layer correctly above/below components)
- [ ] Performance: rendering completes in < 100ms for circuits with 20+ components
- [ ] Ghost preview shows during component placement
- [ ] Visual design is clean, educational, and accessible

### Educational Impact

This feature is **critical for usability**:
1. **Visual understanding**: Users see the physical circuit, not just abstract data
2. **Error detection**: Visual inspection reveals wiring mistakes (wrong hole, reversed LED)
3. **Learning reinforcement**: Component symbols match real-world breadboard appearance
4. **Debugging**: Combined with voltage overlay, users correlate physical layout with electrical behavior

Without visual rendering, users must memorize component positions or refer to the info panel constantly. This destroys the learning flow and makes the tool frustrating rather than educational.

### Alignment with Roadmap

This task is **essential for MVP completion** (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Component placement" is listed as MVP requirement - but without visuals, placement is meaningless
- 🎯 "Visual representation of wires and components" is explicitly listed in "Future Enhancements" section (planning/vision/goal.md, line 157) but should be in MVP
- **Blocks other MVP features**: 
  - Rotation (can't see what you're rotating)
  - Error overlays (need to see components to understand errors)
  - Current animation (need wires to animate on)

**Priority**: This should have been in the original MVP. It's blocking user adoption and testing.

### Estimated Effort

3-5 days of focused development:
- Day 1: Set up canvas/Konva rendering infrastructure
- Day 2: Implement component rendering functions (resistor, LED, wire)
- Day 3: Implement power supply and ground rendering
- Day 4: Add placement preview and visual feedback
- Day 5: Polish visual design, test with real circuits, accessibility review

### Dependencies

**Technical dependencies:**
- Consider adding Konva.js library (planning/vision/goal.md recommends it, lines 1288-1310)
- If using canvas, no new dependencies needed
- Component graphics: create custom SVG or use geometric shapes

**Prerequisite tasks:**
- None - voltage overlay is complete, circuit simulation works

**Licensing considerations:**
- Must create original graphics or use permissively licensed assets
- **Do NOT use Fritzing part graphics** (planning/vision/goal.md, lines 161-176, 1364-1380)
- MIT-compatible assets only

### Risks

1. **Performance**: Rendering 300+ elements may be slow
   - **Mitigation**: Use canvas instead of DOM; layer caching; only redraw on state change

2. **Visual design**: Component graphics may look unprofessional
   - **Mitigation**: Start with simple geometric shapes; iterate on design; consider hiring designer

3. **Accessibility**: Canvas rendering is not accessible to screen readers
   - **Mitigation**: Maintain ARIA labels on hole elements; provide text alternative in info panel

4. **Scope creep**: Temptation to add animations, effects, or complex graphics
   - **Mitigation**: Start with minimal viable visuals; defer polish to post-MVP

### Testing Strategy

**Visual regression tests:**
- Capture screenshots of rendered components
- Compare against reference images
- Ensure components render consistently

**Unit tests:**
- Test component rendering utilities (if using utility functions)
- Test position-to-canvas-coordinate mapping
- Test orientation calculations

**Manual testing:**
- Build test circuits: LED circuit, voltage divider, series resistors
- Verify visual output matches component placement
- Test on different screen sizes and zoom levels
- Accessibility review with keyboard-only navigation

**Performance benchmarks:**
- Measure render time for circuits with 5, 10, 20, 50 components
- Target: < 100ms for 20-component circuits
- Profile with browser DevTools

## Why This Task Now

This is the most important gap because:

1. **Usability blocker**: Without visuals, users cannot use the tool effectively. It's the difference between "barely functional" and "actually usable."

2. **Foundation for learning**: The entire educational value depends on visual feedback. Voltage heatmap alone is insufficient.

3. **Prerequisite for other features**: Current animation, rotation, drag-and-drop, and error overlays all require visible components.

4. **User testing blocker**: Cannot get meaningful feedback from users when the UI is essentially invisible.

5. **MVP definition**: While the roadmap lists this as "future," it's actually essential for MVP. The tool is incomplete without it.

6. **Low technical risk**: Rendering is well-understood; no complex algorithms or external dependencies required.

## Comparison with Other Gaps

Other important missing features:
- **Current animation**: Important but secondary to seeing components at all
- **Error detection**: Valuable but requires visual components to show errors effectively
- **Component deletion/editing**: Important for UX but tool is usable without it
- **Undo/redo**: Nice-to-have; users can "Clear All" and rebuild
- **Rotation**: Blocked by lack of visuals (can't rotate what you can't see)
- **Drag-and-drop**: Enhancement over two-click; not essential for MVP

**Visual component rendering is the only gap that makes the tool nearly unusable in its current state.**

## Next Steps After This Task

Once visual rendering works:
1. Implement rotation (keyboard `R` key) - now that users can see components (planning/vision/goal.md, lines 239-253)
2. Add current animation on wires (planning/vision/goal.md, lines 792-815)
3. Implement error detection and visual indicators (planning/vision/goal.md, lines 832-849)
4. Add component deletion (planning/state/system_capabilities.md, line 89)
5. Implement "Explain" panel for educational context (planning/vision/goal.md, lines 851-881)

## Acceptance Criteria Summary

This task is complete when:
- [ ] A user can place a resistor and see a resistor symbol on the breadboard
- [ ] A user can place an LED and see the LED symbol with correct polarity
- [ ] Wires are visible as colored lines between holes
- [ ] Power supply and ground symbols are recognizable
- [ ] Components do not obscure voltage heatmap (or vice versa)
- [ ] Placement preview provides visual feedback during interaction
- [ ] Performance is acceptable (< 100ms render time)
- [ ] Visual design is clean, educational, and accessible
- [ ] No licensing violations (original graphics or permissively licensed)

## References

- Planning document: planning/vision/goal.md
  - Lines 88-97: Core objectives including visual representation
  - Lines 198-215: UI/UX requirements for component placement and visual feedback
  - Lines 241-279: Component interaction requirements
  - Lines 1288-1310: Decision Record DR-001 recommending Konva.js
  - Lines 1364-1380: Decision Record DR-004 on licensing constraints
- System capabilities: planning/state/system_capabilities.md
  - Line 94: "No visual representation of placed components"
  - Line 95: "No wire rendering"
  - Lines 67-74: Current two-click placement interaction
- Completed issue: planning/issue_queue/complete/implement-voltage-heatmap-overlay.md
  - Voltage visualization is now complete, making component rendering the next logical step
