Implement current animation overlay for circuit visualization

## Context

Breadboard Lab now successfully displays voltage levels through a color-coded heatmap (completed in PR #12). However, current flow through wires and components remains invisible. The planning document identifies **current animation** as a critical MVP feature that completes the "electricity flow visualization" capability (planning/vision/goal.md, lines 792-815).

## Gap Analysis

**Long-term goal**: Real-time animated visualization showing current direction and magnitude through components and wires, enabling students to understand electron flow intuitively.

**Current state**: Circuit simulation computes branch currents (`edgeCurrents` map in `SimulationResult`), but these values are not visualized. Users can see voltage levels but cannot see which way current flows or how much (planning/state/system_capabilities.md, line 440, 540).

**Gap**: Current animation is the second pillar of "electricity flow visualization" after voltage heatmap. Without it, users cannot fully understand dynamic circuit behavior.

## Proposed Development Task

**Implement animated current flow visualization on wires and components**

### Scope

Create an animation system that:
1. Reads solved current values from simulation results
2. Maps circuit edges (components) back to breadboard positions
3. Renders animated particles flowing along wires and through components
4. Particle speed and density represent current magnitude
5. Particle direction shows current flow (high voltage → low voltage)
6. Updates automatically when circuit changes

### Technical Approach

**Animation Strategy:**
- Use `requestAnimationFrame` for smooth 60fps animation
- Render particles as small circles (2-4px diameter) on a canvas overlay
- Each wire/component with current > threshold (e.g., 1µA) gets animated particles
- Particle position advances based on current magnitude
- Particles wrap around (reappear at start when reaching end)

**Visual Design:**
- Particle color indicates current magnitude:
  - < 1mA: Slow, faint particles (light green)
  - 1mA - 10mA: Medium speed, visible (yellow)
  - > 10mA: Fast, bright particles (orange/red)
- Direction determined by voltage difference (high → low)
- Number of particles scales with current magnitude

**Implementation Steps:**
1. Extend `BreadboardApp` with animation layer and render loop
2. Create `CurrentAnimator` class to manage particle lifecycle
3. Add utility to map circuit edges to breadboard wire paths
4. Implement particle physics (position, velocity, wrapping)
5. Add controls to enable/disable animation (performance consideration)

### Success Criteria

- [ ] Particles animate smoothly at 60fps on typical circuits
- [ ] Particle direction matches current flow (high V → low V)
- [ ] Particle speed visibly correlates with current magnitude
- [ ] No particles appear on zero-current branches
- [ ] Animation can be toggled on/off for performance
- [ ] Works correctly with both simple and complex circuit topologies
- [ ] Animation updates immediately after circuit modification

### Educational Impact

This feature transforms passive voltage visualization into dynamic flow understanding:
- **Direction understanding**: Students immediately see which way current flows
- **Magnitude intuition**: Faster/denser particles = more current
- **Circuit debugging**: Zero current on expected paths reveals open circuits
- **Ohm's law demonstration**: Students see how resistance affects current visually

This is the signature feature that makes Breadboard Lab unique compared to static circuit drawing tools.

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1053):
- 🎯 "Current animation overlay" is explicitly listed as MVP requirement
- Builds directly on completed voltage heatmap foundation
- Enables subsequent features (error detection uses flow analysis)
- Required for "Explain" panel to show current reasoning

The planning document dedicates lines 792-815 to current animation specification, indicating its importance.

### Estimated Effort

3-4 days of focused development:
- Day 1: Implement particle system and animation loop
- Day 2: Map edges to wire paths, render particles
- Day 3: Add color coding, speed scaling, polish
- Day 4: Test with various circuits, optimize performance

### Dependencies

**Completed:**
- ✅ Voltage heatmap overlay (provides visual context)
- ✅ Circuit simulation with current calculation
- ✅ Edge-to-position mapping infrastructure

**No blockers** - all required data already exists in simulation results.

### Risks and Mitigations

**Risk 1: Performance degradation**
- *Problem*: 60fps animation with 20+ particles might be slow
- *Mitigation*: Use canvas rendering, batch draws, limit particle count
- *Fallback*: Toggle animation off, show static current arrows instead

**Risk 2: Visual clutter**
- *Problem*: Too many particles may obscure voltage colors
- *Mitigation*: Semi-transparent particles, smart z-ordering
- *Fallback*: Opacity slider for user control

**Risk 3: Mapping edges to visual paths**
- *Problem*: Components span holes; particles need continuous paths
- *Mitigation*: Interpolate straight lines between component terminals initially
- *Future*: Bezier curves for aesthetic improvement (not MVP)

### Technical Details

**Particle Data Structure:**
```typescript
interface Particle {
  edgeId: string;           // Which component/wire
  position: number;         // 0.0 to 1.0 along path
  velocity: number;         // Units per frame (based on current)
  color: string;            // Based on current magnitude
}
```

**Animation Loop Pseudocode:**
```typescript
function animateFrame() {
  particles.forEach(p => {
    p.position += p.velocity;
    if (p.position > 1.0) p.position = 0.0;  // Wrap
    renderParticle(p);
  });
  requestAnimationFrame(animateFrame);
}
```

**Current-to-Velocity Mapping:**
- 0-1mA: velocity = 0.01 (slow)
- 1-10mA: velocity = 0.02 (medium)
- 10-50mA: velocity = 0.05 (fast)
- > 50mA: velocity = 0.08 (very fast)

### Non-Goals

To keep scope manageable:
- ❌ Not implementing bezier curves for wires (straight lines sufficient for MVP)
- ❌ Not implementing particle collision or physics interactions
- ❌ Not implementing 3D or perspective effects
- ❌ Not implementing sound effects for current flow
- ❌ Not implementing custom particle shapes (circles only)

### Acceptance Test Cases

**Test 1: Simple LED Circuit**
- Build: Power → Resistor → LED → Ground
- Expected: Particles flow from power through resistor, LED, to ground
- Verify: Direction, speed proportional to calculated current

**Test 2: Voltage Divider**
- Build: Power → R1 → R2 → Ground
- Expected: Same current through both resistors (series)
- Verify: Particles have same speed on both edges

**Test 3: Zero Current**
- Build: Power and Ground on different nets (no path)
- Expected: No particles anywhere
- Verify: Animation system doesn't crash

**Test 4: Multiple Paths**
- Build: Parallel resistors
- Expected: Particles on all paths (when solver supports parallel)
- Note: Current simulator has limitations; may defer to future

### Why This Task Now

This is the most important next step because:

1. **Completes core value proposition**: "Voltage + Current = Complete circuit understanding"
2. **MVP requirement**: Explicitly listed in roadmap (planning/vision/goal.md, line 1052)
3. **High educational impact**: Flow visualization is transformative for learning
4. **Builds on foundation**: Voltage heatmap provides context; current adds dynamics
5. **Well-specified**: Planning doc has detailed implementation guidance
6. **Clear scope**: Animation is bounded, testable, with clear success criteria
7. **Unblocks follow-on work**: Error detection needs current analysis

### Next Steps After This Task

Once current animation works:
1. Implement error detection overlays (short circuits, floating nodes, reversed LEDs)
2. Create "Explain" panel with educational context
3. Add drag-and-drop component placement for better UX
4. Improve solver to handle parallel circuits correctly

## References

- Planning document: `planning/vision/goal.md`, lines 792-815 (current animation spec)
- System capabilities: `planning/state/system_capabilities.md`, line 440, 540
- Completed foundation: Voltage heatmap (PR #12)
- MVP requirements: `planning/vision/goal.md`, lines 1041-1053
