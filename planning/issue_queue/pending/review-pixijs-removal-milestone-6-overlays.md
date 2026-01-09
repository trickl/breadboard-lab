Implement voltage overlay, current animation, and error badges in React/SVG UI (Milestone 6)

## Context

This task implements **Milestone 6 — Overlays and explain panel parity** from the PixiJS removal migration plan (`planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`, lines 342-350).

**Migration progress:** Milestones 0-5 complete (86%). This is Milestone 6 of 7.

**What has been completed:**
- ✅ Milestone 0: React infrastructure with feature flag
- ✅ Milestone 1: Renderer-agnostic controller layer
- ✅ Milestone 2: SVG breadboard substrate with hole highlighting
- ✅ Milestone 3: Component rendering and manipulation (drag, rotate, delete)
- ✅ Milestone 4: Rete graph layer aligned with breadboard coordinates
- ✅ Milestone 5: Interactive connection creation with hole occupancy constraints

**Current state:**
- React UI (`?react=true`) has functional breadboard, components, and connections
- Simulation pipeline (CircuitExtractor, CircuitSimulator) already exists and works
- PixiJS UI still has overlays (voltage heatmap, current animation, error badges)
- React UI needs to render these overlays to achieve feature parity

## Review Items Addressed

This task addresses the following specific items from the review document:

### Voltage Overlay (lines 219-224, 346)

**Review requirement (lines 219-224):**
> **Voltage overlays**
> **Current:** Pixi draws a voltage overlay layer.
> 
> **New:** Render a per-net or per-hole voltage overlay:
> - MVP overlay: per-hole colored halo for connected holes that are part of a net.
> - Better overlay: per-net region shading with alpha.

**Review requirement (line 346):**
> - Voltage overlay matches simulation node voltages.

**Task:**
1. Create `src/ui-react/overlays/VoltageOverlay.tsx` component
2. Subscribe to controller state to access `state.simulation.result`
3. For each connected net (holes connected by connections):
   - Query node voltage from simulation result using `getNodeVoltage(state, nodeId)` selector
   - Render SVG overlay visual at each hole in the net
