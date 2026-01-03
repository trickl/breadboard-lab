Implement animated current flow visualization on wires and components

## Context

Breadboard Lab successfully visualizes voltage distribution through color-coded heatmaps, and the Modified Nodal Analysis solver accurately computes currents through all circuit branches. However, these current values remain invisible to users. The planning document identifies **electricity-flow visualization** as the central educational feature, with both voltage heatmaps AND current animations explicitly required for MVP.

## Gap Analysis

**Long-term goal**: Real-time visual feedback showing both voltage levels (via heatmap) and current flow (via animated particles) to teach electronics (planning/vision/goal.md, lines 792-815, 1052).

**Current state**: 
- Voltage heatmap displays successfully with color-coded overlays
- Circuit simulator computes accurate branch currents via MNA solver (planning/state/system_capabilities.md, lines 162-165)
- Current values stored in `SimulationResult.edgeCurrents` map
- **BUT**: No visual representation of current flow exists
- **AND**: No animation showing direction or magnitude of current

**Gap**: The most critical missing visualization capability is animated current flow on wires and components.

## Proposed Development Task

**Implement animated current flow visualization on wires and components**

### Scope

Create an animation system that:
1. Reads solved current values from simulation results for each circuit edge
2. Renders animated particles flowing along wires and through components
3. Shows current direction (positive to negative terminal)
4. Visualizes current magnitude through particle speed and density
5. Updates animation automatically when circuit changes
6. Provides smooth 60fps animation using requestAnimationFrame

### Technical Approach

**Animation strategy** (per planning/vision/goal.md, lines 796-815):
- Render animated particles moving from higher to lower voltage
- Particle speed proportional to current magnitude
- Particle density proportional to current magnitude
- Use color/brightness to indicate current magnitude:
  - < 1mA: Slow, faint particles
  - 1mA - 10mA: Medium speed, visible
  - > 10mA: Fast, bright particles

**Implementation approach**:
- Extend `BreadboardApp` or `ComponentRenderer` with animation layer
- Use Canvas API or SVG animations for particle rendering
- Calculate particle positions based on elapsed time and current magnitude
- Map circuit edges to visual paths (wire endpoints, component positions)
- Implement animation loop with requestAnimationFrame
- Show particles only on edges with current > threshold (e.g., 1µA)

**Visual design**:
- Particles: small circles (2-4px diameter)
- Particles wrap around (reappear at start when reaching end)
- Optional: Use different colors for different current ranges
- Layer particles above components but below UI overlays

### Success Criteria

- [ ] Particles animate along wires showing current direction
- [ ] Particle speed corresponds to current magnitude (faster = more current)
- [ ] Particle density corresponds to current magnitude (more particles = more current)
- [ ] No particles on zero-current branches
- [ ] Animation is smooth at 60fps with typical circuits
- [ ] Animation updates immediately after circuit changes
- [ ] Particles flow from positive to negative terminal (correct direction)
- [ ] Current threshold prevents visual noise from negligible currents

### Educational Impact

This feature is critical for learning:
- **Direction understanding**: Students see which way current flows (a common misconception point)
- **Magnitude visualization**: Speed/density conveys "how much" current, not just voltage
- **Series vs parallel**: Visualizes how current divides at junctions vs. stays constant in series
- **Complete picture**: Voltage heatmap + current animation = full electrical understanding
- **Engagement**: Animation makes abstract concepts concrete and engaging

Together with voltage heatmaps, current animation delivers on the core USP: "visualise real computed circuit behaviour directly on the breadboard."

### Alignment with Roadmap

