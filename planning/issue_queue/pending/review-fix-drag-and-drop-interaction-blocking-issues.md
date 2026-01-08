Fix drag-and-drop and breadboard interaction blocking issues

## Source Review
- **Review Document:** `planning/reviews/review-2026-01-08.md`
- **Sections Addressed:** Section 5 (Component Interaction & Manipulation), Section 11 (Critical Functional Blocker - partial), Section 12 (Priority Summary - Blocking Issues)

## Context

The review identifies critical functional blockers that prevent meaningful circuit editing. These are the **highest priority issues** in the entire review, classified as "Blocking Issues" that must be resolved before other improvements can be meaningfully evaluated.

### Current State
According to the review (Section 11, lines 203-210):
> "The most serious issue is that **core interaction does not currently work**."

Specifically:
- Components cannot be reliably dragged
- Horizontal dragging does not work correctly
- Individual component legs cannot be repositioned
- Breadboard holes/slots cannot always be selected

### Impact
Until these issues are resolved, meaningful editing is not possible. Users cannot:
- Freely position components on the breadboard
- Adjust component leg positions independently
- Reliably select breadboard holes for wiring or component placement

---

## Review Items to Address

### Section 5.1: Drag-and-Drop Issues (lines 101-107)

**Exact quote from review:**
> - Dragging components is unreliable or broken.
> - Horizontal dragging does not work correctly.
> - It is not possible to:
>   - Drag a component freely
>   - Drag an individual leg independently
> - The interaction feels frustrating and inconsistent.

**Required outcomes:**
1. Components must drag reliably in all directions (horizontal and vertical)
2. Users must be able to drag an entire component as a unit
3. The dragging interaction must be consistent and predictable

### Section 5.2: Expected Interaction Model (lines 109-113)

**Exact quote from review:**
> - Users should be able to:
>   - Drag an entire component as a unit
>   - Select and move individual legs independently
> - This is essential for realistic breadboard usage.

**Required outcomes:**
1. Implement full-component dragging (move all legs together)
2. Implement individual leg dragging (reposition one pin at a time)
3. Both interaction modes must work reliably

### Section 5.3: Breadboard Slot Selection Bug (lines 115-118)

**Exact quote from review:**
> - Users should be able to select **any breadboard hole or slot** directly.
> - This does not appear to work reliably.
> - This appears to be a bug rather than a design decision.

**Required outcome:**
1. All breadboard holes must be reliably selectable via click
2. Selection should provide clear visual feedback

### Section 11: Critical Functional Blocker (lines 201-210)

**Exact quote from review:**
> The most serious issue is that **core interaction does not currently work**.
>
> Specifically:
> - Clicking Quick Select does nothing [RESOLVED ✅]
> - Components cannot be reliably dragged
> - Legs cannot be repositioned
> - Breadboard holes cannot always be selected
>
> Until these issues are resolved, meaningful editing is not possible.

**Status:**
- Quick Select clicking: RESOLVED in PR #285 ✅
- **Component dragging: UNRESOLVED** ❌
- **Leg repositioning: UNRESOLVED** ❌
- **Breadboard hole selection: UNRESOLVED** ❌

### Section 12: Priority Summary - Blocking Issues (lines 217-220)

**Exact quote from review:**
> ### Blocking Issues
> - Drag-and-drop failures
> - Quick Select click produces no component [RESOLVED ✅]
> - Unreliable breadboard hole selection

**Status:**
- Quick Select: RESOLVED in PR #285 ✅
- **Drag-and-drop failures: UNRESOLVED** ❌
- **Unreliable breadboard hole selection: UNRESOLVED** ❌

---

## Detailed Implementation Instructions

### Investigation Phase

1. **Identify the current rendering and interaction system:**
   - The review (Section 7, lines 139-144) notes: "The application is intended to use **React + Konva**" but "Visually, it still appears to behave like **PixiJS**"
   - Determine which rendering stack is actually in use for component interaction
   - Look for:
     - Konva-based interaction handlers (Stage, Layer, Group, drag events)
     - PixiJS-based interaction handlers (InteractionManager, pointerdown, pointermove)
     - React-Konva wrapper components
   - Check feature flags or migration states that might explain mixed behaviour

