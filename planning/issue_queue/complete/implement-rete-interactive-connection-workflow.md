Implement Rete.js Interactive Connection Workflow (Phases 3b-3e)

## Executive Summary

This task implements the **core architectural change** specified in `/planning/vision/goal.md`: replacing the current two-click component placement system with a **Rete.js-based visual programming graph** that enables interactive, constraint-validated connection creation through drag-and-drop.

The goal explicitly requires:

> "Replace the current **PixiJS/WebGL bespoke wiring system** with a **Rete.js–based visual programming graph**."

And:

> "**Component Instantiation**: Selecting a component does **not** immediately place it on the breadboard. The component appears **adjacent to the board**, floating beside it. The user: 1. Drags the component body into position 2. Connects individual legs to breadboard holes"

The current system has completed Rete.js Phase 3a (connection events and validation infrastructure) but does **not** provide the interactive connection workflow that is the central requirement of the next iteration.

---

## Current State Analysis

### What Exists (Phase 3a Complete)

From `system_capabilities.md` and PR #231:

1. **ReteManager Infrastructure**:
   - Editor lifecycle management (initialization, cleanup)
   - Node classes (ComponentNode with leg sockets, BreadboardHoleNode with single output socket)
   - Socket types (legSocket for component legs, holeSocket for breadboard holes)
   - Full state synchronization from BreadboardState to Rete graph
   - Graph accessor methods (getConnections, getComponentNode, getHoleNode, etc.)
   - Circuit extraction from Rete graph (equivalence verified with position-based extraction)

2. **Connection Event System**:
   - Connection event handler registration (onConnectionCreated, onConnectionRemoved)
   - Connection validator registration and invocation pipeline
   - One-connector-per-hole validation with error messages
   - Occupancy detection API (isHoleOccupied)
   - Programmatic connection creation with validation (createConnection)

3. **Feature Flag**:
   - `USE_RETE_INTERACTIVE=false` (disabled by default)
   - Infrastructure exists but interactive features not yet active

4. **Test Coverage**:
   - 26 ReteManager unit tests (100% coverage of Phase 3a code)
   - All tests passing, zero breaking changes

### What Is Missing (Phases 3b-3e)

From `system_capabilities.md`:

> "**Future Phases:**
>
> Phase 3b-3e will complete interactive connection creation:
>
> - **Phase 3b (Visual Feedback):** Render holes as interactive PixiJS sprites, implement hover states, add connection line rendering, magnetic snapping
> - **Phase 3c (Component Placement):** Implement floating component model, enable component body drag, deprecate two-click placement
> - **Phase 3d (Connection Interaction):** Enable drag-from-leg-to-hole connections, sync to BreadboardState, connection deletion
> - **Phase 3e (Testing & Documentation):** Integration tests, visual regression updates, performance validation, documentation updates"

---

## Gap Analysis: Goal vs. Reality

### Goal Requirements (from `goal.md`)

**Section 5.3.1: Component Instantiation**

- Selecting a component does **not** immediately place it on breadboard
- Component appears **adjacent to the board**, floating beside it
- User drags component body into position
- User connects individual legs to breadboard holes
- **Rationale**: "This avoids visual occlusion and improves comprehension in dense circuits"

**Section 5.4: Snapping and Constraints**

- Legs **magnetically snap** to free breadboard holes
- A hole may only accept **one connector**
- Invalid connections should be visually rejected with subtle feedback

**Section 6.2: Wire Interaction**

- Wires are draggable via control points
- Re-routing must be supported (Rete re-root pattern)
- Dragging a segment recalculates the path
- Routing avoids component overlap where possible

**Section 7.2: Rotation**

- All components support **continuous rotation** (not limited to 90°)
- Rotation affects connector positions and snapping geometry

### Current Reality (from `system_capabilities.md`)

**Component Placement**:

- ❌ Two-click placement (click hole 1, click hole 2)
- ❌ Component immediately placed on breadboard
- ❌ No floating component model
- ❌ No individual leg-to-hole connection workflow

**Snapping and Constraints**:

- ❌ No interactive magnetic snapping (no drag-from-leg-to-hole)
- ✅ One-connector-per-hole validation exists (but only in programmatic API, not interactive)
- ❌ No visual feedback for invalid connections during drag

**Wire Interaction**:

- ❌ Wires cannot be dragged or re-routed
- ❌ No control points
- ❌ No Rete re-root pattern implementation

