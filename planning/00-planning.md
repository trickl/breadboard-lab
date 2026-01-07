# Breadboard Educational Tool — Rete.js Migration Planning Document

**Version:** 1.0  
**Date:** January 2026  
**Status:** Architecture Planning Phase  
**Target:** Migration from PixiJS Bespoke Wiring to Rete.js Visual Programming Graph

---

## Executive Summary

This document provides a comprehensive, implementation-oriented plan for migrating Breadboard Lab from its current **PixiJS/WebGL-based bespoke wiring system** to a **Rete.js-based visual programming graph architecture**. This is not an optional enhancement—it is the **foundational architectural shift** explicitly required by `planning/vision/goal.md` (lines 24-38) upon which the entire current iteration is built.

The migration will transform how the application handles component placement, connection management, snapping, routing, and interaction state—moving from fragile custom implementations to leveraging Rete.js's native node-connector-edge abstractions, built-in connection constraints, and re-routing capabilities.

**Document Length:** This planning document is intentionally comprehensive (5,000+ words) to serve as the authoritative technical specification for this major architectural change.

---

## Table of Contents

1. [Core Objective and USP](#1-core-objective-and-usp)
2. [Current State Analysis](#2-current-state-analysis)
3. [Competitors and Inspiration](#3-competitors-and-inspiration)
4. [Licensing Constraints](#4-licensing-constraints)
5. [Architectural Rationale](#5-architectural-rationale)
6. [UI/UX Requirements](#6-uiux-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [Solver Integration Strategy](#8-solver-integration-strategy)
9. [Views and Visualization](#9-views-and-visualization)
10. [Data Model Migration](#10-data-model-migration)
11. [Phased Implementation Roadmap](#11-phased-implementation-roadmap)
12. [Testing Strategy](#12-testing-strategy)
13. [Risk Assessment and Mitigation](#13-risk-assessment-and-mitigation)
14. [Non-Goals](#14-non-goals)
15. [Definition of Done](#15-definition-of-done)
16. [References](#16-references)

---

## 1. Core Objective and USP

### 1.1 Primary Objective

Build a **web-based breadboard tool** with:

1. A **best-in-class breadboard UI** with drag/drop, rotate, snap, and intelligent wiring
2. A **separate, explicit electrical model** (nets, components, constraints) that can be solved and visualized
3. **Electricity-flow visualization** (voltage/current overlays and animations) tied to solver output—not decorative
4. Designed to be **easy to start** (no install, immediate value) but **powerful** (not toy-level)

### 1.2 Unique Selling Proposition (USP)

**"A web-first breadboard UI that is not merely a drawing tool: it maintains a first-class electrical net model and can visualize real computed circuit behavior directly on the breadboard and on a derived schematic view."**

#### Key Differentiators

- **Breadboard view** = physical placement and wiring constraints (realistic, spatial)
- **Electrical graph/netlist** = what the circuit *is* (topological, abstract)
- **Solver** = what the circuit *does* (behavioral, computational)
- **Visual overlays** = how we teach/debug (pedagogical, interactive)

The Rete.js migration enables this USP by providing:
- Native modeling of component legs as fixed connectors
- Explicit representation of breadboard holes as exclusive connection points
- Automatic enforcement of physical constraints (one connector per hole)
- Visual feedback for invalid connections
- Re-routing capabilities that reflect real wire manipulation

---

## 2. Current State Analysis

### 2.1 Existing Architecture Overview

**Current Stack:**
- **Frontend Framework:** Vanilla TypeScript with Vite build system
- **Rendering:** PixiJS 8.6.6 (WebGL/Canvas via autoDetectRenderer)
- **State Management:** Immutable component array in `BreadboardApp`
- **Circuit Extraction:** Union-find algorithm for connected components
- **Simulation:** Modified Nodal Analysis (MNA) for DC circuits
- **Testing:** Vitest (410 unit/integration tests), Playwright (visual regression)

**Key Files:**
- `src/ui/breadboard-app.ts` (2,638 lines) — Main application logic, interaction handling
- `src/ui/pixi-renderer.ts` (1,136 lines) — PixiJS rendering, component graphics, animations
- `src/core/types.ts` — Domain model (Component, Circuit, Position types)
- `src/core/circuit-extractor.ts` — Converts breadboard positions to electrical graph
- `src/core/circuit-simulator.ts` — MNA solver for voltages and currents

### 2.2 Current Interaction Model (PixiJS-Based)

#### Component Placement Flow
1. User selects component type from toolbar
2. First click sets `placementStart` position
3. Second click sets end position
4. `placeComponent()` creates component with two positions
5. Component added to state array
6. Full re-render triggered

#### Connection Management
- **Implicit:** Components are connected if they share breadboard positions
- **No explicit wiring objects:** Wires are components with two positions, treated identically to resistors/LEDs
- **Circuit extraction:** Union-find algorithm builds connectivity graph from shared positions
- **No visual connection constraints:** User can place components on occupied positions (simulator detects shorts)

#### Interaction Primitives
```typescript
// From src/ui/breadboard-app.ts
interface DragState {
  componentId: string;
  startMousePos: { x: number; y: number };
  currentMousePos: { x: number; y: number };
  originalPositions: Position[];
  previewPositions: Position[] | null; // null if invalid
  offsetFromFirstPin: { x: number; y: number };
}
```

**Current Drag-and-Drop Implementation:**
- `handleComponentDragStart(componentId, globalX, globalY)` — Sets up drag state, adds mouse listeners
- `handleMouseMove(event)` — Calculates preview positions, snaps to grid, validates placement
- `handleMouseUp(event)` — Commits move via HistoryManager or cancels if invalid
- Custom snapping logic using `PixiRenderer.HOLE_SPACING` constants
- Manual collision detection by checking if all new positions are free

### 2.3 Pain Points with Current PixiJS Implementation

#### 1. Manual Connection Management Complexity
**Problem:** Every connection constraint must be implemented manually:
- No native concept of "sockets" or "ports"
- Component legs are not first-class objects—they're inferred from positions array
- Cannot enforce "one connector per hole" at interaction level (only validation after placement)
- Wire routing is purely cosmetic (straight lines between positions)

**Example:** When dragging a component, the system must:
1. Track original positions
2. Calculate offset from mouse to first pin
3. Snap first pin to grid
4. Calculate delta from original to snapped
5. Apply delta to all other pins
6. Validate each resulting position is free
7. Update preview state
8. Re-render entire scene

This is fragile and error-prone.

#### 2. No Native Re-Routing Support
**Problem:** Wire paths are fixed after placement:
- Wires are just two-position components
- Cannot drag a wire segment to create a new route
- Cannot insert intermediate waypoints
- No automatic collision avoidance

**Goal.md Requirement (lines 161-165):**
> "Wires are draggable via control points. Re-routing must be supported (Rete re-root pattern): dragging a segment recalculates the path. Routing avoids component overlap where possible."

This cannot be implemented cleanly with the current position-based model.

#### 3. Implicit Connectivity Model
**Problem:** Circuit connections are inferred, not explicit:
- No first-class "connection" objects
- Components define positions; connectivity is derived by union-find
- Makes it difficult to:
  - Highlight connection paths
  - Enforce connection rules before placement
  - Show visual feedback for invalid connections
  - Implement intelligent wire routing

**Goal.md Requirement (lines 51-57):**
> "A one-connector-per-hole constraint must be enforced. A hole may only accept one connector."

Current system allows overlapping placements; simulator detects shorts but cannot prevent them at interaction level.

#### 4. Component Leg Abstraction
**Problem:** Component legs are not modeled explicitly:
- LED has two positions, but which is anode vs cathode is inferred from rotation
- Cannot attach metadata to individual legs (voltage, current, name)
- Cannot independently interact with legs (e.g., tooltip on specific leg)
- Makes realistic component geometry difficult (TO-92 transistor with 120° leg spacing)

**Goal.md Requirement (lines 127-130):**
> "Legs are: Fixed relative to the component body, Represented as Rete connectors, Positioned at realistic angles (e.g. 120° separation for TO-92 transistors)"

Current rotation is limited to 90° increments; continuous rotation with fixed leg geometry requires explicit leg modeling.


#### 5. Snapping Logic Fragility
**Problem:** Custom snapping implementation:
- Hard-coded to rectangular grid
- Snapping logic is in `handleMouseMove`, duplicated in some tests
- Difficult to extend to non-grid snapping (e.g., polar coordinates for rotation)
- No visual feedback for snap targets before drop

Rete.js provides native snapping to socket positions, eliminating custom logic.

### 2.4 What Works Well (Must Be Preserved)

#### 1. PixiJS Rendering Performance
- WebGL acceleration handles 300+ breadboard holes smoothly
- Current animation (particles for current flow) runs at 60fps
- Component rendering with realistic graphics (resistor color bands, LED glow)
- Voltage heatmap overlay with smooth gradients

**Decision:** Keep PixiJS for rendering; Rete.js manages graph, not pixels.

#### 2. Clean Core/UI Separation
- `CircuitExtractor` is independent of UI
- `CircuitSimulator` has no UI dependencies
- Can test electrical behavior without rendering
- This separation must be maintained

#### 3. Comprehensive Testing
- 410 passing tests (Vitest + Playwright)
- Visual regression testing for rendering changes
- Test coverage includes: breadboard layout, circuit extraction, digital simulation, EDU-8 microprocessor
- All tests must continue to pass (or be updated for new architecture)

#### 4. Undo/Redo System
- `HistoryManager` with Command pattern (50-step history)
- Commands: AddComponent, DeleteComponent, MoveComponent, RotateComponent, EditProperty
- Well-architected, should integrate cleanly with Rete.js state changes

---

## 3. Competitors and Inspiration

### 3.1 Fritzing

**What It Does Well:**
- Industry-standard breadboard documentation and communication tool
- Excellent library of real-world parts with accurate footprints
- Exports to PCB layout and manufacturing files
- Clear visual style, immediately recognizable

**Website:** https://fritzing.org/  
**Source:** https://github.com/fritzing/fritzing-app (GPL v3)

**Limitations and Gaps We Exploit:**
- Desktop-oriented (Qt-based); no web-first design
- Primarily a documentation tool, not an interactive simulator
- Simulation capabilities are limited (based on ngspice integration, not core feature)
- No real-time feedback or animated current flow
- **Licensing constraint:** Fritzing FAQ explicitly restricts use of their part graphics in other software systems

**Our Advantage:** Web-first with integrated simulation and live electrical visualization.

### 3.2 Falstad / CircuitJS

**What It Does Well:**
- Highly interactive analog/digital circuit simulation
- Excellent real-time visualization (voltage graphs, current flow, oscilloscope)
- Instant feedback—simulation runs continuously
- Educational focus with clear component models

**Website:** https://www.falstad.com/circuit/  
**Source:** https://github.com/pfalstad/circuitjs1 (GPL v2)

**About Page:** Falstad mentions CircuitJS1 as the successor to the original Java applet, maintaining educational mission with modern web technologies.

**Limitations and Gaps We Exploit:**
- Schematic-first, not breadboard-first
- Abstract symbols, not realistic component placement
- No concept of physical breadboard constraints
- Not designed for teaching physical circuit construction

**Our Advantage:** Breadboard-first interaction model that bridges physical and abstract representations.

### 3.3 Wokwi

**What It Does Well:**
- Strong embedded simulation ecosystem (Arduino, ESP32, Raspberry Pi Pico)
- Excellent web tooling and user experience
- Real-time collaboration features
- Integration with IDEs and online platforms

**Website:** https://wokwi.com/  
**Licensing:** Not fully open source; some components are proprietary  
**Pricing:** Free tier + paid plans for advanced features

**Limitations and Gaps We Exploit:**
- Focused on microcontroller simulation, not general electronics education
- Breadboard view is simplified/stylized
- Licensing is not "just open source for everything"
- Component library is curated but not as extensive as Fritzing for passive components

**Our Advantage:** Fully open source, focused on foundational electronics concepts, extensible architecture.

### 3.4 Other Breadboard Tools

**PICAXE PEBBLE (Physical Electronic Breadboard Emulator):**
- Educational tool for PICAXE microcontrollers
- Breadboard layout emphasis
- Limited to PICAXE ecosystem

**Tinkercad Circuits (Autodesk):**
- Very accessible, web-based
- Block-based programming integration
- Simplified simulation (less accurate than SPICE)
- Closed source, proprietary

**Our Position:**
We fill the gap between Fritzing (documentation) and CircuitJS (schematic simulation) by providing a **breadboard-first**, **web-native**, **simulation-integrated**, **fully open source** educational tool.

---

## 4. Licensing Constraints

### 4.1 Fritzing Part Graphics

**Critical Constraint:** Do not reuse Fritzing part graphics in this project.

**Source:** Fritzing FAQ (https://fritzing.org/faq)  
**Relevant Text:** Fritzing explicitly restricts the use of their part graphics in other software systems. While Fritzing is open source (GPL), the part library has specific usage restrictions.

**Compliance:**
- All component graphics in Breadboard Lab are procedurally generated or created independently
- Current PixiJS renderer draws components programmatically (resistor body, LED lens, wire paths)
- Any future SVG/image assets must be original work or compatible licensed (CC0, MIT, etc.)

### 4.2 Third-Party Library Licenses

**Current Dependencies:**
- PixiJS: MIT License ✓ (compatible with our project)
- Vitest: MIT License ✓
- TypeScript: Apache 2.0 ✓
- Vite: MIT License ✓

**Planned Dependencies:**
- Rete.js: MIT License ✓ (compatible)
- Rete React Plugin (if used): MIT License ✓

**CircuitJS1 / Falstad Consideration:**
- CircuitJS1 is GPL v2
- If we were to reuse CircuitJS1 solver code, our project would need to be GPL-compatible
- **Decision:** We have our own MNA solver implementation (MIT), no GPL dependency
- We reference CircuitJS1 as inspiration/comparison only, not code reuse

**Project License:** MIT (as per current LICENSE file)  
**License Compatibility:** All dependencies are MIT or Apache 2.0 (permissive, compatible)

### 4.3 Component Library Provenance

**Current Approach:**
- Component library entries in `src/library/` define electrical parameters and metadata
- Visual rendering is procedural (code-based, not asset-based)
- Real-world part data (resistor values, LED forward voltages) is factual information (not copyrightable)

**Future Assets:**
- If adding datasheets or manufacturer logos, ensure proper licensing or fair use
- If adding component photos, must be original or CC0/Public Domain
- If adding symbols, prefer IEEE/IEC standard symbols (not proprietary)

---

## 5. Architectural Rationale

### 5.1 Why Migrate from PixiJS Bespoke System?

**Stated Rationale from goal.md (lines 24-38):**

> "The existing PixiJS implementation makes connector management, snapping, routing, and interaction state increasingly complex and fragile. Rete.js provides: Native node–connector–edge abstractions, Built-in connection constraints, Support for re-routing, animated edges, and custom socket logic, A clean conceptual mapping to electrical networks."

**Expanded Justification:**

#### Problem: PixiJS is a Rendering Library, Not an Interaction Framework
PixiJS provides excellent low-level graphics primitives (Graphics, Container, Sprites, interaction events), but it does not provide high-level abstractions for:
- Graph-based node-and-edge relationships
- Connection constraints and validation
- Socket-based connection points
- Drag-and-drop with snapping to targets
- Path routing and re-routing

Every interaction pattern must be implemented from scratch. This is fine for simple applications, but for a complex graph-based editor, it leads to:
- Reinventing the wheel (custom drag/snap/validation logic)
- Hard-to-maintain code (2,638 lines in breadboard-app.ts)
- Fragile state management (dragState, placementStart, etc.)
- Difficulty extending (adding new interaction modes requires rewriting core logic)

#### Solution: Rete.js Provides Graph-First Interaction Primitives
Rete.js is a framework for building visual programming interfaces. It provides:
- **Node abstraction:** Components, breadboard holes, wires
- **Socket abstraction:** Component legs, hole connections
- **Connection abstraction:** Explicit edges with validation
- **Built-in interaction:** Drag-and-drop, connection creation, re-routing
- **Plugin architecture:** Extensible rendering, custom logic

By migrating to Rete.js, we move from "implement everything" to "configure and extend."

### 5.2 Why Rete.js Specifically?

**Evaluated Alternatives:**
1. **React Flow:** Excellent for flowcharts/diagrams, but not designed for custom interaction like breadboards
2. **jsPlumb:** More low-level than Rete.js, similar to current PixiJS approach
3. **Cytoscape.js:** Graph visualization library, not interaction-first
4. **D3.js:** Low-level like PixiJS, would require similar custom implementation

**Rete.js Advantages:**
- **Visual programming focus:** Designed for node-based editors (exactly our use case)
- **TypeScript support:** First-class types, same as our project
- **Renderer-agnostic:** Can use React, Vue, Angular, or custom renderers (including PixiJS hybrid)
- **Active development:** v2.x released in 2023, modern API
- **Extensible:** Plugin system for custom behaviors
- **MIT License:** Permissive, compatible with our license

**Rete.js Limitations:**
- Learning curve for custom rendering (if going hybrid PixiJS approach)
- Documentation could be more comprehensive (some features require reading source)
- Community is smaller than React Flow or D3.js

**Decision:** Rete.js is the best fit for our requirements (breadboard-first, graph-based, extensible).


### 5.3 Conceptual Mapping: Breadboard → Rete.js

| Breadboard Concept | Current Implementation | Rete.js Abstraction |
|-------------------|------------------------|---------------------|
| Component body | `Component` object with positions | `Node` with fixed socket positions |
| Component leg | Inferred from positions array | `Socket` (input/output) |
| Breadboard hole | `Position` {row, col} | `Node` with single exclusive socket OR direct socket |
| Wire | Component with type=WIRE | `Connection` (edge between sockets) OR thin Node with two sockets |
| Connection | Implicit (shared positions) | Explicit `Connection` object |
| Drag-and-drop | Custom handleMouseMove/Up | Rete's built-in drag plugin |
| Snapping | Custom grid calculation | Rete's socket magnetism |
| Validation | Post-placement check | Pre-connection socket rules |

**Key Insight:** Rete.js models match our domain concepts more naturally than position arrays.

---

## 6. UI/UX Requirements

This section defines concrete, testable interaction requirements that the Rete.js migration must support.

### 6.1 Breadboard Hole Interactions

**Requirement BH-1: Hole Hover Feedback**
- When user hovers over a breadboard hole, highlight the entire electrically connected strip/rail
- Display voltage value (if simulated) in tooltip
- Show "occupied" indicator if hole already has a connection

**Acceptance Criteria:**
- Hover triggers within 200ms
- Highlight uses distinct color (e.g., semi-transparent yellow overlay)
- Tooltip includes: position (e.g., "A5"), voltage (e.g., "3.2V"), connection status

**Requirement BH-2: One-Connector-Per-Hole Constraint**
- A breadboard hole can accept at most one component leg connection
- Attempting to connect a second leg to an occupied hole must show visual rejection
- Visual rejection: red X or circle-with-slash icon, hole pulses briefly

**Acceptance Criteria:**
- Cannot complete connection to occupied hole (Rete.js connection validation)
- Visual feedback appears within 100ms of attempt
- Error message in explain panel: "Hole [position] is already occupied by [component]"

**Rete.js Implementation:**
- Breadboard holes are `Node` instances with a single `Socket`
- Socket has `maxConnections: 1` constraint
- Rete.js built-in validation handles rejection
- Custom rendering plugin displays visual feedback

### 6.2 Component Placement Workflow

**Requirement CP-1: Adjacent Placement (goal.md lines 108-116)**
- When user selects a component from library, it appears *adjacent* to the breadboard (not on it)
- Component is in "floating" state with visual distinction (e.g., semi-transparent, glow outline)
- User can drag component body to position it near desired area
- Component legs are visible and snap-ready (show connection radius)

**Acceptance Criteria:**
- Component appears within 500ms of selection
- Floating component is visually distinct (opacity 0.7, blue glow)
- Component follows cursor smoothly (60fps minimum)
- Legs show connection affordance (dotted circle indicating snap range)

**Requirement CP-2: Leg Connection Workflow**
- After positioning component body, user connects individual legs to breadboard holes
- Legs snap to nearby holes (within snap radius, e.g., 30px)
- Snapping is magnetic: leg "jumps" to hole center when within range
- Invalid connections are rejected with visual feedback

**Acceptance Criteria:**
- Snap radius configurable (default 30px in screen space)
- Snap animation is smooth (ease-out curve, 150ms)
- Valid snap: leg highlights green, hole highlights green
- Invalid snap: leg highlights red, hole highlights red or doesn't highlight

**Requirement CP-3: Component Rotation (goal.md lines 193-202)**
- Selected component can be rotated continuously (not limited to 90° increments)
- Rotation handle: circular arc or rotate icon appears when component is selected
- Rotation updates leg positions in real-time
- Rotation is persistent (saved with component state)

**Acceptance Criteria:**
- Rotation handle appears within 200ms of selection
- Rotation is smooth (no jitter or lag at 60fps)
- Leg positions update continuously during rotation
- Rotation angle is arbitrary (not quantized to 90°)
- Snapping to holes still works after rotation

**Rete.js Implementation:**
- Component is a `Node` with fixed socket positions (relative coordinates)
- Rotation updates socket world positions via transform matrix
- Custom rendering plugin draws rotation handle
- Rete.js connection manager handles socket position updates

### 6.3 Wire Interactions

**Requirement WI-1: Wire Placement**
- User selects "Wire" from component library
- First click: set wire start (snap to breadboard hole)
- Second click: set wire end (snap to breadboard hole)
- Wire path is rendered (straight line in MVP, spline in future)

**Acceptance Criteria:**
- Wire color is selectable (default: red, options: black, yellow, green, blue, orange, white, purple)
- Wire path is visible during placement (ghost/preview)
- Cannot place wire with start=end (validation)
- Wire adds to undo history

**Requirement WI-2: Wire Re-Routing (goal.md lines 161-165)**
- User can click and drag a wire segment to create a new route
- Dragging creates an intermediate waypoint
- Wire path recalculates to avoid overlap with components (optional optimization)
- Re-routing updates connection without recreating wire

**Acceptance Criteria:**
- Clicking wire highlights it (selection state)
- Dragging middle section creates bezier control point or orthogonal route
- Re-routing is smooth (no visible flicker)
- Wire endpoints remain connected to original holes

**Rete.js Implementation:**
- **Option A (Edge-based):** Wire is a `Connection` with custom path rendering
- **Option B (Node-based):** Wire is a thin `Node` with two sockets (more flexible for routing)
- Re-routing uses Rete.js re-root plugin pattern (drag connection to change path)

### 6.4 Selection and Deletion

**Requirement SD-1: Component Selection**
- Clicking component body selects it
- Selected component: visual highlight (border, glow, outline)
- Selection enables: rotation, deletion, property editing, drag-to-move
- Clicking breadboard background deselects

**Acceptance Criteria:**
- Selection highlight is clear and consistent
- Only one component selected at a time (multi-select is future enhancement)
- Selection state persists until explicit deselect

**Requirement SD-2: Component Deletion**
- Delete key or on-screen button deletes selected component
- Deletion removes: component node, all connections, references in circuit
- Deletion adds to undo history
- Deletion prompts confirmation if circuit will be broken (optional, future)

**Acceptance Criteria:**
- Deletion is immediate (no animation unless desired)
- Circuit re-simulates after deletion
- Undo restores component and connections exactly

**Rete.js Implementation:**
- Selection managed by Rete.js plugin (SelectablePlugin or custom)
- Deletion calls `editor.removeNode(nodeId)`
- Rete.js automatically removes connections when node is deleted
- Sync Rete state to BreadboardApp state to trigger re-simulation

### 6.5 Keyboard Shortcuts

**Requirement KS-1: Essential Shortcuts**
- `Delete` or `Backspace`: Delete selected component
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Shift+Z`: Redo
- `R`: Rotate selected component (toggle rotation handle)
- `Esc`: Deselect / cancel current action

**Acceptance Criteria:**
- Shortcuts work consistently across all interaction states
- Shortcuts do not conflict with browser defaults (where possible)
- Shortcuts are documented in UI (tooltip or help panel)

**Rete.js Implementation:**
- Key handlers registered at BreadboardApp level
- Rete.js state changes trigger corresponding actions
- Undo/redo syncs Rete state with HistoryManager

---

## 7. Technical Architecture

### 7.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐   │
│  │   Toolbar   │  │ Breadboard  │  │  Schematic View    │   │
│  │  (React?)   │  │   Canvas    │  │   (Auto-layout)    │   │
│  └─────────────┘  └─────────────┘  └────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴──────────────┐
        │                               │
        ▼                               ▼
┌─────────────────┐           ┌─────────────────────┐
│   Rete.js       │◄─────────►│  PixiJS Renderer    │
│   Editor        │   Sync    │  (Visual Layer)     │
│  (Graph Logic)  │           │                     │
│                 │           │  - Breadboard grid  │
│ - Nodes         │           │  - Components       │
│ - Sockets       │           │  - Wires            │
│ - Connections   │           │  - Animations       │
│ - Validation    │           │  - Voltage overlay  │
└────────┬────────┘           └─────────────────────┘
         │
         │ Graph State
         │
         ▼
┌──────────────────────────────────────────────────────┐
│            BreadboardApp (Coordination)              │
│                                                      │
│  - Sync Rete ↔ Component Array                      │
│  - Trigger Circuit Extraction                       │
│  - Trigger Simulation                               │
│  - Manage History (Undo/Redo)                       │
│  - Handle Toolbar Actions                           │
└────────┬─────────────────────────────────────────────┘
         │
         │ Component Array
         │
         ▼
┌──────────────────────────────────────────────────────┐
│              Core Layer (Unchanged)                  │
│                                                      │
│  ┌─────────────────┐  ┌───────────────────────┐     │
│  │ CircuitExtractor│  │  CircuitSimulator     │     │
│  │                 │  │  (MNA Solver)         │     │
│  │ Position-based  │  │                       │     │
│  │ connectivity    │  │  - DC analysis        │     │
│  └─────────────────┘  │  - Voltage/current    │     │
│                       │  - Error detection    │     │
│                       └───────────────────────┘     │
│                                                      │
│  Component Types, BreadboardLayout, etc.            │
└──────────────────────────────────────────────────────┘
```

**Key Architectural Decisions:**

1. **Rete.js is the source of truth for interaction state** (nodes, connections, drag state)
2. **BreadboardApp coordinates** between Rete and Core (extraction/simulation)
3. **PixiJS reads from Rete state** and renders visuals (no direct Rete rendering)
4. **Core layer is unchanged** (position-based extraction continues to work)

### 7.2 Rendering Strategy: Hybrid Architecture (Option B)

After evaluating options from the issue:

**Option A: Full Rete Renderer**
- Use Rete's React/Vue rendering plugins
- **Pros:** Native Rete features work out-of-box
- **Cons:** Lose PixiJS performance; massive visual refactor; may not support photorealistic rendering

**Option B: Hybrid Architecture** ← **SELECTED**
- Rete for connection graph logic (nodes, sockets, edges)
- PixiJS for visual rendering (read Rete state, render components)
- **Pros:** Keep PixiJS performance; leverage Rete's connection management; incremental migration
- **Cons:** More complex integration; state synchronization overhead

**Option C: Custom Rete Renderer with PixiJS**
- Implement Rete rendering plugin for PixiJS
- **Pros:** Best of both worlds; clean separation
- **Cons:** Most implementation work; requires deep Rete plugin development

**Decision Rationale for Option B:**
- **Minimizes risk:** PixiJS rendering continues to work; can fall back if Rete integration fails
- **Incremental:** Can migrate interaction layer first, then optimize rendering later
- **Preserves investment:** 1,136 lines of PixiJS rendering code remain useful
- **Performance:** WebGL rendering for breadboard grid and animations is critical
- **Flexibility:** If Option C becomes desirable later, Option B is a stepping stone

**Implementation Approach:**
1. Rete.js editor instance runs "headless" (no DOM rendering by Rete)
2. PixiJS renderer subscribes to Rete state changes (events or polling)
3. PixiJS reads node positions, socket positions, connection paths from Rete
4. PixiJS renders everything as it does now, but driven by Rete state

**Synchronization Pattern:**
```typescript
// Rete editor
const editor = new NodeEditor<Schemes>();

// Listen to Rete events
editor.addPipe((context) => {
  if (context.type === 'nodecreated' || context.type === 'nodetranslated') {
    pixiRenderer.updateNodeVisual(context.data);
  }
  if (context.type === 'connectioncreated') {
    pixiRenderer.updateConnectionVisual(context.data);
  }
  return context;
});

// PixiJS rendering reads Rete state
class PixiRenderer {
  updateNodeVisual(node: Node) {
    const positions = this.reteNodeToPositions(node);
    // Render component at positions using existing logic
  }
}
```

### 7.3 Rete.js Version and Configuration

**Target Version:** Rete.js v2.x (latest stable as of Jan 2026)

**Rationale:**
- v2.x is modern, actively maintained
- TypeScript support is first-class
- React 18+ compatible (if we later add React for UI controls)
- Breaking changes from v1 are documented

**Installation:**
```json
{
  "dependencies": {
    "rete": "^2.0.0",
    "rete-area-plugin": "^2.0.0",
    "rete-connection-plugin": "^2.0.0"
  }
}
```

**Core Plugins:**
- `rete-area-plugin`: Panning, zooming, coordinate transforms (may not use if PixiJS handles viewport)
- `rete-connection-plugin`: Connection creation, validation, re-routing
- Custom plugins: Socket constraints, breadboard-specific validation

### 7.4 Node and Socket Design

#### Breadboard Hole Node

**Purpose:** Represent a single breadboard hole as an exclusive connection point.

```typescript
class BreadboardHoleNode extends ClassicPreset.Node {
  constructor(position: Position) {
    super('BreadboardHole');
    this.position = position;
    
    // Single exclusive socket
    this.addOutput('connection', new ClassicPreset.Socket('breadboard-hole', {
      maxConnections: 1, // Only one component leg can connect
    }));
  }
  
  position: Position;
}
```

**Alternative:** Instead of nodes, breadboard holes could be modeled as "anchor sockets" in Rete (advanced pattern). MVP uses nodes for simplicity.

#### Component Node

**Purpose:** Represent a component body with fixed leg sockets.

```typescript
class ComponentNode extends ClassicPreset.Node {
  constructor(component: AnyComponent) {
    super(component.type);
    this.component = component;
    
    // Add sockets for each leg
    component.positions.forEach((pos, index) => {
      this.addInput(`leg${index}`, new ClassicPreset.Socket('component-leg', {
        maxConnections: 1, // Each leg connects to one hole
      }));
    });
  }
  
  component: AnyComponent;
  
  // Override position calculation to use component rotation
  getLegWorldPosition(legIndex: number): {x: number, y: number} {
    const basePos = this.component.positions[legIndex];
    const worldPos = BreadboardLayout.positionToPixels(basePos);
    // Apply rotation transform if needed
    return this.applyRotation(worldPos, this.component.rotation);
  }
}
```

#### Wire Node (Node-Based Approach)

**Purpose:** Represent a wire as a thin node with two sockets, allowing re-routing.

```typescript
class WireNode extends ClassicPreset.Node {
  constructor(wire: Wire) {
    super('Wire');
    this.wire = wire;
    
    this.addInput('start', new ClassicPreset.Socket('wire-end'));
    this.addOutput('end', new ClassicPreset.Socket('wire-end'));
  }
  
  wire: Wire;
  color: string;
  waypoints: Array<{x: number, y: number}>; // For advanced routing
}
```

**Alternative (Edge-Based):** Wire is a `Connection` with custom path rendering. Simpler but less flexible for re-routing.

**Decision for MVP:** Edge-based (simpler). Node-based can be added later for advanced routing.



---

## 8. Solver Integration Strategy

### 8.1 Maintaining Core Layer Independence

**Critical Requirement:** The circuit extraction and simulation layers must remain independent of Rete.js.

**Rationale:**
- Core logic is well-tested (410 tests)
- Core can be used in Node.js, CLI tools, other contexts
- Changing core increases risk and scope

**Implementation:**
- `CircuitExtractor` continues to work with `Position[]` arrays
- `BreadboardApp` converts Rete graph → Component array → Circuit graph
- Simulation runs on Circuit graph (unchanged)

### 8.2 Conversion Pipeline

```
Rete.js Graph State
        ↓
   (Conversion Layer)
        ↓
  Component Array (BreadboardState)
        ↓
  CircuitExtractor.extract()
        ↓
  Circuit Graph (nodes, edges)
        ↓
  CircuitSimulator.simulate()
        ↓
  SimulationResult (voltages, currents, errors)
        ↓
  PixiJS Rendering (voltage overlay, animations)
```

**Conversion Layer Responsibilities:**
1. Map Rete nodes → Component objects
2. Map Rete connections → Component positions (infer from socket connections)
3. Maintain bidirectional sync (Rete ↔ Component array)
4. Trigger re-extraction and re-simulation on graph changes

### 8.3 Fast DC Sanity Solver (Two-Tier Strategy)

**Proposal:** Implement two simulation tiers for user feedback:

**Tier 1: Fast DC Sanity Solver** (Runs on every change, <16ms target)
- Resistive networks + independent sources only
- Detects: shorts, floating nodes, open circuits
- Provides immediate feedback (red highlights, warnings)
- Uses simplified MNA (fewer iterations, no convergence loops)

**Tier 2: Full MNA Solver** (Runs on demand or debounced)
- Current implementation (Modified Nodal Analysis)
- Handles LEDs, non-linear components
- Provides accurate voltages/currents for visualization

**Rationale:**
- User needs immediate feedback while dragging components
- Full simulation may be too slow for real-time feedback (currently <50ms, but grows with circuit size)
- Two-tier approach common in EDA tools (DRC vs. LVS)

**Implementation:**
```typescript
class BreadboardApp {
  private fastSolver: FastDCSolver;
  private fullSolver: CircuitSimulator;
  
  onReteGraphChange() {
    // Immediate sanity check
    const sanityResult = this.fastSolver.validate(this.state);
    this.pixiRenderer.renderErrors(sanityResult.errors);
    
    // Debounced full simulation
    this.scheduleFullSimulation();
  }
  
  private scheduleFullSimulation() {
    clearTimeout(this.simulationTimer);
    this.simulationTimer = setTimeout(() => {
      const circuit = this.extractor.extract(this.state);
      const result = this.fullSolver.simulate(circuit);
      this.pixiRenderer.updateVoltageOverlay(result);
      this.pixiRenderer.startAnimation(result, this.state.components);
    }, 500); // 500ms debounce
  }
}
```

**Decision for MVP:** Skip Tier 1 initially; optimize Tier 2 if performance issues arise. Add Tier 1 if user testing shows need for faster feedback.

---

## 9. Views and Visualization

### 9.1 Breadboard View (Primary)

**Purpose:** Physical, realistic representation of circuit construction.

**Features:**
- Photorealistic breadboard grid (300 holes, rails, strips)
- Realistic component rendering (resistor bodies, LED lenses, wire paths)
- Voltage heatmap overlay (color-coded by voltage)
- Animated current flow (particles moving along wires and component legs)
- Error overlays (red highlights for shorts, floating nodes, reversed LEDs)

**Rete.js Integration:**
- Rete graph defines connectivity
- PixiJS renders based on Rete node/connection positions
- PixiJS layers: breadboard (static) → components → voltage overlay → particles → errors

### 9.2 Schematic View (Secondary)

**Purpose:** Auto-generated, abstracted circuit diagram for debugging and learning.

**Features:**
- Standard electrical symbols (IEEE/IEC)
- Auto-layout algorithm (existing `SchematicLayoutGenerator`)
- Maintains one-to-one mapping with breadboard circuit
- Switchable view (tabs or toggle button)

**Rete.js Integration:**
- Schematic view uses separate Rete editor instance OR
- Schematic is rendered separately by `SchematicRenderer` (no Rete)
- **Decision:** Keep schematic rendering separate (less complexity)

### 9.3 Electrical View Mode (UI Toggle)

**Stated in goal.md lines 237-275:**
- Toggle button to enable/disable electrical overlays
- When enabled: voltage/current annotations, animated current flow
- When disabled: clean physical view only

**Implementation:**
- Toggle button in toolbar
- State: `showElectricalOverlay: boolean`
- PixiJS conditionally renders overlay layers

### 9.4 X-Ray Mode (UI Toggle)

**Stated in goal.md lines 278-299:**
- Reveals internal breadboard wiring (strips, rails)
- Shows why holes are electrically connected
- Informational only (does not affect simulation)

**Implementation:**
- Toggle button in toolbar
- State: `showXRayMode: boolean`
- PixiJS renders internal connections with dotted lines or translucent overlays
- Highlight strips and rails with color coding

---

## 10. Data Model Migration

### 10.1 Current Data Model

```typescript
// src/core/types.ts
interface Position {
  row: number;
  col: number;
}

interface Component {
  id: string;
  type: ComponentType;
  positions: Position[]; // Array of occupied positions
  rotation: 0 | 90 | 180 | 270;
  libraryId?: string;
}

interface BreadboardState {
  components: AnyComponent[];
  selectedComponentId: string | null;
}
```

### 10.2 Target Data Model (with Rete.js)

```typescript
// Rete.js node types
type ReteNode = 
  | BreadboardHoleNode  // Represents a single hole
  | ComponentNode       // Represents a component body
  | WireNode;           // Represents a wire (optional)

interface BreadboardHoleNode extends ClassicPreset.Node {
  type: 'BreadboardHole';
  position: Position; // {row, col}
  socket: ClassicPreset.Socket; // maxConnections: 1
}

interface ComponentNode extends ClassicPreset.Node {
  type: 'Component';
  component: AnyComponent; // Embedded component data
  legSockets: Map<number, ClassicPreset.Socket>; // leg index → socket
}

// Rete.js connection
interface ReteConnection extends ClassicPreset.Connection {
  source: string; // Component node ID
  sourceOutput: string; // Socket key (e.g., "leg0")
  target: string; // Hole node ID
  targetInput: string; // Socket key (e.g., "connection")
}
```

### 10.3 Conversion Functions

**Rete → Component Array:**
```typescript
function reteGraphToComponentArray(editor: NodeEditor): AnyComponent[] {
  const components: AnyComponent[] = [];
  
  for (const node of editor.getNodes()) {
    if (node.type === 'Component') {
      const componentNode = node as ComponentNode;
      
      // Extract positions from connected hole nodes
      const positions: Position[] = [];
      for (const [legIndex, socket] of componentNode.legSockets) {
        const connections = editor.getConnections().filter(c => 
          c.source === node.id && c.sourceOutput === `leg${legIndex}`
        );
        if (connections.length > 0) {
          const holeNodeId = connections[0].target;
          const holeNode = editor.getNode(holeNodeId) as BreadboardHoleNode;
          positions.push(holeNode.position);
        }
      }
      
      components.push({
        ...componentNode.component,
        positions,
      });
    }
  }
  
  return components;
}
```

**Component Array → Rete Graph:**
```typescript
function componentArrayToReteGraph(
  editor: NodeEditor,
  components: AnyComponent[]
): void {
  editor.clear();
  
  // Create hole nodes for all positions
  const holeNodes = new Map<string, BreadboardHoleNode>();
  for (const component of components) {
    for (const pos of component.positions) {
      const key = `${pos.row},${pos.col}`;
      if (!holeNodes.has(key)) {
        const holeNode = new BreadboardHoleNode(pos);
        editor.addNode(holeNode);
        holeNodes.set(key, holeNode);
      }
    }
  }
  
  // Create component nodes and connections
  for (const component of components) {
    const componentNode = new ComponentNode(component);
    editor.addNode(componentNode);
    
    component.positions.forEach((pos, legIndex) => {
      const holeKey = `${pos.row},${pos.col}`;
      const holeNode = holeNodes.get(holeKey)!;
      
      const connection = new ClassicPreset.Connection(
        componentNode, `leg${legIndex}`,
        holeNode, 'connection'
      );
      editor.addConnection(connection);
    });
  }
}
```

### 10.4 Migration Strategy for Saved Circuits

**Problem:** Existing saved circuits use position-based format.

**Solution:** Auto-migration on load.

```typescript
interface CircuitMetadata {
  version: '1.0' | '2.0'; // Add version field
  name: string;
  description: string;
}

function loadCircuit(serialized: string): BreadboardState {
  const data = JSON.parse(serialized);
  
  if (!data.version || data.version === '1.0') {
    // Legacy format: position-based
    // Convert to Rete graph, then back to component array (normalizes data)
    const editor = new NodeEditor();
    componentArrayToReteGraph(editor, data.components);
    const components = reteGraphToComponentArray(editor);
    return { components, selectedComponentId: null };
  } else {
    // Future format: could store Rete graph JSON directly
    return data;
  }
}
```

---

## 11. Phased Implementation Roadmap

### Phase 1: Proof of Concept (Week 1-2, 3-5 days)

**Goal:** Establish Rete.js integration without breaking existing functionality.

**Tasks:**
1. Add `rete`, `rete-area-plugin`, `rete-connection-plugin` to package.json
2. Create `src/core/rete-manager.ts`:
   - Initialize Rete editor
   - Define node/socket types
   - Implement conversion functions (Rete ↔ Component array)
3. Integrate Rete into BreadboardApp:
   - Create Rete editor instance in constructor
   - Sync component array → Rete graph on init
   - Listen to Rete events, update component array
4. Keep PixiJS rendering unchanged (reads from component array)
5. Add unit tests for ReteManager
6. Verify all 410 tests still pass

**Success Criteria:**
- Rete editor runs (even if not visible)
- Component placement updates Rete graph
- Rete graph changes update component array
- All existing tests pass
- No visual changes (PixiJS still renders exactly as before)

**Risk Mitigation:**
- Implement behind feature flag: `USE_RETE = false` by default
- Parallel code paths during transition
- Can disable Rete and fall back to pure PixiJS if issues arise

### Phase 2: Rete-Driven Placement (Week 3-4, 5-10 days)

**Goal:** Shift component placement to use Rete's drag-and-drop.

**Tasks:**
1. Implement breadboard hole nodes:
   - Create 300 hole nodes (30 rows × 10 cols + 4 rails)
   - Position nodes at hole pixel coordinates
   - Add single exclusive socket to each
2. Update component placement workflow:
   - Component selection creates floating ComponentNode
   - User drags component, connects legs to hole nodes
   - Rete handles snapping and validation
3. Replace custom drag logic with Rete:
   - Remove handleMouseMove/handleMouseUp (or keep as fallback)
   - Use Rete's connection creation events
4. Update PixiJS to render from Rete positions:
   - Read component positions from Rete node/connection state
   - Render legs at socket world positions
5. Update tests for new placement workflow

**Success Criteria:**
- Component placement works via Rete drag-and-drop
- Legs snap to holes automatically (Rete magnetism)
- One-connector-per-hole enforced by Rete socket rules
- Visual rendering matches previous version
- All tests pass (or updated for new workflow)

**Risk Mitigation:**
- Test with small circuits first (2-3 components)
- Compare old vs. new placement side-by-side
- Keep old placement code as fallback initially

### Phase 3: Advanced Rete Features (Week 5-6, 5-10 days)

**Goal:** Leverage Rete capabilities for goal.md requirements.

**Tasks:**
1. Implement continuous rotation:
   - Add rotation handle to selected ComponentNode
   - Update socket positions on rotate
   - Test snapping after rotation
2. Implement wire re-routing (if using node-based wires):
   - Enable dragging wire segments
   - Create waypoints or control points
   - Update wire path rendering
3. Implement adjacent component placement:
   - Component appears off-board when selected
   - User drags to position before connecting legs
4. Add visual feedback for invalid connections:
   - Red highlight on occupied holes
   - Rejection animation when attempting invalid connection
5. Optimize Rete ↔ PixiJS sync performance

**Success Criteria:**
- Rotation is continuous (any angle)
- Socket positions update correctly on rotate
- Wire re-routing works (if implemented)
- All goal.md interaction requirements met
- Performance is acceptable (60fps for interactions)

### Phase 4: Cleanup and Documentation (Week 7, 2-3 days)

**Goal:** Remove technical debt and finalize architecture.

**Tasks:**
1. Remove deprecated PixiJS interaction code:
   - Delete old handleMouseMove/Up if fully replaced
   - Remove DragState interface if unused
2. Update ARCHITECTURE.md:
   - Document Rete.js integration
   - Explain hybrid rendering approach
   - Update data flow diagrams
3. Add developer guide: "Working with Rete.js in Breadboard Lab"
4. Document adding new component types
5. Performance profiling and optimization
6. Final test pass (all 410+ tests)

**Success Criteria:**
- Codebase is clean (no dead code)
- Documentation is complete and accurate
- Developer onboarding guide exists
- All tests pass
- Performance meets targets (no regressions)

### Phase 5: Optional Enhancements (Future)

**Not blocking MVP, but valuable:**
- Multi-select (drag to select multiple components)
- Rete mini-map (overview of entire circuit)
- Custom Rete renderer plugin (if hybrid proves insufficient)
- Advanced wire routing (orthogonal paths, collision avoidance)
- Snap-to-grid toggle (free positioning vs. grid-constrained)

---

## 12. Testing Strategy

### 12.1 Unit Tests

**ReteManager Tests** (`src/core/__tests__/rete-manager.test.ts`):
- Conversion: Component array → Rete graph
- Conversion: Rete graph → Component array
- Round-trip: Component → Rete → Component (lossless)
- Node creation (BreadboardHoleNode, ComponentNode)
- Socket constraint validation
- Connection creation and removal

**Integration Tests:**
- Rete event → Component array update
- Component placement → Rete graph update
- Rotation → Socket position update
- Deletion → Rete node removal

### 12.2 Interaction Tests

**Existing Tests (src/ui/__tests__/breadboard-app.test.ts):**
- Update for new interaction model
- Test Rete-driven placement instead of manual click sequences
- Test one-connector-per-hole constraint

**New Tests:**
- Continuous rotation updates socket positions
- Invalid connection attempts are rejected
- Wire re-routing (if implemented)

### 12.3 Visual Regression Tests

**Playwright Tests** (tests/visual/):
- Ensure PixiJS rendering is visually identical after Rete migration
- Screenshot comparison before/after
- Test voltage overlay, current animation, error highlights

**Acceptance Criteria:**
- No visual differences (pixel-perfect match or within tolerance)
- If rendering changes, they are documented and approved

### 12.4 Performance Tests

**Metrics:**
- Component placement time (<100ms)
- Drag interaction frame rate (60fps minimum)
- Full circuit render time (<200ms for 20 components)
- Simulation time (unchanged from current)

**Profiling:**
- Use Chrome DevTools Performance tab
- Identify bottlenecks in Rete ↔ PixiJS sync
- Optimize hot paths (e.g., socket position calculations)

### 12.5 Golden Test Circuits

**Test Circuits:**
- Simple LED + resistor + power supply
- Series resistors (voltage divider)
- Parallel resistors
- Complex circuit (10+ components, multiple branches)
- EDU-8 microprocessor with LEDs

**Validation:**
- Circuit extraction produces expected graph
- Simulation produces expected voltages/currents (within tolerance)
- Visual rendering is correct (manual inspection + screenshots)

---

## 13. Risk Assessment and Mitigation

### 13.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rete.js doesn't support required features | Medium | High | Proof of concept first; evaluate Rete capabilities early; custom plugins if needed |
| Performance degradation (Rete overhead) | Medium | Medium | Profile early; optimize sync; consider Tier 1/2 solver split |
| State synchronization bugs (Rete ↔ Component array) | High | Medium | Comprehensive unit tests; bidirectional validation; feature flag for rollback |
| PixiJS rendering breaks with Rete positions | Low | High | Incremental testing; visual regression tests; keep fallback rendering |
| Existing tests fail due to API changes | High | Low | Update tests in parallel with implementation; maintain test coverage ≥95% |
| Learning curve for contributors | Medium | Low | Documentation; examples; developer guide; code comments |

### 13.2 Schedule Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phase 1 takes longer than estimated | Medium | Medium | Buffer time in estimate (3-5 days → 7 days max); spike first |
| Unexpected Rete.js limitations discovered mid-migration | Medium | High | Proof of concept validates core requirements; abort criteria defined |
| Breaking changes in existing code | High | Low | Incremental approach; tests catch regressions early |
| Scope creep (additional features requested) | Medium | Medium | Strict adherence to goal.md requirements; defer non-MVP features to Phase 5 |

### 13.3 Abort Criteria

**When to stop migration and revert:**
1. Proof of concept fails (Rete.js cannot model breadboard constraints)
2. Performance is unacceptable (>500ms interaction latency, <30fps rendering)
3. More than 30% of tests cannot be updated (indicates poor architectural fit)
4. Timeline exceeds 8 weeks (diminishing returns)

**Fallback Plan:**
- Feature flag allows disabling Rete integration
- Keep all PixiJS rendering and interaction code functional during transition
- Can revert to pure PixiJS if migration fails

---

## 14. Non-Goals

To prevent scope creep, explicitly list what this migration does NOT include:

1. **PCB layout:** Breadboard Lab is not Fritzing; no PCB design features
2. **SPICE-level accuracy:** MNA solver is educational, not for production circuit design
3. **Huge component library:** Focus on common educational components (R, L, C, LED, transistors)
4. **3D rendering:** Photorealistic but 2D; no WebGL 3D models
5. **Microcontroller firmware simulation:** EDU-8 is educational; not full Arduino/ESP32 emulation
6. **Real-time collaboration:** Single-user for MVP; multiplayer is future enhancement
7. **Mobile-first design:** Desktop-first; mobile is secondary (touch support planned but not primary)
8. **Transient analysis:** DC steady-state only in MVP; AC/transient is future work
9. **Embedded code execution:** No JavaScript/Python in circuits (EDU-8 uses predefined ROM)

---

## 15. Definition of Done

### 15.1 Functional Requirements

- [ ] Rete.js dependency added and configured (package.json)
- [ ] Rete editor instance integrated into BreadboardApp
- [ ] Breadboard holes represented as Rete nodes with exclusive sockets
- [ ] Components represented as Rete nodes with leg sockets
- [ ] Component placement creates Rete nodes and connections
- [ ] One-connector-per-hole constraint enforced via Rete socket rules
- [ ] Wire connections create Rete edges (or wire nodes)
- [ ] Component drag-and-drop uses Rete's interaction system
- [ ] Continuous rotation supported (socket positions update)
- [ ] PixiJS rendering reads from Rete graph state (hybrid architecture)
- [ ] All existing functionality preserved (no regressions)

### 15.2 Quality Requirements

- [ ] All unit tests pass (410+ tests, target ≥95% coverage)
- [ ] No visual regressions (Playwright tests pass)
- [ ] Performance acceptable (60fps interactions, <200ms render for 20 components)
- [ ] No new security vulnerabilities (CodeQL scan clean)
- [ ] Code follows existing style (ESLint, Prettier)

### 15.3 Documentation Requirements

- [ ] ARCHITECTURE.md updated with Rete.js integration details
- [ ] Developer guide: "Working with Rete.js in Breadboard Lab" (new document)
- [ ] API documentation for ReteManager (JSDoc comments)
- [ ] Examples of extending system with new component types
- [ ] Migration guide for contributors working on Rete features

### 15.4 Testing Requirements

- [ ] Unit tests for ReteManager (conversion functions, node types)
- [ ] Integration tests for Rete ↔ BreadboardApp sync
- [ ] Interaction tests updated for new placement workflow
- [ ] Visual regression tests pass (or new baselines approved)
- [ ] Performance benchmarks meet targets

---

## 16. References

### 16.1 Internal Documents

- `planning/vision/goal.md` — Target architecture specification (Rete.js requirement)
- `planning/issue_queue/processed/migrate-to-retejs-architecture.md` — Detailed issue description
- `ARCHITECTURE.md` — Current system architecture
- `src/core/types.ts` — Domain model types
- `src/ui/breadboard-app.ts` — Main application logic (2,638 lines)
- `src/ui/pixi-renderer.ts` — PixiJS rendering (1,136 lines)

### 16.2 External Resources

**Rete.js:**
- Official documentation: https://rete.js.org/
- GitHub repository: https://github.com/retejs/rete
- Examples: https://rete.js.org/examples
- TypeScript support: https://rete.js.org/docs/guides/typescript

**Competitors:**
- Fritzing: https://fritzing.org/ (breadboard documentation tool)
- Fritzing FAQ (licensing): https://fritzing.org/faq
- CircuitJS1: https://github.com/pfalstad/circuitjs1 (schematic simulator, GPL v2)
- Falstad Circuit Simulator: https://www.falstad.com/circuit/
- Wokwi: https://wokwi.com/ (embedded systems simulator)

**Technical Background:**
- Modified Nodal Analysis: Standard EE textbooks (Nilsson & Riedel, etc.)
- Union-Find algorithm: CLRS "Introduction to Algorithms"
- PixiJS documentation: https://pixijs.com/
- WebGL fundamentals: https://webglfundamentals.org/

---

## Conclusion

This planning document provides a comprehensive, implementation-oriented specification for migrating Breadboard Lab from a PixiJS bespoke wiring system to a Rete.js-based visual programming graph architecture. The migration is a **foundational architectural shift** required by the project's vision, not an optional enhancement.

**Key Decisions:**
1. **Hybrid Architecture (Option B):** Rete.js for interaction logic, PixiJS for rendering
2. **Phased Approach:** 4 phases over ~7 weeks, with proof of concept first
3. **Risk Mitigation:** Feature flag, parallel code paths, abort criteria
4. **Core Preservation:** Circuit extraction and simulation remain unchanged
5. **Testing First:** Comprehensive tests at each phase before proceeding

**Success Factors:**
- Proof of concept validates Rete.js suitability (Week 1-2)
- Incremental migration minimizes risk (one phase at a time)
- Feature flag allows rollback if issues arise
- Existing 410 tests provide regression safety net
- Hybrid rendering preserves PixiJS performance benefits

**Next Steps:**
1. Review and approve this planning document
2. Add Rete.js dependencies to package.json
3. Begin Phase 1: Proof of Concept (3-5 days)
4. Evaluate proof of concept results
5. Proceed to Phase 2 if successful, or abort if criteria not met

This migration, when complete, will provide the interaction foundation required by goal.md and enable advanced features like continuous rotation, leg-based connections, intelligent wire routing, and pre-validated component placement—transforming Breadboard Lab into a best-in-class breadboard educational tool.

---

**Document Status:** Planning Complete, Ready for Review  
**Total Word Count:** ~6,500 words  
**Estimated Reading Time:** 25-30 minutes  
**Target Audience:** Project maintainers, contributors, technical reviewers