2. **Locate component drag-and-drop implementation:**
   - Search for component dragging logic in the codebase
   - Identify event handlers for:
     - Component selection (pointerdown/mousedown/click)
     - Component dragging (pointermove/mousemove/drag)
     - Component drop (pointerup/mouseup/dragend)
   - Look for coordinate transformation logic (screen space → breadboard grid)
   - Check for snapping/constraint logic that might be causing issues

3. **Locate breadboard hole selection implementation:**
   - Find breadboard rendering code
   - Identify hole/slot hit detection logic
   - Check for z-index or layering issues that might block hole selection
   - Look for event bubbling or capture issues

4. **Review existing component structure:**
   - Understand how components are represented:
     - Do components have a single position + multi-pin layout?
     - Or are individual legs/pins independently positioned?
   - This will determine how to implement "drag component as unit" vs "drag individual leg"

5. **Check for existing bugs or known issues:**
   - Search for TODO/FIXME comments related to dragging
   - Check git history for recent drag-related changes that might have broken functionality
   - Look for feature flags that might disable certain interactions

### Fix Implementation

#### 1. Fix Component Dragging (Full Component as Unit)

**Goal:** Users can click and drag any component to freely reposition it on the breadboard, moving all legs as a unit.

**Steps:**
1. Identify the component drag handler
2. Ensure drag events work in both horizontal and vertical directions
3. Fix any coordinate transformation bugs that prevent horizontal movement
4. Implement proper grid snapping:
   - Show ghost preview during drag
   - Snap to valid breadboard positions
   - Prevent placement where pins don't align with holes
5. Provide visual feedback:
   - Highlight component during drag
   - Show valid/invalid placement zones
   - Display preview at drop location
6. Test thoroughly:
   - Drag components horizontally
   - Drag components vertically
   - Drag components diagonally
   - Verify snapping works correctly
   - Ensure components can be dragged from any initial position

**Acceptance criteria:**
- ✅ Components can be dragged smoothly in all directions
- ✅ Horizontal dragging works as well as vertical dragging
- ✅ Ghost preview shows during drag
- ✅ Components snap to valid breadboard positions
- ✅ Invalid positions are clearly indicated
- ✅ Drop only succeeds when all pins align with valid holes

#### 2. Implement Individual Leg Dragging

**Goal:** Users can select and drag individual component legs/pins to different breadboard holes.

**Steps:**
1. Implement pin/leg hit detection:
   - Each pin should be individually clickable
   - Pin selection should take priority over component selection (smaller hit area, higher z-index)
2. Create individual pin drag mode:
   - When user clicks on a pin (not component body), enter "pin drag" mode
   - Only the selected pin moves; other pins remain fixed
3. Implement constraints:
   - Determine physical constraints (e.g., resistor legs can stretch, IC pins cannot move independently)
   - For flexible components (resistor, LED, capacitor):
     - Allow leg repositioning
     - Update component visual (bent legs, adjusted body position if needed)
   - For rigid components (IC, some connectors):
     - Either disallow individual pin drag, or move entire component
4. Visual feedback:
   - Highlight the specific pin being dragged
   - Show connection line from fixed pins to body
   - Preview final component shape
5. Update data model:
   - Modify component placement to support per-pin positioning (if not already supported)
   - Ensure netlist/electrical model updates correctly when pins move

**Acceptance criteria:**
- ✅ Individual pins are selectable (distinct from selecting the entire component)
- ✅ Pins can be dragged to different breadboard holes
- ✅ Component body and other pins adjust appropriately
- ✅ Physical constraints are enforced (document which components support this)
- ✅ Electrical connections update correctly after pin repositioning

#### 3. Fix Breadboard Hole Selection

**Goal:** Every breadboard hole is reliably selectable by clicking on it.

**Steps:**
1. Identify breadboard hole rendering and hit detection:
   - Find where breadboard holes are drawn
   - Locate hole click/pointer event handlers
2. Debug selection failures:
   - Check for overlapping interactive elements that block holes
   - Verify hit area size and positioning
   - Check z-index/layering (holes should be on top of breadboard background but below components)
   - Look for event capture issues
