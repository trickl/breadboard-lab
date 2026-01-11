Implement undo/redo system for circuit editing with at least 50-step history

## Context

Breadboard Lab is an interactive electronics learning tool where students place components, wire circuits, adjust values, and experiment with designs. However, the system currently provides **no undo/redo capability**. Every action—component placement, deletion, rotation, repositioning, value change—is permanent. If a student makes a mistake or wants to explore alternative designs, they must manually reverse changes or start over.

This creates friction in the learning process. Students hesitate to experiment, fearing irreversible mistakes. Teachers cannot demonstrate "what if" scenarios effectively. The absence of undo/redo contradicts the exploratory, iterative nature of electronics education.

## Gap Analysis

**Long-term goal** (`planning/vision/goal.md`, lines 140-148):

> **Selection and editing**  
> Requirements:
>
> - Single selection for components/wires.
> - Multi-selection via shift+click and marquee.
> - **Delete/copy/paste and undo/redo.**
>
> Acceptance criteria:
>
> - **[ ] Undo/redo retains at least 50 steps.**

The planning document explicitly **requires** undo/redo with a specific acceptance criterion: **50 steps of history retention**.

**Current state** (`planning/state/system_capabilities.md`, lines 564, 1897, 2752):

- ❌ **No undo/redo**: No operation history
- ❌ No state history for undo/redo (line 237)
- ❌ No circuit versioning or history (line 567)
- State is mutated directly (components array modified in-place)
- No command pattern or action tracking infrastructure

**Gap**: The system provides rich editing capabilities (place, delete, move, rotate, edit values) but no way to reverse any action. This is a fundamental usability gap that impacts every user interaction.

## Proposed Development Task

**Implement undo/redo system for circuit editing with at least 50-step history**

### Scope

Create an undo/redo system that:

1. **Tracks all reversible actions** in a history stack:
   - Component placement (add)
   - Component deletion (remove)
   - Component repositioning (move)
   - Component rotation (rotate)
   - Component value changes (edit properties)
   - Wire placement and deletion (if implemented as distinct from components)

2. **Maintains action history** with:
   - Minimum 50 action capacity (as specified in goal.md)
   - Efficient memory usage (store state diffs, not full snapshots)
   - History survives across view switches (breadboard ↔ schematic)

3. **Provides undo operation**:
   - Keyboard shortcut: **Ctrl+Z** (Cmd+Z on Mac)
   - Reverses last action and moves to redo stack
   - Updates circuit, simulation, and all visualizations
   - Shows feedback (brief notification or status message)

4. **Provides redo operation**:
   - Keyboard shortcut: **Ctrl+Shift+Z** or **Ctrl+Y** (Cmd+Shift+Z on Mac)
   - Re-applies previously undone action
   - Moves action back to undo stack
   - Clears redo stack when new action performed (standard behavior)

5. **Integrates with existing UI**:
   - Works seamlessly with all current editing operations
   - No breaking changes to existing component placement/editing code
   - Optional: Add undo/redo buttons to toolbar for discoverability

