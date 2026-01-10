# Planning: Remove PixiJS and render using React + Rete

Date: 2026-01-09  
Status: Draft (proposal)  
Owner: breadboard-lab maintainers

## Why this document exists

The current UI rendering stack is **PixiJS (WebGL/Canvas)** driven by an imperative controller (`BreadboardApp` → `PixiRenderer`). The project now wants to **remove PixiJS entirely** and implement **all rendering in React + Rete.js** (no WebGL, no Pixi, no third-party render engines).

This document is a concrete migration plan that:
- Preserves the existing **core electrical + digital simulation** layers.
- Keeps **Rete** as the **connectivity source of truth** (already true with `USE_RETE=true`).
- Replaces the entire Pixi-based view with a React DOM/SVG view and (where appropriate) a Rete React renderer for editor/connection visuals.

## Executive summary (target end-state)

**End-state UI:**
- A **React** application (React DOM) is the UI framework.
- **Rete.js** continues to manage the circuit connectivity graph and interactive connection constraints.
- Rendering is performed using **DOM + SVG** (and CSS), orchestrated by React.
- No PixiJS dependency; no WebGL usage.

**Critical note about Rete’s role:**
Rete is a node-editor framework. It is excellent for representing and interacting with a **graph** of nodes/ports/connections, but it is not designed to render *hundreds of passive breadboard holes as nodes*.

Therefore this plan uses:
- **React/SVG** to render the **breadboard physical geometry** (holes, strips, rails, labels, selection highlights).
- **Rete + React renderer** to render the **interactive graph layer** (components as nodes, legs/ports, connections/wires) and manage constraints.

This still satisfies “rendering purely using React and Rete.js” because:
- All visuals are produced by React-rendered DOM/SVG.
- Rete’s view layer (React renderer) is used for graph visuals where it fits.
- No external rendering engine (Pixi, Konva, Three) is used.

---

## What PixiJS currently does (must be replaced)

From the current code:
- `src/ui/pixi-renderer.ts` draws:
  - Breadboard grid geometry (holes, rails, labels)
  - Component shapes (resistors with color bands, LEDs with glow heuristics, power, ground, microprocessor)
  - Connection/wire visuals
  - Voltage overlay (heatmap)
  - Error overlay icons
  - Current-flow animation (particles) via `requestAnimationFrame`
  - Hit detection for holes/components/wires via Pixi pointer events

- `src/ui/breadboard-app.ts`:
  - Instantiates `PixiRenderer` and drives `renderBreadboard()` → `renderConnections()` → `renderComponents()` → `renderErrors()`.
  - Handles complex interactions (selection, placement, drag, rotate, interactive wiring) using Pixi coordinate mapping.
  - Contains coordinate transformation logic tied to the canvas.

**Replacement requirement:**
Every Pixi-driven capability must be either:
1) re-implemented in React/SVG, or
2) explicitly de-scoped with a replacement UX, or
3) temporarily disabled during migration with a clearly defined milestone when it returns.

---

## Scope

### In scope
- Remove `pixi.js` from runtime dependencies.
- Replace Pixi rendering with **React + SVG** rendering.
- Use **Rete** for graph connectivity and interactive connection constraints.
- Preserve existing simulation pipeline (CircuitExtractor/CircuitSimulator/MixedSignal) and component library.
- Preserve or reintroduce all key user interactions:
  - Select/multi-select
  - Drag/move
  - Rotate
  - Create connections interactively (Phase 3 workflow; currently implemented using ReteManager + Pixi visual support)
  - Delete/undo/redo
  - Error display and explain panel integration

### Explicitly out of scope (initially)
These can return after parity is reached:
- Photorealistic “Pixi-quality” shading/glow effects (replace with clean SVG styles first)
- Performance micro-optimizations beyond baseline usability

---

## Decision records (key choices and tradeoffs)

### DR-1: SVG-first rendering (no canvas) for breadboard
**Decision:** Render the breadboard physical view using **SVG** in React.

**Why:**
- SVG is DOM-based, inspectable, testable in Playwright, and avoids WebGL.
- Styling (highlight, overlays, error states) is straightforward.
- Coordinates map naturally to a scalable world with viewBox.

**Tradeoffs:**
- Many SVG elements can be heavy; we must design for performance (see “Performance strategy”).

### DR-2: Rete renders the graph layer, not the entire breadboard
**Decision:** Use Rete’s React renderer for:
- Component nodes (visual bodies)
- Ports/legs (connection endpoints)
- Connections (wires)

But **do not** model every breadboard hole as a rendered Rete node.

**Why:**
- Rendering hundreds of holes as nodes is a poor fit and likely to be slow and visually awkward.
- The breadboard is a *physical substrate*, not a graph editor.

### DR-3: One shared coordinate system (“world space”) for everything
**Decision:** Define a single coordinate system (world space) for:
- Breadboard geometry
- Component positions
- Connection endpoints
- Overlays

Rete’s AreaPlugin pan/zoom becomes the source of truth for the viewport transform.

**Why:**
- Eliminates Pixi-specific canvas coordinate transforms.
- Prevents drift between layers.

