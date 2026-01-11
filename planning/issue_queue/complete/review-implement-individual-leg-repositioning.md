Implement individual component leg/pin repositioning for placed components

## Context

This task addresses **Section 5.2** (Expected Interaction Model) from `planning/reviews/review-2026-01-08.md` (lines 107-114), which was explicitly deferred in PR #291 as requiring data model changes.

## Review Items Being Addressed

### Section 5.2: Expected Interaction Model (Line 109-114)

**Original Requirement:**

> "Users should be able to:
>
> - Drag an entire component as a unit ✅ (RESOLVED in PR #291)
> - **Select and move individual legs independently** ❌ (NOT YET IMPLEMENTED)"

**Review Context (Section 5.1, lines 102-108):**

> "Dragging components is unreliable or broken... It is not possible to drag an individual leg independently... The interaction feels frustrating and inconsistent."

**Priority Classification (from actions file):**

- **Complexity:** HIGH — requires data model changes, new UI affordances, and constraint logic
- **Priority:** MEDIUM — full-component dragging addresses most use cases; individual leg dragging is an advanced feature

## Problem Statement

Currently, users can only drag entire components as units. Real breadboard usage requires the ability to reposition individual component legs/pins independently to:

1. Adjust component placement without removing and replacing the entire component
2. Accommodate physical constraints (e.g., bent resistor leads, adjusted LED positioning)
3. Fix wiring mistakes by moving one pin while keeping the other connected
4. Create more realistic breadboard layouts (components don't always span exact rows)

This feature was explicitly deferred in PR #291 because it requires significant architectural changes beyond coordinate transformation fixes.

## Required Implementation

### 1. Data Model Changes

**Current State:**

- Components store two `Position` objects (startPos, endPos)
- Positions are immutable once placed
- Moving a component updates both positions simultaneously

**Required Changes:**

- Extend `Component` type to support per-pin positioning:

  ```typescript
  interface Component {
    // Existing fields...
    positions: Position[]; // Array of pin positions (flexible length)
    pinCount: number; // Number of pins/legs
    // OR maintain backward compatibility:
    legPositions?: Position[]; // Optional per-leg positions
  }
  ```

- Add support for "bent" component state:

  ```typescript
  interface Component {
    // Existing fields...
    isBent?: boolean; // Flag for components with adjusted legs
    originalSpan?: number; // Original row/column span for reference
  }
  ```

- Update component creation to initialize all pin positions
- Update `circuit-extractor.ts` to handle independent pin positions
- Update netlist generation to map individual pins correctly

### 2. UI Affordances for Pin Selection

**Hit Detection:**

- Add distinct hit areas for individual pins (not just component body)
- Pin hit area should be circular (~8-10px radius) at pin endpoint
- Component body hit area should exclude pin endpoints
- Visual feedback when hovering over a pin (highlight pin, change cursor)

**Selection Model:**

- Click component body → select entire component (existing behavior)
- Click individual pin → select that specific pin (new behavior)
- Selection highlight should indicate pin selection vs component selection:
  - Component selection: blue border around entire component (existing)
  - Pin selection: highlighted pin + "drag me" indicator (new)

**Implementation Location:**

- `pixi-renderer.ts`: Add pin hit area creation method (similar to `createComponentHitArea()`)
- `breadboard-app.ts`: Add pin selection handlers and state

### 3. Per-Pin Drag Mode

**Drag Behavior:**

- When dragging a selected pin:
  - Only that pin moves
  - Other pins remain anchored
  - Component body stretches/bends visually to connect all pins
  - Snap to breadboard holes (existing snap logic)
  - Preview shows new pin position + visual wire/body adjustment

**Constraints to Enforce:**

- Pin must snap to a breadboard hole (no floating pins)
- Pin cannot overlap another component's pin on the same hole
- Electrical connectivity must be maintained (netlist updates)
- Some components may have physical constraints (see constraint system below)

**Implementation Location:**

- `breadboard-app.ts`: Add `handlePinDragStart()`, `handlePinDragMove()`, `handlePinDragEnd()`
- Reuse existing snap-to-grid logic from component dragging
- Add new command `RepositionPinCommand` for undo/redo support

### 4. Physical Constraint System

**Component Types by Flexibility:**

**Flexible Components (can bend/stretch):**

- Resistors: legs can be bent to different rows
- LEDs: legs can be bent to different rows
- Wires: already flexible (existing wire re-routing handles this)
- Diodes: legs can be bent
- Capacitors: legs can be bent

**Rigid Components (cannot bend individual pins):**

- Integrated circuits (ICs/microprocessors): pins are fixed relative to chip body
- Multi-pin headers: pins maintain rigid spacing
- Switches with multiple terminals: structure is rigid
- Power supplies: terminals are fixed

**Implementation:**

```typescript
interface ComponentType {
  // Existing fields...
  flexibility: 'flexible' | 'rigid' | 'semi-rigid';
  maxPinSpan?: number; // Maximum distance pins can span (in holes)
  minPinSpan?: number; // Minimum distance pins must span
}
```

**Constraint Enforcement:**

- Flexible components: allow independent pin repositioning
- Rigid components: disallow pin repositioning (drag moves entire component)
- Semi-rigid components: allow small adjustments within limits

**User Feedback:**

- Attempting to drag a pin on a rigid component shows tooltip: "This component's pins are fixed"
- Exceeding max span shows preview in red + validation message

### 5. Visual Feedback for Adjusted Components

**Bent Component Rendering:**

- When a flexible component has adjusted legs:
  - Draw bent body/leads using curved paths (Bezier curves)
  - Maintain visual connection from body to all pins
  - Use subtle color/style to indicate "adjusted" state (optional)

**Example Visual Changes:**

- **Resistor (normal):** Straight body spanning 5 rows
- **Resistor (bent):** Curved body, left pin at row 5, right pin at row 12
- **LED (normal):** Straight legs, body centered between pins
- **LED (bent):** Curved legs, body shifted, pins at different rows

**Implementation Location:**

- `pixi-renderer.ts`: Add bent component rendering logic to `renderComponent()`
- Use PixiJS Graphics API to draw curved paths
- Reuse existing component rendering where possible (color bands, polarity markers)

### 6. Electrical Netlist Updates

**Netlist Synchronization:**

- When a pin is repositioned:
  - Update `circuit-extractor.ts` to use new pin positions
  - Regenerate netlist from updated component positions
  - Trigger circuit simulation with new netlist
  - Update voltage/current overlays

**Connection Validation:**

- Ensure pin repositioning doesn't create invalid circuits:
  - Floating pins (not connected to anything) should be flagged
  - Short circuits from pin repositioning should be highlighted
  - Open circuits should be detected

**Implementation Location:**

- `circuit-extractor.ts`: Update to handle `legPositions` array if present
- Add validation for pin repositioning in `breadboard-app.ts`

## Implementation Plan

### Phase 1: Data Model Changes (2-3 hours)

1. Extend `Component` type to support per-pin positions
2. Update component creation to initialize all pin positions
3. Add backward compatibility for existing circuits
4. Update `circuit-extractor.ts` to handle independent pin positions
5. Write unit tests for new data model

### Phase 2: Hit Detection & Selection (2-3 hours)

1. Add pin hit area creation in `pixi-renderer.ts`
2. Add pin selection handlers in `breadboard-app.ts`
3. Add visual feedback for pin hover and selection
4. Update selection state management
5. Write unit tests for pin hit detection

### Phase 3: Per-Pin Drag Mode (3-4 hours)

1. Implement `handlePinDragStart()`, `handlePinDragMove()`, `handlePinDragEnd()`
2. Add drag preview for pin repositioning
3. Implement snap-to-grid for pin endpoints
4. Add `RepositionPinCommand` for undo/redo
5. Write unit tests for pin dragging

### Phase 4: Constraint System (2-3 hours)

1. Define component flexibility in component library
2. Implement constraint checking during pin drag
3. Add user feedback for constraint violations
4. Add validation for max/min pin span
5. Write unit tests for constraint enforcement

### Phase 5: Visual Feedback (2-3 hours)

1. Implement bent component rendering (curved paths)
2. Update resistor rendering for bent state
3. Update LED rendering for bent state
4. Add visual indicators for adjusted components
5. Write visual regression tests

### Phase 6: Netlist Updates & Testing (2-3 hours)

1. Update netlist generation for independent pin positions
2. Add connection validation
3. Update voltage/current overlays
4. Write integration tests for complete workflow
5. Manual testing and bug fixes

**Total Estimated Time:** 13-19 hours (2-3 days)

## Acceptance Criteria

### Must Have:

- [ ] User can click on an individual pin of a flexible component (resistor, LED) to select it
- [ ] Dragging a selected pin moves only that pin to a new breadboard hole
- [ ] Other pins of the same component remain anchored in their original positions
- [ ] Component body visually adjusts (bends/stretches) to connect all pins
- [ ] Pin snaps to valid breadboard holes (existing snap-to-grid behavior)
- [ ] Rigid components (ICs, multi-pin headers) prevent individual pin dragging
- [ ] Electrical netlist updates correctly when pins are repositioned
- [ ] Undo/redo works for pin repositioning operations
- [ ] Visual regression tests pass for bent components

### Nice to Have:

- [ ] Hover tooltip indicates which components allow pin repositioning
- [ ] Visual indicator shows component is in "adjusted" state
- [ ] Max/min span constraints are enforced with clear user feedback
- [ ] Pin repositioning validates against short circuits and open circuits

## Testing Strategy

### Unit Tests:

- Data model: component with independent pin positions
- Hit detection: pin hit areas vs component body hit areas
- Constraint system: flexible vs rigid component classification
- Netlist generation: independent pin positions → correct netlist

### Integration Tests:

- Complete workflow: select pin → drag → drop → netlist updates
- Undo/redo: pin repositioning → undo → redo
- Multi-component: reposition pins on multiple components

### Visual Regression Tests (Playwright):

- Bent resistor rendering
- Bent LED rendering
- Selection highlights for pins vs components
- Drag preview for pin repositioning

### Manual Testing:

- Adjust resistor leg from row 5 to row 8 (bent resistor)
- Adjust LED leg from row 10 to row 15 (bent LED)
- Attempt to drag IC pin (should be prevented)
- Undo/redo pin repositioning
- Verify circuit still simulates correctly after pin adjustment

## Known Complexity & Risks

### High Complexity Items:

1. **Data model migration:** Backward compatibility with existing circuits
2. **Visual rendering:** Drawing bent component bodies with Bezier curves
3. **Constraint system:** Defining and enforcing flexibility rules for all component types
4. **Netlist synchronization:** Ensuring electrical model stays consistent

### Risks:

- **Performance:** Bent component rendering may be slower than straight components
  - Mitigation: Cache bent component graphics, only redraw on change
- **User confusion:** Users may not understand which components allow pin dragging
  - Mitigation: Clear visual feedback, tooltips, tutorial
- **Data migration:** Existing saved circuits may not have per-pin position data
  - Mitigation: Backward compatibility layer, auto-generate pin positions from startPos/endPos

## References

- **Review Source:** `planning/reviews/review-2026-01-08.md`, Section 5.2 (lines 109-114)
- **Actions Document:** `planning/reviews/review-2026-01-08.actions.md`, PR #291 (lines 389-402, 609-617)
- **Priority Classification:** MEDIUM priority, HIGH complexity (actions file lines 399-402)
- **Deferral Reason:** PR #291 focused on coordinate transformation; deferred data model changes to future PR

## Notes

- This feature was explicitly identified as MEDIUM priority in the actions document because "full-component dragging addresses most use cases; individual leg dragging is an advanced feature"
- Implementation should prioritize common flexible components (resistors, LEDs, diodes) over comprehensive support for all component types
- Consider implementing Phase 1-3 first (basic pin dragging) and defer Phases 4-6 (constraints, visual feedback, validation) if time is limited
- This feature will significantly improve user experience for advanced breadboard layouts and realistic circuit building

## Refactor Safety Rules (Mandatory)

1. Do NOT change logic of existing full-component dragging (it works correctly)
2. Do NOT maintain legacy endpoints for backward compatibility (clean new API)
3. Always delete leftover, unused code after data model changes
4. Do NOT leave comments on changes made within the code
5. Do NOT rewrite component rendering from scratch (extend existing rendering)
6. Ensure all tests and linting pass after each phase
