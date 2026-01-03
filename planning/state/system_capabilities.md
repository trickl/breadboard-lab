# Current System Capabilities of Breadboard Lab

**Date**: 2026-01-03  
**Purpose**: Factual description of what the system demonstrably does today  
**Last Updated**: After implementing error detection and explain panel (PR #113)

---

## Overview

Breadboard Lab is a web-based electronics simulator that provides a visual breadboard interface for placing components, extracting circuit topology, and performing basic circuit simulation. The system is built with TypeScript, uses Vite for building, and runs entirely in the browser with zero runtime dependencies.

---

## Component Library

The system supports exactly five component types:

1. **Wire** - Connects two breadboard holes with minimal resistance (0.01Ω)
2. **Resistor** - Configurable resistance (default 1kΩ, range: > 0Ω)
3. **LED** - Configurable forward voltage (default 2.0V, range: 0.1-5V), max current 0.02A
4. **Power Supply** - Configurable voltage (default 5V, range: 1-20V)
5. **Ground** - Circuit ground reference

Component values for resistors, LEDs, and power supplies can be edited after placement through the property editor panel. Wires and ground components have no configurable properties.

---

## Breadboard Model

### Physical Layout

- **Grid dimensions**: 30 rows × 10 columns (300 holes total)
- **Column arrangement**: 5 columns per side (0-4 left side, 5-9 right side)
- **Row numbering**: 0-29 (zero-indexed)
- **Column numbering**: 0-9 (zero-indexed)

### Connectivity Rules

The breadboard models terminal strip connectivity:

- **Left terminal strips**: Within each row, columns 0-4 are electrically connected
- **Right terminal strips**: Within each row, columns 5-9 are electrically connected
- **Center gap**: Left and right sides are NOT connected (gap between column 4 and 5)
- **No power rails**: The current implementation does not model power rails

### Implementation

- Defined in `BreadboardLayout` class (`src/core/breadboard-layout.ts`)
- Provides methods to:
  - Check if positions are valid
  - Check if positions are internally connected
  - Get all positions connected to a given position

---

## User Interface

### Layout

The UI consists of three panels:

1. **Left toolbar**: Component selection buttons and Clear All button
2. **Center workspace**: Breadboard grid visualization
3. **Right info panel**: Circuit statistics and component list

### Component Placement

**Interaction model**: Two-click placement

1. User selects a component type from the toolbar
2. User clicks a breadboard hole (first position)
3. User clicks another breadboard hole (second position)
4. Component is created with both positions

**Visual feedback**:
- Selected component button gets "active" styling
- Occupied holes display with "occupied" class
- Placed components render visually on the breadboard (power supplies, resistors, LEDs, ground symbols, and wires)
- Drag-and-drop with ghost preview for component repositioning
- Visual indicators for valid/invalid drop positions

### Available Operations

- **Place component**: Select component type, click two holes
- **Select component**: Click on a rendered component to select it (visual feedback: blue drop-shadow)
- **Move component**: Click and drag selected component to reposition (ghost preview shows new position)
- **Rotate component**: Press R key to rotate selected component 90° clockwise (cycles through 0°, 90°, 180°, 270°)
- **Edit component values**: Select component to open property editor, modify values through text input or preset buttons
- **Delete component**: Press Delete or Backspace key to remove selected component
- **Deselect component**: Click breadboard background or another component
- **Clear all**: Removes all components and resets the breadboard
- **View circuit info**: Automatically updated after each placement, deletion, rotation, value change, or repositioning

### Component Selection and Deletion

**Selection model**: Single component selection with visual feedback

- Click any rendered component to select it
- Selected component displays blue drop-shadow filter for visual feedback
- Only one component can be selected at a time
- Clicking another component changes selection
- Clicking breadboard background deselects current selection
- No component selected on initial load or after deletion

**Deletion mechanism**:
- Press Delete or Backspace key to remove selected component
- Circuit automatically re-extracts and re-simulates after deletion
- Voltage overlay and current animation update to reflect new circuit state
- Backspace key default browser navigation is prevented
- No operation performed if no component is selected

**Event handling**:
- Component SVG groups have pointer events enabled (`pointer-events: auto`)
- Components have cursor: pointer styling for interactivity
- Mousedown on component initiates drag operation
- Mousemove during drag updates ghost preview position with snap-to-grid
- Mouseup completes drag and updates component position (or cancels if invalid)
- Keyboard event listener bound to document for Delete/Backspace and Escape keys
- Escape key cancels active drag operation
- Property editor input listeners attached dynamically when component selected
- Event cleanup via `destroy()` method prevents memory leaks (includes debounce timer cleanup)

### Component Drag-and-Drop Repositioning

**Repositioning system**: After placing a component, users can drag it to a new position with real-time visual feedback.

**Drag interaction flow**:
1. Click component to select it
2. Click and hold (mousedown) on selected component to initiate drag
3. Move mouse to desired location (mousemove updates ghost preview)
4. Release mouse (mouseup) to drop component at new position
5. Press Escape at any time to cancel drag and keep original position

**Visual feedback during drag**:
- Original component fades to 30% opacity
- Ghost preview renders at cursor position with 70% opacity
- Preview snaps to nearest valid grid positions (all pins align to holes)
- Valid positions show green drop-shadow on preview
- Invalid positions show red overlay circle and prevent drop
- Preview updates continuously during mouse movement

**Position validation**:
- All component pins must align to valid breadboard holes (within bounds)
- No collision with existing components (pins cannot occupy same holes)
- Snap-to-grid ensures proper hole alignment
- Invalid positions cannot be dropped (component returns to original position on mouseup)

**Circuit integration**:
- Circuit automatically re-extracts after successful move
- Simulation re-runs with new topology
- Voltage overlay and current animation update to reflect new positions
- Component selection persists after move (remains selected)
- No re-extraction if drag is cancelled

**Implementation details**:
- Drag state tracked in `BreadboardApp` class (`DragState` interface)
- Mouse event handlers (mousedown, mousemove, mouseup) manage drag lifecycle
- Position calculation with snap-to-grid (converts pixels to grid coordinates)
- Collision detection checks all pins against existing components
- Component renderer supports optional drag state to render ghost preview
- CSS classes for preview styling (`.component-preview`, `.component-preview-valid`, `.component-preview-invalid`)

**Event handling**:
- Component SVG groups have pointer events enabled (`pointer-events: auto`)
- Components have cursor: pointer styling for interactivity
- Mousedown on component initiates drag operation
- Mousemove during drag updates ghost preview position with snap-to-grid
- Mouseup completes drag and updates component position (or cancels if invalid)
- Keyboard event listener bound to document for Delete/Backspace and Escape keys
- Escape key cancels active drag operation
- Property editor input listeners attached dynamically when component selected
- Event cleanup via `destroy()` method prevents memory leaks (includes debounce timer cleanup)

### Component Rotation

**Rotation system**: After placing and selecting a component, users can rotate it 90° clockwise using the R key, with validation to prevent invalid orientations.

**Rotation interaction**:
1. Select a component (click on it)
2. Press R or r key to rotate 90° clockwise
3. Rotation cycles through four orientations: 0° → 90° → 180° → 270° → 0°
4. Invalid rotations are prevented (component retains current orientation)

**Visual rendering**:
- SVG `transform` attribute applies rotation around component center
- All component types render correctly at all rotation angles
- Polarity indicators (LED, power supply) rotate with component
- Component selection persists after rotation

**Position validation**:
- All component pins must align to valid breadboard holes after rotation
- No collision with existing components (pins cannot occupy same holes)
- Out-of-bounds rotations are prevented
- Invalid rotations fail silently (no error message, component unchanged)

**Circuit integration**:
- Pin positions recalculated using 2D rotation matrix transformation
- Circuit automatically re-extracts after successful rotation
- Simulation re-runs with new topology
- Voltage overlay and current animation update to reflect new orientation

**Implementation details**:
- Rotation stored as component property (`rotation: 0 | 90 | 180 | 270`)
- Rotation transform calculated using standard 2D rotation formulas:
  - 90° clockwise: (x, y) → (y, -x)
  - 180°: (x, y) → (-x, -y)  
  - 270° clockwise: (x, y) → (-y, x)
- Rotation applied around component center (midpoint between pins)
- Single-position components (ground) can rotate without position change
- Keyboard handler prevents rotation during active drag operation

**Supported components**:
- All component types support rotation (wire, resistor, LED, power supply, ground)
- Rotation state defaults to 0° for newly placed components
- Rotation state persists with component until deletion

### Component Property Editor

**Property editing system**: When a component is selected, a property editor panel displays in the info panel, allowing users to modify component-specific values.

**Editable component types**:
- **Resistor**: Resistance value (Ω) with validation (must be > 0)
- **LED**: Forward voltage (V) with validation (range: 0.1-5V)
- **Power Supply**: Voltage (V) with validation (range: 1-20V)
- **Wire/Ground**: No editable properties (property editor hidden)

**Preset values**: Quick-select buttons for common values:
- Resistor presets: 100Ω, 1kΩ, 10kΩ, 100kΩ
- LED presets: 1.8V (Infrared), 2.0V (Red), 2.2V (Yellow), 3.0V (Blue)
- Power supply presets: 3.3V, 5V, 9V, 12V

**Input validation**:
- Real-time validation on input change
- Error messages displayed for invalid values (negative resistance, out-of-range voltages)
- Invalid inputs show red border and error text
- Preset buttons bypass validation (always valid values)

**Update behavior**:
- Component metadata updated in-place on valid input
- Debounced re-render (300ms delay) prevents excessive updates during typing
- Circuit re-extraction and simulation triggered automatically after debounce
- Voltage heatmap and current animation reflect new values immediately
- Component list displays updated values with smart formatting (e.g., "10kΩ" for 10000Ω)

**UI characteristics**:
- Property editor appears below component list when component selected
- Editor hidden when component deselected or deleted
- Class-based selectors (`.property-error`) avoid ID conflicts
- Preset button handlers scoped to `.property-editor` container
- Debounce timer cleaned up in `destroy()` method

### Limitations

- No undo/redo
- No save/load functionality
- No multi-select or bulk operations
- No error highlighting for invalid placements (only for property values)
- No visual rotation handle (keyboard R key only)

---

## Circuit Extraction

### Algorithm

Implements circuit graph extraction using union-find algorithm:

1. Initialize union-find with all breadboard positions
2. Connect positions within terminal strips (breadboard's internal connections)
3. Group positions into electrical nodes based on connectivity
4. Create circuit edges from components that span different nodes

### Output

Produces a `Circuit` object containing:
- **Nodes**: Map of node IDs to `CircuitNode` objects (each node contains its connected positions)
- **Edges**: Array of `CircuitEdge` objects (each edge represents a component connecting two nodes)

### Edge Creation Rules

- Components create edges only when they connect different electrical nodes
- Components placed within the same terminal strip do NOT create edges (already connected)
- Each component becomes exactly 0 or 1 edge

### Implementation

- Defined in `CircuitExtractor` class (`src/core/circuit-extractor.ts`)
- Extracts circuits from `BreadboardState` (list of components)
- Uses internal `UnionFind` class for connectivity analysis

---

## Circuit Simulation

### Solver Type

Modified Nodal Analysis (MNA) solver for DC circuits.

### Algorithm

Implements industry-standard Modified Nodal Analysis technique:

1. **Circuit analysis phase**:
   - Identify ground nodes (from GROUND components) as reference (0V)
   - Identify voltage sources (from POWER_SUPPLY components)
   - Build node-to-index mapping (excluding ground nodes)

2. **Matrix construction phase** (MNA stamp method):
   - Build conductance matrix **G** (size: n_nodes + n_voltage_sources)
   - Build current vector **i**
   - For resistive components (resistors, wires, LEDs):
     - Add conductance values (G = 1/R) to matrix diagonal/off-diagonal
   - For voltage sources:
     - Add constraint equations to enforce voltage difference
     - Add current variables for voltage source currents

3. **Solver phase**:
   - Solve linear system **G × v = i** using Gaussian elimination with partial pivoting
   - Extract node voltages from solution vector
   - Detect singular matrices (short circuits) via pivot threshold check

4. **Current calculation phase**:
   - Calculate edge currents using Ohm's law: I = (V₁ - V₂) / R
   - Extract voltage source currents from MNA solution vector

### Component Models

- **Resistor**: Pure conductance (G = 1/R) using Ohm's law
- **Wire**: Very high conductance (G = 100 S, equivalent to 0.01Ω)
- **LED**: Simplified model (treated as 100Ω resistor; forward voltage model deferred)
- **Power Supply**: Ideal voltage source with current variable
- **Ground**: Reference node (0V)

### Capabilities

- **DC operating point analysis** for resistive circuits with voltage sources
- **Parallel circuit support**: Handles multiple current paths correctly
- **Voltage dividers with loads**: Correctly computes voltages in branching circuits
- **Multiple voltage sources**: Supports circuits with multiple power supplies
- **Node voltage calculation**: Solves for voltages at all circuit nodes
- **Edge current calculation**: Computes current through each component
- **Matrix singularity detection**: Detects and reports short circuit conditions
- **Missing ground detection**: Validates circuit has at least one ground connection
- **Success/failure status reporting**: Returns detailed error messages on failure

### Limitations

- **Simplified LED model**: Treated as 100Ω resistor (no forward voltage drop or reverse bias modeling)
- **No nonlinear components**: Only linear resistive elements supported
- **No AC analysis**: DC steady-state only
- **No transient analysis**: No capacitors or inductors supported
- **No convergence iterations**: Linear solver only (no Newton-Raphson for nonlinear elements)

### Output

Returns a `SimulationResult` containing:
- `success`: Boolean flag
- `error`: Error message (if failed)
- `nodeVoltages`: Map of node IDs to voltage values
- `edgeCurrents`: Map of edge IDs to current values

### Implementation

- Defined in `CircuitSimulator` class (`src/core/circuit-simulator.ts`)
- Simulates `Circuit` objects (not directly from breadboard state)

---

## Voltage Visualization

### Real-Time Voltage Overlay

The system displays voltage levels on the breadboard using color-coded overlays tied directly to simulation results.

**Visual feedback**:
- All holes in the same electrical net display the same voltage-based color
- Colors update automatically after component placement
- Semi-transparent background overlays on hole elements

**Color mapping**:
- Color-blind friendly gradient: 0V (dark blue) → 1.25V (cyan) → 2.5V (yellow) → 3.75V (orange) → 5V (red)
- Linear interpolation between color stops for smooth gradients
- Voltage values are clamped to 0-5V range

**Hover tooltips**:
- Mouse hover on any hole displays exact voltage value
- Formatted description includes voltage and qualitative level (e.g., "2.50V (mid)")
- Tooltip follows mouse cursor position
- Only shown when simulation is successful

### Implementation Details

**Voltage-to-color mapping** (`src/ui/voltage-colors.ts`):
- `voltageToColor()`: Converts voltage to RGB color string with description
- `voltageToClass()`: Alternative CSS class-based mapping for pattern-based fallback
- 13 unit tests covering edge cases, interpolation, and clamping

**Rendering approach**:
- Position-to-node mapping extracts which circuit node each hole belongs to
- Voltage overlay applied during breadboard rendering
- Cached circuit/simulation results avoid redundant computation on hover
- Inline CSS styles for colors (not CSS classes)

### Constraints

- Only displays voltages when simulation succeeds
- Color scheme assumes 0-5V range (voltages outside are clamped)
- Requires successful circuit extraction and simulation

---

## Current Flow Visualization

### Animated Current Flow

The system visualizes current flow through circuit components using animated particles that move along wires and through components, providing real-time feedback on current direction and magnitude.

**Visual feedback**:
- Animated blue particles flow along wires and through components
- Particles appear automatically when simulation succeeds and current exceeds threshold (1µA)
- Particle movement shows current direction (from higher voltage to lower voltage)
- Particle speed and density indicate current magnitude
- Animation runs at 60fps using `requestAnimationFrame`

**Visual characteristics**:
- Particle size: 3px diameter circles
- Current threshold: 1µA minimum (filters out negligible currents)
- Animation wraps around (particles reappear at start when reaching end)

**Current magnitude visualization**:
- **Low current (< 1mA)**: 
  - Faint blue color: `rgba(0, 100, 255, 0.4)`
  - Slow speed: 0.15 units/second
  - 1 particle per edge
- **Medium current (1-10mA)**:
  - Medium blue color: `rgba(0, 150, 255, 0.7)`
  - Medium speed: 0.3 units/second
  - 3 particles per edge
- **High current (> 10mA)**:
  - Bright blue color: `rgba(0, 200, 255, 1.0)`
  - Fast speed: 0.6 units/second
  - 5 particles per edge

**Current direction handling**:
- Positive current: particles flow from first position to second position
- Negative current: particles flow in reverse direction (second to first)
- Direction automatically determined from MNA solver output

**Path rendering**:
- **Wires**: Manhattan routing (orthogonal path with 3 segments)
- **Other components**: Straight line from start to end position
- Coordinates calculated from breadboard grid positions using shared layout constants

### Implementation Details

**Current animator** (`src/ui/current-animator.ts`, 426 lines):
- `CurrentAnimator` class manages particle lifecycle and animation
- `start()`: Initializes animation with simulation results and components
- `stop()`: Cleans up animation and removes particles
- `animate()`: Animation loop using `requestAnimationFrame`
- Private methods for particle creation, path building, position calculation

**Particle system**:
- Each particle tracks: edge ID, progress (0-1), speed, brightness, color
- Particles update position based on elapsed time (delta time)
- Progress wraps to create continuous flow effect
- Particle count, speed, and visual properties scale with current magnitude

**Integration** (`src/ui/breadboard-app.ts`):
- `CurrentAnimator` instance created with application
- Animation starts automatically after successful simulation
- Animation stops automatically on circuit changes or simulation failure
- Particles render into same SVG container as component overlays

**Testing** (`src/ui/__tests__/current-animator.test.ts`, 11 tests):
- Current threshold filtering (particles only appear above 1µA)
- Magnitude scaling (more particles and faster speed for higher current)
- Component type support (wire, resistor, LED)
- Edge cases (zero current, negative current, empty components)
- Start/stop lifecycle management

### Constraints

- Only displays current when simulation succeeds
- Current must exceed 1µA threshold to display particles
- No customization of particle appearance (size, color scheme fixed)
- Animation performance not tested with very large circuits (>100 components)
- Particles do not show exact current values (magnitude indicated through speed/density only)

---

## Error Detection and Explain Panel

### Automated Error Detection

The system automatically detects and categorizes five types of common circuit errors during simulation, providing visual feedback and educational explanations to help users understand and fix problems.

**Error types detected:**

1. **Short Circuit** - Power supply delivering excessive current (>10A), indicating near-zero resistance path from power to ground
2. **Floating Node** - Nodes not connected to power or ground with no current flow
3. **Reversed LED** - LED with negative current (connected backwards, blocking current)
4. **Open Circuit** - LED with voltage across terminals but no current flow
5. **Overcurrent** - LED current exceeding 1.5× its maximum rated current

**Error detection algorithm:**
- Runs automatically after circuit simulation completes
- Analyzes simulation results (node voltages, edge currents, component types)
- Detects errors using heuristic rules and threshold checks
- Categorizes errors by severity: "error" (critical) or "warning" (advisory)
- Each error includes:
  - Type and severity classification
  - Affected node/component IDs
  - Breadboard positions to highlight
  - Short message describing the problem
  - Educational explanation of why it's wrong
  - Actionable fix suggestions (3-5 steps)

### Visual Error Overlays

Error icons render automatically on the breadboard SVG overlay at problem locations, making errors immediately visible and interactive.

**Visual characteristics:**
- **Short circuits**: Red circle with white ✕ symbol
- **Floating nodes**: Orange circle with white ? symbol
- **Reversed LEDs**: Yellow circle with white ! symbol
- **Open circuits**: Yellow circle with white ⚠ symbol
- **Overcurrent warnings**: Orange circle with white ! symbol

**Interactive features:**
- Error icons are clickable to open Explain panel with details
- Hover effects: icon grows from 8px to 10px radius on hover
- Drop shadow effect increases on hover for visual feedback
- Icons positioned at center of error location (average of all affected positions)
- Cursor changes to pointer on hover
- White stroke (2px) around colored background for visibility

**Rendering behavior:**
- Error overlay renders above breadboard holes but below component overlay
- Icons update automatically when circuit changes or simulation re-runs
- Multiple errors can be displayed simultaneously
- Error overlay clears when no errors are present
- Icons remain clickable even when other interactions are active

### Explain Panel UI

Interactive side panel that provides contextual explanations about circuit behavior, including technical details and educational content.

**Panel structure:**
- Slide-in panel from right side of screen
- Header with "Circuit Explanation" title and close button (✕)
- Content area that changes based on what was clicked
- Initially hidden until triggered by user interaction
- Close button and background click dismiss the panel

**Three content modes:**

1. **Error Explanations** (click error icon):
   - Error title with emoji indicator (⚠️)
   - "What's happening" section with educational explanation
   - "How to fix it" section with bulleted action steps
   - Specific, actionable suggestions tailored to error type
   - Example: For reversed LED, suggests rotating 180° and explains polarity

2. **Node Information** (click breadboard hole/net):
   - Net voltage display (formatted to 3 decimal places)
   - List of connected components with current flow direction
   - Current values for each component (in mA)
   - Educational explanation of voltage level:
     - Ground nodes (0V): Explained as reference point
     - Power nodes (>4V): Explained as power supply connection
     - Intermediate voltages: Voltage divider or voltage drop explanation
   - Context-aware content based on connected component types

3. **Component Details** (click rendered component):
   - Component name and key specifications
   - Terminal voltage readings (both terminals + voltage across)
   - Current flow magnitude and direction (→ or ←)
   - Power dissipation (in mW)
   - Component-specific explanations:
     - **Resistor**: Ohm's Law explanation with actual values
     - **LED**: Operating status, polarity check, overcurrent warning
     - **Power Supply**: Output voltage and power delivery
   - Role in circuit explanation with educational context

**Educational content features:**
- Circuit theory concepts explained in accessible language
- Ohm's Law (V = IR) referenced with actual circuit values
- Voltage divider principles explained when relevant
- LED polarity and current limiting concepts
- Power calculation (P = V × I) with real measurements
- Warning messages for unsafe operating conditions
- Troubleshooting hints for zero-current scenarios

**UI/UX characteristics:**
- Slide-in animation with CSS transitions
- Responsive design adapts to screen size
- Readable typography with clear hierarchy (h4, h5, p elements)
- Color-coded sections for different information types
- Emoji indicators for visual scanning (⚡ for nets, 🔌 for components, ⚠️ for errors)
- Close button always visible in header
- Panel overlay does not block breadboard interactions
- Clicking another element updates panel content without closing

### Integration Points

**Circuit simulator integration:**
- `SimulationResult` interface extended with `errors: CircuitError[]` array
- `CircuitError` interface defined in `types.ts` with all error metadata
- `ErrorType` enum defines five error categories
- Error detection runs after successful simulation (after voltage/current calculation)
- Errors returned even when simulation succeeds (non-blocking)

**UI integration:**
- `ErrorOverlayRenderer` instance created in `BreadboardApp`
- `ExplainPanel` instance created and initialized with DOM container
- Error icons render into same SVG as component overlay
- Click handlers attached to error icons, components, and holes
- Panel receives circuit data (Circuit, SimulationResult, components) on each update
- Error overlay updates automatically when circuit changes

**Event handling:**
- Error icon clicks: Extract error data from SVG dataset attributes, open panel with error content
- Component clicks: Find component by ID, open panel with component content
- Hole clicks: Map position to node ID, open panel with node content
- Close button click: Hide panel with slide-out animation
- Background clicks: Can deselect but does not auto-close panel (user must explicitly close)

### Implementation Details

**Files added:**
- `src/ui/error-overlay-renderer.ts` (140 lines): Error icon SVG rendering
- `src/ui/explain-panel.ts` (370 lines): Panel UI and content generation

**Files modified:**
- `src/core/types.ts`: Added `ErrorType` enum and `CircuitError` interface
- `src/core/circuit-simulator.ts`: Added `detectErrors()` method (155 lines of error detection logic)
- `src/ui/breadboard-app.ts`: Integrated error overlay and explain panel
- `src/style.css`: Added styles for error icons and explain panel (`.error-icon`, `.explain-panel`, etc.)

**Error detection logic:**
- Short circuit: Checks if voltage source current exceeds 10A threshold
- Floating node: Node with <0.1V, no current flow, and no power/ground connections
- Reversed LED: LED with negative current (current < -1µA)
- Open circuit: LED with >1V across terminals but <1µA current
- Overcurrent: LED current exceeds 1.5× `maxCurrent` property

**Explain panel content generation:**
- Separate private methods for each content type (`generateErrorContent`, `generateNodeContent`, `generateComponentContent`)
- Context-aware heuristics for generating explanations
- Component role analysis based on circuit topology
- Educational content insertion using template literals
- Safe handling of missing data (checks for null circuit/simulation)

### Constraints

- Error detection runs only after successful simulation (not on simulation failure)
- Limited to five predefined error types (not extensible without code changes)
- Error positions calculated as average center (may not align perfectly with visual component location)
- Explain panel content is generated on-demand (not cached)
- No persistence of panel state across circuit changes
- Panel does not auto-open on error detection (user must click icon)
- Educational content is English-only (no localization)
- No keyboard navigation for error icons (mouse/touch only)

---

## Component Visual Rendering

### SVG-Based Component Rendering

The system displays all placed components with distinctive visual representations on the breadboard using SVG overlays.

**Visual representations**:
- **Power supply**: Blue battery rectangle with +/- symbols and voltage label (e.g., "5V")
- **Resistor**: Tan rectangle with resistance value label and connection leads (displays "100Ω" for values < 1kΩ, "1kΩ" for values ≥ 1kΩ)
- **LED**: Red circle with "+" polarity indicator and cathode marker (flat side)
- **Ground**: Standard ground symbol (three horizontal lines of decreasing width)
- **Wire**: Colored path with Manhattan routing (orthogonal lines) and connection dots at endpoints

**Wire color cycling**:
- Wires cycle through 8 distinct colors: red, black, yellow, green, blue, orange, white, purple
- Color assignment resets on each render for consistency
- Each wire gets the next color in the sequence

**Rendering characteristics**:
- Components render automatically after placement
- SVG overlay positioned absolutely over breadboard grid
- Components render in layered order: wires first (behind), then other components
- Visual representations use geometric shapes with text labels (no proprietary graphics)
- Components have pointer events enabled (`pointer-events: auto`) for selection interaction
- Components display cursor: pointer styling when hovered
- Selected component displays blue drop-shadow filter for visual feedback
- Components display above breadboard grid but below voltage overlay

**Coordinate mapping**:
- Grid positions (row, col) map to pixel coordinates for SVG rendering
- Hole spacing: 26px per hole (20px hole size + 6px total margin)
- Breadboard dimensions: 520px width (10 columns) × 780px height (30 rows)

### Implementation Details

**Component renderer** (`src/ui/component-renderer.ts`):
- `ComponentRenderer` class handles all visual rendering logic
- `renderComponents()`: Creates SVG element with all component visuals, accepts optional `selectedComponentId` parameter
- Individual render methods for each component type (wire, resistor, LED, power supply, ground)
- Position-to-pixel coordinate conversion
- Smart resistance value formatting
- Selection rendering: adds `.component-selected` CSS class to selected component

**Integration** (`src/ui/breadboard-app.ts`):
- Component overlay renders after breadboard grid creation
- Re-renders automatically on state changes (component placement, deletion, selection, clear all)
- SVG dimensions calculated based on breadboard size
- Existing component overlay removed before re-rendering
- Component click event handlers attached after render for selection
- Keyboard event listener for Delete/Backspace keys
- `destroy()` method for event cleanup

**Styling** (`src/style.css`):
- `.component-overlay`: Absolute positioning with z-index 10
- `.component`: Base component styling with opacity transition
- `.component-selected`: Blue drop-shadow filter for selection feedback
- Breadboard container has `position: relative` for overlay positioning

### Constraints

- No drag-and-drop of rendered components (placement uses two-click interaction)
- No animation of component placement (instant rendering)
- Visual representations are simplified geometric shapes, not photorealistic
- Wire routing is orthogonal (Manhattan style), not customizable by user
- Single component selection only (no multi-select)

---

## Information Display

### Circuit Info Panel

Displays the following statistics:

1. **Components**: Total count of placed components
2. **Nodes**: Total number of electrical nodes (from circuit extraction)
3. **Connections**: Number of circuit edges (components connecting different nodes)
4. **Simulation**: Status indicator (✓ Success or ✗ Failed)
5. **Component List**: Details of each placed component with type and key parameters

### Update Behavior

- Info panel updates automatically after each component placement
- Circuit extraction and simulation run on every render
- No manual refresh required

### Data Displayed

Component details shown:
- **Resistor**: Resistance value
- **LED**: Forward voltage
- **Power Supply**: Voltage
- **Wire**: Resistance
- **Ground**: "GND" label

---

## Architecture

### Code Organization

```
src/
├── core/                          # Domain logic (framework-independent)
│   ├── types.ts                   # Type definitions
│   ├── breadboard-layout.ts       # Breadboard connectivity model
│   ├── circuit-extractor.ts       # Circuit graph extraction
│   ├── circuit-simulator.ts       # Circuit simulation
│   └── __tests__/                 # Unit tests
│       ├── breadboard-layout.test.ts
│       └── circuit-extractor.test.ts
├── ui/                            # Presentation layer
│   └── breadboard-app.ts          # Main UI application class
├── main.ts                        # Application entry point
└── style.css                      # Styles
```

### Layer Separation

- **Core layer**: Pure TypeScript logic with no UI dependencies
  - Can be tested in isolation
  - Can be used in Node.js or browser environments
  - All types are in `types.ts`
  
- **UI layer**: Manages DOM rendering and user interactions
  - Depends on core layer
  - Uses vanilla JavaScript (no framework)
  - Single application class (`BreadboardApp`)

### State Management

- Application state stored in `BreadboardState` object
- State contains:
  - `components`: Flat array of `AnyComponent` objects
  - `selectedComponentId`: ID of currently selected component (string | null)
- No immutable state pattern (components array is mutated)
- Selection state tracks single selected component
- No state history for undo/redo

### Rendering Strategy

- Full re-render on every state change
- Breadboard grid recreated from scratch
- No virtual DOM or differential updates
- Circuit extraction and simulation run on every render

---

## Build System

### Technology Stack

- **Language**: TypeScript 5.3
- **Build tool**: Vite 7.3
- **Test framework**: Vitest 4.0
- **Linter**: ESLint 8.55
- **Formatter**: Prettier 3.1
- **Test environment**: jsdom 27.4

### Available Commands

```bash
npm run dev       # Start development server (port 5173)
npm run build     # TypeScript compilation + Vite production build
npm run preview   # Preview production build
npm test          # Run unit tests
npm run test:ui   # Run tests with Vitest UI
npm run lint      # Run ESLint
npm run format    # Run Prettier
```

### Build Output

- Output directory: `dist/`
- Build time: ~150ms (as of last build)
- Generated files:
  - `index.html`: Entry point
  - `assets/index-*.css`: Bundled styles (~2.5KB)
  - `assets/index-*.js`: Bundled JavaScript (~9.3KB)
- No external runtime dependencies in production bundle

### Configuration

- **TypeScript**: Strict mode enabled, ES2020 target
- **Vite**: Path alias `@` → `./src`
- **Vitest**: Global test APIs, jsdom environment

---

## Testing

### Test Coverage

Eight test suites with 95 passing tests:

1. **breadboard-layout.test.ts** (9 tests)
   - Position validity checking
   - Terminal strip connectivity
   - Connected position enumeration

2. **circuit-extractor.test.ts** (4 tests)
   - Empty circuit extraction
   - Wire edge creation across nodes
   - Same-node component handling
   - Multiple component extraction

3. **circuit-simulator.test.ts** (12 tests)
   - Basic circuits (ground only, simple series, voltage divider)
   - Parallel circuits (two parallel resistors, voltage divider with parallel load, complex networks)
   - Wire handling (low resistance validation)
   - LED handling (series resistor model)
   - Error cases (missing ground, short circuit detection)
   - Multiple voltage sources
   - Current calculations through parallel branches
   - Note: Error detection logic validated through integration but not yet unit tested

4. **voltage-colors.test.ts** (13 tests)
   - Color gradient mapping at key voltage stops (0V, 1.25V, 2.5V, 3.75V, 5V)
   - Linear interpolation between color stops
   - Voltage clamping (negative and above 5V)
   - CSS class mapping for pattern-based alternatives

5. **component-renderer.test.ts** (9 tests)
   - SVG element creation
   - Individual component rendering (wire, resistor, LED, power supply, ground)
   - Multiple component rendering
   - Component layering (wires render before other components)
   - Wire color cycling and reset behavior

6. **current-animator.test.ts** (11 tests)
   - Start/stop lifecycle management
   - Current threshold filtering (1µA minimum)
   - Particle creation for currents above threshold
   - Current magnitude scaling (particle count and speed)
   - Component type support (wire, resistor, LED)
   - Edge cases (zero current, negative current, empty components, failed simulation)

7. **breadboard-app.test.ts** (25 tests) — **Updated in PR #107**
   - Component initialization
   - Component selection (click to select)
   - Component deselection (background click)
   - Deletion via Delete key
   - Deletion via Backspace key
   - Circuit simulation updates after deletion
   - No deletion when nothing selected
   - Multiple component selection handling
   - **Drag-and-drop repositioning** (5 tests):
     - Drag operation initiation on mousedown
     - Ghost preview display during drag
     - Component position update on successful drop
     - Drag cancellation via Escape key
     - Component selection persistence after drag
   - **Component rotation** (12 new tests in PR #107):
     - Rotation via R key press
     - Cycling through all four rotation angles (0°, 90°, 180°, 270°)
     - SVG rotation transform application
     - No rotation when no component selected
     - No rotation during drag operation
     - Lowercase r key support
     - Out-of-bounds rotation prevention
     - Circuit simulation updates after rotation
     - Rotation for all component types (LED, power supply, wire, resistor, ground)

8. **property-editor.test.ts** (12 tests) — **New in PR #95**
   - Property editor visibility toggle (shown when component selected, hidden otherwise)
   - Type-specific field rendering (resistor, LED, power supply)
   - Input value updates with debounce wait (resistance, voltage, forward voltage)
   - Preset button behavior (applies preset values)
   - Validation error handling (invalid values)
   - Component type filtering (wire and ground have no property editor)
   - Preset button counts for different component types

### Testing Approach

- Unit tests for core logic
- UI interaction tests for component selection, deletion, and drag-and-drop repositioning
- No end-to-end tests
- Tests use Vitest with jsdom environment

### Coverage Gaps

- No tests for component placement logic
- No integration tests for voltage overlay rendering behavior
- No integration tests for component rendering with voltage overlays
- No integration tests for current animation with full circuit simulation
- No integration tests for property editor behavior with circuit simulation
- No unit tests for error detection heuristics (detection logic validated through integration only)
- No unit tests for error overlay rendering
- No unit tests for explain panel content generation
- No UI/end-to-end tests

### Test Execution

- All 95 tests pass
- Test duration: Fast execution (typically < 300ms, including async debounce waits)
- No flaky tests observed

---

## Constraints and Assumptions

### Fixed Values

- Breadboard dimensions are fixed (30×10)
- Component default values (can be changed after placement via property editor):
  - Resistors default to 1kΩ
  - Power supplies default to 5V
  - LEDs default to 2V forward voltage
- Wire resistance is fixed at 0.01Ω (not configurable)

### Single-User Local Application

- No server component
- No authentication or user accounts
- No data persistence (state is lost on page reload)
- No cloud storage or sync

### Browser-Only

- Requires modern browser with JavaScript enabled
- No mobile app
- No desktop application
- No offline capability beyond browser cache

### Performance Characteristics

- Full re-render on every interaction
- Circuit extraction runs O(n log n) where n = number of positions (~300)
- Simulation runs O(p) where p = number of paths (typically 0-1)
- No observed performance issues with current scale

---

## Known Limitations

### Functional

1. **No persistence**: No save/load functionality
2. **No undo/redo**: No operation history
3. **No multi-select**: Can only select one component at a time
4. **No copy/paste**: Cannot duplicate components
5. **Limited error types**: Only five predefined error categories detected

### Simulation Accuracy

1. **Simplified LED model**: Treated as 100Ω resistor; not physically accurate (no forward voltage drop or reverse bias)
2. **No diode behavior**: LEDs don't model forward/reverse bias correctly
3. **No component limits**: No overcurrent or overvoltage protection warnings
4. **Linear circuits only**: No support for nonlinear components beyond simplified LED model

### User Experience

1. **No visual feedback during initial placement**: No preview shown during two-click component placement (preview only available when repositioning)
2. **No validation feedback for invalid rotations**: Silent failure when rotation would be invalid (no error message)
3. **Limited keyboard shortcuts**: Delete/Backspace for deletion, R for rotation, Escape for canceling drag
4. **No keyboard navigation for error icons**: Error icons require mouse/touch interaction (not keyboard accessible)

---

## Dependencies

### Runtime Dependencies

**None** - The production bundle has zero runtime dependencies.

### Development Dependencies

Core development tools:
- `typescript` (5.3.0): Type checking and compilation
- `vite` (7.3.0): Build tool and dev server
- `vitest` (4.0.16): Test framework
- `@vitest/ui` (4.0.16): Test UI
- `eslint` (8.55.0): Linting
- `@typescript-eslint/*` (6.13.0): TypeScript ESLint rules
- `prettier` (3.1.0): Code formatting
- `jsdom` (27.4.0): DOM implementation for tests
- `@types/node` (20.10.0): Node.js type definitions

All dependencies are dev-only; the final bundle is pure TypeScript/JavaScript.

---

## File Inventory

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/core/types.ts` | 150 | Type definitions including ErrorType enum and CircuitError interface |
| `src/core/breadboard-layout.ts` | 84 | Breadboard connectivity logic |
| `src/core/circuit-extractor.ts` | 144 | Circuit graph extraction with union-find |
| `src/core/circuit-simulator.ts` | 528 | DC circuit simulation using MNA and error detection (5 error types) |
| `src/ui/breadboard-app.ts` | 1172 | Main UI application class with selection/deletion, rotation, property editor, and drag-and-drop |
| `src/ui/voltage-colors.ts` | 82 | Voltage-to-color mapping utilities |
| `src/ui/component-renderer.ts` | 568 | SVG-based visual component rendering with rotation transform support |
| `src/ui/current-animator.ts` | 426 | Animated current flow visualization using particles |
| `src/ui/error-overlay-renderer.ts` | 140 | Error icon SVG rendering with hover effects |
| `src/ui/explain-panel.ts` | 370 | Contextual explanation panel with educational content |
| `src/main.ts` | 11 | Application entry point |
| `src/style.css` | 346 | Application styles (includes error icons and explain panel styling) |

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `src/core/__tests__/breadboard-layout.test.ts` | 9 | Breadboard connectivity tests |
| `src/core/__tests__/circuit-extractor.test.ts` | 4 | Circuit extraction tests |
| `src/core/__tests__/circuit-simulator.test.ts` | 12 | Circuit simulation tests (MNA solver) |
| `src/ui/__tests__/voltage-colors.test.ts` | 13 | Voltage-to-color mapping tests |
| `src/ui/__tests__/component-renderer.test.ts` | 9 | Component visual rendering tests |
| `src/ui/__tests__/current-animator.test.ts` | 11 | Current animation tests (particle system, magnitude scaling) |
| `src/ui/__tests__/breadboard-app.test.ts` | 25 | Component selection, deletion, rotation, and drag-and-drop interaction tests (PR #89, PR #101, PR #107) |
| `src/ui/__tests__/property-editor.test.ts` | 12 | Property editor tests (visibility, editing, presets, validation) (PR #95) |

### Configuration Files

- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript compiler configuration
- `tsconfig.node.json`: TypeScript config for build tools
- `vite.config.ts`: Vite build configuration
- `.eslintrc.json`: ESLint rules
- `.prettierrc.json`: Prettier formatting rules
- `index.html`: HTML entry point

### Documentation Files

- `README.md`: Project overview and usage instructions
- `ARCHITECTURE.md`: Architecture documentation
- `LICENSE`: MIT license
- `planning/vision/goal.md`: Comprehensive planning document (vision, not capabilities)

---

## What the System Does NOT Do

For clarity, these capabilities are explicitly **not present**:

- ❌ PCB layout or design
- ❌ Schematic editor (separate from breadboard view)
- ❌ Component library customization
- ❌ Import/export circuits
- ❌ Microcontroller simulation
- ❌ Advanced circuit analysis (AC, transient, frequency response)
- ❌ Touch/mobile gestures
- ❌ Collaboration or multi-user features
- ❌ Data persistence or cloud storage
- ❌ Component libraries or part databases
- ❌ 3D visualization
- ❌ Embedded firmware simulation
- ❌ SPICE netlist import/export
- ❌ Auto-fix for detected errors (user must manually fix)

---

## Verification

This document describes the system as observed on 2026-01-03 after merging PR #113:

- ✅ All source files examined
- ✅ Tests executed successfully (95/95 passing)
- ✅ Build completed successfully
- ✅ No code modifications made during documentation
- ✅ Component capabilities verified against source code
- ✅ Circuit extraction algorithm verified
- ✅ Circuit simulation algorithm verified (MNA implementation)
- ✅ UI capabilities verified from BreadboardApp source
- ✅ Voltage visualization capabilities verified from PR #12 changes
- ✅ Component visual rendering capabilities verified from PR #71 changes
- ✅ MNA solver capabilities verified from PR #77 changes
- ✅ Animated current flow visualization verified from PR #83 changes
- ✅ Component selection and deletion capabilities verified from PR #89 changes
- ✅ Component property editing capabilities verified from PR #95 changes
- ✅ Component drag-and-drop repositioning capabilities verified from PR #101 changes
- ✅ Component rotation capabilities verified from PR #107 changes
- ✅ Error detection system verified from PR #113 changes
- ✅ Error overlay rendering verified from PR #113 changes
- ✅ Explain panel capabilities verified from PR #113 changes

This is a snapshot of reality, not aspirations or plans.