### DR-4: Controller logic split: “engine” vs “view”
**Decision:** Extract a renderer-agnostic controller from `BreadboardApp`:
- Core domain remains in `src/core/**`.
- A new UI/controller layer manages state transitions.
- React components render from state.

**Why:**
- Today, `BreadboardApp` mixes state changes, simulation calls, DOM operations, and rendering triggers.
- A React UI needs declarative state and predictable updates.

---

## Target architecture (React + Rete)

### High-level diagram

```
+------------------------------+       +------------------------------+
| React UI                     |       | Core (existing)              |
|                              |       |                              |
| <App/>                       |       | CircuitExtractor             |
|  - state/store               |<----->| CircuitSimulator / Mixed     |
|  - actions/reducer           |       | Component library            |
|  - persistence               |       | History/Commands             |
|                              |       +------------------------------+
| <BreadboardScene/>           |
|  - <BreadboardSvg/>          |  renders physical substrate
|  - <ReteGraphLayer/>         |  renders nodes/ports/connections
|  - <Overlays/>               |  voltage, current, errors
+------------------------------+
```

### Suggested new modules

- `src/ui-react/` (new)
  - `main.tsx` (React entry)
  - `App.tsx` (top-level)
  - `BreadboardScene.tsx`
  - `BreadboardSvg.tsx` (holes/rails/labels)
  - `Overlays/*` (voltage heatmap, current animation, error overlay)
  - `panZoom/*` (shared viewport transform)
  - `rete/ReteGraphLayer.tsx` (Rete editor + renderer)

- `src/ui-controller/` (new)
  - `breadboard-controller.ts` (state machine + actions)
  - `selectors.ts` (derived data)
  - `simulation-runner.ts` (debounced extraction + simulation)

The goal is to gradually shrink `src/ui/breadboard-app.ts` until it can be removed.

### Rete renderer choice

Rete v2 supports multiple render strategies. The project currently uses:
- `rete`
- `rete-area-plugin`
- `rete-connection-plugin`

To render with React you will likely need an official Rete React renderer package (name varies by ecosystem version). This plan assumes adding the appropriate package (commonly something like a “react render plugin”).

**Acceptance criterion:** the renderer must be:
- maintained upstream,
- compatible with Rete v2.x,
- MIT-compatible.

---

## Rendering plan (feature parity map)

### Breadboard substrate
**Current:** Pixi draws holes, rails, labels, and highlight states.

**New:** React renders an SVG with:
- Holes as repeated symbols (e.g., `<defs><circle id="hole" .../></defs>` + `<use>`), not individual React components.
- Rail backgrounds and labels as simple SVG shapes/text.
- Hover highlighting implemented via:
  - one transparent “hit layer” rectangle + math mapping pointer → hole, OR
  - event delegation with nearest-hole computation.

### Components
**Current:** Pixi draws shapes, resistor bands, LED glow heuristics.

**New:** React/SVG renders components as:
- A component body (SVG path/rect/circle)
- Pins/legs as ports (either pure SVG or Rete-rendered ports)
- Selection outline
- Rotate handle icon

“Pretty” details (glow, gradients) can be added after parity.

### Connections/wires
**Current:** Pixi draws wires and (optionally) “Rete connection lines” container.

**New:** Use Rete’s connection plugin + React renderer to draw connections, but coordinate endpoints in world space so they align visually with holes.

If Rete connection visuals can’t match the breadboard style, render connections ourselves in SVG from `reteManager.getConnections()` as a temporary bridge.

### Voltage overlays
**Current:** Pixi draws a voltage overlay layer.

**New:** Render a per-net or per-hole voltage overlay:
- MVP overlay: per-hole colored halo for connected holes that are part of a net.
- Better overlay: per-net region shading with alpha.

### Current flow animation
**Current:** Pixi spawns particles moving along paths.

**New (SVG):**
- Simple MVP: animate stroke dash offset on wires where $|I| > \epsilon$.
- Better: render small circles moving along the path using `requestAnimationFrame` in React (still allowed; it’s not WebGL).

### Errors
**Current:** Pixi draws error icons and supports click → explain.

**New:** Render error badges as SVG/HTML positioned elements anchored to:
- the component centroid, or
- the specific hole/pin if available.

---

## Interaction model (must be re-implemented)

### Inputs
- Pointer (mouse/touch)
- Keyboard

### Core interactions
- Click hole → selection / start action
- Click component → select
- Drag component → move with snapping
- Rotate (R key + handle)
- Connection creation (drag from leg → hole)
- Delete selected
- Undo/redo

### Recommended state machine (React-friendly)
Represent interaction as explicit modes:
- `idle`
- `draggingComponent`
- `draggingFloatingComponent`
- `draggingConnection`
- `reroutingConnection`

Each mode has:
- entry conditions
- pointer move behavior
- commit/cancel behavior

**Why:** The existing `BreadboardApp` already has implicit states; make them explicit to reduce bugs.

---

## Performance strategy (critical for SVG)

### Constraints
Even the “small” breadboard has hundreds of holes. Rendering each as a full React component is slow.

