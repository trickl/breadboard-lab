# Copilot Instructions — Planning Document (Breadboard Educational Tool)

You are writing a _verbose_, _opinionated_, and _implementation-oriented_ planning document for an open-source, web-first breadboard circuit simulator.

## Output target

Create: `planning/00-planning.md` (single, comprehensive document; 2,000–6,000+ words is fine).

Write in Markdown with clear headings, diagrams in ASCII where helpful, and explicit "decision records" (tradeoffs and why).

## Core objective (must be explicit)

Build a **web-based** breadboard tool with:

1. A **best-in-class breadboard UI** (drag/drop, rotate, snap, wiring).
2. A **separate, explicit electrical model** (nets, components, constraints) that can be solved and visualised.
3. **Electricity-flow visualisation** (voltage/current overlays and/or animations) that is tied to solver output—not decorative.
4. Designed to be **easy to start** (no install) but **powerful** (not "toy-level").

## Unique Selling Point (USP) — must be stated early and reiterated

Position the project as:  
**"A web-first breadboard UI that is not merely a drawing tool: it maintains a first-class electrical net model and can visualise real computed circuit behaviour directly on the breadboard and on a derived schematic view."**

Make the distinction extremely clear:

- Breadboard view = physical placement and wiring constraints
- Electrical graph/netlist = what the circuit _is_
- Solver = what the circuit _does_
- Visual overlays = how we teach/debug

## Competitors & inspiration (must include at least these)

Describe what they do well and gaps we exploit:

- Fritzing: excellent breadboard documentation / communication; desktop-oriented; licensing constraints on part graphics (do not reuse) — cite Fritzing FAQ.
- Falstad / CircuitJS: very good interactive simulation & visualisation; schematic-first rather than breadboard-first — cite Falstad "about" page mentioning CircuitJS1 source.
- Wokwi: strong embedded simulation ecosystem and web tooling; licensing is not "just open source for everything" — cite Wokwi license/pricing pages as context.
- Mention that there are other breadboard-oriented tools (e.g., PICAXE PEBBLE as breadboard layout), but our focus is solver-integrated flows.

Citations/links in the planning doc should be plain text references; the repository can later convert them to proper docs.

## Licensing constraints (non-negotiable section)

- You MUST include a section: "Licensing & asset provenance".
- State clearly: do not reuse Fritzing part graphics; Fritzing explicitly restricts use of part graphics in other software systems — cite Fritzing FAQ.
- If we use any third-party libraries, note their licenses and compatibility.
- If solver is GPL (e.g., CircuitJS1), discuss implications and whether we prefer a permissive option.

## UI/UX requirements (must be concrete and testable)

Describe interaction details as requirements:

- Breadboard holes are interactable nodes; hover highlights row/rail net.
- Components are draggable with:
  - rotate (R key, on-screen rotate handle, and touch-friendly rotate)
  - snap-to-hole insertion (pins must align to holes; show ghost preview)
  - collision/invalid placement feedback
- Wires:
  - drag from hole to hole
  - auto-route is optional, but manual routing must be pleasant
  - wire is a rendered path (bezier/spline); optional physics "relaxation" is a stretch goal
  - wires snap to endpoints; wire endpoints cannot float
- Selection model:
  - multi-select, delete, copy/paste, undo/redo
- Accessibility:
  - keyboard operations for core actions; not perfect, but planned

Include a "UI State Machine" subsection that defines:

- pointer down on component vs hole vs wire
- drag behaviours
- rotate behaviour
- gestures (mouse, touch)

Include acceptance criteria bullets for each interaction.

## Technical architecture (must separate concerns)

Provide a high-level architecture diagram and then detail each layer:

### Frontend rendering recommendation (choose one primary, justify)

Discuss and pick a primary interactive canvas approach, e.g.:

- `react-konva` / Konva for drag + snapping patterns (Konva has documented snapping demos)
- or PixiJS + custom interaction
- or SVG (likely insufficient for performance at scale)
  Make a decision and justify.

### Core data model (must be graph-based)

Define:

- `BreadboardTopology` (holes, rails, strips, mapping to connectivity)
- `Placement` (component footprint + pin-to-hole mapping)
- `Wiring` (wire endpoints map to holes)
- `ElectricalNetlist` (nets + components + terminals)
- `SolvedState` (node voltages, branch currents, power)

Explain conversion pipeline:
Placement/Wiring → Net extraction → Netlist generation → Solver input → Solver output → Overlays

### Solver strategy (must be explicit, with two-tier design)

Define two tiers:

1. **Fast DC sanity solver** (instant feedback; e.g., resistive networks + independent sources; detects shorts/floating).
2. **Full SPICE-class solver** (optional; runs for more complex circuits and transients).

If recommending ngspice in WASM, reference that ngspice exists and there are WASM builds (e.g., ngspice-wasm projects) and that ngspice is a SPICE simulator — cite sources.
Also discuss that CircuitJS1 exists and is GPL; cite a source that points to CircuitJS1 being published/maintained on GitHub and licensed under GPL (or that Falstad references it).

Be explicit about:

- what analyses we support in MVP (DC operating point first; transient later)
- component model scope (R, C, L, diode, LED, BJT/MOSFET optional)
- performance constraints and fallback behaviour

## "Electricity flows" visualisation (central feature)

Describe at least two overlay modes:

1. **Voltage heatmap / colour banding** over connected nets (including rails).
2. **Current animation** on wires/components (direction + magnitude).
   Optionally:

- power dissipation highlight ("hot" resistors)
- error overlays (short circuit, floating node, invalid polarity)

Also require an "Explain" panel:

- click a net/component → show computed values + reasoning + hints
- "why is this not working?" heuristics (open circuit, reversed LED, missing ground)

## Views (must include both)

- Breadboard view (primary)
- Derived schematic view (secondary; auto-generated from netlist; not hand-drawn perfection)
  Explain why schematic view exists: debugging, learning, export.

## Export/import

Plan for:

- Export project JSON (canonical)
- Export netlist (SPICE-like) for advanced users
- Import minimal library parts definitions (own format)

## Roadmap & milestones (must be realistic, but ambitious)

Define:

- MVP (placement, wiring, net extraction, DC solver, basic overlay)
- v0.2 (more components, schematic view, improved overlays)
- v0.3 (SPICE/WASM tier, transient plots)
- v1.0 (polish, docs, tutorial circuits, stability)

Each milestone must list:

- features
- key risks
- success criteria

## Testing strategy (must be explicit)

- unit tests for net extraction and solver adapters
- property-based tests for connectivity invariants
- golden test circuits (known outcomes)
- UI smoke tests (Playwright)

## Non-goals (to prevent scope explosion)

List at least:

- PCB layout (explicitly not the goal)
- microcontroller firmware simulation in early versions
- huge proprietary parts library
- photorealistic 3D rendering

## Style

Write as a planning spec: precise, assertive, and actionable.
Avoid vague "we might".
Where alternatives exist, include a decision + rationale.
