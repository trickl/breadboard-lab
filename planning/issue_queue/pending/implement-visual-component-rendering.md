Implement visual component rendering on breadboard

## Context

Breadboard Lab currently places components functionally (they exist in the circuit model and affect simulation), but components are **completely invisible** to users. Only "occupied" markers appear on holes where component pins are placed. This creates a severe usability problem: users cannot see what they've built, making the tool nearly impossible to use for educational purposes.

## Gap Analysis

**Long-term goal**: "Visual representation of wires and components on the breadboard" with clear component graphics (resistor bands, LED colors, wire paths) (planning/vision/goal.md, lines 151-160; README.md, line 103).

**Current state**: Components are placed and functional in the circuit model, but have **no visual representation**. The UI only shows "occupied" CSS class on holes. Wires are completely invisible. (planning/state/system_capabilities.md, lines 86-98, specifically lines 94-95: "No visual representation of placed components (only 'occupied' marker on holes)" and "No wire rendering (wires are invisible except for hole markers)").

**Gap**: The most critical UX gap blocking educational use is the complete absence of visual component rendering.

## Proposed Development Task

**Implement visual rendering of placed components on the breadboard**

### Scope

Create a visual rendering system that:
1. Renders wires as visible lines connecting two holes
2. Renders resistors with recognizable symbols/shapes between pins
3. Renders LEDs with appropriate visual representation (color, polarity)
4. Renders power supply and ground symbols
5. Positions component visuals to align with their pin placements
6. Updates automatically when components are placed or removed

### Technical Approach

**Phase 1: Wire Rendering (Priority)**
- Draw SVG or canvas lines between wire endpoints
- Use straight lines initially (orthogonal routing is stretch goal)
- Color wires distinctly (e.g., red/black for power/ground, other colors for signal)
- Render wires in a layer beneath components

**Phase 2: Component Graphics**
- Design or source simple, educational component symbols:
  - **Resistor**: Rectangle with color bands indicating value
  - **LED**: Triangle + line symbol with appropriate color
  - **Power Supply**: "+" symbol or battery icon
  - **Ground**: Ground symbol (⏚)
- Use SVG for scalability and crisp rendering
- **CRITICAL**: Do NOT reuse Fritzing part graphics (licensing constraint per planning/vision/goal.md, lines 153-209)
- Options:
  - Create custom SVG symbols (preferred)
  - Use geometric shapes with labels (acceptable MVP)
  - Procedurally generate graphics (e.g., resistor color bands)

**Phase 3: Layout and Positioning**
- Position component visuals to span between their pin holes
- Handle rotation (0°, 90°, 180°, 270°) if rotation feature exists
- Ensure components don't overlap illegibly
- Add hover effects (highlight on hover)

**Rendering Architecture Options:**
1. **SVG overlays** (recommended for MVP):
   - Add SVG layer on top of hole grid
   - Draw components as SVG elements
   - Easy to style, accessible, scalable
   - Performance adequate for typical circuits (< 50 components)

2. **Canvas rendering** (if performance is concern):
   - Use HTML5 Canvas to draw components
   - More performant for many elements
   - Less accessible, harder to style

3. **Konva.js** (per planning document recommendation):
   - Planning document suggests Konva (planning/vision/goal.md, lines 431-456)
   - Canvas abstraction with built-in interaction layer
   - Good for future drag-and-drop features
   - Requires adding dependency

**Recommended for MVP: SVG overlays** - simplest to implement, adequate performance, accessible, no new dependencies.

### Success Criteria

- [ ] Wires are visible as lines connecting their endpoints
- [ ] Resistors display with recognizable symbol (rectangle or resistor shape)
- [ ] LEDs display with recognizable symbol (triangle or LED shape)
- [ ] Power supplies show "+" or voltage label
- [ ] Ground symbols show ground symbol (⏚)
- [ ] All component visuals update immediately when placed
- [ ] Visual clarity: users can identify component types at a glance
- [ ] No licensing violations (no Fritzing graphics used)
- [ ] Component visuals align correctly with pin positions

### Educational Impact

**This is the most critical UX improvement for educational use:**
- Students must **see** what they're building to learn
- Visual feedback enables debugging ("Where did I place that resistor?")
- Component symbols teach standard circuit notation
- Seeing connections makes circuit topology clear

Without visual components, the tool is essentially unusable for its core educational mission.

### Alignment with Roadmap

This addresses multiple critical items:

