# Implement full nodal analysis for parallel circuits

## Context

Breadboard Lab's current circuit simulator uses a simplified path-finding approach that only handles simple series circuits from power to ground. This severely limits the types of circuits users can build and simulate, preventing basic educational examples like parallel resistor networks, current dividers, and multi-branch circuits.

## Gap Analysis

**Long-term goal**: Accurate DC circuit simulation using proper nodal analysis that handles arbitrary circuit topologies including parallel branches, multiple power sources, and complex resistive networks (planning/vision/goal.md, lines 630-676).

**Current state**: Simulator uses depth-first search to find one series path from power to ground, then calculates voltages along that path. It completely ignores parallel branches and alternative current paths (planning/state/system_capabilities.md, lines 166-175).

**Gap**: The fundamental simulation engine cannot handle real-world circuits with parallel components.

## Proposed Development Task

**Replace path-based simulation with modified nodal analysis (MNA) solver**

### Problem Examples

Current simulator fails or gives incorrect results for:

1. **Parallel resistors**: 
   ```
   5V → R1 (1kΩ) → GND
       ↘ R2 (1kΩ) → GND
   ```
   Current behavior: Only simulates R1, ignores R2
   
2. **Voltage divider with load**:
   ```
   5V → R1 → midpoint → R2 → GND
              ↓
             R3 → GND
   ```
   Current behavior: Ignores R3 loading effect

3. **Multiple power sources**:
   ```
   V1 (5V) → R1 → node → R2 → GND
   V2 (3V) → R3 → node
   ```
   Current behavior: Undefined behavior

### Scope

Implement a proper DC circuit solver that:
1. Builds conductance matrix (G) and current vector (i) using Modified Nodal Analysis
2. Solves the linear system G × v = i for node voltages
3. Back-calculates branch currents from voltage differences and Ohm's law
4. Handles arbitrary circuit topologies (series, parallel, mixed)
5. Supports multiple ground nodes and power sources
6. Detects and reports unsolvable circuits (e.g., voltage source loops)

### Technical Approach

**Algorithm**: Modified Nodal Analysis (MNA)

1. **Matrix construction**:
   - Create conductance matrix G (n×n where n = number of nodes)
   - For each resistor between nodes i and j with conductance g = 1/R:
     - G[i][i] += g
     - G[j][j] += g  
     - G[i][j] -= g
     - G[j][i] -= g
   - Handle voltage sources as constraints

2. **Linear system solver**:
   - Use Gaussian elimination or LU decomposition
   - For small circuits (<100 nodes), direct methods are sufficient
   - Consider using a linear algebra library (e.g., math.js, numeric.js)

3. **Component models**:
   - Resistor: Conductance g = 1/R
   - Wire: High conductance (1/0.01 = 100 S)
   - LED: Simplified as resistor + voltage source (linearized)
   - Power supply: Ideal voltage source (constrained node voltage)
   - Ground: Reference node (voltage = 0)

**Implementation location**: Replace logic in `src/core/circuit-simulator.ts`

**Dependencies**: Consider adding a small linear algebra library:
- `mathjs` (good matrix operations, but large ~500KB)
- `numeric` (lightweight, but older)
- Custom implementation (Gaussian elimination ~100 lines)

**Decision**: Start with custom Gaussian elimination to avoid dependencies, benchmark, then add library if needed.

### Success Criteria

- [ ] Simulator correctly handles parallel resistor networks
- [ ] Voltage divider with load produces correct voltages
- [ ] Multiple series and parallel branches all carry correct currents
- [ ] Performance remains acceptable (<100ms for typical circuits)
- [ ] All existing unit tests still pass
- [ ] New tests cover parallel circuits, voltage dividers, and edge cases
- [ ] Voltage heatmap visualization shows correct voltages for parallel circuits

### Educational Impact

This fix is essential because:

1. **Unlocks fundamental circuit concepts**: Parallel resistance, current division, Kirchhoff's laws
2. **Enables realistic examples**: Most real circuits have parallel branches
3. **Builds on voltage visualization**: Voltage heatmap currently shows incorrect values for parallel circuits
4. **Foundation for advanced features**: Proper nodal analysis is required for:
   - Transient analysis (capacitors/inductors)
   - AC analysis (frequency response)
   - Nonlinear components (diodes, transistors)

### Alignment with Roadmap

This addresses a critical gap in the MVP:
- Planning document specifies "Fast DC solver (resistive networks)" (goal.md line 631)
- "resistive networks" implies support for parallel configurations
- Current implementation is insufficient for educational use
- Must be fixed before adding more components or features

### Estimated Effort

