# Complexity refactor plan (Qlty Cloud + CLI)

Date: 2026-01-11

## Context

- Qlty Cloud issues page (`https://qlty.sh/gh/trickl/projects/breadboard-lab/issues`) is currently GitHub-SSO/login gated from this environment, so we can’t see the cloud issue list directly.
- Local `qlty check` is clean right now, but `qlty smells` and `qlty metrics` still show **high complexity hotspots** worth addressing.

This document is Phase 1 of a two-phase process:

1. **Identify** files/functions with particularly high complexity and document a **separation-of-concerns plan**.
2. **Refactor** by _moving code verbatim first_ (no rewrites), then applying minimal patches to fix exports/visibility/scoping.

## Refactoring protocol (non-negotiable)

To minimize risk and avoid logic regressions:

1. **Move verbatim first**
   - Copy/paste the target function(s) into a new module unchanged (including comments).
   - Export them.
   - Update call sites to import from the new module.

2. **Then patch for scoping/visibility**
   - Only after the verbatim move compiles, fix:
     - access modifiers (`private` → module-private helper, or keep in class and move class method groups)
     - dependencies (inject via parameters, or export small helpers)
     - TypeScript type visibility (export needed types, or pass structural types)

3. **Only then** consider tiny readability edits
   - Small, mechanically safe extractions (early returns, local helpers) are allowed after the move.
   - Avoid semantic changes.

4. Validate after each move
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - `qlty check`
   - optionally `qlty smells` for complexity regression checks

## Complexity hotspots (from local Qlty metrics/smells)

The following were identified via `qlty smells --all` and `qlty metrics --all --functions`.

### Tier 0 (extreme)

#### `src/ui-react/rete/ReteGraphLayer.tsx`

- **High total complexity:** ~716
- **High complexity functions:**
  - `ReteGraphLayer` (very large; cognitive reported ~654)
  - nested renderers (`node`, `RailNodeRenderer`, `SelectableConnection`, `makeConnection`, etc.)

**Separable concerns:**

- socket/node payload type guards and adapters
- connection/port validation rules
- color/path geometry helpers
- interaction (pointer + keyboard)
- view components (node renderers, connection renderers)
- synchronization between controller state ↔ rete graph

**Proposed module split (first move verbatim):**

- `src/ui-react/rete/graph/` (new folder)
  - `types.ts` (shared local types for this layer)
  - `payloadGuards.ts` (e.g. `isBreadboardNodePayload`, `isRailNodePayload`)
  - `color.ts` (e.g. `parseHexColor`, `mixWithWhite`, `mixWithBlack`, `toHex2`)
  - `pathGeometry.ts` (e.g. `parsePathEndpoints`, endpoint transformers)
  - `connectionRules.ts` (e.g. `resolveSourceTarget`, `portAllowsMultiple`, `removeConflictingConnections`)
  - `renderers/` (React components moved verbatim)
    - `BreadboardNodeRenderer.tsx`
    - `RailNodeRenderer.tsx`
    - `SelectableConnection.tsx`
  - `reteSync.ts` (controller↔rete mapping and sync helpers)

**Phase-2 sequencing note:** start by extracting _pure helpers_ (no React hooks), then extract nested renderer components.

### Tier 1 (very high)

#### `src/ui-react/components/ComponentsLayer.tsx`

- **High total complexity:** ~92
- **Large component:** `ComponentsLayer` (~266 loc)
- Key hotspots: pointer/drag handling, selection model, connection dragging.

**Separable concerns:**

- pointer state machine (down/move/up/cancel)
- component dragging & ghost preview
- connection dragging (start/move/commit)
- selection updates
- coordinate transforms

**Proposed module split:**

- `src/ui-react/components/components-layer/` (new folder)
  - `types.ts` (local state machine types)
  - `pointerState.ts` (state transitions)
  - `componentDrag.ts` (helpers)
  - `connectionDrag.ts` (helpers)
  - `hitTesting.ts` (helper utilities)
  - `ComponentsLayer.tsx` becomes an orchestrator assembling hooks/helpers

#### `src/ui-react/ui/InfoPanel.tsx`

- **Large component:** ~590 loc
- **Complexity:** function complexity ~32

**Separable concerns:**

- formatting utilities
- component detail rendering
- simulation error rendering
- debug overlay controls
- connection detail rendering

**Proposed module split:**

