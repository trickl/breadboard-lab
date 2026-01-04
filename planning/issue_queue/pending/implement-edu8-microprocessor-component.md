Implement EDU-8 virtual microprocessor component with instruction execution

## Context

Breadboard Lab currently provides passive components (resistors, LEDs), power supplies, and audio output (speaker), but lacks any programmable logic component. The planning document explicitly requires a **simple microprocessor component** to enable educational circuits demonstrating clock-driven behavior, sequential logic, and basic programming concepts.

Without a microprocessor component, students cannot:
- Explore clock-driven circuits
- Learn about sequential logic and state machines
- Understand how digital outputs respond to inputs
- Build interactive circuits with programmable behavior
- Experience the connection between software (program) and hardware (I/O pins)

## Gap Analysis

**Long-term goal** (`planning/vision/goal.md`, lines 366-394):
> "Simple microprocessor component — required"
> - Component name: EDU-8 Microprocessor (virtual IC)
> - Simulated internal behavior (not stubbed)
> - Operates on clock input and reset
> - Provides simple I/O pins
> - Acceptance criteria:
>   - A canonical program toggles outputs deterministically under a clock
>   - Reset produces a defined initial state
>   - Explain panel shows PC/opcode/output

**Canonical example requirement** (`planning/vision/goal.md`, line 431):
> "Simple clock-driven circuit (microprocessor + clock)" must be included in built-in examples

**Current state** (`planning/state/system_capabilities.md`):
- ❌ No microprocessor component exists in the component library
- ❌ No digital/event simulation beyond DC voltage/current analysis
- ❌ No clock-driven or sequential logic components
- ❌ No instruction execution or programmable behavior
- Component library (35 entries) includes only analog components and virtual power/ground

**Gap**: The planning document explicitly requires an EDU-8 microprocessor as a non-negotiable feature, but it is completely absent from the system.

## Proposed Development Task

**Implement EDU-8 virtual microprocessor component with instruction execution**

### Scope

Create a virtual microprocessor component that:
1. Appears in component library as placeable IC (DIP-like package)
2. Has defined pinout: VCC, GND, CLK, RST, IN[3:0], OUT[3:0], HALT
3. Executes a minimal instruction set from internal ROM
4. Updates outputs on rising clock edges
5. Responds to reset signal
6. Shows internal state in Explain panel (PC, opcode, accumulator, flags)
7. Integrates with existing DC simulation (digital I/O pins have voltage levels)

### Technical Approach

**Phase 1: Component Definition**

Define `EDU-8` component in library catalog:
```typescript
{
  id: 'edu8-microprocessor',
  name: 'EDU-8 Microprocessor (Educational)',
  category: 'virtual-educational',
  package: {
    kind: 'dip',
    pinCount: 16, // 8 per side
    body: { lengthMm: 19.05, widthMm: 6.35 } // Standard DIP-16
  },
  footprint: {
    pins: [
      { pinId: 'VCC', role: 'power' },
      { pinId: 'GND', role: 'ground' },
      { pinId: 'CLK', role: 'clock-input' },
      { pinId: 'RST', role: 'reset-input' },
      { pinId: 'IN0', role: 'digital-input' },
      { pinId: 'IN1', role: 'digital-input' },
      { pinId: 'IN2', role: 'digital-input' },
      { pinId: 'IN3', role: 'digital-input' },
      { pinId: 'OUT0', role: 'digital-output' },
      { pinId: 'OUT1', role: 'digital-output' },
      { pinId: 'OUT2', role: 'digital-output' },
      { pinId: 'OUT3', role: 'digital-output' },
      { pinId: 'HALT', role: 'digital-output' },
      // NC pins for physical DIP-16 package
    ]
  },
  electrical: {
    supplyVoltageMin: 3.0,
    supplyVoltageMax: 5.5,
    inputHighThreshold: 2.0, // Volts
    outputHighVoltage: 4.5,  // Volts (when powered by 5V)
    outputLowVoltage: 0.2    // Volts
  }
}
```

