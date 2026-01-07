Implement Rete.js Phase 3: Interactive Connection Creation with Drag-and-Drop Component Placement

---

## Context

The goal.md specification for the current iteration explicitly requires a **Rete.js-based visual programming graph** to act as the "interaction and connectivity backbone" (Section 2.1). While Phases 1 and 2 successfully established the architectural foundation and activated graph-based circuit extraction (USE_RETE=true), the system still lacks the **user-facing interactive features** that are central to the iteration's requirements.

**Current State:**
- ✅ Rete.js Phase 1 complete: ReteManager, node classes (ComponentNode, BreadboardHoleNode), socket types
- ✅ Rete.js Phase 2 complete: Graph-based circuit extraction active, full state synchronization, equivalence verified
- ❌ Rete.js Phase 3 NOT implemented: No interactive connection creation UI
- ❌ Component placement model misalignment: Current two-click placement contradicts goal.md Section 5.3.1

**Gap Analysis:**

The goal.md "Component Placement Model" (Section 5.3.1) explicitly states:

> "Selecting a component does **not** immediately place it on the breadboard. The component appears **adjacent to the board**, floating beside it. The user:
> 1. Drags the component body into position
> 2. Connects individual legs to breadboard holes"

The current system uses a two-click placement workflow where components are placed directly on the breadboard by clicking two holes. This violates the specified interaction model.

Additionally, goal.md Section 5.4 "Snapping and Constraints" requires:

> "Legs **magnetically snap** to free breadboard holes. A hole may only accept **one connector**. Invalid connections should be visually rejected with subtle feedback."

These capabilities exist at the data structure level (one-connector-per-hole constraint in Rete graph) but have no UI manifestation.

**Why This Is Critical:**

The iteration specification emphasizes "correct interaction primitives and mental models" as a priority (Section 1). The interactive connection model is not a cosmetic enhancement—it is a fundamental requirement that:

1. **Pedagogical clarity**: Separating component positioning from connection creation helps students understand the distinction between physical placement and electrical connectivity.
2. **Constraint visibility**: Making the one-connector-per-hole rule interactive and visual teaches breadboard limitations explicitly.
3. **Error prevention**: Visual feedback during connection attempts prevents invalid circuits before simulation.
4. **Architectural alignment**: Completes the Rete.js migration by surfacing the graph-based architecture in the UI.

---

## Objective

Implement Phase 3 of the Rete.js migration to enable **interactive drag-and-drop component placement with explicit leg-to-hole connection creation**.

This involves:

1. **Activating Rete ConnectionPlugin** for user-facing connection interaction
2. **Implementing the "floating component" placement model** (goal.md Section 5.3.1)
3. **Enabling drag-based connection creation** from component legs to breadboard holes
4. **Providing real-time visual feedback** for valid/invalid connection targets
5. **Enforcing one-connector-per-hole constraint** at interaction time with user-visible rejection

---

## Detailed Requirements

### 1. Component Instantiation Workflow

**Goal.md Section 5.3.1 specifies:**

When a user selects a component from the library:

1. Component appears **adjacent to the breadboard canvas**, not on it
   - Render component as a draggable Rete node
   - Position component in a "staging area" (e.g., left/right margin of canvas)
   - Component body is draggable
   - Component legs are visible as Rete output sockets (connectors)

2. User drags component body into desired position
   - Free-form positioning within canvas bounds
   - Component can be positioned anywhere, not restricted to grid
   - Drag uses Rete AreaPlugin pan/drag mechanics

3. User connects individual legs to breadboard holes
   - Drag from component leg (output socket) to breadboard hole (input socket)
   - Connection creation uses Rete ConnectionPlugin
   - Magnetic snapping: connection line snaps to hole when within threshold
   - Visual feedback during drag:
     - Valid target: hole highlights (green glow or border)
     - Invalid target: hole shows rejection indicator (red border or X icon)
     - Occupied hole: clear visual indication that hole is unavailable
   - Connection completes on mouse release over valid target

4. Invalid connections are rejected
   - Attempting to connect to occupied hole: connection fails, visual feedback shown
   - Attempting to connect leg that's already connected: previous connection removed or attempt blocked (UX decision needed)
   - Attempting invalid socket types: connection rejected (future Phase 4, but architecture should support)