**Rotation**:

- ❌ Only 90° increments (0°, 90°, 180°, 270°)
- ❌ No continuous rotation

---

## Why This Is The Most Important Gap

### 1. Explicit Architectural Requirement

The goal's **first stated purpose** (Section 1) is:

> "1. Replace the current **PixiJS/WebGL bespoke wiring system** with a **Rete.js–based visual programming graph**."

This is not an optional enhancement—it's the **defining characteristic** of the next iteration.

### 2. Foundational for Other Features

The floating component model and interactive connections are **prerequisites** for:

- **X-Ray Mode** (Section 10): Requires clear distinction between physical placement and electrical connectivity—floating components make this conceptual separation tangible
- **Switches** (Section 8): Interactive state toggling depends on distinguishing click-to-toggle from click-to-drag, which requires the floating/connected component model
- **Wire re-routing** (Section 6): Cannot be implemented without interactive connection management
- **Continuous rotation** (Section 7.2): Rotation must update connector positions in real-time, which requires the Rete connector model to be user-facing

### 3. Educational Value Alignment

The goal emphasizes that this tool provides **capabilities impossible in physical hardware**. The floating component model is a prime example:

> "The component appears **adjacent to the board**, floating beside it... This avoids visual occlusion and improves comprehension in dense circuits."

This workflow teaches circuit topology conceptually (components connect to nets, not just physical holes) while maintaining spatial clarity.

### 4. Technical Debt Risk

The current two-click placement system is **incompatible** with the Rete.js architecture. Continuing to build features on the two-click model increases technical debt and makes the eventual migration harder.

Phase 3a completed the **infrastructure foundation**. If Phase 3b-3e is not implemented next, that foundation will remain unused and may decay or diverge from requirements.

---

## Detailed Requirements

### Phase 3b: Visual Feedback

#### 3b.1: Interactive Breadboard Holes

**Requirement**: Render breadboard holes as interactive PixiJS sprites that respond to hover and connection attempts.

**Implementation Details**:

- Modify `PixiRenderer.renderBreadboardSubstrate()` to create interactive Graphics objects for each hole
- Set `eventMode: 'static'` and `cursor: 'pointer'` on hole graphics
- Add pointer event handlers: `pointerover`, `pointerout`, `pointerdown`
- Store hole position metadata in Graphics object user data for event handling

**Visual Feedback States**:

1. **Default**: Standard hole rendering (metal contact with depth shadow)
2. **Hover**: Subtle highlight (glow effect or border)
3. **Occupied**: Visual indicator (already implemented via occupancy detection)
4. **Target (during drag)**: Stronger highlight when dragging a component leg over a valid hole
5. **Invalid (during drag)**: Red tint or error icon when attempting invalid connection

**Acceptance Criteria**:

- Hovering over a hole displays highlight effect
- Occupied holes show different visual state
- Hole events can be captured and propagated to BreadboardApp
- Performance: No frame rate degradation with 420 interactive holes

#### 3b.2: Connection Line Rendering

**Requirement**: Render Rete connections as visual lines between component legs and holes.

**Implementation Details**:

- Add `renderConnections()` method to `PixiRenderer`
- For each connection in Rete graph:
  - Get source position (component leg) and target position (hole)
  - Draw line using PixiJS Graphics API
  - Apply bezier curve for aesthetic routing (optional: orthogonal routing)
  - Color line based on simulation results (voltage color mapping)
- Render connections on separate layer (z-order: below components, above holes)

**Visual Characteristics**:

- Line width: 2-3px
- Line style: Bezier curve (prefer gentle arcs over sharp angles)
- Line color: Voltage-based gradient (0V blue → 5V red) or default gray if no simulation
- Line hover: Thicker stroke and tooltip showing connection details

**Acceptance Criteria**:

- All Rete connections render as visible lines
- Lines update when connections change
- Lines respect voltage coloring from simulation
- Lines are clickable for selection or deletion

#### 3b.3: Magnetic Snapping

**Requirement**: When dragging a component leg near a hole, visually indicate snap-to-hole behavior.

**Implementation Details**:

- During component drag (Phase 3c), calculate distance from each leg to nearest hole
- If distance < snap threshold (e.g., 15px), show snap preview:
  - Highlight target hole
  - Draw preview connection line
  - Snap component position to align leg with hole