**Phase 2: Internal State Machine**

Implement execution model:
```typescript
interface EDU8State {
  accumulator: number;    // 8-bit register
  programCounter: number; // 4-bit (0-15)
  zeroFlag: boolean;
  halted: boolean;
  rom: Uint8Array;        // 16 bytes program memory
  inputs: number;         // 4-bit input snapshot
  outputs: number;        // 4-bit output register
}

// Instruction set (4 bits opcode + 4 bits operand)
enum Opcode {
  LDA = 0x0,  // LDA imm4  - Load accumulator with immediate
  ADD = 0x1,  // ADD imm4  - Add immediate to accumulator
  IN  = 0x2,  // IN        - Load accumulator from inputs
  OUT = 0x3,  // OUT       - Output accumulator to outputs
  JZ  = 0x4,  // JZ addr4  - Jump if zero flag set
  JMP = 0x5,  // JMP addr4 - Unconditional jump
  HALT= 0xF   // HALT      - Stop execution
}
```

**Phase 3: Clock-Driven Execution**

Add simulation step that:
1. Detects rising edge on CLK pin (voltage transition from <1V to >2V)
2. Checks RST pin (active high resets state)
3. Fetches instruction from ROM[PC]
4. Executes instruction (updates accumulator, outputs, PC, flags)
5. Advances PC (or jumps)
6. Updates digital output pin voltages based on output register

**Phase 4: Integration with Existing Simulation**

Extend circuit simulator to handle digital components:
- Digital outputs drive voltage sources (HIGH = 4.5V, LOW = 0.2V)
- Digital inputs sample voltage levels (>2V = HIGH, <0.8V = LOW)
- Clock input edge detection (requires storing previous voltage)
- Reset input level sensing
- Power supply validation (VCC must be 3-5.5V)

**Phase 5: Program Configuration UI**

Add property editor for microprocessor:
- Display current ROM contents as hex bytes
- Allow editing program (16-byte hex editor)
- Provide example programs as presets:
  - "Blink" - Toggle OUT0 on each clock
  - "Counter" - Count up on outputs
  - "Echo" - Copy inputs to outputs
- Reset button to reinitialize state

**Phase 6: Explain Panel Integration**

When microprocessor is clicked, show:
- Current program counter (0-15)
- Current instruction (mnemonic and operands)
- Accumulator value (hex and binary)
- Zero flag state
- Input pin states (4-bit binary)
- Output pin states (4-bit binary)
- HALT state
- Next instruction to execute

**Phase 7: Canonical Example Circuit**

Create `blinky-microprocessor.json` example:
- EDU-8 microprocessor
- Clock generator (simple oscillator or manual pulse source)
- Power supply (5V)
- Ground
- LED connected to OUT0 with current-limiting resistor
- Program that toggles OUT0 on each clock cycle

### Success Criteria

- [ ] EDU-8 component appears in component library browser
- [ ] Component can be placed on breadboard with 16-pin DIP footprint
- [ ] Clicking component shows Explain panel with internal state
- [ ] Program ROM can be edited via property editor
- [ ] Preset programs are available (Blink, Counter, Echo)
- [ ] Clock rising edge triggers instruction execution
- [ ] Reset sets PC=0, A=0, outputs=0, halted=false
- [ ] Digital outputs drive LEDs and other components
- [ ] Digital inputs can read button states or other outputs
- [ ] HALT instruction stops execution until reset
- [ ] Canonical "Blinky" example circuit demonstrates clock-driven LED toggle
- [ ] Unit tests verify instruction execution logic
- [ ] Integration tests verify clock edge detection and state updates

### Educational Impact

This feature transforms Breadboard Lab from a pure analog circuit tool into a platform for teaching **computational electronics**:

