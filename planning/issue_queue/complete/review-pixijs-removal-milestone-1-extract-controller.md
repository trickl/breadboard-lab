# Extract renderer-agnostic controller from BreadboardApp (Milestone 1)

## Source Review

`planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`

## Review Items Addressed

This task addresses **Milestone 1 — Extract a renderer-agnostic controller** from the source review (lines 303-314).

### Specific critique items from the review:

- **Extract state transitions from BreadboardApp** (line 307): The review identifies that `BreadboardApp` currently mixes state changes, simulation calls, DOM operations, and rendering triggers into one imperative class. This needs to be separated so React can consume pure state (line 129-132).
- **Define AppState and Action types** (line 309): Explicit type definitions are needed for the application state and the actions that transform it, enabling declarative React rendering.
- **Create controller layer** (line 308): Move pure state transitions into a new `src/ui-controller/` directory that can be unit tested without DOM or canvas dependencies.
- **Enable unit testing without DOM** (line 312-313): The controller must be testable in isolation, which is impossible with the current tightly-coupled architecture.

### Outcome (from review, line 304)

A non-DOM controller owns state transitions; React just renders from that state. The controller can run extraction and simulation given a state, and can be unit tested without any DOM/canvas dependencies.

## Context

The current `BreadboardApp` class (`src/ui/breadboard-app.ts`) is a monolithic imperative controller that:

1. Manages application state
2. Handles user interactions
3. Triggers PixiJS rendering
4. Runs circuit extraction and simulation
5. Manages history/undo
6. Coordinates overlays

This architecture prevents React from functioning as a declarative view layer, because all state mutations are tightly coupled to PixiJS rendering calls. To enable the React UI migration, we must extract a clean, renderer-agnostic controller that:

- Owns the application state
- Provides state transition functions (actions)
- Runs simulation when needed
- Can be tested without any rendering layer

