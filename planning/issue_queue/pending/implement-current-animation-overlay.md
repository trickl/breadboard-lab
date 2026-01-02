Implement current animation overlay on wires and components

## Context

Breadboard Lab successfully visualizes voltage levels through color-coded overlays (completed in PR #12). However, users cannot see current flow, which is equally important for understanding circuit behavior. The planning document identifies **current animation** as the second critical visualization feature after voltage heatmap.

## Gap Analysis

**Long-term goal**: Real-time animated particles showing current direction and magnitude along wires and through components (planning/vision/goal.md, lines 792-815).

**Current state**: 
- Circuit simulation computes `edgeCurrents` (current through each component)
- Voltage heatmap displays static voltage levels on holes
- No visual indication of current flow or direction
- Users cannot see which direction electricity is flowing

**Gap**: Current flow visualization is missing. Students cannot observe the dynamic nature of electricity or understand which direction current flows through their circuit.

## Proposed Development Task

**Implement current animation overlay with animated particles flowing along circuit paths**

### Scope

Create an animation system that:
1. Reads solved current values from simulation results (`edgeCurrents` map)
2. Renders animated particles moving along wires between component pins
3. Particle speed and density reflect current magnitude
4. Particle direction shows conventional current flow (positive to negative)
5. Animations update automatically when circuit changes
6. Particles only appear on branches with significant current (> 1µA threshold)

### Technical Approach

**Rendering Strategy:**
- Use HTML5 Canvas with `requestAnimationFrame` for smooth 60fps animation
- Create particle system: array of particle objects with position, velocity, lifetime
- Each particle follows the path between two breadboard holes (component endpoints)
- Interpolate particle position along the path using linear or bezier curves

**Particle Behavior:**
- Spawn particles at component start position (higher voltage node)
- Move particle toward end position (lower voltage node) over time
- Wrap around: when particle reaches end, respawn at start (continuous flow)
- Particle speed: scale by current magnitude (faster = more current)
- Particle density: more particles for higher current (spawn rate increases)

**Color Coding:**
- < 1mA: Slow, faint particles (gray/blue)
- 1mA - 10mA: Medium speed, visible (cyan)
- > 10mA: Fast, bright particles (yellow/green)

**Performance Considerations:**
- Limit max particles per component (e.g., 5-10 particles)
- Only animate visible components (cull off-screen)
- Use canvas layer above breadboard (separate from static voltage overlay)
- Throttle particle spawning to maintain 60fps

### Implementation Steps

1. **Create particle system module** (`src/ui/particle-system.ts`)
   - Define `Particle` interface (position, velocity, age, maxAge)
   - Implement `ParticleSystem` class with update/render methods
   - Support adding particle emitters for each current-carrying component

2. **Extend BreadboardApp with animation loop**
   - Add canvas layer for particles (above voltage overlay)
   - Initialize animation loop using `requestAnimationFrame`
   - Update particle positions each frame
   - Clear and redraw particles each frame

3. **Map circuit currents to particle emitters**
   - For each edge with current > threshold:
     - Get component positions (start and end holes)
     - Create particle emitter with appropriate spawn rate/speed
     - Direction: from higher voltage node to lower voltage node

4. **Add animation controls**
   - Toggle button to enable/disable current animation
   - Pause/resume animation
   - Adjust animation speed (slider for educational pacing)

### Success Criteria

- [ ] Particles animate smoothly at 60fps
- [ ] Particle direction matches conventional current flow (+ to -)
- [ ] Particle speed visually corresponds to current magnitude
- [ ] More particles appear on higher-current branches
- [ ] No particles on zero-current branches
- [ ] Animation can be toggled on/off without affecting voltage overlay
- [ ] Performance is acceptable with 10+ components
- [ ] Visual result matches specification in planning document (lines 792-815)

### Educational Impact

This feature completes the core "electricity visualization" experience:
- **Voltage heatmap** (static): Shows electrical potential distribution
- **Current animation** (dynamic): Shows charge movement and flow direction

Together, these visualizations teach students that:
- Voltage creates potential difference
- Current is the result of charge movement
- Direction matters (LEDs, diodes, transistors)
- Magnitude indicates power and heat

Students can now answer questions like:
- "Which way is the current flowing through this LED?"
- "Why isn't current flowing here even though there's voltage?"
- "Which resistor has more current (and will get hotter)?"

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- ✅ Voltage heatmap overlay (COMPLETED)
- 🎯 **Current animation overlay (THIS TASK)**
- ⏳ Basic error detection (NEXT AFTER THIS)

The planning document explicitly prioritizes current animation as the second visualization feature after voltage heatmap (line 1050).

### Estimated Effort

3-5 days of focused development
- Day 1: Implement particle system module and basic rendering
- Day 2: Integrate with circuit simulation and map currents to particles
- Day 3: Fine-tune animation parameters (speed, density, colors)
- Day 4: Add animation controls and performance optimization
- Day 5: Testing with various circuits, accessibility review

### Dependencies

- Voltage heatmap overlay (COMPLETED in PR #12)
- Circuit simulation producing `edgeCurrents` (EXISTS)
- Canvas rendering layer in UI (EXISTS)

### Risks

- **Performance**: Animating 50+ particles at 60fps may impact older devices
  - *Mitigation*: Implement particle limit, frame skip if needed, optional low-performance mode
- **Visual clarity**: Too many particles may look chaotic
  - *Mitigation*: Use spawn rate limits, fade particles over lifetime, test with users
- **Direction confusion**: Students may confuse electron flow vs. conventional current
  - *Mitigation*: Add tooltip explaining direction, optional toggle for electron flow direction

## Why This Task Now

This is the most important gap because:

1. **Completes core value proposition**: "Visualise real computed circuit behaviour" requires both voltage AND current
2. **Natural progression**: Builds on voltage visualization infrastructure already in place
3. **High educational value**: Current is harder to "see" than voltage; animation makes it concrete
4. **Explicitly prioritized**: Planning document lists this as second MVP visualization feature
5. **Foundation for future features**: Error detection (e.g., "no current flowing") builds on current display
6. **Moderate complexity**: Well-defined scope, clear implementation path, manageable risk

## Alternative Approaches Considered

### Alternative 1: Static current arrows (not animated)
- **Pro**: Simpler to implement, lower performance cost
- **Con**: Less engaging, doesn't convey magnitude well
- **Decision**: Animation is more educational and aligns with vision document

### Alternative 2: Color-coded wire thickness (current magnitude)
- **Pro**: Clean visual, no animation overhead
- **Con**: Doesn't show direction, static display
- **Decision**: Combine with animation for best effect (use both color and animation)

### Alternative 3: Defer until after error detection
- **Pro**: Error detection may be more immediately useful
- **Con**: Breaks natural progression (visualization → analysis → error detection)
- **Decision**: Follow roadmap order; current animation enables better error messages

## Next Steps After This Task

Once current animation works:
1. **Error detection overlays** (planning/vision/goal.md, lines 832-849)
   - Short circuit detection (red "X" icon)
   - Floating node detection (orange "?" icon)
   - Reversed polarity for LEDs (yellow "!" icon)
   
2. **"Explain" panel** (planning/vision/goal.md, lines 851-881)
   - Click on component → show voltage, current, power
   - Educational explanations and fix suggestions
   - Heuristics for common mistakes

3. **Component deletion and editing**
   - Individual component removal (not just "Clear All")
   - Moving components to new positions
   - Foundation for undo/redo

4. **Visual component rendering**
   - Draw resistor symbols, LED graphics, etc.
   - Resistor color bands for value indication
   - Improves visual communication

## References

- Planning document roadmap: `planning/vision/goal.md`, lines 1041-1069 (MVP milestone)
- Current animation specification: `planning/vision/goal.md`, lines 792-815
- System capabilities (current state): `planning/state/system_capabilities.md`
- Voltage heatmap implementation (prior work): PR #12