- Use smooth interpolation (lerp) for snapping motion (avoid jarring jumps)

**Snapping Logic**:

- Snap threshold: 15-20px
- Snap priority: Nearest unoccupied hole
- Multi-leg components: All legs must snap to valid positions simultaneously
- Invalid snaps: Show visual rejection (red highlight, error icon)

**Acceptance Criteria**:

- Dragging component leg within 15px of hole shows snap preview
- Preview disappears when moving away
- Snap animation feels smooth and intuitive
- Invalid snaps are clearly distinguished from valid snaps

### Phase 3c: Component Placement

#### 3c.1: Floating Component Model

**Requirement**: When user selects a component from library, create a floating component that hovers adjacent to breadboard.

**Implementation Details**:

- Modify component selection workflow in `BreadboardApp`:
  1. User clicks component in library browser
  2. Create `FloatingComponent` instance (new type in types.ts)
  3. Position component at canvas edge (e.g., 50px right of breadboard)
  4. Render component at 70% opacity with "floating" visual indicator
  5. Component is not yet in `BreadboardState` (no circuit topology impact)
- Add `floatingComponent: FloatingComponent | null` state to `BreadboardApp`
- Render floating component in `PixiRenderer` on separate layer (above breadboard)

**FloatingComponent Type**:

```typescript
interface FloatingComponent {
  id: string;
  type: ComponentType;
  libraryId?: string;
  position: { x: number; y: number }; // Canvas coordinates, not grid
  rotation: number; // Continuous rotation in degrees
  properties: ComponentProperties;
}
```

**Visual Characteristics**:

- 70% opacity (semi-transparent)
- Positioned at canvas edge, not on breadboard
- Visual indicator: Dotted outline or "floating" shadow
- Component body is draggable (Phase 3c.2)

**Acceptance Criteria**:

- Selecting component from library creates floating component
- Floating component appears at canvas edge
- Floating component does not affect circuit simulation
- Only one floating component exists at a time

#### 3c.2: Component Body Drag

**Requirement**: User can drag floating component body to position it relative to breadboard before connecting legs.

**Implementation Details**:

- Add pointer event handlers to floating component Graphics:
  - `pointerdown`: Start drag operation
  - `pointermove` (on canvas): Update component position to follow cursor
  - `pointerup`: Complete drag (position component, do not auto-connect)
- During drag, show snap previews for all legs (Phase 3b.3)
- Allow free positioning (not constrained to grid until connection)
- Support continuous rotation during drag (rotate handle or R key)

**Drag Behavior**:

- Component follows cursor with slight offset (avoid cursor occlusion)
- Snap preview shows when legs align with holes
- Rotation handle visible and functional during drag
- Escape key cancels drag and returns component to edge

**Acceptance Criteria**:

- Floating component can be dragged smoothly
- Component follows cursor during drag
- Snap preview shows when legs align with holes
- Escape cancels drag operation

#### 3c.3: Deprecate Two-Click Placement

**Requirement**: Remove old two-click placement workflow and replace with floating component workflow.

**Implementation Details**:

- Remove `placementMode` state from `BreadboardApp`
- Remove two-click handlers (first click, second click)
- Update component placement logic to use floating component model
- Migration path for existing tests:
  - Keep `clickHole()` test API for backward compatibility
  - Add new `dragFloatingComponent()` test API for new workflow
- Update visual regression tests to use new workflow

**Transition Strategy**:

- Implement new workflow first (additive change)
- Run both workflows in parallel behind feature flag
- Validate new workflow with integration tests
- Remove old workflow once new workflow is stable
- Update all example circuits to work with new system

**Acceptance Criteria**:

- Two-click placement code removed from BreadboardApp
- All existing tests updated to use new workflow
- No regression in user experience (new workflow is equal or better)

### Phase 3d: Connection Interaction

#### 3d.1: Drag-from-Leg-to-Hole Connection Creation

**Requirement**: User can drag a connection from a component leg to a breadboard hole to create an electrical connection.

**Implementation Details**:

- Make component legs interactive (pointerdown on leg starts connection drag)
- During connection drag:
  1. Show preview line from leg to cursor
  2. Highlight valid target holes (unoccupied, within range)
  3. Show invalid state for occupied or out-of-range holes
  4. On pointerup over valid hole: Create connection via `ReteManager.createConnection()`
  5. On pointerup elsewhere: Cancel connection
