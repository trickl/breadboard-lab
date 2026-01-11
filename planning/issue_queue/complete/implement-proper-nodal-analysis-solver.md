Implement proper nodal analysis for parallel circuit simulation

## Context

Breadboard Lab currently has an impressive visual foundation: components render beautifully, voltage heatmaps display in real-time, and the circuit extraction logic correctly identifies electrical nets. However, the circuit simulator is fundamentally limited—it can only solve simple series circuits from power to ground. This means parallel resistors, multiple current paths, and even basic circuits like voltage dividers with branches are either unsolvable or produce incorrect results.

## Gap Analysis

**Long-term goal**: Real electrical simulation using proper circuit analysis techniques. The planning document explicitly calls for a "Fast DC Solver" using Modified Nodal Analysis (MNA) to solve resistive networks with voltage/current sources (planning/vision/goal.md, lines 631-676).

**Current state**: Circuit simulator uses a simplified path-finding algorithm that:

- Only finds ONE series path from power to ground using depth-first search
- Cannot handle parallel branches (ignores all but the first path found)
- Cannot solve circuits with multiple current paths
- Does not use Kirchhoff's laws or proper nodal/mesh analysis
- Uses oversimplified component models (LED treated as fixed 100Ω resistor)

(planning/state/system_capabilities.md, lines 130-189, lines 505-510)

**Gap**: The most critical missing capability is a **proper DC circuit solver** that can handle real circuits, not just trivial series configurations.

## Proposed Development Task

**Implement Modified Nodal Analysis (MNA) for DC circuit simulation**

### Scope

Replace the current path-finding simulator with a proper MNA-based solver that:

1. Builds conductance matrix G and current vector i from circuit netlist
2. Solves linear system G × v = i for node voltages v
3. Back-calculates branch currents from voltage differences and Ohm's law
4. Handles parallel resistors, voltage dividers, and multiple current paths correctly
5. Maintains the existing fast performance target (<10ms for typical circuits)
6. Preserves the existing `SimulationResult` interface for backward compatibility

### Technical Approach

**Algorithm** (as specified in planning/vision/goal.md, lines 644-661):

- Build MNA matrices from circuit nodes and edges
- For resistors: Add conductance (1/R) to matrix diagonal and off-diagonal terms
- For voltage sources: Add constraint equations to force voltage difference
- Solve using LU decomposition or similar linear algebra technique
- Calculate currents from I = (V1 - V2) / R for each resistor

**Implementation strategy**:

- Extend `CircuitSimulator` class with new MNA-based solver method
- Add matrix operations (can use simple 2D array representation for MVP)
- Implement basic linear solver (Gaussian elimination or use a small library like ml-matrix)
- Keep existing simulation interface unchanged (nodeVoltages, edgeCurrents)
- Add comprehensive unit tests with known circuits (parallel resistors, voltage dividers)

**Component models for MVP**:

- Resistor: Pure conductance (G = 1/R)
- Wire: Very high conductance (G = 100 S, equivalent to 0.01Ω)
- LED: Model as series resistor + voltage source (more accurate than current 100Ω model)
- Power supply: Ideal voltage source
- Ground: Reference node (0V)

### Success Criteria

- [ ] Solver correctly handles parallel resistors (e.g., two 1kΩ resistors in parallel = 500Ω equivalent)
- [ ] Voltage divider with parallel load produces correct voltages
- [ ] Circuit with multiple current paths computes all voltages and currents correctly
- [ ] Existing series circuits continue to work (backward compatibility)
- [ ] Solver performance remains under 10ms for circuits with <50 components
- [ ] All existing tests pass, plus new tests for parallel circuits
- [ ] Voltage heatmap overlay displays correct voltages for parallel circuits
- [ ] Solver detects and reports singular matrix (short circuit condition)

### Educational Impact

This is foundational for educational value:

- **Enables real learning**: Students cannot learn electronics with a simulator that only handles series circuits
- **Parallel resistors**: A fundamental concept in electronics, currently unsupported
- **Voltage dividers with load**: A critical circuit building block, currently broken
- **Credibility**: Tool becomes genuinely useful rather than a toy
- **Foundation for complexity**: Enables teaching more advanced circuit concepts

