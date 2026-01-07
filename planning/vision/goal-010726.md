# Breadboard Lab — Target System Capability Specification

**Version**: 0.3  
**Date**: January 2026  
**Status**: Target state (capability-driven)

This document specifies the target system behavior, data models, rendering requirements, simulation capabilities, and automated test requirements. Each requirement in this document is an implementation target and is suitable for driving both development and CI validation.

**Primary goal:**  
Breadboard Lab is an educational analysis and explanation aid designed to be paired alongside physical breadboard experiments. It helps learners understand **what is connected**, **what is happening electrically (voltage/current)**, and **why a circuit works or fails**, in ways that are difficult or impossible to do physically.

---

## Table of Contents

1. System Partitioning  
2. Licensing & Asset Provenance  
3. Rendering & Interaction Capabilities  
4. Breadboard Analysis & Debugging Capabilities (Core USP)  
5. Component Library (Real-World Parts)  
6. Data Model  
7. Extraction Pipeline (Breadboard → Nets → Netlist)  
8. Solver & Simulation Capabilities  
9. Electricity Flow Visualisation  
10. Views  
11. Save/Load, Export/Import, and Canonical Examples  
12. Testing Strategy  
13. Non-Goals  

---

## System Partitioning

The system is implemented as distinct layers with explicit, testable boundaries:

┌──────────────────────────────────────────────────────────────┐
│ Breadboard View (placement + analysis UI) │
│ - Physical constraints and geometry │
│ - Component footprints and pin-to-hole insertion │
│ - Voltage/current/connectivity/error overlays │
└──────────────────────────────────────────────────────────────┘
↓
┌──────────────────────────────────────────────────────────────┐
│ Electrical Graph / Netlist │
│ - Nets (connectivity groups) │
│ - Components with terminals mapped to nets │
└──────────────────────────────────────────────────────────────┘
↓
┌──────────────────────────────────────────────────────────────┐
│ Solver / Simulation Engine │
│ - DC operating point, time-domain, digital/event simulation │
│ - Produces voltages, currents, warnings, derived metrics │
└──────────────────────────────────────────────────────────────┘
↓
┌──────────────────────────────────────────────────────────────┐
│ Overlays + Explain / Inspect UI │
│ - Voltage/current/power/error overlays │
│ - Multimeter-style probing │
│ - Plain-language inspection │
└──────────────────────────────────────────────────────────────┘

---

## Licensing & Asset Provenance

### Constraints

- Repository license: MIT.
- All incorporated code, assets, and documentation must be MIT-compatible.

### Part graphics & visual assets

- Do **not** reuse Fritzing part graphics.
- Component visuals are produced via:
  - procedural rendering (preferred for parametric parts)
  - project-owned SVG assets (original or permissively licensed)

### Solver libraries

- ngspice (BSD-3-Clause) is permitted via WebAssembly.
- GPL-licensed solver code is not incorporated.

---

## Rendering & Interaction Capabilities

### Rendering fidelity (WebGL-grade) — required

Requirements:
- 2D top-down breadboard rendering, photorealistic enough to resemble a real breadboard.
- WebGL-capable renderer (PixiJS recommended).
- Breadboard geometry reflects real physical structure:
  - 5-hole strips
  - center trench
  - power rails and rail breaks
  - realistic spacing and labeling
- Breadboard appearance:
  - white or off-white plastic
  - small circular holes
  - row/column labels and numbering
- Overlapping wires are visually unambiguous.
- Active LEDs emit glow derived from solver output.

Acceptance criteria:
- [ ] Crossing wires do not imply a junction.
- [ ] LED brightness varies with simulated current.
- [ ] Breadboard visually reads as a real breadboard.

### Component placement

Requirements:
- Drag-and-drop placement from a library.
- Pins snap to holes with ghost preview.
- Invalid placements blocked.
- Rotation via keyboard and UI controls.

### Wiring

Requirements:
- Drag from hole to hole only.
- No floating wire endpoints.
- Straight, orthogonal, or spline routing.

### Selection & editing

Requirements:
- Single and multi-selection.
- Undo/redo (≥ 50 steps).

### Resistor visual accuracy and lookup — required

Requirements:
- Procedural resistor band rendering.
- Band count derived from tolerance.
- Integrated color-code lookup tool.

Acceptance criteria:
- [ ] 1kΩ 5% → brown-black-red-gold.
- [ ] 10kΩ 1% → brown-black-black-red-brown.

---

## Breadboard Analysis & Debugging Capabilities (Core USP)

### Purpose

The Breadboard View is **not only a construction surface**.  
It is the primary **analysis, debugging, and explanation surface** of the system.

The system’s core educational value is enabling users to:
- See electrical phenomena invisible in real life
- Inspect voltages and currents anywhere
- Reveal hidden breadboard connectivity
- Diagnose wiring and conceptual errors
- Use the virtual circuit as a reference when debugging a real breadboard with a multimeter

---

### Voltage overlay — required