- Connection creates both Rete graph edge and updates BreadboardState
- Trigger circuit re-extraction and simulation after connection

**Connection Drag Visual Feedback**:

- Preview line: Dashed line from leg to cursor
- Valid target: Green highlight on hole
- Invalid target: Red highlight and error message ("Hole occupied")
- Cursor changes: Pointer when over valid hole, not-allowed when over invalid

**Acceptance Criteria**:

- Dragging from component leg to hole creates connection
- Invalid connections are prevented with visual feedback
- Connections are immediately validated and rejected if invalid
- Circuit updates and simulates after connection creation

#### 3d.2: Sync Connections to BreadboardState

**Requirement**: When Rete connections are created/deleted interactively, update `BreadboardState` to reflect new topology.

**Implementation Details**:

- In `onConnectionCreated` handler:
  1. Extract connected hole positions from Rete graph
  2. Update `component.pos1` and `component.pos2` in BreadboardState
  3. If all required legs connected, move component from floating to placed
  4. Trigger circuit re-extraction and simulation
- In `onConnectionRemoved` handler:
  1. Update BreadboardState to remove deleted connection
  2. If component loses required connections, move back to floating state
  3. Trigger circuit re-extraction

**State Synchronization Logic**:

- Rete graph is source of truth for connectivity
- BreadboardState is derived from Rete graph
- Components transition: Floating → Partially Connected → Fully Connected
- Circuit extraction uses Rete graph (not BreadboardState positions)

**Acceptance Criteria**:

- Creating connection updates BreadboardState
- Component positions in BreadboardState match connected holes
- Circuit simulation reflects new connections immediately
- Deleting connection updates BreadboardState

#### 3d.3: Connection Deletion

**Requirement**: User can delete connections by clicking and pressing Delete, or by dragging one endpoint to disconnect.

**Implementation Details**:

- Click connection line to select it (visual highlight: thicker stroke, blue tint)
- Press Delete or Backspace to remove connection
- Alternative: Drag connection endpoint away to disconnect (drag-to-disconnect)
- Deletion triggers `onConnectionRemoved` handler
- Update BreadboardState and re-simulate

**Deletion Visual Feedback**:

- Selected connection: Thicker stroke with blue highlight
- Hover state: Cursor changes to pointer
- Delete confirmation: Connection fades out (200ms transition)
- Component updates: If all connections removed, component returns to floating state

**Acceptance Criteria**:

- Clicking connection selects it
- Delete key removes selected connection
- Drag-to-disconnect supported (optional alternative)
- Circuit updates after connection deletion

### Phase 3e: Testing & Documentation

#### 3e.1: Integration Tests

**Requirement**: Comprehensive test coverage for new interactive connection workflow.

**Test Scenarios**:

1. **Floating Component Creation**:
   - Select component from library → floating component appears
   - Only one floating component at a time
   - Floating component does not affect circuit
2. **Component Drag**:
   - Drag floating component around canvas
   - Snap preview appears when legs align
   - Escape cancels drag
3. **Connection Creation**:
   - Drag from leg to hole creates connection
   - Invalid connections rejected (hole occupied)
   - Circuit simulates after connection
4. **Connection Deletion**:
   - Click connection to select
   - Delete key removes connection
   - Circuit updates after deletion
5. **Multi-Component Circuits**:
   - Place 3+ components with connections
   - Verify circuit extraction correctness
   - Verify simulation results match expected
6. **Interaction Edge Cases**:
   - Drag outside canvas bounds
   - Double-click on hole
   - Rapid connection creation/deletion
   - Undo during drag operation

**Test Implementation**:

- Add test helpers: `dragFloatingComponent()`, `dragConnection()`, `clickConnection()`
- Use Vitest for unit/integration tests
- Use Playwright for visual regression tests
- Verify Rete graph state matches BreadboardState

**Acceptance Criteria**:

- 30+ new integration tests covering all interaction scenarios
- All tests passing (100% pass rate maintained)
- No performance regressions (frame rate ≥ 60fps)

#### 3e.2: Visual Regression Updates

**Requirement**: Update visual regression baselines to reflect new rendering.

**Tasks**:

- Regenerate baseline screenshots for all 4 example circuits
- Add new visual tests for:
  - Floating component rendering
  - Connection line rendering
  - Snap preview states
  - Invalid connection feedback
- Verify voltage overlays still work with connection lines
- Verify current animation compatibility