**Rationale (from goal.md):** "This avoids visual occlusion and improves comprehension in dense circuits."

### 2. Breadboard Hole Representation

**Goal.md Section 3.1 and 5.4 specify:**

Breadboard holes must be interactive connection targets:

1. Each hole is a Rete node with exactly one input socket (holeSocket type)
   - This is already implemented in Phase 2 (BreadboardHoleNode)
   - Holes should be rendered visually in the Rete canvas at correct grid positions
   - Hole rendering should integrate with existing PixiJS breadboard grid rendering

2. Holes provide magnetic snapping behavior
   - When dragging a connection near a hole, visual feedback indicates snap target
   - Threshold distance for snapping: configurable (suggest 20-30 pixels)
   - Snapping should feel natural and predictable

3. Occupied holes reject new connections
   - Runtime validation during connection attempt
   - Visual feedback: hole shows "occupied" state (e.g., filled circle, different color)
   - Error message or tooltip: "This hole is already occupied"

### 3. Visual Feedback and Interaction States

**Goal.md Section 5.4 emphasizes "subtle feedback":**

1. **During connection drag:**
   - Connection line follows cursor with bezier curve
   - Line color: neutral (gray) until near valid target
   - Valid target hover: line turns green, target hole highlights
   - Invalid target hover: line turns red, target hole shows rejection indicator
   - Snap feedback: subtle animation or snap sound (optional)

2. **Component leg states:**
   - Unconnected leg: visible socket indicator (e.g., circle outline)
   - Connected leg: socket indicator filled or changed color
   - Hover state: socket enlarges or glows

3. **Breadboard hole states:**
   - Empty hole: default appearance (small circle)
   - Hover during connection drag (valid): green highlight or glow
   - Hover during connection drag (invalid): red border or X overlay
   - Occupied hole: filled appearance or different color
   - Hole with voltage overlay: integrate with existing voltage color system

4. **Component body states:**
   - Floating (not all legs connected): semi-transparent or dashed outline
   - Fully connected: solid appearance
   - Selected: highlight border (existing selection system)
   - Draggable: cursor changes to move cursor on hover

### 4. Integration with Existing Systems

**Critical integration points:**

1. **PixiJS Renderer Integration:**
   - Rete.js will manage logical graph and interaction
   - PixiJS will continue rendering visual elements
   - Challenge: Coordinate Rete node positions with PixiJS rendering
   - Solution options:
     - Option A: Render Rete nodes transparently, overlay PixiJS visuals
     - Option B: Use Rete positions to update PixiJS sprite positions in sync
     - Option C: Custom Rete renderer plugin that delegates to PixiJS
   - **Recommendation:** Option B for consistency (Rete as source of truth for positions)

2. **Circuit Extraction Pipeline:**
   - Already uses Rete graph when USE_RETE=true (Phase 2 complete)
   - No changes needed: connections in Rete graph automatically flow to circuit extractor
   - Validation: ensure circuit extraction works with partially connected components

3. **Component Library Browser:**
   - When user clicks component in library browser:
     - Close modal (existing behavior)
     - Create Rete ComponentNode at staging position (new)
     - Render component body with PixiJS at Rete node position (new)
     - Enter "connection mode" where user must connect legs (new)
   - Existing two-click placement workflow must be replaced or deprecated

4. **Selection and Manipulation:**
   - Component selection: clicking component body should select Rete node
   - Component deletion: Delete/Backspace should remove Rete node and connections
   - Component rotation: R key should rotate component within Rete node
     - Rotation should update leg socket positions relative to body
     - Connections should remain attached and re-route automatically
   - Component property editing: existing property editor should work unchanged