Requirements:
- Toggleable overlay on the breadboard.
- All holes in the same net render with the same voltage color.
- Numeric voltage inspectable on demand.
- Floating nodes visually distinct.

Acceptance criteria:
- [ ] All holes in a net show identical voltage coloring.
- [ ] Clicking a hole displays numeric voltage.

---

### Current overlay — required

Requirements:
- Visualisation of current direction and magnitude:
  - through components
  - along wires
- Current inspectable per component/branch.
- Zero-current components visually distinguishable.

Acceptance criteria:
- [ ] Direction matches solver output.
- [ ] Component inspection shows current and power.

---

### Error & anomaly overlay — required

Requirements:
- Visual indication of:
  - short circuits
  - floating nodes
  - reversed polarity
  - overcurrent / power dissipation warnings

Acceptance criteria:
- [ ] Errors are visible in situ on the breadboard.

---

### Breadboard connectivity reveal mode — required

Purpose:
Reveal connectivity hidden in physical breadboards.

Requirements:
- Toggleable overlay showing:
  - 5-hole strips
  - power rails and breaks
  - center trench isolation
- Hover/select highlights entire electrically connected net.
- Can be combined with voltage/current overlays.

Acceptance criteria:
- [ ] Users can infer breadboard topology visually.
- [ ] Center gap and rail breaks are explicit.

---

### Multimeter-guided debugging — required

Requirements:
- Multimeter mode supporting:
  - voltage measurement between two holes
  - current inspection through a selected component
- UI mirrors real multimeter usage.
- Values reflect solver output.

Acceptance criteria:
- [ ] Two-point voltage measurement works.
- [ ] Values match solver results.

---

## Component Library (Real-World Parts)

Requirements:
- Components represent real, purchasable parts.
- Stable IDs.
- Physical and electrical characteristics included.
- No fictional “magic” components.

Examples:
- 3mm ultra-bright LED
- Axial resistors (1/4W, 1% and 5%)
- Breadboard-compatible speakers

---

## Data Model

*(unchanged from prior version; retained verbatim for implementation)*

---

## Extraction Pipeline (Breadboard → Nets → Netlist)

Requirements:
- Intrinsic breadboard connectivity + wires + pins produce nets.
- Each hole maps to exactly one net.
- Deterministic extraction.

---

## Solver & Simulation Capabilities

### DC operating point

- Modified Nodal Analysis.
- Detects shorts and floating nodes.

### SPICE-class simulation

- ngspice via WebAssembly.
- Transient analysis supported.
- Graceful fallback.

### Digital/event simulation

- Supports {0,1,Z,X} logic.
- Explicit analog/digital bridges.

### Audio output — required

- Speaker produces real audio via Web Audio API.
- Disabled by default.

### Simple microprocessor — required

EDU-8 Microprocessor:
- Explicit internal simulation.
- Clocked execution.
- Simple instruction set.
- Explain panel shows internal state.

---

## Electricity Flow Visualisation

Requirements:
- Voltage heatmap on breadboard.
- Current flow visualisation.
- Error overlays.
- Inspection UI shows computed values.

---

## Views

### Breadboard view — primary

- Primary surface for **construction, analysis, inspection, and debugging**.
- All overlays operate here.

### Schematic view — derived, explanatory

Purpose:
Simplify physical complexity into a readable logical representation.

Requirements:
- Derived from netlist.
- Non-editable.
- Deterministic layout algorithm.
- Nodes/components spaced for readability.
- Inspectable voltages and currents.

---

## Save/Load, Export/Import, and Canonical Examples

### Save/load

- JSON persistence of placements, wiring, and components.

### Canonical examples — required

Examples:
- LED + resistor
- Voltage divider
- Clock-driven microprocessor circuit

Each example must:
- Load into a known-good state
- Support overlays and inspection

---

## Testing Strategy

### Automated tests

- Unit tests for topology, extraction, solvers.
- Property-based tests for connectivity invariants.
- Golden circuits with expected numeric outputs.
- UI smoke tests (Playwright).

### Visual regression testing — required

Requirements:
- Headless browser CI runs.
- Screenshot capture of:
  - breadboard view
  - voltage/current/connectivity overlays
  - schematic view
- Screenshot delta comparison fails CI on unintended change.

Acceptance criteria:
- [ ] Visual regression runs in CI.
- [ ] Overlay visuals are stable and deterministic.

---

## Non-Goals

1. PCB layout.
2. Full microcontroller firmware emulation.
3. Large proprietary part catalogs.
4. Photorealistic 3D rendering.
5. Real-time collaboration.
6. Native mobile apps.
7. RF/transmission-line analysis.
8. Competing with full desktop EDA tools.

---

**Document History**
- v0.1 (Dec 2025): Initial planning
- v0.2 (Jan 2026): Capability-driven rewrite
- v0.3 (Jan 2026): Explicit breadboard analysis/debugging USP, overlays, multimeter workflow, schematic clarification