# 🔌 Breadboard Lab

An open-source, browser-based breadboard simulator designed to teach electronics by visualising hidden connections, voltages, and currents in real time.

## Features

- **Interactive Breadboard UI**: Place components and wires on a realistic 30x10 breadboard grid
- **Component Library**: Wire, Resistor (1kΩ), LED, Power Supply (5V), and Ground
- **Circuit Extraction**: Automatically extracts electrical circuit topology from component placement
- **Real-time Simulation**: Calculates voltages and currents using simplified circuit analysis
- **Clean Architecture**: Separation of concerns between UI, circuit extraction, and simulation layers
- **Strong Typing**: Fully typed with TypeScript for reliability and maintainability
- **Test Coverage**: Unit tests for core logic (breadboard layout, circuit extraction)

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
4. **Clear All**: Click the "Clear All" button to remove all components and start over

## Architecture

The project follows a clean architecture with clear separation of concerns:

### Core Layer (`src/core/`)

- **types.ts**: Domain types and interfaces for components, circuit nodes, and simulation results
- **breadboard-layout.ts**: Models the breadboard's internal connection structure (terminal strips)
- **circuit-extractor.ts**: Extracts circuit graph from breadboard state using union-find algorithm
- **circuit-simulator.ts**: Simulates circuit voltages and currents using simplified nodal analysis

### UI Layer (`src/ui/`)

- **breadboard-app.ts**: Main application class managing UI rendering and user interactions

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

- Visual representation of wires and components on the breadboard
- More component types (capacitors, switches, batteries)
- Voltage/current visualization with color coding
- Export/import circuit designs
- More sophisticated circuit simulation (AC analysis, transient analysis)
- Mobile-friendly touch interface

## Contributing

This is an educational project. Contributions are welcome! Please ensure:
- Code is properly typed with TypeScript
- Tests are added for new functionality
- Code passes linting (npm run lint)
- Architecture principles are maintained (separation of concerns)

## License

MIT License - see LICENSE file for details
