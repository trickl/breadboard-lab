Implement component value customization and editing

## Context

Breadboard Lab successfully simulates circuits with voltage visualization, current animation, and component selection/deletion. However, all component values are hardcoded: resistors are always 1kΩ, power supplies are always 5V, and LEDs always have 2V forward voltage. This fundamental limitation prevents users from experimenting with different circuit parameters—a core educational activity.

## Gap Analysis

**Long-term goal**: Interactive component manipulation with editable values (planning/vision/goal.md, lines 241-253, 505-535). The planning document explicitly requires user-adjustable component parameters and describes component metadata records that store configurable properties like resistance and voltage.

**Current state**: 
- Components have fixed, hardcoded values that cannot be changed after placement (planning/state/system_capabilities.md, lines 16-25)
- Component type definitions exist with metadata fields, but UI provides no way to edit them
- Circuit simulator correctly uses component property values, but users cannot modify them
- **No component editing UI** exists (planning/state/system_capabilities.md, lines 123-124, 661)

**Gap**: Users cannot adjust resistance values, power supply voltages, LED parameters, or other component properties. This blocks fundamental electronics education activities like:
- Observing how changing resistance affects voltage division
- Testing different power supply voltages
- Experimenting with LED forward voltages
- Building circuits with realistic component values (not just 1kΩ/5V)

## Proposed Development Task

**Implement component value customization with property editing UI**

### Scope

Create a property editing system that:
1. Displays a property panel when a component is selected
2. Shows current component values (resistance, voltage, etc.)
3. Allows users to edit numeric values through input fields
4. Validates edited values (prevent negative/zero resistance, reasonable voltage ranges)
5. Updates component metadata in real-time
6. Re-runs simulation automatically when values change
7. Updates voltage heatmap and current animation to reflect new behavior

### Technical Approach

**UI Design**:
- Add property editing panel to the right side (or expand existing info panel)
- Show editable fields only when a component is selected
- Different fields for different component types:
  - Resistor: Resistance (Ω) with common presets (100Ω, 1kΩ, 10kΩ, 100kΩ)
  - Power Supply: Voltage (V) with range 1V-20V
  - LED: Forward voltage (V) with typical range 1.5V-3.5V
- Provide both text input and preset buttons for quick selection
- Real-time validation with error messages for invalid values

**Data Model Updates**:
- Extend component metadata in `types.ts` to support mutable properties
- Add validation functions for each component type
- Ensure backward compatibility with existing hardcoded defaults

**Simulation Integration**:
- Circuit simulator already reads from component metadata—no changes needed
- Trigger re-extraction and re-simulation when values change
- Update overlays (voltage heatmap, current animation) automatically

**User Experience Flow**:
1. User places component (uses default value)
2. User selects component
3. Property panel appears with editable fields
4. User changes value (e.g., 1kΩ → 10kΩ)
5. Simulation updates immediately
6. Voltage colors and current animation reflect new circuit behavior

### Success Criteria

- [ ] Property panel displays when component is selected
- [ ] Panel shows component type and current property values
- [ ] Users can edit resistance values for resistors
- [ ] Users can edit voltage values for power supplies
- [ ] Users can edit forward voltage for LEDs
- [ ] Validation prevents invalid values (negative, zero, out-of-range)
- [ ] Simulation re-runs automatically when values change
- [ ] Voltage heatmap updates to reflect new voltages
- [ ] Current animation updates to reflect new currents
- [ ] Edited values persist during session (until component deleted)
- [ ] Default values provided for new components

### Educational Impact

This feature is **critical for learning**:
- **Experimentation**: Students can test hypotheses ("What happens if I increase resistance?")
- **Ohm's Law exploration**: Directly observe V=IR by changing R and seeing current change
- **Voltage dividers**: Build dividers with specific ratios by adjusting resistor values
- **Realistic circuits**: Use actual component values from datasheets, not just 1kΩ
- **Problem solving**: Debug circuits by trying different values
- **Design iteration**: Refine circuits to achieve specific voltage/current targets

Without this capability, Breadboard Lab is limited to demonstration rather than true experimentation.

### Alignment with Roadmap

Component editing is foundational for the educational mission:
- Mentioned in UI/UX requirements (planning/vision/goal.md, lines 241-253)
- Component metadata structure explicitly designed to support customizable properties (lines 513-535)
- Enables future features like component libraries, presets, and saved designs
- Prerequisite for advanced features (component templates, part databases)

This feature completes the "interactive breadboard" experience by making the tool truly manipulable, not just a static placement tool.

### Estimated Effort

4-6 days of focused development
- Day 1: Design property panel UI mockup and component validation logic
- Day 2: Implement property panel rendering and form controls
- Day 3: Wire up value updates to component metadata and simulation trigger
- Day 4: Implement validation, error handling, and preset buttons
- Day 5: Polish UX (keyboard shortcuts, focus management, responsive layout)
- Day 6: Test with various circuits, add unit tests for validation logic

### Dependencies

- Component selection system ✅ (already implemented in PR #89)
- Component metadata structure ✅ (already defined in types.ts)
- Circuit simulator using component properties ✅ (MNA solver reads metadata)
- Voltage/current visualization ✅ (updates automatically when simulation re-runs)

### Risks

- **UI complexity**: Property panel adds visual complexity to interface
  - *Mitigation*: Show panel only when component selected; use clean, minimal design
- **Validation edge cases**: Need to handle all invalid inputs gracefully
  - *Mitigation*: Comprehensive validation with clear error messages; unit tests for edge cases
- **Performance**: Re-simulating on every keystroke may lag
  - *Mitigation*: Debounce updates (wait 300ms after last keystroke); validate before simulating
- **Component type variations**: Different components need different properties
  - *Mitigation*: Use type-specific field rendering; extensible design for future component types

## Why This Task Now

This is the most important gap because:

1. **Blocks fundamental learning**: Students cannot experiment with different values—the core of electronics education
2. **High educational ROI**: Unlocks voltage dividers, Ohm's law exploration, circuit design iteration
3. **Foundation for future features**: Enables component libraries, presets, saved designs, tutorials
4. **Natural next step**: Selection/deletion works (PR #89); now enable editing
5. **Infrastructure ready**: Simulator reads metadata; just need UI to modify it
6. **User expectation**: After placing and selecting components, users will naturally try to edit them
7. **Differentiator**: Most breadboard simulators have fixed values; customization sets this tool apart
8. **Low risk, high impact**: Clear scope, well-defined success criteria, no new dependencies

The system has robust simulation, visualization, and interaction. Component value editing is the missing piece that transforms the tool from a demonstration aid into a true learning platform where students can explore "what if?" questions by tweaking circuit parameters.

## Next Steps After This Task

Once component value editing works:
1. Implement component movement/dragging (reposition components after placement)
2. Add component rotation (R key or rotation handle)
3. Implement undo/redo for all operations (placement, deletion, value changes)
4. Add error detection overlays (short circuits, floating nodes, invalid configurations)
5. Create "Explain" panel with circuit analysis insights (can reference user-chosen values)
6. Expand component library (capacitors, switches, transistors, potentiometers)
7. Add component presets/templates (standard resistor values, common circuits)
