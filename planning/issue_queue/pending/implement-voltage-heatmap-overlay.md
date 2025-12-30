Implement voltage heatmap overlay on breadboard holes

## Context

Breadboard Lab simulates circuits and computes node voltages internally, but these results are not visualized. The planning document identifies **electricity-flow visualization** as the central educational feature that differentiates this tool from competitors. Currently, simulation results exist in memory but are invisible to users.

## Gap Analysis

**Long-term goal**: Real-time visual feedback showing voltage levels across the breadboard using color-coded overlays tied to solver output (planning/vision/goal.md, lines 764-791).

**Current state**: Circuit simulation runs successfully and produces `nodeVoltages` map, but the UI shows only text statistics in the info panel. No visual overlays exist (planning/state/system_capabilities.md, lines 192-209).

**Gap**: The most critical missing capability is voltage visualization on the breadboard itself.

## Proposed Development Task

**Implement voltage heatmap overlay rendering on breadboard holes**

### Scope

Create a visual overlay system that:
1. Reads solved voltage values from simulation results
2. Maps circuit nodes back to breadboard hole positions
3. Renders colored overlays on all holes belonging to each net
4. Uses a color gradient representing voltage levels (0V → 5V)
5. Updates automatically when circuit changes

### Technical Approach

- Extend the `BreadboardApp` rendering logic to include an overlay pass
- Add color mapping utility (voltage → RGB color)
- Use CSS classes or inline styles to colorize hole elements
- Ensure color scheme is accessible (high contrast, color-blind friendly)

### Success Criteria

- [ ] All holes in a net display the same voltage-based color
- [ ] Color gradient clearly distinguishes voltage levels
- [ ] Overlay updates immediately after component placement
- [ ] Hover tooltip shows exact voltage value
- [ ] Visual result matches specification in planning document

### Educational Impact

This feature directly enables the core learning experience: students see immediately how voltage distributes across their circuit. It transforms the tool from a "circuit builder" into an "electricity visualizer."

### Alignment with Roadmap

This task is part of MVP milestone (planning/vision/goal.md, lines 1041-1069):
- 🎯 "Voltage heatmap overlay" is listed as MVP requirement
- Enables subsequent features (current animation, error overlays)
- Prerequisite for educational "Explain" panel

### Estimated Effort

2-3 days of focused development
- Day 1: Implement color mapping and overlay rendering
- Day 2: Polish visual design, add tooltips
- Day 3: Test with various circuits, accessibility review

### Dependencies

None - all required data already exists in simulation results

### Risks

- Color choices may not work for all users (mitigated by using patterns option)
- Performance with 300 holes (30 rows × 10 columns) (mitigated by efficient DOM updates)

## Why This Task Now

This is the most important gap because:

1. **Unlocks the core value proposition**: Without visualization, Breadboard Lab is just another circuit builder
2. **Enables learning**: Students cannot understand voltage distribution without seeing it
3. **Foundation for other features**: Current animation and error detection build on voltage display
4. **Already partially implemented**: Simulation works; only rendering is missing
5. **High impact, low risk**: Well-defined scope, clear success criteria, no external dependencies

## Next Steps After This Task

Once voltage visualization works:
1. Add current animation on wires (planning/vision/goal.md, lines 792-815)
2. Implement error detection overlays (planning/vision/goal.md, lines 832-849)
3. Create "Explain" panel for educational context (planning/vision/goal.md, lines 851-881)