**Acceptance Criteria**:

- All 7 visual regression tests pass
- New baselines committed to repository
- Visual quality maintained or improved

#### 3e.3: Performance Validation

**Requirement**: Verify no performance degradation from interactive rendering.

**Performance Tests**:

1. **Hole Interactivity**: 420 interactive holes at 60fps
2. **Connection Rendering**: 20+ connections render smoothly
3. **Drag Responsiveness**: Component follows cursor with <16ms latency
4. **Simulation Impact**: Circuit re-extraction completes in <100ms

**Profiling**:

- Use browser DevTools Performance tab
- Measure frame time during drag operations
- Identify bottlenecks and optimize

**Acceptance Criteria**:

- Frame rate ≥ 60fps during all interactions
- No jank or stuttering during drag
- Memory usage stable (no leaks)

#### 3e.4: Documentation Updates

**Requirement**: Document new workflow for users and developers.

**User Documentation** (`README.md`):

- Update "Component Placement" section with new workflow:
  1. Click component in library
  2. Drag component to desired position
  3. Drag from component legs to holes to create connections
  4. Component is placed when all required legs connected
- Add section on connection management (create, delete, reconnect)
- Update screenshots/GIFs to show new workflow

**Developer Documentation**:

- Update `ARCHITECTURE.md` with Rete.js interaction architecture
- Document FloatingComponent type and state transitions
- Document connection event handlers and validation
- Add sequence diagrams for:
  - Component placement workflow
  - Connection creation workflow
  - State synchronization (Rete → BreadboardState)

**Implementation Summary**:

- Create `RETE_MIGRATION_PHASE3_COMPLETE.md`
- Document design decisions and tradeoffs
- Include performance measurements
- Provide migration guide for contributors

**Acceptance Criteria**:

- README.md updated with new workflow
- ARCHITECTURE.md includes Rete.js interaction architecture
- Implementation summary document created
- All code comments accurate and up-to-date

---

## Implementation Strategy

### Phased Rollout with Feature Flag

**Phase 3b**: Enable `USE_RETE_INTERACTIVE=true`, implement visual feedback only (no behavior change)
**Phase 3c**: Add floating component model and drag, keep old placement behind fallback
**Phase 3d**: Enable connection drag, fully deprecate two-click placement
**Phase 3e**: Stabilize, test, document

### Compatibility & Migration

**Backward Compatibility**:

- Keep `USE_RETE_INTERACTIVE=false` fallback during development
- Existing saved circuits load correctly
- Test API maintains compatibility (`clickHole()` maps to new workflow)

**Breaking Changes**:

- Two-click placement removed (by design—this is the goal)
- Users must adapt to new workflow (provide tutorial or onboarding)

### Risk Mitigation

**Risk**: Performance degradation with 420 interactive holes  
**Mitigation**: Profile early, optimize event handlers, use event delegation if needed

**Risk**: Complexity of multi-leg component snapping  
**Mitigation**: Start with 2-pin components, generalize to N-pin after validation

**Risk**: User confusion with new workflow  
**Mitigation**: In-app tutorial, example circuit demonstrating new workflow, clear visual affordances

**Risk**: Test infrastructure brittle with new interaction model  
**Mitigation**: Invest in robust test helpers, separate unit tests from integration tests

---

## Success Criteria

### Functional Requirements

- ✅ User can select component from library and see floating component
- ✅ User can drag floating component to position it
- ✅ User can drag from component leg to hole to create connection
- ✅ Invalid connections are prevented with visual feedback
- ✅ User can delete connections by selecting and pressing Delete
- ✅ Circuit extracts and simulates correctly with new topology
- ✅ Component rotation works continuously (not limited to 90°)

### Non-Functional Requirements

- ✅ Frame rate ≥ 60fps during all interactions
- ✅ No visual regressions (visual tests pass)
- ✅ Test coverage ≥ 95% for new code
- ✅ Zero breaking changes to simulation engine
- ✅ Backward compatible with existing saved circuits

### User Experience Requirements

- ✅ Workflow feels intuitive and natural
- ✅ Visual feedback is clear and unambiguous
- ✅ Error messages are helpful and actionable
- ✅ Example circuits demonstrate new workflow effectively

---

## Estimated Scope

**Code Changes**:

