Render components in React/SVG with drag, rotate, and selection interactions

## Context

This task implements **Milestone 3 — Component rendering and manipulation** from the review document `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md` (lines 321-328).

**Prerequisites completed:**
- ✅ Milestone 0: React infrastructure set up (PR #465)
- ✅ Milestone 1: Renderer-agnostic controller extracted (PR #471)
- ✅ Milestone 2: Breadboard substrate SVG rendered (PR #477)

**Current state:**
- React app renders breadboard substrate with interactive holes at `?react=true`
- `BreadboardController` manages component state in `AppState.breadboard.components`
- Pan/zoom viewport works via `BreadboardScene.tsx`
- Coordinate system (`src/ui-react/geometry/breadboard-layout.ts`) established
- Legacy PixiJS app continues to render and manipulate components

**Goal:**
Render components in React/SVG and implement interactive manipulation (select, drag, rotate) while maintaining feature parity with the existing PixiJS implementation.

---

## Review Items Addressed

### Primary Item: Milestone 3 — Component rendering and manipulation (lines 321-328)

**Outcome:** Components render and can be selected, dragged, rotated.

**Acceptance criteria (from review):**
1. Drag-to-move works with snap-to-hole insertion
2. Rotation works with correct pin mapping
3. Undo/redo works

**Related review guidance:**

**Component rendering requirements** (lines 201-210):
- Component body as SVG shape (path/rect/circle)
- Pins/legs as ports (SVG or Rete-rendered)
- Selection outline
- Rotate handle icon
- Clean SVG styles first; "pretty" details (glow, gradients) can be added after parity

**Interaction model requirements** (lines 242-270):
- Click component → select
- Drag component → move with snapping
- Rotate (R key + handle)
- Delete selected
- Undo/redo
- Explicit state machine for interaction modes:
  - `idle`
  - `draggingComponent`
  - `draggingFloatingComponent`
  - Other modes (for future milestones)

**Decision Record DR-4** (lines 124-132):
- Controller logic split: "engine" vs "view"
- Extract renderer-agnostic controller (already done in Milestone 1)
- React components render from state
- State transitions managed by controller

---

## Detailed Implementation Instructions

### Overview

This milestone adds visual component rendering and interactive manipulation to the React UI. Components are already managed by the controller state; this task makes them visible and interactive.

### 1. Create component SVG renderer module

**File:** `src/ui-react/components/ComponentRenderer.tsx`

**Requirements:**
- Render a single component as an SVG group (`<g>`)
- Use existing component library types from `src/library/`
- Position component using pins mapped to breadboard holes via existing geometry
- Accept component data and optional selection/hover state as props
- Implement clean SVG styling (no photorealistic effects yet)

**Component types to render (minimum viable set):**
- Resistor: body rectangle with color bands (use existing `getResistorColorBands()` logic)
- LED: body shape with appropriate orientation
- Power/Ground symbols: simple shapes
- Wire: line between pin endpoints
- Optional: Other component types from library as capacity allows

**Visual requirements:**
- Component body with appropriate shape and color
- Pins/legs as small circles or rectangles at connection points
- Selection outline when component is selected (stroke highlight)
- Rotation handle icon when component is selected (small circle with rotate symbol)

**Example structure:**
```typescript
interface ComponentRendererProps {
  component: Component;
  isSelected: boolean;
  isHovered: boolean;
  onPointerDown?: (e: React.PointerEvent, componentId: string) => void;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({ component, isSelected, isHovered, onPointerDown }) => {
  // Map pins to pixel coordinates using positionToPixels() from geometry module
  // Compute component body geometry based on pin positions
  // Render SVG elements
  
  return (
    <g data-component-id={component.id} onPointerDown={(e) => onPointerDown?.(e, component.id)}>
      {/* Component body shape */}
      <rect {...bodyGeometry} fill={color} stroke={outlineColor} />
      
      {/* Pins/legs */}
      {component.pins.map(pin => (
        <circle key={pin.id} cx={pinX} cy={pinY} r={4} fill="#888" />
      ))}
      
      {/* Selection outline (if selected) */}
      {isSelected && <rect {...bodyGeometry} fill="none" stroke="#3399ff" strokeWidth={2} />}
      
      {/* Rotation handle (if selected) */}
      {isSelected && <RotateHandle x={handleX} y={handleY} />}
    </g>
  );
};
```

**Implementation notes:**
- Use `React.memo` to prevent unnecessary rerenders
- Use existing coordinate transform functions from `src/ui-react/geometry/breadboard-layout.ts`
- Reference existing component rendering logic in `src/ui/pixi-renderer.ts` (lines where components are drawn) for visual details
- Keep rendering pure; no controller dispatch in this component

### 2. Create component layer container

**File:** `src/ui-react/components/ComponentsLayer.tsx`

**Requirements:**
- Render all components from controller state
- Handle component selection (click to select)
- Manage drag state (mousedown → mousemove → mouseup)
- Integrate with controller actions

**Component structure:**
```typescript
interface ComponentsLayerProps {
  controller: BreadboardController;
}

export const ComponentsLayer: React.FC<ComponentsLayerProps> = ({ controller }) => {
  const [state, setState] = useState<AppState>(controller.getState());
  
  useEffect(() => {
    return controller.subscribe(setState);
  }, [controller]);
  
  const components = state.breadboard.components;
  const selectedId = state.breadboard.selectedComponentId;
  
  const handleComponentPointerDown = (e: React.PointerEvent, componentId: string) => {
    // Check if clicking rotation handle vs component body
    // Dispatch COMPONENT_SELECTED or DRAG_STARTED action
  };
  
  return (
    <g className="components-layer">
      {components.map(component => (
        <ComponentRenderer
          key={component.id}
          component={component}
          isSelected={component.id === selectedId}
          onPointerDown={handleComponentPointerDown}
        />
      ))}
    </g>
  );
};
```

**Implementation notes:**
- Subscribe to controller state updates
- Use selector functions from `src/ui-controller/selectors.ts`
- Dispatch actions to controller, not direct state mutation

### 3. Implement component drag interaction

**Requirements:**
- Drag initiated by pointer down on component body (not rotation handle)
- During drag, show ghost preview at pointer position
- Snap preview to nearest valid hole positions using pin constraints
- On pointer up, dispatch `COMPONENT_MOVED` action if position changed
- On pointer up without movement, dispatch `COMPONENT_SELECTED` action

**Drag state management:**
- Use controller actions: `DRAG_STARTED`, `DRAG_MOVED`, `DRAG_COMPLETED`, `DRAG_CANCELLED`
- Store drag state in `AppState.componentDrag` (already defined in controller)
- Compute valid snap positions during drag using existing pin-to-hole validation logic

**Snapping logic:**
- Reference existing snapping behavior in `src/ui/breadboard-app.ts` (look for placement validation)
- Use `isValidPosition()` from geometry module
- Ensure all pins can connect to valid holes after snap

**Implementation approach:**
```typescript
const handleDragStart = (componentId: string, startX: number, startY: number) => {
  controller.dispatch({
    type: 'DRAG_STARTED',
    componentId,
    startPosition: { x: startX, y: startY }
  });
};

const handleDragMove = (currentX: number, currentY: number) => {
  // Compute snap position from current pointer position
  // Validate all pins can connect to holes
  controller.dispatch({
    type: 'DRAG_MOVED',
    currentPosition: { x: currentX, y: currentY },
    snapPosition: validatedPosition
  });
};

const handleDragComplete = () => {
  controller.dispatch({ type: 'DRAG_COMPLETED' });
};
```

### 4. Implement rotation interaction

**Requirements:**
- Rotation initiated by:
  1. Clicking rotation handle on selected component, OR
  2. Pressing 'R' key when component is selected
- Each rotation increments by 90 degrees (0°, 90°, 180°, 270°)
- Pin mappings must update correctly with rotation
- Rotation handle position updates visually

**Rotation handle:**
- Small circle icon positioned offset from component body
- Shows rotate icon (e.g., circular arrow SVG path)
- Only visible when component is selected
- Clicking handle dispatches `COMPONENT_ROTATED` action

**Keyboard shortcut:**
- Listen for 'R' keypress at document or scene level
- Check if component is selected
- Dispatch `COMPONENT_ROTATED` action

**Implementation approach:**
```typescript
const handleRotateClick = (componentId: string) => {
  controller.dispatch({
    type: 'COMPONENT_ROTATED',
    componentId
  });
};

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'r' || e.key === 'R') {
      const selectedId = state.breadboard.selectedComponentId;
      if (selectedId) {
        controller.dispatch({
          type: 'COMPONENT_ROTATED',
          componentId: selectedId
        });
      }
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [state.breadboard.selectedComponentId]);
```

**Visual feedback:**
- Component should animate rotation (optional; can use CSS transform)
- Or: immediate rotation with updated pin positions

### 5. Implement selection interaction

**Requirements:**
- Click component body → select component
- Click empty space (breadboard background) → deselect all
- Only one component selected at a time (MVP; multi-select deferred)
- Selected component shows outline and rotation handle

**Implementation approach:**
```typescript
const handleComponentClick = (componentId: string) => {
  controller.dispatch({
    type: 'COMPONENT_SELECTED',
    componentId
  });
};

const handleBackgroundClick = () => {
  controller.dispatch({
    type: 'COMPONENT_SELECTED',
    componentId: null  // Deselect
  });
};
```

### 6. Implement delete interaction

**Requirements:**
- Press 'Delete' or 'Backspace' key when component is selected → delete component
- Dispatch `COMPONENT_DELETED` action
- Component removed from state and no longer renders

**Implementation approach:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.repeat) {
      const selectedId = state.breadboard.selectedComponentId;
      if (selectedId) {
        controller.dispatch({
          type: 'COMPONENT_DELETED',
          componentId: selectedId
        });
      }
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [state.breadboard.selectedComponentId]);
```

### 7. Integrate component layer into scene

**File:** `src/ui-react/BreadboardScene.tsx`

**Modifications:**
- Add `<ComponentsLayer controller={controller} />` after breadboard substrate
- Ensure component layer renders above holes but below overlays
- Z-order: substrate → components → overlays

**Example:**
```typescript
<svg viewBox={viewBox}>
  <BreadboardSvg {...breadboardProps} />
  <ComponentsLayer controller={controller} />
  {/* Overlays will be added in future milestones */}
</svg>
```

### 8. Test and verify interactions

**Manual testing checklist:**
- [ ] Load React UI with `?react=true`
- [ ] Components from state render visually on breadboard
- [ ] Click component → component becomes selected (outline appears)
- [ ] Click background → component deselects
- [ ] Drag component → ghost preview follows pointer
- [ ] Drag component → preview snaps to valid positions
- [ ] Release drag → component moves to snapped position
- [ ] Press 'R' with component selected → component rotates 90°
- [ ] Click rotation handle → component rotates 90°
- [ ] Press 'Delete' with component selected → component is removed
- [ ] All interactions update controller state (log state changes to verify)

**Test data:**
- If controller starts with empty components array, temporarily add test components for verification
- Or: integrate with component palette to drag new components onto breadboard (if palette exists)

### 9. Verify undo/redo compatibility

**Requirements:**
- All component actions (add, move, rotate, delete) must work with undo/redo
- Undo/redo system already exists in controller (from Milestone 1)
- Test that component changes are reversible

**Testing:**
- Move component → press Ctrl+Z → component returns to original position
- Rotate component → press Ctrl+Z → component returns to original rotation
- Delete component → press Ctrl+Z → component reappears
- Press Ctrl+Y after undo → action is redone

**Implementation check:**
- Verify controller reducer properly handles undo/redo for component actions
- If undo/redo is not yet integrated, add to controller reducer (see existing History/Commands patterns in codebase)

---

## Constraints and Requirements

### Must preserve existing behavior:
- Component library types and interfaces (`src/library/**`)
- Simulation and extraction logic (`src/core/**`)
- Controller state management (`src/ui-controller/**`)
- Breadboard geometry and coordinate system
- Pin-to-hole mapping logic

### Must NOT do:
- Do not modify simulation logic
- Do not modify component library definitions
- Do not remove or modify PixiJS rendering (it stays until Milestone 7)
- Do not add "photorealistic" styling yet (clean SVG only)
- Do not implement multi-select (defer to future work)
- Do not implement wire rendering (that's Milestone 5)

### Refactor safety (from issue template):
1. If moving code: move verbatim first, then improve
2. Do not change logic unless it's a clear bug
3. Do not maintain legacy endpoints
4. Always delete unused code
5. Do not leave comments on changes within code
6. Do not rewrite functions from scratch
7. Ensure tests and linting pass

### Performance considerations:
- Use `React.memo` on component renderers
- Minimize rerenders by subscribing to controller state efficiently
- Use CSS transforms for visual updates where possible
- Avoid per-component event listeners (prefer event delegation where feasible)

---

## Expected Files

### New files:
- `src/ui-react/components/ComponentRenderer.tsx`
- `src/ui-react/components/ComponentsLayer.tsx`
- `src/ui-react/components/RotateHandle.tsx` (optional, can be inline)
- `src/ui-react/interactions/drag-handler.ts` (optional, utility functions)

### Modified files:
- `src/ui-react/BreadboardScene.tsx` (add ComponentsLayer)
- `src/ui-react/App.tsx` (possibly add keyboard event handlers at top level)

### Files NOT changed:
- `src/core/**` (simulation logic)
- `src/library/**` (component definitions)
- `src/ui/**` (PixiJS renderer remains untouched)
- `src/ui-controller/**` (may need minor additions if missing actions)

---

## Definition of Done

This milestone is complete when:

✅ **Components render visually in React/SVG UI**
- All components in `state.breadboard.components` are visible
- Component shapes are recognizable (resistor, LED, power, ground, etc.)
- Pins/legs are visible at correct positions

✅ **Selection works**
- Click component → outline appears
- Click background → outline disappears
- Only one component selected at a time

✅ **Drag-to-move works with snap-to-hole**
- Drag component → ghost preview follows pointer
- Preview snaps to valid hole positions
- Release → component moves to snapped position
- Invalid positions are rejected (visual feedback optional)

✅ **Rotation works with correct pin mapping**
- Press 'R' or click rotation handle → component rotates 90°
- Pins remain connected to correct holes after rotation
- Rotation is visually correct

✅ **Delete works**
- Press 'Delete' with component selected → component is removed

✅ **Undo/redo works**
- All component actions are reversible via Ctrl+Z / Ctrl+Y
- State correctly restored after undo/redo

✅ **No regressions**
- Breadboard substrate still works (hover, pan, zoom)
- Controller state management still works
- Legacy PixiJS UI still works (feature flag)
- Existing tests pass

---

## Testing Strategy

### Unit tests (if time permits):
- Test `ComponentRenderer` with mock component data
- Test drag snap calculations
- Test rotation pin mapping updates

### Manual verification (required):
- Visual inspection: components render correctly
- Interaction testing: drag, rotate, select, delete all work
- Controller integration: state updates correctly for all actions
- Undo/redo: all actions reversible

### Playwright (if visual regression enabled):
- Update baselines for React UI with components
- Add interaction tests for drag/rotate

---

## References

**Source review:**
- `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`
  - Lines 321-328: Milestone 3 definition
  - Lines 201-210: Component rendering requirements
  - Lines 242-270: Interaction model requirements
  - Lines 124-132: DR-4 Controller logic split

**Existing code to reference:**
- `src/ui/pixi-renderer.ts`: Component rendering implementation (lines where components are drawn)
- `src/ui/breadboard-app.ts`: Interaction handlers (drag, rotate, select)
- `src/library/**`: Component type definitions
- `src/ui-controller/types.ts`: Action types and state shape
- `src/ui-react/geometry/breadboard-layout.ts`: Coordinate transforms

---

## Notes

- This milestone focuses on **component rendering and manipulation only**
- Wire rendering is deferred to Milestone 5 (Rete integration)
- Overlays are deferred to Milestone 6
- PixiJS removal is deferred to Milestone 7
- Keep feature flag active; both UIs should work side-by-side
- Test in both React UI (`?react=true`) and legacy UI to ensure no regressions