This task is explicitly part of MVP (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Current animation overlay" listed as MVP requirement (line 1052)
- Completes the "Electricity Flow Visualisation" feature set (lines 756-830)
- Delivers on core objective: "Real electricity-flow visualisation" (line 50)
- Foundation for "Explain" panel (can reference both voltage and current)

### Estimated Effort

3-5 days of focused development
- Day 1: Design animation system architecture and particle lifecycle
- Day 2: Implement animation loop with requestAnimationFrame
- Day 3: Map circuit edges to visual paths, compute particle positions
- Day 4: Implement speed/density scaling based on current magnitude
- Day 5: Polish visual design, performance optimization, test with various circuits

### Dependencies

- Circuit simulator with accurate current calculations ✅ (already implemented via MNA solver)
- Component visual rendering ✅ (already implemented in PR #71)
- Wire rendering with known paths ✅ (already implemented)

### Risks

- **Performance**: Animating many particles at 60fps may impact performance
  - *Mitigation*: Limit particle count per wire, use efficient Canvas rendering, profile performance
- **Visual clutter**: Particles plus voltage heatmap plus components may be overwhelming
  - *Mitigation*: Make animation optional (toggle on/off), use subtle particle design
- **Direction correctness**: Must ensure particles flow in physically correct direction
  - *Mitigation*: Extensive testing with known circuits, validate against Ohm's law
- **Zero/negative current**: Need to handle edge cases (open circuits, numerical errors)
  - *Mitigation*: Apply threshold to filter negligible currents, test edge cases

## Why This Task Now

This is the most important gap because:

1. **Completes the MVP feature set**: Voltage heatmap alone is incomplete—current animation is explicitly required
2. **Delivers on core USP**: "Visualise real computed circuit behaviour" requires both voltage AND current
3. **High educational value**: Current flow is fundamental to understanding circuits
4. **Infrastructure is ready**: Solver computes accurate currents; visual rendering exists; just need animation layer
5. **Natural next step**: Builds directly on recently completed voltage heatmap (PR #12) and MNA solver (PR #77)
6. **Differentiator**: Most breadboard tools show only static images—animation sets this tool apart
7. **User expectation**: After seeing voltage heatmap, users will expect current visualization

The tool has accurate simulation and voltage visualization. Adding current animation completes the "electricity flows" visualization that is central to the educational mission.

## Implementation Details

### Particle System Design

```typescript
interface Particle {
  edgeId: string;           // Which circuit edge this particle belongs to
  progress: number;         // Position along path (0.0 to 1.0)
  speed: number;           // Movement speed (proportional to current)
  brightness: number;      // Visual intensity (proportional to current)
}

class CurrentAnimator {
  private particles: Particle[] = [];
  private animationFrame: number | null = null;
  
  start(simulationResult: SimulationResult, components: AnyComponent[]): void {
    // Create particles for each edge with current > threshold
    // Map edges to visual paths (wire coordinates, component pins)
    // Start animation loop
  }
  
  animate(timestamp: number): void {
    // Update particle positions based on elapsed time
    // Wrap particles that reach the end
    // Render particles on canvas/SVG
    // Request next frame
  }
}
```

### Visual Parameters

Based on planning document specifications (lines 798-815):
- **Particle size**: 2-4px diameter circles
- **Speed scaling**: 
  - 0-1mA: 0.5 units/second (slow)
  - 1-10mA: 1.0 units/second (medium)
  - 10mA+: 2.0 units/second (fast)
- **Density scaling**:
  - 0-1mA: 1 particle per wire
  - 1-10mA: 3 particles per wire
  - 10mA+: 5 particles per wire
- **Color coding**:
  - < 1mA: rgba(0, 100, 255, 0.3) - faint blue
  - 1-10mA: rgba(0, 150, 255, 0.6) - medium blue
  - > 10mA: rgba(0, 200, 255, 1.0) - bright blue

## Next Steps After This Task

Once current animation works:
1. Implement error detection overlays (short circuits, floating nodes, reversed polarity)
2. Create "Explain" panel with circuit analysis insights (can now explain both voltage and current)
3. Add component value customization (user-adjustable resistance, voltage)
4. Implement component deletion and editing capabilities
5. Add undo/redo functionality
6. Consider power dissipation visualization (heat indicators on resistors)
