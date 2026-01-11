Activate Rete.js Phase 2: Graph-Based Connection Management and Circuit Extraction

---

## Context and Rationale

The system has successfully completed Rete.js Phase 1 (PR #219), which established the architectural foundation for graph-based interaction. However, **the Rete.js integration is not yet active** (`USE_RETE = false`). The current breadboard operates entirely through position-based component placement and circuit extraction, with no graph-based connection management.

The **explicit goal** defined in `/planning/vision/goal.md` (Section 2: "Architectural Change: PixiJS → Rete.js") states that this iteration's primary objective is to replace the current bespoke wiring system with a Rete.js-based visual programming graph. This architectural change is the foundational requirement that unlocks all other capabilities described in the goal document.

**Critical Gap Identified:**
The target state (goal.md) requires Rete.js to act as the "interaction and connectivity backbone," but the current system (system_capabilities.md, PR #219 section) explicitly states:

- "Feature flag disabled (USE_RETE=false) - no user-facing changes"
- "Connection creation UI not yet implemented"
- "Circuit extraction from Rete graph not yet active"
- "One-connector-per-hole constraint not yet enforced"

This task addresses the **most fundamental deficiency** preventing full alignment with the target state: activating the Rete.js integration so the system operates on graph-based connectivity rather than position-based inference.

---

## Objective

Enable Rete.js Phase 2 by activating the graph-based connection management system and migrating circuit extraction to use the Rete graph as the source of truth for electrical connectivity. This represents the architectural pivot described in goal.md Section 2.

**Success Criteria:**

1. `USE_RETE` feature flag set to `true` and all existing functionality preserved
2. Breadboard holes represented as Rete nodes with connection capability
3. Component legs represented as Rete connectors (sockets) with snapping and constraint enforcement
4. Wires represented as Rete connections (edges) between holes
5. Circuit extraction reads topology from Rete graph instead of position arrays
6. One-connector-per-hole constraint actively enforced by Rete socket system
7. All existing tests pass (422+ tests maintain 100% pass rate)
8. All example circuits continue to function identically
9. Visual appearance unchanged (PixiJS continues rendering, Rete manages graph only)

---

## Current State Assessment

**What Exists (Phase 1 Foundation):**

- `ReteManager` class with editor lifecycle management (`src/core/rete-manager.ts`, 256 lines)
- `ComponentNode` and `BreadboardHoleNode` Rete node classes with socket types
- `legSocket` and `holeSocket` definitions for component-to-hole connections
- `syncFromBreadboardState()` stub creates nodes but not connections
- `syncToBreadboardState()` stub returns null (not implemented)
- Feature flag infrastructure in `BreadboardApp` (`USE_RETE = false`)
- `initializeReteIntegration()` method creates hidden Rete container
- 12 ReteManager unit tests covering node creation and initialization
- Zero breaking changes to existing functionality

**What Must Be Built (Phase 2):**

1. **Full bidirectional state synchronization:**
   - `syncFromBreadboardState()` must create Rete connections (edges) between component legs and holes
   - `syncToBreadboardState()` must extract component topology from Rete graph
   - Handle rotation: update connector positions when components rotate
   - Handle deletion: remove Rete nodes when components deleted

2. **Connection constraint enforcement:**
   - One-connector-per-hole validation via Rete socket system
   - Reject invalid connections (hole already occupied)
   - Visual feedback for valid/invalid connection attempts

3. **Circuit extraction migration:**
   - `CircuitExtractor` must read from Rete graph instead of position arrays
   - New method: `extractCircuitFromReteGraph(reteManager)` → `Circuit`
   - Map Rete connections to circuit edges
   - Preserve existing breadboard internal connectivity (terminal strips, rails)
   - Maintain backward compatibility for position-based fallback

4. **Connection UI integration:**
   - Enable Rete ConnectionPlugin for interactive wire creation
   - Drag from hole to hole creates Rete connection
   - Visual feedback during drag (valid targets highlighted)
   - Connection rendering via PixiJS (not Rete's default renderer)

5. **Testing:**
   - Extend ReteManager tests to cover connection creation/removal
   - Test bidirectional sync with rotations and deletions
   - Test circuit extraction from Rete graph produces identical results
   - Test constraint enforcement (one-connector-per-hole)
   - Integration tests verifying end-to-end workflow (place component → connect legs → extract circuit → simulate)

---

## Architectural Design

**Hybrid Architecture (Established in Phase 1):**

- **Rete.js**: Manages connection graph logic (nodes, sockets, edges, constraints)
- **PixiJS**: Continues rendering all visuals (breadboard, components, overlays)
- **ReteManager**: Coordinates bidirectional state synchronization

**Data Flow (After Phase 2):**

**Component Placement Flow:**

```
User clicks library component
  → BreadboardApp creates AnyComponent with positions
  → syncStateToRete() creates ComponentNode with leg sockets
  → Waits for user to connect legs to holes
```

**Connection Creation Flow:**

```
User drags from component leg socket
  → Rete ConnectionPlugin validates target hole
  → Check: Is hole socket already connected? (one-per-hole)
  → If valid: Create Rete connection edge
  → syncToBreadboardState() extracts updated topology
  → CircuitExtractor reads from Rete graph
  → CircuitSimulator runs with new netlist
  → PixiJS re-renders with voltage overlays
```

**Circuit Extraction Flow (New):**

```
extractCircuitFromReteGraph(reteManager)
  1. Get all Rete connections (edges)
  2. For each connection:
     - Identify connected hole positions
     - Map holes to breadboard positions
  3. Apply breadboard internal connectivity (strips/rails)
  4. Run union-find to group electrical nodes
  5. Create circuit edges from components spanning nodes
  6. Return Circuit object
```

**State Synchronization:**

- **Rete → Breadboard:** Extract component positions and connections
- **Breadboard → Rete:** Update node positions and create connections
- **Trigger points:** Component placement, connection creation, rotation, deletion
- **Consistency:** Rete graph is source of truth for connections, position arrays for component metadata

---

## Implementation Plan

**Phase 2.1: Full State Synchronization (Foundation)**

1. **Implement `syncFromBreadboardState()` connection creation:**
   - For each component, create connections from leg sockets to hole nodes
   - Use component position arrays to determine which holes are connected
   - Handle rotation: calculate rotated leg positions and connect to correct holes
   - Store connection references in ReteManager state

2. **Implement `syncToBreadboardState()` extraction:**
   - Read all Rete nodes and connections
   - Reconstruct component position arrays from connected holes
   - Extract wire endpoints from hole-to-hole connections
   - Return updated `AnyComponent[]` array

3. **Test bidirectional roundtrip:**
   - BreadboardState → Rete → BreadboardState preserves all data
   - Test with rotations, multiple components, complex wiring
   - Verify no data loss or corruption

**Phase 2.2: Circuit Extraction Migration (Critical Path)**

1. **Implement `extractCircuitFromReteGraph()`:**
   - New method in `CircuitExtractor` class
   - Read Rete connections to identify hole-to-hole electrical paths
   - Apply breadboard internal connectivity (terminal strips, rails)
   - Use union-find to group nodes
   - Create circuit edges from components

2. **Update `BreadboardApp` to use Rete-based extraction:**
   - When `USE_RETE = true`, call `extractCircuitFromReteGraph()` instead of position-based extraction
   - When `USE_RETE = false`, fallback to existing `extractCircuit()` method
   - Ensure simulation results identical for same circuit topology

3. **Test circuit extraction equivalence:**
   - For each example circuit, verify Rete-based extraction produces identical netlist
   - Compare node counts, edge counts, connectivity
   - Verify simulation results match exactly (voltages, currents)

**Phase 2.3: Connection UI and Constraint Enforcement (User-Facing)**

1. **Enable Rete ConnectionPlugin in ReteManager:**
   - Initialize connection plugin with socket validation
   - Configure drag-and-drop behavior for connections
   - Add custom validation: one-connector-per-hole check

2. **Implement socket constraint validation:**
   - Before creating connection, check if target hole socket already has connection
   - If occupied, reject connection and show visual feedback
   - If free, allow connection and update Rete graph

3. **Integrate connection UI with PixiJS rendering:**
   - Rete handles connection logic (validation, storage)
   - PixiJS continues rendering wires visually
   - Sync Rete connection state to PixiJS wire rendering

4. **Visual feedback during connection creation:**
   - Highlight valid target holes (green glow)
   - Highlight invalid holes (red glow or disabled state)
   - Show connection preview during drag
   - Snap to target hole when close enough

**Phase 2.4: Activation and Integration Testing**

1. **Set `USE_RETE = true` in BreadboardApp:**
   - Enable Rete integration for all users
   - Remove feature flag guards (or prepare for gradual rollout)

2. **Run full test suite:**
   - All 422+ existing tests must pass
   - Add new tests for Rete-specific functionality
   - Target: 100% pass rate maintained

3. **Manual verification:**
   - Load each example circuit (LED+resistor, voltage divider, parallel LEDs, short circuit, EDU-8 blink)
   - Verify visual appearance unchanged
   - Verify simulation results unchanged
   - Verify voltage overlays, current animation, error detection all functional
   - Test component placement → connection → simulation workflow
   - Test component rotation updates connections correctly
   - Test component deletion removes connections correctly

4. **Performance verification:**
   - Measure render time, simulation time with Rete active
   - Ensure no performance regressions (maintain 60fps rendering)
   - Profile connection creation for responsiveness

---

## Technical Challenges and Mitigations

**Challenge 1: Maintaining Backward Compatibility**

The system has 422 passing tests that assume position-based component placement. Rete-based extraction must produce identical circuits.

**Mitigation:**

- Implement Rete extraction alongside position-based extraction (dual-path)
- Feature flag allows gradual migration and easy rollback
- Extensive testing comparing both extraction methods
- Golden test circuits with known-good netlists

**Challenge 2: Breadboard Internal Connectivity**

Breadboard holes within the same terminal strip or rail are internally connected. Rete connections represent explicit wires, but internal connectivity is implicit.

**Mitigation:**

- Circuit extraction must apply breadboard topology rules after reading Rete graph
- BreadboardLayout.getConnectedPositions() used to expand electrical nets
- Union-find algorithm groups nodes considering both Rete connections AND internal connectivity
- Document this explicitly in circuit extractor comments

**Challenge 3: Component Rotation Updates**

When a component rotates, its leg positions change, requiring Rete connections to update to different hole nodes.

**Mitigation:**

- On rotation, delete existing leg-to-hole connections
- Recalculate rotated leg positions
- Create new connections to newly occupied holes
- Validate new connections don't violate one-per-hole constraint
- If validation fails, reject rotation (existing behavior)

**Challenge 4: Visual Rendering Coordination**

PixiJS renders breadboard visuals, but Rete manages connection graph. Keeping them synchronized requires careful coordination.

**Mitigation:**

- Rete graph is source of truth for connectivity
- PixiJS reads from Rete graph to render wires
- Sync triggered after every Rete graph mutation
- ReteManager provides accessor methods for rendering system

**Challenge 5: One-Connector-Per-Hole Enforcement**

Current system allows multiple component legs to share a hole (they're automatically electrically connected). Rete socket system must enforce exactly one connection per hole.

**Mitigation:**

- Hole nodes have single output socket (inherently enforces one connection)
- Before creating connection, check socket.connections.length
- If socket already connected, reject new connection
- Visual feedback guides user to free holes
- Document this as architectural constraint in code comments

---

## Testing Strategy

**Unit Tests (Extend existing ReteManager test suite):**

1. **Connection Creation Tests:**
   - `syncFromBreadboardState()` creates correct connections for simple component
   - `syncFromBreadboardState()` creates correct connections for rotated component
   - `syncFromBreadboardState()` creates correct connections for multi-component circuit
   - `syncFromBreadboardState()` handles wires as hole-to-hole connections

2. **Connection Extraction Tests:**
   - `syncToBreadboardState()` extracts component positions from Rete graph
   - `syncToBreadboardState()` handles missing connections gracefully
   - `syncToBreadboardState()` preserves component metadata (resistance, voltage, etc.)

3. **Bidirectional Sync Tests:**
   - Roundtrip: BreadboardState → Rete → BreadboardState preserves all data
   - Roundtrip with rotation: Positions update correctly
   - Roundtrip with deletion: Components removed from both systems

4. **Circuit Extraction Tests:**
   - `extractCircuitFromReteGraph()` produces identical circuit to position-based extraction
   - Netlist node count matches expected value
   - Netlist edge count matches expected value
   - Connectivity preserves electrical equivalence

5. **Constraint Enforcement Tests:**
   - Attempting to connect two legs to same hole fails
   - Valid connections succeed
   - Socket validation rejects invalid targets

**Integration Tests (Add to breadboard-app.test.ts):**

1. **End-to-End Workflow Tests:**
   - Place component → verify Rete node created
   - Connect legs to holes → verify Rete connections created
   - Extract circuit → verify netlist correct
   - Simulate circuit → verify voltages/currents correct

2. **Rotation Integration Tests:**
   - Rotate component → verify Rete connections update
   - Verify circuit simulation still correct after rotation

3. **Deletion Integration Tests:**
   - Delete component → verify Rete nodes removed
   - Delete component → verify Rete connections removed
   - Verify circuit extraction handles deleted components

**Visual Regression Tests (Extend examples.spec.ts):**

1. **Example Circuit Tests with Rete Active:**
   - Load LED+resistor example → verify visual appearance unchanged
   - Load voltage divider example → verify simulation results match baseline
   - Load parallel LEDs example → verify voltage overlays render correctly
   - Load short circuit example → verify error detection unchanged
   - Load EDU-8 blink example → verify clock control UI functional

2. **Screenshot Comparison:**
   - Capture baseline screenshots with `USE_RETE = false`
   - Capture comparison screenshots with `USE_RETE = true`
   - Verify pixel-perfect match (or within tolerance)

**Performance Tests (Manual):**

1. **Render Performance:**
   - Measure FPS with Rete active vs inactive
   - Target: maintain 60fps rendering
   - Profile PixiJS render loop, Rete sync overhead

2. **Simulation Performance:**
   - Measure circuit extraction time with Rete vs position-based
   - Target: no more than 10% performance regression
   - Profile bottlenecks and optimize critical paths

---

## Success Metrics

**Quantitative Metrics:**

1. **Test Pass Rate:** 100% (all 422+ tests passing with `USE_RETE = true`)
2. **New Test Coverage:** At least 30 new tests for Rete Phase 2 functionality
3. **Circuit Extraction Equivalence:** 100% match for all example circuits (node count, edge count, connectivity)
4. **Simulation Result Equivalence:** 100% match for all example circuits (voltage values within 0.1% tolerance)
5. **Performance Regression:** Less than 10% increase in render time or simulation time
6. **Frame Rate:** Maintain 60fps rendering in all example circuits

**Qualitative Metrics:**

1. **User Experience Unchanged:** Existing workflows (place, rotate, delete, simulate) function identically
2. **Visual Appearance Unchanged:** Screenshot comparison shows no visual regressions
3. **Error Detection Unchanged:** All 5 error types still detected correctly
4. **Constraint Enforcement Active:** One-connector-per-hole prevents invalid connections
5. **Code Quality:** Rete integration well-documented, modular, testable
6. **Maintainability:** Clear separation between Rete (connectivity) and PixiJS (rendering)

**Acceptance Criteria (Gate Criteria for PR Approval):**

1. ✅ `USE_RETE = true` in BreadboardApp
2. ✅ All 422+ existing tests passing
3. ✅ At least 30 new tests for Phase 2 functionality
4. ✅ All 5 example circuits load and function identically
5. ✅ Circuit extraction from Rete graph produces identical netlists
6. ✅ Simulation results match position-based extraction exactly
7. ✅ One-connector-per-hole constraint actively enforced
8. ✅ Visual regression tests pass (screenshot comparison within tolerance)
9. ✅ Performance regression less than 10%
10. ✅ Code reviewed and approved by maintainer

---

## Documentation Requirements

**Code Documentation:**

1. **ReteManager.ts:**
   - Document `syncFromBreadboardState()` algorithm and edge cases
   - Document `syncToBreadboardState()` extraction logic
   - Add JSDoc comments for all public methods
   - Explain socket system and constraint enforcement

2. **circuit-extractor.ts:**
   - Document `extractCircuitFromReteGraph()` algorithm
   - Explain how breadboard internal connectivity is applied
   - Add examples of Rete graph → Circuit conversion
   - Document differences from position-based extraction

3. **breadboard-app.ts:**
   - Document Rete integration points
   - Explain when/how Rete sync is triggered
   - Document feature flag behavior (if retained)

**Architecture Documentation:**

1. **ARCHITECTURE.md:**
   - Update "Rete.js Integration" section with Phase 2 details
   - Add data flow diagrams showing Rete ↔ BreadboardState ↔ Circuit ↔ Simulation
   - Document constraint system (one-connector-per-hole)
   - Explain hybrid rendering architecture

2. **RETE_MIGRATION_PHASE2_SUMMARY.md (new file):**
   - Summarize Phase 2 implementation
   - List new capabilities enabled
   - Document breaking changes (if any)
   - Provide migration guide for future developers

3. **README.md:**
   - Update "How It Works" section to mention Rete.js
   - Add note about graph-based connection management
   - Update architecture diagram (if present)

**Testing Documentation:**

1. **Test README (src/core/**tests**/README.md or similar):**
   - Document Rete-specific testing strategies
   - Explain circuit extraction equivalence testing
   - Provide examples of integration tests

---

## Dependencies and Prerequisites

**Technical Prerequisites:**

- ✅ Rete.js dependencies already installed (rete@^2.0.6, plugins)
- ✅ ReteManager Phase 1 foundation complete (PR #219)
- ✅ PixiJS rendering system stable and performant (PR #167, PR #203)
- ✅ Circuit extraction and simulation systems functional
- ✅ All 422 tests passing at 100% rate

**Knowledge Prerequisites:**

- Understanding of Rete.js node-edge graph model
- Understanding of socket-based connection validation
- Understanding of breadboard internal connectivity rules
- Understanding of circuit extraction via union-find algorithm
- Understanding of PixiJS rendering pipeline

**No External Blockers:**

- No dependencies on upstream library changes
- No dependencies on other in-flight PRs
- Can begin implementation immediately

---

## Risk Assessment

**Technical Risks:**

1. **Risk: Rete extraction produces different netlists than position-based extraction**
   - Impact: High (breaks simulation correctness)
   - Probability: Medium (complex logic, edge cases)
   - Mitigation: Extensive testing, side-by-side comparison, golden tests

2. **Risk: Performance regression from Rete sync overhead**
   - Impact: Medium (degrades user experience)
   - Probability: Low (Rete designed for performance)
   - Mitigation: Profiling, optimization, sync only on mutation

3. **Risk: One-connector-per-hole constraint breaks existing circuits**
   - Impact: High (breaking change to existing functionality)
   - Probability: Low (current system avoids sharing holes)
   - Mitigation: Analyze existing circuits, provide migration path if needed

4. **Risk: Bidirectional sync introduces state inconsistencies**
   - Impact: High (corrupts circuit state)
   - Probability: Medium (complex state management)
   - Mitigation: Clear ownership model (Rete is source of truth), extensive testing

**Process Risks:**

1. **Risk: Large PR size makes review difficult**
   - Impact: Medium (delays merge, increases error risk)
   - Probability: High (Phase 2 is substantial work)
   - Mitigation: Break into sub-PRs (sync implementation, extraction migration, UI integration)

2. **Risk: Visual regression test baselines need regeneration**
   - Impact: Low (one-time cost)
   - Probability: Medium (rendering may have subtle changes)
   - Mitigation: Careful baseline review, document expected changes

**Rollback Plan:**

If critical issues arise:

1. Set `USE_RETE = false` to disable Rete integration
2. Revert to position-based circuit extraction
3. All existing functionality restored immediately
4. Feature flag allows safe rollback without code revert

---

## Future Capabilities Enabled by Phase 2

Completing Phase 2 unlocks the architectural capabilities required for subsequent features described in goal.md:

**Phase 3 (Continuous Rotation):**

- Rete connections can update dynamically as components rotate continuously
- No longer constrained to 90° increments

**Phase 4 (Wire Re-Routing):**

- Rete connections can be reparented (drag endpoint to new hole)
- Control points can be added for custom wire paths

**Phase 5 (Component Instantiation Model):**

- Components can be created as disconnected Rete nodes
- User explicitly connects legs to holes via Rete UI
- No longer requires immediate two-click placement

**Phase 6 (Advanced Constraints):**

- Socket types can enforce electrical compatibility (e.g., power vs signal)
- Connection validation can reject incompatible connections

**Phase 7 (Graph-Based Analysis):**

- Rete graph can be analyzed for circuit patterns
- Enable smarter error detection and suggestions

All of these depend on Phase 2 establishing Rete as the active connection management system.

---

## Estimated Effort

**Development Time:**

- Phase 2.1 (State Sync): 3-5 days
- Phase 2.2 (Circuit Extraction): 2-3 days
- Phase 2.3 (Connection UI): 3-4 days
- Phase 2.4 (Testing/Integration): 2-3 days
- Total: 10-15 days (2-3 weeks)

**Testing Time:**

- Unit test development: 2-3 days
- Integration test development: 2-3 days
- Manual verification: 1-2 days
- Total: 5-8 days (1 week)

**Documentation Time:**

- Code documentation: 1 day
- Architecture documentation: 1-2 days
- Testing documentation: 1 day
- Total: 3-4 days

**Overall Estimate:** 18-27 days (3.5-5.5 weeks)

**Critical Path:** Circuit extraction migration (Phase 2.2) is the bottleneck. All other work depends on correct extraction logic.

---

## References

**Planning Documents:**

- `/planning/vision/goal.md` (Section 2: Architectural Change, Section 3: Core Conceptual Model)
- `/planning/state/system_capabilities.md` (Rete.js Phase 1 Implementation section)
- `/planning/issue_queue/complete/migrate-from-pixijs-to-retejs-architecture.md` (Phase 1 task)

**Implementation:**

- `src/core/rete-manager.ts` (256 lines, Phase 1 foundation)
- `src/core/circuit-extractor.ts` (175 lines, position-based extraction)
- `src/ui/breadboard-app.ts` (2403 lines, Rete integration points)

**Tests:**

- `src/core/__tests__/rete-manager.test.ts` (12 tests, Phase 1 coverage)
- `src/core/__tests__/circuit-extractor.test.ts` (6 tests, position-based extraction)
- `src/ui/__tests__/breadboard-app.test.ts` (25 tests, app integration)

**Dependencies:**

- Rete.js documentation: https://rete.js.org/
- Rete ConnectionPlugin docs: https://rete.js.org/docs/plugins/connection-plugin

---

## Summary

This task activates the Rete.js Phase 2 integration, completing the architectural migration described in goal.md Section 2. It transforms the system from position-based component placement to graph-based connection management, enabling:

1. **One-connector-per-hole constraint enforcement** (explicit goal.md requirement)
2. **Circuit extraction from explicit connections** (not inferred from positions)
3. **Foundation for continuous rotation** (goal.md Section 7.2 requirement)
4. **Foundation for wire re-routing** (goal.md Section 6.2 requirement)
5. **Foundation for component instantiation model** (goal.md Section 5.3.1 requirement)

**This is the most critical next step** because all other Rete.js-dependent features in goal.md require the graph-based connection system to be active and functioning correctly. Without Phase 2, the system cannot progress toward the full vision defined in the goal document.

**Success State:** `USE_RETE = true`, all tests passing, circuit extraction from Rete graph produces identical results to position-based extraction, and the system operates on graph-based connectivity as the source of truth for electrical topology.