4-6 days of focused development
- Day 1-2: Research and design MNA implementation approach
- Day 3-4: Implement matrix construction and linear solver
- Day 5: Update component models and integration
- Day 6: Testing with complex circuits, performance optimization

### Dependencies

None - all work is contained within the circuit simulator module

### Risks

1. **Matrix solver complexity**: MNA requires robust linear algebra
   - *Mitigation*: Start with simple Gaussian elimination, add tests for numerical stability
   
2. **Performance degradation**: Matrix operations are O(n³) for n nodes
   - *Mitigation*: Profile with realistic circuits; modern JS is fast enough for <100 nodes
   - *Fallback*: Use sparse matrix representation if needed

3. **Component model changes**: LED and other components may need revised models
   - *Mitigation*: Keep simplified models initially; improve incrementally

4. **Breaking changes**: Existing (incorrect) simulation results will change
   - *Mitigation*: Update tests to reflect correct behavior; document in changelog

### Testing Strategy

**Unit tests** (add to `src/core/__tests__/circuit-simulator.test.ts`):
1. Parallel resistors: Two 1kΩ resistors in parallel → equivalent 500Ω
2. Voltage divider: 5V across 1kΩ + 1kΩ → 2.5V at midpoint
3. Current divider: Current splits inversely proportional to resistance
4. Multiple paths: Complex resistor network with known solution
5. Edge cases: Single resistor, no components, disconnected components

**Golden test circuits**:
```typescript
// Test 1: Parallel resistors
// 5V → (R1:1kΩ || R2:1kΩ) → GND
// Expected: V_mid = 5V, I_total = 10mA (5mA each branch)

// Test 2: Voltage divider
// 5V → R1:1kΩ → mid → R2:1kΩ → GND  
// Expected: V_mid = 2.5V, I = 2.5mA

// Test 3: Loaded voltage divider
// 5V → R1:1kΩ → mid → R2:1kΩ → GND
//              ↓ R3:1kΩ
//              GND
// Expected: V_mid = 5V × (R2||R3)/(R1 + (R2||R3)) = 1.67V
```

**Integration tests**:
- Build parallel circuit in UI, verify voltage heatmap shows correct values
- Build voltage divider, verify voltages match theoretical calculations

### Why This Task Now

This is the most critical gap because:

1. **Blocks educational value**: Current simulator gives wrong results for most circuits
2. **Fundamental vs. incremental**: This is a core capability, not a feature addition
3. **Affects existing features**: Voltage heatmap displays incorrect data for parallel circuits
4. **High impact, contained scope**: Fixes many problems without requiring UI changes
5. **Prerequisite for other features**: Current animation, error detection, and advanced analysis all depend on correct simulation

### Alternative Approaches Considered

**Alternative 1: Keep path-based solver, add heuristics**
- Pro: Less work, maintains existing code
- Con: Band-aid solution; will always have edge cases and bugs
- **Rejected**: Not educationally sound to ship a "toy" simulator

**Alternative 2: Integrate SPICE solver immediately**
- Pro: Industry-standard, handles everything
- Con: Large dependency, complex integration, slower performance
- **Rejected**: Overkill for MVP; save for v0.3 (goal.md lines 1089-1105)

**Alternative 3: Use external API for simulation**
- Pro: Offload complexity
- Con: Requires network, latency, privacy concerns, offline doesn't work
- **Rejected**: Violates "runs entirely in browser" principle

**Decision**: Implement proper nodal analysis in-house. This is the correct balance of accuracy, performance, and simplicity for the MVP.

## Next Steps After This Task

Once nodal analysis works correctly:

1. **Verify voltage heatmap** with parallel circuits (should now show correct values)
2. **Add current animation** (goal.md lines 792-815) - currents will now be accurate
3. **Implement error detection**: Short circuits, floating nodes, voltage source loops (goal.md lines 832-849)
4. **Add more component types**: Capacitors and inductors (requires transient solver, v0.3)

## References

- Planning document solver strategy: `planning/vision/goal.md` lines 625-755
- Current simulator limitations: `planning/state/system_capabilities.md` lines 131-189
- Modified Nodal Analysis: Standard technique for SPICE simulators (used in ngspice, LTspice)
- Implementation example: CircuitJS1 uses similar approach (GPL, cannot copy, but can learn from)

## Implementation Checklist

- [ ] Design MNA matrix structure
- [ ] Implement Gaussian elimination solver
- [ ] Update conductance matrix construction
- [ ] Handle voltage sources as constraints
- [ ] Update component models
- [ ] Write unit tests for matrix operations
- [ ] Write golden tests for known circuits
- [ ] Benchmark performance
- [ ] Update documentation
- [ ] Verify voltage heatmap shows correct values
