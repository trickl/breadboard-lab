# Architecture Documentation

## Overview

Breadboard Lab is a web-based electronics simulator built with clean architecture principles, strong typing, and testable logic. The system is divided into three main layers: Core (domain logic), UI (presentation), and Configuration.

## Project Structure

```
breadboard-lab/
├── src/
│   ├── core/               # Domain logic and simulation
│   │   ├── types.ts        # Domain types and interfaces
│   │   ├── breadboard-layout.ts   # Breadboard internal connections
│   │   ├── circuit-extractor.ts   # Circuit graph extraction
│   │   ├── circuit-simulator.ts   # Voltage/current simulation
│   │   └── __tests__/      # Unit tests for core logic
│   ├── ui/                 # Presentation layer
│   │   └── breadboard-app.ts      # Main UI application
│   ├── main.ts             # Application entry point
│   └── style.css           # Global styles
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Build and test configuration
└── README.md               # Usage documentation
```

## Layer Responsibilities

### Core Layer (`src/core/`)

The core layer contains all domain logic and is completely independent of the UI. It can be tested in isolation.

**types.ts**
- Defines all domain types: `Component`, `Circuit`, `Position`, etc.
- Uses TypeScript discriminated unions for type safety
- No dependencies on UI or external libraries

**breadboard-layout.ts**
- Models the physical breadboard structure
- 30 rows × 10 columns (5 per side)
- Terminal strips: horizontal connections within each row
- Pure functions for checking connections and validity
- No state, fully deterministic

**circuit-extractor.ts**
- Converts breadboard state to circuit graph
- Uses union-find algorithm for connected components
- Identifies electrical nodes from physical positions
- Creates edges for components connecting nodes
- Complexity: O(n log n) where n is number of positions

**circuit-simulator.ts**
- Simulates circuit voltages and currents
- Simplified nodal analysis for basic circuits
- Identifies ground and power nodes
- Calculates voltage division and current flow
- Returns simulation results or error state

### UI Layer (`src/ui/`)

**breadboard-app.ts**
- Main application class managing UI state
- Renders breadboard grid (300 holes)
- Handles user interactions (component selection, placement)
- Updates circuit information display
- Calls core layer for circuit extraction and simulation
- Follows MVC-like pattern: state → render → update

### Configuration

**TypeScript Configuration**
- Strict mode enabled for maximum type safety
- ES2020 target for modern JavaScript features
- Path aliases for clean imports (`@/core/...`)

**Build Configuration (Vite)**
- Fast development server with HMR
- Optimized production builds
- Path resolution for TypeScript aliases

**Test Configuration (Vitest)**
- Unit tests for core logic
- Fast execution with Vite's transform pipeline
- Coverage reporting available

## Data Flow

```
User Interaction
    ↓
UI Layer (breadboard-app.ts)
    ↓
Update State (components array)
    ↓
Circuit Extractor
    ↓
Circuit Graph (nodes + edges)
    ↓
Circuit Simulator
    ↓
Simulation Results (voltages + currents)
    ↓
UI Update (display results)
```

## Key Design Decisions

### 1. Separation of Concerns
- Core logic is completely independent of UI
- Can swap UI framework without changing core
- Core can be used in Node.js, browser, or other environments

### 2. Immutable State
- Components are stored in array
- Each update creates new state
- Makes reasoning about state changes easier

### 3. Union-Find for Circuit Extraction
- Efficient algorithm for finding connected components
- O(α(n)) amortized time for union/find operations
- Natural fit for breadboard connection problem

### 4. Simplified Simulation
- Uses basic voltage division for initial implementation
- Suitable for resistive circuits with simple topology
- Can be extended to full nodal/mesh analysis later

### 5. TypeScript Strict Mode
- Catches errors at compile time
- Self-documenting code with types
- Better IDE support and refactoring

## Testing Strategy

### Unit Tests
- Test breadboard layout connection logic
- Test circuit extraction with various component configurations
- Test edge cases (empty board, invalid positions)

### Manual Testing
- Visual inspection of UI
- Interactive component placement
- Circuit information display accuracy

## Future Enhancements

### Core Layer
- [ ] Full nodal analysis for complex circuits
- [ ] AC circuit simulation
- [ ] Transient analysis (capacitors, inductors)
- [ ] Short circuit and open circuit detection
- [ ] Component validation (LED polarity, etc.)

### UI Layer
- [ ] Visual wire rendering (lines between holes)
- [ ] Component graphics (resistor bands, LED colors)
- [ ] Voltage/current visualization with colors
- [ ] Drag-and-drop component placement
- [ ] Undo/redo functionality
- [ ] Save/load circuits

### Additional Features
- [ ] More component types (capacitor, switch, battery)
- [ ] Component customization (resistance values, voltages)
- [ ] Circuit validation and error messages
- [ ] Educational tooltips and guides
- [ ] Mobile touch support

## Performance Considerations

### Current Implementation
- Full UI re-render on each component placement
- Circuit extraction runs on every update
- Simulation runs on every update

### Optimization Opportunities
- Incremental circuit updates (only re-extract changed regions)
- Memoization of simulation results
- Partial UI updates (only changed holes)
- Virtual scrolling for large breadboards
- Web Workers for heavy simulation

## Security Considerations

- No external data sources or APIs
- No user authentication required
- All computation happens client-side
- No sensitive data handled
- CodeQL scan shows 0 security alerts

## Dependencies

### Production
- None (vanilla TypeScript/JavaScript)

### Development
- TypeScript: Type checking and compilation
- Vite: Build tool and dev server
- Vitest: Test framework
- ESLint: Code linting
- Prettier: Code formatting

All dependencies are development-only. The final bundle has zero runtime dependencies.