### Strategies
1) **SVG symbol reuse**: Render a single hole definition and reuse with `<use>`.
2) **Single event surface**: Avoid per-hole event listeners; use one `<rect>` hit layer and map pointer → nearest hole.
3) **Memoize derived geometry**: Precompute hole positions once.
4) **Minimize rerenders**: Keep simulation results in a store and only update overlays when they change.
5) **CSS transform for pan/zoom**: Use a transform on a top-level `<g>` or wrapper rather than recalculating geometry.

---

## Migration milestones (incremental, testable)

### Milestone 0 — Project setup for React
**Outcome:** React app renders “hello breadboard” without touching simulation.

Tasks:
- Add React runtime deps (`react`, `react-dom`).
- Add TypeScript JSX support (tsconfig updates).
- Create `src/main.tsx` and mount `<App/>` into `#app`.
- Keep existing `BreadboardApp` behind a feature flag for comparison.

Acceptance criteria:
- `npm run dev` shows a React-rendered page.
- Existing unit tests still pass.

### Milestone 1 — Extract a renderer-agnostic controller
**Outcome:** A non-DOM controller owns state transitions; React just renders.

Tasks:
- Identify state and commands currently in `BreadboardApp`.
- Move pure state transitions into `src/ui-controller/`.
- Define `AppState` and `Action` types.

Acceptance criteria:
- Controller can run extraction+simulation given a state.
- Unit tests can drive controller without DOM/canvas.

### Milestone 2 — Breadboard substrate in SVG
**Outcome:** Holes/rails/labels render, hover highlights work.

Acceptance criteria:
- Hover a hole highlights its row/rail net region.
- Click hole triggers the same action logic as today.

### Milestone 3 — Component rendering and manipulation
**Outcome:** Components render and can be selected, dragged, rotated.

Acceptance criteria:
- Drag-to-move works with snap-to-hole insertion.
- Rotation works with correct pin mapping.
- Undo/redo works.

### Milestone 4 — Rete graph layer visible and aligned
**Outcome:** Rete editor runs in DOM and is aligned with breadboard world space.

Acceptance criteria:
- Connections exist and render visually.
- Pan/zoom keeps all layers aligned.

### Milestone 5 — Interactive wiring via Rete
**Outcome:** Phase-3-style connection creation works without Pixi.

Acceptance criteria:
- Drag leg → hole creates connection.
- One-connector-per-hole constraint enforced with clear feedback.

### Milestone 6 — Overlays and explain panel parity
**Outcome:** Voltage overlay, current animation, and errors render in DOM.

Acceptance criteria:
- Voltage overlay matches simulation node voltages.
- Current animation reflects `edgeCurrents` direction/magnitude.
- Error badges clickable → explain panel.

### Milestone 7 — Remove PixiJS
**Outcome:** PixiJS is fully removed.

Tasks:
- Delete `src/ui/pixi-renderer.ts` and Pixi-specific code paths.
- Remove `pixi.js` from dependencies.
- Remove canvas-specific coordinate transforms.
- Update tests and Playwright baselines.

Acceptance criteria:
- `npm run build` succeeds.
- All unit tests pass.
- Visual regression suite updated and passing.

---

## Testing strategy adjustments

### Unit tests
Current tests often avoid DOM checks because Pixi renders to canvas. After migration:
- Prefer testing the **controller** state transitions (fast, deterministic).
- Add targeted React component tests only for critical view-level behaviors (selection, keyboard shortcuts) using jsdom.

### Playwright
- Keep/expand visual regression tests; SVG is highly testable.
- Add interaction smoke tests for drag/rotate/connect.

---

## Risks & mitigations

### Risk: SVG performance regression
Mitigation:
- Symbol reuse, event delegation, memoization, avoid per-hole React components.

### Risk: Rete React renderer integration complexity
Mitigation:
- Start with Rete “headless” (logic only) while rendering connections in React/SVG from `reteManager.getConnections()`.
- Switch to official Rete React renderer when stabilized.

### Risk: Large refactor destabilizes UX
Mitigation:
- Feature flags and side-by-side mode during development.
- Milestone-based parity checks.

---

## Concrete file-level change map (expected)

### New files (expected)
- `src/main.tsx`
- `src/ui-react/**`
- `src/ui-controller/**`

### Modified files (expected)
- `package.json` (add React deps, remove Pixi)
- `tsconfig.json` (JSX)
- `src/main.ts` (replaced by `main.tsx`)
- `src/ui/breadboard-app.ts` (eventually removed or reduced)

### Deleted files (end-state)
- `src/ui/pixi-renderer.ts`

---

## Definition of done

This migration is complete when:
- `pixi.js` is not present in runtime dependencies.
- The application renders entirely via React DOM/SVG.
- All major interactions (select, drag, rotate, connect) work.
- Overlays (voltage/current/errors) are rendered and tied to solver output.
- Tests pass and visual baselines are updated.

---

## Appendix: guiding principles

1) **Declarative UI**: state drives view; no imperative redraw pipeline.
2) **Single source of truth**: Rete for connectivity; controller for UI state.
3) **No WebGL**: avoid libraries that quietly choose WebGL renderers.
4) **Parity first, polish later**: get correctness and usability before photorealism.
