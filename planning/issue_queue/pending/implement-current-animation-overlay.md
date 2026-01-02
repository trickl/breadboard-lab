Implement current animation overlay on wires and components

## Context

Breadboard Lab now displays voltage levels using color-coded overlays (PR #12), completing the first half of "electricity flow visualization." However, current flow through wires and components remains invisible. The planning document identifies **current animation** as a central educational feature that shows direction and magnitude of current flow in real time.

## Gap Analysis

**Long-term goal**: Animated particles flowing along wires and through components to visualize current direction and magnitude, tied to solver output (planning/vision/goal.md, lines 792-815).

**Current state**: Circuit simulation successfully computes `edgeCurrents` (current through each component), but these values are only displayed as text in the info panel. No visual representation of current flow exists on the breadboard (planning/state/system_capabilities.md, lines 192-233).

**Gap**: The second critical piece of electricity flow visualization is missing. Users cannot see which direction current flows or how much current is flowing through circuit paths.

## Proposed Development Task

**Implement animated particle overlay showing current flow through wires and components**

### Scope

Create a current animation system that:
1. Reads solved current values from simulation results (`edgeCurrents` map)
2. Maps circuit edges (components) back to their breadboard positions
3. Renders animated particles moving along wires and through components
4. Particle speed and density proportional to current magnitude
5. Particle direction indicates current flow (high voltage → low voltage)
6. Updates automatically when circuit changes
7. Uses canvas animation loop (requestAnimationFrame) for smooth 60fps animation

### Technical Approach

**Animation Implementation:**
- Create new `CurrentAnimator` class in `src/ui/current-animator.ts`
- Maintain array of particle objects with position, velocity, and edge ID
- Update particle positions each frame based on current magnitude
- Render particles as small colored circles (2-4px diameter) on canvas overlay
- Particles wrap around (reappear at start when reaching end)

**Edge-to-Path Mapping:**
- Extract start and end positions from each circuit edge's component
- Generate straight line path between positions initially (MVP)
- Consider orthogonal/Manhattan routing for better visual clarity (optional enhancement)

**Current-to-Visual Mapping:**
- No particles for current below threshold (e.g., 1µA)
- Particle speed: 50-500px/s proportional to current magnitude
- Particle density: 1-10 particles per edge proportional to current magnitude
- Particle color coding:
  - < 1mA: Faint blue/gray particles
  - 1mA - 10mA: Medium cyan particles
  - > 10mA: Bright yellow/orange particles

**Integration with BreadboardApp:**
- Add canvas layer above breadboard for particle rendering
- Initialize animator with circuit and simulation results
- Call animator.update() and animator.render() in animation loop
- Clear and reinitialize particles when circuit changes

### Success Criteria

- [ ] Particles move from positive to negative terminal (correct direction)
- [ ] Particle speed visibly correlates with current magnitude
- [ ] No particles appear on zero-current branches
- [ ] Animation runs smoothly at 60fps with up to 50 particles
- [ ] Particles wrap seamlessly (no visible pop when restarting)
- [ ] Animation updates immediately when circuit changes
- [ ] Hover tooltip shows exact current value for the edge
- [ ] Animation can be toggled on/off without affecting voltage overlay

### Educational Impact

This feature completes the core "electricity flow visualization" promise:
- **Voltage overlay** (completed) shows electrical potential difference
- **Current animation** (this task) shows actual charge movement

Together, these visualizations help students understand:
- Ohm's law in action (high voltage difference → strong current)
- Series vs. parallel circuits (current distribution)
- Short circuits (very high current flow)
- Open circuits (no current flow)
- LED behavior (current flows one direction only)

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Current animation overlay" is explicitly listed as MVP requirement (line 1052)
- Natural successor to voltage heatmap overlay (completed in PR #12)
- Prerequisite for power dissipation overlay (optional enhancement)
- Foundation for error detection overlays (e.g., highlighting dangerous high-current paths)

### Estimated Effort

3-4 days of focused development:
- Day 1: Implement particle system and animation loop
- Day 2: Edge-to-path mapping and current-to-visual scaling
- Day 3: Integration with BreadboardApp, smooth animation
- Day 4: Polish, tooltips, performance optimization, testing

### Dependencies

- ✅ Voltage overlay system (provides reference for integration pattern)
- ✅ Circuit simulator computes edgeCurrents
- ✅ Circuit extractor maps components to circuit edges
- No external dependencies required

### Technical Risks and Mitigations

**Risk 1: Animation performance with many particles**
- Mitigation: Limit max particles per edge (10), use efficient canvas rendering
- Fallback: Reduce particle count if frame rate drops below 30fps

**Risk 2: Particle movement looks jerky or unnatural**
- Mitigation: Use smooth interpolation, ensure consistent timestep
- Enhancement: Add easing functions for more natural acceleration/deceleration

**Risk 3: Unclear which component/wire a particle belongs to**
- Mitigation: Render particles directly on top of wire paths
- Enhancement: Brighten/highlight wire on hover to show associated current value

**Risk 4: Particles difficult to see against voltage overlay colors**
- Mitigation: Use contrasting particle colors (white/yellow with dark outline)
- Fallback: Add optional "current-only" visualization mode (hide voltage overlay)

### Implementation Notes

**Particle Data Structure:**
```typescript
interface Particle {
  edgeId: string;          // Which edge this particle belongs to
  position: number;        // 0.0 to 1.0 along the edge path
  velocity: number;        // Units per second (based on current magnitude)
  color: string;           // RGB color based on current magnitude
}
```

**Animation Loop:**
```typescript
class CurrentAnimator {
  private particles: Particle[] = [];
  private lastTimestamp: number = 0;
  
  update(timestamp: number, circuit: Circuit, simulation: SimulationResult): void {
    const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
    
    // Update each particle position
    for (const particle of this.particles) {
      particle.position += particle.velocity * deltaTime;
      if (particle.position > 1.0) {
        particle.position = 0.0; // Wrap around
      }
    }
    
    // Add/remove particles based on current magnitude changes
    this.synchronizeParticles(circuit, simulation);
    
    this.lastTimestamp = timestamp;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      const { x, y } = this.getParticleScreenPosition(particle);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```

### Testing Strategy

**Unit Tests:**
- Particle position updates correctly based on velocity
- Particle wrapping behavior (position > 1.0 resets to 0.0)
- Current-to-velocity scaling function
- Current-to-color mapping function

**Integration Tests:**
- Particles appear when circuit has non-zero current
- Particle count scales with current magnitude
- No particles appear when simulation fails
- Animation handles rapid circuit changes without crashing

**Manual Testing:**
- Build simple LED circuit, verify particles flow from power through resistor to LED to ground
- Increase resistance (conceptually), verify particles slow down
- Short circuit (wire from power to ground), verify many fast particles
- Open circuit (disconnected component), verify no particles

### Visual Design Specifications

**Particle Appearance:**
- Shape: Circle
- Size: 3px radius (6px diameter)
- Outline: 1px dark stroke for visibility against light backgrounds
- Glow effect: Optional subtle shadow for depth

**Color Palette (color-blind friendly):**
- 0-1mA: rgba(100, 150, 200, 0.6) - faint blue-gray
- 1-5mA: rgba(0, 200, 200, 0.8) - cyan
- 5-10mA: rgba(200, 200, 0, 0.9) - yellow
- >10mA: rgba(255, 100, 0, 1.0) - orange-red

**Animation Characteristics:**
- Frame rate: 60fps target (requestAnimationFrame)
- Minimum visible speed: 50px/s (at 1µA)
- Maximum visible speed: 500px/s (at 100mA+)
- Particle spacing: 30-50px between particles in same edge

## Why This Task Now

This is the most important next gap because:

1. **Completes the core value proposition**: Voltage overlay alone is insufficient; users need to see both voltage (potential) and current (flow) to understand circuits
2. **High educational impact**: Current animation makes abstract concepts concrete (students literally see electricity flow)
3. **Natural progression**: Builds directly on voltage overlay foundation (PR #12), using similar integration patterns
4. **Technical readiness**: All required data already exists (`edgeCurrents` from simulator); only visualization is missing
5. **MVP requirement**: Explicitly listed in MVP milestone (planning/vision/goal.md, line 1052)
6. **Foundation for advanced features**: Error detection (dangerous high current) and power dissipation visualization build on current display

## Next Steps After This Task

Once current animation works:
1. Implement error detection overlays (short circuit, floating node, reversed LED) - planning/vision/goal.md, lines 832-849
2. Create "Explain" panel with educational context and debugging hints - planning/vision/goal.md, lines 851-881
3. Add power dissipation visualization (highlight hot resistors) - planning/vision/goal.md, lines 817-830
4. Improve circuit simulator to handle parallel circuits (currently series-only) - planning/state/system_capabilities.md, lines 166-175

## Related Planning Documents

- **Vision**: planning/vision/goal.md, lines 792-815 (Current Animation specification)
- **Current State**: planning/state/system_capabilities.md, lines 192-233 (Voltage visualization exists, current does not)
- **Architecture**: ARCHITECTURE.md, lines 159-160 (Future enhancement: current animation)
- **MVP Requirements**: planning/vision/goal.md, lines 1041-1069 (Current animation is explicit MVP requirement)
