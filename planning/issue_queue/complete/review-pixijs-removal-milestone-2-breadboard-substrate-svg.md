Render breadboard substrate in React/SVG with interactive hole highlighting

## Context

This task implements **Milestone 2 — Breadboard substrate in SVG** from the review document `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md` (lines 315-320).

**Prerequisites completed:**
- ✅ Milestone 0: React infrastructure set up (PR #465)
- ✅ Milestone 1: Renderer-agnostic controller extracted (PR #471)

**Current state:**
- React app renders placeholder UI at `?react=true`
- `BreadboardController` manages state without rendering dependencies
- `AppState` includes `breadboard.components` array
- Legacy PixiJS app continues to render breadboard substrate at holes/rails/labels

**Goal:**
Replace PixiJS breadboard substrate rendering with React/SVG implementation while maintaining feature parity for hole interaction and highlighting.

---

## Review Items Addressed

### Primary Item: Milestone 2 — Breadboard substrate in SVG (lines 315-320)

**Outcome:** Holes/rails/labels render, hover highlights work.

**Acceptance criteria (from review):**
1. Hover a hole highlights its row/rail net region
2. Click hole triggers the same action logic as today

---

## Detailed Implementation Instructions

### 1. Create SVG breadboard geometry module

**File:** `src/ui-react/BreadboardSvg.tsx`

**Requirements:**
- Render complete breadboard substrate using SVG elements
- Use **SVG symbol reuse** pattern (see performance strategy below)
- Implement in React with TypeScript
- Accept breadboard size and orientation as props
- Use world space coordinates aligned with existing geometry definitions

**Component structure:**
```typescript
interface BreadboardSvgProps {
  width: number;          // Breadboard width in world units
  height: number;         // Breadboard height in world units
  orientation: number;    // 0, 90, 180, 270 degrees
  onHoleClick?: (row: string, column: number) => void;
  onHoleHover?: (row: string, column: number) => void;
  onHoleLeave?: () => void;
}
```

**SVG elements to render:**
1. **Breadboard background** - Base rectangle with appropriate fill color
2. **Power rails** (top and bottom) - Red (+) and blue/black (-) rail strips with labels
3. **Terminal strips** - Rows A-J or similar, each with 5-hole connectivity groups
4. **Hole definitions** - Use `<defs><circle id="hole" r="..." /></defs>` + `<use>` pattern
5. **Labels** - Row letters (A-J) and column numbers (1-30 or 1-63)
6. **Divider** - Center channel separating left/right terminal strip halves

**Coordinate mapping:**
- Reference existing geometry constants from `src/core/breadboard-geometry.ts` (or equivalent)
- Hole positions must match what PixiJS currently uses for placement snapping
- Preserve existing world-space coordinate system (do not introduce new coordinate conventions)

### 2. Implement efficient hover/click interaction

**Performance requirement (from review lines 274-285):**
> Even the "small" breadboard has hundreds of holes. Rendering each as a full React component is slow.

**Strategy: Single event surface with math-based hit detection**

**File:** `src/ui-react/BreadboardSvg.tsx` (same component)

**Implementation approach:**
1. Render **one transparent overlay rectangle** covering entire breadboard
2. Attach `onPointerMove` and `onClick` handlers to this single element
3. On pointer event, compute nearest hole using math:
   - Transform pointer coordinates to world space
   - Map to grid (row, column) using hole spacing constants
   - Validate hole is within valid range
   - Call appropriate callback

**Hover highlight rendering:**
- Maintain React state for `hoveredHole: { row: string, column: number } | null`
- When hovering a hole, render highlight overlay:
  - For terminal strip holes: highlight the 5-hole connected group (horizontal strip)
  - For rail holes: highlight entire rail strip (30+ holes horizontally)
- Use SVG `<rect>` with semi-transparent fill and stroke
- Position based on computed bounds of connected region

**Example hover logic:**
```typescript
const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
  const point = getWorldSpaceCoordinate(event);
  const hole = findNearestHole(point);
  
  if (hole && isValidHole(hole)) {
    setHoveredHole(hole);
    onHoleHover?.(hole.row, hole.column);
  } else {
    setHoveredHole(null);
    onHoleLeave?.();
  }
};
```

### 3. Integrate breadboard SVG into React app

**File:** `src/ui-react/App.tsx`

**Requirements:**
- Replace placeholder UI with breadboard scene
- Subscribe to `BreadboardController` state
- Render `<BreadboardSvg />` with current orientation from state
- Pass hole interaction handlers that dispatch controller actions

**State subscription pattern:**
```typescript
const [state, setState] = useState<AppState>(controller.getState());

useEffect(() => {
  const unsubscribe = controller.subscribe(setState);
  return unsubscribe;
}, []);
```

**Hole click handler:**
```typescript
const handleHoleClick = (row: string, column: number) => {
  // Dispatch appropriate action based on current interaction mode
  // Example: Select hole, start connection creation, place floating component, etc.
  // This will depend on interaction state machine (deferred to Milestone 3/4)
  // For Milestone 2, implement basic logging or no-op
  console.log(`Hole clicked: ${row}${column}`);
};
```

### 4. Create viewport container with pan/zoom capability (basic)

**File:** `src/ui-react/BreadboardScene.tsx` (new)

**Requirements:**
- Wrap `<BreadboardSvg />` in container with transform management
- Implement basic pan/zoom using SVG `viewBox` manipulation
- React component manages viewport state
- Mouse wheel for zoom, drag for pan (standard controls)

**Props:**
```typescript
interface BreadboardSceneProps {
  controller: BreadboardController;
}
```

**Implementation notes:**
- Use `viewBox` attribute on root `<svg>` element
- Pan: Update viewBox x/y on drag
- Zoom: Scale viewBox width/height, keeping pointer position fixed
- Clamp zoom to reasonable bounds (0.1x to 5x or similar)
- This is a **simplified viewport** for Milestone 2; Rete AreaPlugin integration comes in Milestone 4

**Deferred to Milestone 4:**
- Full integration with Rete's AreaPlugin for shared coordinate space
- Complex gesture handling
- Mobile touch optimization

### 5. Visual styling to match existing breadboard appearance

**Color scheme (extract from current PixiJS renderer or define explicitly):**
- Breadboard base: Tan/beige background (#E8D4B0 or similar)
- Holes: Dark circles with slight shadow or inner stroke
- Power rail positive: Red background (#CC0000 or similar)
- Power rail negative: Blue/black background (#0000CC or #333333)
- Labels: Black text, readable size
- Hover highlight: Semi-transparent blue or yellow (#3399FF33 or #FFCC0033)

**CSS considerations:**
- Use inline SVG styling or CSS classes
- Consider theme support (light/dark) if already present in controller state
- Ensure accessibility: sufficient contrast, visible focus states

---

## Refactor Safety Rules (Mandatory)

Per task template:
1. **Do not change logic** unless identified as clear bug
2. **Do not maintain legacy endpoints** for backwards compatibility
3. **Always delete leftover, unused code**
4. **Do not leave comments** on changes made within code
5. **Do not rewrite functions from scratch** during refactors
6. **Ensure all tests and linting pass** after changes

**Application to this task:**
- We are **adding new** React components (not refactoring existing)
- No code deletion yet (PixiJS removal happens in Milestone 7)
- No logic changes to simulation or core geometry
- Comments should explain SVG performance patterns only (symbol reuse, event delegation) where non-obvious

---

## Testing Requirements

### Unit tests (if test infrastructure exists for React components)
- Test hole coordinate mapping logic (pointer → hole grid position)
- Test hover state transitions (null → hole → different hole → null)
- Test that callbacks are invoked with correct (row, column) parameters

### Manual verification (required)
1. Run `npm run dev` and navigate to `?react=true`
2. Verify breadboard substrate renders with:
   - All holes visible in correct grid layout
   - Power rails at top/bottom with labels (+/-)
   - Row letters (A-J) and column numbers visible
   - Center divider channel present
3. Hover over holes and verify:
   - Terminal strip holes: 5-hole group highlights
   - Rail holes: entire rail highlights
   - Highlight moves smoothly between holes
   - Highlight disappears when pointer leaves breadboard
4. Click holes and verify:
   - Console logs correct hole coordinates
   - No errors in browser console
5. Test breadboard rotation (if orientation toggle exists):
   - Verify holes remain correctly positioned at 0°, 90°, 180°, 270°
   - Verify labels rotate appropriately
6. Test pan/zoom:
   - Mouse wheel zooms in/out
   - Drag pans viewport
   - Zoom is centered on pointer position

### Acceptance criteria verification
✅ **Hover a hole highlights its row/rail net region**
- Verify by hovering various holes in terminal strips and rails
- Check that correct connected region highlights (not individual hole)

✅ **Click hole triggers the same action logic as today**
- For Milestone 2, "same action logic" means recognizing the hole was clicked
- Full interaction implementation deferred to Milestones 3-5
- Console logging or no-op is acceptable for Milestone 2

---

## Performance Strategy (from review lines 274-285)

**Critical requirements:**
1. **SVG symbol reuse**: Single `<circle>` definition, hundreds of `<use>` instances
2. **Single event surface**: One hit rectangle, not per-hole listeners
3. **Memoize geometry**: Compute hole positions once, cache in useMemo
4. **Minimize rerenders**: Use React.memo for static SVG geometry
5. **CSS transform for viewport**: Apply transform to wrapper `<g>`, not per-element

**Example symbol reuse pattern:**
```xml
<svg>
  <defs>
    <circle id="hole" r="4" fill="#222" stroke="#111" stroke-width="0.5"/>
  </defs>
  
  {holePositions.map(({x, y, id}) => (
    <use key={id} href="#hole" x={x} y={y} />
  ))}
</svg>
```

**Avoid:**
- ❌ Individual React components per hole (`<Hole row="A" col={1} />`)
- ❌ Per-hole event listeners (`onClick` on each circle)
- ❌ Recomputing geometry on every render

---

## Files to Create

1. `src/ui-react/BreadboardSvg.tsx` (new)
   - SVG rendering of breadboard substrate
   - Hole interaction via single event surface
   - Hover highlighting logic

2. `src/ui-react/BreadboardScene.tsx` (new)
   - Viewport container with pan/zoom
   - Controller state subscription
   - Event handler wiring

3. `src/ui-react/geometry/breadboard-layout.ts` (new, optional)
   - Pure functions for hole position computation
   - Coordinate mapping helpers
   - Hit detection math
   - Can be extracted from BreadboardSvg.tsx if it grows large

## Files to Modify

1. `src/ui-react/App.tsx`
   - Remove placeholder UI
   - Add `<BreadboardScene controller={controller} />`
   - Instantiate controller with `createInitialState()`

## Files NOT to Change (Milestone 2 scope)

- ❌ `src/core/**` - No simulation changes
- ❌ `src/library/**` - No component library changes
- ❌ `src/ui/breadboard-app.ts` - Legacy app unchanged (Milestone 7)
- ❌ `src/ui/pixi-renderer.ts` - Legacy renderer unchanged (Milestone 7)
- ❌ Component rendering - Deferred to Milestone 3
- ❌ Connection/wire rendering - Deferred to Milestone 4-5
- ❌ Overlays (voltage/current/error) - Deferred to Milestone 6

---

## Definition of Done

- [ ] `src/ui-react/BreadboardSvg.tsx` renders complete breadboard substrate in SVG
- [ ] Holes use symbol reuse pattern (1 definition + many `<use>` instances)
- [ ] Single event surface with math-based hit detection implemented
- [ ] Hover highlighting works for terminal strip groups (5 holes) and rails (full strip)
- [ ] Click handling logs correct hole coordinates
- [ ] `src/ui-react/BreadboardScene.tsx` provides pan/zoom viewport
- [ ] React app integrates breadboard scene with controller subscription
- [ ] Manual verification completed (see Testing Requirements section)
- [ ] No errors in browser console during interaction
- [ ] No performance degradation vs legacy PixiJS (smooth hover/pan/zoom)
- [ ] All existing unit tests still pass (no simulation/core changes)
- [ ] Linting passes (`npm run lint`)

---

## Next Steps After Milestone 2

After this task completes, the next actionable items are:

1. **Milestone 3**: Component rendering and manipulation (drag, rotate, select)
2. **Milestone 4**: Rete graph layer integration with aligned coordinate space
3. **Milestone 5**: Interactive wiring via Rete
4. **Milestone 6**: Overlays (voltage, current, errors)
5. **Milestone 7**: Remove PixiJS dependencies entirely

---

## Reference Sections from Review

**DR-1: SVG-first rendering** (lines 87-96)
- SVG is DOM-based, inspectable, testable
- Coordinates map to scalable viewBox
- Performance concerns addressed via symbol reuse

**DR-3: One shared coordinate system** (lines 110-121)
- Single world space for breadboard, components, connections, overlays
- Eliminates coordinate transform drift
- Rete AreaPlugin becomes viewport source of truth (Milestone 4+)

**Breadboard substrate rendering plan** (lines 191-199)
- Holes as repeated symbols
- Rail backgrounds and labels as SVG shapes/text
- Hover via transparent hit layer + math mapping

**Performance strategy** (lines 274-285)
- Symbol reuse, single event surface, memoize geometry
- Minimize rerenders, CSS transform for pan/zoom

---

## Migration Safety

This is the **first rendering milestone** that produces visible UI in React.

**Safety mechanisms:**
- Feature flag (`?react=true`) keeps legacy UI available
- No changes to core simulation or component library
- Controller integration uses observer pattern (already tested in Milestone 1)
- Incremental: substrate only (no components, connections, or overlays yet)

**Rollback plan:**
- If performance is unacceptable, revert PR and reassess SVG strategy
- If coordinate mapping is wrong, compare against PixiJS constants
- Legacy PixiJS continues to work as reference implementation
