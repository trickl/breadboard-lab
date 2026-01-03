Implement Error Detection and Explain Panel

## Context

The current system successfully visualizes voltage levels (heatmap overlay) and current flow (animated particles) on the breadboard. However, when circuits don't work as expected or have errors, users receive no guidance about what went wrong or how to fix it.

This gap between showing circuit behavior and teaching circuit understanding is critical for the educational mission of Breadboard Lab.

## Gap Analysis

**What we have:**
- Voltage heatmap showing voltage at each net
- Current animation showing current magnitude and direction
- Basic simulation failure detection (missing ground, short circuits)
- Hover tooltips showing exact voltage values

**What we're missing:**
- Visual indicators when circuits have errors (short circuits, floating nodes, reversed components)
- Contextual explanations of circuit behavior (why voltages/currents are what they are)
- Actionable guidance on how to fix common mistakes
- Educational insights into circuit principles

**From the planning document (goal.md):**
> "The Explain panel is a contextual help panel that explains circuit behavior. Trigger: Click on a net, component, or error icon. For errors: Problem description, why it's a problem, how to fix it."

This feature was explicitly planned as part of the "Electricity Flow Visualisation" system but has not been implemented.

## Proposed Task

Implement an error detection system with visual error overlays and an interactive "Explain" panel that provides educational context about circuit behavior and actionable fix suggestions.

### Core Components

1. **Enhanced Error Detection**
   - Detect and categorize common circuit errors:
     - Short circuits (power directly to ground)
     - Floating nodes (unconnected to power or ground)
     - Reversed polarity components (LED backwards)
     - Open circuits (incomplete paths)
     - Overcurrent conditions (resistor too small for LED)
   - Store error information in simulation results

2. **Visual Error Overlays**
   - Render error icons on the breadboard at problem locations:
     - Red "X" for short circuits
     - Orange "?" for floating nodes
     - Yellow "!" for polarity issues
     - Dashed outline for open circuits
   - Make error icons clickable to open Explain panel

3. **Explain Panel UI**
   - Create a side panel or modal that appears on click
   - Display different content based on what was clicked:
     - **For nets**: Voltage, current, connected components, explanation of how voltage was determined
     - **For components**: Terminal voltages, current through component, power dissipation, role in circuit
     - **For errors**: Problem description, educational explanation of why it's wrong, step-by-step fix suggestions
   - Include helpful circuit theory explanations (voltage dividers, current limiting, etc.)

4. **Heuristic Reasoning**
   - Implement analysis rules to generate helpful explanations:
     - "LED has 0 current → Check if LED is reversed or circuit is open"
     - "Voltage at node is 0V but should be powered → May be short circuit or missing connection"
     - "High current (>20mA) through LED → Add larger resistor to limit current"
   - Provide context-sensitive educational content

### Success Criteria

- [ ] Error detection identifies at least 5 common error types
- [ ] Visual error icons render at correct breadboard locations
- [ ] Clicking error icon opens Explain panel with relevant information
- [ ] Clicking nets shows voltage and connectivity information
- [ ] Clicking components shows voltage/current/power information
- [ ] Explanations include both technical details and educational context
- [ ] Fix suggestions are actionable and specific
- [ ] Panel has clear, accessible UI design

### Implementation Approach

1. **Phase 1: Enhanced Error Detection**
   - Extend `CircuitSimulator` to detect and categorize errors
   - Add `errors: CircuitError[]` to `SimulationResult` type
   - Implement detection logic in simulation phase

2. **Phase 2: Error Overlay Rendering**
   - Create `ErrorOverlayRenderer` class
   - Render SVG error icons on breadboard
   - Add click handlers to open Explain panel

3. **Phase 3: Explain Panel UI**
   - Create `ExplainPanel` UI component
   - Implement content generation for nets/components/errors
   - Design heuristic rules for helpful explanations

4. **Phase 4: Polish and Testing**
   - Add unit tests for error detection logic
   - Test UI interactions (click handling, panel display)
   - Verify educational value of explanations

### Alignment with Vision

This task directly addresses multiple goals from the planning document:

- **Educational focus**: "Visualisations teach circuit behavior, not just document it"
- **Error prevention**: "Guide users to valid placements"
- **Explain panel**: Explicitly planned in Section 8 of goal.md
- **Error overlays**: Explicitly planned as overlay mode in Section 8
- **Heuristics**: "why is this not working?" reasoning system planned

### Priority Justification

This task is the highest priority next step because:

1. **Closes the feedback loop**: Users can see what's wrong, not just silent failure
2. **Educational mission**: Aligns perfectly with teaching electronics, not just simulating
3. **User experience**: Major improvement to debugging and learning workflow
4. **Foundation for future features**: Error system enables better validation and guidance
5. **MVP completion**: Listed as part of MVP (Milestone 0.1) in roadmap

Before moving to v0.2 features (schematic view, more components, undo/redo), completing the core educational visualization system with error detection and explanations provides the most value to users.

## References

- `planning/vision/goal.md` - Section 8: "Electricity Flow Visualisation" - Error Overlays and Explain Panel
- `planning/state/system_capabilities.md` - Section "Known Limitations" - No error detection
- Current simulation code: `src/core/circuit-simulator.ts` - Already detects some errors (missing ground, short circuits)
- Current UI code: `src/ui/breadboard-app.ts` - Would need Explain panel integration

## Non-Goals

This task specifically does NOT include:
- Schematic view implementation
- Additional component types
- Undo/redo functionality
- Save/load features
- More advanced circuit analysis (AC, transient)

These are separate tasks for future iterations.
