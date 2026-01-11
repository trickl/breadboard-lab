Fix breadboard hole selection reliability

## Source Review

`planning/reviews/review-2026-01-08.md`

## Review Items Addressed

This task addresses **Section 5.3: Breadboard Slot Selection Bug** (lines 115-119) and the remaining blocking issue from **Section 11: Critical Functional Blocker** and **Section 12: Priority Summary**.

### Section 5.3: Breadboard Slot Selection Bug

**Original Issue:**

- Users should be able to select **any breadboard hole or slot** directly.
- This does not appear to work reliably.
- This appears to be a bug rather than a design decision.

**Current Status:**

- Not addressed in previous PRs
- Listed as HIGH priority in actions document
- Required for wire connections and component placement workflow
- One of the remaining blocking issues preventing meaningful editing

### Section 11: Critical Functional Blocker (Partial - line 209)

**Original Issue:**

- "Breadboard holes cannot always be selected"

This is the last unresolved item from the critical functional blockers list.

### Section 12: Priority Summary - Blocking Issues (line 220)

**Original Issue:**

- "Unreliable breadboard hole selection"

This is the last unresolved item from the blocking issues priority list.

---

## Task Description

Investigate and fix the breadboard hole selection reliability issue. Users must be able to consistently click/tap on any breadboard hole to select it for wire connections or component placement.

### Investigation Required

1. **Hit detection analysis:**
   - Verify breadboard hole hit areas are properly defined
   - Check if holes have appropriate interactive regions
   - Confirm hit areas match visual hole positions
   - Test across different zoom levels (if applicable)

2. **Event handling verification:**
   - Check if click/pointer events are properly registered on holes
   - Verify event propagation isn't being blocked by overlapping elements
   - Confirm event handlers are attached to hole elements
   - Test both mouse and touch events

3. **Z-index and layering:**
   - Verify breadboard holes are not obscured by other interactive elements
   - Check component rendering order relative to holes
   - Ensure wire endpoints don't block underlying holes
   - Verify overlay elements aren't blocking interaction

4. **Visual vs interactive area mismatch:**
   - Compare visual hole size to hit area size
   - Ensure hit areas are appropriately larger than visual holes for usability
   - Check if there are dead zones between holes
   - Verify rail holes are equally selectable as row holes

### Expected Behavior

After fixes, users should be able to:

- Click/tap any breadboard hole (row or rail) reliably
- See visual feedback when hovering over a hole (if not already present)
- Select holes for wire connections consistently
- Select holes for component pin placement consistently
- Experience no dead zones or unresponsive areas on the breadboard

### Implementation Guidance

1. **Diagnosis first:**
   - Add temporary logging to track hole click events
   - Identify which specific scenarios fail (e.g., specific holes, after certain actions, with components present)
   - Determine root cause before making changes

2. **Fix approach:**
   - If hit areas are missing/incorrect: adjust interactive region definitions
   - If events are blocked: fix event propagation or z-index layering
   - If visual mismatch exists: align hit areas with visual hole positions
   - Make minimal, surgical changes focused on the root cause

3. **Validation:**
   - Test hole selection across all breadboard regions (top rail, bottom rail, left side, right side, center)
   - Test with empty breadboard and with components placed
   - Test with wires present and absent
   - Verify selection works in both desktop (mouse) and mobile (touch) contexts
   - Ensure no regression in component or wire selection

4. **Visual feedback enhancement (if needed):**
   - If not already present, add hover state for holes
   - Ensure selected hole state is clearly visible
   - Consider adding visual highlight to connected holes in the same net

### Files Likely Involved

Based on the codebase structure and previous PRs:

- `src/ui/pixi-renderer.ts` - rendering and hit area definitions
- `src/ui/breadboard-app.ts` - event handling and interaction logic
- Possibly breadboard model files if hole definitions are incorrect

### Testing Requirements

- Manual testing: Click each hole type (row holes, power rails, ground rails) in multiple positions
- Edge case testing: Holes adjacent to components, holes with wires connected, corner holes
- Cross-browser testing: Verify fix works in Chrome, Firefox, Safari
- Touch testing: Verify fix works on touch devices (if possible)
- No regression: Ensure component dragging, wire routing, and Quick Select still work correctly

### Acceptance Criteria

- [ ] All breadboard holes respond to click/tap events reliably
- [ ] No dead zones or unresponsive areas on the breadboard
- [ ] Hole selection works with components and wires present
- [ ] Visual feedback clearly indicates which hole is selected/hovered
- [ ] No regression in other interactive features (component drag, wire routing, Quick Select)
- [ ] Fix works for both mouse and touch input
- [ ] Manual testing confirms consistent behavior across all breadboard regions

### Priority Justification

This is the **last remaining blocking issue** from the review's critical functional blockers. Until breadboard holes can be selected reliably:

- Users cannot create wire connections consistently
- Component placement workflow is unreliable
- The application cannot be used for its core purpose (building breadboard circuits)

This issue has been explicitly categorized as:

- **HIGH priority** in the actions document
- **Blocking issue** in the review's priority summary
- **Required** for wire connections and component placement workflow

---

## Constraints Reminder

1. Do not change logic unless it's the identified bug
2. Do not maintain legacy endpoints for backwards compatibility
3. Always delete any leftover, unused code
4. Do not leave comments on changes within the code
5. Do not rewrite functions from scratch
6. Ensure all tests and linting pass after changes

## Refactor Safety Rule

This task is a bug fix, not a refactor, so the refactor safety rule does not apply. However:

- Move code verbatim first if any reorganization is needed
- Update imports/call sites next
- Then do targeted improvements

---

## Related Context

From `review-2026-01-08.actions.md`:

> **From Section 5.3: Breadboard Hole Selection**
>
> **Not yet addressed:**
>
> - Breadboard hole hit detection issues
> - Overlapping interactive elements blocking holes
> - Visual feedback for hole hover/selection
> - Z-index/layering verification
> - Hit area vs visual hole size tuning
>
> **Complexity:** MEDIUM — likely event handling or layering issue
>
> **Priority:** HIGH — required for wire connections and component placement workflow

This provides additional context on the likely nature of the issue and expected investigation areas.
