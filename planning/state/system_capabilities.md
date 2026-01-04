# Current System Capabilities of Breadboard Lab

**Date**: 2026-01-04  
**Purpose**: Factual description of what the system demonstrably does today  
**Last Updated**: After implementing derived schematic view with force-directed layout (PR #161)

---

## Overview

Breadboard Lab is a web-based electronics simulator that provides a visual breadboard interface for placing components, extracting circuit topology, and performing basic circuit simulation. The system is built with TypeScript, uses Vite for building, and runs entirely in the browser with zero runtime dependencies.

---

## Component Library

### Component Selection via Library Browser Modal

The UI provides access to all 35 real-world components through a searchable component library browser modal. Users open the browser by clicking the "📦 Component Library" button in the left toolbar.

**Component library browser features:**
- **Search functionality**: Real-time text search by component name, description, or part number using `componentLibrary.search()`
- **Category filtering**: Filter components by category (Passive Components, Diodes & LEDs, Power Supplies, Wires & Connectors, Audio Components, Virtual Components)
- **Component cards**: Grid layout displaying each component with:
  - Component name and category emoji indicator
  - Key electrical specifications (resistance, voltage, current ratings, tolerance, power rating)
  - Package information (package type and pin count)
  - Component description
  - Manufacturer part number (when available)
- **Combined filtering**: Search and category filters work together to narrow results
- **Visual feedback**: Hover effects on component cards, clear button for search input
- **Keyboard accessible**: Search input auto-focused on open, modal closable via close button or overlay click

**Component selection workflow:**
1. Click "📦 Component Library" button in toolbar
2. Browse, search, or filter components in the modal
3. Click desired component card to select it
4. Modal closes automatically
5. Use standard two-click placement on breadboard

**Library integration:**
- Components placed from browser automatically populate `libraryId` field in component metadata
- Component properties (resistance, voltage, forward voltage) are sourced from library entry electrical specifications
- Backward compatible: existing circuits without `libraryId` continue working with manual property values
- Test compatibility: `selectComponentType()` public method available for programmatic component selection in tests

Component values can be edited after placement through the property editor panel. Property editor displays both the custom value and, for library-sourced components, the original library metadata.

### Component Library Infrastructure

**Status**: Fully integrated with UI (PR #143 foundation, PR #149 UI integration).

The system includes a complete component library infrastructure with 35 physically accurate, real-world components, now fully accessible through the UI via a searchable component browser modal.

**Core capabilities:**

1. **Data Model** (`ComponentLibraryEntry` interface in `src/core/types.ts`):
   - Physical specifications: package type, dimensions, pin configuration, lead spacing
   - Electrical characteristics: resistance, voltage, current ratings, tolerance, power ratings
   - Manufacturer metadata: manufacturer name, part family, part numbers (optional)
   - Educational metadata: description, typical uses
   - Visual rendering information: renderer type (procedural or SVG)
   - Component categories: passive, diode, transistor, ic, power, interconnect, electro-acoustic, virtual-educational

2. **Component Registry** (`src/core/component-library.ts`):
   - Global singleton registry (`componentLibrary`)
   - Registration of library entries with duplicate detection
   - Lookup by component ID: `get(id)`
   - Filter by category: `getByCategory(category)`
   - Text search across name, description, and part numbers: `search(query)`
   - Get all components: `getAll()`

3. **Library Catalog** (`src/library/`):
   - **Resistors** (23 entries): E12 series (100Ω-10kΩ), both 5% tolerance (4-band) and 1% tolerance (5-band) variants, 1/4W axial package, Yageo CFR Series
   - **LEDs** (4 entries):
     - 3mm Ultra-Bright Yellow LED (2.1V forward voltage, 590nm wavelength, T1 package) ✓ *Required by goal.md*
     - 5mm Red LED (1.9V, 625nm, T1-3/4 package)
     - 5mm Green LED (2.1V, 525nm, T1-3/4 package)
     - 5mm Blue LED (3.1V, 470nm, T1-3/4 package)
   - **Speaker** (1 entry): 8Ω breadboard module (0.5W, 300Hz-5kHz frequency response) ✓ *Required by goal.md*
   - **Power Supplies** (4 entries): 3.3V (1A), 5.0V (2A), 9.0V (1A), 12.0V (2A)
   - **Wires** (2 entries): 22 AWG solid core (red and black)
   - **Ground** (1 entry): Ground reference (0V)
   - Total: 35 real-world components with datasheet-accurate specifications

4. **Library Utilities** (`src/core/component-library-utils.ts`):
   - `findClosestResistor(resistance, tolerance)`: Find closest library resistor to a target value
   - `findClosestLED(forwardVoltage)`: Find closest library LED by forward voltage
   - `findPowerSupply(voltage)`: Find exact voltage match for power supply
   - `findDefaultWire()`: Get default library wire
   - `findGround()`: Get library ground reference
   - `getDefaultLibraryId(component)`: Map abstract components to library entries (backward compatibility)
   - `getComponentPropertiesFromLibrary(component)`: Extract electrical properties from library

**Backward compatibility:**

- Components now have an optional `libraryId` field (string | undefined)
- New components placed from browser automatically get `libraryId` populated
- Existing components without `libraryId` continue to work with existing behavior
- Utility functions enable gradual migration from abstract to library-based components
- All 217 tests pass (167 original + 50 new)
- Zero breaking changes
- Test framework uses programmatic `selectComponentType()` API instead of UI button clicks

**Integration points (fully implemented):**

- ✅ **Component browser modal**: Searchable modal with 35 components, category filtering, and detailed component cards (PR #149)
- **Library-aware rendering**: Size-accurate rendering based on library package dimensions (not yet implemented)
- **Tolerance-based resistor color bands**: 4-band for 5%, 5-band for 1% (implemented, not yet library-driven)
- **Property editor library metadata**: Display manufacturer/part metadata in property editor (not yet implemented)
- **Example circuit migration**: Migrate example circuits to use library parts (not yet implemented)

**Documentation:**

- `COMPONENT_LIBRARY.md`: Complete architecture guide, usage examples, integration strategy
- `IMPLEMENTATION_SUMMARY.md`: Design decisions and rationale
- `README.md`: Updated with library overview

**Educational value:**

The library transforms Breadboard Lab from an abstract circuit simulator into a practical electronics education tool. Students learn which specific parts to purchase (e.g., "220Ω 1/4W 5% Resistor (Brown-Red-Brown-Gold)" instead of "a resistor"), preparing them for real-world prototyping.

---

## Breadboard Model

### Physical Layout

- **Grid dimensions**: 30 rows × 14 columns (420 holes total)
- **Column arrangement**: 
  - 4 rail columns (0-1 left side, 12-13 right side)
  - 10 terminal strip columns (2-6 left side, 7-11 right side)
- **Row numbering**: 0-29 (zero-indexed)
- **Column numbering**: 0-13 (zero-indexed)

### Connectivity Rules

The breadboard models both power rails and terminal strip connectivity:

- **Power rails** (4 columns total):
  - **Left negative rail** (column 0): Blue-tinted, all 30 holes vertically connected
  - **Left positive rail** (column 1): Red-tinted, all 30 holes vertically connected
  - **Right positive rail** (column 12): Red-tinted, all 30 holes vertically connected
  - **Right negative rail** (column 13): Blue-tinted, all 30 holes vertically connected
  - Rails provide convenient power distribution for circuits
- **Left terminal strips**: Within each row, columns 2-6 are electrically connected
- **Right terminal strips**: Within each row, columns 7-11 are electrically connected
- **Center gap**: Left and right terminal strips are NOT connected (gap between columns 6 and 7)
- **Rail independence**: Each rail is separate; rails do not connect to terminal strips automatically

### Implementation

- Defined in `BreadboardLayout` class (`src/core/breadboard-layout.ts`)
- Provides methods to:
  - Check if positions are valid (now supports 14 columns)
  - Check if positions are internally connected (rails + strips)
  - Check if a position is in a rail (`isPositionInRail`)
  - Get rail information for a position (`getRailForPosition`)
  - Get all positions connected to a given position (handles both rails and strips)

---

## User Interface

### Layout

The UI consists of three panels:

1. **Left toolbar**: Single "📦 Component Library" button, Examples, Load, Save, and Clear All buttons
2. **Center workspace**: Breadboard grid visualization
3. **Right info panel**: Circuit statistics and component list

### Component Placement

**Interaction model**: Two-click placement with library browser selection

1. User clicks "📦 Component Library" button in toolbar
2. Component library browser modal opens showing all 35 components
3. User searches/filters and selects a specific component from the library
4. Modal closes and component type is selected
5. User clicks a breadboard hole (first position)
6. User clicks another breadboard hole (second position)
7. Component is created with both positions and `libraryId` populated

**Visual feedback**:
- Component library browser opens as centered modal with dark overlay
- Search input highlights with focus and displays clear button when text entered
- Category pills highlight active filter
- Component cards display hover effects (scale and shadow)
- Occupied holes display with "occupied" class
- Placed components render visually on the breadboard (power supplies, resistors, LEDs, ground symbols, and wires)
- Drag-and-drop with ghost preview for component repositioning
- Visual indicators for valid/invalid drop positions

### Available Operations

- **Browse component library**: Click "📦 Component Library" button to open searchable modal with 35 real-world components
- **Search components**: Filter by name, description, or part number in real-time
- **Filter by category**: Select category pills to filter components by type
- **Select component**: Click component card in browser to select for placement
- **Place component**: After selecting from library, click two holes to place component with automatic `libraryId` population
- **Select component**: Click on a rendered component to select it (visual feedback: blue drop-shadow)
- **Move component**: Click and drag selected component to reposition (ghost preview shows new position)
- **Rotate component**: Press R key to rotate selected component 90° clockwise (cycles through 0°, 90°, 180°, 270°)
- **Edit component values**: Select component to open property editor, modify values through text input or preset buttons
- **Delete component**: Press Delete or Backspace key to remove selected component
- **Deselect component**: Click breadboard background or another component
- **Enable audio output**: Click "🔇 Enable Sound" button or press M key to activate speaker audio
- **Disable audio output**: Click "🔊 Disable Sound" button or press M key to mute speaker audio
- **Adjust volume**: Use volume slider (0-100%) when audio enabled
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
- No multi-select or bulk operations
- No error highlighting for invalid placements (only for property values)
- No visual rotation handle (keyboard R key only)
- No circuit versioning or history
- No audio waveform visualization (oscilloscope/spectrum analyzer)

---

## Views

The system provides two complementary views of the circuit: breadboard view (physical placement) and schematic view (electrical abstraction). Users can switch between views using tab controls.

### View Switching Controls

**UI elements**:
- Two-tab view switcher in the left toolbar (below audio controls)
- **🔌 Breadboard** tab: Shows physical breadboard layout (default/active on load)
- **📐 Schematic** tab: Shows derived schematic diagram
- Active tab highlighted with blue background and bottom border
- Inactive tab shows gray background with hover effect

**Switching behavior**:
- Click any tab to switch views instantly
- View switching preserves simulation state (voltages, currents remain calculated)
- Component selection persists across view switches
- Schematic layout is cached and regenerates only when circuit topology changes
- Switching to schematic with empty circuit shows empty state message

### Breadboard View

**Description**: Primary view showing physical component placement on a 30×14 breadboard grid with rails, terminal strips, holes, and wiring.

**Features**:
- Component placement via two-click interaction
- Drag-and-drop repositioning with ghost preview
- Component rotation (R key)
- Voltage color overlays on holes and connections
- Animated current flow on wires and components
- Interactive error icons for circuit problems
- Click components/holes to open explain panel
- Audio output controls (for speaker components)

**Visual characteristics**:
- 520px × 780px SVG canvas
- 26px hole spacing (20px hole + 6px margin)
- Power rails (blue negative, red positive) on left and right sides
- Terminal strips in center with gap between left and right sides
- Component overlays render with standard symbols
- Voltage heatmap colors: blue (0V) → cyan → yellow → orange → red (5V)

### Schematic View

**Description**: Secondary view showing electrical circuit abstraction derived from the netlist, with automatic force-directed layout positioning components based on connectivity.

**Status**: Fully implemented (PR #161).

**Schematic generation pipeline**:
1. Circuit extraction produces `ElectricalNetlist` from breadboard placement
2. `SchematicLayoutGenerator` converts circuit edges to layout nodes
3. Force-directed algorithm positions components (100 iterations, configurable parameters)
4. Star topology generated for multi-terminal nets (all terminals connect to net center)
5. `SchematicRenderer` renders symbols and connections as SVG
6. Voltage colors and selection state applied from simulation results
7. Layout cached until circuit topology changes

**Force-directed layout algorithm**:
- **Node initialization**: Components placed at random initial positions (400×400 space)
- **Attraction forces**: Components on same electrical net attract (strength: 0.1)
- **Repulsion forces**: All components repel to prevent overlap (strength: 1000, min spacing: 100px)
- **Velocity damping**: 0.8 damping factor prevents oscillation
- **Cooling schedule**: Temperature decreases linearly over 100 iterations
- **Terminal configuration**: Component-specific terminal offsets (horizontal for resistors/LEDs, vertical for power supplies)

**Layout configuration** (`DEFAULT_LAYOUT_CONFIG`):
- `symbolSpacing`: 100px minimum spacing between symbols
- `terminalLength`: 20px length of terminal connections
- `attractionStrength`: 0.1 (attraction force multiplier)
- `repulsionStrength`: 1000 (repulsion force multiplier)
- `iterations`: 100 (number of layout iterations)

**Schematic symbols** (SVG-based, procedurally drawn):
- **Resistor**: Zigzag pattern (6 segments, ±8px height) with leads
- **LED**: Red triangle with cathode bar and light emission arrows (yellow/orange)
- **Power Supply**: Battery symbol (positive/negative terminals) with red and black lines
- **Ground**: Three decreasing horizontal lines with connection lead
- **Wire**: Simple line with terminal dots
- **Generic**: Box fallback for unknown component types

**Connection rendering**:
- Straight lines from symbol terminals to net center point (star topology)
- Connection paths drawn with voltage-based colors (matches breadboard voltage overlay)
- Default gray color when simulation fails or net has no voltage data
- 2px stroke width for connections
- 4px terminal dots at connection points

**Component labels**:
- **Resistors**: Resistance value displayed below symbol (e.g., "220Ω", "1.0kΩ", "1.0MΩ")
- **Power Supplies**: Voltage value displayed below symbol (e.g., "5V")
- **LEDs**: No label (type indicated by symbol)
- Label positioning: centered at y+25 from symbol center
- 12px font size, black text

**Voltage visualization in schematic**:
- Connection lines colored by net voltage (same color mapping as breadboard)
- Voltage color gradient: 0V (dark blue) → 1.25V (cyan) → 2.5V (yellow) → 3.75V (orange) → 5V (red)
- Color updates automatically when simulation re-runs
- Gray default color when simulation unavailable

**Interactive features**:
- Click schematic symbols to select component (blue highlight applies)
- Click symbols to open explain panel with component details
- Click connections to open explain panel with net voltage information
- Click SVG background to deselect component
- Selection state synchronized between breadboard and schematic views
- Explain panel content identical to breadboard view

**Empty state handling**:
- When no components placed: "No circuit to display" message with hint
- Empty state icon (📐), text, and hint rendered in centered container
- Schematic container hidden when breadboard view active

**Bounds calculation**:
- Automatic bounding box calculated from all symbol positions
- 50px padding added around outermost symbols
- Default bounds (0, 0, 400, 400) when no symbols present
- ViewBox dynamically set to calculated bounds for optimal zoom

**Layout caching**:
- Schematic layout cached in `cachedSchematic` property
- Cache invalidated when circuit topology changes (component added/removed/moved)
- Cache preserved when only simulation results change (voltage/current updates)
- Re-layout triggered only when cache is null (avoids redundant computation)

**Implementation details**:
- `src/core/schematic-types.ts` (83 lines): Type definitions for symbols, connections, diagrams, layout config
- `src/core/schematic-layout.ts` (369 lines): Force-directed graph layout algorithm
- `src/ui/schematic-renderer.ts` (459 lines): SVG-based rendering with voltage colors
- Integration in `src/ui/breadboard-app.ts`: View switcher, cached layout, explain panel
- CSS styling in `src/style.css`: View tabs, schematic container, symbol hover/selection effects

**Performance characteristics**:
- Layout generation: O(n² × iterations) where n = number of components (100 iterations)
- Rendering: O(n + c) where n = symbols, c = connections
- Cached layout avoids re-computation on view switches
- No performance impact when schematic view not active

### Constraints

**Breadboard view constraints**:
- Fixed grid dimensions (30×14)
- Component placement requires two valid hole positions
- No freeform drawing or custom component shapes

**Schematic view constraints**:
- Layout is fully automatic (no manual positioning or dragging)
- Force-directed layout may not be optimal for all circuit topologies
- No schematic-first design (cannot place components in schematic view)
- No hand-editing of symbol positions or connection routing
- No export to industry-standard formats (SPICE, KiCad, Eagle)
- Star topology for multi-terminal nets (not optimized routing)
- No beautification algorithms (orthogonal routing, alignment, etc.)
- Schematic symbols are simplified (not photorealistic or vendor-specific)

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

## Audio Output

### Speaker Component Audio

Speaker components (8Ω breadboard module) produce real audio output via the browser's Web Audio API, deriving waveform characteristics from circuit simulation results.

**Audio capabilities**:
- Browser-based audio generation using Web Audio API
- Audio disabled by default (requires explicit user activation)
- Real-time audio synthesis based on voltage and current across speaker terminals
- Automatic audio updates when circuit changes or simulation re-runs
- Clean audio shutdown when speakers removed or circuit cleared

**Audio mapping algorithm**:
- **Voltage to frequency**: Logarithmic mapping from 0-5V to 200-2000Hz range
  - Formula: frequency = exp(log(200) + normalized_voltage × (log(2000) - log(200)))
  - Provides musical frequency distribution across voltage range
- **Current to amplitude**: Linear mapping from 0-20mA to volume level
  - Amplitude range: 0.05 to 0.3 (scaled down when multiple speakers active)
  - Automatic gain scaling: multi-speaker circuits use lower max amplitude (0.2) to prevent distortion
- **Signal generation**: Sine wave oscillators for smooth, pleasant audio
- **Parameter smoothing**: 50ms ramp time for frequency and amplitude changes prevents clicks/pops
- **Threshold filtering**: Speakers auto-stop when voltage < 0.1V or current < 0.1mA

**Multi-speaker support**:
- Independent oscillator nodes for each speaker component
- Automatic audio mixing via master gain node
- Per-speaker audio parameters (frequency, amplitude) track voltage/current independently
- Dynamic amplitude scaling reduces max volume when multiple speakers active
- Clean resource management (oscillators stopped and disconnected on speaker removal)

**User interaction requirements**:
- Audio must be enabled by user gesture (browser security requirement)
- Web Audio API context initialized only after user clicks "Enable Sound" button
- Audio state persists across circuit changes (once enabled, stays enabled until disabled)

### Audio Controls UI

Interactive audio control panel in left toolbar provides audio enable/disable, volume control, and active speaker monitoring.

**UI elements**:
- **Enable/Disable button**: 
  - Shows "🔇 Enable Sound" when disabled (default state)
  - Shows "🔊 Disable Sound" when enabled
  - Button turns green (`background: #44aa44`) when audio active
  - Hover effect: lighter green (`#55bb55`)
- **Volume slider**:
  - Range: 0-100% (maps to 0.0-1.0 internally)
  - Hidden when audio disabled
  - Real-time volume updates with smooth 50ms ramps
  - Displays current volume percentage next to slider
- **Active speaker indicator**:
  - Shows "🔊 X speaker(s) active" when audio enabled and speakers present
  - Hidden when audio disabled or no speakers active
  - Live count updates as speakers added/removed or voltage/current changes

**Keyboard shortcuts**:
- **M key**: Toggle audio on/off (mute/unmute)
- Works regardless of focus (document-level listener)

**Persistence**:
- Volume setting saved to localStorage (`breadboard-lab-audio-volume`)
- Volume restored on page reload
- Audio enabled/disabled state NOT persisted (always starts disabled for safety)

### Audio Manager Implementation

Core audio system implemented in `AudioManager` class (`src/audio/audio-manager.ts`, 300 lines).

**Architecture**:
- Singleton pattern: one AudioManager instance per BreadboardApp
- Web Audio API integration: AudioContext, OscillatorNode, GainNode
- Speaker tracking: Map of speaker IDs to audio nodes
- State management: enabled flag, volume level, preferences persistence

**Public API**:
- `enable()`: Initialize AudioContext and master gain node (async, requires user gesture)
- `disable()`: Stop all oscillators, close AudioContext, clear speaker map
- `isEnabled()`: Check if audio is currently active
- `updateSpeaker(id, voltage, current)`: Create or update speaker audio parameters
- `removeSpeaker(id)`: Stop and remove speaker audio
- `setVolume(level)`: Set master volume with smooth ramp (0.0-1.0)
- `getVolume()`: Get current volume level
- `getActiveSpeakerCount()`: Get number of speakers currently producing audio

**Internal implementation**:
- `createSpeaker()`: Create new oscillator + gain nodes, configure frequency/amplitude, start oscillator
- `updateSpeakerParameters()`: Update existing oscillator frequency/amplitude with smooth transitions
- `stopSpeaker()`: Stop oscillator, disconnect nodes, remove from map
- `voltageToFrequency()`: Logarithmic voltage-to-frequency mapping
- `currentToAmplitude()`: Linear current-to-amplitude mapping with multi-speaker scaling
- `loadPreferences()`: Load saved volume from localStorage on initialization
- `savePreferences()`: Save volume to localStorage on change

**Audio node graph structure**:
```
[Oscillator 1] → [Gain 1] ┐
[Oscillator 2] → [Gain 2] ├→ [Master Gain] → [Destination (speakers)]
[Oscillator N] → [Gain N] ┘
```

**Error handling**:
- Graceful fallback if Web Audio API not supported
- Try-catch on oscillator stop (may already be stopped)
- Try-catch on localStorage access (may be unavailable)
- User-friendly error messages on enable failure

### Circuit Integration

Audio system integrated into `BreadboardApp` simulation loop with automatic updates.

**Integration points**:
1. **Speaker detection**: Filter components by `libraryId === 'speaker-8ohm'` after simulation
2. **Voltage/current extraction**: 
   - Find circuit edge for each speaker component
   - Extract node voltages from simulation results
   - Calculate voltage across speaker terminals: `|voltageA - voltageB|`
   - Extract current through speaker from edge: `|edge.current|`
3. **Audio update**: Call `audioManager.updateSpeaker(id, voltage, current)` for each speaker
4. **Automatic cleanup**: Remove speaker audio when component deleted
5. **UI synchronization**: Update audio controls after simulation (speaker count, button state)

**Update triggers**:
- Component placement/removal
- Component repositioning
- Component rotation
- Component property changes (affects simulation)
- Circuit topology changes (wire added/removed)
- Any operation that triggers circuit re-extraction and simulation

**Performance characteristics**:
- Audio updates run after simulation completes (not blocking)
- Speaker detection: O(n) where n = number of components
- Edge lookup: O(e) where e = number of edges
- Audio parameter updates: O(s) where s = number of speakers
- No performance impact when audio disabled

### Browser Compatibility

Web Audio API is widely supported in modern browsers:
- **Chrome**: 23+ (2013)
- **Firefox**: 25+ (2013)
- **Safari**: 6.1+ (2013)
- **Opera**: 15+ (2013)
- **Edge**: All versions (Chromium-based)

**Limitations**:
- No audio in browsers without Web Audio API support (graceful degradation)
- Audio requires user gesture to start (browser security policy)
- No mobile-specific audio optimizations (may have latency on some devices)

### Testing

14 unit tests for `AudioManager` (`src/audio/__tests__/audio-manager.test.ts`, 164 lines):
- Initialization (disabled by default, default volume)
- Enable/disable lifecycle
- Volume control (set, get, clamping)
- Speaker creation (enabled/disabled states)
- Threshold filtering (voltage/current too low)
- Multi-speaker support
- Speaker removal
- Automatic speaker stop when voltage/current drops
- localStorage persistence (save/load volume)

**Test coverage**:
- All public API methods tested
- Edge cases: invalid volume values, low voltage/current, multiple speakers
- State transitions: disabled → enabled → disabled
- Browser API mocking: MockAudioContext simulates Web Audio API

### Constraints

- **DC circuits only**: Audio derived from DC simulation (voltage across terminals)
  - No AC waveform analysis (requires transient simulation)
  - Audio is synthesized tone based on DC voltage level, not actual AC waveform
- **Simplified audio model**: 
  - Voltage maps to frequency (not physically accurate for real speakers)
  - Current maps to amplitude (simplified model of speaker behavior)
  - Single sine wave per speaker (no harmonics or complex waveforms)
- **No waveform customization**: Sine wave only (no square, sawtooth, triangle options)
- **No spatial audio**: No panning or 3D audio positioning (all speakers centered)
- **No audio recording**: Cannot export audio to file
- **No audio visualization**: No oscilloscope or spectrum analyzer view
- **Browser-dependent latency**: Audio timing may vary across browsers/devices

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
     - **Resistor**: Resistance value, IEC 60062 color code breakdown (4-band or 5-band), visual display of each band with color name, meaning (1st digit, 2nd digit, multiplier, tolerance), and value. Human-readable calculation (e.g., "10 × 100 = 1.0kΩ ±5%"). Ohm's Law explanation with actual values.
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

## Circuit Persistence and Examples

### Circuit Serialization

The system provides JSON-based serialization for saving and loading circuits with full fidelity.

**JSON Schema (v1.0)**:
- **Version**: Schema version identifier ("1.0")
- **Metadata**: Circuit name, description, author, created/modified timestamps
- **Components**: Full component array with type, positions, rotation, and component-specific properties

**Serialization features**:
- Converts `BreadboardState` to human-readable JSON format
- Preserves all component types: Wire, Resistor, LED, Power Supply, Ground
- Maintains component positions, rotation angles, and all configurable properties
- Stores metadata for circuit identification and organization
- Named default constants: DEFAULT_RESISTANCE (1000Ω), DEFAULT_LED_FORWARD_VOLTAGE (2.0V), DEFAULT_POWER_SUPPLY_VOLTAGE (5.0V)

**Deserialization features**:
- Validates JSON structure and format before loading
- Validates component types and rotation values (0°, 90°, 180°, 270°)
- Applies default values for missing component properties
- Throws descriptive errors for invalid/corrupted data
- Automatic component ID counter extraction to avoid ID conflicts
- Roundtrip fidelity: serialize → deserialize preserves all data

**Testing**:
- 14 unit tests covering serialization, deserialization, validation, and roundtrip
- Edge cases: empty circuits, missing properties, invalid JSON, invalid rotation
- All component types tested individually and in combination

**Implementation**:
- `src/core/circuit-serializer.ts` (306 lines)
- `src/core/__tests__/circuit-serializer.test.ts` (453 lines, 14 tests)

### Circuit Storage

The system provides multiple storage mechanisms for persisting circuits locally and sharing them externally.

**LocalStorage persistence**:
- Save circuits to browser localStorage with user-defined names
- Indexed storage with O(1) retrieval by name
- Storage key sanitization: removes special characters, normalizes whitespace
- Fallback naming: empty/invalid names become "untitled-circuit"
- Circuit index maintains metadata for fast listing without parsing JSON
- Quota exceeded handling with descriptive error messages
- Auto-recovery from corrupted index by rebuilding from localStorage scan

**File operations**:
- Download circuit as `.json` file via Blob API
- Upload circuit from `.json` file via FileReader API
- Automatic `.json` extension enforcement on download
- File selection cancellation handling

**Circuit management**:
- List all saved circuits with metadata (name, description, timestamps)
- Delete saved circuits from localStorage
- Sort circuits by most recently modified
- Update circuit metadata on each save

**Implementation**:
- `src/core/circuit-storage.ts` (250 lines)
- Storage key prefix: `breadboard-lab-circuit-`
- Index key: `breadboard-lab-circuit-index`

### Example Circuit Library

The system includes four canonical example circuits demonstrating different electrical concepts and tool features.

**Available examples**:

1. **LED and Resistor** (Basic)
   - Simplest circuit: LED with 220Ω current-limiting resistor
   - Learning objectives: Basic circuit construction, voltage drop, LED usage, series circuits
   - Components: Power supply (5V), resistor (220Ω), LED (2V), ground, wires

2. **Voltage Divider** (Basic)
   - Two 10kΩ resistors in series dividing 9V input
   - Learning objectives: Voltage division, series resistance, Ohm's Law, proportional relationships
   - Components: Power supply (9V), two resistors (10kΩ each), ground, wires

3. **Parallel LEDs** (Intermediate)
   - Three LEDs in parallel, each with individual 220Ω resistor
   - Learning objectives: Parallel configuration, current division, independent current limiting
   - Components: Power supply (5V), three resistors (220Ω), three LEDs (2V), ground, wires

4. **Short Circuit Demo** (Demo)
   - Intentional short circuit for error detection demonstration
   - Learning objectives: Recognizing short circuits, error detection system, circuit safety
   - Components: Power supply (5V), wire, ground (power connected directly to ground)

**Example metadata**:
- ID, name, description for each example
- Category classification: basic, intermediate, demo
- Learning objectives list (3-4 objectives per example)
- JSON circuit data embedded in application

**Implementation**:
- `src/examples/index.ts` (96 lines): Example registry and lookup functions
- `src/examples/led-resistor.json` (83 lines): LED and Resistor example
- `src/examples/voltage-divider.json` (93 lines): Voltage Divider example
- `src/examples/parallel-leds.json` (203 lines): Parallel LEDs example
- `src/examples/short-circuit-demo.json` (53 lines): Short Circuit Demo example
- Total: 4 examples, all pre-validated and simulation-ready

### User Interface for Save/Load/Examples

The system provides modal dialogs for saving, loading, and browsing example circuits, integrated into the left toolbar.

**Toolbar buttons**:
- **📚 Examples**: Opens example circuits browser (blue primary button)
- **📂 Load Circuit**: Opens saved circuits list and file upload (secondary button)
- **💾 Save Circuit**: Opens save dialog with name/description inputs (secondary button)
- **🗑️ Clear All**: Clears breadboard with unsaved changes confirmation (red button)

**Save dialog features**:
- Input fields for circuit name and description (optional)
- Three action buttons:
  - "Save Locally": Saves to localStorage
  - "Download JSON": Downloads as .json file
  - "Cancel": Dismisses dialog without saving
- Pre-populated with current circuit metadata if already saved
- Success notification after save

**Load dialog features**:
- List of saved circuits sorted by most recent modification
- Each list item displays: name, description, last modified timestamp
- Relative timestamps: "just now", "5 mins ago", "2 hours ago", "3 days ago", or date
- Click any saved circuit to load it
- "Upload from File" button for loading external .json files
- Empty state message when no circuits saved
- Confirmation prompt if loading would overwrite unsaved changes

**Examples dialog features**:
- List of all example circuits with rich metadata
- Each example displays:
  - Name with category badge (BASIC/INTERMEDIATE/DEMO)
  - Description paragraph
  - "What you'll learn" section with checkmark bullets
- Color-coded badges: green (basic), orange (intermediate), purple (demo)
- Click any example to load it immediately
- Confirmation prompt if loading would overwrite unsaved changes

**Modal dialog system**:
- Semi-transparent dark overlay (70% black)
- Centered modal with dark theme matching application
- Slide-up animation on open, fade-out on close
- Close via: X button, Cancel button, or clicking overlay background
- Keyboard-accessible with tab navigation
- Scrollable content area for long lists
- Responsive design adapts to screen size

**Unsaved changes tracking**:
- Changes tracked automatically on: component placement, deletion, rotation, drag, property edit
- Confirmation prompts prevent accidental data loss on:
  - Loading saved circuit
  - Loading example circuit
  - Clearing breadboard
- Tracks current circuit metadata for re-save workflow
- Resets unsaved flag after successful save or load

**Implementation**:
- Integrated into `src/ui/breadboard-app.ts` (+492 lines)
- Modal HTML generation with event listeners
- HTML escaping for safe rendering of user-provided names/descriptions
- Date formatting utility for relative timestamps
- CSS animations and styling in `src/style.css` (+356 lines)

### Constraints and Limitations

**Storage constraints**:
- LocalStorage only (no cloud storage or sync across devices)
- LocalStorage quota limits apply (typically 5-10MB per origin)
- Circuit persistence tied to browser and domain
- Clearing browser data deletes saved circuits
- No circuit versioning or history

**Serialization constraints**:
- Schema version v1.0 only (no automatic migration from future versions)
- Component selection state not serialized (always null on load)
- No compression (JSON stored as plain text)
- No circuit thumbnails or preview images

**Example library constraints**:
- Fixed set of 4 examples (not user-extensible)
- Examples embedded in application code (not dynamically loaded)
- No example categories beyond basic/intermediate/demo
- No search or filter for examples

**UI constraints**:
- Modal dialogs block background interactions
- No keyboard shortcuts for save/load (must use buttons)
- No auto-save functionality
- No save-as or duplicate circuit features
- Saved circuit list does not show preview thumbnails

---

## Component Visual Rendering

### SVG-Based Component Rendering

The system displays all placed components with distinctive visual representations on the breadboard using SVG overlays.

**Visual representations**:
- **Power supply**: Blue battery rectangle with +/- symbols and voltage label (e.g., "5V")
- **Resistor**: Tan rectangle with IEC 60062 compliant color bands representing resistance and tolerance (4 bands for 5% tolerance, 5 bands for 1-2% tolerance). Includes connection leads. Fallback to text label if color band calculation fails.
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
- Resistor rendering: `renderResistorAtPositions()` generates color bands using `resistanceToColorBands()` from color code module
- Resistor color bands: Procedurally drawn with correct IEC 60062 colors, positioned along body, with stroke added to light colors for visibility
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

## Resistor Color Code System

### IEC 60062 Compliant Implementation

The system implements standard resistor color code calculations per IEC 60062, enabling physically accurate resistor rendering and educational color code learning.

**Core algorithm** (`src/core/resistor-color-code.ts`):
- `resistanceToColorBands(resistance, tolerance)`: Converts resistance value (Ω) and tolerance (%) to array of color bands
- `colorBandsToResistance(bands)`: Decodes color bands back to resistance and tolerance values
- Supports 4-band resistors (5% and 10% tolerance)
- Supports 5-band resistors (1% and 2% tolerance)
- Handles resistance range from 1Ω to 1GΩ
- 50+ unit tests covering E12/E24 series, edge cases, and round-trip verification

**Color encoding:**
- **Digit colors**: Black (0), Brown (1), Red (2), Orange (3), Yellow (4), Green (5), Blue (6), Violet (7), Gray (8), White (9)
- **Multiplier colors**: All digit colors plus Gold (×0.1), Silver (×0.01)
- **Tolerance colors**: Brown (1%), Red (2%), Gold (5%), Silver (10%), plus precision values for 5-band resistors
- RGB color values defined for visual rendering (`COLOR_TO_RGB` map)

**Band structure:**
- 4-band: digit1, digit2, multiplier, tolerance
- 5-band: digit1, digit2, digit3, multiplier, tolerance
- Band count determined by tolerance value (≤2% uses 5-band, >2% uses 4-band)

**Examples:**
- 1kΩ 5% → Brown (1), Black (0), Red (×100), Gold (±5%)
- 10kΩ 5% → Brown (1), Black (0), Orange (×1000), Gold (±5%)
- 220Ω 5% → Red (2), Red (2), Brown (×10), Gold (±5%)

### Visual Rendering Integration

Resistor color bands render automatically on all placed resistors:

- Color bands drawn as SVG rectangles positioned along resistor body
- 4 bands spaced evenly across 60px body width
- Band width: 4px per band
- Light colors (white, yellow, gold, silver) have stroke added for visibility
- Bands rotate with component when rotated
- Fallback to text label if color calculation fails (invalid resistance value)

### Interactive Color Code Learning

Click any resistor to open the Explain Panel with color code breakdown:

**Display features:**
- Each band shown with background color and readable text
- Band information includes:
  - Color name (e.g., "Brown", "Black", "Red")
  - Meaning label ("1st Digit", "2nd Digit", "Multiplier", "Tolerance")
  - Value (digit value, multiplier notation like "×100", tolerance like "±5%")
- Human-readable calculation: "10 × 100 = 1.0kΩ ±5%"
- Text color adapts for readability (dark text on light colors, light text on dark colors)
- Band count and tolerance displayed in section header

**Educational value:**
- Students learn to read physical resistor color codes
- Interactive feedback reinforces color-to-value associations
- Real-time updates when resistance value changes
- Matches physical reality of actual electronic components

### Constraints

- Tolerance is fixed at 5% for all resistors (not user-configurable)
- Color code calculation only handles standard resistor values representable in 2 or 3 significant digits
- No support for 6-band resistors (temperature coefficient)
- No support for non-standard color codes or manufacturer-specific variants

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
│   ├── types.ts                   # Type definitions (includes ComponentLibraryEntry)
│   ├── breadboard-layout.ts       # Breadboard connectivity model
│   ├── circuit-extractor.ts       # Circuit graph extraction
│   ├── circuit-simulator.ts       # Circuit simulation
│   ├── circuit-serializer.ts      # Circuit save/load JSON serialization
│   ├── circuit-storage.ts         # LocalStorage persistence
│   ├── resistor-color-code.ts     # IEC 60062 color band calculations
│   ├── schematic-types.ts         # Schematic diagram type definitions (PR #161)
│   ├── schematic-layout.ts        # Force-directed layout algorithm (PR #161)
│   ├── component-library.ts       # Component library registry (PR #143)
│   ├── component-library-utils.ts # Library utilities and backward compatibility (PR #143)
│   └── __tests__/                 # Unit tests
│       ├── breadboard-layout.test.ts
│       ├── circuit-extractor.test.ts
│       ├── circuit-serializer.test.ts
│       ├── circuit-simulator.test.ts
│       ├── resistor-color-code.test.ts
│       ├── component-library.test.ts (PR #143)
│       └── component-library-utils.test.ts (PR #143)
├── library/                       # Real-world component catalog (PR #143)
│   ├── index.ts                   # Library aggregation and exports
│   ├── resistors.ts               # Resistor library entries (23 components)
│   ├── leds.ts                    # LED library entries (4 components)
│   ├── other-components.ts        # Power supplies, wires, ground, speaker
│   └── __tests__/                 # Library validation tests
│       └── library-catalog.test.ts
├── audio/                         # Audio output system (PR #155)
│   ├── audio-manager.ts           # Web Audio API integration and speaker management
│   └── __tests__/                 # Audio tests
│       └── audio-manager.test.ts  # AudioManager unit tests
├── ui/                            # Presentation layer
│   ├── breadboard-app.ts          # Main UI application class
│   ├── component-renderer.ts      # SVG component rendering
│   ├── schematic-renderer.ts      # SVG schematic diagram rendering (PR #161)
│   ├── error-overlay-renderer.ts  # Error icon rendering
│   ├── explain-panel.ts           # Interactive explanation panel
│   ├── voltage-colors.ts          # Voltage-to-color mapping
│   ├── current-animator.ts        # Current animation
│   └── __tests__/                 # UI tests
├── examples/                      # Example circuits
│   └── *.json                     # Example circuit definitions
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
- **Test framework**: Vitest 4.0 (unit/integration tests)
- **Visual testing**: Playwright 1.57 (visual regression tests)
- **Linter**: ESLint 8.55
- **Formatter**: Prettier 3.1
- **Test environment**: jsdom 27.4 (for unit tests), Chromium (for visual tests)

### Available Commands

```bash
npm run dev       # Start development server (port 5173)
npm run build     # TypeScript compilation + Vite production build
npm run preview   # Preview production build
npm test          # Run unit tests
npm run test:ui   # Run tests with Vitest UI
npm run test:visual          # Run visual regression tests with Playwright
npm run test:visual:ui       # Run visual tests with Playwright UI (interactive)
npm run test:visual:update   # Update visual test baseline screenshots
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
- **Vitest**: Global test APIs, jsdom environment, excludes `tests/visual/**` (Playwright tests)
- **Playwright**: Chromium browser, dev server integration, screenshot comparison with 100px max diff / 0.2 threshold

### Continuous Integration

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request with two jobs:

**Job 1: Unit and Integration Tests** (`test`)
- Node.js 20 on Ubuntu
- Runs linter (`npm run lint`)
- Runs unit tests (`npm test -- --run`)
- Duration: ~1-2 minutes

**Job 2: Visual Regression Tests** (`visual-tests`)
- Node.js 20 on Ubuntu
- Installs Playwright Chromium browser with dependencies
- Runs visual regression tests (`npm run test:visual`)
- Uploads artifacts on failure:
  - Playwright HTML report (`playwright-report/`)
  - Visual diff images (`test-results/`)
  - Retention: 30 days
- Duration: ~2-3 minutes (includes browser install and dev server startup)

Both jobs must pass for PR approval. Visual regression failures block merge.

---

## Testing

### Test Coverage

Fourteen test suites with 231 passing tests (224 unit/integration + 7 visual regression):

1. **breadboard-layout.test.ts** (12 tests)
   - Position validity checking (updated for 14 columns)
   - Terminal strip connectivity (updated column indices)
   - Connected position enumeration (strips and rails)
   - Rail position identification (3 new tests)
   - Rail information retrieval (2 new tests)
   - Rail vertical connectivity (3 new tests)

2. **circuit-extractor.test.ts** (6 tests)
   - Empty circuit extraction
   - Wire edge creation across nodes (updated column indices)
   - Same-node component handling (updated column indices)
   - Multiple component extraction (updated column indices)
   - Rail-to-strip connectivity (new test)
   - Same-rail component handling (new test)

3. **circuit-simulator.test.ts** (12 tests)
   - Basic circuits (ground only, simple series, voltage divider)
   - Parallel circuits (two parallel resistors, voltage divider with parallel load, complex networks)
   - Wire handling (low resistance validation)
   - LED handling (series resistor model)
   - Error cases (missing ground, short circuit detection)
   - Multiple voltage sources
   - Current calculations through parallel branches
   - Note: Error detection logic validated through integration but not yet unit tested

4. **circuit-serializer.test.ts** (14 tests) — **New in PR #119**
   - Serialization of empty circuits and all component types
   - Deserialization with validation (JSON format, component types, rotation values)
   - Default value application for missing properties
   - Roundtrip fidelity (serialize → deserialize preserves all data)
   - Edge cases (invalid JSON, missing fields, unknown component types)

5. **voltage-colors.test.ts** (13 tests)
   - Color gradient mapping at key voltage stops (0V, 1.25V, 2.5V, 3.75V, 5V)
   - Linear interpolation between color stops
   - Voltage clamping (negative and above 5V)
   - CSS class mapping for pattern-based alternatives

6. **component-renderer.test.ts** (9 tests)
   - SVG element creation
   - Individual component rendering (wire, resistor, LED, power supply, ground)
   - Multiple component rendering
   - Component layering (wires render before other components)
   - Wire color cycling and reset behavior

7. **current-animator.test.ts** (11 tests)
   - Start/stop lifecycle management
   - Current threshold filtering (1µA minimum)
   - Particle creation for currents above threshold
   - Current magnitude scaling (particle count and speed)
   - Component type support (wire, resistor, LED)
   - Edge cases (zero current, negative current, empty components, failed simulation)

8. **breadboard-app.test.ts** (25 tests) — **Updated in PR #107**
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

9. **property-editor.test.ts** (12 tests) — **New in PR #95**
   - Property editor visibility toggle (shown when component selected, hidden otherwise)
   - Type-specific field rendering (resistor, LED, power supply)
   - Input value updates with debounce wait (resistance, voltage, forward voltage)
   - Preset button behavior (applies preset values)
   - Validation error handling (invalid values)
   - Component type filtering (wire and ground have no property editor)
   - Preset button counts for different component types

10. **resistor-color-code.test.ts** (50 tests)
    - E12 series resistance encoding (100Ω to 10kΩ)
    - E24 series resistance encoding
    - 4-band resistor color code generation (5% and 10% tolerance)
    - 5-band resistor color code generation (1% and 2% tolerance)
    - Color band decoding back to resistance values
    - Roundtrip verification (encode → decode preserves values)
    - Edge cases (1Ω, 1GΩ, non-standard values)
    - Invalid inputs and error handling

11. **component-library.test.ts** (13 tests) — **New in PR #143**
    - Component registration with duplicate detection
    - Lookup by ID (existing and non-existing)
    - Get all components
    - Filter by category (passive, diode, power, etc.)
    - Text search across name, description, part numbers
    - Case-insensitive search
    - Empty registry handling

12. **library-catalog.test.ts** (18 tests) — **New in PR #143**
    - Resistor catalog validation:
      - E12 series coverage (16 values with 5% tolerance)
      - 1% tolerance variants (7 values)
      - Physical specifications (package, dimensions)
      - Electrical specifications (resistance, tolerance, power rating)
    - LED catalog validation:
      - All 4 required LEDs present (3mm yellow, 5mm red/green/blue)
      - Forward voltage values
      - Package types (T1, T1-3/4)
      - Wavelength and luminous intensity
    - Speaker validation (8Ω module specifications)
    - Power supply validation (4 voltage levels with current ratings)
    - Wire and ground validation
    - Unique IDs across all entries
    - Valid component types and categories

13. **component-library-utils.test.ts** (19 tests) — **New in PR #143**
    - `findClosestResistor()`:
      - Exact matches for E12 series values
      - Rounding to nearest available value
      - Tolerance filtering (5% vs 1%)
      - Edge cases (very low and very high resistance)
    - `findClosestLED()`:
      - Exact matches for standard forward voltages
      - Rounding to nearest available LED
      - Edge cases (very low and very high voltages)
    - `findPowerSupply()`:
      - Exact matches for available voltages (3.3V, 5V, 9V, 12V)
      - Non-matching voltages return undefined
    - `getDefaultLibraryId()`:
      - Maps abstract resistors to library entries
      - Maps abstract LEDs to library entries
      - Maps abstract power supplies to library entries
      - Handles components without close matches
    - `getComponentPropertiesFromLibrary()`:
      - Extracts electrical properties from library
      - Falls back to component properties when no library entry

14. **audio-manager.test.ts** (14 tests) — **New in PR #155**
    - Initialization (disabled by default, default volume of 0.5)
    - Enable/disable lifecycle (AudioContext creation/closure)
    - Volume control (set, get, clamping to 0.0-1.0 range)
    - Speaker creation when audio enabled and voltage/current provided
    - Threshold filtering (no speaker creation when voltage < 0.1V or current < 0.1mA)
    - Multi-speaker support (multiple independent oscillators)
    - Speaker removal (stop oscillator and cleanup)
    - Automatic speaker stop when voltage or current drops below threshold
    - localStorage persistence (save and load volume preferences)
    - Active speaker count tracking

15. **examples.spec.ts** (7 visual regression tests) — **New in PR #125**
    - Screenshot comparison for all 4 example circuits (LED+resistor, voltage divider, parallel LEDs, short circuit demo)
    - Visual verification that voltage overlays render with colors
    - Visual verification that current animation elements are present
    - Visual verification that error overlays render when present
    - Automated visual regression detection using Playwright screenshot comparison
    - 100px max diff tolerance, 0.2 color threshold for consistency
    - Baseline screenshots: ~68KB total (4 PNG files in `tests/visual/examples.spec.ts-snapshots/`)

### Testing Approach

- Unit tests for core logic (Vitest with jsdom environment)
- UI interaction tests for component selection, deletion, and drag-and-drop repositioning
- Visual regression tests using Playwright screenshot comparison
- Tests use Vitest for unit/integration testing and Playwright for visual regression
- Visual tests run in headless Chromium browser for consistency

### Coverage Gaps

- No tests for component placement logic
- No tests for circuit storage layer (localStorage operations, file download/upload)
- No tests for save/load/examples UI dialogs and modal interactions
- No integration tests for voltage overlay rendering behavior
- No integration tests for component rendering with voltage overlays
- No integration tests for current animation with full circuit simulation
- No integration tests for property editor behavior with circuit simulation
- No unit tests for error detection heuristics (detection logic validated through integration only)
- No unit tests for error overlay rendering
- No unit tests for explain panel content generation

### Test Execution

- All 231 tests pass (224 unit/integration + 7 visual regression)
- Unit test duration: Fast execution (typically < 8 seconds for all unit tests)
- Visual test duration: ~18 seconds for all 7 tests
- No flaky tests observed

### Visual Regression Testing

The system includes automated visual regression testing to protect critical visual features from accidental breakage.

**Testing infrastructure**:
- **Framework**: Playwright test framework with screenshot comparison
- **Browser**: Chromium only (for cross-platform consistency)
- **Coverage**: All 4 canonical example circuits
- **Baseline storage**: ~68KB of baseline screenshots committed to git

**Test capabilities**:
- Automated screenshot capture of breadboard view with all overlays
- Pixel-perfect comparison against baseline images
- Detection of visual regressions in:
  - Component rendering (resistors, LEDs, power supplies, wires, ground symbols)
  - Breadboard grid layout and hole positioning
  - Voltage color overlays (when simulation succeeds)
  - Current animation SVG elements
  - Error indicators (when present)
- Configurable tolerance: 100px max diff, 0.2 (20%) color threshold

**CI integration**:
- Separate `visual-tests` job in GitHub Actions workflow
- Runs on every pull request and push to main
- Automatic failure on visual regressions
- Failed test artifacts automatically uploaded:
  - Diff images showing pixel differences
  - HTML report with visual comparison
  - Retention: 30 days

**Test implementation**:
- Helper functions for programmatic example loading (`loadExample()`)
- Render stabilization waits (1.5s after component overlay appears)
- Breadboard container viewport capture (not full page)
- Tests verify visual element presence before screenshot:
  - Component overlay SVG exists
  - Voltage overlays with colors (on successful simulation)
  - Current animation elements
  - Error overlay elements (when applicable)

**Baseline management**:
- Baselines stored in `tests/visual/examples.spec.ts-snapshots/`
- Update command: `npm run test:visual:update`
- Manual review required before updating baselines
- Baselines committed with code changes

**Example tests**:
1. LED and Resistor circuit visual rendering
2. Voltage Divider circuit visual rendering
3. Parallel LEDs circuit visual rendering
4. Short Circuit Demo visual rendering
5. Voltage overlay color verification
6. Current animation element verification
7. Error overlay rendering verification

**Configuration** (`playwright.config.ts`):
- Test directory: `./tests/visual`
- Base URL: `http://localhost:5173`
- Dev server integration (auto-start before tests)
- Retry: 2 times on CI, 0 times locally
- Reporter: HTML report
- Screenshot on failure only
- Workers: 1 on CI (sequential), parallel locally

**npm scripts**:
- `npm run test:visual`: Run visual regression tests
- `npm run test:visual:ui`: Run with interactive Playwright UI
- `npm run test:visual:update`: Update baseline screenshots

---

## Constraints and Assumptions

### Fixed Values

- Breadboard dimensions are fixed (30×14)
- Component default values (can be changed after placement via property editor):
  - Resistors default to 1kΩ
  - Power supplies default to 5V
  - LEDs default to 2V forward voltage
- Wire resistance is fixed at 0.01Ω (not configurable)

### Single-User Local Application

- No server component
- No authentication or user accounts
- Circuits persist in browser localStorage (not cloud-synced)
- No cloud storage or sync across devices

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

1. **No undo/redo**: No operation history
2. **No multi-select**: Can only select one component at a time
3. **No copy/paste**: Cannot duplicate components
4. **Limited error types**: Only five predefined error categories detected
5. **No cloud sync**: Circuits saved locally only (no cross-device synchronization)

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
- `vitest` (4.0.16): Unit test framework
- `@vitest/ui` (4.0.16): Test UI
- `@playwright/test` (1.57.0): Visual regression testing framework
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
| `src/core/types.ts` | 182 | Type definitions including Rail, Strip, BreadboardTopology interfaces, ErrorType enum, CircuitError interface, and ComponentLibraryEntry interface (PR #143) |
| `src/core/breadboard-layout.ts` | 196 | Breadboard connectivity logic with power rails support |
| `src/core/circuit-extractor.ts` | 175 | Circuit graph extraction with union-find (handles rails and terminal strips) |
| `src/core/circuit-simulator.ts` | 528 | DC circuit simulation using MNA and error detection (5 error types) |
| `src/core/circuit-serializer.ts` | 306 | Circuit JSON serialization/deserialization with validation |
| `src/core/circuit-storage.ts` | 250 | localStorage persistence and file download/upload |
| `src/core/component-library.ts` | 82 | Component library registry with lookup, search, and filtering (PR #143) |
| `src/core/component-library-utils.ts` | 165 | Library utilities for mapping abstract components to library entries (PR #143) |
| `src/core/resistor-color-code.ts` | 310 | IEC 60062 color code calculations (encoding and decoding) |
| `src/core/schematic-types.ts` | 83 | Type definitions for schematic symbols, connections, diagrams, and layout configuration (PR #161) |
| `src/core/schematic-layout.ts` | 369 | Force-directed graph layout algorithm for schematic generation (PR #161) |
| `src/library/index.ts` | 32 | Library catalog aggregation and exports (PR #143) |
| `src/library/resistors.ts` | 83 | Resistor library entries (23 components, E12 series, 5% and 1% tolerance) (PR #143) |
| `src/library/leds.ts` | 108 | LED library entries (4 components: 3mm yellow, 5mm red/green/blue) (PR #143) |
| `src/library/other-components.ts` | 202 | Power supplies, wires, ground, and speaker library entries (PR #143) |
| `src/audio/audio-manager.ts` | 300 | Web Audio API integration and speaker audio management (PR #155) |
| `src/examples/index.ts` | 96 | Example circuit registry and lookup functions |
| `src/examples/led-resistor.json` | 87 | LED and Resistor example circuit (uses power rails) |
| `src/examples/voltage-divider.json` | 97 | Voltage Divider example circuit (uses power rails) |
| `src/examples/parallel-leds.json` | 187 | Parallel LEDs example circuit (uses power rails) |
| `src/examples/short-circuit-demo.json` | 57 | Short Circuit Demo example circuit (uses power rails) |
| `src/ui/breadboard-app.ts` | 2215 | Main UI application class with component library browser, save/load/examples modals, selection/deletion, rotation, property editor, drag-and-drop, rail rendering, audio integration, and view switcher (PR #149, PR #155, PR #161) |
| `src/ui/voltage-colors.ts` | 82 | Voltage-to-color mapping utilities |
| `src/ui/component-renderer.ts` | 568 | SVG-based visual component rendering with rotation transform support |
| `src/ui/schematic-renderer.ts` | 459 | SVG-based schematic diagram rendering with standard symbols and voltage colors (PR #161) |
| `src/ui/current-animator.ts` | 426 | Animated current flow visualization using particles |
| `src/ui/error-overlay-renderer.ts` | 140 | Error icon SVG rendering with hover effects |
| `src/ui/explain-panel.ts` | 370 | Contextual explanation panel with educational content |
| `src/main.ts` | 11 | Application entry point |
| `src/style.css` | 1149 | Application styles (includes modal dialogs, component library browser, error icons, explain panel styling, rail styling, audio controls, view tabs, schematic container) (PR #149, PR #155, PR #161) |

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `src/core/__tests__/breadboard-layout.test.ts` | 15 | Breadboard connectivity tests (strips and rails) |
| `src/core/__tests__/circuit-extractor.test.ts` | 6 | Circuit extraction tests (with rail connectivity) |
| `src/core/__tests__/circuit-simulator.test.ts` | 12 | Circuit simulation tests (MNA solver) |
| `src/core/__tests__/circuit-serializer.test.ts` | 14 | Circuit serialization/deserialization tests (roundtrip, validation, edge cases) |
| `src/core/__tests__/resistor-color-code.test.ts` | 50 | Resistor color code tests (encoding, decoding, E12/E24 series) |
| `src/core/__tests__/component-library.test.ts` | 13 | Component library registry tests (registration, lookup, search, filtering) (PR #143) |
| `src/core/__tests__/component-library-utils.test.ts` | 19 | Library utility tests (closest matching, default mappings, property extraction) (PR #143) |
| `src/library/__tests__/library-catalog.test.ts` | 18 | Library catalog validation tests (resistors, LEDs, speaker, power supplies) (PR #143) |
| `src/ui/__tests__/voltage-colors.test.ts` | 13 | Voltage-to-color mapping tests |
| `src/ui/__tests__/component-renderer.test.ts` | 9 | Component visual rendering tests |
| `src/ui/__tests__/current-animator.test.ts` | 11 | Current animation tests (particle system, magnitude scaling) |
| `src/ui/__tests__/breadboard-app.test.ts` | 25 | Component selection, deletion, rotation, and drag-and-drop interaction tests |
| `src/ui/__tests__/property-editor.test.ts` | 12 | Property editor tests (visibility, editing, presets, validation) |
| `src/audio/__tests__/audio-manager.test.ts` | 14 | AudioManager unit tests (initialization, enable/disable, speakers, volume, persistence) (PR #155) |
| `tests/visual/examples.spec.ts` | 7 | Visual regression tests using Playwright screenshot comparison |
| `tests/visual/helpers.ts` | - | Helper functions for visual tests (example loading, render stabilization) |
| `tests/visual/examples.spec.ts-snapshots/` | - | Baseline screenshots for visual regression (4 PNG files, ~68KB total) |
| `tests/visual/README.md` | - | Visual regression testing documentation |

### Configuration Files

- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript compiler configuration
- `tsconfig.node.json`: TypeScript config for build tools
- `vite.config.ts`: Vite build configuration (includes Vitest config with visual test exclusion)
- `playwright.config.ts`: Playwright visual testing configuration
- `.eslintrc.json`: ESLint rules
- `.prettierrc.json`: Prettier formatting rules
- `index.html`: HTML entry point
- `.github/workflows/ci.yml`: CI workflow with unit and visual test jobs

### Documentation Files

- `README.md`: Project overview and usage instructions (updated with library overview in PR #143)
- `ARCHITECTURE.md`: Architecture documentation
- `COMPONENT_LIBRARY.md`: Component library architecture, usage examples, integration strategy (PR #143)
- `IMPLEMENTATION_SUMMARY.md`: Component library design decisions and rationale (PR #143)
- `LICENSE`: MIT license
- `planning/vision/goal.md`: Comprehensive planning document (vision, not capabilities)

---

## What the System Does NOT Do

For clarity, these capabilities are explicitly **not present**:

- ❌ PCB layout or design
- ❌ Schematic editor with manual positioning (schematic view is auto-generated and read-only)
- ❌ Component library customization
- ❌ Microcontroller simulation
- ❌ Advanced circuit analysis (AC, transient, frequency response)
- ❌ Touch/mobile gestures
- ❌ Collaboration or multi-user features
- ❌ Cloud storage or cross-device sync
- ❌ 3D visualization
- ❌ Embedded firmware simulation
- ❌ SPICE netlist export (JSON format only)
- ❌ Schematic export to industry-standard formats (Eagle, KiCad, etc.)
- ❌ Auto-fix for detected errors (user must manually fix)

---

## Verification

This document describes the system as observed on 2026-01-04 after merging PR #161:

- ✅ All source files examined
- ✅ Tests executed successfully (231/231 passing: 224 unit/integration + 7 visual regression)
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
- ✅ Circuit serialization capabilities verified from PR #119 changes
- ✅ Circuit storage (localStorage and file operations) verified from PR #119 changes
- ✅ Example circuit library verified from PR #119 changes
- ✅ Save/Load/Examples UI modals verified from PR #119 changes
- ✅ Visual regression testing infrastructure verified from PR #125 changes
- ✅ Playwright integration and configuration verified from PR #125 changes
- ✅ CI visual test job verified from PR #125 changes
- ✅ Visual test helpers and baseline screenshots verified from PR #125 changes
- ✅ Power rail implementation verified from PR #131 changes
- ✅ Rail interface and topology types verified from PR #131 changes
- ✅ Rail connectivity logic verified from PR #131 changes
- ✅ Rail visual rendering verified from PR #131 changes
- ✅ Updated example circuits with rail-based power distribution verified from PR #131 changes
- ✅ Component library infrastructure verified from PR #143 changes
- ✅ ComponentLibraryEntry data model verified from PR #143 changes
- ✅ Component library registry (registration, lookup, search, filtering) verified from PR #143 changes
- ✅ Library catalog with 35 real-world components verified from PR #143 changes
- ✅ Library utilities for backward compatibility verified from PR #143 changes
- ✅ 50 new tests for library functionality verified from PR #143 changes
- ✅ COMPONENT_LIBRARY.md and IMPLEMENTATION_SUMMARY.md documentation verified from PR #143 changes
- ✅ Component library browser modal UI verified from PR #149 changes
- ✅ Searchable component selection with real-time filtering verified from PR #149 changes
- ✅ Category-based filtering with 6 component categories verified from PR #149 changes
- ✅ Component card display with specs, package info, and descriptions verified from PR #149 changes
- ✅ Library ID auto-population on component placement verified from PR #149 changes
- ✅ Test compatibility via selectComponentType() API verified from PR #149 changes
- ✅ ~370 lines of CSS for modal and component cards verified from PR #149 changes
- ✅ Toolbar button replacement (5 buttons → 1 library button) verified from PR #149 changes
- ✅ Audio output implementation verified from PR #155 changes
- ✅ AudioManager class with Web Audio API integration verified from PR #155 changes
- ✅ Speaker component audio synthesis (voltage-to-frequency, current-to-amplitude mapping) verified from PR #155 changes
- ✅ Audio controls UI (enable/disable button, volume slider, active speaker indicator) verified from PR #155 changes
- ✅ Circuit-to-audio integration in BreadboardApp verified from PR #155 changes
- ✅ Multi-speaker support and audio mixing verified from PR #155 changes
- ✅ Keyboard shortcut (M key) for audio toggle verified from PR #155 changes
- ✅ localStorage persistence for volume settings verified from PR #155 changes
- ✅ 14 AudioManager unit tests verified from PR #155 changes
- ✅ Schematic view implementation verified from PR #161 changes
- ✅ Schematic types (SchematicDiagram, SchematicSymbol, SchematicConnection, LayoutConfig) verified from PR #161 changes
- ✅ Force-directed layout algorithm with 100 iterations verified from PR #161 changes
- ✅ SchematicLayoutGenerator with attraction/repulsion forces verified from PR #161 changes
- ✅ Star topology for multi-terminal net connections verified from PR #161 changes
- ✅ SchematicRenderer with SVG-based symbol rendering verified from PR #161 changes
- ✅ Standard schematic symbols (resistor zigzag, LED diode, battery, ground) verified from PR #161 changes
- ✅ Voltage color overlays on schematic connections verified from PR #161 changes
- ✅ Component value labels (resistance, voltage) auto-generated verified from PR #161 changes
- ✅ View switcher UI (🔌 Breadboard / 📐 Schematic tabs) verified from PR #161 changes
- ✅ Cached layout regeneration only on topology changes verified from PR #161 changes
- ✅ Explain panel integration with schematic symbols and connections verified from PR #161 changes
- ✅ Synchronized simulation state across views verified from PR #161 changes
- ✅ CSS styling for view tabs, schematic container, and symbols verified from PR #161 changes

This is a snapshot of reality, not aspirations or plans.
