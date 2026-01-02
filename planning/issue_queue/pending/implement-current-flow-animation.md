# Implement current flow animation on wires and components

## Context

Breadboard Lab now visualizes voltage levels using color-coded overlays (PR #12), but current flow remains invisible. The planning document identifies **current animation** as the second critical electricity-flow visualization feature that teaches students how electricity moves through circuits. Currently, simulation computes current values (`edgeCurrents`) but the UI shows no visual indication of current magnitude or direction.

## Gap Analysis

**Long-term goal**: Real-time animated particles flowing along wires and through components, showing direction and magnitude of current (planning/vision/goal.md, lines 792-815).

**Current state**: Circuit simulation successfully produces `edgeCurrents` map with current values for each component. However, no visual representation exists—wires themselves are not even rendered, and current values appear only as text in the info panel (planning/state/system_capabilities.md, lines 225-232, 436-437).

**Gap**: The most critical missing visualization is current flow animation—without it, students cannot understand how electricity moves through their circuits, even though they can see voltage levels.

## Proposed Development Task

**Implement animated current flow visualization on wires and components**

### Scope

Create an animation system that:
1. Renders visible wire paths connecting breadboard holes
2. Animates moving particles along wires and through components
3. Particle direction shows current flow (+ to - terminal)
4. Particle speed and density represent current magnitude
5. Updates automatically when circuit changes
6. Works in harmony with existing voltage heatmap overlay

### Technical Approach

**Phase 1: Wire Rendering (prerequisite)**
- Extend `BreadboardApp` to visually render wire components as paths
- Use straight lines initially (bezier curves are a stretch goal)
- Render wires as SVG paths or canvas strokes
- Wire layer should be below components, above breadboard background

**Phase 2: Current Animation**
- Create particle animation system using requestAnimationFrame
- For each component/wire with current > threshold (e.g., 1µA):
  - Spawn particles at intervals proportional to current magnitude
  - Move particles along wire path at speed proportional to current
  - Particle direction: from higher voltage node to lower voltage node
- Use color/brightness to indicate magnitude:
  - < 1mA: Slow, faint particles
  - 1mA - 10mA: Medium speed, visible
  - > 10mA: Fast, bright particles
- Particles wrap around (teleport back to start when reaching end)

**Phase 3: Integration**
- Add toggle control to enable/disable current animation (performance consideration)
- Ensure animation doesn't interfere with voltage heatmap
- Show current value in tooltip on wire hover
- Zero-current wires show no particles

### Success Criteria

- [ ] All wires are visually rendered as lines connecting their endpoints
- [ ] Particles move from positive to negative terminal (correct direction)
- [ ] Particle speed corresponds to current magnitude (observable difference between 1mA and 10mA)
- [ ] No particles appear on zero-current branches
- [ ] Animation runs smoothly at 60fps with up to 20 wires
- [ ] Hover tooltip shows exact current value on wires
- [ ] Animation can be toggled on/off for performance

### Educational Impact

This feature completes the core "electricity flows" visualization:
- **Voltage overlay** shows electrical potential (where energy is)
- **Current animation** shows charge movement (where energy goes)

Together, these visualizations teach the fundamental relationship: current flows from high voltage to low voltage, enabling students to debug circuits by seeing both what the voltages are AND where current is (or isn't) flowing.

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Current animation overlay" is listed as MVP requirement
- Explicitly listed as #1 next step after voltage heatmap (planning/issue_queue/complete/implement-voltage-heatmap-overlay.md, lines 82-85)
- Enables subsequent features (power dissipation highlighting, error detection)
- Core differentiator: "not merely a drawing tool...can visualise real computed circuit behaviour" (USP in planning doc)

### Estimated Effort

3-4 days of focused development
- Day 1: Implement wire rendering (visual path display)
- Day 2: Create particle animation system and integrate with simulation data
- Day 3: Polish animation parameters (speed, density, colors), add controls
- Day 4: Test with various circuits, optimize performance, add tooltips

### Dependencies

- Voltage overlay system (✅ completed in PR #12)
- Circuit simulation producing current values (✅ already exists)
- Wire components in breadboard state (✅ already tracked)

### Risks

- **Animation performance**: 60fps with many particles may be challenging
  - *Mitigation*: Limit particle count per wire, use canvas for rendering, provide toggle to disable
- **Visual clutter**: Animation + voltage colors might be overwhelming
  - *Mitigation*: Use subtle particle colors, ensure animation is secondary to voltage overlay
- **Direction calculation**: Need accurate node voltage comparison for flow direction
  - *Mitigation*: Voltage data already available from simulation results

### Technical Constraints

From planning/vision/goal.md, lines 796-815:
- Particles should be small circles (2-4px diameter)
- Use canvas animation loop (requestAnimationFrame)
- Current threshold: only show particles if current > 1µA
- Particle wrapping: reappear at start when reaching end

## Why This Task Now

This is the most important gap because:

1. **Completes the core value proposition**: Voltage + current visualization together enable full circuit understanding
2. **Unlocks educational potential**: Students cannot learn about current flow without seeing it
3. **Foundation for other features**: Power dissipation and error detection build on current display
4. **Data already exists**: Current values are computed; only visualization is missing
5. **Explicitly next in roadmap**: Planning document and completed issue both identify this as #1 priority
6. **High impact, manageable risk**: Clear scope, proven simulation data, known animation techniques

## Next Steps After This Task

Once current animation works:
1. Add power dissipation highlighting on resistors (planning/vision/goal.md, lines 817-830)
2. Implement error detection overlays (planning/vision/goal.md, lines 832-849)
3. Create "Explain" panel for educational context (planning/vision/goal.md, lines 851-881)
4. Add component graphics (currently only hole occupancy shown)
