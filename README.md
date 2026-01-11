# 🔌 Breadboard Lab

An open-source, browser-based breadboard simulator designed to teach electronics by visualising hidden connections, voltages, and currents in real time.

## Features

- **Interactive Breadboard UI**: Place components and wires on a realistic breadboard with power rails and terminal strips
- **X-Ray Mode**: Toggle visualization of internal breadboard connectivity (🔬 button or X key)
  - Shows power rails with vertical connections (blue for negative, red for positive)
  - Reveals terminal strip horizontal connections (5 holes per row)
  - Helps beginners understand which holes are internally connected
  - Semi-transparent overlay doesn't obscure components or wires
- **Power Rails**: 4 vertical power distribution rails (2 per side: positive and negative) with color coding
- **Realistic Layout**: 30 rows × 14 columns matching physical breadboard structure
- **Component Library**: Real-world components with physically accurate specifications:
  - 23 resistor values (E12 series, 5% and 1% tolerance)
  - 4 LED types (3mm yellow, 5mm red/green/blue with accurate forward voltages)
  - SPST toggle switch (manual circuit control with stateful open/closed behavior)
  - Speaker module (8Ω breadboard-compatible)
  - Multiple power supplies (3.3V, 5V, 9V, 12V)
  - **EDU-8 Microprocessor** (educational virtual IC for teaching computational electronics)
  - See [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) for complete catalog
- **Circuit Extraction**: Automatically extracts electrical circuit topology from component placement
- **Real-time Simulation**: Calculates voltages and currents using Modified Nodal Analysis (MNA)
- **Voltage Heatmap Visualization**: Color-coded voltage display on breadboard holes (0V=blue → 5V=red)
- **Animated Current Flow**: Particles flow along wires and components showing current direction and magnitude
- **Component Rendering**: Visual representation of components with proper symbols and labels
- **Error Detection**: Identifies short circuits, floating nodes, reversed LEDs, and other common mistakes
- **Educational Explanations**: Click on components or errors to see detailed explanations and suggestions
- **Audio Output**: Speaker components produce real browser audio via Web Audio API:
  - Enable/disable sound with toggle button or M key
  - Adjustable volume control
  - Audio waveform derived from circuit voltage and current
  - Multiple speakers supported simultaneously
- **EDU-8 Microprocessor**: Educational virtual microprocessor for teaching computational electronics:
  - 8-bit accumulator with 4-bit I/O ports
  - 7-instruction set (LDA, ADD, IN, OUT, JZ, JMP, HALT)
  - Clock-driven execution (one instruction per rising edge)
  - 16-byte programmable ROM
  - Explain panel shows internal CPU state (PC, instruction, accumulator, flags)
  - Preset programs: Blink, Counter, Echo, Pattern
  - Bridges software and hardware concepts
- **Clean Architecture**: Separation of concerns between UI, circuit extraction, and simulation layers
- **Strong Typing**: Fully typed with TypeScript for reliability and maintainability
- **Test Coverage**: Unit tests for core logic (breadboard layout, circuit extraction, simulation, animation, audio, microprocessor)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Testing

Run unit tests:

```bash
npm test
```

Run tests with UI:

```bash
npm run test:ui
```

### Linting

```bash
npm run lint
```

## Usage

1. **Open Component Library**: Click the 📦 (Component Library) button to see available components
2. **Select a Component**: Click on a component from the library (Wire, Resistor, LED, Switch, Power Supply, Ground, or Speaker)
3. **Place Component Interactively**:
   - The selected component appears floating next to the breadboard
   - **Drag** the component body to position it (optional)
   - **Click a component leg** (highlighted in yellow), then **click a breadboard hole** to connect that leg
   - Repeat for each leg until all legs are connected
   - The component automatically places on the breadboard when all legs are connected
   - Press **Escape** to cancel placement at any time
4. **Interact with Components**:
   - **Switches**: Click a placed switch to toggle between open (off) and closed (on) states
   - Visual indicator shows current state (orange = open, green = closed)
   - Circuit updates in real-time when switch state changes
5. **View Circuit Info**: The right panel shows component count, circuit nodes, connections, and simulation status
6. **Observe Visualization**:
   - Voltage levels shown as color-coded overlays on breadboard holes (hover for exact values)
   - Current flow shown as animated blue particles moving along wires and components
   - Particle speed and density indicate current magnitude
7. **Enable Audio** (for speaker components):
   - Click the "🔇 Enable Sound" button in the Audio Output section
   - Or press the **M** key to toggle audio on/off
   - Adjust volume with the slider
   - Speaker components will produce sound based on circuit voltage and current
   - Audio is disabled by default and requires user interaction to start
8. **Clear All**: Click the "Clear All" button to remove all components and start over

### Interactive Component Placement Workflow

The interactive placement workflow (goal.md Section 5.3.1) provides precise control over component connections:

- **Visibility**: Selected components float beside the breadboard, avoiding visual occlusion
- **Precision**: Connect each leg individually to the exact hole you want
- **Validation**: System prevents connecting multiple components to the same hole
- **Feedback**: Visual highlights show which leg you're connecting and valid target holes
- **Flexibility**: Drag the component body to position it before making connections

This workflow is especially helpful for:

- Dense circuits with many components
- Components with specific orientation requirements (LEDs, power supplies)
- Learning which pin connects where (educational value)

**Keyboard Shortcuts:**