**Students learn:**
- How clock signals drive sequential operations
- The connection between software (program) and hardware (I/O)
- Basic machine code and instruction execution
- State machines and sequential logic
- Digital input/output interfacing
- Difference between combinational (resistors, LEDs) and sequential (microprocessor) circuits

**Use cases:**
- Blinking LED with software control (vs. timer IC)
- Binary counter output
- Input-controlled output (button → LED logic)
- Simple pattern generators
- Introduction to embedded systems concepts

**Pedagogical value:**
The EDU-8 is intentionally simplified (4-bit I/O, 16-byte ROM, minimal instruction set) to be:
- Teachable in minutes
- Understandable by inspection (Explain panel shows all state)
- Debuggable step-by-step (manual clock pulses)
- Not overwhelming (no interrupts, peripherals, complex memory)

### Alignment with Vision

This task directly implements a **required** capability from the planning document:

- `goal.md` lines 366-394: "Simple microprocessor component — required"
  - EDU-8 Microprocessor with simulated internal behavior
  - Acceptance criteria explicitly defined (toggle outputs, reset behavior, Explain panel)
  
- `goal.md` line 431: Canonical example "Simple clock-driven circuit (microprocessor + clock)"

- `goal.md` lines 344-352: "Digital/event simulation" requirement
  - "Supports event-driven/clocked logic simulation with values {0,1,Z,X}"
  - "Analog/digital bridges are explicit"

The planning document categorizes this as a **required** feature, not optional or future work.

### Priority Justification

This is the most important next task because:

1. **Explicitly required**: The planning document mandates this component and lists it as non-negotiable

2. **Educational mission alignment**: The tool's purpose is teaching electronics; microprocessor bridges software and hardware

3. **Expands capability domain**: Currently only analog circuits work; this enables digital/sequential logic education

4. **Foundational for advanced features**: Clock-driven circuits open the door to timers, counters, state machines, and embedded systems concepts

5. **Well-specified**: The planning document provides complete specification (pinout, instruction set, execution model, acceptance criteria)

6. **Reasonable complexity**: Scoped to be implementable (not a full 8051 or Arduino emulator) while remaining educational

7. **High impact**: Unlocks an entirely new category of educational circuits and teaching opportunities

8. **Missing dependency for canonical examples**: The "clock-driven circuit" example cannot be created without this component

### Non-Goals

This task specifically does **NOT** include:

- Full 8-bit microcontroller emulation (AVR, PIC, 8051)
- Firmware development toolchain (assembler, compiler)
- Debugging features (breakpoints, watchpoints)
- Interrupts or peripheral devices
- Multi-byte programs or RAM
- Communication protocols (UART, SPI, I2C)
- Real-time constraints or accurate timing
- Integration with external development tools

The EDU-8 is a **teaching device**, not a production microcontroller. It prioritizes understandability and observability over performance and features.

## Implementation Plan

### Step 1: Define Component Type and Library Entry (1 day)

- Add EDU-8 component definition to library catalog
- Define pinout and electrical characteristics
- Create component type in `types.ts`
- Register in component library

### Step 2: Implement Execution Engine (2 days)

- Create `edu8-simulator.ts` with state machine
- Implement instruction fetch/decode/execute
- Implement all 7 instruction types (LDA, ADD, IN, OUT, JZ, JMP, HALT)
- Add ROM storage and loading
- Unit tests for instruction execution (30+ tests covering all opcodes and edge cases)

### Step 3: Integrate with Circuit Simulation (2 days)

- Extend circuit simulator to detect digital components
- Add clock edge detection (voltage level sampling)
- Add reset signal handling
- Map digital output register to voltage sources
- Map digital input voltages to input register
- Integration tests for clock/reset behavior

### Step 4: Visual Rendering (1 day)

- Add DIP-16 package rendering to PixiRenderer
- Render pin labels (VCC, GND, CLK, RST, IN0-3, OUT0-3, HALT)
- Show chip body with "EDU-8" label
- Support component rotation