**MVP requirements (planning/vision/goal.md, lines 1041-1069):**
- Listed as "Future Enhancement" in README.md (line 103): "Visual representation of wires and components on the breadboard"
- Mentioned in Architecture as planned improvement (ARCHITECTURE.md, line 157): "Visual wire rendering (lines between holes)"

**UI/UX Requirements (planning/vision/goal.md, lines 207-393):**
- Component placement requires visual feedback (lines 230-254)
- Wiring requirements specify visible wire paths (lines 256-278)

**Known Limitations explicitly call this out:**
- system_capabilities.md, line 94: "No visual representation of placed components (only 'occupied' marker on holes)"
- system_capabilities.md, line 95: "No wire rendering (wires are invisible except for hole markers)"

### Estimated Effort

**3-5 days of focused development**
- Day 1: Design component symbols (resistor, LED, power, ground)
- Day 2: Implement wire rendering with SVG
- Day 3: Implement component symbol rendering
- Day 4: Polish positioning, alignment, styling
- Day 5: Test with various circuits, handle edge cases

### Dependencies

**None** - all required data exists in component placements.

**Decisions needed:**
- Choose rendering approach (SVG recommended)
- Design or find license-compatible component symbols
- Decide on visual style (realistic vs. schematic-like)

### Risks

1. **Licensing**: Careful to avoid Fritzing graphics (mitigation: create custom symbols)
2. **Visual clarity**: Components may overlap in dense circuits (mitigation: strategic sizing, transparency)
3. **Performance**: Many components may slow rendering (mitigation: start with SVG, optimize if needed)
4. **Design quality**: Custom symbols may look unprofessional (mitigation: keep simple and functional for MVP)

## Why This Task Now

This is the most important gap because:

1. **Blocks all usability**: Without visual feedback, users cannot effectively use the tool
2. **Highest educational impact**: Visual learning is core to the tool's mission
3. **Prerequisite for advanced features**: Drag-and-drop, rotation, and component editing all require visible components
4. **User expectation**: Any circuit tool is expected to show components visually
5. **Already partially complete**: Component placement logic exists; only rendering is missing
6. **High impact, medium effort**: Clear value, reasonable scope

**Comparison to other gaps:**
- **Current animation**: Useful but less critical than seeing components at all
- **Drag & drop**: Nice-to-have; two-click placement works functionally
- **Rotation**: Less critical than basic visibility
- **Error overlays**: Useful but secondary to seeing what you've built

## Next Steps After This Task

Once components are visually rendered:
1. Implement current animation on wires (planning/vision/goal.md, lines 792-815)
2. Add component rotation capability (planning/vision/goal.md, lines 239-243)
3. Implement drag-and-drop for repositioning components (planning/vision/goal.md, lines 230-254)
4. Add error detection overlays (planning/vision/goal.md, lines 832-849)
5. Improve component library with customizable values

## Design Considerations

### Component Symbol Design Principles

1. **Educational clarity**: Symbols should match standard circuit notation
2. **Visual distinctness**: Each component type should be instantly recognizable
3. **Scalability**: Work at different zoom levels (if zoom is added)
4. **Accessibility**: High contrast, clear shapes
5. **Cultural neutrality**: Avoid region-specific conventions where possible

### Example Visual Specs

**Wire:**
- 2-3px stroke width
- Color: black/gray for generic, red for power, blue for ground
- Straight line between endpoints (MVP)
- Optional: Bezier curve or orthogonal routing (post-MVP)

**Resistor:**
- Rectangle 30px × 10px
- Fill: tan/beige (#D2B48C)
- Border: dark brown
- Optional: Color bands for resistance value (1kΩ: brown-black-red)
- Leads extend from ends to pin holes

**LED:**
- Triangle (10px) pointing to cathode
- Line at cathode end
- Color: red for standard LED
- Optional: Arrow symbols showing light emission

**Power Supply:**
- Circle (15px diameter) 
- "+" symbol or "5V" label inside
- Red color theme

**Ground:**
- Ground symbol (⏚) from Unicode or custom path
- Positioned at pin location
- Black color

### Implementation Strategy

**Minimal change approach:**
1. Add SVG overlay to breadboard-app.ts
2. Create new file: `src/ui/component-renderer.ts` with rendering logic
3. Call renderer after placing components in `renderBreadboard()`
4. Keep component visuals separate from hole grid (layering)

**File structure:**
```
src/ui/
  ├── breadboard-app.ts          # Main app (calls renderer)
  ├── component-renderer.ts      # NEW: Component visual rendering
  ├── component-symbols.ts       # NEW: SVG symbol definitions
  └── voltage-colors.ts          # Existing: Voltage colors
```

This keeps the change focused and testable.
