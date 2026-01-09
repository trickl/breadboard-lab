Implement interactive wiring via Rete in React UI (Milestone 5)

## Context

This task implements **Milestone 5 — Interactive wiring via Rete** from the PixiJS removal migration plan (`planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`, lines 336-341).

**Migration status:** 5 of 7 milestones complete (71% progress). Milestone 5 is the next logical step in the migration plan.

**Prerequisites completed:**
- ✅ Milestone 0: React infrastructure with feature flag (PR #465)
- ✅ Milestone 1: Renderer-agnostic controller (PR #471)
- ✅ Milestone 2: Breadboard substrate in SVG (PR #477)
- ✅ Milestone 3: Component rendering and manipulation (PR #483)
- ✅ Milestone 4: Rete graph layer visible and aligned (PR #489)

**Current state:**
- React UI renders breadboard substrate with 420 interactive holes
- Components render as SVG with selection, drag, rotate, and delete interactions
- Rete editor integrated with component nodes and coordinate alignment
- Rete ConnectionPlugin initialized but no test connections exist
- Legacy PixiJS UI still implements Phase 3 interactive connection workflow

**Gap:**
The React UI has no way to create connections between component legs and breadboard holes. The Phase 3 interactive connection workflow (drag leg → hole) currently only exists in the PixiJS implementation. This milestone must reimplement that workflow in React + Rete.

## Review Items Addressed

This task addresses the following specific items from the source review:

### Primary: Milestone 5 acceptance criteria (lines 336-341)

From `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`:

> **Milestone 5 — Interactive wiring via Rete**
> **Outcome:** Phase-3-style connection creation works without Pixi.
> 
> Acceptance criteria:
> - Drag leg → hole creates connection.
> - One-connector-per-hole constraint enforced with clear feedback.

### Supporting: Connection visual requirements (lines 212-217)

> **Connections/wires**
> **Current:** Pixi draws wires and (optionally) "Rete connection lines" container.
> 
> **New:** Use Rete's connection plugin + React renderer to draw connections, but coordinate endpoints in world space so they align visually with holes.
> 
> If Rete connection visuals can't match the breadboard style, render connections ourselves in SVG from `reteManager.getConnections()` as a temporary bridge.

### Supporting: Interaction model requirements (lines 242-270)

> **Core interactions**
> - Connection creation (drag from leg → hole)
> 
> **Recommended state machine (React-friendly)**
> Represent interaction as explicit modes:
> - `idle`
> - `draggingComponent`
> - `draggingFloatingComponent`
> - `draggingConnection`
> - `reroutingConnection`
> 
> Each mode has:
> - entry conditions
> - pointer move behavior
> - commit/cancel behavior

### Supporting: Rete role and coordinate alignment (lines 98-108, 110-121)

> **DR-2: Rete renders the graph layer, not the entire breadboard**
> **Decision:** Use Rete's React renderer for:
> - Component nodes (visual bodies)
> - Ports/legs (connection endpoints)
> - Connections (wires)
> 
> But **do not** model every breadboard hole as a rendered Rete node.
> 
> **DR-3: One shared coordinate system ("world space") for everything**
> **Decision:** Define a single coordinate system (world space) for:
> - Breadboard geometry
> - Component positions
> - Connection endpoints
> - Overlays

## Proposed Implementation

### Overview

Implement Phase 3 interactive connection workflow in React UI:
1. User pointer-down on component leg (Rete port)
2. Drag shows preview connection line following pointer
3. Hover over breadboard hole highlights valid drop target
4. Release on valid hole creates connection in Rete editor
5. Enforce one-connector-per-hole constraint with visual feedback
6. Coordinate alignment ensures visual consistency across layers

### Scope

#### In Scope

1. **Connection creation interaction**
   - Pointer-down on component leg/port initiates connection drag
   - Preview connection line follows pointer during drag
   - Hover over breadboard hole highlights drop target
   - Release on valid hole creates Rete connection
   - Release on invalid target cancels connection
   - Escape key cancels connection

2. **Visual feedback during drag**
   - Connection preview line renders from port to pointer position
   - Valid hole highlights when hovered during drag (green)
   - Invalid hole highlights when hovered during drag (red)
   - Occupied hole (one-connector-per-hole) shows red/error feedback
   - Cursor changes to indicate drag state

3. **One-connector-per-hole constraint**
   - Track which holes have existing connections
   - Prevent multiple connections to same hole
   - Show clear error feedback when attempting invalid connection
   - Allow replacing existing connection with confirmation (optional stretch)

4. **Connection visual rendering**
   - Use Rete ConnectionPlugin + React renderer for connection lines
   - Coordinate endpoints in world space (align with breadboard holes)
   - Connection style matches breadboard aesthetic (clean SVG lines)
   - Connection endpoints snap to hole centers
   - Connections render behind components (z-ordering)

5. **Controller integration**
   - Add connection drag state to controller (`connectionDrag` property)
   - Define new controller actions:
     - `CONNECTION_DRAG_STARTED` (portId, componentId, legIndex)
     - `CONNECTION_DRAG_MOVED` (pointerPosition, hoveredHole)
     - `CONNECTION_DRAG_COMPLETED` (portId, targetHole)
     - `CONNECTION_DRAG_CANCELLED`
     - `CONNECTION_CREATED` (connection metadata)
     - `CONNECTION_DELETED` (connectionId)
   - Update controller reducer to handle connection actions
   - Store connection state alongside components

6. **Coordinate mapping**
   - Convert component leg positions to Rete port positions
   - Convert breadboard hole positions to Rete connection endpoints
   - Ensure visual alignment between SVG holes and Rete connection endpoints
   - Use existing `positionToPixels()` and `pixelsToPosition()` helpers

#### Out of Scope (Deferred to Future Milestones)

- Connection deletion (will implement in Milestone 6 or as follow-up)
- Connection rerouting (defer to future enhancement)
- Multi-segment wire routing (use straight lines initially)
- Connection labels/annotations
- Connection property editing
- Undo/redo for connections (controller-compatible, but deferred to integration testing)
- Connection validation beyond one-per-hole (circuit correctness in simulator)

### Implementation Plan

#### Step 1: Extend controller with connection drag state (lines 303-314)

**File:** `src/ui-controller/types.ts`

Add to `AppState` interface:
```typescript
connectionDrag: {
  dragState: ConnectionDragState | null;
};
```

Define new state type:
```typescript
interface ConnectionDragState {
  sourcePortId: string;
  sourceComponentId: string;
  sourceLegIndex: number;
  sourcePosition: Position; // Grid position of source leg
  currentPointerPosition: { x: number; y: number }; // World space
  hoveredHolePosition: Position | null; // Grid position if over valid hole
  isValidTarget: boolean;
}
```

Add to `Action` discriminated union:
```typescript
| { type: 'CONNECTION_DRAG_STARTED'; portId: string; componentId: string; legIndex: number; position: Position }
| { type: 'CONNECTION_DRAG_MOVED'; pointerPosition: { x: number; y: number }; hoveredHole: Position | null; isValid: boolean }
| { type: 'CONNECTION_DRAG_COMPLETED'; portId: string; targetPosition: Position }
| { type: 'CONNECTION_DRAG_CANCELLED' }
```

**File:** `src/ui-controller/breadboard-controller.ts`

Add reducer cases for new actions:
- `CONNECTION_DRAG_STARTED`: Initialize `connectionDrag.dragState`
- `CONNECTION_DRAG_MOVED`: Update pointer position and hovered hole
- `CONNECTION_DRAG_COMPLETED`: Clear drag state, dispatch to Rete
- `CONNECTION_DRAG_CANCELLED`: Clear drag state

**Rationale:** Controller remains renderer-agnostic; UI components dispatch actions and render from state.

#### Step 2: Track hole occupancy in controller state (one-connector-per-hole constraint)

**File:** `src/ui-controller/types.ts`

Add to `AppState` interface:
```typescript
connections: {
  occupiedHoles: Map<string, string>; // hole position key → connection ID
  // Example: "5,8" → "conn-1" means hole at row 5, column 8 is occupied
};
```

Update `CONNECTION_CREATED` action:
```typescript
| { type: 'CONNECTION_CREATED'; connectionId: string; portId: string; targetPosition: Position }
```

**File:** `src/ui-controller/breadboard-controller.ts`

Add reducer case:
- `CONNECTION_CREATED`: Add entry to `occupiedHoles` map

Add helper function:
```typescript
function isHoleOccupied(state: AppState, position: Position): boolean {
  const key = `${position.row},${position.column}`;
  return state.connections.occupiedHoles.has(key);
}
```

**File:** `src/ui-controller/selectors.ts`

Add selector:
```typescript
export function isHoleOccupied(state: AppState, position: Position): boolean {
  const key = `${position.row},${position.column}`;
  return state.connections.occupiedHoles.has(key);
}
```

**Rationale:** Constraint enforcement is a state concern, not a rendering concern. Controller tracks occupancy; UI queries via selector.

#### Step 3: Implement connection drag interaction in ComponentsLayer

**File:** `src/ui-react/components/ComponentsLayer.tsx`

Add pointer event handlers for component legs:
```typescript
function handleLegPointerDown(
  e: React.PointerEvent,
  componentId: string,
  legIndex: number,
  portId: string,
  position: Position
) {
  e.stopPropagation();
  controller.dispatch({
    type: 'CONNECTION_DRAG_STARTED',
    portId,
    componentId,
    legIndex,
    position,
  });
  
  // Attach document-level move/up handlers (same pattern as component drag)
  document.addEventListener('pointermove', handleConnectionDragMove);
  document.addEventListener('pointerup', handleConnectionDragUp);
}
```

Implement drag move handler:
```typescript
function handleConnectionDragMove(e: PointerEvent) {
  // Convert screen coordinates to SVG world space
  const svg = svgRef.current;
  if (!svg) return;
  
  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;
  const worldPoint = point.matrixTransform(svg.getScreenCTM()!.inverse());
  
  // Convert world coordinates to grid position
  const gridPosition = pixelsToPosition({ x: worldPoint.x, y: worldPoint.y });
  
  // Check if grid position is valid hole
  const isValid = isValidPosition(gridPosition) && !isHoleOccupied(state, gridPosition);
  
  controller.dispatch({
    type: 'CONNECTION_DRAG_MOVED',
    pointerPosition: { x: worldPoint.x, y: worldPoint.y },
    hoveredHole: isValidPosition(gridPosition) ? gridPosition : null,
    isValid,
  });
}
```

Implement drag complete handler:
```typescript
function handleConnectionDragUp(e: PointerEvent) {
  document.removeEventListener('pointermove', handleConnectionDragMove);
  document.removeEventListener('pointerup', handleConnectionDragUp);
  
  if (state.connectionDrag.dragState?.isValidTarget && state.connectionDrag.dragState.hoveredHolePosition) {
    // Valid connection - dispatch completion
    controller.dispatch({
      type: 'CONNECTION_DRAG_COMPLETED',
      portId: state.connectionDrag.dragState.sourcePortId,
      targetPosition: state.connectionDrag.dragState.hoveredHolePosition,
    });
  } else {
    // Invalid target - cancel
    controller.dispatch({ type: 'CONNECTION_DRAG_CANCELLED' });
  }
}
```

Update keyboard handler to support Escape during connection drag:
```typescript
// In BreadboardScene.tsx handleKeyDown
if (e.key === 'Escape' && state.connectionDrag.dragState) {
  controller.dispatch({ type: 'CONNECTION_DRAG_CANCELLED' });
}
```

**Rationale:** Reuses coordinate transformation pattern from Milestone 3 component drag. Same document-level event listener approach.

#### Step 4: Render connection drag preview

**File:** `src/ui-react/components/ComponentsLayer.tsx` (or new `ConnectionPreview.tsx`)

Add connection preview rendering to ComponentsLayer:
```typescript
{state.connectionDrag.dragState && (
  <ConnectionDragPreview
    dragState={state.connectionDrag.dragState}
    occupiedHoles={state.connections.occupiedHoles}
  />
)}
```

Create new component:
```typescript
interface ConnectionDragPreviewProps {
  dragState: ConnectionDragState;
  occupiedHoles: Map<string, string>;
}

function ConnectionDragPreview({ dragState, occupiedHoles }: ConnectionDragPreviewProps) {
  const sourcePixels = positionToPixels(dragState.sourcePosition);
  const targetPixels = dragState.currentPointerPosition;
  
  // Line color based on validity
  const strokeColor = dragState.isValidTarget ? '#00ff00' : '#ff0000';
  
  return (
    <g className="connection-preview">
      <line
        x1={sourcePixels.x}
        y1={sourcePixels.y}
        x2={targetPixels.x}
        y2={targetPixels.y}
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray="4 4"
        opacity={0.7}
        pointerEvents="none"
      />
      {dragState.hoveredHolePosition && (
        <circle
          cx={positionToPixels(dragState.hoveredHolePosition).x}
          cy={positionToPixels(dragState.hoveredHolePosition).y}
          r={10}
          fill={strokeColor}
          opacity={0.3}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
```

**Rationale:** Visual feedback is critical for usability. Preview line shows connection in progress; color indicates validity.

#### Step 5: Update BreadboardSvg to provide hover feedback during connection drag

**File:** `src/ui-react/BreadboardSvg.tsx`

Modify `handlePointerMove` to check for active connection drag:
```typescript
function handlePointerMove(e: React.PointerEvent) {
  // Existing hole hover logic...
  
  // If connection drag active, highlight hovered hole differently
  if (connectionDragState) {
    const isValid = isValidPosition(nearestPos) && !isHoleOccupied(state, nearestPos);
    setHighlightColor(isValid ? '#00ff00' : '#ff0000');
  } else {
    setHighlightColor('#3399ff'); // Default hover color
  }
}
```

**Rationale:** Breadboard substrate provides visual feedback for drop target validity.

#### Step 6: Create Rete connections when drag completes

**File:** `src/ui-react/rete/ReteGraphLayer.tsx`

Add connection creation logic:
```typescript
async function handleConnectionCompleted(portId: string, targetPosition: Position) {
  // Find source node and port
  const sourceNode = editor.getNode(getNodeIdForPort(portId));
  if (!sourceNode) return;
  
  const sourcePort = sourceNode.outputs[portId];
  if (!sourcePort) return;
  
  // Create virtual target node for breadboard hole
  // (Alternative: create invisible Rete nodes for all holes - revisit if needed)
  const targetNode = await createHoleNode(targetPosition);
  
  // Create Rete connection
  const connection = new ClassicPreset.Connection(
    sourceNode,
    portId,
    targetNode,
    'hole-input'
  );
  
  await editor.addConnection(connection);
  
  // Notify controller
  controller.dispatch({
    type: 'CONNECTION_CREATED',
    connectionId: connection.id,
    portId,
    targetPosition,
  });
}
```

Subscribe to controller connection completion action:
```typescript
useEffect(() => {
  const unsubscribe = controller.subscribe((state) => {
    // Handle CONNECTION_DRAG_COMPLETED action
    if (state.connectionDrag.dragState === null && previousDragState !== null) {
      // Drag just completed - create Rete connection
      // (Implementation depends on how controller signals completion)
    }
  });
  
  return unsubscribe;
}, [controller]);
```

**Alternative approach (if virtual nodes are problematic):**
Render connections directly in SVG from controller state without Rete connection objects:
```typescript
// In ComponentsLayer or new ConnectionsLayer component
{state.connections.list.map(conn => (
  <line
    key={conn.id}
    x1={positionToPixels(conn.sourcePosition).x}
    y1={positionToPixels(conn.sourcePosition).y}
    x2={positionToPixels(conn.targetPosition).x}
    y2={positionToPixels(conn.targetPosition).y}
    stroke="#888"
    strokeWidth={2}
  />
))}
```

**Decision point:** Determine during implementation whether to use Rete connection objects or pure SVG rendering. Review guidance (lines 212-217) suggests: "If Rete connection visuals can't match the breadboard style, render connections ourselves in SVG from `reteManager.getConnections()` as a temporary bridge."

**Recommended approach:** Start with pure SVG rendering for simplicity and parity. Migrate to Rete connection rendering in a future enhancement if beneficial.

#### Step 7: Render established connections in SVG

**File:** `src/ui-react/components/ConnectionsLayer.tsx` (new file)

Create dedicated layer for connection rendering:
```typescript
interface ConnectionsLayerProps {
  controller: BreadboardController;
}

export function ConnectionsLayer({ controller }: ConnectionsLayerProps) {
  const [state, setState] = useState(controller.getState());
  
  useEffect(() => {
    return controller.subscribe(setState);
  }, [controller]);
  
  return (
    <g className="connections-layer">
      {state.connections.list.map(conn => (
        <ConnectionLine
          key={conn.id}
          connection={conn}
          isSelected={conn.id === state.connections.selectedConnectionId}
        />
      ))}
    </g>
  );
}

interface ConnectionLineProps {
  connection: Connection;
  isSelected: boolean;
}

function ConnectionLine({ connection, isSelected }: ConnectionLineProps) {
  const sourcePixels = positionToPixels(connection.sourcePosition);
  const targetPixels = positionToPixels(connection.targetPosition);
  
  return (
    <line
      x1={sourcePixels.x}
      y1={sourcePixels.y}
      x2={targetPixels.x}
      y2={targetPixels.y}
      stroke={isSelected ? '#3399ff' : '#888'}
      strokeWidth={isSelected ? 3 : 2}
      opacity={0.8}
      className="connection-line"
    />
  );
}
```

**File:** `src/ui-react/BreadboardScene.tsx`

Add ConnectionsLayer to scene (before ComponentsLayer for z-ordering):
```typescript
<svg ref={svgRef} ...>
  <BreadboardSvg ... />
  <ConnectionsLayer controller={controller} />
  <ComponentsLayer controller={controller} svgRef={svgRef} />
</svg>
```

**Rationale:** Connections render behind components. Separate layer keeps concerns separated.

#### Step 8: Update controller initial state

**File:** `src/ui-controller/index.ts`

Update `createInitialState()`:
```typescript
export function createInitialState(): AppState {
  return {
    // ... existing properties ...
    connectionDrag: {
      dragState: null,
    },
    connections: {
      occupiedHoles: new Map(),
      list: [],
      selectedConnectionId: null,
    },
  };
}
```

#### Step 9: Add unit tests for connection drag state transitions

**File:** `src/ui-controller/__tests__/breadboard-controller.test.ts`

Add test cases:
```typescript
describe('Connection drag actions', () => {
  it('should start connection drag', () => {
    controller.dispatch({
      type: 'CONNECTION_DRAG_STARTED',
      portId: 'port-1',
      componentId: 'comp-1',
      legIndex: 0,
      position: { row: 5, column: 8 },
    });
    
    const state = controller.getState();
    expect(state.connectionDrag.dragState).not.toBeNull();
    expect(state.connectionDrag.dragState?.sourceComponentId).toBe('comp-1');
  });
  
  it('should update connection drag position', () => {
    // Start drag first
    controller.dispatch({ type: 'CONNECTION_DRAG_STARTED', ... });
    
    controller.dispatch({
      type: 'CONNECTION_DRAG_MOVED',
      pointerPosition: { x: 100, y: 200 },
      hoveredHole: { row: 6, column: 9 },
      isValid: true,
    });
    
    const state = controller.getState();
    expect(state.connectionDrag.dragState?.currentPointerPosition).toEqual({ x: 100, y: 200 });
    expect(state.connectionDrag.dragState?.isValidTarget).toBe(true);
  });
  
  it('should complete connection drag and create connection', () => {
    controller.dispatch({ type: 'CONNECTION_DRAG_STARTED', ... });
    controller.dispatch({
      type: 'CONNECTION_DRAG_COMPLETED',
      portId: 'port-1',
      targetPosition: { row: 6, column: 9 },
    });
    
    const state = controller.getState();
    expect(state.connectionDrag.dragState).toBeNull();
    // Connection creation handled separately
  });
  
  it('should cancel connection drag', () => {
    controller.dispatch({ type: 'CONNECTION_DRAG_STARTED', ... });
    controller.dispatch({ type: 'CONNECTION_DRAG_CANCELLED' });
    
    const state = controller.getState();
    expect(state.connectionDrag.dragState).toBeNull();
  });
  
  it('should track occupied holes', () => {
    controller.dispatch({
      type: 'CONNECTION_CREATED',
      connectionId: 'conn-1',
      portId: 'port-1',
      targetPosition: { row: 5, column: 8 },
    });
    
    const state = controller.getState();
    expect(state.connections.occupiedHoles.get('5,8')).toBe('conn-1');
  });
  
  it('should prevent connection to occupied hole', () => {
    controller.dispatch({
      type: 'CONNECTION_CREATED',
      connectionId: 'conn-1',
      portId: 'port-1',
      targetPosition: { row: 5, column: 8 },
    });
    
    controller.dispatch({ type: 'CONNECTION_DRAG_STARTED', ... });
    controller.dispatch({
      type: 'CONNECTION_DRAG_MOVED',
      pointerPosition: { x: 100, y: 200 },
      hoveredHole: { row: 5, column: 8 },
      isValid: false, // Should be false due to occupancy
    });
    
    const state = controller.getState();
    expect(state.connectionDrag.dragState?.isValidTarget).toBe(false);
  });
});
```

**Rationale:** Controller tests remain DOM-free and verify state transitions.

### Acceptance Criteria (lines 336-341)

#### AC1: Drag leg → hole creates connection

**Verification steps:**
1. Navigate to `http://localhost:5173/?react=true`
2. Ensure test component exists on breadboard (from Milestone 3)
3. Pointer-down on component leg (small circle at leg position)
4. Drag pointer away from leg
5. **Expected:** Preview connection line follows pointer from leg to pointer position
6. Hover over valid breadboard hole
7. **Expected:** Hole highlights green, preview line snaps to hole center
8. Release pointer
9. **Expected:** Connection line renders from leg to hole, preview disappears
10. **Expected:** Connection persists in state (visible on re-render)

**Success criteria:**
- ✅ Preview line renders during drag
- ✅ Preview line follows pointer
- ✅ Preview line snaps to hole when hovering valid target
- ✅ Connection created on release at valid hole
- ✅ Connection renders as persistent line after creation
- ✅ No console errors

#### AC2: One-connector-per-hole constraint enforced with clear feedback

**Verification steps:**
1. Create first connection to hole at row 5, column 8 (from AC1)
2. Start drag from different component leg
3. Hover over same hole (row 5, column 8)
4. **Expected:** Hole highlights red (invalid), preview line is red/dashed
5. Release pointer on occupied hole
6. **Expected:** Connection is NOT created, preview disappears, no error thrown

**Verification steps (multiple connections from same leg):**
1. Create connection from leg 1 of resistor to hole A
2. Start drag from same leg 1 of same resistor
3. **Expected:** Preview shows from leg 1 (not restricted)
4. Hover over different hole B
5. **Expected:** Hole B highlights green (valid)
6. Release on hole B
7. **Expected:** Second connection created from same leg to different hole
   (One-connector-per-hole means each HOLE has max one connection, not each LEG)

**Success criteria:**
- ✅ Occupied holes reject new connections
- ✅ Red highlight shown for occupied holes during drag
- ✅ Preview line shows red color for invalid target
- ✅ Release on occupied hole does not create connection
- ✅ No errors or crashes
- ✅ Multiple connections from same leg to different holes allowed

### Additional Verification

**Visual regression:**
- Connection lines render with correct endpoints
- Preview line renders smoothly during drag
- Highlight colors correct (green for valid, red for invalid, blue for default hover)
- Z-ordering correct (connections behind components)

**Interaction edge cases:**
- Drag off breadboard and release → connection cancelled
- Press Escape during drag → connection cancelled
- Drag to invalid position (outside grid) → preview shows red, connection cancelled on release
- Fast drag movements → preview updates smoothly without lag

**Performance:**
- No frame drops during connection drag preview
- Multiple connections (10+) render without performance issues
- Coordinate transformations performant (same pattern as Milestone 3 component drag)

### Notes on Implementation Strategy

**Refactor safety rules (from task instructions):**
1. ✅ **Move code verbatim first:** Existing `ReteManager` connection logic can be referenced but not directly moved (React UI is different architecture)
2. ✅ **Update imports/call sites:** Controller actions replace imperative ReteManager calls
3. ✅ **Targeted improvements only:** Focus on Phase 3 workflow parity, not enhancements

**Coordinate transformation consistency:**
- Reuse `positionToPixels()` and `pixelsToPosition()` from Milestone 2
- Reuse SVG coordinate transform pattern from Milestone 3
- Maintain 26px hole spacing constant
- Label padding offsets consistent across all layers

**State machine approach (lines 242-270):**
Controller `connectionDrag.dragState` implements explicit state:
- `null` = idle (no drag active)
- `ConnectionDragState` = dragging connection
Entry condition: Pointer-down on leg
Exit condition: Pointer-up (commit or cancel) or Escape key

**Rete integration strategy:**
- **Recommended:** Start with pure SVG connection rendering (skip Rete connection objects initially)
- **Rationale:** Review guidance (lines 212-217) suggests rendering from state if Rete visuals don't match breadboard style
- **Future enhancement:** Migrate to Rete ConnectionPlugin rendering once SVG version proven
- **Benefit:** Simpler initial implementation, fewer coordinate mapping issues

**Testing strategy:**
- Unit tests for controller actions (DOM-free)
- Manual verification of UI interactions (no automated Playwright tests yet per existing pattern)
- Visual inspection of coordinate alignment
- Test with multiple components and connections

### Dependencies

**External packages (already installed):**
- `rete@^2.0.6` (Rete core)
- `rete-area-plugin@^2.0.4` (pan/zoom)
- `rete-connection-plugin@^2.0.3` (connection management)
- `rete-react-plugin@^2.1.0` (React renderer, added in Milestone 4)

**Internal modules:**
- `src/ui-controller/*` (state management)
- `src/ui-react/geometry/breadboard-layout.ts` (coordinate helpers)
- `src/ui-react/components/ComponentsLayer.tsx` (interaction layer)
- `src/ui-react/BreadboardScene.tsx` (scene container)
- `src/ui-react/rete/ReteGraphLayer.tsx` (Rete integration)

**No new dependencies required.**

### Constraints (from task instructions)

1. ✅ **Do not change logic unless clear bug:** Controller pattern is new (not refactoring), no legacy logic modified
2. ✅ **Do not maintain legacy endpoints:** No backwards compatibility needed (feature flag provides fallback)
3. ✅ **Always delete unused code:** No code deletion in this milestone (additive only)
4. ✅ **No comments on changes:** Clean code without inline comments about changes
5. ✅ **No rewrite from scratch:** Reusing coordinate transformation patterns from Milestones 2-3
6. ✅ **Tests and linting pass:** Will verify after implementation

### Definition of Done

This milestone is complete when:
- [ ] Controller has connection drag state and actions
- [ ] Controller tracks hole occupancy (one-connector-per-hole)
- [ ] Component legs are clickable/draggable to initiate connection
- [ ] Connection preview line renders during drag
- [ ] Hover over breadboard hole highlights target (green for valid, red for invalid)
- [ ] Release on valid hole creates connection
- [ ] Release on invalid/occupied hole cancels connection
- [ ] Escape key cancels connection drag
- [ ] Connections render as persistent SVG lines after creation
- [ ] One-connector-per-hole constraint enforced
- [ ] Unit tests pass for connection actions
- [ ] Manual verification of all acceptance criteria
- [ ] No console errors or warnings
- [ ] No performance regressions

### Post-Completion

After this milestone:
- **Milestone 6** can implement overlays (voltage, current, errors)
- **Milestone 7** can remove PixiJS (all core interactions implemented in React)
- Future enhancement: Connection deletion interaction
- Future enhancement: Connection rerouting interaction
- Future enhancement: Multi-segment wire routing
- Future enhancement: Migrate to Rete ConnectionPlugin rendering if beneficial

### References

- Source review: `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`
- Actions/completions: `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.actions.md`
- Milestone 4 PR: #489 (Rete integration reference)
- Milestone 3 PR: #483 (Component drag interaction reference)
- Milestone 2 PR: #477 (Coordinate transformation reference)
- Milestone 1 PR: #471 (Controller pattern reference)
