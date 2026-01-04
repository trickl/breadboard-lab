# Digital Simulation Usage Guide

This guide explains how to use the event-driven digital simulation feature for clock-based circuits, particularly with the EDU-8 microprocessor.

## Overview

Breadboard Lab now supports mixed-signal simulation, combining analog DC analysis with event-driven digital simulation. This enables sequential logic circuits, particularly the EDU-8 microprocessor, to execute instructions in response to clock signals.

## Quick Start Example

```typescript
import { MixedSignalSimulator } from './src/core/mixed-signal-simulator';
import { createInitialEDU8State, loadProgram, PRESET_PROGRAMS } from './src/core/edu8-simulator';
import { ComponentType } from './src/core/types';

// Create simulator
const simulator = new MixedSignalSimulator();

// Create circuit with ground and clock
const circuit = {
  nodes: new Map([
    ['gnd', { id: 'gnd', positions: [] }],
    ['clk', { id: 'clk', positions: [] }],
  ]),
  edges: [
    {
      id: 'ground1',
      component: { id: 'ground1', type: ComponentType.GROUND, positions: [], rotation: 0 },
      nodeA: 'gnd',
      nodeB: 'gnd',
    },
    {
      id: 'clkpwr',
      component: { id: 'clkpwr', type: ComponentType.POWER_SUPPLY, voltage: 0, positions: [], rotation: 0 },
      nodeA: 'clk',
      nodeB: 'gnd',
    },
  ],
};

// Create EDU-8 microprocessor with blink program
let cpuState = createInitialEDU8State();
cpuState = loadProgram(cpuState, PRESET_PROGRAMS.blink);

const cpu = {
  id: 'cpu1',
  type: ComponentType.MICROPROCESSOR,
  positions: [],
  rotation: 0,
  state: cpuState,
};

let components = [cpu];

// Simulate clock pulse
function pulseClock() {
  // Rising edge
  circuit.edges[1].component.voltage = 5.0;
  const r1 = simulator.simulate(circuit, components, {
    enableDigitalSimulation: true,
    clockNodeId: 'clk',
  });
  components = r1.updatedComponents;

  // Falling edge
  circuit.edges[1].component.voltage = 0.0;
  const r2 = simulator.simulate(circuit, components, {
    enableDigitalSimulation: true,
    clockNodeId: 'clk',
  });
  components = r2.updatedComponents;
}

// Execute 4 clock pulses
for (let i = 0; i < 4; i++) {
  pulseClock();
  console.log(`After pulse ${i + 1}:`, {
    pc: components[0].state.programCounter,
    accumulator: components[0].state.accumulator,
    outputs: components[0].state.outputs,
  });
}
```

## EDU-8 Microprocessor

### Overview

The EDU-8 is a simple educational 8-bit microprocessor designed for teaching digital logic and programming concepts.

**Features**:
- 8-bit accumulator
- 4-bit program counter (16 instructions max)
- 4-bit input and output ports (IN0-IN3, OUT0-OUT3)
- 16 bytes of program ROM
- Minimal instruction set (7 instructions)

### Instruction Set

| Opcode | Mnemonic | Description | Example |
|--------|----------|-------------|---------|
| 0x0 | LDA imm4 | Load accumulator with immediate 4-bit value | LDA #5 |
| 0x1 | ADD imm4 | Add immediate 4-bit value to accumulator | ADD #3 |
| 0x2 | IN | Load accumulator from input port | IN |
| 0x3 | OUT | Output accumulator to output port (lower 4 bits) | OUT |
| 0x4 | JZ addr4 | Jump if zero flag set | JZ 10 |
| 0x5 | JMP addr4 | Unconditional jump to address | JMP 0 |
| 0xF | HALT | Stop execution | HALT |

### Preset Programs

**Blink** - Toggles OUT0 on each cycle:
```
0: LDA #1    ; Load 1
1: OUT       ; Output (OUT0 = 1)
2: LDA #0    ; Load 0
3: OUT       ; Output (OUT0 = 0)
4: JMP 0     ; Loop
```

**Counter** - Counts up 0-15:
```
0: LDA #0    ; Start at 0
1: OUT       ; Output current value
2: ADD #1    ; Increment
3: JMP 1     ; Loop
```

**Echo** - Copies inputs to outputs:
```
0: IN        ; Read inputs
1: OUT       ; Write to outputs
2: JMP 0     ; Loop
```

**Pattern** - Outputs alternating pattern (0xA, 0x5):
```
0: LDA #10   ; Load 0xA
1: OUT       ; Output
2: LDA #5    ; Load 0x5
3: OUT       ; Output
4: JMP 0     ; Loop
```

## Mixed-Signal Simulator API

### Configuration

```typescript
interface MixedSignalConfig {
  enableDigitalSimulation: boolean;  // Enable digital simulation
  clockNodeId?: string;              // Node ID of clock signal (required if digital enabled)
  maxIterations?: number;            // Max convergence iterations (default: 10)
}
```

### simulate()

```typescript
simulate(
  circuit: Circuit,
  components: AnyComponent[],
  config: MixedSignalConfig
): { 
  result: MixedSignalResult; 
  updatedComponents: AnyComponent[];
}
```

**Returns**:
- `result`: Simulation result with voltages, currents, errors, and digital state
- `updatedComponents`: Updated component array with new digital component states

**Important**: Always use the returned `updatedComponents` for the next simulation call to maintain digital state continuity (program counter, clock edge detection, etc.).

### resetDigitalState()

```typescript
resetDigitalState(): void
```

