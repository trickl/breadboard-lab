Implement resistor color band rendering and lookup tool

## Context

Breadboard Lab currently renders resistors as tan rectangles with text labels showing resistance values (e.g., "1kΩ", "220Ω"). While functional, this approach diverges from physical reality: real resistors use color band coding to indicate their resistance and tolerance values.

The planning document explicitly marks resistor color band rendering as a **required** capability (goal.md, lines 150-171), noting that "Resistor visuals are derived from resistance/tolerance, not static art." This reflects the educational mission: students working with real breadboards must learn to read color bands, and Breadboard Lab should teach this skill rather than hide it behind convenient text labels.

## Gap Analysis

**Long-term goal (from goal.md, lines 150-171):**
- Resistors render with correct color banding
- Band count is derived from tolerance (4-band for 5%, 5-band for 1%)
- Resistor visuals are procedurally generated from resistance/tolerance values
- System includes a resistor color-code lookup table
- UI tool supports:
  - Enter resistance and tolerance → display band colors
  - Click resistor → show band meaning (digits, multiplier, tolerance)
- Acceptance criteria:
  - 1kΩ 5% renders as brown-black-red-gold
  - 10kΩ 1% renders as brown-black-black-red-brown
  - Lookup output matches rendered resistor

**Current state (from system_capabilities.md, lines 878-942):**
- Resistors render as tan rectangles with text labels
- Resistance values are configurable through property editor
- Visual representation uses geometric shapes, not color bands
- No color-code lookup capability exists
- Component renderer uses procedural SVG generation

**Gap:**
The most significant educational gap is that users cannot learn or practice reading resistor color codes. The current text-based display is pedagogically convenient but undermines the goal of teaching real-world electronics skills.

## Proposed Development Task

**Implement procedural resistor color band rendering with interactive lookup tool**

### Scope

Transform resistor rendering from text-labeled rectangles to physically accurate color-banded components:

1. **Color Band Calculation**
   - Implement standard resistor color code algorithm
   - Support 4-band resistors (5% tolerance)
   - Support 5-band resistors (1% tolerance)
   - Handle edge cases (zero values, very large/small resistances)
   - Use IEC 60062 standard for color mapping

2. **Visual Rendering**
   - Modify `ComponentRenderer` to draw resistor body with color bands
   - Render bands at correct positions along resistor body
   - Use standard color palette (brown, red, orange, yellow, green, blue, violet, gray, white, black, gold, silver)
   - Maintain visual clarity at breadboard scale
   - Preserve existing rotation and positioning logic

3. **Color Code Lookup Tool**
   - Add UI panel for resistor color code education
   - **Input mode**: User enters resistance (Ω) and tolerance (%) → display band colors with explanations
   - **Decode mode**: User clicks resistor on breadboard → explain each band (1st digit, 2nd digit, multiplier, tolerance)
   - Display band meanings with educational annotations
   - Link lookup results to actual placed components

4. **Property Editor Integration**
   - When editing resistor resistance, update color bands in real-time preview
   - Consider adding tolerance as editable property (currently assumed 5%)
   - Visual feedback shows how resistance value changes affect bands

### Technical Approach

**Phase 1: Color Code Algorithm (Core Logic)**
- Create `src/core/resistor-color-code.ts` module
- Implement functions:
  - `resistanceToColorBands(resistance: number, tolerance: number): ColorBand[]`
  - `colorBandsToResistance(bands: ColorBand[]): { resistance: number, tolerance: number }`
  - Define `ColorBand` type with color and meaning
- Write comprehensive unit tests (edge cases, standard values, E12/E24 series)

**Phase 2: Visual Rendering**
- Modify `src/ui/component-renderer.ts`
- Replace text-label rendering with band rendering
- Draw resistor body as cylinder/rectangle
- Position 4 or 5 color bands based on tolerance
- Use SVG `<rect>` elements with appropriate colors
- Ensure bands are visible at current scale (~50px resistor length)

**Phase 3: Lookup Tool UI**
- Create `src/ui/resistor-lookup-panel.ts`
- Add toggle button in toolbar ("🎨 Color Code Lookup")
- Design modal or side panel with two modes:
  - Input fields for resistance and tolerance
  - Display of resulting color bands with labels
  - Decode button when resistor is selected
- Integrate with existing `ExplainPanel` or create standalone component

**Phase 4: Integration and Polish**
- Connect lookup panel to breadboard resistor clicks
- Update visual regression tests to capture color band rendering
- Add tests for color code algorithm
- Verify accessibility (color-blind users may need patterns/labels as supplement)

### Success Criteria

- [ ] 1kΩ 5% resistor renders with brown-black-red-gold bands (verified visually)
- [ ] 10kΩ 1% resistor renders with brown-black-black-red-brown bands (verified visually)
- [ ] 220Ω 5% resistor renders with red-red-brown-gold bands
- [ ] Color bands are clearly visible at normal breadboard scale
- [ ] Lookup tool correctly converts resistance values to band colors
- [ ] Clicking a resistor shows band meanings in explain panel
- [ ] All existing resistor functionality preserved (drag, rotate, edit value, delete)
- [ ] Visual regression tests pass with updated baseline screenshots
- [ ] Unit tests verify color code algorithm correctness (>20 test cases)

