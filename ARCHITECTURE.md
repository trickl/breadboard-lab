# Architecture Documentation

## Overview

Breadboard Lab is a web-based electronics simulator built with clean architecture principles, strong typing, and testable logic. The system is divided into three main layers: Core (domain logic), UI (presentation), and Configuration.

## Technology Stack

**Current Implementation:** Vanilla TypeScript + PixiJS 8.6.6

The application uses **PixiJS** as its rendering engine, **not React + Konva**. This architectural decision was made to:
- Leverage WebGL acceleration for high-performance breadboard rendering
- Avoid React framework overhead for a canvas-heavy application
- Use a mature, well-documented 2D rendering library with excellent TypeScript support
- Enable fine-grained control over rendering pipeline and hit detection

**Core Technologies:**
- **Language:** TypeScript 5.3+ (strict mode)
- **Build Tool:** Vite 7.3+ (fast dev server, optimized production builds)
- **Rendering:** PixiJS 8.6.6 (WebGL/Canvas with autoDetectRenderer)
- **UI Framework:** Vanilla TypeScript with DOM manipulation (no React, no Vue)
- **State Management:** Immutable component array pattern
- **Testing:** Vitest (unit/integration), Playwright (visual regression)

**Response to Review Feedback (2026-01-08, Section 7):**

A review noted a perceived discrepancy between "intended" technology (React + Konva) and "actual" technology (PixiJS). This was based on outdated or incorrect assumptions. The application has been built with **vanilla TypeScript + PixiJS** from the beginning, and there is no incomplete migration. The current stack is the intended and final architecture for the MVP.

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
│   │   ├── breadboard-app.ts      # Main UI application (vanilla TypeScript)
│   │   └── pixi-renderer.ts       # PixiJS rendering layer
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
- 30 rows × 14 columns (4 power rail columns + 10 terminal strip columns)
- **Power rails**: 4 vertical rails (left negative, left positive, right positive, right negative)
  - All holes within a rail are vertically connected
  - Rails run the full 30 rows
  - Color-coded: red for positive (+), blue for negative (-)
- **Terminal strips**: horizontal connections within each row
  - Left strip: columns 2-6
  - Right strip: columns 7-11
  - Center gap between left and right strips
- Pure functions for checking connections and validity
- No state, fully deterministic

**circuit-extractor.ts**
- Converts breadboard state to circuit graph
- Uses union-find algorithm for connected components
- Identifies electrical nodes from physical positions
- Creates edges for components connecting nodes
- Complexity: O(n log n) where n is number of positions

**circuit-simulator.ts**
- Simulates circuit voltages and currents using Modified Nodal Analysis (MNA)
- Handles parallel circuits, voltage dividers, and multiple current paths
- Identifies ground and voltage source nodes
- Solves linear system using Gaussian elimination with partial pivoting
- Returns simulation results with node voltages and edge currents
- Detects circuit errors (short circuits, floating nodes, reversed LEDs, etc.)

**digital-signals.ts**
- Abstracts digital logic levels from analog voltages
- Uses TTL-compatible thresholds (0.8V low, 2.0V high)
- Provides bidirectional conversion: analog ↔ digital
- Supports 4-state logic: 0, 1, Z (high-impedance), X (unknown)
- Helper functions for nibble (4-bit) conversions

**edge-detector.ts**
- Detects rising and falling edges on digital signals
- Tracks previous signal state for edge detection
- Only detects edges between defined values (0 or 1)
- Stateful detector that updates with each detection

**digital-event-queue.ts**
- Priority queue for timestamped digital events
- Supports clock edge events and digital state change events
- Events ordered by timestamp for deterministic simulation
- Component-specific event filtering and removal

**digital-simulator.ts**
- Orchestrates event-driven digital simulation
- Bridges analog voltages to digital signals using TTL thresholds
- Detects clock edges and dispatches to digital components
- Converts digital outputs back to analog voltages
- Currently supports EDU-8 microprocessor component

**mixed-signal-simulator.ts**
- Combines analog DC simulation with digital event-driven simulation
- Coordinates CircuitSimulator and DigitalSimulator
- Simulation loop: DC analysis → voltage abstraction → digital execution → output conversion
- Updates circuit node voltages from DC solver results
- Maintains digital state across simulation steps

**edu8-simulator.ts**
- Educational 8-bit microprocessor with 4-bit program counter
- Minimal instruction set: LDA, ADD, IN, OUT, JZ, JMP, HALT
- Executes one instruction per rising clock edge via `handleClockEdge`
- 16 bytes of program ROM, 4-bit input/output ports
- Preset programs for educational use (blink, counter, echo, pattern)

### UI Layer (`src/ui/`)