5. **Drag-and-Drop Repositioning:**
   - Existing drag-and-drop system (PR #185) must be adapted:
     - Old system: drag updates BreadboardState positions
     - New system: drag updates Rete node positions
     - Component body drag: updates only ComponentNode position, not connections
     - Connections should visually stretch/re-route when component moves
   - Test helpers (startDragComponent, moveDragTo, etc.) must be updated

6. **Voltage Overlays and Current Animation:**
   - Voltage colors on holes: integrate with hole rendering in Rete/PixiJS hybrid
   - Current animation on wires: connections in Rete graph represent wires
     - Animation should render along Rete connection paths
     - Use Rete connection geometry for particle trajectories

7. **Error Detection and Explain Panel:**
   - Error overlays on holes: position based on Rete BreadboardHoleNode coordinates
   - Explain panel: clicking holes or components should work with Rete nodes
     - Adapt click handlers to query Rete graph for node data

### 5. Rete.js Plugin Configuration

**Plugins to activate and configure:**

1. **rete-connection-plugin (already installed):**
   - Enable plugin in ReteManager
   - Configure socket compatibility:
     - legSocket (component leg output) can connect to holeSocket (hole input)
     - holeSocket cannot connect to holeSocket (no hole-to-hole wires)
   - Configure validation function:
     - Check if target hole is occupied
     - Check if target hole is within breadboard bounds
     - Check if connection would violate constraints
   - Configure visual feedback:
     - Custom connection rendering (integrate with PixiJS or use Rete SVG renderer)

2. **rete-area-plugin (already installed):**
   - Already initialized in Phase 1
   - Configure zoom limits (min/max zoom to keep breadboard readable)
   - Configure pan limits (keep breadboard in view)
   - Configure snap-to-grid for components (optional, may conflict with free positioning)

3. **Custom rendering plugin (may need to create):**
   - Rete.js default rendering is SVG-based
   - Breadboard Lab uses PixiJS for performance and visual quality
   - Options:
     - Create custom Rete rendering plugin that uses PixiJS
     - Use Rete's hidden/headless mode and manage rendering separately
     - Hybrid: Rete for connection lines (SVG), PixiJS for components/holes
   - **Recommendation:** Investigate rete-render-utils and rete's customization API

### 6. User Experience Considerations

**Critical UX decisions:**

1. **Component placement on library selection:**
   - Where does component appear initially?
     - Option A: Fixed staging area (left margin)
     - Option B: Near cursor position
     - Option C: Center of viewport
   - **Recommendation:** Option B (near cursor) for fastest workflow

2. **Partial vs full connection requirement:**
   - Can components exist with some legs unconnected?
     - Option A: Allow partial connections (user can leave legs unconnected)
     - Option B: Require all legs connected before component is "placed"
   - **Recommendation:** Option A (allow partial) for flexibility
     - Floating components with unconnected legs should have visual indicator

3. **Connection deletion and rework:**
   - How to remove an existing connection?
     - Option A: Click connection line, then Delete key
     - Option B: Drag leg away from hole to disconnect
     - Option C: Right-click connection for context menu
   - **Recommendation:** Option A (consistent with component deletion workflow)

4. **Multi-leg components and connection order:**
   - Must legs be connected in specific order?
     - Answer: No, user can connect in any order
   - Visual feedback for "which leg is which"?
     - Recommendation: Label legs or use color coding for polarity

5. **Undo/redo for connections:**
   - Should connection creation/deletion be undoable?
     - Answer: Yes, if undo/redo system exists (currently it doesn't)
     - Defer undo/redo implementation or add as part of this phase? (Suggest defer)

### 7. Testing Requirements

**Comprehensive test coverage:**

1. **Unit tests for ReteManager:**
   - Connection creation between ComponentNode and BreadboardHoleNode
   - Connection validation (occupied hole rejection)
   - Connection deletion
   - Multi-component connection scenarios

2. **Integration tests for component placement:**
   - Component appears adjacent on library selection
   - Component body drag updates Rete node position
   - Leg-to-hole connection creation flow
   - Invalid connection rejection (occupied hole)
   - Partially connected component state

3. **Visual regression tests:**
   - Screenshot of floating component with unconnected legs
   - Screenshot of connection drag with valid target highlight
   - Screenshot of connection drag with invalid target rejection
   - Screenshot of fully connected component

4. **User interaction tests (Playwright):**
   - Select component from library → component appears in staging area
   - Drag component body → component moves
   - Drag leg to hole → connection creates
   - Drag leg to occupied hole → connection rejects
   - Delete component → connections removed

5. **Equivalence validation:**
   - Circuits created with new interaction model should extract/simulate identically to Phase 2 equivalent
   - Test case: recreate existing example circuits using new workflow, verify identical simulation results

### 8. Rollback and Feature Flag

**Risk mitigation:**

Phase 3 is a significant UX change. To enable safe rollback:

1. **Feature flag:** Create `USE_RETE_INTERACTIVE` flag (separate from `USE_RETE` data structure flag)
   - When `USE_RETE_INTERACTIVE=false`: Keep current two-click placement (existing behavior)
   - When `USE_RETE_INTERACTIVE=true`: Enable new interactive connection workflow
   - Both modes should work with `USE_RETE=true` (graph-based extraction)

2. **Staged rollout:**
   - Phase 3a: Implement connection plugin integration, basic drag-and-drop (flag off)
   - Phase 3b: Enable flag for testing, collect feedback
   - Phase 3c: Enable flag by default after validation
   - Phase 3d: Remove flag and old code path after stable period

3. **Rollback procedure:**
   - If critical bugs found: set `USE_RETE_INTERACTIVE=false`
   - System reverts to two-click placement
   - Circuit loading must handle both connection models (already handled by circuit serializer)

### 9. Documentation Requirements

**User-facing documentation:**

1. **Update README.md:**
   - Add section: "Component Placement and Wiring"
   - Explain new workflow: select → position → connect
   - Animated GIF or screenshot showing connection drag

2. **In-app tutorial or tooltip:**
   - First-time user sees brief overlay explaining new workflow
   - "Drag components from the staging area, then connect legs to holes"

3. **Keyboard shortcuts guide:**
   - Update shortcuts documentation with connection-related actions

**Developer documentation:**

1. **Create RETE_MIGRATION_PHASE3_SUMMARY.md:**
   - Implementation details
   - Architecture decisions
   - Plugin configuration
   - Integration patterns
   - Test results
   - Performance analysis

2. **Update ARCHITECTURE.md:**
   - Add section on interactive connection model
   - Diagram showing Rete + PixiJS hybrid rendering
   - Data flow: user action → Rete graph update → circuit extraction → simulation → PixiJS rendering

3. **Code comments:**
   - Document key integration points
   - Explain custom Rete plugin logic
   - Note any workarounds or limitations

### 10. Performance Considerations

**Anticipated challenges:**

1. **Rendering performance:**
   - Rete.js + PixiJS hybrid rendering: ensure smooth 60fps interaction
   - Large circuits (20+ components, 100+ connections): test performance
   - Optimization: lazy rendering, viewport culling

2. **Connection validation:**
   - Real-time validation during drag: must be fast (<16ms per frame)
   - Solution: cache occupied hole set, use efficient lookup (Set or Map)

3. **Graph synchronization:**
   - Rete graph changes → circuit extraction → simulation: should remain fast
   - Current Phase 2 extraction is fast, should not degrade

4. **Event handling:**
   - Mouse/touch events: ensure Rete and PixiJS event systems don't conflict
   - Solution: Clear event ownership (Rete for connections, PixiJS for components/holes)

### 11. Acceptance Criteria

**Phase 3 is complete when:**

1. ✅ User can select component from library, component appears adjacent to canvas
2. ✅ User can drag component body to position it anywhere on canvas
3. ✅ User can drag from component leg to breadboard hole to create connection
4. ✅ Connection creation provides real-time visual feedback (valid/invalid targets)
5. ✅ Occupied holes reject new connections with clear visual/textual feedback
6. ✅ One-connector-per-hole constraint enforced at interaction time
7. ✅ Connections render correctly with voltage colors and current animation
8. ✅ Component rotation updates leg socket positions and re-routes connections
9. ✅ Component deletion removes all associated connections
10. ✅ Circuit extraction and simulation work identically to Phase 2 (equivalence maintained)
11. ✅ All existing tests pass (427 unit/integration + 8 visual = 435 tests)
12. ✅ New tests added: minimum 20 additional tests for connection interaction
13. ✅ Visual regression baselines updated for new interaction model
14. ✅ Documentation updated (README, ARCHITECTURE, Phase 3 summary)
15. ✅ Performance validated: smooth 60fps interaction with 20+ components

**Stretch goals (defer if needed):**

- ⏳ Wire re-routing with control points (goal.md Section 6.2)
- ⏳ Continuous component rotation (goal.md Section 7.2)
- ⏳ Visual rotation handle (goal.md Section 7.2)
- ⏳ Connection deletion via drag-away gesture
- ⏳ Undo/redo for connection operations

---

## Implementation Strategy

**Recommended phased approach:**

### Phase 3a: Rete Plugin Integration (1-2 days)

1. Enable ConnectionPlugin in ReteManager
2. Configure socket types and validation rules
3. Add connection event handlers (onCreate, onRemove)
4. Sync connection creation to BreadboardState (for backward compatibility)
5. Write unit tests for connection creation/deletion

**Deliverable:** Connections can be created programmatically via Rete API

### Phase 3b: Interactive Connection UI (2-3 days)

1. Implement drag-and-drop connection creation (drag from leg to hole)
2. Add visual feedback during drag (highlight valid/invalid targets)
3. Implement magnetic snapping to holes
4. Add occupied hole rejection with user feedback
5. Write integration tests for connection workflow

**Deliverable:** User can create connections via drag-and-drop

### Phase 3c: Component Placement Workflow (2-3 days)

1. Modify component library browser selection:
   - Create ComponentNode in staging area (not on board)
   - Render component at Rete node position
2. Enable component body drag (Rete AreaPlugin)
3. Integrate with PixiJS renderer:
   - Render component at Rete node position
   - Render legs as interactive sockets
4. Update selection/deletion/rotation to work with Rete nodes
5. Write integration tests for placement workflow

**Deliverable:** User can position components and connect legs

### Phase 3d: Visual Polish and Testing (1-2 days)

1. Visual feedback refinement:
   - Connection line rendering (bezier curves, colors)
   - Socket hover states
   - Hole states (empty, occupied, hover)
2. Error messaging and tooltips
3. Comprehensive integration testing
4. Visual regression baseline updates
5. Performance validation

**Deliverable:** Polished, tested Phase 3 implementation

### Phase 3e: Documentation and Rollout (1 day)

1. Write RETE_MIGRATION_PHASE3_SUMMARY.md
2. Update README.md and ARCHITECTURE.md
3. Create in-app tutorial or tooltip
4. Enable USE_RETE_INTERACTIVE flag by default
5. Monitor for issues, iterate as needed

**Deliverable:** Phase 3 complete, documented, and deployed

**Total estimated effort:** 7-11 days for a senior engineer

---

## Risks and Mitigation

**Risk 1: Rete + PixiJS rendering conflict**
- **Impact:** High (visual glitches, event conflicts)
- **Mitigation:** Early prototype of hybrid rendering, clear event ownership boundaries
- **Fallback:** Use Rete headless mode, manage all rendering via PixiJS

**Risk 2: Performance degradation**
- **Impact:** Medium (poor UX if laggy)
- **Mitigation:** Performance testing early, optimize rendering pipeline
- **Fallback:** Limit max components/connections, add performance warnings

**Risk 3: Breaking existing circuits**
- **Impact:** High (user data loss)
- **Mitigation:** Backward compatibility testing, circuit serializer supports both models
- **Fallback:** Feature flag allows rollback to old system

**Risk 4: UX confusion**
- **Impact:** Medium (users don't understand new workflow)
- **Mitigation:** In-app tutorial, clear visual feedback, user testing
- **Fallback:** Improve onboarding, add help tooltips

**Risk 5: Scope creep**
- **Impact:** Medium (delayed delivery)
- **Mitigation:** Strict scope definition, defer stretch goals
- **Fallback:** Ship minimal Phase 3, iterate in Phase 3.1

---

## Success Metrics

**How to measure completion:**

1. **Functional completeness:** All acceptance criteria met (15 items)
2. **Test coverage:** 435+ tests passing (100% pass rate maintained)
3. **Performance:** 60fps interaction in 20-component circuit
4. **Equivalence:** Circuits built with new UI simulate identically to old UI
5. **User validation:** Manual testing confirms workflow is intuitive

**Definition of done:**

- Code merged to main branch
- USE_RETE_INTERACTIVE=true by default
- Documentation complete
- All CI checks passing (unit tests + visual regression)
- Example circuits updated to demonstrate new workflow (optional)
- Phase 3 summary document created

---

## References

**Goal.md sections:**
- Section 1: Purpose of This Iteration
- Section 2: Architectural Change: PixiJS → Rete.js
- Section 3: Core Conceptual Model
- Section 5.3: Component Placement Model
- Section 5.4: Snapping and Constraints

**System documentation:**
- `/planning/vision/goal.md`: Current iteration specification
- `/planning/state/system_capabilities.md`: Current system state (Phase 2 complete)
- `RETE_MIGRATION_PHASE1_SUMMARY.md`: Phase 1 foundation
- `RETE_MIGRATION_PHASE2_SUMMARY.md`: Phase 2 graph activation
- `ARCHITECTURE.md`: System architecture overview

**Code locations:**
- `src/core/rete-manager.ts`: ReteManager class (Phase 1 & 2 implementation)
- `src/ui/breadboard-app.ts`: Main UI application (integration point)
- `src/ui/pixi-renderer.ts`: PixiJS renderer (rendering integration)
- `src/core/circuit-extractor.ts`: Circuit extraction (uses Rete graph when USE_RETE=true)

**Dependencies:**
- `rete@^2.0.6`: Core Rete.js framework
- `rete-area-plugin@^2.1.5`: Viewport management (pan, zoom, drag)
- `rete-connection-plugin@^2.0.5`: Connection creation UI (to be activated)
- `pixi.js@^8.6.6`: WebGL rendering library

---

## Next Steps for Implementing Engineer

1. **Review this task specification thoroughly**
   - Understand goal.md requirements
   - Review Phase 1 and Phase 2 implementation
   - Study Rete.js documentation (especially ConnectionPlugin API)

2. **Create a feature branch**
   - `git checkout -b rete/phase3-interactive-connections`

3. **Start with Phase 3a: Plugin integration**
   - Enable ConnectionPlugin in ReteManager
   - Write failing unit tests for connection creation
   - Implement connection creation logic
   - Make tests pass

4. **Proceed through phases sequentially**
   - Don't skip ahead
   - Validate each phase before moving to next
   - Write tests continuously

5. **Communicate progress regularly**
   - Use report_progress tool after each phase
   - Document blockers or design questions
   - Request code review at key milestones

6. **Final validation before PR**
   - All tests passing
   - Documentation complete
   - Example circuits work with new workflow
   - Performance validated
   - Self-review against acceptance criteria

---

## Questions for Clarification (if needed)

1. **Rendering approach:** Should we create a custom Rete renderer plugin that uses PixiJS, or use a hybrid approach (Rete for logic, PixiJS for visuals)?
   - **Recommendation:** Hybrid approach for fastest implementation

2. **Component staging area:** Where should components appear when selected from library (left margin, right margin, center, cursor position)?
   - **Recommendation:** Near cursor position for best UX

3. **Partial connections:** Should components with unconnected legs be allowed, or must all legs be connected?
   - **Recommendation:** Allow partial connections (more flexible)

4. **Connection deletion:** What gesture deletes connections (click + Delete key, drag away, right-click menu)?
   - **Recommendation:** Click + Delete key (consistent with component deletion)

5. **Feature flag timing:** When should USE_RETE_INTERACTIVE be enabled by default (after Phase 3d testing, or later)?
   - **Recommendation:** Enable after Phase 3d validation completes

6. **Stretch goals:** Should any stretch goals be included in Phase 3, or defer all to later?
   - **Recommendation:** Defer all stretch goals to avoid scope creep

---

## Conclusion

This task represents the **most critical missing capability** to fulfill the goal.md iteration specification. While Phases 1 and 2 successfully established the Rete.js architectural foundation, Phase 3 is necessary to deliver the **user-facing interactive connection model** that is explicitly required.

Implementing Phase 3 will:
- ✅ Align the system with goal.md Section 5.3 (Component Placement Model)
- ✅ Complete the "Rete.js as interaction backbone" architectural goal (Section 2)
- ✅ Enable explicit teaching of breadboard connectivity constraints (Section 5.4)
- ✅ Unblock future features (wire re-routing, continuous rotation, advanced constraints)

**This task is essential, well-scoped, and ready for implementation.**