This is the **second milestone** in a 7-milestone migration plan. It builds on Milestone 0 (React infrastructure setup, completed in PR #465).

## Acceptance Criteria (from review, lines 311-313)

1. Controller can run extraction + simulation given a state
2. Unit tests can drive controller without DOM/canvas
3. AppState and Action types are explicitly defined

## Detailed Implementation Instructions

### Step 1: Analyze current BreadboardApp state

Before extracting anything, thoroughly understand what state `BreadboardApp` currently manages:

**Read and document the following from `src/ui/breadboard-app.ts`:**

- What instance variables represent application state?
- What methods perform state transitions?
- What methods are pure rendering triggers vs state mutations?
- What methods handle user interactions and how do they update state?
- How does simulation get triggered?
- How does undo/redo work?

**Create a mental model or written notes** (not in the repo) listing:

- State fields
- State transitions (actions)
- View-only operations (rendering)
- External dependencies (simulation, history)

### Step 2: Create controller module structure

Create new directory: `src/ui-controller/`

Create the following files:

- `src/ui-controller/breadboard-controller.ts` - Main controller class
- `src/ui-controller/types.ts` - AppState and Action type definitions
- `src/ui-controller/selectors.ts` - Derived data and queries (optional, but good practice)
- `src/ui-controller/simulation-runner.ts` - Debounced simulation orchestration

### Step 3: Define AppState type

In `src/ui-controller/types.ts`, define an `AppState` interface that captures all application state currently scattered in `BreadboardApp`.

**Likely state categories** (verify by reading BreadboardApp):

```typescript
export interface AppState {
  // Breadboard configuration
  breadboard: {
    size: { rows: number; columns: number };
    spacing: number;
  };

  // Circuit topology
  components: Component[];
  connections: Connection[];

  // Selection and interaction state
  selection: {
    selectedComponents: string[];
    selectedConnections: string[];
    hoveredHole?: { row: number; col: number };
  };

  // Interaction mode (if applicable)
  interactionMode: 'idle' | 'dragging' | 'connecting' | 'rotating';

  // Temporary interaction state (e.g., drag preview)
  dragState?: {
    componentId: string;
    startPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
  };

  // Simulation results
  simulation: {
    nodeVoltages: Map<string, number>;
    edgeCurrents: Map<string, { current: number; direction: string }>;
    errors: CircuitError[];
    lastRunTime?: number;
  };

  // UI visibility/overlay states
  ui: {
    showVoltageOverlay: boolean;
    showCurrentAnimation: boolean;
    showErrors: boolean;
    explainPanelTarget?: { type: string; id: string };
  };

  // View/camera state (pan/zoom)
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
}
```

**Important:** Do not blindly copy this structure. Read `BreadboardApp` and extract the **actual** state it manages. The above is a starting point only.

### Step 4: Define Action types

In `src/ui-controller/types.ts`, define action types for all state transitions.

Use a discriminated union pattern:

```typescript
export type Action =
  | { type: 'COMPONENT_ADDED'; component: Component }
  | { type: 'COMPONENT_MOVED'; componentId: string; position: { x: number; y: number } }
  | { type: 'COMPONENT_ROTATED'; componentId: string; rotation: number }
  | { type: 'COMPONENT_DELETED'; componentId: string }
  | { type: 'COMPONENTS_SELECTED'; componentIds: string[] }
  | { type: 'CONNECTION_CREATED'; connection: Connection }
  | { type: 'CONNECTION_DELETED'; connectionId: string }
  | { type: 'SIMULATION_COMPLETED'; results: SimulationResults }
  | { type: 'OVERLAY_TOGGLED'; overlay: 'voltage' | 'current' | 'errors'; enabled: boolean }
  | { type: 'VIEWPORT_CHANGED'; viewport: Viewport };
// ... add all other actions
```

**Important:** Identify actions by reading how `BreadboardApp` currently mutates state. Each mutation should become an explicit action.

### Step 5: Create controller class

In `src/ui-controller/breadboard-controller.ts`, create a controller class:

```typescript
import { AppState, Action } from './types';
import { CircuitExtractor } from '../core/circuit-extractor';
import { CircuitSimulator } from '../core/circuit-simulator';

export class BreadboardController {
  private state: AppState;
  private listeners: Set<(state: AppState) => void>;

  constructor(initialState: AppState) {
    this.state = initialState;
    this.listeners = new Set();
  }

  // Subscribe to state changes
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get current state (immutable)
  getState(): Readonly<AppState> {
    return this.state;
  }

  // Dispatch an action to update state
  dispatch(action: Action): void {
    const nextState = this.reduce(this.state, action);
    if (nextState !== this.state) {
      this.state = nextState;
      this.notifyListeners();
    }
  }

  // Pure state reducer
  private reduce(state: AppState, action: Action): AppState {
    switch (action.type) {
      case 'COMPONENT_ADDED':
        return {
          ...state,
          components: [...state.components, action.component],
        };

      case 'COMPONENT_MOVED':
        return {
          ...state,
          components: state.components.map((c) =>
            c.id === action.componentId ? { ...c, position: action.position } : c
          ),
        };

      // ... implement all other actions

      default:
        return state;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}
```

**Key principles:**

1. **Immutability**: Every state update returns a new state object; never mutate existing state
2. **Pure reducer**: The `reduce` method should be a pure function with no side effects
3. **Observable**: The controller notifies listeners when state changes
4. **Renderer-agnostic**: No references to DOM, canvas, Pixi, or any rendering technology

### Step 6: Extract simulation runner

In `src/ui-controller/simulation-runner.ts`, create a class that orchestrates simulation:

```typescript
import { AppState } from './types';
import { BreadboardController } from './breadboard-controller';
import { CircuitExtractor } from '../core/circuit-extractor';
import { CircuitSimulator } from '../core/circuit-simulator';

export class SimulationRunner {
  private controller: BreadboardController;
  private extractor: CircuitExtractor;
  private simulator: CircuitSimulator;
  private debounceTimer?: number;

  constructor(controller: BreadboardController) {
    this.controller = controller;
    this.extractor = new CircuitExtractor();
    this.simulator = new CircuitSimulator();
  }

  // Run simulation (debounced)
  runSimulation(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.executeSimulation();
    }, 100);
  }

  // Immediate simulation execution
  private executeSimulation(): void {
    const state = this.controller.getState();

    // Extract circuit from current state
    const circuit = this.extractor.extract({
      components: state.components,
      connections: state.connections,
    });

    // Run simulation
    const results = this.simulator.simulate(circuit);

    // Update state with results
    this.controller.dispatch({
      type: 'SIMULATION_COMPLETED',
      results: {
        nodeVoltages: results.nodeVoltages,
        edgeCurrents: results.edgeCurrents,
        errors: results.errors || [],
        lastRunTime: Date.now(),
      },
    });
  }
}
```

**Key principles:**

1. Simulation is triggered by the controller, not by UI events directly
2. Simulation results are dispatched as actions back to the controller
3. Debouncing prevents excessive simulation runs during interactive editing

### Step 7: Create selectors (optional but recommended)

In `src/ui-controller/selectors.ts`, create pure functions that derive data from state:

```typescript
import { AppState } from './types';

export function getSelectedComponents(state: AppState) {
  const selectedIds = new Set(state.selection.selectedComponents);
  return state.components.filter((c) => selectedIds.has(c.id));
}

export function getComponentById(state: AppState, id: string) {
  return state.components.find((c) => c.id === id);
}

export function getNetVoltage(state: AppState, netId: string): number | undefined {
  return state.simulation.nodeVoltages.get(netId);
}

// ... add other derived data queries
```

**Why selectors?**

- Centralize derived data logic
- Make view code cleaner
- Easy to test
- Enable memoization later if needed

### Step 8: Write unit tests for controller

Create `src/ui-controller/__tests__/breadboard-controller.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { BreadboardController } from '../breadboard-controller';
import { AppState } from '../types';

describe('BreadboardController', () => {
  function createTestState(): AppState {
    return {
      breadboard: { size: { rows: 30, columns: 60 }, spacing: 10 },
      components: [],
      connections: [],
      selection: { selectedComponents: [], selectedConnections: [] },
      interactionMode: 'idle',
      simulation: {
        nodeVoltages: new Map(),
        edgeCurrents: new Map(),
        errors: [],
      },
      ui: {
        showVoltageOverlay: false,
        showCurrentAnimation: false,
        showErrors: true,
      },
      viewport: { x: 0, y: 0, scale: 1 },
    };
  }

  it('should initialize with provided state', () => {
    const initialState = createTestState();
    const controller = new BreadboardController(initialState);
    expect(controller.getState()).toEqual(initialState);
  });

  it('should add component when COMPONENT_ADDED action is dispatched', () => {
    const controller = new BreadboardController(createTestState());

    const component = {
      id: 'comp-1',
      type: 'resistor',
      position: { x: 0, y: 0 },
      rotation: 0,
    };

    controller.dispatch({ type: 'COMPONENT_ADDED', component });

    const state = controller.getState();
    expect(state.components).toHaveLength(1);
    expect(state.components[0]).toEqual(component);
  });

  it('should notify listeners when state changes', () => {
    const controller = new BreadboardController(createTestState());
    let notificationCount = 0;

    controller.subscribe(() => {
      notificationCount++;
    });

    controller.dispatch({
      type: 'OVERLAY_TOGGLED',
      overlay: 'voltage',
      enabled: true,
    });

    expect(notificationCount).toBe(1);
  });

  // ... add more tests for each action type
});
```

**Test coverage goals:**

- Each action type should have at least one test
- State immutability should be verified
- Listener notifications should be tested
- Edge cases (empty state, invalid actions) should be covered

### Step 9: Integration with existing BreadboardApp (temporary bridge)

Do **NOT** delete or heavily refactor `BreadboardApp` yet. Instead, create a bridge:

In `src/ui/breadboard-app.ts`, add:

```typescript
import { BreadboardController } from '../ui-controller/breadboard-controller';
import { AppState } from '../ui-controller/types';

export class BreadboardApp {
  private controller: BreadboardController;
  // ... existing fields

  constructor() {
    // Initialize controller with current state
    this.controller = new BreadboardController(this.extractCurrentState());

    // Subscribe to controller state changes
    this.controller.subscribe((state) => {
      this.onControllerStateChange(state);
    });

    // ... existing initialization
  }

  private extractCurrentState(): AppState {
    // Convert current BreadboardApp internal state to AppState format
    return {
      breadboard: this.getBreadboardConfig(),
      components: this.components, // assuming this exists
      connections: this.connections, // assuming this exists
      // ... map all other state
    };
  }

  private onControllerStateChange(state: AppState): void {
    // Trigger PixiJS re-render when controller state changes
    // This keeps PixiJS working while we migrate to React
    this.render();
  }

  // Gradually replace direct state mutations with controller.dispatch() calls
}
```

**Important:** This is a temporary bridge. The goal is to make `BreadboardApp` use the controller internally, so when we later connect React to the controller, both UIs can coexist during migration.

### Step 10: Verify with existing tests

Run the full test suite to ensure nothing broke:

```bash
npm test
```

If tests fail, it means the extraction changed behavior. Fix the controller to match existing behavior exactly.

## Constraints (from issue template)

1. **Do not change logic**: The controller should replicate existing BreadboardApp behavior exactly, not improve or fix it
2. **Do not maintain legacy endpoints**: The bridge in step 9 is temporary for migration only
3. **Delete unused code**: Don't delete anything yet; this task is about extraction and duplication
4. **No comments in code**: Follow existing code style
5. **Do not rewrite functions**: Extract state transitions verbatim; don't "clean them up"
6. **Tests must pass**: All existing tests must continue passing

## Refactor Safety Rule

This task follows a careful extraction pattern:

1. Create new controller module structure
2. Define types explicitly
3. Extract state transitions as pure functions
4. Create bridge to keep existing BreadboardApp working
5. Add comprehensive tests for controller in isolation
6. Only after all above: gradually migrate BreadboardApp internals to use controller

**Do not skip steps. Do not combine extraction with improvements.**

## Testing Strategy

1. **Unit tests for controller**: Test each action type in isolation
2. **Integration test via bridge**: Verify BreadboardApp still works when using controller internally
3. **Simulation test**: Verify SimulationRunner correctly orchestrates extraction and simulation
4. **Existing test suite**: All existing tests must pass

## Definition of Done

- [ ] `src/ui-controller/` directory created
- [ ] `types.ts` defines `AppState` and `Action` types
- [ ] `breadboard-controller.ts` implements state management with subscribe/dispatch
- [ ] `simulation-runner.ts` orchestrates circuit extraction and simulation
- [ ] `selectors.ts` provides derived data queries (optional)
- [ ] Unit tests for controller achieve >80% coverage of action types
- [ ] Controller can be instantiated and tested without DOM/canvas
- [ ] Temporary bridge in `BreadboardApp` uses controller internally
- [ ] All existing tests pass
- [ ] Build succeeds without errors
- [ ] No changes to simulation or component library code

## Non-Goals

- Do NOT remove or refactor PixiJS code
- Do NOT connect React UI to the controller yet (that's Milestone 2+)
- Do NOT improve or fix existing bugs in state management
- Do NOT change the behavior of BreadboardApp
- Do NOT implement new features

This is purely an extraction task: take existing state management and isolate it into a testable, renderer-agnostic module.

## Related Architecture Decision Records

From the review:

- **DR-4 (lines 124-132)**: This task implements the "engine vs view" split by extracting controller logic
- The review explicitly states: "Today, `BreadboardApp` mixes state changes, simulation calls, DOM operations, and rendering triggers" (line 129-130)
- The goal is a "React UI needs declarative state and predictable updates" (line 131-132)

## Success Indicators

After this milestone:

1. You can write a test that creates a controller, dispatches actions, and verifies state changes **without any DOM/canvas**
2. You can instantiate a controller and run simulation from state **without any UI dependencies**
3. BreadboardApp still works exactly as before, but internally uses the controller
4. The foundation is ready for React components to consume controller state (next milestone)

## Relevant Code Locations

Files to read and understand:

- `src/ui/breadboard-app.ts` - Current monolithic controller (starting point)
- `src/core/circuit-extractor.ts` - Simulation extraction (will be called by SimulationRunner)
- `src/core/circuit-simulator.ts` - Simulation execution (will be called by SimulationRunner)
- `src/core/command-history.ts` - Undo/redo (may need integration with controller)

Files to create:

- `src/ui-controller/breadboard-controller.ts`
- `src/ui-controller/types.ts`
- `src/ui-controller/simulation-runner.ts`
- `src/ui-controller/selectors.ts`
- `src/ui-controller/__tests__/breadboard-controller.test.ts`

Files to modify (temporarily):

- `src/ui/breadboard-app.ts` - Add controller bridge

## Dependencies on Previous Milestones

- **Milestone 0 (completed)**: React infrastructure is in place, but not yet connected to anything
- This milestone prepares the state management layer that React will consume in future milestones

## Enables Future Milestones

- **Milestone 2**: React components will subscribe to controller state and render SVG breadboard
- **Milestone 3**: React components will dispatch actions for user interactions
- **Milestone 4-6**: All subsequent milestones depend on having a renderer-agnostic state layer