**breadboard-app.ts**
- Main application class managing UI state
- Coordinates between user interactions and rendering layer
- Handles user interactions (component selection, placement, dragging)
- Updates circuit information display
- Calls core layer for circuit extraction and simulation
- Follows MVC-like pattern: state → render → update
- Written in vanilla TypeScript (no React, no JSX)

**pixi-renderer.ts**
- PixiJS rendering layer for breadboard visualization
- Renders breadboard grid (300 holes with WebGL acceleration)
- Renders components (resistors, LEDs, wires, microprocessors, etc.)
- Handles component graphics (resistor color bands, LED colors)
- Implements voltage heatmap overlays
- Implements X-ray mode (internal breadboard connections)
- Custom hit detection for components and breadboard holes
- All rendering uses PixiJS Graphics API (no HTML/CSS canvas overlay)

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

### Analog-Only Circuits

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
Circuit Simulator (DC MNA)
    ↓
Simulation Results (voltages + currents)
    ↓
UI Update (display results)
```

### Mixed-Signal Circuits (with Digital Components)

```
User Interaction (e.g., clock pulse)
    ↓
UI Layer
    ↓
Update Circuit (clock voltage source)
    ↓
Circuit Extractor
    ↓
Circuit Graph (nodes + edges)
    ↓
Mixed-Signal Simulator
    ├─> DC Simulator (MNA)
    │       ↓
    │   Analog Node Voltages
    │       ↓
    ├─> Digital Signal Abstraction (TTL thresholds)
    │       ↓
    │   Digital Values (0, 1, Z, X)
    │       ↓
    ├─> Edge Detector
    │       ↓
    │   Clock Edge Detection
    │       ↓
    ├─> Digital Simulator
    │   ├─> EDU-8 Microprocessor
    │   │       ↓
    │   │   Execute Instruction
    │   │       ↓
    │   │   Updated Component State
    │   │       ↓
    │   └─> Digital Outputs (4-bit)
    │           ↓
    │       Analog Voltages (TTL levels)
    │           ↓
    └─> Updated Components + Simulation Results
            ↓
    UI Update (display state, voltages, currents)
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

### 4. Event-Driven Digital Simulation
- Separates analog (continuous) and digital (discrete-event) domains
- Digital signals abstracted from analog voltages using TTL thresholds
- Clock edge detection enables sequential logic execution
- Stateful digital components (EDU-8) execute on clock edges
- Digital outputs converted back to analog voltages for circuit integration
- Maintains digital simulation state across simulation steps for proper edge detection

### 5. Mixed-Signal Architecture
- Analog and digital simulations run cooperatively, not competitively
- DC solver provides analog voltages → Digital simulator processes edges → Components update
- Single iteration per simulation step (no convergence loop in current implementation)
- Future: Iterative convergence if digital outputs significantly affect analog circuit

### 6. TypeScript Strict Mode
- Catches errors at compile time
- Self-documenting code with types
- Better IDE support and refactoring

## Digital Simulation Architecture

### Overview

The digital simulation layer enables event-driven execution of digital components (currently EDU-8 microprocessor) in response to clock signals. It bridges the analog and digital domains using TTL-compatible voltage thresholds.

### Key Components

**Digital Signal Abstraction**
- Maps analog voltages to digital logic levels (0, 1, Z, X)
- TTL thresholds: V_IL=0.8V (low), V_IH=2.0V (high)
- Output voltages: V_OL=0.2V (low), V_OH=4.5V (high)
- Handles undefined region (0.8V-2.0V) as 'X' (unknown)

**Edge Detection**
- Tracks previous digital state per pin
- Detects rising (0→1) and falling (1→0) transitions
- Only detects edges on defined values (ignores Z and X)
- Stateful: edge detector must persist across simulation steps

**Event Queue**
- Priority queue for timestamped events (not currently used in single-iteration mode)
- Supports clock edge and state change events
- Ordered by timestamp for deterministic execution
- Provides component-specific filtering

**Digital Simulator**
- Entry point: `stepDigitalSimulation(circuit, components, digitalState, clockNodeId)`
- Reads clock voltage from circuit nodes (after DC analysis)
- Abstracts clock to digital, detects edges
- Dispatches to digital components (EDU-8) on rising edges
- Returns updated component array

**Mixed-Signal Simulator**
- High-level orchestrator combining DC and digital simulation
- Configuration: `enableDigitalSimulation`, `clockNodeId`
- Workflow:
  1. Run DC analysis to get node voltages
  2. Update circuit nodes with DC results
  3. Execute digital simulation using clock node voltage
  4. Return updated components and simulation results
- Maintains persistent digital state (edge detectors) across calls

### EDU-8 Microprocessor Integration

**Clock-Driven Execution**
- `handleClockEdge(state, clockValue, inputs)` method
- Executes one instruction on rising clock edge (when `clockValue` transitions from false to true)
- Updates `clockState` in component state to track clock level
- No execution on falling edges or when clock stays constant

