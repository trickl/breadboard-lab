# Current System Capabilities of Breadboard Lab

**Date**: 2025-12-30  
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
- No visual representation of placed components (only "occupied" marker on holes)
- No wire rendering (wires are invisible except for hole markers)
- No voltage/current visualization
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

Simplified DC circuit simulator using basic series path analysis.

### Algorithm

1. Identify ground nodes (from GROUND components)
2. Identify power supply nodes (from POWER_SUPPLY components)
3. Set ground nodes to 0V
4. Set power supply nodes to their voltage value
5. Find series paths from power nodes to ground nodes using depth-first search
6. For each path:
   - Calculate total resistance (sum of all resistors and wires)
   - Calculate current using Ohm's law: I = V / R_total
   - Calculate voltage drops across each component
   - Assign voltages to intermediate nodes

### Component Models

- **Resistor**: Ohmic (V = I × R)
- **Wire**: Small resistance (0.01Ω)
- **LED**: Simplified model (treated as 100Ω resistance + 2V forward voltage drop)
- **Power Supply**: Ideal voltage source
- **Ground**: Reference (0V)

### Capabilities

- DC operating point analysis for simple series circuits
- Voltage calculation at circuit nodes
- Current calculation through components
- Success/failure status reporting

### Limitations

- **No parallel circuits**: Only finds one series path from power to ground
- **No Kirchhoff analysis**: Does not use nodal or mesh analysis matrices
- **No nonlinear components**: LED model is oversimplified
- **No AC analysis**: DC only
- **No transient analysis**: No capacitors or inductors supported
- **No short circuit detection**: No error checking for impossible configurations
- **No floating node detection**: No warnings for disconnected components
- **No convergence checks**: Assumes all circuits are solvable

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

Two test suites with 13 passing tests:

1. **breadboard-layout.test.ts** (9 tests)
   - Position validity checking
   - Terminal strip connectivity
   - Connected position enumeration

2. **circuit-extractor.test.ts** (4 tests)
   - Empty circuit extraction
   - Wire edge creation across nodes
   - Same-node component handling
   - Multiple component extraction

### Testing Approach

- Unit tests for core logic only
- No UI/integration tests
- No end-to-end tests
- Tests use Vitest with jsdom environment

### Coverage Gaps

- No tests for `CircuitSimulator`
- No tests for `BreadboardApp` (UI layer)
- No tests for component placement logic
- No tests for simulation correctness with actual circuits

### Test Execution

- All tests pass
- Test duration: ~14ms execution, ~780ms total (including setup)
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
2. **No component editing**: Cannot change component values or positions
3. **No visual components**: Components are not drawn (only hole occupancy shown)
4. **No wire rendering**: Wires are invisible
5. **No voltage/current display**: Simulation results are not visualized
6. **Limited circuit types**: Only simple series circuits from power to ground
7. **No parallel circuits**: Simulator does not handle parallel branches
8. **No error detection**: No validation of circuit correctness
9. **No persistence**: No save/load functionality
10. **No undo/redo**: No operation history

### Simulation Accuracy

1. **Simplified LED model**: Not physically accurate
2. **No diode behavior**: LEDs don't model forward/reverse bias correctly
3. **No component limits**: No overcurrent or overvoltage protection
4. **No real analysis**: Not using proper nodal/mesh analysis
5. **Path-finding limitation**: Only finds first path, ignores other paths

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
| `src/core/circuit-simulator.ts` | 195 | DC circuit simulation |
| `src/ui/breadboard-app.ts` | 300 | Main UI application class |
| `src/main.ts` | 11 | Application entry point |
| `src/style.css` | ~200 | Application styles |

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `src/core/__tests__/breadboard-layout.test.ts` | 9 | Breadboard connectivity tests |
| `src/core/__tests__/circuit-extractor.test.ts` | 4 | Circuit extraction tests |

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
- ❌ Real-time voltage/current visualization
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

This document describes the system as observed on 2025-12-30:

- ✅ All source files examined
- ✅ Tests executed successfully (13/13 passing)
- ✅ Build completed successfully
- ✅ No code modifications made during documentation
- ✅ Component capabilities verified against source code
- ✅ Circuit extraction algorithm verified
- ✅ Simulation algorithm verified
- ✅ UI capabilities verified from BreadboardApp source

This is a snapshot of reality, not aspirations or plans.
