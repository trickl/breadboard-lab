Implement Derived Schematic View

## Context

The system currently provides a breadboard view where users place components physically and wire them together. The circuit extraction pipeline successfully converts this physical layout into an electrical netlist (nodes and components with terminals). However, users cannot view the **electrical abstraction** of their circuit—the traditional schematic diagram that shows how components are electrically connected without physical constraints.

## Gap Analysis

**Goal requirement (from `/planning/vision/goal.md`):**
> "Schematic view is derived from the netlist and is available when present."

**Current state (from `/planning/state/system_capabilities.md`):**
> "Views: Breadboard view is primary. Schematic view is derived from the netlist and is available when present."
> Listed under constraints: "No schematic editor (separate from breadboard view)"

The goal document positions schematic view as a **required secondary view** that is auto-generated from the netlist, not a hand-drawn perfection. The purpose is clear: "debugging, learning, export."

**Why this is the most important gap:**
1. **Educational value**: Students learn electronics by understanding both physical breadboard layouts AND abstract schematic diagrams. Without schematic view, they miss half the learning.
2. **Debugging aid**: Complex circuits are easier to understand in schematic form—connections are shown electrically, not spatially.
3. **Professional preparation**: Real-world electronics uses schematics for documentation and communication.
4. **Foundation for other features**: Schematic export, advanced analysis tools, and documentation generation all depend on having a schematic view.
5. **USP alignment**: The project's unique selling point is "maintains a first-class electrical net model and can visualise real computed circuit behaviour." Schematic view makes this abstraction visible and actionable.

## Proposed Task

Implement an auto-generated schematic view that:

1. **Derives from the existing netlist** (no hand-layout)
2. **Displays in a separate view** alongside breadboard view (tab or split pane)
3. **Shows components with standard schematic symbols** (resistor zigzag, LED triangle, etc.)
4. **Shows electrical connections as lines** between component terminals
5. **Uses automatic layout algorithm** (force-directed or hierarchical)
6. **Synchronizes with simulation results** (voltage/current overlays work in both views)
7. **Allows clicking components/nets** to open explain panel (consistent interaction model)

## Technical Approach (High-Level)

**Input:** 
- `ElectricalNetlist` (already extracted from breadboard)
- `SimulationResult` (voltages and currents)

**Processing:**
- Map components to standard schematic symbols (SVG or procedural)
- Apply graph layout algorithm (e.g., layered/hierarchical layout for DAGs, force-directed for general graphs)
- Calculate positions and route connection lines (orthogonal or straight)

**Output:**
- SVG rendering of schematic diagram
- Interactive elements (click handlers, voltage overlays, current flow)

**Libraries to consider:**
- ELK.js (Eclipse Layout Kernel) for automatic graph layout
- Cytoscape.js (graph visualization library)
- Custom simple layout for initial version (can be enhanced later)

## Acceptance Criteria

- [ ] Schematic view is accessible via UI control (tab or button)
- [ ] All placed components appear in schematic view with standard symbols
- [ ] Electrical connections (nets) are visible as lines between components
- [ ] Layout is automatic—no manual positioning required
- [ ] Voltage overlay colors apply to nets in schematic view
- [ ] Current animation (or indicators) work in schematic view
- [ ] Clicking components opens explain panel with same information as breadboard view
- [ ] Schematic view updates automatically when circuit changes
- [ ] View switching does not lose simulation state

## Scope Constraints

**In scope:**
- Basic schematic symbols for current component types (resistor, LED, power supply, ground, wire as net)
- Automatic layout (even if not perfect)
- Voltage/current visualization in schematic
- Interactive explain panel integration

**Out of scope (deferred):**
- Hand-editing schematic positions
- Schematic-first design (placing components in schematic view)
- Complex schematic symbols (ICs, transistors not yet in library)
- Export to industry-standard schematic formats (can be added later)
- Beautification algorithms (perfect routing, optimal placement)

## Dependencies

**Requires (already available):**
- Netlist extraction (✅ implemented)
- Circuit simulation (✅ implemented)
- Component types system (✅ implemented)

**Enables (future features):**
- Schematic export (PDF, PNG, SVG)
- Printable circuit documentation
- Schematic-based tutorials
- Advanced circuit analysis views

## Estimated Complexity

**Medium to High** (2-4 development sessions)

- Graph layout algorithms are well-understood but integration takes effort
- Schematic symbol rendering is straightforward (reuse component renderer patterns)
- Interaction model already exists (explain panel, overlays)
- Main complexity: layout quality and edge routing

## Priority Rationale

This task addresses a **core educational gap**. The project mission is to provide "a web-first breadboard UI that maintains a first-class electrical net model." The netlist exists but is invisible to users. Schematic view makes the electrical abstraction tangible, enabling users to:

1. **Learn dual representations**: Physical (breadboard) and abstract (schematic)
2. **Debug complex circuits**: Schematic view reveals logical structure
3. **Communicate designs**: Schematics are the universal language of electronics
4. **Build toward professional tools**: Schematic view is a stepping stone to export, advanced analysis, and documentation

Without schematic view, Breadboard Lab remains a "breadboard simulator" rather than a "circuit understanding tool."

## References

**Goal document requirement:**
- `/planning/vision/goal.md` § Views: "Schematic view is derived from the netlist and is available when present."

**Current system state:**
- `/planning/state/system_capabilities.md` § Views: "Breadboard view is primary. Schematic view is derived from the netlist and is available when present."
- Circuit extraction produces `ElectricalNetlist` with nets and components (§ Data Model)

**Layout algorithm resources:**
- ELK.js: https://github.com/kieler/elkjs (Eclipse Layout Kernel in JavaScript)
- Cytoscape.js: https://js.cytoscape.org/ (graph visualization library)
- Force-directed layouts: D3.js force simulation patterns