**Instruction Execution**
- Fetch instruction from ROM at `programCounter`
- Decode into opcode and operand
- Execute based on opcode (LDA, ADD, IN, OUT, JZ, JMP, HALT)
- Update accumulator, PC, zero flag, outputs as appropriate
- Increment PC (or jump) for next instruction

**Output Conversion**
- `getMicroprocessorOutputVoltages(microprocessor)` converts 4-bit output to analog voltages
- Each bit becomes V_OL (0.2V) or V_OH (4.5V)
- Outputs can drive LEDs, other analog components in circuit

### Simulation Workflow Example

**Single Clock Pulse**:
1. User/UI sets clock power supply voltage to 5.0V
2. `mixedSignalSimulator.simulate(circuit, components, config)` called
3. DC solver runs → clock node voltage = 5.0V
4. Digital simulator abstracts clock to digital '1'
5. Edge detector sees transition 0→1 (rising edge)
6. EDU-8 executes current instruction, updates state
7. Updated component returned with new PC, accumulator, outputs
8. Repeat with clock=0.0V for falling edge

**Blink Program Example** (toggles OUT0):
```
Pulse 1: Execute LDA #1  → accumulator = 1
Pulse 2: Execute OUT     → outputs = 0b0001 (OUT0 high)
Pulse 3: Execute LDA #0  → accumulator = 0
Pulse 4: Execute OUT     → outputs = 0b0000 (OUT0 low)
Pulse 5: Execute JMP 0   → PC wraps to 0, loop repeats
```

### Current Limitations

**Simplifications in MVP**:
- Single clock domain (all digital components share one clock)
- Synchronous only (no component propagation delays)
- EDU-8 inputs sampled synchronously (not edge-triggered)
- No AC waveform generation (clock is abstracted power supply)
- No transient analysis (discrete-event, not continuous-time)
- Single iteration per step (no analog/digital convergence loop)

**Future Enhancements**:
- Multi-clock domain support
- Asynchronous digital inputs
- Setup/hold time validation
- Propagation delay modeling
- Digital output feedback to analog circuit (iterative convergence)
- More digital components (flip-flops, counters, shift registers)

### 5. TypeScript Strict Mode
- Catches errors at compile time
- Self-documenting code with types
- Better IDE support and refactoring

## Testing Strategy

### Unit Tests
- Test breadboard layout connection logic
- Test circuit extraction with various component configurations
- Test digital signal abstraction (TTL thresholds, conversions)
- Test edge detector (rising/falling edge detection, state tracking)
- Test digital event queue (priority ordering, filtering)
- Test EDU-8 instruction execution and clock-driven behavior
- Test edge cases (empty board, invalid positions, undefined digital values)

### Integration Tests
- Test digital simulator with EDU-8 (clock pulses, instruction execution)
- Test mixed-signal simulator (DC + digital coordination)
- Test EDU-8 preset programs (blink, counter, echo, pattern)
- Test multiple microprocessors executing independently
- Test digital state persistence across simulation steps

### Visual Tests
- Playwright tests for UI rendering and interactions
- Screenshot comparison for component placement
- Visual regression testing for voltage heatmap overlays

**Test Coverage**: 350+ tests covering core, UI, and integration scenarios

## Future Enhancements

### Core Layer - Analog Simulation
- [x] Full Modified Nodal Analysis (MNA) for complex circuits (DONE)
- [x] Short circuit and open circuit detection (DONE)
- [x] Component validation (LED polarity, overcurrent) (DONE)
- [ ] AC circuit simulation
- [ ] Transient analysis (capacitors, inductors)
- [ ] More component models (diodes, transistors, op-amps)

### Core Layer - Digital Simulation
- [x] Event-driven digital simulation infrastructure (DONE)
- [x] EDU-8 microprocessor with clock-driven execution (DONE)
- [x] TTL-compatible digital signal abstraction (DONE)
- [x] Clock edge detection (DONE)
- [ ] Multi-clock domain support
- [ ] Asynchronous digital inputs with edge triggering
- [ ] More digital components (flip-flops, counters, shift registers, logic gates)
- [ ] Setup/hold time validation
- [ ] Propagation delay modeling
- [ ] Iterative convergence for digital output feedback to analog circuit

### UI Layer
- [x] Visual wire rendering (DONE with PixiJS)
- [x] Component graphics (resistor bands, LED colors) (DONE)
- [x] Voltage heatmap overlay (DONE)
- [x] Current flow animation (DONE)
- [x] Error detection and explain panel (DONE)
- [ ] Clock control UI (step button, run/pause, reset)
- [ ] EDU-8 state visualization (PC, accumulator, flags, outputs)
- [ ] Program editor for EDU-8 ROM
- [ ] Waveform visualization for digital signals
- [ ] Step-by-step execution mode with breakpoints
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
