# Current System Capabilities of Breadboard Lab

**Date**: 2026-01-03  
**Purpose**: Factual description of what the system demonstrably does today

---

## Overview

Breadboard Lab is a web-based electronics simulator that provides a visual breadboard interface for placing components, extracting circuit topology, and performing basic circuit simulation. The system is built with TypeScript, uses Vite for building, and runs entirely in the browser with zero runtime dependencies.

---

## Component Library

The system supports exactly five component types:

1. **Wire** - Connects two breadboard holes with minimal resistance (0.01Ω)
2. **Resistor** - Fixed 1kΩ resistance
3. **LED** - Forward voltage 2.0V, max current 0.02A
4. **Power Supply** - Fixed 5V voltage source
5. **Ground** - Circuit ground reference

All component values are hardcoded and cannot be modified by the user.

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
- No drag-and-drop
- No visual preview before second click

### Available Operations

- **Place component**: Select component type, click two holes
- **Clear all**: Removes all components and resets the breadboard
- **View circuit info**: Automatically updated after each placement

### Limitations

- No component deletion (individual components)
- No component editing or moving
- No undo/redo
- No save/load functionality
- No component rotation
- No error highlighting or user feedback for invalid placements

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
- Component overlay has `pointer-events: none` to avoid interfering with hole interaction
- Components display above breadboard grid but below voltage overlay

**Coordinate mapping**:
- Grid positions (row, col) map to pixel coordinates for SVG rendering
- Hole spacing: 26px per hole (20px hole size + 6px total margin)
- Breadboard dimensions: 520px width (10 columns) × 780px height (30 rows)

### Implementation Details

**Component renderer** (`src/ui/component-renderer.ts`):
- `ComponentRenderer` class handles all visual rendering logic
- `renderComponents()`: Creates SVG element with all component visuals
- Individual render methods for each component type (wire, resistor, LED, power supply, ground)
- Position-to-pixel coordinate conversion
- Smart resistance value formatting

**Integration** (`src/ui/breadboard-app.ts`):
- Component overlay renders after breadboard grid creation
- Re-renders automatically on state changes (component placement, clear all)
- SVG dimensions calculated based on breadboard size
- Existing component overlay removed before re-rendering

**Styling** (`src/style.css`):
- `.component-overlay`: Absolute positioning with z-index 10
- `.component`: Base component styling with opacity transition
- Breadboard container has `position: relative` for overlay positioning

### Constraints

- Components are not interactive (SVG has pointer-events disabled)
- No drag-and-drop of rendered components (placement uses two-click interaction)
- No animation of component placement (instant rendering)
- Visual representations are simplified geometric shapes, not photorealistic
- Wire routing is orthogonal (Manhattan style), not customizable by user

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
- State contains a flat array of `AnyComponent` objects
- No immutable state pattern (components array is mutated)
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

Six test suites with 58 passing tests:

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

6. **current-animator.test.ts** (11 tests) — **New in PR #83**
   - Start/stop lifecycle management
   - Current threshold filtering (1µA minimum)
   - Particle creation for currents above threshold
   - Current magnitude scaling (particle count and speed)
   - Component type support (wire, resistor, LED)
   - Edge cases (zero current, negative current, empty components, failed simulation)

### Testing Approach

- Unit tests for core logic only
- No UI/integration tests
- No end-to-end tests
- Tests use Vitest with jsdom environment

### Coverage Gaps

- No tests for `BreadboardApp` (UI layer)
- No tests for component placement logic
- No integration tests for voltage overlay rendering behavior
- No integration tests for component rendering with voltage overlays
- No integration tests for current animation with full circuit simulation
- No UI/end-to-end tests

### Test Execution

- All 58 tests pass
- Test duration: Fast execution (typically < 200ms)
- No flaky tests observed

---

## Constraints and Assumptions

### Hard-Coded Values

- Component values cannot be changed by users
- Breadboard dimensions are fixed (30×10)
- All resistors are 1kΩ
- All power supplies are 5V
- All LEDs have 2V forward voltage

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

1. **No component deletion**: Cannot remove individual components (only "Clear All")
2. **No component editing**: Cannot change component values or positions after placement
3. **No component dragging**: Components cannot be moved once placed (two-click placement only)
4. **No error detection for circuit validity**: Limited validation of circuit correctness beyond ground/singularity checks
5. **No persistence**: No save/load functionality
6. **No undo/redo**: No operation history

### Simulation Accuracy

1. **Simplified LED model**: Treated as 100Ω resistor; not physically accurate (no forward voltage drop or reverse bias)
2. **No diode behavior**: LEDs don't model forward/reverse bias correctly
3. **No component limits**: No overcurrent or overvoltage protection warnings
4. **Linear circuits only**: No support for nonlinear components beyond simplified LED model

### User Experience

1. **No drag and drop**: Two-click placement only
2. **No visual feedback**: No preview during placement
3. **No validation feedback**: Silent failure on invalid operations
4. **No help system**: No tooltips or guidance
5. **No keyboard shortcuts**: Mouse-only interaction

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
| `src/core/types.ts` | 123 | Type definitions for domain model |
| `src/core/breadboard-layout.ts` | 84 | Breadboard connectivity logic |
| `src/core/circuit-extractor.ts` | 144 | Circuit graph extraction with union-find |
| `src/core/circuit-simulator.ts` | 360 | DC circuit simulation using Modified Nodal Analysis |
| `src/ui/breadboard-app.ts` | 467 | Main UI application class |
| `src/ui/voltage-colors.ts` | 82 | Voltage-to-color mapping utilities |
| `src/ui/component-renderer.ts` | 443 | SVG-based visual component rendering |
| `src/ui/current-animator.ts` | 426 | Animated current flow visualization using particles |
| `src/main.ts` | 11 | Application entry point |
| `src/style.css` | ~244 | Application styles |

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `src/core/__tests__/breadboard-layout.test.ts` | 9 | Breadboard connectivity tests |
| `src/core/__tests__/circuit-extractor.test.ts` | 4 | Circuit extraction tests |
| `src/core/__tests__/circuit-simulator.test.ts` | 12 | Circuit simulation tests (MNA solver) |
| `src/ui/__tests__/voltage-colors.test.ts` | 13 | Voltage-to-color mapping tests |
| `src/ui/__tests__/component-renderer.test.ts` | 9 | Component visual rendering tests |
| `src/ui/__tests__/current-animator.test.ts` | 11 | Current animation tests (particle system, magnitude scaling) |

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
- ❌ Error detection and helpful messages
- ❌ Touch/mobile gestures
- ❌ Collaboration or multi-user features
- ❌ Data persistence or cloud storage
- ❌ Component libraries or part databases
- ❌ 3D visualization
- ❌ Embedded firmware simulation
- ❌ SPICE netlist import/export

---

## Verification

This document describes the system as observed on 2026-01-03 after merging PR #83:

- ✅ All source files examined
- ✅ Tests executed successfully (58/58 passing)
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

This is a snapshot of reality, not aspirations or plans.
