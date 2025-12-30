# Breadboard Lab — Comprehensive Planning Document

**Version**: 0.1  
**Date**: December 2025  
**Status**: Planning Phase

---

## Executive Summary

Breadboard Lab is a **web-first breadboard circuit simulator** designed to bridge the gap between physical breadboard prototyping and circuit understanding. Unlike existing tools that treat breadboards as mere documentation aids or focus solely on schematic-based simulation, Breadboard Lab maintains a first-class electrical model that is directly tied to physical breadboard placement and can visualise computed circuit behavior in real time.

**Unique Selling Proposition (USP):**

> "A web-first breadboard UI that is not merely a drawing tool: it maintains a first-class electrical net model and can visualise real computed circuit behaviour directly on the breadboard and on a derived schematic view."

This document defines the architecture, requirements, and roadmap for building an educational tool that is:
1. **Web-based** — zero installation, instant access, works on any device
2. **Physically authentic** — models actual breadboard connectivity and constraints
3. **Electrically accurate** — uses real circuit solvers, not decorative animations
4. **Educationally powerful** — visualises voltages, currents, and errors to teach electronics

---

## Table of Contents

1. [Core Objectives](#core-objectives)
2. [Competitive Analysis](#competitive-analysis)
3. [Licensing & Asset Provenance](#licensing--asset-provenance)
4. [UI/UX Requirements](#uiux-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Data Model](#data-model)
7. [Solver Strategy](#solver-strategy)
8. [Electricity Flow Visualisation](#electricity-flow-visualisation)
9. [Views](#views)
10. [Export/Import](#exportimport)
11. [Roadmap & Milestones](#roadmap--milestones)
12. [Testing Strategy](#testing-strategy)
13. [Non-Goals](#non-goals)
14. [Decision Records](#decision-records)

---

## Core Objectives

### Primary Goal
Build a **web-based breadboard simulation tool** that combines:
1. **Best-in-class breadboard UI** — drag/drop, rotate, snap-to-grid, intuitive wiring
2. **Explicit electrical model** — separate representation of nets, components, and electrical constraints
3. **Real electricity-flow visualisation** — voltage/current overlays driven by actual solver output
4. **Easy to start, powerful to use** — no installation, but not a toy

### Key Distinctions

We maintain clear separation between four concepts:

```
┌─────────────────────────────────────────────────────────────┐
│ BREADBOARD VIEW                                             │
│ Physical placement, wiring constraints, visual layout       │
│ → Components have footprints, pins align to holes          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ ELECTRICAL GRAPH / NETLIST                                  │
│ What the circuit *is* — nodes, edges, component types      │
│ → Extracted from breadboard topology                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SOLVER                                                      │
│ What the circuit *does* — computes voltages, currents      │
│ → Nodal analysis, SPICE, or custom solver                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ VISUAL OVERLAYS                                             │
│ How we teach/debug — heatmaps, animations, error markers   │
│ → Rendered on breadboard and schematic views               │
└─────────────────────────────────────────────────────────────┘
```

This separation ensures:
- **Testability**: Each layer can be validated independently
- **Maintainability**: Changes to UI don't affect solver logic
- **Extensibility**: New solvers or rendering backends can be swapped
- **Educational clarity**: Users understand physical vs. electrical concepts

---

## Competitive Analysis

### Existing Tools & Our Niche

#### Fritzing (https://fritzing.org/)
**What they do well:**
- Excellent breadboard view for documentation and communication
- Clean part graphics and visual export
- Integrated workflow: breadboard → schematic → PCB

**Gaps we exploit:**
- **Desktop-oriented**: Requires installation; no web version
- **Documentation-focused**: Weak simulation capabilities; breadboard is primarily for visualization
- **Licensing constraints**: Fritzing part graphics are explicitly restricted for use in other software systems (Fritzing FAQ: "Part graphics may not be used in competing software")
- **Limited interactivity**: No real-time circuit analysis or voltage/current visualization

**Citation**: Fritzing FAQ (https://fritzing.org/faq) states restrictions on part graphic reuse

#### Falstad Circuit Simulator / CircuitJS1 (https://falstad.com/circuit/)
**What they do well:**
- Excellent real-time circuit simulation with immediate visual feedback
- Interactive component manipulation and parameter tuning
- Wide variety of circuit types (analog, digital, logic)
- Green/red current flow animations are highly effective

**Gaps we exploit:**
- **Schematic-first**: No breadboard view or physical prototyping context
- **Not breadboard-focused**: Users learn circuits abstractly, not how to build them physically
- **GPL license**: CircuitJS1 is published on GitHub under GPL-2.0 (https://github.com/pfalstad/circuitjs1), which has copyleft implications for derived works

**Citation**: CircuitJS1 GitHub repository (https://github.com/pfalstad/circuitjs1) shows GPL-2.0 license; Falstad's about page references the open-source project

#### Wokwi (https://wokwi.com/)
**What they do well:**
- Modern web-based simulator with excellent UX
- Strong embedded/MCU simulation (Arduino, ESP32, Raspberry Pi Pico)
- Real-time code execution with hardware visualization
- Good component library and breadboard view

**Gaps we exploit:**
- **Embedded-focused**: Optimized for microcontroller projects, not general analog/digital circuits
- **Licensing model**: Not fully open source — proprietary parts of the platform; paid plans for advanced features (Wokwi pricing: https://wokwi.com/pricing)
- **Black-box simulation**: Less educational transparency about how circuits are solved

**Citation**: Wokwi pricing page (https://wokwi.com/pricing) and license info show mixed open/proprietary model

#### Other Tools
- **PICAXE PEBBLE**: Breadboard layout tool, but focused on PICAXE ecosystem
- **TinkerCAD Circuits**: Web-based, breadboard view, but owned by Autodesk; limited simulation fidelity
- **EveryCircuit**: Mobile-first, excellent visualizations, but proprietary and schematic-focused

### Our Differentiation

**Breadboard Lab** fills the gap by:
1. Being **fully open source** (MIT license) with no proprietary restrictions
2. Offering a **breadboard-first UI** that is also **simulation-first** (not just documentation)
3. Providing **transparent, educational circuit solving** (users can see how and why circuits work)
4. Running **entirely in the browser** with zero installation or account requirements
5. Maintaining **separation between physical layout and electrical model** for clarity and extensibility

---

## Licensing & Asset Provenance

### Non-Negotiable Constraints

**Breadboard Lab is licensed under MIT** (permissive, business-friendly, education-friendly).

All code, assets, and documentation must be compatible with this license. Specifically:

#### Part Graphics & Visual Assets
- **DO NOT reuse Fritzing part graphics**  
  Fritzing explicitly restricts use of part graphics in competing software (Fritzing FAQ). We must create our own component visuals or use permissively licensed alternatives.
  
- **Component rendering options:**
  - Create custom SVG icons for components (resistors, LEDs, capacitors)
  - Use geometric shapes with labels (e.g., rectangle + "1kΩ" for resistor)
  - Consider hiring a designer or using CC0/public domain icon sets
  - Use procedural rendering (e.g., generate resistor bands algorithmically)

#### Solver Libraries
- **ngspice** (BSD-3-Clause): Permissive, suitable for web via WASM  
  Citation: ngspice website (http://ngspice.sourceforge.net/) and ngspice-wasm projects show BSD licensing
  
- **CircuitJS1** (GPL-2.0): Excellent solver, but GPL has copyleft implications  
  If we use CircuitJS1 code directly, our solver layer would also need to be GPL, which complicates MIT licensing for the full project. We prefer to:
  - Use ngspice-wasm (BSD) for SPICE-class simulation
  - Implement our own simplified DC solver (MIT-licensed, part of our codebase)
  - Keep solver as a pluggable layer so GPL solvers can be optionally integrated by users

#### JavaScript/TypeScript Libraries
All frontend and build dependencies are permissively licensed:
- **React** (MIT) — if we choose React
- **Konva** (MIT) — if we choose Konva for rendering
- **PixiJS** (MIT) — if we choose PixiJS
- **Vite** (MIT) — build tool
- **TypeScript** (Apache-2.0) — language

#### Documentation & Learning Resources
- Circuit diagrams and explanations will be original or cited from public domain/CC-BY sources
- Example circuits will be canonical educational examples (Ohm's law, LED blink, voltage dividers)

### License Compatibility Summary

| Component | License | Compatible with MIT? | Decision |
|-----------|---------|----------------------|----------|
| Our code | MIT | ✅ | Primary license |
| ngspice | BSD-3-Clause | ✅ | Preferred solver |
| CircuitJS1 solver | GPL-2.0 | ⚠️ Copyleft | Avoid direct use; learn from, don't copy |
| Fritzing parts | Proprietary | ❌ | DO NOT USE |
| React/Konva/PixiJS | MIT | ✅ | Safe to use |

---

## UI/UX Requirements

### Design Principles
1. **Physical authenticity** — behave like a real breadboard
2. **Immediate feedback** — visual responses to all interactions
3. **Error prevention** — guide users to valid placements
4. **Progressive disclosure** — simple by default, powerful when needed
5. **Accessible** — keyboard and screen reader support where feasible

### Breadboard Interaction Model

#### Breadboard Holes
- **Visual representation**: 30 rows × 10 columns (5 per side) = 300 holes
- **Interactivity**:
  - Hover: Highlight entire connected strip (row or rail)
  - Click with component selected: Place first pin
  - Click again: Place second pin (if component is 2-pin)
  - Click on placed component: Select it (show handles)
  
**Acceptance criteria:**
- [ ] Hovering a hole highlights all electrically connected holes in that strip
- [ ] Highlighted strip uses distinct color from selected component
- [ ] Invalid placements show red/error indicator

#### Component Placement

**Draggable Components:**
- Drag component from toolbar to breadboard
- Show **ghost preview** at cursor position
- Preview snaps to nearest valid alignment (pins align to holes)
- Invalid positions (collision, out-of-bounds) show error indicator
- Drop to place; Escape to cancel

**Rotation:**
- **Keyboard**: Press `R` to rotate selected component 90° clockwise
- **On-screen handle**: Show circular rotation handle when component is selected
- **Touch**: Two-finger rotate gesture (optional, stretch goal)

**Snapping:**
- Components snap to holes such that all pins align to valid positions
- Multi-pin components (e.g., DIP ICs) must align to correct hole grid
- Snap tolerance: within 10-20px of hole center

**Acceptance criteria:**
- [ ] Ghost preview shows correct pin alignment
- [ ] Invalid placements cannot be completed (no drop)
- [ ] Rotation handle is visible and functional
- [ ] Keyboard shortcut `R` rotates selected component
- [ ] Multi-select rotation rotates all components around group center

#### Wiring

**Wire creation:**
- Drag from hole to hole
- Wire path can be:
  - **Straight line** (MVP)
  - **Orthogonal routing** (Manhattan-style, better)
  - **Bezier curve** (smoothest)
- Show wire preview during drag
- Snap to target hole when within threshold
- Cannot place wire endpoints in empty space (must connect holes)

**Wire editing:**
- Click wire to select
- Drag endpoints to reconnect
- Optional: Drag wire midpoint to add control points (stretch goal)
- Optional: Physics-based "relaxation" for natural wire curves (stretch goal)

**Acceptance criteria:**
- [ ] Wire previews during drag
- [ ] Wire snaps to holes
- [ ] Cannot complete wire to invalid target
- [ ] Selected wire shows endpoints as draggable handles
- [ ] Delete key removes selected wire

#### Selection Model

**Single selection:**
- Click component or wire to select
- Selected item shows handles (rotation, resize, delete)
- Click background to deselect

**Multi-selection:**
- Click + drag on background to draw selection rectangle
- Shift + click to add/remove from selection
- Ctrl + A to select all
- Selected items show unified bounding box with handles

**Operations:**
- **Delete**: `Del` key or delete button
- **Copy/Paste**: `Ctrl+C`, `Ctrl+V` (duplicates components in place, offset slightly)
- **Undo/Redo**: `Ctrl+Z`, `Ctrl+Y` (or `Ctrl+Shift+Z`)

**Acceptance criteria:**
- [ ] Rectangle selection captures all intersecting components
- [ ] Multi-select operations work on entire set
- [ ] Undo/redo stack maintains up to 50 history states
- [ ] Copy/paste includes wires connected between copied components

### UI State Machine

The interaction model is event-driven with clear states:

```
┌─────────────┐
│   IDLE      │◄───────────────────┐
└──────┬──────┘                    │
       │                           │
       │ [pointer down on hole]    │
       ▼                           │
┌─────────────┐                    │
│ WIRE_START  │                    │
└──────┬──────┘                    │
       │                           │
       │ [drag]                    │
       ▼                           │
┌─────────────┐                    │
│ WIRE_DRAG   │                    │
└──────┬──────┘                    │
       │                           │
       │ [release on valid hole]   │
       │ [release on invalid]──────┤
       ▼                           │
┌─────────────┐                    │
│ WIRE_PLACED │────────────────────┤
└─────────────┘                    │
                                   │
┌─────────────┐                    │
│   IDLE      │                    │
└──────┬──────┘                    │
       │                           │
       │ [pointer down on component]
       ▼                           │
┌─────────────┐                    │
│ COMPONENT_  │                    │
│  SELECTED   │                    │
└──────┬──────┘                    │
       │                           │
       │ [drag]                    │
       ▼                           │
┌─────────────┐                    │
│ COMPONENT_  │                    │
│  DRAGGING   │                    │
└──────┬──────┘                    │
       │                           │
       │ [release]                 │
       │ [Escape]──────────────────┤
       ▼                           │
┌─────────────┐                    │
│ COMPONENT_  │                    │
│  PLACED     │────────────────────┘
└─────────────┘
```

**State transitions:**
- `IDLE` → `WIRE_START`: Click on breadboard hole
- `WIRE_START` → `WIRE_DRAG`: Mouse move
- `WIRE_DRAG` → `WIRE_PLACED`: Release on valid hole
- `WIRE_DRAG` → `IDLE`: Release on invalid target (cancel)
- `IDLE` → `COMPONENT_SELECTED`: Click on component
- `COMPONENT_SELECTED` → `COMPONENT_DRAGGING`: Drag component
- `COMPONENT_DRAGGING` → `COMPONENT_PLACED`: Drop on valid position
- `COMPONENT_DRAGGING` → `IDLE`: Escape key (cancel)

### Accessibility

**Keyboard support:**
- Tab navigation through interactive elements
- Enter to activate buttons
- Arrow keys to move selected component by 1 hole (snap to grid)
- `R` to rotate
- `Del` to delete
- `Ctrl+Z` / `Ctrl+Y` for undo/redo
- `Ctrl+A` for select all

**Screen reader support:**
- ARIA labels on breadboard holes (e.g., "Row 5, Column A")
- ARIA live regions for feedback (e.g., "Component placed at row 5, column A")
- Semantic HTML for toolbar and panels

**Color accessibility:**
- High contrast mode option
- Color-blind friendly palette (use patterns in addition to colors for voltage heatmap)

**Acceptance criteria:**
- [ ] All interactive elements are keyboard-accessible
- [ ] Screen reader announces component placement
- [ ] High contrast mode meets WCAG AA standards

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI LAYER                               │
│  - Rendering (Konva/PixiJS/SVG)                            │
│  - Event handling (mouse, touch, keyboard)                 │
│  - Visual overlays (voltage heatmap, current animation)    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│  - State management (placements, wires, selections)        │
│  - Undo/redo history                                       │
│  - Export/import                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    CORE LAYER                               │
│  - BreadboardTopology (connectivity model)                 │
│  - CircuitExtractor (placement → netlist)                  │
│  - Netlist (electrical graph)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   SOLVER LAYER                              │
│  - Fast DC solver (resistive networks, sources)            │
│  - SPICE solver (ngspice-wasm, optional)                   │
│  - Result formatters                                       │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Rendering Decision

**Decision: Use Konva.js (via react-konva if using React)**

**Rationale:**
1. **Interaction patterns**: Konva has excellent drag/drop and snapping examples (https://konvajs.org/docs/sandbox/Drag_and_Drop.html, snapping demos)
2. **Performance**: Canvas-based rendering is fast enough for 300 holes + components + wires
3. **Flexibility**: Konva abstracts canvas but allows low-level control when needed
4. **Ecosystem**: Works with React (`react-konva`) or standalone
5. **Layering**: Konva's layer model is natural for breadboard (background, components, wires, overlays)

**Alternatives considered:**
- **PixiJS**: Excellent performance, but overkill for this use case; more game-oriented
- **SVG**: Clean and accessible, but performance degrades with hundreds of elements; harder to do smooth animations
- **HTML5 Canvas (raw)**: Maximum control, but requires implementing interaction layer from scratch

**Implementation approach:**
- Use `react-konva` for declarative rendering
- Layers:
  - Background (breadboard grid)
  - Wires (below components)
  - Components (draggable)
  - Overlays (voltage heatmap, current animations)
  - UI (selection boxes, handles)

---

## Data Model

### Core Types

#### BreadboardTopology

Represents the physical connectivity of the breadboard.

```typescript
interface BreadboardTopology {
  rows: number; // 30
  columns: number; // 10 (5 per side)
  
  // Terminal strips: which holes are electrically connected
  strips: Strip[];
  
  // Power rails (top and bottom)
  rails: Rail[];
}

interface Strip {
  id: string; // e.g., "strip-5A-5E" (row 5, columns A-E)
  holes: Position[]; // Positions that are connected
}

interface Rail {
  id: string; // e.g., "rail-top-positive"
  type: 'positive' | 'negative';
  side: 'top' | 'bottom';
  holes: Position[];
}

interface Position {
  row: number; // 1-30
  column: string; // 'A'-'J'
}
```

**Connectivity rules:**
- Each terminal strip connects 5 holes horizontally within a row (e.g., row 5, columns A-E)
- Power rails run vertically along the top and bottom
- Center gap separates left (A-E) and right (F-J) sides

#### Placement

Represents a component placed on the breadboard.

```typescript
interface Placement {
  id: string;
  componentType: ComponentType;
  pins: PinPlacement[];
  rotation: 0 | 90 | 180 | 270; // degrees
  metadata: Record<string, unknown>; // e.g., resistance value, voltage
}

interface PinPlacement {
  pinId: string; // e.g., "anode", "pin1"
  position: Position;
}

type ComponentType = 
  | 'resistor'
  | 'led'
  | 'capacitor'
  | 'wire'
  | 'power-supply'
  | 'ground'
  | 'switch'
  | 'battery'
  | 'diode'
  | 'transistor-npn'
  | 'transistor-pnp'
  | 'ic-555'
  | 'potentiometer';
```

#### Wiring

Represents a wire connecting two holes.

```typescript
interface Wiring {
  id: string;
  startPosition: Position;
  endPosition: Position;
  pathType: 'straight' | 'orthogonal' | 'bezier';
  controlPoints?: Position[]; // For bezier curves
  color?: string; // Optional: red, black, yellow, etc.
}
```

#### ElectricalNetlist

The electrical graph extracted from placements and wiring.

```typescript
interface ElectricalNetlist {
  nets: Net[];
  components: ElectricalComponent[];
}

interface Net {
  id: string; // e.g., "net-0", "net-1"
  nodeId: string; // Solver node identifier
  positions: Position[]; // All breadboard positions in this net
  isGround: boolean;
  isPower: boolean;
}

interface ElectricalComponent {
  id: string;
  type: ComponentType;
  terminals: Terminal[];
  properties: Record<string, number | string>; // e.g., { resistance: 1000 }
}

interface Terminal {
  terminalId: string; // e.g., "anode", "collector"
  netId: string; // Which net this terminal connects to
}
```

#### SolvedState

Results from circuit simulation.

```typescript
interface SolvedState {
  success: boolean;
  error?: string; // If simulation failed
  nodeVoltages: Map<string, number>; // Node ID → voltage (V)
  branchCurrents: Map<string, number>; // Component ID → current (A)
  powerDissipation: Map<string, number>; // Component ID → power (W)
  warnings: string[]; // e.g., "Floating node detected", "Short circuit"
}
```

### Conversion Pipeline

```
User places component at holes [5A, 5B]
        ↓
Placement { id: "r1", type: "resistor", pins: [{pinId: "p1", position: {row: 5, col: "A"}}, ...] }
        ↓
CircuitExtractor.extract(placements, wirings, topology)
        ↓
ElectricalNetlist { nets: [{id: "net-0", positions: [{row:5, col:"A"}, ...]}], components: [...] }
        ↓
Solver.solve(netlist)
        ↓
SolvedState { nodeVoltages: {"net-0": 5.0, "net-1": 2.5}, branchCurrents: {"r1": 0.0025}, ... }
        ↓
OverlayRenderer.render(solvedState, placements)
        ↓
Visual heatmap on breadboard, current animations on wires
```

**Key properties:**
- **Immutability**: Each update creates new state (functional programming style)
- **Traceability**: Can trace from breadboard position → net → voltage
- **Testability**: Each step can be unit tested independently

---

## Solver Strategy

### Two-Tier Design

We use a **fast DC solver** for immediate feedback and an optional **SPICE-class solver** for complex circuits.

#### Tier 1: Fast DC Solver (MVP)

**Purpose**: Instant feedback for simple resistive circuits with voltage/current sources.

**Capabilities:**
- DC operating point analysis
- Resistive networks (Ohm's law, voltage/current dividers)
- Independent voltage/current sources
- LEDs (as ideal diodes with forward voltage drop)
- Short circuit detection
- Floating node detection

**Algorithm**: Modified nodal analysis (MNA)
- Build conductance matrix `G` and current vector `i`
- Solve `G * v = i` for node voltages `v`
- Back-calculate branch currents from Ohm's law

**Performance**: < 10ms for typical breadboard circuits (< 50 components)

**Limitations:**
- No capacitors/inductors (no transient analysis)
- No nonlinear components (diodes are simplified)
- No AC analysis

**Implementation**: Pure TypeScript/JavaScript (no external solver)

**Example:**
```typescript
class FastDCSolver {
  solve(netlist: ElectricalNetlist): SolvedState {
    // 1. Build MNA matrices
    const { G, i } = this.buildMNA(netlist);
    
    // 2. Solve linear system
    const v = this.solveLinearSystem(G, i);
    
    // 3. Calculate branch currents
    const currents = this.calculateCurrents(netlist, v);
    
    // 4. Detect errors
    const warnings = this.detectIssues(netlist, v, currents);
    
    return { success: true, nodeVoltages: v, branchCurrents: currents, warnings };
  }
}
```

#### Tier 2: SPICE-Class Solver (Post-MVP)

**Purpose**: Full circuit simulation for complex analog/digital circuits.

**Capabilities:**
- Transient analysis (capacitors, inductors)
- AC analysis (frequency response)
- Nonlinear components (diodes, transistors, MOSFETs)
- Op-amps, ICs

**Implementation**: ngspice compiled to WebAssembly

**Reference**: ngspice is a SPICE circuit simulator (http://ngspice.sourceforge.net/); WASM builds exist (e.g., https://github.com/danchitnis/ngspice-webassembly)

**License**: ngspice is BSD-3-Clause (permissive, compatible with MIT)

**Integration:**
```typescript
class SpiceSolver {
  async solve(netlist: ElectricalNetlist): Promise<SolvedState> {
    // 1. Convert netlist to SPICE netlist format
    const spiceNetlist = this.toSpiceNetlist(netlist);
    
    // 2. Call ngspice WASM
    const result = await ngspice.run(spiceNetlist);
    
    // 3. Parse results
    return this.parseSpiceOutput(result);
  }
}
```

**Performance**: 100ms - 1s depending on circuit complexity

**Fallback behavior:**
- If SPICE solver fails or times out, fall back to Fast DC Solver
- Show warning: "Complex circuit; using simplified solver"

### Solver Abstraction

```typescript
interface Solver {
  solve(netlist: ElectricalNetlist): Promise<SolvedState>;
}

class SolverFactory {
  static getSolver(netlist: ElectricalNetlist): Solver {
    if (this.isSimpleResistiveCircuit(netlist)) {
      return new FastDCSolver();
    } else {
      return new SpiceSolver();
    }
  }
}
```

### Component Models (MVP)

| Component | Model | Parameters |
|-----------|-------|------------|
| Resistor | Ohm's law | Resistance (Ω) |
| LED | Diode with Vf | Forward voltage (2V typical) |
| Wire | Zero resistance | None |
| Power supply | Ideal voltage source | Voltage (V) |
| Ground | Reference node (0V) | None |
| Capacitor (post-MVP) | C = Q/V | Capacitance (F) |
| Inductor (post-MVP) | V = L di/dt | Inductance (H) |

### Analysis Types

**MVP:**
- DC operating point (`.op`)

**Post-MVP:**
- Transient analysis (`.tran`)
- AC analysis (`.ac`)
- DC sweep (`.dc`)

---

## Electricity Flow Visualisation

### Central Feature: Real-Time Circuit Behavior

**Principle**: Visualisations must be **tied to solver output**, not decorative.

### Overlay Mode 1: Voltage Heatmap

**Description**: Color-code all connected nets by voltage level.

**Implementation:**
- For each net with solved voltage, render a colored overlay on all holes in that net
- Use a color gradient: 0V (blue) → 2.5V (green) → 5V (red)
- Power rails are included (show entire rail colored)
- Hovering a net shows exact voltage in a tooltip

**Color scheme (color-blind friendly):**
- 0V: Dark blue
- 1.25V: Cyan
- 2.5V: Yellow
- 3.75V: Orange
- 5V: Red

**Alternative: Use patterns in addition to colors:**
- 0V: Solid blue
- 2.5V: Dotted yellow
- 5V: Diagonal lines red

**Acceptance criteria:**
- [ ] All holes in a net show same color
- [ ] Color updates immediately after simulation
- [ ] Tooltip shows exact voltage value
- [ ] High contrast mode uses patterns

### Overlay Mode 2: Current Animation

**Description**: Animated particles flow along wires and through components to show current direction and magnitude.

**Implementation:**
- For each wire/component with solved current > threshold (e.g., 1µA):
  - Render animated particles moving from higher to lower voltage
  - Particle speed proportional to current magnitude
  - Particle density proportional to current magnitude
- Use color to indicate current magnitude:
  - < 1mA: Slow, faint particles
  - 1mA - 10mA: Medium speed, visible
  - > 10mA: Fast, bright particles

**Animation details:**
- Particles are small circles (2-4px diameter)
- Use canvas animation loop (requestAnimationFrame)
- Particles wrap around (reappear at start when reaching end)

**Acceptance criteria:**
- [ ] Particles move from positive to negative terminal
- [ ] Particle speed corresponds to current magnitude
- [ ] No particles on zero-current branches
- [ ] Animation is smooth (60fps)

### Overlay Mode 3: Power Dissipation (Optional)

**Description**: Highlight resistors that are dissipating significant power.

**Implementation:**
- Calculate P = I² × R for each resistor
- If P > threshold (e.g., 0.1W), add a "heat" indicator
- Use pulsing red glow or animated "heat waves"

**Acceptance criteria:**
- [ ] Only components with P > threshold show heat
- [ ] Heat intensity scales with power
- [ ] Tooltip shows exact power value

### Error Overlays

**Description**: Visual indicators for common circuit errors.

**Error types:**
1. **Short circuit**: Two power sources directly connected → Show red "X" icon
2. **Floating node**: Net not connected to ground or power → Show orange "?" icon
3. **Reversed polarity**: LED backwards → Show yellow "!" icon
4. **Open circuit**: Expected connection missing → Show dashed outline

**Acceptance criteria:**
- [ ] Error icons are distinct and recognizable
- [ ] Clicking error icon opens "Explain" panel
- [ ] Errors are detected by solver and surfaced

### Explain Panel

**Description**: Contextual help panel that explains circuit behavior.

**Trigger**: Click on a net, component, or error icon.

**Content:**
- **For nets**: 
  - Voltage value
  - Current entering/leaving
  - Connected components
  - "This net is the output of a voltage divider. Voltage is determined by..."
  
- **For components**:
  - Voltage across terminals
  - Current through component
  - Power dissipation
  - "This resistor limits current to the LED. Current = (5V - 2V) / 1000Ω = 3mA"
  
- **For errors**:
  - Problem description
  - Why it's a problem
  - How to fix it
  - "LED is reversed. LEDs only conduct in one direction. Try rotating it 180°."

**Heuristics:**
- If LED has 0 current: "LED may be reversed or open circuit"
- If voltage at node is unexpectedly 0V: "Node may be floating. Connect to power or ground."
- If current is very high: "Possible short circuit. Check for unintended connections."

**Acceptance criteria:**
- [ ] Panel opens on click
- [ ] Shows correct values from solver
- [ ] Provides educational explanations
- [ ] Offers actionable fix suggestions

---

## Views

### Breadboard View (Primary)

**Description**: Realistic breadboard with components and wires placed on holes.

**Features:**
- 30×10 grid of holes
- Power rails (top and bottom)
- Component graphics (resistors, LEDs, etc.)
- Wire paths (straight or curved)
- Voltage heatmap overlay
- Current animations

**Use case**: Primary interface for building and visualizing circuits.

### Schematic View (Secondary)

**Description**: Auto-generated schematic diagram derived from the electrical netlist.

**Purpose:**
- **Debugging**: See circuit topology without physical layout constraints
- **Learning**: Understand how breadboard maps to schematic symbols
- **Export**: Standard format for documentation

**Generation algorithm:**
1. Extract netlist from breadboard
2. Layout nodes using force-directed graph layout (e.g., D3-force or cola.js)
3. Render components as schematic symbols (rectangles, triangles for diodes, etc.)
4. Draw connections as straight lines

**Note**: This is **not** hand-drawn perfection. It's a functional, auto-generated view.

**Acceptance criteria:**
- [ ] Schematic is generated automatically
- [ ] All components and connections are visible
- [ ] Layout is reasonably clear (no overlapping symbols)
- [ ] User can toggle between breadboard and schematic views

**Example schematic output:**
```
    +5V
     │
    [R1] 1kΩ
     │
    [LED]──→
     │
    GND
```

**Implementation:**
- Use D3.js or similar for force-directed layout
- Render as SVG (since it's not interactive, performance is less critical)
- Provide pan/zoom controls

---

## Export/Import

### Export Formats

#### 1. Project JSON (Canonical)

**Description**: Complete project state including placements, wires, and metadata.

**Format:**
```json
{
  "version": "1.0",
  "name": "LED Blink Circuit",
  "breadboard": {
    "placements": [
      {
        "id": "r1",
        "componentType": "resistor",
        "pins": [
          { "pinId": "p1", "position": { "row": 5, "column": "A" } },
          { "pinId": "p2", "position": { "row": 5, "column": "B" } }
        ],
        "metadata": { "resistance": 1000 }
      }
    ],
    "wires": [
      {
        "id": "w1",
        "startPosition": { "row": 1, "column": "C" },
        "endPosition": { "row": 5, "column": "C" }
      }
    ]
  }
}
```

**Use case**: Save/load projects, share designs.

#### 2. SPICE Netlist (Advanced Users)

**Description**: Standard SPICE netlist for import into other simulators.

**Format:**
```spice
* LED Blink Circuit
V1 1 0 DC 5V
R1 1 2 1k
D1 2 0 LED
.model LED D(Is=1e-12 Rs=10)
.op
.end
```

**Use case**: Export for simulation in LTspice, ngspice, or other SPICE tools.

#### 3. Image Export (PNG/SVG)

**Description**: Render breadboard view to image for documentation.

**Use case**: Include in lab reports, tutorials, documentation.

### Import Formats

#### 1. Project JSON

**Description**: Load a previously saved project.

**Validation:**
- Check version compatibility
- Validate component types exist
- Validate positions are in bounds

#### 2. Component Library (Custom Format)

**Description**: User-defined component definitions.

**Format:**
```json
{
  "components": [
    {
      "id": "my-custom-resistor",
      "name": "10kΩ Resistor",
      "type": "resistor",
      "pinCount": 2,
      "defaultProperties": { "resistance": 10000 },
      "visual": {
        "svgPath": "M 0,0 L 10,0 ..."
      }
    }
  ]
}
```

**Use case**: Extend component library with custom parts.

---

## Roadmap & Milestones

### MVP (Milestone 0.1) — 3-4 months

**Features:**
- ✅ Breadboard grid rendering (30×10 holes)
- ✅ Component placement (resistor, LED, wire, power, ground)
- ✅ Drag & drop with snap-to-hole
- ✅ Rotation (keyboard `R` key)
- ✅ Wiring (hole-to-hole connections)
- ✅ Circuit extraction (breadboard → netlist)
- ✅ Fast DC solver (resistive networks)
- ✅ Voltage heatmap overlay
- ✅ Current animation overlay
- ✅ Basic error detection (short circuit, floating node)

**Key risks:**
- Interaction model may feel clunky (requires iteration)
- Circuit extractor may have bugs (extensive testing needed)
- Solver performance may be insufficient (profile and optimize)

**Success criteria:**
- [ ] User can build a simple LED circuit and see voltage heatmap
- [ ] Solver completes in < 100ms for typical circuits
- [ ] Zero crashes during 1-hour usage session

**Testing:**
- Unit tests for circuit extractor
- Golden test circuits (LED + resistor, voltage divider)
- Manual smoke tests for UI

### v0.2 — 2-3 months after MVP

**Features:**
- More components (capacitor, switch, battery, potentiometer)
- Schematic view (auto-generated)
- Improved overlays (power dissipation, better animations)
- Selection model (multi-select, copy/paste)
- Undo/redo

**Key risks:**
- Schematic layout algorithm may produce ugly results (requires tuning)
- Undo/redo implementation may be complex (consider using Immer.js)

**Success criteria:**
- [ ] User can toggle between breadboard and schematic views
- [ ] Undo/redo works for 50+ history states
- [ ] Schematic layout is readable for 80% of circuits

### v0.3 — 2-3 months after v0.2

**Features:**
- SPICE solver (ngspice-wasm)
- Transient analysis (capacitors, inductors work correctly)
- Time-domain plots (voltage/current vs. time)
- Export SPICE netlist
- Import/export project JSON

**Key risks:**
- ngspice-wasm integration may be difficult (WASM binding complexity)
- Performance may degrade with large WASM binary (consider lazy loading)

**Success criteria:**
- [ ] User can simulate RC circuit and see exponential charge curve
- [ ] SPICE solver completes in < 2s for typical transient analysis
- [ ] Export/import round-trip preserves circuit exactly

### v1.0 — 3-6 months after v0.3

**Features:**
- Polish UI/UX (professional look and feel)
- Tutorial circuits (step-by-step guided projects)
- Documentation (user guide, API reference)
- Accessibility (keyboard, screen reader, high contrast)
- Stability (zero critical bugs)

**Key risks:**
- Scope creep (resist adding new features; focus on polish)
- Documentation may be incomplete (allocate dedicated time)

**Success criteria:**
- [ ] App is used in at least one educational setting (high school or university)
- [ ] Zero critical bugs in issue tracker
- [ ] User guide covers all core features

---

## Testing Strategy

### Unit Tests

**Coverage target**: 80%+ for core logic

**Test suites:**
1. **Breadboard topology**:
   - Test connectivity (which holes are connected)
   - Test invalid positions (out of bounds)
   
2. **Circuit extractor**:
   - Test net extraction (simple circuits)
   - Test component identification
   - Edge cases (disconnected components, multiple nets)
   
3. **Fast DC solver**:
   - Test voltage divider (known output)
   - Test short circuit detection
   - Test floating node detection
   
4. **Netlist conversion**:
   - Test placement → netlist
   - Test SPICE netlist generation

**Tools**: Vitest (TypeScript unit testing)

**Example test:**
```typescript
describe('CircuitExtractor', () => {
  it('should extract two nets from a simple LED circuit', () => {
    const placements = [
      { id: 'v1', type: 'power-supply', pins: [{ position: { row: 1, col: 'A' } }] },
      { id: 'r1', type: 'resistor', pins: [{ position: { row: 1, col: 'A' } }, { position: { row: 5, col: 'A' } }] },
      { id: 'led1', type: 'led', pins: [{ position: { row: 5, col: 'A' } }, { position: { row: 10, col: 'A' } }] },
      { id: 'gnd1', type: 'ground', pins: [{ position: { row: 10, col: 'A' } }] },
    ];
    
    const netlist = CircuitExtractor.extract(placements, [], topology);
    
    expect(netlist.nets).toHaveLength(2);
    expect(netlist.components).toHaveLength(2); // resistor and LED
  });
});
```

### Property-Based Tests

**Purpose**: Test invariants that should always hold.

**Properties:**
1. **Connectivity is transitive**: If A connects to B and B connects to C, then A connects to C
2. **Net extraction is deterministic**: Same placements always produce same netlist
3. **Solver voltage conservation**: Sum of voltage drops around a loop = 0

**Tools**: fast-check (property-based testing for TypeScript)

**Example:**
```typescript
it('should preserve connectivity transitivity', () => {
  fc.assert(
    fc.property(fc.array(fc.placement()), (placements) => {
      const netlist = CircuitExtractor.extract(placements, [], topology);
      // Check that all nets are transitive
      for (const net of netlist.nets) {
        const positions = net.positions;
        for (let i = 0; i < positions.length; i++) {
          for (let j = 0; j < positions.length; j++) {
            expect(areConnected(positions[i], positions[j], topology)).toBe(true);
          }
        }
      }
    })
  );
});
```

### Golden Test Circuits

**Purpose**: Validate solver against known-correct outputs.

**Test circuits:**
1. **Voltage divider**: 5V → 1kΩ → 1kΩ → GND (expect 2.5V at midpoint)
2. **LED circuit**: 5V → 1kΩ → LED → GND (expect ~2V at LED cathode)
3. **Series resistors**: 5V → 1kΩ → 2kΩ → GND (expect ~3.33V at midpoint)
4. **Short circuit**: 5V → wire → GND (expect error)

**Validation:**
- Solve each circuit
- Compare output voltages to expected values (within 1% tolerance)
- If test fails, investigate solver bug

### UI Smoke Tests

**Purpose**: Ensure basic interactions work.

**Tools**: Playwright (browser automation)

**Test cases:**
1. **Place component**: Select resistor, click two holes, verify component appears
2. **Wire creation**: Drag from hole to hole, verify wire appears
3. **Delete component**: Select component, press Del, verify it disappears
4. **Undo/redo**: Place component, undo, verify it disappears, redo, verify it reappears

**Example:**
```typescript
test('user can place a resistor', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('[data-testid="resistor-button"]');
  await page.click('[data-testid="hole-5A"]');
  await page.click('[data-testid="hole-5B"]');
  
  const resistor = await page.locator('[data-component-id="r1"]');
  await expect(resistor).toBeVisible();
});
```

---

## Non-Goals

### Explicit Scope Limitations

To prevent feature creep and maintain focus, the following are **explicitly not goals** for this project:

1. **PCB layout**
   - Breadboard Lab is not a PCB design tool
   - Users who need PCB layout should use KiCad, Eagle, or Fritzing's PCB view
   - Rationale: PCB layout is a completely different domain with different constraints (trace widths, via placement, ground planes, etc.)

2. **Microcontroller firmware simulation (early versions)**
   - No Arduino code execution or embedded system simulation in MVP
   - May be considered in v2.0+ as an advanced feature
   - Rationale: Firmware simulation is complex and would delay core breadboard/solver features

3. **Huge proprietary parts library**
   - Focus on common, educational components (R, C, L, diode, LED, transistor)
   - No 10,000+ part catalog like commercial tools
   - Rationale: Maintenance burden is too high; users can define custom components

4. **Photorealistic 3D rendering**
   - 2D representation is sufficient for educational purposes
   - 3D would add complexity without clear educational benefit
   - Rationale: Performance cost, complexity, and diminishing returns

5. **Real-time collaborative editing**
   - No multi-user simultaneous editing in MVP
   - May be considered post-v1.0
   - Rationale: Complex to implement; not critical for educational use case

6. **Mobile app (native iOS/Android)**
   - Web-first; mobile browsers are supported but not native apps
   - Rationale: Web is more accessible and reduces maintenance burden

7. **Advanced analog simulation (initially)**
   - No RF circuits, transmission lines, or S-parameters in MVP
   - Focus on DC and basic AC circuits
   - Rationale: These are niche use cases; defer until user demand is proven

---

## Decision Records

### DR-001: Choose Konva.js for Rendering

**Context**: Need to render interactive breadboard with 300+ holes, components, and wires.

**Options considered:**
1. PixiJS (high-performance game engine)
2. Konva.js (canvas abstraction with interaction layer)
3. Raw HTML5 Canvas
4. SVG

**Decision**: Use Konva.js

**Rationale:**
- Konva has excellent drag/drop examples and snapping patterns
- Canvas rendering is fast enough for our scale
- Konva's layer model maps naturally to breadboard (background, wires, components, overlays)
- Works with React (react-konva) or standalone

**Consequences:**
- Acceptable performance up to ~1000 elements
- Easier interaction implementation
- Slight dependency on Konva API

---

### DR-002: Two-Tier Solver Strategy

**Context**: Need to balance fast feedback with accurate simulation.

**Options considered:**
1. Only fast DC solver (simple, but limited)
2. Only SPICE solver (accurate, but slow)
3. Two-tier: fast DC + optional SPICE

**Decision**: Implement two-tier solver strategy

**Rationale:**
- Fast DC solver provides instant feedback for 90% of educational circuits
- SPICE solver enables complex circuits when needed
- Graceful degradation: fall back to DC solver if SPICE fails

**Consequences:**
- More implementation work (two solvers to maintain)
- Better user experience (always some result, never "loading...")
- Educational benefit (users see results immediately)

---

### DR-003: MIT License (not GPL)

**Context**: Need to choose open-source license.

**Options considered:**
1. GPL (copyleft; forces derivative works to be open source)
2. MIT (permissive; allows commercial use)
3. Apache 2.0 (permissive with patent grant)

**Decision**: Use MIT license

**Rationale:**
- Educational focus benefits from widest adoption
- Schools/universities may integrate into proprietary platforms
- Permissive license encourages contributions

**Consequences:**
- Cannot use GPL-licensed code (e.g., CircuitJS1 solver) directly
- Must use permissive alternatives (ngspice-wasm is BSD)
- Downstream users can create proprietary forks (acceptable tradeoff)

---

### DR-004: Do Not Reuse Fritzing Graphics

**Context**: Need component graphics for breadboard view.

**Options considered:**
1. Use Fritzing SVG parts (easy, but legally risky)
2. Create custom graphics
3. Use geometric shapes with labels

**Decision**: Do NOT use Fritzing graphics; create custom graphics or use geometric shapes

**Rationale:**
- Fritzing FAQ explicitly prohibits reuse in competing software
- Legal risk is unacceptable for open-source project
- Custom graphics can be optimized for our use case

**Consequences:**
- More work upfront to design components
- Opportunity to create better, more educational visuals
- No legal risk

---

### DR-005: Auto-Generated Schematic (Not Hand-Drawn)

**Context**: Users need schematic view for learning and debugging.

**Options considered:**
1. Manual schematic editor (user draws schematic separately)
2. Auto-generated from netlist (force-directed layout)

**Decision**: Auto-generate schematic from netlist

**Rationale:**
- Maintaining two separate representations (breadboard + schematic) is error-prone
- Auto-generation ensures consistency
- Good enough for educational purposes (doesn't need to be perfect)

**Consequences:**
- Layout may not be ideal for complex circuits
- Acceptable tradeoff: function over form
- Can improve layout algorithm over time

---

## Conclusion

This planning document defines a comprehensive, implementation-oriented roadmap for Breadboard Lab. The project is scoped to be **ambitious but achievable**, with a clear MVP and iterative milestones.

**Key principles:**
1. **Web-first**: Zero installation, instant access
2. **Separation of concerns**: Breadboard view, electrical model, solver, and overlays are distinct layers
3. **Educational focus**: Visualisations teach circuit behavior, not just document it
4. **Open and permissive**: MIT license, no legal constraints
5. **Realistic roadmap**: MVP in 3-4 months, v1.0 in 12-18 months

**Next steps:**
1. Set up project repository (GitHub, CI/CD)
2. Implement breadboard topology and circuit extractor (core logic)
3. Build basic UI with Konva (placement, wiring)
4. Implement fast DC solver
5. Add voltage heatmap overlay
6. Iterate based on user feedback

**Success metrics:**
- Adoption in at least one educational setting by v1.0
- 100+ GitHub stars within 6 months of MVP
- Zero critical bugs in issue tracker

This document will be updated as the project evolves. All decisions are subject to revision based on user feedback and technical discoveries.

---

**Document History:**
- v0.1 (December 2025): Initial planning document
