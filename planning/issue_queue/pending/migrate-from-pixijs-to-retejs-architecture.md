Migrate from PixiJS/WebGL to Rete.js-based visual programming architecture

## Context and Motivation

The current Breadboard Lab implementation uses **PixiJS** as its primary rendering and interaction layer. While PixiJS provides excellent WebGL-based 2D rendering performance and has enabled the system to achieve photorealistic visual quality, it was not designed for the kinds of **node-based connection management**, **constraint enforcement**, and **graph-oriented interaction patterns** that are central to the educational breadboard tool's mission.

The `/planning/vision/goal.md` document specifies a **"Next Iteration Specification (Rete.js Migration)"** as the foundational architectural shift for this iteration. This is not an optional enhancement—it is the **primary goal** stated explicitly at the top of the planning document.

### Why This Migration is Critical

The goal document states:

> "The existing PixiJS implementation makes **connector management, snapping, routing, and interaction state** increasingly complex and fragile."

PixiJS is fundamentally a **rendering library**, not a **graph interaction framework**. As the system grows to support more sophisticated interactions—continuous rotation, wire re-routing with control points, one-connector-per-hole constraints, dynamic connection validation, and multi-mode views—the custom interaction logic built on top of PixiJS will become increasingly difficult to maintain and extend.

**Rete.js**, by contrast, is purpose-built for **node-based visual programming**. It provides:

- **Native node-connector-edge abstractions** (not custom-built on rendering primitives)
- **Built-in connection constraints** (enforceable socket rules)
- **Support for re-routing, animated edges, and custom socket logic**
- **Clean conceptual mapping to electrical networks**
- **Established patterns for plugin-based extensibility**

Rete.js will act as the **interaction and connectivity backbone**, not merely a diagramming layer. PixiJS can remain as a **rendering plugin** within Rete.js if high-performance WebGL rendering is still required, but the core interaction model, state management, and connection logic should be driven by Rete.js abstractions.

---

## Current System Architecture

### PixiJS-Based Implementation

