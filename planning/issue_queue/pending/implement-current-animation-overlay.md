Implement current animation overlay on wires and components

## Context

Breadboard Lab now displays voltage levels via color-coded overlays (PR #12), but the educational experience is incomplete. The planning document identifies **electricity-flow visualization** as the central differentiating feature, requiring both voltage levels AND current flow to be visible. Currently, the simulator computes `edgeCurrents` for all components, but these values are not visualized—students cannot see current magnitude, direction, or which paths electricity is flowing through.

## Gap Analysis

**Long-term goal**: Real-time visual feedback showing both voltage distribution and current flow, with animated particles moving along wires and through components to indicate direction and magnitude (planning/vision/goal.md, lines 792-815).

**Current state**: Voltage heatmap overlay works successfully and shows voltage levels on all breadboard holes. Circuit simulation computes edge currents (planning/state/system_capabilities.md, lines 182-183), but the UI provides no visualization of current flow. Users see voltage but not current.

**Gap**: The second half of "electricity flow visualization" is missing—current animation.

## Proposed Development Task

**Implement current animation overlay showing particle flow on wires and components**

### Scope

Create an animation system that:
1. Reads solved current values from simulation results (`edgeCurrents` map)
2. Maps circuit edges back to component placements on the breadboard
3. Renders animated particles flowing along wires and through components
4. Particle direction shows current direction (high voltage → low voltage)
5. Particle speed/density represents current magnitude
6. Updates automatically when circuit changes
7. Only animates paths with current above threshold (e.g., 1µA)

### Technical Approach

**Animation Layer**:
- Add canvas overlay on top of breadboard for particle rendering
- Use `requestAnimationFrame` loop for smooth 60fps animation
- Particle system: array of particle objects with position, velocity, path

**Particle Behavior**:
- Particles spawn at component start position, travel along path to end position
- When particle reaches end, wrap back to start (continuous loop)
- Speed proportional to current magnitude (e.g., 1mm/ms per 1mA)
- Density proportional to current magnitude (more particles = more current)

**Visual Design**:
- Small circles (2-4px diameter) in contrasting color (e.g., bright yellow/green)
- Use different colors for current ranges:
  - < 1mA: Faint/slow particles
  - 1mA - 10mA: Normal particles
  - > 10mA: Bright/fast particles
- Optional glow effect for high current

**Integration**:
- Extend `BreadboardApp` to include canvas-based animation layer
- Map `edgeCurrents` to visual particle paths using component positions
- Pause animation when no circuit changes for 5+ seconds (power saving)
- Resume on any interaction

### Success Criteria

- [ ] Particles flow from higher voltage to lower voltage (correct direction)
- [ ] Particle speed visibly correlates with current magnitude
- [ ] No particles on zero-current branches
- [ ] Animation runs smoothly at 60fps
- [ ] Animation pauses/resumes correctly to save resources
- [ ] Particles visible on all component types (wire, resistor, LED)
- [ ] Visual result matches specification in planning document

### Educational Impact

This feature completes the core visualization capability:
- Students see **voltage levels** (static color) AND **current flow** (animated particles)
- Direction of flow teaches polarity and current direction conventions
- Magnitude teaches Ohm's law (high current in low resistance paths)
- Animated feedback is more engaging than static displays
- Transforms tool from "voltage viewer" to "complete circuit behavior visualizer"

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Current animation overlay" is listed as MVP requirement (line 1052)
- Builds directly on voltage heatmap (previous task)
- Enables subsequent features:
  - Error detection (e.g., "no current flowing" indicates open circuit)
  - Educational "Explain" panel (can reference animated flow)
  - Power dissipation overlay (high current + high voltage = heat)

### Estimated Effort

3-4 days of focused development:
- Day 1: Canvas overlay setup, particle system architecture
- Day 2: Map circuit edges to visual paths, implement particle spawning
- Day 3: Tune animation parameters (speed, density, colors)
- Day 4: Performance optimization, polish, testing with various circuits

### Dependencies

- Voltage overlay (completed in PR #12) provides foundation
- Simulation `edgeCurrents` already computed (no solver changes needed)
- Component position data already available in state

### Risks

- **Performance**: Animating 50+ particles at 60fps may impact performance
  - *Mitigation*: Use canvas (not DOM), limit max particles, pause when idle
- **Path calculation**: Components don't have visual "length" yet
  - *Mitigation*: Use straight line between pin positions for MVP
- **Visual clarity**: Particles may be hard to see on busy breadboard
  - *Mitigation*: Use high-contrast colors, optional glow effect

## Why This Task Now

This is the most important next gap because:

1. **Completes core value proposition**: Voltage + current visualization = complete circuit behavior visibility
2. **High educational impact**: Students learn from seeing both static state (voltage) and dynamic flow (current)
3. **Natural progression**: Builds directly on voltage overlay work (PR #12)
4. **MVP requirement**: Explicitly listed in planning document as MVP feature
5. **Moderate complexity**: Well-scoped task with clear success criteria
6. **High engagement**: Animation is more engaging than static displays
7. **Enables downstream features**: Error detection and educational explanations need current flow data

## Alternative Tasks Considered

**Why not these instead?**

1. **Component visual graphics** (making components visible):
   - Less critical for learning—students can still understand circuits with holes marked
   - More design/asset work, less educational impact per effort
   - Can be done after core visualizations complete

2. **Error detection overlays** (short circuit, floating node):
   - Requires both voltage AND current to be visible for maximum impact
   - Current animation is prerequisite for showing "why no current flows"

3. **Undo/redo functionality**:
   - Quality-of-life feature, not educational core
   - Students can work around with Clear All button
   - Lower priority than visualization completeness

4. **Component deletion/editing**:
   - Usability improvement, not educational enhancement
   - Can be deferred until core visualizations complete

**Conclusion**: Current animation is the highest-leverage next task—it completes the MVP's central educational feature (electricity flow visualization) and unblocks error detection and explanatory features.

## Next Steps After This Task

Once current animation works:
1. Implement error detection overlays (planning/vision/goal.md, lines 832-849)
2. Create "Explain" panel for educational context (planning/vision/goal.md, lines 851-881)
3. Add component visual graphics for improved clarity
4. Implement component deletion and editing for better UX