- `src/core/types.ts`: +50 lines (FloatingComponent, connection drag state types)
- `src/core/rete-manager.ts`: +150 lines (interactive connection APIs)
- `src/ui/pixi-renderer.ts`: +300 lines (hole interactivity, connection rendering, snap preview)
- `src/ui/breadboard-app.ts`: +400 lines (floating component state, connection drag handlers, deprecate old placement), -200 lines (remove two-click placement)
- Total: ~700 net new lines (excluding tests and docs)

**Tests**:

- 30+ new integration tests
- 5+ new visual regression tests
- Test helper utilities: ~100 lines

**Documentation**:

- `README.md`: Update user-facing instructions
- `ARCHITECTURE.md`: Document Rete.js interaction architecture
- `RETE_MIGRATION_PHASE3_COMPLETE.md`: Implementation summary (~500 lines)

**Timeline Estimate**:

- Phase 3b (Visual Feedback): 2-3 days
- Phase 3c (Component Placement): 2-3 days
- Phase 3d (Connection Interaction): 3-4 days
- Phase 3e (Testing & Documentation): 2-3 days
- **Total**: 9-13 days of focused development

---

## Dependencies

**Prerequisites** (Already Complete):

- ✅ Rete.js Phase 1 (foundation, nodes, sockets)
- ✅ Rete.js Phase 2 (state sync, circuit extraction)
- ✅ Rete.js Phase 3a (event handlers, validation)
- ✅ PixiJS rendering infrastructure (PR #167, #203)
- ✅ Component library with 36 components
- ✅ Circuit simulator with voltage/current calculation

**Blockers**:

- None identified

**Future Dependencies** (Enabled by This Task):

- Wire re-routing (Section 6.2 of goal.md)
- Continuous rotation (Section 7.2 of goal.md)
- X-Ray Mode (Section 10 of goal.md)
- Switch interaction improvements (Section 8 of goal.md)

---

## Alignment with Goal.md

This task directly implements the **primary objective** stated in goal.md Section 1:

> "1. Replace the current **PixiJS/WebGL bespoke wiring system** with a **Rete.js–based visual programming graph**."

It enables the **core interaction model** described in Section 5.3.1:

> "Selecting a component does **not** immediately place it on the breadboard. The component appears **adjacent to the board**, floating beside it. The user: 1. Drags the component body into position 2. Connects individual legs to breadboard holes"

It provides the **foundation** for all subsequent features in the goal:

- Snapping and constraints (Section 5.4)
- Wire interaction (Section 6.2)
- Continuous rotation (Section 7.2)
- Switch interaction (Section 8)
- X-Ray Mode (Section 10)

---

## References

**Planning Documents**:

- `/planning/vision/goal.md`: Target state specification (Rete.js migration iteration)
- `/planning/state/system_capabilities.md`: Current state (Phase 3a complete, Phase 3b-3e not started)

**Implementation Summaries**:

- `RETE_MIGRATION_PHASE1_SUMMARY.md`: Foundation (nodes, sockets, editor lifecycle)
- `RETE_MIGRATION_PHASE2_SUMMARY.md`: State sync and circuit extraction
- `RETE_MIGRATION_PHASE3_SUMMARY.md`: Event handlers and validation (Phase 3a only)

**Codebase**:

- `src/core/rete-manager.ts`: Rete.js integration layer (Phase 3a APIs ready)
- `src/ui/pixi-renderer.ts`: PixiJS rendering (needs hole interactivity, connection rendering)
- `src/ui/breadboard-app.ts`: Main app (needs floating component state, connection drag handlers)

**Tests**:

- `src/core/__tests__/rete-manager.test.ts`: ReteManager unit tests (26 tests, all passing)
- `src/ui/__tests__/breadboard-app.test.ts`: BreadboardApp integration tests (25 tests, will need updates)

---

## Conclusion

This task is the **single most important development step** to achieve alignment with the target state specified in `goal.md`. It implements the core architectural change that defines the next iteration: replacing two-click placement with Rete.js-based interactive connection creation.

Without this task, the Rete.js infrastructure (Phases 1-3a) remains unused, and the system cannot progress toward the educational and interaction improvements described in the goal. All subsequent features (wire re-routing, continuous rotation, X-Ray Mode, switch interaction improvements) depend on this foundation.

The implementation is well-scoped, testable, and follows the established phase-by-phase rollout pattern. The infrastructure is already in place (Phase 3a complete), and the next step is to make it user-facing through interactive visual feedback and connection creation workflows.