4. Implement MVP overlay style: Per-hole colored circle/halo based on voltage
   - Voltage → color mapping (heatmap):
     - 0V: Blue (#0000ff)
     - Positive voltage (e.g., 3.3V, 5V): Red (#ff0000)
     - Negative voltage: Blue (darker shades)
     - Use color interpolation for intermediate values
   - Circle radius: 10-12px (slightly larger than hole)
   - Opacity: 0.4-0.5 (semi-transparent to see underlying substrate)
5. Position circles using `positionToPixels()` from breadboard-layout
6. Render voltage overlay layer between BreadboardSvg and ConnectionsLayer (Z-order)
7. Only render overlays when simulation result exists and is successful
8. Add toggle control to show/hide voltage overlay (UI state in controller)

**Acceptance criteria:**
- Voltage overlay renders when simulation completes successfully
- Hole colors reflect actual node voltages from simulation
- Overlay is semi-transparent (substrate visible underneath)
- Overlay can be toggled on/off
- Overlay updates when circuit changes trigger new simulation

### Current Flow Animation (lines 225-232, 347)

**Review requirement (lines 225-232):**
> **Current flow animation**
> **Current:** Pixi spawns particles moving along paths.
> 
> **New (SVG):**
> - Simple MVP: animate stroke dash offset on wires where $|I| > \epsilon$.
> - Better: render small circles moving along the path using `requestAnimationFrame` in React (still allowed; it's not WebGL).

**Review requirement (line 347):**
> - Current animation reflects `edgeCurrents` direction/magnitude.

**Task:**
1. Create `src/ui-react/overlays/CurrentAnimation.tsx` component
2. Subscribe to controller state to access `state.simulation.result.edgeCurrents`
3. For each connection with non-zero current ($|I| > 0.001$):
   - Query edge current from simulation using `getEdgeCurrent(state, edgeId)` selector
   - Determine current magnitude and direction
4. Implement MVP animation: Animated stroke dash offset on connections
   - Modify ConnectionsLayer to accept `showCurrentAnimation` prop
   - Add animated `<line>` overlay for each connection with current
   - Use CSS `stroke-dasharray` and `stroke-dashoffset` properties
   - Animate `stroke-dashoffset` using CSS animation or `requestAnimationFrame`
   - Animation direction reflects current direction (source → target or target → source)
   - Animation speed proportional to current magnitude
   - Color: Yellow (#ffff00) for animated overlay (distinct from connection line)
   - Stroke width: 3px (slightly thicker than connection)
5. Alternative "better" implementation (optional, can be future enhancement):
   - Render small circles (particles) moving along connection paths
   - Use `requestAnimationFrame` to update particle positions
   - Particle speed proportional to current magnitude
   - Particle color based on current magnitude (brighter = higher current)
6. Only animate connections when simulation result exists and has current data
7. Add toggle control to show/hide current animation (UI state in controller)

**Acceptance criteria:**
- Current animation renders on connections with non-zero current
- Animation direction matches actual current flow direction
- Animation speed reflects current magnitude
- Animation can be toggled on/off
- Animation updates when circuit changes trigger new simulation
- No animation on connections with zero/negligible current

### Error Overlay (lines 233-238, 348)

**Review requirement (lines 233-238):**
> **Errors**
> **Current:** Pixi draws error icons and supports click → explain.
> 
> **New:** Render error badges as SVG/HTML positioned elements anchored to:
> - the component centroid, or
> - the specific hole/pin if available.

**Review requirement (line 348):**
> - Error badges clickable → explain panel.

**Task:**
1. Create `src/ui-react/overlays/ErrorOverlay.tsx` component
2. Subscribe to controller state to access `state.simulation.errors` using `getSimulationErrors(state)` selector
3. For each simulation error:
   - Determine error location (component ID, hole position, or net ID)
   - Render error badge (SVG icon or emoji) at appropriate location:
     - Component errors: Position at component centroid (center of bounding box)
     - Hole/connection errors: Position at specific hole
     - Net/floating errors: Position at a representative hole in the net
4. Error badge visual:
   - SVG circle with error icon (⚠️ or ❌ emoji, or custom SVG path)
   - Background: Red (#ff0000) or Orange (#ff9900) based on severity
   - Radius: 12px
   - Border: White stroke (2px) for visibility
   - Opacity: 0.9 (mostly opaque for visibility)
   - Z-index: Above all other layers (render last)
5. Error badge interaction:
   - Make badges clickable (pointer-events: 'auto')
   - On click: Dispatch controller action to show explain panel with error details
   - Cursor: 'pointer' on hover
   - Optional: Show error message tooltip on hover
6. Error types to handle (from existing simulation):
   - Short circuit errors
   - Floating node errors
   - Invalid polarity errors (reversed LED, etc.)
   - Component constraint violations
7. Integrate with existing explain panel system (if it exists) or create minimal version
8. Position badges using `positionToPixels()` from breadboard-layout
9. Render error overlay as top layer (above all components and connections)

**Acceptance criteria:**
- Error badges render when simulation produces errors
- Badges positioned at correct locations (component/hole/net)
- Badges are clickable and trigger explain panel
- Different error types render with appropriate visual distinction
- Errors update when circuit changes trigger new simulation
- No error badges when simulation is successful

## Implementation Strategy

### Phase 1: Controller State Updates
1. Add UI state for overlay toggles to `AppState`:
   ```typescript
   ui: {
     showVoltageOverlay: boolean;
     showCurrentAnimation: boolean;
     xrayMode: boolean; // already exists
     // ... other UI state
   }
   ```
2. Add controller actions for overlay toggles:
   - `VOLTAGE_OVERLAY_TOGGLED`
   - `CURRENT_ANIMATION_TOGGLED`
3. Update controller reducer to handle these actions
4. Add selectors for overlay state:
   - `isVoltageOverlayEnabled(state): boolean`
   - `isCurrentAnimationEnabled(state): boolean`

### Phase 2: Voltage Overlay Component
1. Create `src/ui-react/overlays/VoltageOverlay.tsx`
2. Implement voltage → color mapping function (heatmap)
3. Query simulation voltages from controller state
4. Render SVG circles at hole positions with appropriate colors
5. Handle cases where simulation result is null or incomplete
6. Test with existing test circuit (resistor + LED + power supply)

### Phase 3: Current Animation Component
1. Create `src/ui-react/overlays/CurrentAnimation.tsx`
2. Query edge currents from controller state
3. Implement stroke dash offset animation (MVP approach)
4. Animate offset using CSS animation or `requestAnimationFrame`
5. Match animation direction to current flow direction
6. Test with circuit that has measurable current flow

### Phase 4: Error Overlay Component
1. Create `src/ui-react/overlays/ErrorOverlay.tsx`
2. Query simulation errors from controller state
3. Map error types to badge visuals (icon, color, position)
4. Implement click handler to show error details
5. Create minimal explain panel UI if needed
6. Test with circuits that produce errors (short circuit, floating nodes, etc.)

### Phase 5: Integration and Testing
1. Add overlay components to `BreadboardScene.tsx` layer hierarchy:
   ```
   <BreadboardSvg />           // Substrate (bottom)
   <VoltageOverlay />          // Voltage heatmap
   <ConnectionsLayer />        // Connections
   <ComponentsLayer />         // Components
   <CurrentAnimation />        // Current flow animation
   <ErrorOverlay />            // Error badges (top)
   <ReteGraphLayer />          // Rete nodes (overlay)
   ```
2. Add UI controls for toggling overlays (toolbar or keyboard shortcuts)
3. Verify overlays render correctly with pan/zoom
4. Test overlay performance (should not cause lag during simulation)
5. Compare visual output with PixiJS UI for parity verification

## Coordinate System Consistency

**Critical requirement:** All overlays MUST use the same coordinate system as breadboard substrate, components, and connections.

- Use `positionToPixels(position)` from `src/ui-react/geometry/breadboard-layout.ts` to convert grid positions to pixel coordinates
- Use 26px hole spacing (HOLE_SPACING constant)
- Apply LABEL_PADDING_X and LABEL_PADDING_Y offsets where appropriate
- Position overlays inside SVG coordinate space (not DOM overlay)
- Ensure overlays transform correctly with pan/zoom (viewBox-based)

## Simulation Integration

**Data sources:**
- `state.simulation.result`: Contains node voltages, edge currents, power dissipation
- `state.simulation.errors`: Contains simulation errors with location metadata
- Selectors from `src/ui-controller/selectors.ts`:
  - `getSimulationResult(state)`
  - `getNodeVoltage(state, nodeId)`
  - `getEdgeCurrent(state, edgeId)`
  - `getSimulationErrors(state)`
  - `isSimulationSuccessful(state)`

**Simulation lifecycle:**
1. User modifies circuit (add component, create connection, move component)
2. Controller dispatches appropriate action
3. `SimulationRunner` debounces and runs extraction + simulation
4. Controller receives `SIMULATION_COMPLETED` action with results
5. Overlay components rerender with new simulation data

**Important:** Overlays should handle null/missing simulation gracefully (don't crash if no simulation result).

## Performance Considerations

**Voltage overlay:**
- Render one SVG circle per hole (max 420 circles)
- Use SVG symbol reuse if many holes have same voltage
- Memoize color calculations
- Only render circles for holes that are part of connected nets

**Current animation:**
- Use CSS animations where possible (more performant than JS)
- If using `requestAnimationFrame`, ensure cleanup on unmount
- Only animate connections with non-negligible current
- Consider throttling animation updates if performance is an issue

**Error overlay:**
- Typically few errors (< 10 badges)
- Badges are static (no animation needed)
- Click handlers should be lightweight

## Testing Requirements

**Manual testing:**
1. Load React UI with `?react=true`
2. Create circuit: power supply → resistor → LED → ground
3. Verify voltage overlay shows correct voltages (5V at power, ~3V at LED, 0V at ground)
4. Verify current animation shows flow from power through components to ground
5. Create error: Remove ground connection (floating node)
6. Verify error badge appears and is clickable
7. Test overlay toggles (show/hide each overlay type)
8. Test pan/zoom (overlays should stay aligned)

**Unit tests (optional, can add if time permits):**
- Voltage → color mapping function
- Current magnitude → animation speed calculation
- Error type → badge style mapping

## Acceptance Criteria (from Review)

This task satisfies the following acceptance criteria from the review (lines 345-350):

✅ **Voltage overlay matches simulation node voltages** (line 346)
   - Overlay queries actual simulation results
   - Colors reflect computed voltages
   - Updates on simulation rerun

✅ **Current animation reflects `edgeCurrents` direction/magnitude** (line 347)
   - Animation queries actual edge currents
   - Direction matches current flow
   - Speed proportional to magnitude

✅ **Error badges clickable → explain panel** (line 348)
   - Badges are interactive SVG/HTML elements
   - Click handler triggers explain panel
   - Error details displayed to user

## Files to Create

**New files:**
- `src/ui-react/overlays/VoltageOverlay.tsx` (150-200 lines est.)
- `src/ui-react/overlays/CurrentAnimation.tsx` (100-150 lines est.)
- `src/ui-react/overlays/ErrorOverlay.tsx` (100-150 lines est.)
- Optional: `src/ui-react/overlays/ExplainPanel.tsx` (if doesn't exist)

**Modified files:**
- `src/ui-controller/types.ts` - Add overlay toggle state and actions
- `src/ui-controller/breadboard-controller.ts` - Handle overlay toggle actions
- `src/ui-controller/selectors.ts` - Add overlay state selectors (if needed)
- `src/ui-react/BreadboardScene.tsx` - Integrate overlay components
- `src/ui-react/App.tsx` - Add overlay toggle controls (optional)

**Files NOT to change:**
- All simulation logic (`src/core/**`) - Do not modify
- All component library (`src/library/**`) - Do not modify
- All PixiJS rendering (`src/ui/**`) - Do not modify (Milestone 7 will remove)

## Constraints

1. **Do not change simulation logic** - Overlays consume simulation output; they don't modify it
2. **Do not maintain legacy PixiJS code** - Focus on React/SVG implementation only
3. **Ensure all overlays can be toggled on/off** - User should control visibility
4. **Avoid performance regressions** - Overlays should not cause noticeable lag
5. **Use existing coordinate system helpers** - Don't create new coordinate mapping functions
6. **Follow React best practices** - Use hooks, memoization, pure components
7. **Do not leave comments on changes** - Code should be self-documenting

## Refactor Safety Rules

Since this task involves creating NEW components (not refactoring existing code), the standard refactor rules apply minimally. However:

1. If modifying existing components (e.g., ConnectionsLayer for current animation):
   - Make surgical changes (minimal diff)
   - Preserve existing behavior
   - Don't rewrite from scratch
2. When integrating into BreadboardScene:
   - Add new components to render tree
   - Don't restructure existing component hierarchy
3. When adding controller state:
   - Follow existing patterns (immutable updates, action types)
   - Don't refactor existing state domains

## Definition of Done

This milestone is complete when:

- ✅ Voltage overlay renders with colors matching simulation voltages
- ✅ Current animation shows flow direction and magnitude on connections
- ✅ Error badges appear for simulation errors and are clickable
- ✅ All overlays can be toggled on/off via UI controls
- ✅ Overlays stay aligned with breadboard during pan/zoom
- ✅ No performance regressions (overlays don't cause lag)
- ✅ React UI (`?react=true`) achieves visual parity with PixiJS UI for overlay features
- ✅ Manual testing confirms overlays work with test circuits
- ✅ Code follows existing patterns and style
- ✅ No simulation or PixiJS code modified

## Next Steps After Completion

After this milestone completes:
- **Milestone 7** can begin: Remove PixiJS entirely
- React UI will have full feature parity with PixiJS UI
- Feature flag can be removed and React UI becomes default
- Migration complete

## Notes

- **Animation consideration:** The review explicitly allows `requestAnimationFrame` in React (line 231): "still allowed; it's not WebGL"
- **Rete note:** This milestone does not involve Rete rendering (pure React/SVG overlays)
- **Explain panel:** If explain panel doesn't exist in React UI, create minimal version (can be enhanced later)
- **Color schemes:** Match existing PixiJS color scheme where possible for consistency
- **Accessibility:** Error badges should have ARIA labels or tooltips for screen readers