- `src/ui-react/ui/info-panel/`
  - `formatters.ts` (e.g. `formatComponentTitle`)
  - `ComponentDetails.tsx`
  - `ConnectionDetails.tsx`
  - `SimulationErrorsPanel.tsx`
  - `OverlayControls.tsx`
  - `InfoPanel.tsx` becomes a thin composition/root

#### `src/ui-react/ui/ClockControls.tsx`

- **Cognitive:** ~31

**Separable concerns:**

- clock state & effects (hook)
- UI rendering
- microprocessor binding

**Proposed module split:**

- `src/ui-react/ui/clock-controls/`
  - `useClockControls.ts` (hook)
  - `ClockControls.tsx` (UI)

### Tier 2 (high, core logic)

#### `src/ui-controller/breadboard-controller.ts`

- **High total complexity:** ~66
- Many reducer-like methods: `reduceComponentActions`, `reduceDragActions`, etc.

**Separable concerns:**

- reducer “slices” per domain (components, connections, drag, UI, simulation)

**Proposed module split:**

- `src/ui-controller/reducers/`
  - `reduce.ts` (root reducer, composes slice reducers)
  - `componentReducer.ts`
  - `connectionReducer.ts`
  - `dragReducer.ts`
  - `floatingComponentReducer.ts`
  - `uiReducer.ts`
  - `simulationReducer.ts`
  - `circuitReducer.ts`

Move each `private reduceX` method verbatim into exported pure functions, then call from the controller.

#### `src/core/circuit-simulator.ts`

- **High total complexity:** ~116
- Concerns include MNA matrix building/solving + error detection.

**Separable concerns:**

- MNA matrix building (“stamping”)
- linear solver
- result extraction (voltages/currents)
- error detectors

**Proposed module split:**

- `src/core/simulation/`
  - `mna/`:
    - `build.ts` (build node index map + matrices)
    - `stamp.ts` (conductance stamping, edge conductance)
    - `solve.ts` (forward elimination/back substitution)
    - `types.ts` (small internal types)
  - `errors/`:
    - `detect.ts` (orchestrates detectors)
    - `shortCircuit.ts`
    - `floatingNodes.ts`
    - `reversedLed.ts`
    - `openCircuit.ts`
    - `ledOvercurrent.ts`
  - `CircuitSimulator.ts` stays as a thin orchestrator using these modules

#### `src/core/schematic-layout.ts`

- **High total complexity:** ~59

**Separable concerns:**

- force-directed layout forces
- net-to-node mapping
- symbol extraction and connection generation

**Proposed module split:**

- `src/core/schematic/`
  - `layout.ts` (orchestrator)
  - `forces.ts`
  - `symbols.ts`
  - `connections.ts`
  - `types.ts` (internal layout types)

### Tier 3 (medium-high)

#### `src/core/circuit-serializer.ts`

- `validateCircuitData` complexity ~21
- `deserializeComponent` has many returns (already partially decomposed)

**Separable concerns:**

- schema validation vs. parsing
- per-component deserialization

**Proposed module split:**

- `src/core/serialization/`
  - `circuitValidation.ts` (move `validateCircuitData` and its helpers verbatim)
  - `componentDeserializers.ts` (group component-specific deserializers)
  - `circuitSerializer.ts` (thin: serialize/deserialize and glue)

#### `src/core/breadboard-layout.ts`

- `getRailForPosition` has many returns

**Separable concerns:**

- rail geometry
- terminal strip geometry
- connectivity predicates

**Proposed module split:**

- `src/core/breadboard/`
  - `rails.ts`
  - `terminalStrips.ts`
  - `connectivity.ts`
  - `breadboardLayout.ts` orchestrator

## Implementation order (Phase 2)

Recommended order based on risk vs payoff:

1. `src/ui-controller/breadboard-controller.ts` (pure reducer extraction; very testable)
2. `src/core/circuit-simulator.ts` (core logic, strong unit tests)
3. `src/core/schematic-layout.ts`
4. `src/ui-react/components/ComponentsLayer.tsx`
5. `src/ui-react/ui/ClockControls.tsx`
6. `src/ui-react/ui/InfoPanel.tsx`
7. `src/ui-react/rete/ReteGraphLayer.tsx` (largest, most intertwined; do last)

## Acceptance criteria

For each refactor batch:

- No behavior changes intended; code moved verbatim first.
- All checks pass:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `qlty check`
- Complexity hotspots in `qlty smells` should decrease over time (or at minimum become distributed into smaller, single-purpose modules).