### Step 5: Program Editor UI (1 day)

- Add microprocessor property editor panel
- 16-byte hex editor for ROM contents
- Preset program dropdown (Blink, Counter, Echo)
- Reset button to reinitialize state
- Program validation (detect invalid opcodes)

### Step 6: Explain Panel Integration (1 day)

- Add EDU-8-specific Explain panel content
- Show current state (PC, instruction, A, flags, I/O)
- Decode instruction mnemonic and operands
- Explain what instruction will do next
- Show power status and clock state

### Step 7: Canonical Example Circuit (1 day)

- Create `blinky-microprocessor.json` example
- EDU-8 + clock + LED + resistor + power
- Program: simple output toggle
- Add to example library with description and learning objectives
- Add to README documentation

### Step 8: Documentation (1 day)

- Document EDU-8 instruction set reference
- Document programming examples and patterns
- Add to COMPONENT_LIBRARY.md
- Update README with microprocessor features
- Create tutorial in planning docs

## Estimated Effort

**Total: 10 days of focused development**

- Core implementation: 5 days (component, simulator, integration)
- UI/UX: 3 days (rendering, property editor, Explain panel)
- Testing and documentation: 2 days (unit tests, integration tests, examples, docs)

## Dependencies

All required infrastructure already exists:
- ✅ Component library system (can add new component)
- ✅ Circuit simulation pipeline (can extend for digital)
- ✅ PixiJS renderer (can add new visual)
- ✅ Property editor system (can add new panel)
- ✅ Explain panel system (can add new content)
- ✅ Example circuit system (can add new example)

New dependencies:
- Clock signal source (may need clock generator component or use function generator pattern)
- Voltage level sampling (new simulator capability)
- State persistence across simulation steps (new simulator state)

## Risks and Mitigations

**Risk**: Clock edge detection may be complex with DC-only simulation
- *Mitigation*: Store previous voltage per digital input; detect transition on each simulation step; use simple threshold logic

**Risk**: Digital and analog domains may conflict (voltage sources from digital outputs)
- *Mitigation*: Model digital outputs as ideal voltage sources in MNA matrix; document analog/digital bridge behavior

**Risk**: Instruction execution may be slow or cause performance issues
- *Mitigation*: Execute only on clock edges (not every frame); use efficient state machine; profile and optimize if needed

**Risk**: Program editor UX may be confusing for beginners
- *Mitigation*: Provide clear presets; validate inputs; show helpful error messages; document instruction set reference

**Risk**: Debugging incorrect programs may be difficult
- *Mitigation*: Explain panel shows full state; manual clock allows step-through; preset programs are known-good

**Risk**: Scope creep (requests for more instructions, larger ROM, interrupts)
- *Mitigation*: Document intentional limitations; refer to educational goals; defer enhancements to separate tasks

## References

- `planning/vision/goal.md` - Lines 366-394: "Simple microprocessor component — required"
- `planning/vision/goal.md` - Lines 344-352: "Digital/event simulation"
- `planning/vision/goal.md` - Line 431: Canonical example with microprocessor
- `planning/state/system_capabilities.md` - No microprocessor implementation exists

## Success Metrics

After implementation:
1. ✅ EDU-8 component in library and placeable on breadboard
2. ✅ Clock-driven instruction execution verified with unit tests
3. ✅ Digital outputs control LEDs and other components
4. ✅ Digital inputs read circuit voltages
5. ✅ Reset functionality returns to initial state
6. ✅ Program editor allows ROM modification with presets
7. ✅ Explain panel shows internal CPU state in real-time
8. ✅ "Blinky" canonical example demonstrates clock-driven LED toggle
9. ✅ Documentation explains instruction set and programming model
10. ✅ Zero regressions in existing tests

This task establishes programmable logic capability, unlocking an entirely new domain of educational circuits and bringing the system into alignment with its planning document requirements.