Resets all digital simulation state (edge detectors, event queue). Call this when:
- Starting a new circuit
- Resetting the microprocessor
- Changing the circuit topology

## Digital Signal Abstraction

### TTL Voltage Thresholds

The system uses TTL-compatible voltage levels:

- **Input Low (V_IL)**: < 0.8V → Digital 0
- **Input High (V_IH)**: > 2.0V → Digital 1
- **Undefined**: 0.8V - 2.0V → Digital X (unknown)
- **Output Low (V_OL)**: 0.2V
- **Output High (V_OH)**: 4.5V

### Conversion Functions

```typescript
import { analogToDigital, digitalToAnalog } from './src/core/digital-signals';

// Analog to digital
const digital = analogToDigital(3.3); // Returns 1 (high)

// Digital to analog
const voltage = digitalToAnalog(1); // Returns 4.5V
```

## Edge Detection

### How It Works

The edge detector tracks the previous digital state of each pin and compares it to the current state:

- **Rising edge**: Previous = 0, Current = 1
- **Falling edge**: Previous = 1, Current = 0
- **No edge**: Previous = Current

**Important**: Edge detectors are stateful and must persist across simulation steps. The `MixedSignalSimulator` handles this automatically.

### Manual Usage

```typescript
import { createEdgeDetector, detectRisingEdge } from './src/core/edge-detector';

const detector = createEdgeDetector(0); // Start at 0

console.log(detectRisingEdge(detector, 0)); // false (no edge)
console.log(detectRisingEdge(detector, 1)); // true (rising edge!)
console.log(detectRisingEdge(detector, 1)); // false (no edge, stays high)
console.log(detectRisingEdge(detector, 0)); // false (falling edge, not rising)
```

## Getting EDU-8 Output Voltages

Convert EDU-8 4-bit outputs to analog voltages for circuit integration:

```typescript
import { getMicroprocessorOutputVoltages } from './src/core/digital-simulator';

const cpu = components[0] as Microprocessor;
const [out0, out1, out2, out3] = getMicroprocessorOutputVoltages(cpu);

// If outputs = 0b0101 (binary 5):
// out0 = 4.5V (bit 0 = 1)
// out1 = 0.2V (bit 1 = 0)
// out2 = 4.5V (bit 2 = 1)
// out3 = 0.2V (bit 3 = 0)
```

## Best Practices

### 1. Always Update Clock with Power Supply

Don't set `node.voltage` directly. Instead, update the power supply component's voltage:

```typescript
// ❌ Wrong - DC solver will overwrite
circuit.nodes.get('clk').voltage = 5.0;

// ✓ Right - DC solver respects power supply
const clkPwr = circuit.edges.find(e => e.component.type === ComponentType.POWER_SUPPLY);
clkPwr.component.voltage = 5.0;
```

### 2. Use Returned Components

Always use the `updatedComponents` from the previous simulation:

```typescript
// ❌ Wrong - loses digital state
simulator.simulate(circuit, [cpu], config);
simulator.simulate(circuit, [cpu], config); // PC won't advance!

// ✓ Right - maintains state
let { updatedComponents } = simulator.simulate(circuit, [cpu], config);
({ updatedComponents } = simulator.simulate(circuit, updatedComponents, config));
```

### 3. Reset Digital State When Needed

Reset the digital state when starting fresh or after circuit changes:

```typescript
simulator.resetDigitalState();
let cpuState = createInitialEDU8State();
cpuState = loadProgram(cpuState, newProgram);
// Now ready for fresh simulation
```

### 4. Check Simulation Success

Always check the result's success flag:

```typescript
const { result, updatedComponents } = simulator.simulate(circuit, components, config);

if (!result.success) {
  console.error('Simulation failed:', result.error);
  return;
}

// Continue with updatedComponents
```

## Troubleshooting

### EDU-8 Not Executing

**Problem**: Program counter stays at 0, instructions don't execute.

**Solutions**:
1. Ensure `enableDigitalSimulation: true` in config
2. Provide valid `clockNodeId` in config
3. Check that clock node has power supply driving it
4. Verify clock transitions between 0V and 5V (not just set once)
5. Use returned `updatedComponents` for next simulation

### No Rising Edge Detected

**Problem**: Clock changes but no instruction executes.

**Solutions**:
1. Make sure clock transitions from low (< 0.8V) to high (> 2.0V)
2. Ensure you're using the same `MixedSignalSimulator` instance (maintains edge detector state)
3. Don't call `resetDigitalState()` between clock pulses
4. Clock must go LOW then HIGH for each edge (not just HIGH → HIGHER)

### Outputs Don't Change

**Problem**: EDU-8 executes but outputs remain 0.

**Solutions**:
1. Check that program includes `OUT` instructions
2. Verify program is loaded correctly with `loadProgram()`
3. Confirm accumulator has non-zero value before `OUT`
4. Use `getMicroprocessorOutputVoltages()` to see digital output voltages

## Testing

See `src/core/__tests__/` for comprehensive test examples:
- `digital-signals.test.ts` - Signal conversion tests
- `edge-detector.test.ts` - Edge detection tests
- `digital-simulator.test.ts` - EDU-8 execution tests
- `mixed-signal-simulator.test.ts` - Full integration tests

Run tests:
```bash
npm test                    # Run all tests
npm test -- digital-        # Run only digital simulation tests
npm test -- --ui           # Run with UI
```

## Next Steps

- Integrate clock control UI (step button, run/pause)
- Add EDU-8 state visualization in Explain Panel
- Create program editor for EDU-8 ROM
- Add more digital components (flip-flops, counters, etc.)