6. **Handles edge cases**:
   - Undo past beginning of history (no-op, don't error)
   - Redo past end of stack (no-op)
   - Circuit loading clears history (new circuit = fresh history)
   - Example loading clears history
   - History survives clear all (so user can undo accidental clear)

### Technical Approach

**Phase 1: Command Pattern Infrastructure**

Introduce a **Command pattern** to wrap all state-mutating operations:

```typescript
// src/core/command.ts
interface Command {
  execute(state: BreadboardState): BreadboardState;
  undo(state: BreadboardState): BreadboardState;
  description: string; // For debugging/UI display
}

class AddComponentCommand implements Command {
  constructor(private component: AnyComponent) {}

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: [...state.components, this.component],
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.filter((c) => c.id !== this.component.id),
    };
  }

  description = `Add ${this.component.type}`;
}

class DeleteComponentCommand implements Command {
  constructor(
    private componentId: string,
    private component: AnyComponent
  ) {}

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.filter((c) => c.id !== this.componentId),
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: [...state.components, this.component],
    };
  }

  description = `Delete ${this.component.type}`;
}

// Similar for MoveComponentCommand, RotateComponentCommand, EditPropertyCommand
```

**Phase 2: History Manager**

Create `HistoryManager` class to manage undo/redo stacks:

```typescript
// src/core/history-manager.ts
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly maxHistory: number = 50;

  execute(command: Command, currentState: BreadboardState): BreadboardState {
    const newState = command.execute(currentState);

    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift(); // Remove oldest
    }

    this.redoStack = []; // Clear redo on new action

    return newState;
  }

  undo(currentState: BreadboardState): BreadboardState | null {
    const command = this.undoStack.pop();
    if (!command) return null;

    const newState = command.undo(currentState);
    this.redoStack.push(command);

    return newState;
  }

  redo(currentState: BreadboardState): BreadboardState | null {
    const command = this.redoStack.pop();
    if (!command) return null;

    const newState = command.execute(currentState);
    this.undoStack.push(command);

    return newState;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }
}
```

**Phase 3: BreadboardApp Integration**

Refactor `BreadboardApp` to use command pattern:

```typescript
// src/ui/breadboard-app.ts
export class BreadboardApp {
  private historyManager: HistoryManager = new HistoryManager();

  // OLD: Direct state mutation
  // this.state.components.push(newComponent);

  // NEW: Command-based state mutation
  addComponent(component: AnyComponent): void {
    const command = new AddComponentCommand(component);
    this.state = this.historyManager.execute(command, this.state);
    this.render();
  }

  deleteComponent(componentId: string): void {
    const component = this.state.components.find((c) => c.id === componentId);
    if (!component) return;

    const command = new DeleteComponentCommand(componentId, component);
    this.state = this.historyManager.execute(command, this.state);
    this.render();
  }

  // Similar for moveComponent, rotateComponent, editComponentProperty

  undo(): void {
    const newState = this.historyManager.undo(this.state);
    if (newState) {
      this.state = newState;
      this.render();
      this.showUndoFeedback(); // Optional: brief notification
    }
  }

  redo(): void {
    const newState = this.historyManager.redo(this.state);
    if (newState) {
      this.state = newState;
      this.render();
      this.showRedoFeedback(); // Optional: brief notification
    }
  }
}
```

**Phase 4: Keyboard Shortcuts**

Add keyboard event handlers:

```typescript
// In BreadboardApp constructor or init method
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    this.undo();
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
    e.preventDefault();
    this.redo();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault();
    this.redo();
  }
});
```

**Phase 5: Optional UI Buttons**

Add undo/redo buttons to toolbar for discoverability:

```html
<div class="history-controls">
  <button id="undo-btn" class="btn-history" title="Undo (Ctrl+Z)" disabled>↶ Undo</button>
  <button id="redo-btn" class="btn-history" title="Redo (Ctrl+Shift+Z)" disabled>↷ Redo</button>
</div>
```

Update button enabled/disabled state based on `historyManager.canUndo()` and `canRedo()`.

**Phase 6: State Immutability Pattern**

To support efficient undo/redo, **consider** (but not required for MVP) moving toward immutable state updates:

- Use spread operators for state updates (`{ ...state, components: [...] }`)
- Store only diffs/patches rather than full state snapshots (optimization)
- Consider immer.js for simpler immutable updates (optional dependency)

For MVP, storing full command objects with component references is sufficient.

### Success Criteria

- [ ] Undo system tracks at least 50 actions (goal.md acceptance criterion)
- [ ] Ctrl+Z (Cmd+Z) triggers undo operation
- [ ] Ctrl+Shift+Z and Ctrl+Y trigger redo operation
- [ ] All editing operations are undoable:
  - [ ] Component placement
  - [ ] Component deletion
  - [ ] Component repositioning (drag-and-drop)
  - [ ] Component rotation
  - [ ] Component property changes (resistance, voltage, etc.)
- [ ] Undo reverts circuit to previous state correctly
- [ ] Redo re-applies undone action correctly
- [ ] Circuit extraction and simulation update after undo/redo
- [ ] Voltage overlay and current animation update after undo/redo
- [ ] Explain panel updates after undo/redo (if component selected)
- [ ] Redo stack clears when new action performed (standard behavior)
- [ ] History clears when new circuit loaded or example loaded
- [ ] History survives view switching (breadboard ↔ schematic)
- [ ] No memory leaks from unbounded history (50-item cap enforced)
- [ ] Optional: Undo/redo buttons reflect enabled/disabled state visually
- [ ] Optional: Brief feedback message on undo/redo ("Undone: Delete LED")

### Educational and User Experience Impact

**Encourages experimentation:**

- Students try alternative circuit designs without fear of permanent mistakes
- "What if I move this resistor?" becomes low-risk exploration
- Teachers can demonstrate design iterations: try → undo → try different approach

**Reduces frustration:**

- Accidental deletions are reversible
- Wrong component placements don't require starting over
- Complex circuits can be refined iteratively without rebuilding

**Standard software behavior:**

- Undo/redo is expected in all modern editing tools
- Absence feels "broken" or "unfinished" to users
- Keyboard shortcuts (Ctrl+Z) are muscle memory for most users

**Enables future features:**

- Copy/paste requires undo ("undo paste" operation)
- Multi-component operations benefit from undo (select 5 components, delete, undo)
- Collaborative editing (future) requires action history for conflict resolution

### Alignment with Vision

This task directly implements a **required** capability from the planning document:

- `goal.md` lines 145, 148: "Delete/copy/paste and **undo/redo**" with acceptance criterion "Undo/redo retains at least 50 steps"
- Listed in Rendering & Interaction Capabilities → Selection and editing section
- Part of the target system specification, not optional enhancement

The planning document explicitly marks this as **required**, not a "nice-to-have" or future enhancement.

### Priority Justification

This is the most important next task because:

1. **Explicitly required by goal.md**: The planning document specifies undo/redo as a requirement with concrete acceptance criteria (50 steps). This is not optional.

2. **Foundational for usability**: Undo/redo is a baseline expectation for any editing tool. Without it, the tool feels incomplete and frustrating. Every other feature (audio, clock control, visualization) becomes less useful when mistakes can't be reversed.

3. **Prerequisite for other required features**:
   - **Copy/paste** (also required by goal.md) needs undo for "undo paste"
   - **Multi-selection** (also required by goal.md) benefits from undo for bulk operations
   - Future collaborative editing requires action history

4. **High educational impact**: Students experiment more freely when they can undo. This is critical for learning—trial and error without penalty.

5. **Reasonable scope**: Command pattern is well-understood. Implementation is straightforward. No complex algorithms or external dependencies required. Estimated 3-5 days of focused development.

6. **Zero blocking dependencies**: All editing operations exist (place, delete, move, rotate, edit). Undo/redo just wraps them in commands. No infrastructure changes needed.

7. **Low risk**: Well-established pattern. Can be implemented incrementally. No breaking changes to existing code (commands wrap existing operations).

8. **Immediate user value**: Every user benefits immediately. Unlike niche features (SPICE integration, advanced debugging), undo/redo improves every interaction.

### Non-Goals

This task specifically does **NOT** include:

- Multi-level undo/redo UI (tree view showing history branches) — linear undo/redo stack is sufficient
- Undo across save/load (history does not persist to localStorage or JSON files)
- Named checkpoints or manual savepoints ("Save checkpoint A") — not required by goal.md
- Unlimited history (50-item cap as specified is sufficient)
- Selective undo (undo action #7 while keeping #8-10) — standard linear undo/redo only
- Undo animation or visual preview ("undo preview" before confirming) — simple immediate undo is sufficient
- Conflict resolution for concurrent edits — no collaborative editing in MVP
- Undo for simulation state (simulation is always re-run from circuit state, no separate sim history needed)

Initial implementation focuses on **standard undo/redo**: linear history stack, keyboard shortcuts, 50-step capacity, all editing operations reversible.

## Implementation Plan

### Step 1: Create Command Infrastructure

Create `src/core/command.ts`:

- Define `Command` interface with `execute()`, `undo()`, `description`
- Implement concrete commands:
  - `AddComponentCommand`
  - `DeleteComponentCommand`
  - `MoveComponentCommand`
  - `RotateComponentCommand`
  - `EditPropertyCommand` (for component value changes)
- Unit tests for each command (verify execute and undo correctness)

### Step 2: Create HistoryManager

Create `src/core/history-manager.ts`:

- Implement `HistoryManager` class with undo/redo stacks
- Enforce 50-item cap on undo stack (goal.md requirement)
- Implement `execute()`, `undo()`, `redo()`, `clear()` methods
- Add `canUndo()`, `canRedo()`, `getUndoCount()`, `getRedoCount()` for UI state
- Unit tests for history operations (undo, redo, cap enforcement, clear)

### Step 3: Refactor BreadboardApp Editing Operations

Update `src/ui/breadboard-app.ts`:

- Add `historyManager: HistoryManager` instance
- Refactor existing methods to use commands:
  - `addComponent()` → use `AddComponentCommand`
  - `deleteComponent()` → use `DeleteComponentCommand`
  - `moveComponent()` (drag-and-drop) → use `MoveComponentCommand`
  - `rotateComponent()` → use `RotateComponentCommand`
  - Component property updates → use `EditPropertyCommand`
- Add `undo()` and `redo()` methods
- Clear history on circuit load (`loadCircuit()`, `loadExample()`)

### Step 4: Add Keyboard Shortcuts

Update keyboard event handler in `BreadboardApp`:

- Add Ctrl+Z (Cmd+Z) for undo
- Add Ctrl+Shift+Z (Cmd+Shift+Z) and Ctrl+Y for redo
- Prevent default browser behavior for these shortcuts
- Ensure shortcuts work when no input field focused

### Step 5: Optional UI Buttons

Add undo/redo buttons to toolbar:

- Create button HTML and CSS
- Wire up click handlers to `undo()` and `redo()` methods
- Update button enabled/disabled state after each action
- Add tooltips with keyboard shortcuts

### Step 6: Testing

Write comprehensive tests:

- Unit tests for all command classes (execute and undo correctness)
- Unit tests for HistoryManager (stack operations, cap enforcement)
- Integration tests for BreadboardApp undo/redo:
  - Place component → undo → verify removed
  - Delete component → undo → verify restored
  - Move component → undo → verify position reverted
  - Rotate component → undo → verify rotation reverted
  - Edit property → undo → verify value reverted
  - Multiple actions → undo all → redo all
  - 50-action history cap (add 60 actions, verify oldest 10 discarded)
  - New action clears redo stack
  - Circuit load clears history

### Step 7: Documentation

Update `README.md`:

- Add "Undo/Redo" section explaining keyboard shortcuts
- Document history capacity (50 actions)
- Note that history clears on circuit load

Add inline help:

- Tooltip on undo button: "Undo (Ctrl+Z) — up to 50 actions"
- Tooltip on redo button: "Redo (Ctrl+Shift+Z or Ctrl+Y)"

## Estimated Effort

3-5 days of focused development:

- **Day 1**: Command pattern infrastructure (command classes, unit tests)
- **Day 2**: HistoryManager implementation (stack logic, cap enforcement, unit tests)
- **Day 3**: BreadboardApp refactoring (wrap editing operations in commands, undo/redo methods)
- **Day 4**: Keyboard shortcuts, optional UI buttons, integration testing
- **Day 5**: Edge case handling, comprehensive testing, documentation

## Dependencies

All required infrastructure already exists:

- ✅ Component editing operations (place, delete, move, rotate, edit properties)
- ✅ BreadboardState data structure
- ✅ Rendering pipeline (re-render after undo/redo)
- ✅ Circuit extraction and simulation (re-run after undo/redo)
- ✅ TypeScript type system (for command interfaces)
- ✅ Keyboard event handling (existing handlers for Delete, Rotate, Escape)

## Risks and Mitigations

**Risk**: Refactoring existing editing code introduces bugs

- _Mitigation_: Incremental refactoring; wrap existing code in commands without rewriting logic; comprehensive integration tests; manual testing of all editing operations

**Risk**: Memory leaks from storing command history (component references)

- _Mitigation_: Enforce 50-item cap strictly; store minimal state in commands (component IDs, not full component objects where possible); profile memory usage

**Risk**: Undo/redo becomes confusing with complex multi-step operations

- _Mitigation_: Each action is one undo step (simple, predictable); optional: show brief feedback message describing what was undone ("Undone: Delete LED")

**Risk**: Redo stack behavior surprises users (clears on new action)

- _Mitigation_: This is standard software behavior (Ctrl+Z in all editors); document clearly; users familiar with any editing tool expect this

**Risk**: Undo/redo doesn't update all visualizations correctly

- _Mitigation_: Call full `render()` pipeline after undo/redo (includes circuit extraction, simulation, overlay updates); integration tests verify all visualizations update

**Risk**: History cap (50 items) is insufficient for complex circuits

- _Mitigation_: 50 is goal.md requirement; can increase if users request (e.g., 100 or 200); cap is configurable constant; monitor user feedback

**Risk**: Undo keyboard shortcut conflicts with browser behavior

- _Mitigation_: `preventDefault()` on Ctrl+Z when handled; ensure it only triggers when no input field focused; test in all major browsers

## References

- `planning/vision/goal.md` - Lines 140-148: "Delete/copy/paste and undo/redo" with "Undo/redo retains at least 50 steps"
- `planning/state/system_capabilities.md` - Lines 564, 1897, 2752: Confirms no undo/redo exists
- Command Pattern: [Refactoring Guru - Command](https://refactoring.guru/design-patterns/command)
- TypeScript Best Practices: [TypeScript Deep Dive - Command Pattern](https://basarat.gitbook.io/typescript/main-1/command)

## Success Metrics

After implementation:

1. ✅ Users can undo any editing operation with Ctrl+Z
2. ✅ Users can redo undone operations with Ctrl+Shift+Z or Ctrl+Y
3. ✅ History retains at least 50 actions (goal.md acceptance criterion met)
4. ✅ All editing operations are undoable (place, delete, move, rotate, edit)
5. ✅ Circuit, simulation, and visualizations update correctly after undo/redo
6. ✅ Redo stack clears when new action performed (standard behavior)
7. ✅ History clears when circuit loaded (clean slate for new circuit)
8. ✅ No memory leaks from unbounded history (cap enforced)
9. ✅ Keyboard shortcuts work reliably across browsers
10. ✅ Optional: UI buttons provide visual feedback and discoverability

This task transforms Breadboard Lab from a "single-direction" editor into a **full-featured editing tool** where users can experiment freely, knowing that mistakes are reversible and design iterations are supported.
