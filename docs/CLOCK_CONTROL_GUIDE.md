# Clock Control UI for EDU-8 Microprocessor

## Overview

The Clock Control UI provides interactive control over the EDU-8 educational microprocessor's execution. It enables students to step through programs instruction-by-instruction or run them automatically at adjustable frequencies, making the fetch-decode-execute cycle observable and educational.

## Features

### Clock Control Panel

The clock control panel appears automatically in the left toolbar when an EDU-8 microprocessor component is present on the breadboard. It includes:

- **Step Button** (⏯): Execute one clock cycle (one instruction)
- **Run/Pause Button** (▶️/⏸): Start/stop automatic clock pulsing
- **Reset Button** (🔄): Reset the microprocessor to initial state (PC=0, A=0)
- **Frequency Slider**: Adjust automatic clock frequency (0.5 Hz - 10 Hz)
- **Clock State Indicator**: Visual LED showing current clock level (green = high, gray = low)
- **Execution Status**: Shows current state ("Running at X Hz", "Paused (N instructions)", or "Halted")

### Keyboard Shortcuts

- **Space**: Execute one instruction (same as Step button) - only when paused
- **R**: Rotate selected component
- **M**: Toggle audio output
- **Delete/Backspace**: Delete selected component

## Usage

### Basic Operation

1. **Load an EDU-8 Circuit**:
   - Click "📚 Examples" and select "EDU-8 Blink Program"
   - Or manually place an EDU-8 microprocessor from the Component Library

2. **Step Through Program**:
   - Click the "⏯ Step" button (or press Space)
   - Watch the Explain panel update with new CPU state
   - Observe output changes on connected LEDs

3. **Run Automatically**:
   - Click "▶️ Run" to start automatic execution
   - Adjust frequency slider to control speed (1-10 Hz for visibility)
   - Click "⏸ Pause" to stop

4. **Reset**:
   - Click "🔄 Reset" to reinitialize the microprocessor
   - This preserves the loaded program but resets PC, accumulator, and outputs

### Educational Workflow

**Recommended for beginners:**

1. Load the EDU-8 Blink example circuit
2. Open the Explain panel (click on the microprocessor)
3. Use Step (Space key) to execute one instruction at a time
4. Observe how the Program Counter increments
5. Watch the accumulator and output values change
6. See the LED respond to output changes

**For exploring timing:**

1. Load a program with repetitive behavior (Blink, Counter)
2. Use Run with 1 Hz frequency to see slow-motion execution
3. Increase frequency to 5-10 Hz to see faster execution
4. Observe how the LED blink rate correlates with frequency

## Technical Details

### Clock Pulse Behavior

Each clock pulse consists of:

1. **Rising Edge** (low → high): Triggers instruction execution
2. **High Duration**: 50ms (visible for debugging, fast enough for UI)
3. **Falling Edge** (high → low): Returns clock to low state

The EDU-8 microprocessor executes one instruction per rising edge, following the fetch-decode-execute cycle:

- **Fetch**: Read instruction from ROM at current PC
- **Decode**: Parse opcode and operand
- **Execute**: Perform operation and update state
- **PC Increment**: Move to next instruction (or jump)

### Frequency Range

- **Minimum**: 0.5 Hz (one instruction every 2 seconds)
- **Maximum**: 10 Hz (ten instructions per second)
- **Default**: 1 Hz (educational visibility)

Lower frequencies (0.5-2 Hz) are best for observing individual instruction effects. Higher frequencies (5-10 Hz) demonstrate program flow and timing relationships.

### State Updates

When clock pulses occur:

1. The ClockController triggers a clock change event
2. BreadboardApp calls `handleClockEdge()` on the microprocessor
3. The microprocessor executes one instruction
4. Component state updates
5. Circuit re-simulates to update voltages
6. Explain panel refreshes with new CPU state
7. Visual overlays update (voltage heatmap, LEDs)

## Example Programs

### Blink Program (Default Example)

```
0: LDA #1    ; Load 1 into accumulator
1: OUT       ; Output to OUT0 (LED on)
2: LDA #0    ; Load 0 into accumulator
3: OUT       ; Output to OUT0 (LED off)
4: JMP 0     ; Jump back to start
```

**Expected behavior**: LED toggles on/off every 2 instructions (4 clock cycles per complete blink).

### Counter Program

```
0: LDA #0    ; Start at 0
1: OUT       ; Output current value
2: ADD #1    ; Increment
3: JMP 1     ; Loop back
```

**Expected behavior**: Outputs count from 0-15 repeatedly on 4-bit output pins.

### Echo Program

```
0: IN        ; Read inputs
1: OUT       ; Write to outputs
2: JMP 0     ; Loop
```

**Expected behavior**: Copies 4-bit input values to 4-bit output pins in real-time.

## Troubleshooting

### Clock Controls Not Visible

- **Cause**: No EDU-8 microprocessor on breadboard
- **Solution**: Add a microprocessor from Component Library or load an example circuit

### Step Button Disabled

- **Cause**: Clock is currently running in automatic mode
- **Solution**: Click "⏸ Pause" to stop automatic execution before stepping manually

### Program Doesn't Execute

- **Cause**: Microprocessor may be halted (HALT instruction executed)
- **Solution**: Click "🔄 Reset" to restart from beginning

### Status Shows "Halted"

- **Cause**: Program executed a HALT (0xF0) instruction
- **Solution**: This is normal for finite programs. Reset to run again.

## Design Rationale

### Why Clock Control?

The EDU-8 microprocessor is designed to teach **computational electronics** - the connection between software (instructions) and hardware (voltages, currents, LEDs). Clock control makes this connection tangible:

- **Observability**: Students see each instruction's effect on hardware
- **Debuggability**: Step-through execution reveals program logic
- **Timing**: Adjustable frequency demonstrates clock-driven behavior
- **Experimentation**: Manual control encourages exploration

### Educational Goals

1. **Demystify CPUs**: Show that a processor is just a state machine responding to clock edges
2. **Visualize Execution**: Make the fetch-decode-execute cycle concrete
3. **Connect Code to Hardware**: Demonstrate how instructions control I/O pins
4. **Teach Sequential Logic**: Illustrate clock-driven state transitions

## Future Enhancements

Potential features for future versions:

- **Breakpoints**: Pause execution at specific PC values
- **Waveform Visualization**: Plot signal history over time
- **Program Editor**: Edit ROM contents directly in UI
- **Multi-speed Modes**: "Turbo" mode for faster execution
- **Step Backwards**: Undo instruction execution for debugging
- **Trace Recording**: Record and replay execution sequences

## See Also

- [EDU-8 Instruction Set Reference](../docs/EDU8_INSTRUCTION_SET.md)
- [Digital Simulation Guide](../DIGITAL_SIMULATION_GUIDE.md)
- [Component Library](../COMPONENT_LIBRARY.md)
