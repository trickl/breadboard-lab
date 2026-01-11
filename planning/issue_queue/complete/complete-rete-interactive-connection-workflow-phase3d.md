Complete Rete.js Interactive Connection Workflow (Phase 3d)

## Context

The goal.md document specifies that this iteration must "Replace the current PixiJS/WebGL bespoke wiring system with a Rete.js–based visual programming graph" (Section 2.1). The specified interaction model requires that:

1. **Selecting a component does NOT immediately place it on the breadboard** (Section 5.3.1)
2. **The component appears adjacent to the board, floating beside it** (Section 5.3.1)
3. **The user drags the component body into position** (Section 5.3.1)
4. **The user connects individual legs to breadboard holes** (Section 5.3.1)

Currently, system_capabilities.md explicitly documents that this interaction model is **not yet implemented** (lines 3310-3312):

> - ❌ Floating component drag handling (component appears but user cannot drag it yet) — Phase 3d
> - ❌ Interactive connection creation (drag-from-leg-to-hole) — Phase 3d
> - ❌ BreadboardState synchronization on connection events — Phase 3d

The system currently uses a legacy two-click placement model (click hole 1, click hole 2) which does NOT match the goal.md specification. PR #237 laid the foundational infrastructure (Phase 3b-3c), but the actual user-facing interaction workflow remains incomplete.

## Gap Analysis

**Target State (goal.md):**

- Component selection spawns a floating component adjacent to the breadboard
- User can drag the floating component body around the canvas
- User drags from component legs to breadboard holes to create connections
- Invalid connections are visually rejected with feedback
- Legs magnetically snap to free breadboard holes
- A hole may only accept one connector (one-connector-per-hole constraint enforced during interaction)

**Current State (system_capabilities.md):**

- Component selection immediately enters two-click placement mode
- User clicks hole 1, then hole 2 to place component
- No floating component interaction exists
- No drag-from-leg-to-hole connection creation exists
- One-connector-per-hole constraint exists in data model but is not enforced during interactive placement
- Rete.js infrastructure exists (Phase 1-3c) but USE_RETE_INTERACTIVE flag is disabled

**The Gap:**
The core interaction primitive specified in goal.md is not operational. This is the foundational user experience requirement for the Rete.js migration iteration. Without this, the system does not satisfy the target state's primary architectural goal.

## Task Specification

Implement the complete interactive connection workflow (Rete.js Phase 3d) that enables the goal.md-specified interaction model.

### Acceptance Criteria

#### 1. Floating Component Drag Handling

**When:** User selects a component from the library (via component library browser)

**Then:**

