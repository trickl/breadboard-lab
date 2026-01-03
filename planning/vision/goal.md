
# Breadboard Lab — Target System Capability Specification

**Version**: 0.2  
**Date**: January 2026  
**Status**: Target state (capability-driven)

This document specifies the target system behavior, data models, rendering requirements, simulation capabilities, and automated test requirements. Each requirement in this document is an implementation target and is suitable for driving both development and CI validation.

## Table of Contents

1. [System Partitioning](#system-partitioning)
2. [Licensing & Asset Provenance](#licensing--asset-provenance)
3. [Rendering & Interaction Capabilities](#rendering--interaction-capabilities)
4. [Component Library (Real-World Parts)](#component-library-real-world-parts)
5. [Data Model](#data-model)
6. [Extraction Pipeline (Breadboard → Nets → Netlist)](#extraction-pipeline-breadboard--nets--netlist)
7. [Solver & Simulation Capabilities](#solver--simulation-capabilities)
8. [Electricity Flow Visualisation](#electricity-flow-visualisation)
9. [Views](#views)
10. [Save/Load, Export/Import, and Canonical Examples](#saveload-exportimport-and-canonical-examples)
11. [Testing Strategy](#testing-strategy)
12. [Non-Goals](#non-goals)

---

## System Partitioning

The system is implemented as distinct layers with explicit, testable boundaries:

```
┌──────────────────────────────────────────────────────────────┐
│ Breadboard View (placement + wiring UI)                      │
│ - Physical constraints and geometry                           │
│ - Component footprints and pin-to-hole insertion              │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ Electrical Graph / Netlist                                   │
│ - Nets (connectivity groups)                                 │
│ - Components with terminals mapped to nets                    │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ Solver / Simulation Engine                                   │
│ - DC operating point, time-domain, and digital/event sims     │
│ - Produces voltages, currents, warnings, and derived metrics  │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ Overlays + Explain Panel                                     │
│ - Voltage/current/power/error overlays derived from results   │
│ - Inspection UI for values and causes                         │
└──────────────────────────────────────────────────────────────┘
```


## Licensing & Asset Provenance

### Constraints

- The repository license is MIT.
- All incorporated code, assets, and documentation must be license-compatible with MIT.

### Part graphics & visual assets

- Do not reuse Fritzing part graphics.
  - Citation: Fritzing FAQ: https://fritzing.org/faq
- Component visuals are produced by:
  - procedural rendering (preferred for parametric parts such as resistors)
  - project-owned SVG assets (original or permissively licensed with attribution as required)

### Solver libraries

- ngspice (BSD-3-Clause) is permitted for SPICE-class simulation via WebAssembly.
  - Citation: ngspice site: http://ngspice.sourceforge.net/
  - Example WASM build: https://github.com/danchitnis/ngspice-webassembly
- GPL-licensed solver code is not incorporated into the MIT-licensed codebase.

---

## Rendering & Interaction Capabilities

### Rendering fidelity (WebGL-grade) — required

Requirements:
- Breadboard rendering is 2D (top-down) and photorealistic.
- Rendering uses a WebGL-capable pipeline (via React).
  - PixiJS is the recommended primary renderer; other WebGL-capable renderers are acceptable if they meet the capability requirements.
- Breadboard geometry reflects real physical structure:
  - grouped holes
  - center gap
  - rail separations
  - subtle non-uniform spacing and physical cues (plastic ridges/troughs, labeling)
- Overlapping wires are visually unambiguous:
  - wire shading/lighting indicates overlap ordering
  - depth cues (z-order, shadowing, thickness) ensure crossings do not look like junctions
- Active LEDs emit a subtle glow derived from solver output.

Acceptance criteria:
- [ ] Renderer uses a WebGL-capable backend.
- [ ] Crossing wires without shared endpoints do not visually imply a connection.
- [ ] LED glow varies continuously with simulated current/power.

### Breadboard holes

Requirements:
- Holes are interactable nodes.
- Hover highlights the entire electrically connected strip/rail net.

Acceptance criteria:
- [ ] Hovering any hole highlights all connected holes in that net.

### Component placement

Requirements:
- Components are draggable from a component library panel.
- Placement snaps pins to holes and shows a ghost preview.
- Invalid placements cannot be committed.
- Rotation:
  - `R` key
  - on-screen rotate handle
  - touch-friendly rotate control

Acceptance criteria:
- [ ] Pins align to holes in preview and after drop.
- [ ] Invalid placements are blocked.

### Wiring

Requirements:
- Drag from hole to hole.
- Endpoints cannot float.
- Supported routing modes: straight, orthogonal, bezier/spline.

Acceptance criteria:
- [ ] Wires snap to holes.
- [ ] Wires cannot terminate in empty space.

### Selection and editing

Requirements:
- Single selection for components/wires.
- Multi-selection via shift+click and marquee.
- Delete/copy/paste and undo/redo.

Acceptance criteria:
- [ ] Undo/redo retains at least 50 steps.

### Resistor visual accuracy and lookup — required

Requirements:
- Resistors render with correct color banding.
- Band count is derived from tolerance:
  - 4-band for 5%
  - 5-band for 1%
  - 6-band supported when temperature coefficient is modeled
- Resistor visuals are derived from resistance/tolerance, not static art.

Lookup capability:
- The system includes a resistor color-code lookup table.
- UI tool supports:
  - enter resistance (and tolerance)
  - display band colors
  - click resistor → show band meaning (digits, multiplier, tolerance)

Acceptance criteria:
- [ ] 1kΩ 5% renders as brown-black-red-gold.
- [ ] 10kΩ 1% renders as brown-black-black-red-brown.
- [ ] Lookup output matches the rendered resistor.

---

## Component Library (Real-World Parts)

The system provides a first-class Component Library containing real, purchasable components. Component selection is by specification (package/size/ratings/characteristics), not only by abstract type.

Requirements:
- Library entries have stable IDs.
- Entries include physical attributes:
  - package size (e.g., 3mm vs 5mm LED)
  - form factor
  - footprint/pin roles
- Entries include electrical characteristics required by the solver.
- Entries may include manufacturer/part family metadata.

Explicit examples included in the target library:
- “3mm ultra-bright yellow LED”
- Standard through-hole resistors (axial, 1/4W, 1% and 5% variants)
- Small breadboard-compatible speakers (8Ω module or equivalent)

Selection requirement:
- The UI presents these parts by real specification (name + key physical/electrical properties).

---

## Data Model

### Core types

```typescript
interface BreadboardTopology {
  rows: number;
  columns: number;
  strips: Strip[];
  rails: Rail[];
}

interface Strip {
  id: string;
  holes: Position[];
}

interface Rail {
  id: string;
  type: 'positive' | 'negative';
  side: 'top' | 'bottom';
  holes: Position[];
}

interface Position {
  row: number;
  column: string; // 'A'..'J'
}

type ComponentCategory =
  | 'passive'
  | 'diode'
  | 'transistor'
  | 'ic'
  | 'power'
  | 'interconnect'
  | 'electro-acoustic'
  | 'virtual-educational';

interface ComponentLibraryEntry {
  id: string;
  name: string;
  category: ComponentCategory;
  manufacturer?: string;
  partFamily?: string;
  manufacturerPartNumber?: string;
  package: {
    kind: 'axial' | 't1' | 't1-3-4' | 'dip' | 'sip' | 'header' | 'module';
    pinCount: number;
    leadSpacingMm?: number;
    body: { lengthMm?: number; widthMm?: number; heightMm?: number; diameterMm?: number };
  };
  footprint: {
    pins: Array<{ pinId: string; role?: string }>;
  };
  electrical: Record<string, number | string>;
  visuals: { renderer: 'procedural' | 'svg' };
}

interface Placement {
  id: string;
  componentId: string; // references ComponentLibraryEntry
  pins: PinPlacement[];
  rotation: 0 | 90 | 180 | 270;
  metadata: Record<string, unknown>;
}

interface PinPlacement {
  pinId: string;
  position: Position;
}

interface Wiring {
  id: string;
  startPosition: Position;
  endPosition: Position;
  pathType: 'straight' | 'orthogonal' | 'bezier';
  controlPoints?: Position[];
  color?: string;
}

interface ElectricalNetlist {
  nets: Net[];
  components: ElectricalComponent[];
}

interface Net {
  id: string;
  nodeId: string;
  positions: Position[];
  isGround: boolean;
  isPower: boolean;
}

interface ElectricalComponent {
  id: string;
  componentId: string;
  terminals: Terminal[];
  properties: Record<string, number | string>;
}

interface Terminal {
  terminalId: string;
  netId: string;
}

interface SolvedState {
  success: boolean;
  error?: string;
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  powerDissipation: Map<string, number>;
  warnings: string[];
}
```

---

## Extraction Pipeline (Breadboard → Nets → Netlist)

Requirements:
- Breadboard topology defines intrinsic connectivity (strips/rails/gap).
- Wires add connectivity between hole positions.
- Component pins connect terminals to hole positions.
- Net extraction produces:
  - nets (connectivity groups)
  - a mapping from net → hole positions for overlays

Acceptance criteria:
- [ ] Net extraction is deterministic for identical inputs.
- [ ] Each hole maps to exactly one net.

---

## Solver & Simulation Capabilities

### DC operating point (fast)

Requirements:
- Computes node voltages for resistive networks and independent sources.
- Detects shorts and floating nodes.
- Uses Modified Nodal Analysis (MNA).

### SPICE-class simulation (ngspice in WASM)

Requirements:
- Supports transient analysis for circuits requiring time-domain behavior (including speaker drive).
- Executes ngspice compiled to WebAssembly.
- Fallback behavior: failure/timeouts surface as warnings and fall back to the fast solver when possible.

### Digital/event simulation

Requirements:
- Supports event-driven/clocked logic simulation with values {0,1,Z,X}.
- Analog/digital bridges are explicit.

### Audio output capability (speaker) — required

Requirements:
- Speaker components produce real audio via the browser (Web Audio API).
- Audio is disabled by default; users must explicitly enable sound.
- Audio waveform is derived from solver output across speaker terminals.

Acceptance criteria:
- [ ] Enabling sound produces audible output for a driven speaker circuit.
- [ ] Disabling sound mutes output immediately.
- [ ] Drive frequency changes the audible pitch.

### Simple microprocessor component — required

The system includes one simple microprocessor component with explicit internal simulation.

Target component: **EDU-8 Microprocessor (virtual IC)**

Requirements:
- Simulated internal behavior (not stubbed).
- Operates on a clock input and reset.
- Provides simple I/O pins.
- Scope is intentionally bounded to avoid general firmware emulation complexity.

Pinout (example):
- `VCC`, `GND`
- `CLK` (rising edge)
- `RST` (active-high)
- `IN[3:0]`, `OUT[3:0]`
- `HALT`

Execution model:
- Internal state: accumulator `A` (8-bit), program counter `PC` (4-bit), zero flag `Z`.
- Program ROM: 16 bytes stored as component configuration (editable as hex).
- Instruction set (minimal): `LDA imm4`, `ADD imm4`, `IN`, `OUT`, `JZ addr4`, `JMP addr4`, `HALT`.
- One instruction per rising clock edge.

Acceptance criteria:
- [ ] A canonical program toggles outputs deterministically under a clock.
- [ ] Reset produces a defined initial state.
- [ ] Explain panel shows PC/opcode/output.

---

## Electricity Flow Visualisation

Requirements:
- Voltage heatmap: all holes in a net render the same voltage color.
- Current animation: direction and magnitude are derived from solved currents.
- Error overlays: shorts/floating nodes/polarity issues surface visually.
- Explain panel shows computed values for clicked nets/components.

---

## Views

Requirements:
- Breadboard view is primary.
- Schematic view is derived from the netlist and is available when present.

---

## Save/Load, Export/Import, and Canonical Examples

### Save/load — required

Requirements:
- Load/save project JSON preserves placements, wiring, and component selections.

### Canonical example library — required

Requirements:
- Built-in examples are selectable from within the UI.
- Loading an example produces a known-good breadboard state.

Examples included:
- LED + resistor
- Voltage divider
- Simple clock-driven circuit (microprocessor + clock)

---

## Testing Strategy

Requirements:
- Unit tests for topology, extraction, solver adapters.
- Property-based tests for connectivity/extraction invariants.
- Golden circuits with expected numeric outputs.
- UI smoke tests (Playwright).

### Visual Regression Testing (required)

Requirements:
- Run the application in a headless browser in CI.
- Navigate through canonical example circuit states.
- Capture screenshots of:
  - breadboard view
  - overlays (voltage/current/errors)
  - schematic view (if present)
- Compare screenshots against baselines (screenshot delta comparison) to detect:
  - layout shifts
  - rendering errors
  - overlay regressions
  - accidental visual changes
- Tooling: Playwright screenshot comparison (or equivalent).
- Visual regression tests run as a required part of CI.

Acceptance criteria:
- [ ] Screenshot delta comparison is executed in CI.
- [ ] An unintended visual change fails CI.

---

## Non-Goals

1. PCB layout.
2. General-purpose microcontroller firmware emulation.
3. Huge proprietary part catalogs.
4. Photorealistic 3D rendering (photorealistic 2D is required).
5. Real-time collaborative editing.
6. Native mobile apps.
7. RF/transmission-line workflows.

---

**Document History:**
- v0.1 (December 2025): initial planning document
- v0.2 (January 2026): rewritten as capability-driven target-state specification; added visual regression testing, real-world component library requirements, resistor color-code rendering/lookup, simple microprocessor simulation, canonical examples, audio output, and WebGL-grade rendering requirements