- **R** - Rotate selected component 90° clockwise
- **X** - Toggle X-Ray Mode to reveal internal breadboard connectivity
- **M** - Toggle audio on/off
- **Delete/Backspace** - Delete selected component
- **Escape** - Cancel current component placement
- **Ctrl+Z** - Undo last action
- **Ctrl+Y** or **Ctrl+Shift+Z** - Redo
- **M** - Toggle audio mute
- **Space** - Step clock (when EDU-8 present)

### Audio Output

When audio is enabled and a speaker component is connected to a circuit:

- **Frequency**: Derived from voltage across speaker terminals (0-5V maps to 200-2000Hz logarithmically)
- **Amplitude**: Derived from current through speaker (0-20mA range)
- **Real-time Updates**: Audio adjusts automatically when circuit values change
- **Multiple Speakers**: Each speaker in the circuit produces independent sound
- **Smooth Transitions**: Parameter changes use 50ms ramp to avoid clicks and pops

**Example circuits to try:**

- Simple buzzer: Connect power supply → speaker → ground (constant tone)
- Variable tone: Power supply → resistor → speaker → ground (change resistor value to change pitch)

### Clock Control (EDU-8 Microprocessor)

When an EDU-8 microprocessor is on the breadboard, the Clock Control panel appears allowing you to:

- **Step**: Execute one instruction at a time (Space key) to observe the fetch-decode-execute cycle
- **Run**: Automatically execute instructions at adjustable frequencies (0.5-10 Hz)
- **Pause**: Stop automatic execution while preserving CPU state
- **Reset**: Reinitialize the microprocessor (PC=0, A=0, outputs=0)
- **Frequency Control**: Adjust clock speed with slider (lower for instruction-by-instruction learning, higher for observing program flow)

The Clock Control UI makes computational electronics tangible by showing:

- Real-time CPU state updates in the Explain panel (program counter, accumulator, flags)
- Output changes reflected immediately on connected LEDs
- The connection between software (instructions) and hardware (voltages)

**Try the EDU-8 Blink example** from the Examples menu to see clock control in action!

See [docs/CLOCK_CONTROL_GUIDE.md](docs/CLOCK_CONTROL_GUIDE.md) for detailed documentation.

### Current Flow Animation

When a circuit simulation succeeds, animated particles automatically appear showing:

- **Direction**: Particles flow from higher voltage to lower voltage (positive to negative)
- **Magnitude**: Faster/more particles = higher current
- **Color coding**:
  - Faint blue (< 1mA): Low current
  - Medium blue (1-10mA): Moderate current
  - Bright blue (> 10mA): High current

## Architecture

The project follows a clean architecture with clear separation of concerns:

### Core Layer (`src/core/`)

- **types.ts**: Domain types and interfaces for components, circuit nodes, simulation results, and component library
- **breadboard-layout.ts**: Models the breadboard's internal connection structure (terminal strips and power rails)
- **circuit-extractor.ts**: Extracts circuit graph from breadboard state using union-find algorithm
- **circuit-simulator.ts**: Simulates circuit voltages and currents using Modified Nodal Analysis (MNA)
- **component-library.ts**: Registry for real-world component specifications
- **component-library-utils.ts**: Helper functions for component lookups and mapping

### Library Catalog (`src/library/`)

- **resistors.ts**: 23 standard resistor values (E12 series, multiple tolerances)
- **leds.ts**: 4 LED variants with accurate specifications
- **other-components.ts**: Power supplies, wires, ground, and speaker module
- **index.ts**: Exports all library entries (35 components total)

See [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) for detailed library documentation.

### UI Layer (`src/ui/`)

- **breadboard-app.ts**: Main application class managing UI rendering and user interactions
- **component-renderer.ts**: Renders visual representations of components as SVG elements
- **current-animator.ts**: Animates current flow using particles along circuit paths
- **voltage-colors.ts**: Maps voltage values to color-blind friendly color gradients

### Audio Layer (`src/audio/`)

- **audio-manager.ts**: Manages Web Audio API integration for speaker audio output
  - Creates and manages oscillator nodes per speaker
  - Maps voltage to frequency and current to amplitude
  - Handles smooth parameter transitions
  - Manages master volume and enable/disable state

### Tests

- Unit tests for breadboard layout logic
- Unit tests for circuit extraction
- All core logic is independently testable

## Technology Stack

- **TypeScript**: Type-safe JavaScript for reliability
- **Vite**: Fast build tool and dev server
- **Vitest**: Modern testing framework
- **Vanilla JavaScript**: No framework dependencies for the UI (keeping it simple)
- **ESLint + Prettier**: Code quality and formatting

## Future Enhancements

- Component library browser UI (selection by specification)
- Library-aware component rendering (size-accurate visuals)
- More component types (capacitors, switches, transistors, ICs)
- Advanced circuit analysis (AC analysis, transient analysis)
- Component value customization through library parts
- Undo/redo functionality
- Export/import circuit designs
- Power dissipation visualization (heat indicators on resistors)
- Derived schematic view from breadboard layout
- Mobile-friendly touch interface

## Contributing

This is an educational project. Contributions are welcome! Please ensure:

- Code is properly typed with TypeScript
- Tests are added for new functionality
- Code passes linting (npm run lint)
- Architecture principles are maintained (separation of concerns)

## License

MIT License - see LICENSE file for details