Without proper circuit analysis, Breadboard Lab cannot fulfill its educational mission. Students will quickly encounter circuits that don't work or produce wrong results, undermining trust and learning.

### Alignment with Roadmap

This task is **explicitly required for MVP** (planning/vision/goal.md, lines 1041-1069):

- 🎯 "Fast DC solver (resistive networks)" is listed as MVP requirement
- The planning document specifies Modified Nodal Analysis as the algorithm (lines 644-661)
- Current simplified solver is acknowledged as insufficient
- Proper solver is prerequisite for error detection (short circuits, floating nodes)
- Foundation for future SPICE-class solver integration

### Estimated Effort

4-6 days of focused development

- Day 1-2: Research and implement MNA matrix building from circuit netlist
- Day 3: Implement linear system solver (Gaussian elimination or integrate library)
- Day 4: Update component models and test with known circuits
- Day 5: Comprehensive testing (parallel resistors, complex networks, edge cases)
- Day 6: Performance optimization and integration with voltage overlay

### Dependencies

- Circuit extraction logic (already working correctly)
- Component models (need refinement but basic structure exists)
- Test infrastructure (already in place)

Optional: Consider using a lightweight linear algebra library (e.g., ml-matrix, mathjs) to avoid implementing matrix operations from scratch. Both are MIT-licensed and suitable for our project.

### Risks

- **Complexity**: MNA is more complex than current path-finding approach
  - _Mitigation_: Start with simple implementation; add sophistication incrementally
- **Performance**: Matrix operations may be slower than path-finding
  - _Mitigation_: Profile and optimize; 50-node circuits should remain fast with modern JavaScript
- **Numerical stability**: Poorly conditioned matrices can cause solver issues
  - _Mitigation_: Add basic condition number checks; report errors for unsolvable circuits
- **Backward compatibility**: Changing solver could break existing circuits
  - _Mitigation_: Extensive regression testing with golden test circuits

## Why This Task Now

This is the most important gap because:

1. **Blocks educational use**: Tool cannot be used to teach electronics with broken circuit simulation
2. **Foundation for everything**: Error detection, current animation, and explain panel all depend on correct simulation
3. **Explicitly required**: Planning document specifies MNA as the algorithm for MVP
4. **Recent progress enables this**: With voltage visualization and component rendering complete, the simulation accuracy problem is now the most visible limitation
5. **Credibility**: Users testing the tool will immediately notice incorrect results for parallel circuits
6. **MVP requirement**: Cannot claim MVP status without a working circuit solver

The tool now has excellent UI and visualization, but the core simulation engine is fundamentally broken for anything beyond trivial series circuits. This must be fixed before any other features can be meaningfully developed.

## Test Cases to Verify

Golden test circuits to validate the new solver:

1. **Two parallel resistors**: 5V → (1kΩ || 1kΩ) → GND
   - Expected: 2.5mA through each resistor, 5mA total
2. **Voltage divider with parallel load**: 5V → 1kΩ → (1kΩ || 1kΩ) → GND
   - Expected: 3.33V at divider output, 3.33mA total current
3. **Bridge circuit**: More complex resistor network
   - Expected: Calculated using hand analysis
4. **Multiple LEDs in parallel**: 5V → 1kΩ → (LED || LED) → GND
   - Expected: Current splits between LEDs
5. **Short circuit detection**: 5V → Wire → GND (zero resistance path)
   - Expected: Solver detects singular matrix and reports error

## Next Steps After This Task

Once proper circuit simulation works:

1. Add error detection logic (short circuits, floating nodes, voltage violations)
2. Implement error overlays on breadboard (red markers, explanations)
3. Create "Explain" panel with circuit analysis insights
4. Add current animation on wires and components (now with correct current values)
5. Extend component library (capacitor, inductor, transistor—requires transient analysis later)
6. Consider SPICE solver integration for advanced analysis (post-MVP)
