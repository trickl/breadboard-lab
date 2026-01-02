Implement current animation overlay on wires and components

## Context

Breadboard Lab now visualizes voltage levels using color-coded heatmaps (completed in PR #12). The simulation also computes current values through all components (`edgeCurrents` map in `SimulationResult`). However, these current values are not visualized, leaving half of the "electricity-flow visualization" feature incomplete.

The planning document identifies **current animation** as a central educational feature that differentiates this tool from competitors. Students need to see both voltage (static) and current (dynamic flow) to understand circuit behavior.

## Gap Analysis

**Long-term goal**: Real-time animated visualization showing current direction and magnitude using moving particles along wires and through components (planning/vision/goal.md, lines 792-815).

**Current state**: 
- Circuit simulation successfully computes `edgeCurrents` for all components (planning/state/system_capabilities.md, lines 175-188)
- Voltage heatmap displays voltage levels on holes
- Current values exist in memory but are completely invisible to users
- No animation infrastructure exists in the UI layer

**Gap**: The second critical piece of electricity-flow visualization is missing. Users can see voltage (potential) but cannot see current (flow).

## Proposed Development Task

**Implement animated current flow visualization on wires and components**

### Scope

Create an animation system that:
1. Reads computed current values from `SimulationResult.edgeCurrents`
2. Maps circuit edges back to component positions on the breadboard
3. Renders animated particles moving along wires and through components
4. Particle direction shows current flow (from higher to lower voltage)
5. Particle speed and density represent current magnitude
6. Animation runs continuously using `requestAnimationFrame`
7. Updates automatically when circuit changes

### Technical Approach

**Data flow:**
```
SimulationResult.edgeCurrents (Map<string, number>)
    ↓
Identify wire/component positions on breadboard
    ↓
Calculate particle paths (start/end coordinates)
    ↓
Spawn particles with velocity based on current
    ↓
Animate particles using requestAnimationFrame
    ↓
Render particles as small circles on canvas/DOM overlay
```

**Implementation options:**
1. **Canvas overlay approach** (recommended):
   - Add a `<canvas>` element on top of the breadboard grid
   - Draw particles as circles using canvas API
   - Update particle positions in animation loop
   - Efficient for many particles (60fps target)

2. **DOM element approach**:
   - Create particle divs and animate with CSS transforms
   - Simpler but may have performance issues with many particles

**Particle physics:**
- Particle speed = `k * |current|` where `k` is tuning constant (start with `k = 50 pixels/second per mA`)
- Particle spawn rate = `r * |current|` where `r` is tuning constant (start with `r = 2 particles/second per mA`)
- Minimum current threshold = 1µA (don't show particles for negligible currents)
- Particles wrap around (reappear at start when reaching end)

**Color scheme:**
- Low current (<1mA): Faint blue particles, slow movement
- Medium current (1-10mA): Bright green particles, medium speed
- High current (>10mA): Bright orange particles, fast movement

### Success Criteria

- [ ] Particles appear on all components with current > 1µA
- [ ] Particle direction matches current flow (positive terminal → negative terminal)
- [ ] Particle speed visually corresponds to current magnitude
- [ ] No particles on components with zero or negligible current
- [ ] Animation is smooth (minimum 30fps, target 60fps)
- [ ] Animation starts/stops/updates when circuit changes
- [ ] Hover tooltip on component shows exact current value
- [ ] Visual result matches specification in planning document (lines 792-815)

### Educational Impact

Current flow is one of the most difficult concepts for electronics beginners. Static voltage levels help, but seeing the dynamic movement of charge through the circuit provides crucial intuition about:
- Series circuits: Same current everywhere
- Parallel circuits: Current divides
- Resistors: Current limited by resistance
- LEDs: Current flows only in forward direction
- Short circuits: Very high current (visual "flood" of particles)

This feature transforms "what voltage is here?" into "what is electricity doing?".

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Current animation overlay" is listed as MVP requirement (line 1052)
- Completes the "Electricity Flow Visualisation" feature (second of two overlay modes)
- Prerequisite for power dissipation visualization (line 816-830)
- Enables error detection visualization (rapid particle flow = short circuit)

### Estimated Effort

3-5 days of focused development:
- Day 1: Set up canvas overlay infrastructure and basic particle system
- Day 2: Implement particle spawning, movement physics, and current-to-velocity mapping
- Day 3: Add color coding, ensure smooth 60fps animation, optimize performance
- Day 4: Add hover tooltips for current values, polish visual design
- Day 5: Test with various circuits, accessibility review (motion-sensitive users)

### Dependencies

- Voltage heatmap overlay (✅ completed in PR #12)
- Circuit simulation `edgeCurrents` (✅ already implemented)
- Mapping from circuit edges to breadboard positions (✅ already exists in `BreadboardApp`)

### Risks

**Performance**: Animating many particles (potentially 50-100 particles on screen) could impact frame rate
- **Mitigation**: Use canvas rendering (not DOM), limit particle count per component, use object pooling

**Visual clarity**: Too many particles could make the breadboard look cluttered
- **Mitigation**: Adjust particle density based on user feedback, add toggle to show/hide current animation

**Motion sensitivity**: Some users may experience discomfort with constant motion
- **Mitigation**: Add a "pause animation" button, reduce animation speed option, respect `prefers-reduced-motion` CSS media query

**Color scheme**: Chosen colors must work with existing voltage heatmap
- **Mitigation**: Test color combinations, ensure particles are visible on all voltage colors, add outline/glow to particles if needed

### Technical Considerations

**Animation loop:**
```typescript
class CurrentAnimator {
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  
  start(edgeCurrents: Map<string, number>): void {
    this.updateParticleSources(edgeCurrents);
    this.animate();
  }
  
  private animate = (): void => {
    this.updateParticles();
    this.renderParticles();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }
  
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
```

**Particle lifecycle:**
- Spawn at component start position
- Move along path at constant velocity
- Remove when reaching end position
- Recycle particle objects (object pooling for performance)

**Path calculation:**
For wires and two-terminal components:
- Start position = hole position of terminal with higher voltage
- End position = hole position of terminal with lower voltage
- Path = straight line or bezier curve (start with straight for MVP)

### Accessibility

- **Motion sensitivity**: Respect `prefers-reduced-motion` media query (disable animations or significantly slow them)
- **Tooltips**: Provide text alternative showing current values on hover
- **Keyboard access**: Allow users to toggle animation on/off with keyboard shortcut (e.g., 'A' key)
- **Screen readers**: Announce total circuit current and major current paths

### Testing Strategy

**Unit tests:**
- Particle spawning logic (correct rate based on current)
- Particle movement physics (velocity calculation)
- Particle direction (follows current flow)

**Visual tests:**
- Simple LED circuit: Particles flow from power → resistor → LED → ground
- Voltage divider: Particles show same current through both resistors
- Short circuit: Very rapid particle flow (warning indicator)
- Open circuit: No particles (current = 0)

**Performance tests:**
- Profile with many components (~20-30 components)
- Ensure 60fps on typical hardware
- Memory leak check (run animation for 5+ minutes)

### Next Steps After This Task

Once current visualization works:
1. Implement power dissipation overlay (planning/vision/goal.md, lines 816-830)
2. Add error detection overlays (planning/vision/goal.md, lines 832-849)
3. Create "Explain" panel for educational context (planning/vision/goal.md, lines 851-881)
4. Consider transient analysis to show capacitor charging with animated current decay

## Why This Task Now

This is the most important next gap because:

1. **Completes the core value proposition**: Voltage + current = complete electrical picture
2. **Direct educational impact**: Current flow is harder to understand than voltage; animation makes it concrete
3. **Foundation for advanced features**: Power dissipation, error detection, and explanations all build on current visualization
4. **Natural progression**: Infrastructure from voltage overlay can be reused
5. **MVP requirement**: Explicitly listed in MVP milestone (planning/vision/goal.md, line 1052)
6. **High visibility**: Animation is eye-catching and demonstrates the tool's educational power
7. **Already 80% ready**: Simulation computes currents; only rendering is missing

## Alternatives Considered

**Why not other gaps?**

- **Drag & drop / rotation**: Important for UX but doesn't advance educational mission
- **More component types**: Would add variety but doesn't improve understanding of existing circuits  
- **Schematic view**: Valuable but secondary to primary breadboard experience
- **Error detection**: Depends on having current visualization first (e.g., short circuit = excessive current)
- **SPICE solver**: Over-engineering; current simple solver works for educational circuits
- **Save/load**: Convenience feature, not core educational value

**Current animation vs. other visualization modes:**
- Current is dynamic (shows "flow"), voltage is static (shows "potential")
- Both are essential; voltage alone is incomplete
- Current animation has higher "wow factor" and engagement

Current animation is the next logical step that maximizes educational impact while building directly on existing infrastructure.