The current system (as of PR #203) uses:

1. **`PixiRenderer` class** (`src/ui/pixi-renderer.ts`, 1136 lines)
   - Unified WebGL rendering pipeline for breadboard, components, voltage overlays, current animation, error icons
   - Photorealistic rendering with 3D depth cues, shadows, glow effects
   - Direct PixiJS Graphics/Container API for drawing
   - Custom event handling via PixiJS pointer events

2. **`BreadboardApp` class** (`src/ui/breadboard-app.ts`, 2403 lines)
   - Main UI application controller
   - Custom drag-and-drop logic with ghost preview
   - Custom rotation logic (90° increments only)
   - Component selection and property editing
   - Circuit extraction and simulation orchestration
   - Event handler bridging (PixiJS pointer events → application logic)

3. **Interaction Model**
   - Two-click component placement (click hole 1, click hole 2)
   - Components snap to grid positions
   - Drag-and-drop repositioning with validation
   - Rotation via R key (0°, 90°, 180°, 270° only)
   - No wire re-routing (wires are static edges)
   - No component leg-level connection management

### Strengths of Current System

- ✅ **Excellent visual quality**: Photorealistic rendering with depth, shadows, glow
- ✅ **Good performance**: 60fps maintained with PixiJS WebGL
- ✅ **Component library integration**: 36 real-world components
- ✅ **Working simulation**: DC solver + digital simulation + mixed-signal coordination
- ✅ **Stable and tested**: 378/378 tests passing

### Limitations Requiring Rete.js

The current PixiJS implementation **cannot easily support** the following goal requirements:

1. **Continuous rotation**: Goal requires unrestricted rotation angles, not 90° increments
2. **Component leg-level connections**: Goal requires individual leg-to-hole connections, not whole-component placement
3. **Wire re-routing with control points**: Goal requires draggable wire segments, not static paths
4. **One-connector-per-hole constraints**: Goal requires strict socket-based enforcement
5. **Component instantiation model**: Goal requires components to appear "adjacent to board" before connection, not immediate placement
6. **X-Ray Mode and Electrical View Mode as toggles**: Current voltage overlays are always-on, not mode-based
7. **Switch components with short-click toggle**: PixiJS requires custom gesture disambiguation between click and drag

These features are **native abstractions in Rete.js** but require significant custom implementation in PixiJS.

---

## Target Architecture: Rete.js-Based System

### Conceptual Model from goal.md

**Section 3: Core Conceptual Model**

> "All meaningful physical and electrical entities are represented as **Rete nodes**, including:
> - Components (LEDs, resistors, transistors, switches, batteries)
> - Breadboard holes (conceptually, even if visually grouped)
> - Wires (either edges or thin intermediary nodes)"

> "A **one-connector-per-hole constraint** must be enforced."

> "A valid connection represents **electrical continuity**."

### Rete.js Integration Strategy

**1. Nodes**

- **Component nodes**: Represent physical components (LED, resistor, power supply, etc.)
  - Properties: type, rotation (continuous angle), electrical properties (resistance, voltage, etc.)
  - Connectors: Fixed sockets representing component legs/terminals
  - Visual: Component body rendered at node position with rotation applied
  
- **Breadboard hole nodes**: Represent connection points on the breadboard
  - Properties: position (row, column), rail/strip membership
  - Connectors: Single input socket (enforces one-connector-per-hole)
  - Visual: Hole rendered at grid position

- **Wire nodes** (optional, depends on edge-vs-node choice):
  - Properties: color, routing control points
  - Connectors: Two sockets (start, end)
  - Visual: Rendered path with draggable control points

**2. Connections**

- **Rete connections** (edges) represent electrical continuity
- Connection creation enforces socket compatibility rules
- Connection removal triggers circuit re-extraction

**3. Rendering**

- Rete.js provides the **interaction layer** (node dragging, connection management)
- PixiJS (via Rete.js plugin) provides the **rendering layer** (WebGL graphics)
- Separation of concerns: Rete manages state, PixiJS renders state

---

## Required Changes

### Phase 1: Foundation (Rete.js Setup and Basic Node System)

**Goal**: Establish Rete.js as the core interaction framework without breaking existing functionality.

1. **Install Rete.js dependencies**
   - `rete` (core library)
   - `rete-area-plugin` (canvas panning, zooming)
   - `rete-connection-plugin` (connection creation UI)
   - `rete-render-plugin` or custom plugin for PixiJS rendering integration

2. **Create Rete.js editor instance**
   - Initialize editor in `BreadboardApp` constructor
   - Configure area plugin for breadboard viewport
   - Set up connection plugin with custom socket rules

3. **Define Rete node classes**
   - `ComponentNode`: Base class for all component types
   - `BreadboardHoleNode`: Represents individual holes
   - `WireNode` (if using node-based wires): Represents wire segments

4. **Define Rete socket types**
   - `ComponentLegSocket`: Represents component terminals
   - `BreadboardHoleSocket`: Represents breadboard holes
   - Socket compatibility rules: Leg can connect to hole only

5. **Implement Rete-to-circuit-state bridge**
   - Extract components from Rete nodes
   - Extract connections from Rete edges
   - Convert to existing `BreadboardState` format for backward compatibility

6. **Preserve existing rendering**
   - Keep `PixiRenderer` operational during transition
   - Sync PixiRenderer state from Rete editor state

**Acceptance Criteria**:
- Rete.js editor initializes without errors
- Existing components can be represented as Rete nodes
- Circuit extraction works with Rete-based state
- All existing tests pass

---

### Phase 2: Component Placement Model (Leg-Level Connections)

**Goal**: Implement the goal's component placement model where components appear adjacent to the board and users connect individual legs.

**From goal.md Section 5.3.1:**

> "Selecting a component does **not** immediately place it on the breadboard. The component appears **adjacent to the board**, floating beside it. The user:
> 1. Drags the component body into position
> 2. Connects individual legs to breadboard holes"

**Implementation**:

1. **Component instantiation**
   - Clicking component in Quick Select Bar creates ComponentNode
   - Node appears at fixed "staging area" position (adjacent to breadboard)
   - Component body is draggable
   - Component legs are visible as connectors (Rete sockets)

2. **Leg-to-hole connection**
   - User drags from component leg socket to breadboard hole socket
   - Rete connection plugin handles connection creation UI
   - One-connector-per-hole constraint enforced by socket rules
   - Invalid connections visually rejected (highlight, glow feedback)

3. **Component positioning**
   - Component body position independent of leg connections
   - Legs stretch/bend to reach connected holes (visual only)
   - Component can be repositioned; connections remain intact but may become invalid if holes are too far

4. **Validation**
   - After connection changes, validate all component legs have valid connections
   - Highlight components with missing or invalid connections
   - Circuit extraction only includes fully connected components

**Acceptance Criteria**:
- Components can be placed in staging area
- Individual legs can be connected to holes
- One-connector-per-hole constraint enforced
- Invalid connections provide visual feedback
- Circuit extraction works with leg-level connections

---

### Phase 3: Continuous Rotation and Wire Re-Routing

**Goal**: Implement continuous rotation and wire control points as specified in goal.md.

**From goal.md Section 7.2:**

> "All components support **continuous rotation** (not limited to 90°). When selected:
> - A rotation handle or arc is shown
> - Dragging rotates the component"

**From goal.md Section 6.2:**

> "Wires are draggable via control points. Re-routing must be supported (Rete re-root pattern):
> - Dragging a segment recalculates the path
> - Routing avoids component overlap where possible"

**Implementation**:

1. **Continuous rotation**
   - Add rotation handle to selected components (visible ring/arc UI)
   - Dragging handle rotates component around center
   - Rotation angle stored as continuous value (0-360°, not quantized)
   - Component legs rotate with body
   - Connections update positions dynamically

2. **Wire re-routing**
   - If using edge-based wires: Rete connection path plugin with control points
   - If using node-based wires: Wire nodes with draggable position
   - Control points visible when wire selected
   - Path recalculated with bezier/spline interpolation
   - Optional: path avoids component overlap (collision detection)

3. **Visual clarity**
   - Wire paths prefer orthogonal or gently curved routes
   - Overlapping wires use depth cues (shadows, highlights)
   - Wire color selectable by user

**Acceptance Criteria**:
- Components rotate continuously (not quantized to 90°)
- Rotation handle appears on selected components
- Wires have draggable control points or segments
- Wire paths update dynamically during routing
- Visual clarity maintained with multiple overlapping wires

---

### Phase 4: Switch Components and Interaction Model

**Goal**: Implement interactive switch components with short-click toggle.

**From goal.md Section 8.1:**

> "Switches are **stateful, interactive components**. Primary challenge: left-click is already used for dragging."

> "Interaction Model:
> - Short click (below movement threshold): toggles switch state
> - Click-and-drag: moves the switch
> - Optional future enhancement: dedicated toggle hotspot"

**Implementation**:

1. **Switch component type**
   - Add `SWITCH` component type with boolean `closed` state
   - Electrical behavior: closed = 0.01Ω (wire), open = 1MΩ (near-infinite resistance)
   - Visual rendering: switch body with visible state indicator (lever/toggle position)

2. **Gesture disambiguation**
   - Detect click vs drag: if pointer moves < threshold (e.g., 5px) before release, it's a click
   - Short click on switch: toggle state, trigger circuit re-simulation
   - Click-and-drag on switch: move component (existing drag logic)

3. **State propagation**
   - Switch state changes trigger immediate circuit re-extraction and re-simulation
   - Voltage overlays and current animation update to reflect new state
   - Switch state persists in component metadata

4. **Library integration**
   - Add switch to component library catalog
   - Include in Quick Select Bar (one of the 5 default components)

**Acceptance Criteria**:
- Switch components can be placed and connected
- Short click toggles switch state (< 5px movement threshold)
- Switch state affects circuit behavior (open vs closed)
- Click-and-drag moves switch without toggling
- Switch visual indicates current state

---

### Phase 5: X-Ray Mode and Electrical View Mode (UI Toggles)

**Goal**: Implement two orthogonal informational modes as UI toggles.

**From goal.md Section 4.2:**

> "These modes overlay additional information on top of either view:
> 1. **Electrical View Mode**
> 2. **X-Ray Mode**
> They are independent toggles and may be enabled or disabled separately."

**X-Ray Mode (Section 10)**:

> "X-Ray Mode reveals the **hidden internal wiring of the breadboard**.
> When enabled:
> - Internal breadboard buses and rails become visible
> - Electrically shared holes are visually grouped or linked
> - Overlaid wiring is clearly distinguishable from user-added wires"

**Electrical View Mode (Section 9)**:

> "Electrical View Mode exposes **dynamic electrical behaviour** that cannot be observed physically.
> When enabled:
> - Animated connectors show **where current is flowing**
> - Animations appear **only on active paths**
> - Flow direction and speed reflect current magnitude
> - Display expected **voltage and current**: on wires, across component legs, within breadboard rows/rails"

**Implementation**:

1. **UI Controls**
   - Add two toggle buttons in toolbar: "⚡ Electrical View" and "👁️ X-Ray Mode"
   - Both default to OFF
   - State stored in BreadboardApp, persisted in localStorage

2. **X-Ray Mode Rendering**
   - When enabled: render internal breadboard connections (rail buses, terminal strip rows)
   - Use translucent/dotted lines or color-coding to distinguish from user wires
   - Highlight electrically connected holes within same net

3. **Electrical View Mode Rendering**
   - When enabled: render voltage values as labels/tooltips on hover
   - Render current animation on active paths (already exists, but gated by toggle)
   - Show voltage/current values on component legs (not just wires)

4. **Combined Mode Behavior**
   - Both modes can be enabled simultaneously
   - X-Ray shows structure, Electrical shows dynamic behavior
   - Toggle states independent of Physical vs Logical view selection

**Acceptance Criteria**:
- Two toggle buttons in UI
- X-Ray Mode reveals internal breadboard connectivity
- Electrical View Mode shows voltage/current values and animated current flow
- Modes work independently and in combination
- Mode states persist across sessions (localStorage)

---

### Phase 6: Quick Select Component Bar and Initial Example Circuit

**Goal**: Improve first-time user experience with Quick Select Bar and default example circuit.

**From goal.md Section 12 and 13:**

> "The tool must be usable **within seconds**. Displayed prominently on initial load:
> - LED
> - Wire (red)
> - Resistor
> - Switch
> - Battery / power source"

> "On first load, users must see:
> - A **working example circuit**
> - At least one interactive element (e.g. switch + LED)"

**Implementation**:

1. **Quick Select Component Bar**
   - Replace current "📦 Component Library" button with horizontal component bar
   - Show 5 default components: LED (3mm yellow), Wire (red), Resistor (220Ω), Switch, Battery (5V)
   - One-click selection (not two-click placement)
   - Customizable: users can add/remove favorites
   - State persisted in localStorage

2. **Initial Example Circuit**
   - Load example circuit on first visit (detect via localStorage flag)
   - Example includes: Battery, Switch, Resistor, LED
   - Circuit is functional: toggling switch lights LED
   - Clear visual demonstration of tool capabilities

3. **First-Time User Flow**
   - Tool loads with working circuit already placed
   - Quick Select Bar visible with common components
   - User can immediately interact (toggle switch, see LED respond)
   - Tooltip/hint system guides user to first actions

**Acceptance Criteria**:
- Quick Select Bar shows 5 default components on load
- One-click component selection from bar
- First-time users see working example circuit
- Example circuit includes interactive switch
- User can toggle switch and observe LED response immediately

---

## Migration Strategy

### Parallel Operation Approach (Recommended)

To minimize risk and maintain stability, the migration should proceed in **parallel** with the existing PixiJS implementation:

1. **Feature flag system**
   - Add `USE_RETE` boolean flag in configuration
   - When `false`: use existing PixiJS-based implementation
   - When `true`: use new Rete.js-based implementation
   - Default to `false` until Rete.js implementation reaches feature parity

2. **Shared core logic**
   - Circuit extraction, simulation, and storage layers remain unchanged
   - Both implementations convert to/from common `BreadboardState` format
   - Core types (`Component`, `Circuit`, `SimulationResult`) remain stable

3. **Incremental cutover**
   - Phase 1-2: Rete.js implementation hidden behind feature flag, not production-ready
   - Phase 3-4: Rete.js implementation reaches feature parity, available for testing
   - Phase 5-6: Rete.js implementation becomes default, PixiJS code path deprecated
   - Post-migration: Remove PixiJS code path and feature flag

### Testing During Migration

1. **Dual test suites**
   - Existing tests continue to run against PixiJS implementation
   - New tests written for Rete.js implementation
   - Both must pass before cutover

2. **Visual regression baseline update**
   - Rete.js implementation may have slight visual differences
   - Update Playwright baselines after cutover
   - Manual review required to ensure visual quality maintained

3. **Performance validation**
   - Benchmark both implementations (60fps target)
   - Ensure Rete.js + PixiJS plugin maintains performance
   - Profile and optimize if necessary

---

## Dependencies and Integration Points

### New Dependencies

- `rete` (^2.0.0 or latest stable): Core Rete.js library
- `rete-area-plugin` (^2.0.0): Viewport management
- `rete-connection-plugin` (^2.0.0): Connection creation UI
- Custom Rete render plugin or adapter for PixiJS integration

**License Check**: Rete.js is MIT licensed (compatible with existing MIT license).

### Affected System Components

1. **`BreadboardApp`** (major refactor)
   - Replace PixiJS event handling with Rete.js event system
   - Replace custom drag-and-drop with Rete node dragging
   - Replace component placement logic with Rete node instantiation
   - Preserve save/load, examples, property editor, audio controls

2. **`PixiRenderer`** (refactor into Rete plugin)
   - Convert from standalone renderer to Rete.js render plugin
   - Implement Rete plugin interface for rendering nodes, connections, and background
   - Preserve all photorealistic rendering features

3. **Circuit Extraction** (minimal changes)
   - Update to extract components from Rete nodes instead of flat array
   - Update to extract connections from Rete edges
   - Core extraction algorithm unchanged

4. **Component Library** (integration)
   - Map library entries to Rete node definitions
   - Generate Rete sockets from component pin configurations
   - Preserve existing library infrastructure

5. **Tests** (significant additions)
   - New tests for Rete.js integration (node creation, connection validation, socket rules)
   - Update existing tests to work with both implementations during transition
   - New visual regression baselines after cutover

---

## Success Criteria

The migration is complete when:

1. ✅ **All goal.md requirements implemented**:
   - Rete.js-based architecture operational
   - Continuous component rotation
   - Leg-level connection management
   - One-connector-per-hole constraints enforced
   - Wire re-routing with control points
   - Switch components with click vs drag disambiguation
   - X-Ray Mode and Electrical View Mode as toggles
   - Quick Select Component Bar with 5 default components
   - Working example circuit loads on first visit

2. ✅ **All existing functionality preserved**:
   - Component library (36 components)
   - Circuit simulation (DC + digital + mixed-signal)
   - Save/load/examples
   - Property editor
   - Audio output
   - Schematic view
   - Visual quality (photorealistic rendering)

3. ✅ **Performance maintained**:
   - 60fps rendering performance
   - No perceptible lag during interactions
   - Fast circuit extraction and simulation

4. ✅ **Test coverage**:
   - All 378 existing tests passing
   - New tests for Rete.js features (target: 50+ new tests)
   - Visual regression tests updated and passing

5. ✅ **Documentation updated**:
   - ARCHITECTURE.md reflects Rete.js architecture
   - User-facing docs explain new interaction model
   - Developer docs explain Rete.js integration

6. ✅ **Code cleanup**:
   - PixiJS-specific interaction code removed
   - Feature flag removed
   - Dead code eliminated

---

## Risks and Mitigation

### Risk 1: Performance Regression

**Risk**: Rete.js abstraction layer may introduce performance overhead.

**Mitigation**:
- Profile early and often during development
- Use PixiJS rendering plugin to maintain WebGL performance
- Optimize Rete node update frequency
- Implement virtual rendering (only render visible nodes)

### Risk 2: Learning Curve

**Risk**: Development team unfamiliar with Rete.js paradigms.

**Mitigation**:
- Allocate time for Rete.js documentation review and experimentation
- Start with simple proof-of-concept (single node type, basic connection)
- Leverage Rete.js community examples and plugins
- Incremental implementation allows course-correction

### Risk 3: Breaking Changes

**Risk**: Migration introduces subtle bugs or breaks existing workflows.

**Mitigation**:
- Parallel implementation approach (feature flag)
- Comprehensive testing during transition
- Beta testing period with flag enabled
- Rollback plan (keep PixiJS implementation until confident)

### Risk 4: Visual Parity

**Risk**: Rete.js default rendering does not match photorealistic quality.

**Mitigation**:
- Integrate PixiRenderer as Rete plugin (preserve all visual features)
- Visual regression tests catch regressions
- Manual review of visual quality before cutover

---

## Estimated Effort

**Total Effort**: 4-6 weeks (1 senior engineer, full-time)

**Phase Breakdown**:
- Phase 1 (Foundation): 1 week
- Phase 2 (Leg-Level Connections): 1-2 weeks
- Phase 3 (Rotation and Routing): 1 week
- Phase 4 (Switches): 3-5 days
- Phase 5 (Modes): 3-5 days
- Phase 6 (Quick Select and Example): 2-3 days

**Testing and Documentation**: Additional 1 week across all phases

---

## Conclusion

This migration is the **foundational architectural shift** that the goal.md explicitly identifies as the primary objective for this iteration. The current PixiJS-based system has served the project well and enabled the team to achieve excellent visual quality and simulation capabilities. However, to support the advanced interaction patterns required by the educational breadboard tool—continuous rotation, leg-level connections, wire re-routing, constraint enforcement, and multi-mode views—the system must transition to a framework purpose-built for node-based visual programming.

Rete.js provides the abstractions, patterns, and plugin ecosystem needed to implement these features cleanly and maintainably. By integrating PixiJS as a Rete rendering plugin, the system can preserve all its visual quality while gaining the robust interaction foundation it needs to fulfill the goal's vision.

This is not merely a technical refactoring—it is the **enabler** for all the other features in the goal document. Without Rete.js, implementing leg-level connections, continuous rotation, wire re-routing, and constraint enforcement will require increasingly complex custom code layered on top of PixiJS. With Rete.js, these become natural extensions of the framework's native capabilities.

**Next Steps**: Approve this task, allocate engineering resources, and begin Phase 1 (Foundation) implementation.
