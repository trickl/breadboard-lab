# Implement current animation overlay on wires and components

## Context

Breadboard Lab now visualizes voltage levels through color-coded overlays (PR #12), but current flow remains invisible despite being computed by the simulator. The planning document identifies **current animation** as the second critical component of "electricity-flow visualization" — the central educational feature that differentiates this tool from competitors.

## Gap Analysis

**Long-term goal**: Real-time animated visualization showing current direction and magnitude along wires and through components, tied directly to solver output (planning/vision/goal.md, lines 792-815).

**Current state**: Circuit simulation computes `edgeCurrents` for all components, but the UI shows no visual representation of current flow. Users cannot see which direction current flows or understand current magnitude differences (planning/state/system_capabilities.md, line 440: "No current display: Current values are computed but not visualized").

**Gap**: The most critical missing capability after voltage visualization is current flow animation.

## Proposed Development Task

**Implement animated current flow visualization on wires and components**

### Scope

Create an animation system that:
1. Reads computed current values from simulation results
2. Maps component edges back to visual wire/component positions on breadboard
3. Renders animated particles flowing along wires and through components
4. Particle speed and density represent current magnitude
5. Particle direction shows current flow from positive to negative
6. Updates automatically when circuit changes

### Technical Approach

- Extend the `BreadboardApp` rendering logic to include animation layer
- Use `requestAnimationFrame` for smooth 60fps particle animation
- Particle system:
  - Small circles (2-4px diameter) moving along wire paths
  - Speed proportional to current magnitude (I)
  - Density proportional to current magnitude
  - Direction from higher to lower voltage
- Color coding:
  - < 1mA: Slow, faint particles (light blue)
  - 1mA - 10mA: Medium speed, visible (cyan)
  - > 10mA: Fast, bright particles (white/yellow)
- Threshold: Only show particles for currents > 1µA
- Particles wrap around (reappear at start when reaching end)

### Success Criteria

- [ ] Animated particles visible on all wires with current > 1µA
- [ ] Particles move from positive terminal to negative terminal
- [ ] Particle speed correlates with current magnitude
- [ ] No particles on zero-current branches
- [ ] Animation runs smoothly at 60fps with typical circuits (< 20 components)
- [ ] Animation can be toggled on/off (performance optimization)
- [ ] Hover tooltip shows exact current value on wires

### Educational Impact

This feature completes the core "electricity visualizer" experience:
- Students see BOTH voltage distribution (static colors) AND current flow (animated particles)
- Immediate understanding of Ohm's law: high voltage difference + low resistance = fast-moving particles
- Visible distinction between series and parallel paths
- LED behavior becomes intuitive: current only flows one direction
- Short circuits become obvious: extremely fast particle flow

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Current animation overlay" is listed as MVP requirement
- Completes the "electricity-flow visualization" feature set
- Foundation for educational "Explain" panel (can explain why current flows or doesn't)
- Prerequisite for power dissipation visualization (requires current values)

### Estimated Effort

2-3 days of focused development
- Day 1: Implement particle system and basic animation loop
- Day 2: Map simulation currents to wire positions, tune visual parameters
- Day 3: Performance optimization, polish, accessibility (motion-safe preference)

### Dependencies

- Voltage heatmap overlay implementation (completed in PR #12)
- Current values from `CircuitSimulator.edgeCurrents` (already computed)
- Wire position data from breadboard state

### Risks

- Animation performance with many wires (mitigated by particle pooling and threshold)
- Visual clutter when combined with voltage overlay (mitigated by toggle control)
- Motion sensitivity for some users (mitigated by respecting `prefers-reduced-motion`)
- Determining particle paths for components without explicit visual geometry (mitigated by straight-line approximation between pins)

## Why This Task Now

This is the most important gap because:

1. **Completes the core value proposition**: Voltage + current = complete circuit understanding
2. **High educational impact**: Current is harder to visualize mentally than voltage; animation makes it tangible
3. **Natural progression**: Builds on voltage overlay infrastructure
4. **Foundation for advanced features**: Error detection ("why isn't current flowing?"), power visualization, LED explanations
5. **MVP blocker**: Planning document explicitly includes current animation in MVP
6. **High impact, moderate risk**: Clear success criteria, technical approach proven (Falstad does this well)
7. **Leverages existing data**: All current values already computed; only visualization missing

## Next Steps After This Task

Once current animation works:
1. Implement error detection and visual indicators (planning/vision/goal.md, lines 832-849)
2. Create "Explain" panel for educational context (planning/vision/goal.md, lines 851-881)
3. Add power dissipation overlay (optional, lines 817-829)
4. Improve circuit simulator to handle parallel circuits (current limitation per line 166)

## Design Reference

Planning document specifications (lines 792-815):
- Animated particles flow along wires and components
- Direction: higher voltage → lower voltage
- Speed: proportional to |I|
- Density: proportional to |I|
- Color by magnitude: < 1mA (faint), 1-10mA (visible), > 10mA (bright)
- Smooth animation at 60fps
- Particles wrap around (continuous loop)

## Technical Notes

### Animation Loop Structure

```typescript
class CurrentAnimationLayer {
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;

  start(edgeCurrents: Map<string, number>, wirePositions: Map<string, Path>) {
    this.initParticles(edgeCurrents, wirePositions);
    this.animate();
  }

  private animate = () => {
    this.updateParticlePositions();
    this.renderParticles();
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
```

### Particle Data Structure

```typescript
interface Particle {
  x: number;
  y: number;
  path: Path; // Wire geometry
  progress: number; // 0-1 along path
  speed: number; // pixels per frame
  size: number; // diameter in pixels
  color: string; // based on current magnitude
}
```

### Current-to-Visual Mapping

| Current Range | Speed (px/frame) | Size (px) | Color | Opacity |
|---------------|------------------|-----------|-------|---------|
| < 1mA         | 0.5              | 2         | cyan  | 0.4     |
| 1mA - 10mA    | 1.5              | 3         | cyan  | 0.7     |
| > 10mA        | 3.0              | 4         | yellow| 1.0     |

### Accessibility Considerations

- Respect `prefers-reduced-motion` media query
- Provide toggle control in UI
- Ensure static alternative (current value text on hover) always available
- Color + speed convey information redundantly (not color-only)