3. Fix hit detection:
   - Ensure hit areas are large enough (review notes: "Visual hole: small and realistic" but "Selection hit area: large and forgiving")
   - Verify coordinate transformation is correct
   - Fix any bounds checking bugs
4. Provide visual feedback:
   - Highlight hole on hover
   - Show selection state clearly
   - If a component pin is already in the hole, indicate that
5. Test exhaustively:
   - Click every hole in each breadboard region (top rail, rows, bottom rail)
   - Test with empty breadboard
   - Test with components placed (ensure holes remain selectable)
   - Test with wires connected (ensure holes remain selectable)

**Acceptance criteria:**
- ✅ All breadboard holes are clickable
- ✅ Holes show hover feedback
- ✅ Holes show selection feedback
- ✅ Holes remain selectable even when components or wires are present
- ✅ Hit area is large enough for comfortable clicking (but visual hole remains small/realistic)

#### 4. Testing & Validation

**Manual testing checklist:**
- [ ] Create a new circuit from scratch
- [ ] Add multiple components from Quick Select
- [ ] Drag each component to different positions
- [ ] Verify horizontal dragging works smoothly
- [ ] Verify vertical dragging works smoothly
- [ ] Verify diagonal dragging works smoothly
- [ ] Select individual component pins and reposition them
- [ ] Click on various breadboard holes across all regions
- [ ] Verify holes remain selectable when components are nearby
- [ ] Verify holes remain selectable when wires are connected
- [ ] Test with different component types (resistor, LED, IC, wire)
- [ ] Verify undo/redo works correctly with all drag operations

**Automated testing (if applicable):**
- Add unit tests for drag event handlers
- Add integration tests for component placement
- Add tests for breadboard hole hit detection
- Ensure existing tests still pass

---

## Technical Requirements

### Rendering Stack Clarity
- If the application is mid-migration from PixiJS to React-Konva, determine which system handles interactions
- Ensure drag-and-drop logic is consistent with the intended rendering architecture
- If mixed rendering exists, document it clearly and plan for consistency

### Performance Considerations
- Drag operations must be smooth (60fps target)
- Hit detection should be fast (< 16ms per frame)
- If performance is an issue, consider:
  - Throttling drag events
  - Using spatial indexing for hit detection
  - Optimizing render updates during drag

### Accessibility
- Ensure keyboard users can also reposition components (not just mouse/touch)
- Provide ARIA labels for draggable elements
- Consider screen reader announcements for drag operations

---

## Refactor Safety Rules (MANDATORY)

If this task requires moving drag-and-drop code between files:
1. **Move code verbatim first** into its new location
2. **Update imports/call sites** to make it run, address visibility, scope, and parameterization as a fix on the migrated code
3. **Only then do targeted improvements**

## Implementation Constraints (MANDATORY)

1. **Do not change the logic of code unless it has been identified as a clear bug**
2. **Do not maintain legacy endpoints for backwards compatibility**
3. **Always delete any leftover, unused code**
4. **Do not leave comments on changes made within the code**
5. **Do not rewrite functions from scratch during refactors**
6. **Ensure all tests and linting pass after each change**

---

## Expected Outcome

After this PR is merged:
- ✅ Components can be dragged freely and reliably in all directions
- ✅ Individual component legs can be repositioned independently (where physically appropriate)
- ✅ All breadboard holes are reliably selectable
- ✅ The "Blocking Issues" section of the review is fully resolved
- ✅ Users can meaningfully edit circuits without interaction frustration

This resolves the **most critical functional blocker** identified in the review and unblocks further UI/UX improvements.

---

## Related Review Sections (for context, not in scope)

These are mentioned in the review but are **not part of this PR**:
- Section 1: Sidebar layout rebalancing
- Section 3: Examples/Load/Save control placement
- Section 4: Right sidebar panel removal/reorganization
- Section 6: Component and breadboard rotation
- Section 8: X-ray mode improvements
- Section 9: Breadboard visual realism
- Section 10: Dark/light theme toggle

Those will be addressed in subsequent PRs after these blocking interaction issues are resolved.
