# 🔌 Breadboard Lab

An open-source, browser-based breadboard simulator designed to teach electronics by visualising hidden connections, voltages, and currents in real time.

## Features

- **Interactive Breadboard UI**: Place components and wires on a realistic breadboard with power rails and terminal strips
- **Power Rails**: 4 vertical power distribution rails (2 per side: positive and negative) with color coding
- **Realistic Layout**: 30 rows × 14 columns matching physical breadboard structure
- **Component Library**: Wire, Resistor (1kΩ), LED, Power Supply (5V), and Ground
- **Circuit Extraction**: Automatically extracts electrical circuit topology from component placement
- **Real-time Simulation**: Calculates voltages and currents using Modified Nodal Analysis (MNA)
- **Voltage Heatmap Visualization**: Color-coded voltage display on breadboard holes (0V=blue → 5V=red)
- **Animated Current Flow**: Particles flow along wires and components showing current direction and magnitude
- **Component Rendering**: Visual representation of components with proper symbols and labels
- **Error Detection**: Identifies short circuits, floating nodes, reversed LEDs, and other common mistakes
- **Educational Explanations**: Click on components or errors to see detailed explanations and suggestions
- **Clean Architecture**: Separation of concerns between UI, circuit extraction, and simulation layers
- **Strong Typing**: Fully typed with TypeScript for reliability and maintainability
- **Test Coverage**: Unit tests for core logic (breadboard layout, circuit extraction, simulation, animation)

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

1. **Select a Component**: Click on a component button in the left toolbar (Wire, Resistor, LED, Power Supply, or Ground)
2. **Place Component**: Click on a breadboard hole for the first pin, then click on another hole for the second pin
3. **View Circuit Info**: The right panel shows component count, circuit nodes, connections, and simulation status
4. **Observe Visualization**: 
   - Voltage levels shown as color-coded overlays on breadboard holes (hover for exact values)
   - Current flow shown as animated blue particles moving along wires and components
   - Particle speed and density indicate current magnitude
5. **Clear All**: Click the "Clear All" button to remove all components and start over

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

- **types.ts**: Domain types and interfaces for components, circuit nodes, and simulation results
- **breadboard-layout.ts**: Models the breadboard's internal connection structure (terminal strips)
- **circuit-extractor.ts**: Extracts circuit graph from breadboard state using union-find algorithm
- **circuit-simulator.ts**: Simulates circuit voltages and currents using simplified nodal analysis

### UI Layer (`src/ui/`)

- **breadboard-app.ts**: Main application class managing UI rendering and user interactions
- **component-renderer.ts**: Renders visual representations of components as SVG elements
- **current-animator.ts**: Animates current flow using particles along circuit paths
- **voltage-colors.ts**: Maps voltage values to color-blind friendly color gradients

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

- More component types (capacitors, switches, batteries, transistors)
- Advanced circuit analysis (AC analysis, transient analysis)
- Error detection overlays (short circuits, floating nodes, reversed polarity)
- Component value customization (user-adjustable resistance, voltage)
- Component deletion and editing capabilities
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