- Component appears as a FloatingComponent at the canvas edge (already implemented in PR #237)
- Component is immediately draggable (NOT YET IMPLEMENTED)
- User can click and drag the component body to any position on canvas
- Component follows mouse cursor during drag with smooth motion
- Component visual feedback: 70% opacity with "Drag to place" label visible
- Component supports continuous rotation during floating state (infrastructure exists, interaction needed)
  - Mouse wheel or dedicated rotation gesture rotates component while floating
  - Rotation updates in real-time during interaction
- Dragging does not create connections; it only positions the component body
- Component can be dragged anywhere on canvas, not constrained to grid

**Visual feedback:**

- Component body renders with semi-transparent appearance
- Legs (connectors) render at correct positions relative to body center
- Rotation handle or visual indicator shows current orientation
- Component follows mouse smoothly (60fps target)

**Implementation notes:**

- Extend existing FloatingComponent infrastructure from PR #237
- Hook into PixiJS event system for pointerdown/pointermove/pointerup on floating component
- Update floating component position on every mousemove event
- Use existing `renderFloatingComponent()` method, no new rendering code needed
- Continuous rotation can be triggered by mouse wheel events on floating component

#### 2. Interactive Connection Creation (Drag from Leg to Hole)

**When:** User has a floating component on canvas

**Then:**

- User can initiate a connection drag from any component leg (connector)
- Dragging from leg to breadboard hole creates a connection
- Connection is validated against one-connector-per-hole constraint
- Valid connections snap to target hole with visual feedback (green highlight)
- Invalid connections are rejected with visual feedback (red glow, error message)
- Successfully connected legs transition from floating state to placed state

**Interaction flow:**

1. **Initiate connection drag:**
   - User pointerdown on component leg (connector node in Rete graph)
   - Visual feedback: connection line starts rendering from leg position to cursor
   - Leg position is locked relative to component body (leg does not move independently)

2. **During drag:**
   - Connection line renders as bezier curve from leg to cursor position (already implemented in PR #237)
   - Holes highlight on hover to indicate possible targets
   - Occupied holes show "occupied" indicator (red X or similar)
   - Free holes show "available" indicator (green dot or similar)
   - Current validation status shown via connection line color:
     - Gray: no target hole hovered
     - Green: valid target hole hovered (free, correct component leg)
     - Red: invalid target hole hovered (occupied or constraint violation)

3. **Complete connection:**
   - User releases pointer over valid target hole
   - Connection is created in Rete graph
   - Connection line transitions to solid rendering
   - Leg is now "placed" (no longer in floating state for that leg)
   - Component remains floating until all required legs are connected OR user explicitly places it

4. **Reject invalid connection:**
   - User releases pointer over invalid target hole
   - Connection line disappears (no connection created)
   - Error message displayed briefly near cursor: "Hole occupied" or "Invalid connection"
   - Component remains floating, user can retry

**Multi-leg components:**

- Components with multiple legs (resistor: 2, LED: 2, EDU-8: 16) require all legs connected before component is fully placed
- Alternatively, implement partial placement: component becomes "placed" after first leg connection, remaining legs can be connected subsequently
- Goal.md does not specify; recommend full-placement-on-all-connections for consistency with goal's "connect individual legs" language

**Validation rules enforced during interaction:**

- One-connector-per-hole constraint (use existing `isHoleOccupied()` from Phase 3a)
- Target hole must be within breadboard bounds
- Component leg and breadboard hole must be compatible socket types (use Rete socket system)

**Implementation notes:**

- Use existing Rete connection drag infrastructure from rete-connection-plugin
- Hook into Rete connection events (onConnectionCreated) already set up in Phase 3a
- Use existing connection validator from Phase 3a for runtime validation
- Extend PixiJS hole hover effects (already implemented in PR #237) to show occupancy status
- Use existing `createConnection()` method from ReteManager (Phase 3a)

#### 3. BreadboardState Synchronization on Connection Events

**When:** User successfully creates a connection via drag-from-leg-to-hole interaction

**Then:**

- Connection is created in Rete graph (already handled by Rete.js)
- BreadboardState is updated to reflect the new connection
- If component is now fully connected (all legs placed):
  - Component transitions from FloatingComponent to placed Component in BreadboardState
  - Component appears in breadboard components array
  - Component is added to circuit extraction
  - Simulation runs automatically
  - Visual overlays update (voltage heatmap, current animation)

**Synchronization flow:**

1. **Connection created event fires** (Rete.js event, handler already registered in Phase 3a)
2. **Event handler extracts connection data:**
   - Source: component ID and leg index
   - Target: breadboard hole position (row, column)
3. **Update BreadboardState:**
   - If this is the first leg connection: create Component record in state
   - If this is a subsequent leg connection: update existing Component record
   - Map leg index to breadboard position in Component.positions array
4. **Check if component is fully placed:**
   - For 2-pin components: both legs connected
   - For multi-pin components (EDU-8): all 16 pins connected (or implement partial placement strategy)
5. **If fully placed:**
   - Remove from floating components array
   - Add to placed components array
   - Component rendering transitions from floating (70% opacity) to placed (100% opacity)
   - Trigger circuit extraction and simulation
6. **If partially placed:**
   - Keep in floating components array but mark legs as "placed"
   - User can continue connecting remaining legs

**Connection removal:**

- When user deletes a connection (future Phase 3e task), reverse synchronization:
  - Remove position mapping from BreadboardState Component
  - If component becomes partially placed, optionally transition back to floating state
  - Re-run circuit extraction and simulation

**Implementation notes:**

- Extend `onConnectionCreated` handler in BreadboardApp (already exists from Phase 3a setup)
- Use existing `syncFromBreadboardState()` method to maintain Rete graph consistency
- Reuse existing circuit extraction and simulation pipeline
- No changes to core simulation logic needed
- Component rendering already handles floating vs placed states (PR #237)

#### 4. Enable USE_RETE_INTERACTIVE Feature Flag

**When:** Phase 3d implementation is complete and tested

**Then:**

- Set `USE_RETE_INTERACTIVE = true` in BreadboardApp
- Default interaction model switches from two-click placement to floating component workflow
- Legacy two-click placement code can be deprecated (but retain for reference)

**Backward compatibility:**

- Existing saved circuits (from two-click era) must load correctly
- Circuit extraction works identically for both interaction models (already verified in Phase 2)
- All 441 existing tests must pass

#### 5. User Experience Refinements

**Escape key behavior:**

- Pressing Escape while dragging floating component cancels placement
- Component disappears from canvas
- No state changes occur

**Right-click context menu (optional enhancement):**

- Right-click on floating component shows: "Rotate", "Cancel Placement"
- Right-click on placed component shows existing context menu if any

**Visual clarity:**

- Floating components render above placed components (z-order)
- Connection lines render below components but above breadboard
- Cursor changes to indicate drag states:
  - "grab" cursor when hovering floating component body
  - "crosshair" cursor when dragging from leg
  - "pointer" cursor when hovering valid target hole
  - "not-allowed" cursor when hovering invalid target hole

**Touch support considerations:**

- Touch-and-hold on floating component initiates drag
- Touch-and-hold on leg initiates connection drag
- Single-finger drag moves component or connection line
- Two-finger pinch-to-zoom and pan remain functional

#### 6. Testing Requirements

**Unit tests:**

- Floating component drag state management
- Connection creation validation (one-connector-per-hole)
- BreadboardState synchronization on connection events
- Partial vs full component placement logic

**Integration tests:**

- End-to-end workflow: select component → drag floating → connect legs → verify placed
- Multi-leg component placement (resistor, LED, EDU-8)
- Connection rejection scenarios (occupied hole, invalid hole)
- Circuit extraction equivalence: interactive placement produces same circuit as two-click

**Visual regression tests:**

- Update existing Playwright tests to use new interaction model
- Verify floating component rendering
- Verify connection line rendering during drag
- Verify hover effects and validation feedback

**Manual testing:**

- Load each example circuit, verify simulation correctness
- Place each component type (resistor, LED, power supply, wire, ground, microprocessor)
- Test edge cases: component drag off canvas, rapid clicking, connection cancellation
- Verify performance: 60fps rendering with 5+ floating components

## Implementation Strategy

### Phase 3d Substeps

This task is large and should be broken into incremental substeps:

**3d.1: Floating Component Drag**

- Implement pointerdown/pointermove/pointerup handlers for floating component body
- Update FloatingComponent position state on drag
- Add Escape key cancellation
- Test: Drag floating component around canvas smoothly

**3d.2: Connection Line Rendering During Drag**

- Extend existing connection rendering to support in-progress connections
- Render bezier curve from leg to cursor during drag
- Implement hover effects on target holes
- Test: Visual connection line follows cursor, holes highlight on hover

**3d.3: Connection Validation and Creation**

- Implement pointerdown on leg to initiate connection drag
- Implement validation on pointerup over hole (use existing `isHoleOccupied()`)
- Call `createConnection()` on valid drop
- Display error message on invalid drop
- Test: Valid connections create, invalid connections reject with feedback

**3d.4: BreadboardState Synchronization**

- Extend `onConnectionCreated` handler to update BreadboardState
- Implement fully-placed vs partially-placed logic
- Transition component from floating to placed when all legs connected
- Trigger circuit extraction and simulation on full placement
- Test: Placed components appear in circuit simulation correctly

**3d.5: Enable Feature Flag and Integration Testing**

- Set USE_RETE_INTERACTIVE = true
- Update or disable affected unit tests (10 tests fail with flag enabled, per PR #237)
- Update visual regression test baselines
- Perform manual testing of all example circuits
- Test: All 441+ tests pass with new interaction model

### Code Locations

**Files to modify:**

- `src/ui/breadboard-app.ts`: Add event handlers for floating component drag and connection creation
- `src/ui/pixi-renderer.ts`: Extend connection rendering for in-progress connections, add hover feedback on holes
- `src/core/rete-manager.ts`: No changes needed (APIs already exist)
- `src/core/types.ts`: Potentially add `isFullyPlaced` flag to FloatingComponent or Component

**Files to review:**

- PR #237 implementation: Understand existing floating component infrastructure
- PR #231 implementation (Phase 3a): Understand existing connection validation and event handling
- goal.md sections 5.3, 5.4, 6.2: Verify all interaction requirements met

### Risks and Mitigations

**Risk 1: Performance degradation with many floating components**

- Mitigation: Limit to 1-3 floating components at a time, or implement object pooling

**Risk 2: Complex multi-leg component placement UX**

- Mitigation: Start with 2-pin components (resistor, LED), then extend to EDU-8 (16 pins)

**Risk 3: Touch interaction conflicts with zoom/pan**

- Mitigation: Use touch-and-hold with delay to disambiguate drag vs pan gestures

**Risk 4: Existing tests may be tightly coupled to two-click model**

- Mitigation: PR #237 noted 10 tests fail with USE_RETE_INTERACTIVE=true; update these tests to use new interaction API

## Success Metrics

**Functional completeness:**

- [ ] User can select component from library and it appears floating
- [ ] User can drag floating component body around canvas
- [ ] User can drag from component leg to breadboard hole to create connection
- [ ] Invalid connections are rejected with clear visual feedback
- [ ] Valid connections snap to holes with magnetic effect
- [ ] Component becomes fully placed when all legs connected
- [ ] Circuit extraction and simulation work correctly with new placement model
- [ ] USE_RETE_INTERACTIVE flag can be enabled with zero breaking changes

**Quality metrics:**

- [ ] All existing unit tests pass (441+ tests)
- [ ] Visual regression tests updated and passing
- [ ] No performance degradation (60fps maintained)
- [ ] No accessibility regressions (keyboard navigation still works)

**User experience validation:**

- [ ] First-time users can place a component without instructions (< 30 seconds)
- [ ] Floating component drag feels responsive and intuitive
- [ ] Connection creation feels precise and predictable
- [ ] Error feedback is clear and actionable

## Related Work

**Depends on:**

- PR #237 (Phase 3b-3c): Floating component infrastructure, hole hover effects, connection rendering
- PR #231 (Phase 3a): Connection event handling, validation infrastructure

**Enables:**

- Phase 3e: Test infrastructure updates for new interaction model
- Future: Wire re-routing (drag control points on existing connections)
- Future: Connection deletion UI
- Future: Multi-select and bulk operations on floating/placed components

**Deferred to future tasks:**

- Continuous rotation interaction (mouse wheel on floating component)
- Right-click context menus
- Wire re-routing (Section 6.2 of goal.md)
- Switch components (Section 8 of goal.md)
- Electrical View Mode toggle (Section 9 of goal.md)
- X-Ray Mode toggle (Section 10 of goal.md)

## Educational Impact

Completing this task directly serves the goal.md's stated purpose of improving "first-time user experience so the tool is immediately understandable and usable" (Section 1, Goal 3).

The floating component interaction model:

- **Reduces cognitive load**: User sees the component before placing it
- **Improves spatial reasoning**: User can position component body before committing to pin placement
- **Teaches physical reality**: Mimics how real breadboard prototyping works (place component, insert legs)
- **Provides feedback loops**: Invalid connections are rejected immediately, not after-the-fact

This is a foundational UX improvement that unlocks the educational value of the tool by making the interaction model intuitive and error-resistant.

## Definition of Done

This task is complete when:

1. User can select a component from library and it appears floating adjacent to breadboard
2. User can drag the floating component body to any position on canvas
3. User can drag from component leg to breadboard hole to create a connection
4. Invalid connections are rejected with visual feedback (occupied hole, error message)
5. Valid connections create successfully and snap to target hole
6. Component becomes "placed" when all legs are connected
7. BreadboardState updates correctly on each connection creation
8. Circuit extraction and simulation produce correct results for interactively placed components
9. USE_RETE_INTERACTIVE flag is enabled by default
10. All 441+ existing tests pass with new interaction model
11. Visual regression tests updated and passing
12. Manual testing confirms: all 4 example circuits load and simulate correctly
13. Manual testing confirms: all 6 component types (resistor, LED, wire, power supply, ground, microprocessor) can be placed via new interaction model
14. No performance regressions (60fps maintained)
15. Keyboard shortcuts (Escape to cancel) work correctly
16. Documentation updated: README.md explains new interaction model

When all 16 criteria are met, the Rete.js interactive connection workflow (Phase 3d) is complete and the system satisfies the core interaction requirement specified in goal.md Section 5.3.1.
