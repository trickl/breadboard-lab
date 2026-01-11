Implement Wire Re-routing via Draggable Control Points

## Context and Rationale

The current implementation of Breadboard Lab has completed Phase 3e of the Rete.js migration (PR #249), establishing interactive component placement with floating components and leg-to-hole connection creation. However, **wire re-routing capability** — a core interaction primitive explicitly required by `goal.md` Section 6.2 — remains unimplemented.

This represents a critical gap between the target state and current capabilities. Section 6.2 states:

> **6.2 Wire Interaction**
>
> - Wires are draggable via control points.
> - **Re-routing must be supported** (Rete re-root pattern):
>   - Dragging a segment recalculates the path
>   - Routing avoids component overlap where possible

Additionally, Section 1 establishes that "This iteration prioritises **correct interaction primitives and mental models**", making wire re-routing a foundational capability, not an optional enhancement.

### Why This is Critical

1. **Pedagogical Value**: Students learning electronics frequently need to reorganize circuits as they experiment. Wire re-routing enables non-destructive circuit refinement — users can improve layout clarity without deleting and recreating connections.

2. **Interaction Model Completeness**: The Rete.js architecture was specifically chosen to support connection manipulation (per Section 2.1 rationale: "Support for **re-routing**, **animated edges**, and **custom socket logic**"). Without re-routing, a core architectural benefit remains unrealized.

3. **Prevents Layout Lock-In**: Currently, once a wire is placed, it can only be deleted and re-created. This creates friction in iterative design workflows and discourages experimentation.

4. **Goal.md Compliance**: This is not a "nice-to-have" feature. Section 6.2 uses prescriptive language ("must be supported") and explicitly references the Rete re-root pattern as the implementation approach.

---

## Current State Assessment

### What Exists

From `system_capabilities.md` (verified as of PR #249):

- **Rete.js graph architecture** is fully operational with `USE_RETE_INTERACTIVE=true`
- **Connection creation** works via drag-from-leg-to-hole interaction (Phase 3d, PR #243)
- **Connection representation** exists in Rete graph as edges between ComponentNodes and BreadboardHoleNodes
- **Connection rendering** infrastructure exists in PixiRenderer with bezier curves (PR #237)
- **One-connector-per-hole constraint** is enforced with validation (Phase 3a, PR #231)
- **Connection event handlers** (`onConnectionCreated`, `onConnectionRemoved`) are implemented (Phase 3a, PR #231)

### What is Missing

1. **No connection selection mechanism**: Users cannot select an existing wire/connection
2. **No connection modification UI**: No draggable control points or handles on connection paths
3. **No Rete re-root API integration**: Rete.js `Connection.removeEnd()` / `Connection.addEnd()` methods not utilized
4. **No validation during re-routing**: Moving a connection endpoint must respect hole occupancy constraints
5. **No visual feedback for re-routing**: Ghost preview or drag-in-progress state not implemented for connections

### Architectural Foundation

The Rete.js Phase 3 implementation provides the necessary foundation:

- **ReteManager** (`src/core/rete-manager.ts`) manages the Rete graph with connection accessor methods (`getConnections()`)
- **Connection validation pipeline** exists via `validateConnection()` and `isHoleOccupied()` (Phase 3a)
- **BreadboardState synchronization** occurs on connection events (Phase 3d, PR #243)
- **PixiRenderer** renders connections as bezier curves with voltage-based coloring

However, the connection objects are currently **write-only** after creation: they can be created and removed, but never modified in place.

---

## Proposed Solution: Wire Re-routing Implementation

### High-Level Design

Implement wire re-routing as a **connection endpoint modification workflow** using Rete.js connection manipulation APIs and PixiJS interaction events.

This approach:

- Leverages existing Rete connection validation pipeline
- Maintains one-connector-per-hole constraint enforcement
- Provides immediate visual feedback during drag operations
- Integrates with existing command pattern for undo/redo support

---

## Implementation Phases

### Phase 1: Connection Selection (Foundation)

**Goal**: Enable users to select an existing wire/connection by clicking it.

**Required Changes**:

1. **PixiRenderer Enhancement** (`src/ui/pixi-renderer.ts`):
   - Add `interactive: true` to connection Graphics objects
   - Implement `pointerdown` handler on connection paths
   - Emit `onConnectionClick` event with connection ID

2. **BreadboardApp Integration** (`src/ui/breadboard-app.ts`):
   - Add `selectedConnectionId` to application state
   - Implement `handleConnectionClick()` method
   - Render visual selection feedback (highlighted wire, thicker stroke, glow effect)
   - Clear connection selection when background or component clicked

3. **State Management**:
   - Add `selectedConnectionId: string | null` to BreadboardApp state
   - Ensure component selection and connection selection are mutually exclusive
   - Update Explain panel to show connection/net information when connection selected

**Acceptance Criteria**:

- [ ] Clicking a wire selects it (visual feedback: blue glow or increased stroke width)
- [ ] Clicking another wire switches selection
- [ ] Clicking background or component deselects wire
- [ ] Selected wire ID is tracked in application state
- [ ] Explain panel displays connection information (net ID, voltage, component endpoints)

---

### Phase 2: Connection Endpoint Dragging (Core Re-routing)

**Goal**: Enable dragging either endpoint of a selected connection to a different hole.

**Required Changes**:

1. **Endpoint Hit Testing** (`src/ui/pixi-renderer.ts`):
   - Render interactive "handle" Graphics at both ends of selected connection
   - Handles should be circular (radius ~8-10px) positioned at connection endpoints
   - Add `pointerdown` handlers to endpoint handles
   - Determine which end (source or target) is being dragged

2. **Drag State Management** (`src/ui/breadboard-app.ts`):
   - Extend `DragState` interface to support connection re-routing:
     ```typescript
     interface ConnectionRerouteDragState {
       type: 'connection-reroute';
       connectionId: string;
       endpointType: 'source' | 'target'; // which end is being dragged
       originalHolePosition: Position;
       currentMousePosition: { x: number; y: number };
     }
     ```
   - Add `dragState: ComponentDragState | ConnectionRerouteDragState | null` to BreadboardApp

3. **Ghost Preview During Drag** (`src/ui/pixi-renderer.ts`):
   - During drag, render semi-transparent connection from fixed endpoint to cursor position
   - Snap cursor to nearest valid hole (using existing snap-to-grid logic)
   - Visual feedback on hover:
     - Green glow on target hole if valid (hole is free)
     - Red glow if invalid (hole occupied or violates constraint)

4. **Validation During Drag** (`src/core/rete-manager.ts`):
   - Reuse existing `isHoleOccupied()` and `validateConnection()` methods
   - Check if target hole is free OR is the current connection's other endpoint (no-op move)
   - Prevent re-routing to same hole as source

5. **Re-routing Execution** (`src/core/rete-manager.ts`):
   - Add `rerouteConnection(connectionId, newEndpoint, endpointType)` method
   - Use Rete.js connection manipulation:
     - Get connection object: `editor.getConnection(connectionId)`
     - Remove old endpoint: `connection.source = newSourceNode.id` (or `connection.target`)
     - Update connection in graph
     - Trigger `onConnectionRemoved` / `onConnectionCreated` event sequence OR create specific `onConnectionRerouted` event

6. **BreadboardState Synchronization** (`src/ui/breadboard-app.ts`):
   - On successful re-route, update component positions in BreadboardState
   - Re-extract circuit topology (connection change may affect electrical net structure)
   - Re-run simulation
   - Update voltage overlays and current animation
   - Preserve connection selection after re-route

7. **History Integration** (Undo/Redo):
   - Create `RerouteConnectionCommand` implementing CommandInterface:
     ```typescript
     class RerouteConnectionCommand {
       private componentId: string;
       private oldPositions: Position[];
       private newPositions: Position[];
       // execute: update component positions to newPositions
       // undo: restore oldPositions
     }
     ```
   - Push command to HistoryManager on successful re-route

**Acceptance Criteria**:

- [ ] Selected wire displays draggable handles at both endpoints
- [ ] Dragging a handle shows ghost preview connection to cursor
- [ ] Ghost connection snaps to nearest breadboard hole
- [ ] Valid target holes show green glow on hover
- [ ] Occupied holes show red glow and prevent drop
- [ ] Dropping on valid hole re-routes connection endpoint
- [ ] Circuit re-extracts and re-simulates after re-route
- [ ] Voltage colors and current animation update correctly
- [ ] Undo/redo works for connection re-routing
- [ ] Connection remains selected after re-route

---

### Phase 3: Advanced Routing Features (Stretch Goals)

These features are referenced in `goal.md` Section 6.2 but can be deferred to a later iteration:

1. **Path Optimization**:
   - Implement pathfinding algorithm to avoid component overlap
   - Use A\* or Dijkstra on breadboard grid graph
   - Consider routing preferences (orthogonal paths, minimal bends)

2. **Control Point Editing**:
   - Allow adding/removing intermediate control points (for bezier curve shaping)
   - Drag control points to adjust wire curvature manually
   - Useful for dense circuits where automatic routing may be suboptimal

3. **Multi-Wire Selection**:
   - Shift-click to select multiple wires
   - Bulk operations (delete, color change)

---

## Technical Considerations

### Rete.js Connection API

Rete.js `Connection` objects have these key properties:

- `id`: Unique connection identifier
- `source`: Source node ID
- `target`: Target node ID
- `sourceOutput`: Output socket key
- `targetInput`: Input socket key

To re-route a connection, we modify `source` or `target` and update the graph. Rete.js handles socket compatibility validation if we've registered validators.

**Critical**: Check if Rete.js fires `connectioncreated` / `connectionremoved` events when modifying existing connection, or if we need custom event dispatch.

### Performance Considerations

- **Drag performance**: Rendering ghost preview on every `pointermove` event requires efficient rendering. Consider throttling or using RAF.
- **Validation caching**: `isHoleOccupied()` may be called repeatedly during drag. Consider caching occupancy map and invalidating on state change.
- **Simulation re-run**: Only trigger full circuit re-extraction and simulation on `mouseup` (successful drop), not during drag preview.

### Interaction Edge Cases

1. **Re-routing to same hole**: Should be no-op (no state change, no history entry)
2. **Re-routing during simulation**: Should be allowed; simulation results update after re-route
3. **Re-routing a connection that creates a short circuit**: Error detection should highlight issue after re-simulation
4. **Re-routing while explain panel open**: Update explain panel content if currently displaying the re-routed connection
5. **Re-routing while audio enabled**: Speaker audio should update if circuit topology changes

### Visual Design Decisions

**Endpoint Handle Appearance**:

- Recommend: Small circles (8px radius) with white fill and dark border
- Should be clearly visible against breadboard but not visually overwhelming
- Consider scaling with zoom level (if zoom is ever implemented)

**Ghost Preview Style**:

- Recommend: 50% opacity, dashed line pattern
- Use same color as original wire (preserve user's wire color choice)
- Highlight target hole with glow to indicate valid/invalid drop

**Selection Feedback**:

- Recommend: Increase stroke width by 2-3px and add blue glow filter
- Ensure selected wire stands out from unselected wires without obscuring nearby components

---

## Testing Strategy

### Unit Tests

Add to `src/core/__tests__/rete-manager.test.ts`:

- [ ] `rerouteConnection()` updates connection endpoints correctly
- [ ] Re-routing validation respects hole occupancy constraints
- [ ] Re-routing to same hole is no-op
- [ ] Re-routing to invalid hole fails with error message

Add to `src/ui/__tests__/breadboard-app.test.ts`:

- [ ] Connection selection via `clickConnection()` test helper
- [ ] Connection deselection on background click
- [ ] Drag state tracking during connection re-route
- [ ] BreadboardState synchronization after re-route
- [ ] Undo/redo for connection re-routing

### Integration Tests

- [ ] End-to-end re-routing workflow:
  1. Place components and create wire
  2. Select wire
  3. Drag endpoint to new hole
  4. Verify circuit topology updated
  5. Verify simulation results reflect new topology
  6. Undo re-route
  7. Verify circuit reverted to original state

### Visual Regression Tests (Optional)

- [ ] Screenshot test for selected wire visual feedback
- [ ] Screenshot test for endpoint handles rendering
- [ ] Screenshot test for ghost preview during drag

---

## Success Criteria

This feature will be considered complete when:

1. **Core Functionality**:
   - [ ] Users can click a wire to select it
   - [ ] Selected wires display draggable endpoint handles
   - [ ] Dragging a handle re-routes the connection to a new hole
   - [ ] Re-routing respects one-connector-per-hole constraint
   - [ ] Invalid re-routing attempts are prevented with visual feedback

2. **Integration**:
   - [ ] Circuit extraction updates correctly after re-routing
   - [ ] Simulation re-runs and voltage overlays update
   - [ ] Current animation reflects new wire path
   - [ ] Explain panel shows updated connection information

3. **User Experience**:
   - [ ] Visual feedback is clear and intuitive (selection, handles, ghost preview)
   - [ ] Undo/redo works correctly for all re-routing operations
   - [ ] No performance degradation during drag operations

4. **Code Quality**:
   - [ ] All new code has unit test coverage
   - [ ] No breaking changes to existing functionality
   - [ ] Code follows existing patterns (ReteManager, CommandInterface, PixiEventHandlers)

5. **Documentation**:
   - [ ] Update `system_capabilities.md` to document wire re-routing capability
   - [ ] Update `README.md` usage section to explain re-routing interaction
   - [ ] Add inline code comments explaining re-routing state machine

---

## Alternative Approaches Considered

### Alternative 1: Delete-and-Recreate Pattern

Instead of modifying connection endpoints, implement re-routing as atomic delete-then-create operation.

**Pros**:

- Simpler implementation (reuse existing connection creation and deletion code)
- No need for connection modification API
- History command can wrap existing AddComponent/RemoveComponent commands

**Cons**:

- Loses semantic meaning of "re-routing" (appears as two separate operations in history)
- Cannot provide smooth visual transition (connection disappears then reappears)
- May confuse users (connection ID changes)

**Decision**: Rejected. Goal.md explicitly calls for "re-routing" as distinct interaction primitive, not delete/recreate workaround.

---

### Alternative 2: Path-Based Dragging (Intermediate Control Points)

Instead of dragging endpoints, allow dragging any point along the wire path to add/modify bezier control points.

**Pros**:

- More flexible routing control (users can shape curves precisely)
- Better for complex layouts with many overlapping wires
- Industry-standard pattern (seen in Inkscape, Illustrator)

**Cons**:

- Significantly more complex interaction model
- Requires bezier curve hit-testing and control point manipulation
- May be overkill for breadboard layout (holes are discrete grid)
- Not mentioned in goal.md requirements

**Decision**: Deferred to Phase 3 (stretch goals). Endpoint dragging is sufficient for MVP compliance with goal.md.

---

### Alternative 3: Connection Deletion UI (Right-Click Context Menu)

Instead of implementing re-routing, first implement connection deletion via context menu or dedicated UI control.

**Pros**:

- Simpler than re-routing
- Provides immediate value (currently no way to delete individual wires)
- Can be stepping stone toward re-routing

**Cons**:

- Does not satisfy goal.md Section 6.2 requirement
- Forces destructive workflow (delete-and-recreate instead of modify)
- Does not leverage Rete.js re-routing capabilities

**Decision**: Connection deletion should be implemented alongside re-routing (as part of Phase 2 or separate feature). Deletion alone does not satisfy the "re-routing must be supported" requirement.

---

## Dependencies and Prerequisites

### Required Before Starting

- [x] Rete.js Phase 3e complete (PR #249) — interactive workflow operational
- [x] Connection creation working (PR #243) — drag-from-leg-to-hole
- [x] Connection rendering infrastructure (PR #237) — bezier curves, voltage colors
- [x] Connection validation pipeline (PR #231) — `validateConnection()`, `isHoleOccupied()`

### Recommended Before Starting

- [ ] Familiarize with Rete.js Connection API documentation
- [ ] Review PixiJS Graphics interactive events (`pointerdown`, `pointerover`, `pointerout`)
- [ ] Understand current DragState pattern in BreadboardApp (component drag implementation)
- [ ] Review CommandInterface pattern for history integration

### No Blockers Identified

All architectural foundations are in place. This is a pure additive feature with no dependencies on external libraries or unimplemented subsystems.

---

## Implementation Estimate

Based on complexity and scope:

- **Phase 1 (Connection Selection)**: 1-2 days
  - PixiRenderer interactive connections: 4-6 hours
  - BreadboardApp selection state: 2-3 hours
  - Explain panel integration: 1-2 hours
  - Unit tests: 2-3 hours

- **Phase 2 (Endpoint Dragging)**: 3-4 days
  - Endpoint handle rendering: 3-4 hours
  - Drag state management: 4-6 hours
  - Ghost preview and validation: 4-6 hours
  - ReteManager re-routing API: 4-6 hours
  - History integration: 3-4 hours
  - Unit and integration tests: 6-8 hours

- **Phase 3 (Advanced Features)**: 2-3 days (stretch goals, can be deferred)

**Total estimate for Phases 1-2**: ~5-6 days of focused development

**Note**: Estimates assume developer is already familiar with codebase (Rete.js integration, PixiJS rendering, BreadboardApp architecture).

---

## Open Questions

1. **Connection Deletion**: Should we implement connection deletion UI (right-click, Delete key) as part of this feature or as separate issue?

2. **Multi-Segment Wires**: Currently all wires are single-segment (hole-to-hole). Should we support multi-segment wires (e.g., wire going through multiple holes as pass-through)? Goal.md does not specify.

3. **Wire Color Preservation**: When re-routing, should wire color be preserved? Currently wire color is assigned from a cycling palette — need to ensure re-routed wire keeps its original color.

4. **Undo/Redo Granularity**: Should each endpoint drag be a separate history entry, or should we wait for mouse release? Recommend: single history entry on mouse release (atomic re-route operation).

5. **Rete Event Handling**: Does Rete.js automatically fire `connectioncreated`/`connectionremoved` when we modify connection properties programmatically, or do we need to manually dispatch these events?

---

## Conclusion

Wire re-routing is a **mandatory feature** per goal.md Section 6.2, and its absence represents the most significant interaction model gap in the current implementation. The architectural foundation provided by Rete.js Phase 3 (PRs #219, #225, #231, #237, #243, #249) makes this implementation straightforward — we are extending existing patterns rather than introducing new architectural concepts.

This feature directly enables the iterative, experimentation-focused workflow that goal.md prioritizes. Completing wire re-routing will bring the system into full compliance with the "correct interaction primitives" goal stated in Section 1.

**Recommendation**: Prioritize this feature immediately after any critical bug fixes. It is the single most important missing capability for achieving full goal.md alignment.