### Educational Impact

This feature transforms Breadboard Lab from "resistors with convenient labels" to "resistors as they actually appear." Students gain critical skills:

1. **Reading color codes**: Essential for working with physical electronics
2. **Understanding tolerance**: 4-band vs 5-band resistors, ±5% vs ±1% precision
3. **Value selection**: Which standard resistor values exist (E12/E24 series)
4. **Physical component recognition**: Bridging virtual simulation and real hardware

The lookup tool provides scaffolding: students can check their reading, see how values map to colors, and build confidence before working with physical components.

### Alignment with Vision

This task directly addresses planning document requirements:

- **Explicit requirement**: "Resistor visual accuracy and lookup — required" (goal.md, lines 150-171)
- **Physical realism**: "Component visuals are derived from resistance/tolerance, not static art"
- **Educational mission**: "Teaching circuit principles through accurate visualization"
- **Real-world parts**: Foundation for broader component library with physical accuracy
- **Testing requirement**: Specific acceptance criteria provided in planning doc

### Estimated Effort

**5-6 days of focused development**

- Day 1: Implement color code algorithm with unit tests (IEC 60062 standard)
- Day 2: Modify component renderer for band visualization
- Day 3: Build lookup tool UI and integrate with breadboard
- Day 4: Connect to explain panel and property editor
- Day 5: Visual regression testing, accessibility review
- Day 6: Polish, documentation, handle edge cases

### Dependencies

**None** - all infrastructure exists:
- Component rendering system in place (`ComponentRenderer`)
- Property editor can be extended
- Explain panel exists for interactive explanations
- Visual regression testing framework ready

### Risks and Mitigations

**Risk 1: Color bands too small to see clearly**
- *Mitigation*: Test at actual scale; consider optional "magnified view" or tooltip zoom
- *Mitigation*: Supplement colors with subtle texture patterns for accessibility

**Risk 2: Color-blind users cannot distinguish bands**
- *Mitigation*: Add optional "show values" mode (toggle color bands ↔ text labels)
- *Mitigation*: Use patterns or textures in addition to colors
- *Mitigation*: Explain panel always shows numeric values as text

**Risk 3: Not all resistance values map cleanly to standard color codes**
- *Mitigation*: Document supported range (1Ω to 999MΩ)
- *Mitigation*: Warn user if non-standard value is entered
- *Mitigation*: Suggest nearest standard E12/E24 series value

**Risk 4: Tolerance editing adds UI complexity**
- *Mitigation*: Default to 5% tolerance (4-band); make tolerance optional advanced property
- *Mitigation*: Property editor gains "Advanced" section for tolerance

## Why This Task Now

This is the most important next development gap because:

1. **Explicit planning requirement**: Marked as "required" in capability specification
2. **Educational foundation**: Color codes are fundamental electronics knowledge
3. **Physical accuracy**: Brings virtual breadboard closer to real hardware
4. **Pattern establishment**: Demonstrates approach for future real-world component library
5. **High impact, manageable scope**: Visible improvement without architectural overhaul
6. **User feedback alignment**: Realistic components improve learning outcomes
7. **Prerequisite avoided**: Can implement without WebGL migration or major refactoring

### Comparison with Other Gaps

Other significant gaps exist but are deprioritized:

- **WebGL rendering (PixiJS)**: Larger architectural change; optimize later when performance issues arise
- **Schematic view**: Valuable but secondary to breadboard realism; breadboard view is primary interface
- **Microprocessor component**: High complexity; digital simulation is separate milestone
- **Speaker/audio output**: Engaging but niche use case; analog audio circuits are advanced topic
- **Component library expansion**: Resistor color bands establish pattern first; then expand library

## Next Steps After This Task

Once resistor color bands work:

1. **Expand component library with real parts**: Add specific LED models (3mm ultra-bright yellow LED), capacitors with ratings, etc.
2. **Implement schematic view**: Automatically generate schematic from netlist as secondary view
3. **Add more passive components**: Capacitors (with polarity), inductors, potentiometers
4. **Component browser UI**: Search/filter components by specifications rather than just type
5. **Visual component datasheet**: Click component → show specs (ratings, package, manufacturer info)

Resistor color bands establish the "physical accuracy" pattern that scales to the full component library vision.

## References

- `planning/vision/goal.md`, lines 150-171: "Resistor visual accuracy and lookup — required"
- `planning/state/system_capabilities.md`, lines 878-942: "Component Visual Rendering" (current text-label approach)
- IEC 60062 standard: International resistor color code standard
- E12 series (±10%, ±5%): 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82
- E24 series (±5%, ±1%): Includes E12 plus intermediate values

## Non-Goals

This task specifically does **NOT** include:

- Capacitor color codes or markings (separate task)
- SMD resistor codes (through-hole only for now)
- Temperature coefficient bands (6-band resistors; defer to advanced milestone)
- Animated assembly/soldering tutorials
- Resistor power rating visualization (wattage color coding)
- Real-time resistance measurement simulation (multimeter feature)
- Network tolerance analysis (Monte Carlo simulation)

Focus remains on standard 4-band and 5-band axial through-hole resistors as used on breadboards.
