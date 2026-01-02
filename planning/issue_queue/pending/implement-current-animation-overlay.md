# Implement current animation overlay on breadboard components and wires

## Context

Breadboard Lab now displays voltage levels through color-coded overlays (completed in PR #12), but this only shows the static electrical state. The planning document identifies **current animation** as the second critical visualization mode that transforms static voltage display into dynamic circuit behavior visualization. Students need to see not just voltage levels, but also the direction and magnitude of current flow to fully understand circuit operation.

## Gap Analysis

**Long-term goal**: Real-time animated visualization showing current flow direction and magnitude through components and wires, with particles moving along paths to indicate current (planning/vision/goal.md, lines 792-815).

**Current state**: The system computes branch currents and stores them in `SimulationResult.edgeCurrents`, but these values are not visualized in any form. Voltage heatmap shows static voltage levels but provides no information about current flow (planning/state/system_capabilities.md, lines 191-232).

**Gap**: The second most critical visualization feature - current animation - is completely missing, leaving students unable to understand dynamic circuit behavior.

## Proposed Development Task

**Implement animated current flow visualization on breadboard components and wires**

### Scope

Create an animation system that:
1. Reads solved current values from simulation results
2. Maps circuit edges (components) back to breadboard visual elements
3. Renders animated particles flowing along wires and through components
4. Uses particle speed and density to indicate current magnitude
5. Shows correct direction (high voltage → low voltage, conventional current)
6. Updates animation when circuit changes
7. Provides smooth 60fps animation using requestAnimationFrame

### Technical Approach

**Rendering Strategy**:
- Use HTML5 Canvas or SVG for particle animation layer
- Render particles as small circles (2-4px diameter) moving along component/wire paths
- Implement particle system with position, velocity, and lifecycle

**Particle Behavior**:
- Speed proportional to current magnitude (faster = more current)
- Density proportional to current magnitude (more particles = more current)
- Direction determined by voltage difference between terminals
- Particles wrap around (reappear at start when reaching end)
- Minimum current threshold (e.g., 1µA) to avoid visual noise

**Color Coding**:
- < 1mA: Slow, faint particles (low current)
- 1mA - 10mA: Medium speed, visible particles (typical current)
- > 10mA: Fast, bright particles (high current)

**Animation Architecture**:
- Create `CurrentAnimator` class managing particle lifecycle
- Integrate with `BreadboardApp` rendering loop
- Use requestAnimationFrame for smooth 60fps animation
- Maintain particle pool for performance

**Path Mapping**:
- Extract wire/component visual paths from breadboard positions
- Calculate bezier or line paths between component terminals
- Store path data for efficient particle position calculation

### Success Criteria

- [ ] Particles move in correct direction (positive to negative terminal)
- [ ] Particle speed visually correlates with current magnitude
- [ ] Zero-current branches show no particles
- [ ] Animation runs smoothly at 60fps without stuttering
- [ ] Particles wrap seamlessly (no gaps or jumps)
- [ ] Animation updates immediately when circuit changes
- [ ] Works correctly with all component types (wire, resistor, LED)
- [ ] Low-current circuits show subtle animation (not overwhelming)
- [ ] High-current circuits show clear, fast-moving particles

### Educational Impact

This feature transforms Breadboard Lab from a static visualization tool into a dynamic learning platform:

1. **Direction understanding**: Students see that current flows from high to low voltage
2. **Magnitude intuition**: Faster particles = more current = brighter LED / hotter resistor
3. **Circuit behavior**: Series circuits show same current everywhere; can later show parallel circuits with split flow
4. **Debugging aid**: Zero current immediately visible = circuit problem (open circuit, reversed LED)
5. **Engagement**: Animated feedback is more engaging and memorable than static displays

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Current animation overlay" is listed as MVP requirement (line 1052 shows it with aspirational checkmark)
- Natural progression after voltage heatmap (completed)
- Enables subsequent educational features (error explanations, interactive hints)
- Critical for differentiating from competitors (Falstad has this; we need it too)

### Estimated Effort

4-5 days of focused development
- Day 1: Design particle system architecture and path mapping
- Day 2: Implement particle rendering and animation loop
- Day 3: Integrate with simulation results and breadboard rendering
- Day 4: Tune particle behavior (speed, density, colors)
- Day 5: Performance optimization and edge case testing

### Dependencies

- Requires completed voltage heatmap (✅ completed in PR #12)
- Requires circuit simulation producing edge currents (✅ already available in `SimulationResult.edgeCurrents`)
- May benefit from visual wire rendering (currently wires are invisible), but can work without it by animating along component terminals

### Risks

- **Performance**: Animating many particles (50-100+) at 60fps could impact performance
  - *Mitigation*: Use particle pooling, limit particle count per edge, use efficient rendering (Canvas over DOM)
- **Visual complexity**: Too many particles could be overwhelming
  - *Mitigation*: Implement current threshold, scale particle count intelligently
- **Path calculation**: Determining smooth paths between holes may be complex
  - *Mitigation*: Start with straight-line paths; add bezier curves in iteration

### Technical Notes

**Particle System Architecture**:
```typescript
interface Particle {
  id: string;
  edgeId: string;        // Which component this particle represents current through
  position: number;       // 0.0 to 1.0 along path
  velocity: number;       // Speed (influenced by current magnitude)
  age: number;           // For fade-in/fade-out effects
}

class CurrentAnimator {
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;

  start(simulationResult: SimulationResult): void;
  stop(): void;
  private update(deltaTime: number): void;
  private render(ctx: CanvasRenderingContext2D): void;
}
```

**Integration Points**:
- Hook into `BreadboardApp.render()` to overlay animation
- Create animation canvas layer above breadboard
- Access `simulationResult.edgeCurrents` for current values
- Map edge IDs to breadboard visual positions

## Why This Task Now

This is the most important next gap because:

1. **Completes core visualization**: Voltage + current = complete circuit state
2. **Highest educational value**: Dynamic behavior is more instructive than static state
3. **Natural progression**: Builds on completed voltage heatmap foundation
4. **Competitive parity**: Falstad has excellent current animation; we need equivalent
5. **Enables downstream features**: Error detection ("LED not lighting? No current!") requires current visualization
6. **Well-defined scope**: Clear requirements, existing examples (Falstad), known algorithms
7. **High impact, moderate risk**: Significant educational value with manageable technical challenges

## Next Steps After This Task

Once current animation works:
1. Implement error detection and visual error overlays (planning/vision/goal.md, lines 832-845)
2. Create "Explain" panel with contextual circuit explanations (planning/vision/goal.md, lines 851-881)
3. Add power dissipation visualization for resistors (planning/vision/goal.md, lines 817-829)
4. Improve simulation accuracy for more complex circuits (parallel branches, voltage dividers)
