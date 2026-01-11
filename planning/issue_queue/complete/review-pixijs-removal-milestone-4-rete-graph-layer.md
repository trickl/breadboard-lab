Integrate Rete editor in React UI with breadboard coordinate alignment

## Context

This task implements **Milestone 4 — Rete graph layer visible and aligned** from the review document `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md` (lines 329-335).

**Prerequisites completed:**

- ✅ Milestone 0: React infrastructure set up (PR #465)
- ✅ Milestone 1: Renderer-agnostic controller extracted (PR #471)
- ✅ Milestone 2: Breadboard substrate SVG rendered (PR #477)
- ✅ Milestone 3: Component rendering and manipulation (PR #483)

**Current state:**

- React app renders breadboard substrate with 420 interactive holes at `?react=true`
- Components render as SVG with drag, rotate, and selection interactions
- `BreadboardController` manages all application state with reducer pattern
- Pan/zoom viewport works via SVG viewBox manipulation in `BreadboardScene.tsx`
- Coordinate system (`src/ui-react/geometry/breadboard-layout.ts`) established with 26px hole spacing
- Existing `ReteManager` in `src/core/rete-manager.ts` manages Rete graph in legacy PixiJS app
- Rete packages installed: `rete@^2.0.6`, `rete-area-plugin@^2.1.5`, `rete-connection-plugin@^2.0.5`

**Goal:**
Integrate Rete.js editor into React UI to render component nodes, ports, and connections, aligning Rete's coordinate space with the breadboard world space and synchronizing pan/zoom across all layers.

---

## Review Items Addressed

### Primary Item: Milestone 4 — Rete graph layer visible and aligned (lines 329-335)

**Outcome:** Rete editor runs in DOM and is aligned with breadboard world space.

**Acceptance criteria (from review):**

1. Connections exist and render visually
2. Pan/zoom keeps all layers aligned

**Related review guidance:**

**Decision Record DR-2: Rete renders the graph layer, not the entire breadboard** (lines 98-108):

- Use Rete's React renderer for:
  - Component nodes (visual bodies)
  - Ports/legs (connection endpoints)
  - Connections (wires)
- Do NOT model every breadboard hole as a rendered Rete node
- Breadboard substrate remains pure SVG (already implemented in Milestone 2)

**Decision Record DR-3: One shared coordinate system** (lines 110-121):

- Define a single coordinate system (world space) for:
  - Breadboard geometry
  - Component positions
  - Connection endpoints
  - Overlays
- **Rete's AreaPlugin pan/zoom becomes the source of truth for the viewport transform**
- Eliminates coordinate drift between layers

**Target architecture** (lines 135-186):

- `src/ui-react/rete/ReteGraphLayer.tsx` (suggested new module)
- Integrate Rete editor using React renderer
- Rete renderer must be:
  - Maintained upstream
  - Compatible with Rete v2.x
  - MIT-compatible

**Connection rendering** (lines 212-217):

- Use Rete's connection plugin + React renderer to draw connections
- Coordinate endpoints in world space to align with holes
- If Rete connection visuals can't match breadboard style, render connections ourselves in SVG from `reteManager.getConnections()` as temporary bridge

---

## Implementation Requirements

### 1. Add Rete React renderer package

**Research and add the official Rete React renderer:**

- Search npm for Rete v2 React renderer package (likely named `rete-react-plugin` or similar)
- Verify package is:
  - Compatible with `rete@^2.0.6`
  - MIT-licensed or compatible
  - Actively maintained
- Add to `package.json` dependencies
- Update `package-lock.json` via `npm install`

**If no official React renderer exists:**

- Document the absence in a comment/note
- Fall back to rendering connections manually from `reteManager.getConnections()` using existing SVG approach
- Plan for custom Rete DOM integration without official renderer

### 2. Create ReteGraphLayer component

**Create `src/ui-react/rete/ReteGraphLayer.tsx`:**

- React component that instantiates and manages Rete editor
- Props:
  - `controller: BreadboardController` - for state subscription
  - `svgRef: RefObject<SVGSVGElement>` - for coordinate alignment
- Initialize Rete editor with:
  - `NodeEditor` instance
  - `AreaPlugin` for pan/zoom management
  - `ConnectionPlugin` for connection rendering
  - React renderer plugin (if available)
- Mount Rete to a DOM container element
- Position/style container to overlay on breadboard scene

**Coordinate alignment strategy:**

- Rete's AreaPlugin manages viewport transform (pan/zoom)
- Synchronize Rete's transform with React's SVG viewBox
- Options:
  - **Option A (preferred per DR-3):** Make Rete AreaPlugin the source of truth
    - Listen to Rete area transform changes
    - Update parent BreadboardScene's viewBox to match
  - **Option B (fallback):** Keep SVG viewBox as source of truth
    - Listen to viewBox changes in BreadboardScene
    - Update Rete area transform to match
- Choose Option A if feasible; document decision in code comments

**Component/connection synchronization:**

- Subscribe to controller state: `controller.subscribe((state) => { ... })`
- On state change:
  - Read `state.breadboard.components`
  - Synchronize Rete nodes to match components:
    - Add nodes for new components
    - Remove nodes for deleted components
    - Update node positions for moved components
- Existing `ReteManager` methods can be adapted or reused:
  - `addComponentNode(component)` logic
  - `removeComponentNode(componentId)` logic
  - Connection management logic

**Rendering approach:**

- If React renderer available:
  - Configure Rete to render using React renderer
  - Render component nodes as simple shapes (rectangles with labels)
  - Render ports as circles at leg positions
  - Render connections as SVG paths
- If no React renderer:
  - Create custom connection rendering:
    - Query `editor.getConnections()` from Rete
    - Render connections as SVG paths in a separate layer
    - Use same coordinate system as breadboard

### 3. Integrate ReteGraphLayer into BreadboardScene

**Modify `src/ui-react/BreadboardScene.tsx`:**

- Import and render `<ReteGraphLayer>` component
- Layer order (bottom to top):
  1. `<BreadboardSvg>` (substrate - already implemented)
  2. `<ReteGraphLayer>` (Rete nodes/connections - NEW)
  3. `<ComponentsLayer>` (component visuals - already implemented)
- Pass required props to ReteGraphLayer:
  - `controller={controller}`
  - `svgRef={svgRef}`
- If using Option A (Rete as pan/zoom source):
  - Remove or disable existing SVG viewBox pan/zoom handlers
  - Let Rete AreaPlugin handle pan/zoom
  - Sync viewBox from Rete transform

### 4. Create minimal test connections

**For immediate verification:**

- Create test data in `App.tsx` initial state with at least 2 connections:
  - Example: Resistor leg 0 → hole at (5, 8)
  - Example: Resistor leg 1 → hole at (5, 9)
- Store connections in controller state (may need to extend `AppState` if not present)
- Connections should render visually in Rete layer

**Connection data structure:**

- Reuse existing connection types from `src/core/rete-manager.ts`:
  - `Connection` type (Rete connection between component leg and hole)
  - Connection includes source node/port and target node/port
- Store in controller state (e.g., `state.connections` array)

### 5. Pan/zoom synchronization testing

**Verify alignment:**

- Pan the viewport → all layers (substrate, Rete, components) move together
- Zoom the viewport → all layers scale together, centered on pointer
- No visual drift or coordinate misalignment between layers
- Connections endpoints align with component legs and breadboard holes

**Test cases:**

- Pan via drag
- Zoom via mouse wheel
- Pan then zoom
- Zoom then pan
- Rapid pan/zoom transitions

---

## Technical Constraints

### Coordinate system requirements (DR-3)

- Breadboard uses 26px hole spacing (HOLE_SPACING constant)
- Hole visual radius: 7px
- World space origin: top-left of breadboard
- Rete node positions must use same coordinate system
- Component leg positions calculated via `positionToPixels()` from `src/ui-react/geometry/breadboard-layout.ts`

### Rete integration constraints

- Rete editor must be instantiated once and reused (not recreated on every render)
- Use `useRef` or `useMemo` in React to maintain editor instance
- Clean up editor on component unmount (`editor.destroy()`)
- Rete AreaPlugin and ConnectionPlugin must be configured before editor is used

### Performance considerations

- Do not create Rete nodes for breadboard holes (hundreds of nodes would be expensive)
- Only create Rete nodes for components (typically < 50 components)
- Minimize Rete node updates (only update on actual component changes)
- Use Rete's built-in change detection where possible

---

## Acceptance Criteria

### Visual verification (`?react=true`)

- [ ] Rete editor renders in DOM (check browser dev tools)
- [ ] Component nodes visible in Rete layer
- [ ] At least 2 test connections render visually as lines/paths
- [ ] Connection endpoints align with component leg positions
- [ ] Connection endpoints align with breadboard hole positions (if connections terminate at holes)
- [ ] No visual offset or drift between layers

### Interaction verification

- [ ] Pan with mouse drag → all layers move together (substrate, Rete, component visuals)
- [ ] Zoom with mouse wheel → all layers scale together
- [ ] Zoom centered on pointer position works correctly
- [ ] No console errors related to Rete
- [ ] No console warnings about coordinate mismatches

### Code quality

- [ ] TypeScript compilation succeeds with no errors
- [ ] ESLint passes with no new warnings
- [ ] Rete editor instance properly cleaned up on unmount
- [ ] Comments explain coordinate synchronization strategy
- [ ] Decision on coordinate source of truth (Option A vs B) documented in code

### State management

- [ ] Connections stored in controller state (if not already present)
- [ ] ReteGraphLayer subscribes to controller state changes
- [ ] Rete nodes synchronized with `state.breadboard.components`
- [ ] No direct state mutation (all changes via controller actions)

---

## Implementation Strategy

### Phase 1: Research and setup

1. Research Rete v2 React renderer package
   - Search npm: "rete react renderer", "rete-react-plugin"
   - Check Rete.js official docs for React integration
   - Verify license and compatibility
2. Install Rete React renderer (or document if unavailable)
3. Create `src/ui-react/rete/` directory

### Phase 2: Basic Rete integration

1. Create `ReteGraphLayer.tsx` with minimal Rete editor setup
2. Initialize NodeEditor, AreaPlugin, ConnectionPlugin
3. Mount Rete to DOM container
4. Render ReteGraphLayer in BreadboardScene (initially invisible/empty)
5. Verify Rete editor instantiates without errors

### Phase 3: Node synchronization

1. Subscribe to controller state in ReteGraphLayer
2. Create Rete nodes for each component in `state.breadboard.components`
3. Position nodes using breadboard coordinate system (26px spacing)
4. Update nodes when components change (add/remove/move)
5. Verify nodes appear at correct positions

### Phase 4: Connection rendering

1. Add connection data to controller state (if not present)
2. Create test connections in App.tsx initial state
3. Render connections using Rete ConnectionPlugin
4. Verify connections render as visual lines/paths
5. Verify connection endpoints align with component legs and holes

### Phase 5: Coordinate synchronization

1. Implement pan/zoom sync between Rete and SVG viewBox
2. Choose Option A (Rete as source) or Option B (SVG as source)
3. Add event listeners for transform changes
4. Update dependent transforms when source changes
5. Test alignment with pan/zoom interactions

### Phase 6: Testing and refinement

1. Test pan/zoom alignment thoroughly
2. Test with multiple components and connections
3. Fix any coordinate drift or misalignment issues
4. Add code comments explaining architecture decisions
5. Remove test connections from App.tsx (or mark as temporary)

---

## Files to Create

**New files:**

- `src/ui-react/rete/ReteGraphLayer.tsx` (Rete editor integration)

**Files to modify:**

- `package.json` (add Rete React renderer dependency)
- `src/ui-react/BreadboardScene.tsx` (integrate ReteGraphLayer)
- `src/ui-react/App.tsx` (add test connections to initial state)
- `src/ui-controller/types.ts` (add connections to AppState if not present)

**Files to reference (not modify):**

- `src/core/rete-manager.ts` (existing Rete integration logic)
- `src/ui-react/geometry/breadboard-layout.ts` (coordinate conversion functions)
- `src/ui-controller/breadboard-controller.ts` (state management)

---

## Success Criteria Summary

**Minimal viable outcome:**

- Rete editor renders in React UI
- At least 2 test connections visible
- Pan/zoom synchronized across all layers
- No coordinate drift or misalignment

**Stretch goals (optional for this milestone):**

- Rete nodes styled to match component visuals
- Connection styling matches breadboard aesthetic
- Interactive connection creation (defer to Milestone 5 if out of scope)

---

## Notes and Warnings

**Refactor safety (from task template):**

- When adapting ReteManager logic, move code verbatim first
- Update imports/call sites to make it run
- Only then do targeted improvements

**Constraints (from task template):**

1. Do not change logic unless it's a clear bug
2. Do not maintain legacy endpoints for backwards compatibility
3. Always delete unused code
4. Do not leave comments on changes within code (use git history)
5. Do not rewrite functions from scratch during refactors
6. Ensure all tests and linting pass after changes

**Coordinate system alignment (critical):**

- This milestone is the foundation for all subsequent milestones (5, 6, 7)
- Coordinate drift will compound in later milestones
- Test alignment thoroughly before proceeding
- Document the chosen coordinate synchronization approach clearly

**Connection rendering (temporary bridge acceptable):**

- If Rete React renderer is unavailable or incompatible, render connections manually
- Query `editor.getConnections()` and render as SVG paths
- This is explicitly acceptable per review line 217
- Full Rete rendering can be added later if renderer becomes available

**Decision Record DR-3 (lines 110-121) is the north star for this milestone:**

> "Rete's AreaPlugin pan/zoom becomes the source of truth for the viewport transform."

**If this creates conflicts with existing SVG pan/zoom:**

- Prefer Rete as source of truth
- Update BreadboardScene to read from Rete transform
- Disable or remove SVG-based pan/zoom handlers
- Document the change clearly

**Legacy PixiJS app:**

- Keep existing PixiJS app functional during this milestone
- Do not modify `src/ui/breadboard-app.ts` or `src/ui/pixi-renderer.ts`
- React UI and PixiJS UI remain independent via feature flag

---

## Related Review Sections

- Lines 329-335: Milestone 4 definition and acceptance criteria
- Lines 98-108: Decision Record DR-2 (Rete renders graph layer)
- Lines 110-121: Decision Record DR-3 (shared coordinate system)
- Lines 135-186: Target architecture with Rete integration
- Lines 212-217: Connection rendering guidance
- Lines 274-285: Performance strategy (applies to Rete node management)
