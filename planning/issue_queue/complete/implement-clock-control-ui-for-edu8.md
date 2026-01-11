Implement interactive clock control UI for EDU-8 microprocessor

## Context

Breadboard Lab successfully implemented the EDU-8 educational microprocessor (PR #173) with a complete 7-instruction ISA and event-driven digital simulation infrastructure (PR #191). The microprocessor can execute programs, maintain internal state (program counter, accumulator, flags, I/O), and respond to clock signals. However, the digital simulation currently operates only through programmatic API calls—there is **no user interface** for students to control the clock, step through programs, or interact with the microprocessor.

Without clock control UI, the EDU-8 microprocessor is a hidden feature: it can be placed on the breadboard and its state is visible in the Explain panel, but students have no way to execute programs, observe instruction-by-instruction behavior, or experiment with clock-driven circuits.

## Gap Analysis

**Long-term goal** (`planning/vision/goal.md`, lines 367-394):

> "Simple microprocessor component — required"
>
> - Simulated internal behavior (not stubbed)
> - Operates on a clock input and reset
> - Scope is intentionally bounded to avoid general firmware emulation complexity
> - Acceptance criteria: "A canonical program toggles outputs deterministically under a clock"
> - Acceptance criteria: "Explain panel shows PC/opcode/output"

The goal emphasizes that the microprocessor must "operate on a clock input" and produce observable, deterministic behavior. The educational value proposition requires students to see the fetch-decode-execute cycle in action.

**Current state** (`planning/state/system_capabilities.md`, lines 86-159):

- ✅ EDU-8 simulator fully implemented with 7 instructions, 4-bit I/O, accumulator, PC, zero flag
- ✅ Clock-driven execution via `handleClockEdge()` method (one instruction per rising edge)
- ✅ Digital simulation infrastructure (analog↔digital conversion, edge detection, mixed-signal coordination)
- ✅ Explain panel shows real-time CPU state (PC, instruction mnemonic, accumulator, zero flag, I/O ports)
- ✅ Preset programs available (Blink, Counter, Echo, Pattern)
- ❌ **No clock control UI** (step button, run/pause, reset)
- ❌ **No UI for generating clock signals** (clock is abstracted as power supply voltage, manually controlled)
- ❌ **No example circuits demonstrating clock-driven behavior**
- ❌ **No visual feedback for clock state** (students can't see if clock is high or low)

From `planning/state/system_capabilities.md` lines 144-150:

> "**Deferred Features** (require UI or additional architectural work):
>
> - ❌ Clock control UI (step button, run/pause, reset)
> - ❌ Property editor UI for ROM programming
> - ❌ Example circuits with clock generators
> - ❌ Waveform visualization for digital signals"

**Gap**: The digital simulation API is complete and functional, but there is no user-facing interface to control the clock signal that drives the EDU-8. This prevents students from using the microprocessor educationally.

## Proposed Development Task

**Implement interactive clock control UI for EDU-8 microprocessor with step, run, reset, and clock state visualization**

### Scope

Create a clock control panel UI that enables students to:

1. **Step**: Execute one clock cycle (low→high→low pulse) to run one instruction
2. **Run**: Automatically execute clock pulses at configurable frequency (e.g., 1 Hz, 2 Hz, 5 Hz, 10 Hz)
3. **Pause**: Stop automatic clock pulsing
4. **Reset**: Assert reset signal to initialize microprocessor to known state (PC=0, A=0)
5. **Visual feedback**: Show current clock state (high/low) and execution status (running/paused/halted)

### Technical Approach

**Phase 1: Clock Signal Abstraction**

- Introduce `ClockController` class to manage clock state and pulsing logic
- Abstract clock signal generation from power supply manipulation
- Support both manual stepping (one pulse on demand) and automatic pulsing (periodic timer)
- Maintain clock high/low state and expose it for UI visualization

**Phase 2: UI Components**

- Add clock control panel to left toolbar (below audio controls, above view switcher)
- **Step button** (⏯ icon): Trigger single clock pulse when paused
- **Run/Pause button** (▶️/⏸ icon): Start/stop automatic clock pulsing
- **Reset button** (🔄 icon): Assert reset signal and reinitialize microprocessor
- **Frequency selector**: Dropdown or slider for clock frequency (0.5 Hz - 10 Hz range for educational visibility)
- **Clock state indicator**: Visual LED showing current clock level (green when high, gray when low)
- **Execution status text**: "Running at 2 Hz" / "Paused" / "Halted (program ended)"

**Phase 3: Digital Simulation Integration**

- Modify `MixedSignalSimulator` integration in `BreadboardApp` to accept clock pulses from `ClockController`
- Update circuit on each clock pulse (step or automatic)
- Re-run simulation and update overlays after each instruction execution
- Display updated CPU state in Explain panel in real-time

**Phase 4: Visual Feedback**

- Highlight EDU-8 component during clock pulse (brief flash on instruction execution)
- Animate clock state indicator (smooth transition between high/low)
- Show instruction count and execution time in control panel
- Disable step/run buttons when no EDU-8 component present

**Phase 5: Example Circuit**

- Create canonical example: "EDU-8 Blink Program"
  - EDU-8 microprocessor with Blink preset program loaded
  - OUT0 connected to LED through resistor
  - Power supply and ground
- Include instructions: "Click Step to execute one instruction, or Run to execute automatically"
- Demonstrate deterministic toggling behavior as specified in goal.md acceptance criteria

### Success Criteria

- [ ] Clock control panel renders in UI when EDU-8 component present
- [ ] Step button executes single clock pulse (low→high→low) and advances PC by 1
- [ ] Run button starts automatic pulsing at selected frequency
- [ ] Pause button stops automatic pulsing
- [ ] Reset button reinitializes EDU-8 to PC=0, A=0, Z=false
- [ ] Clock state indicator shows current clock level (high/low) visually
- [ ] Frequency selector allows adjusting clock speed (0.5 Hz - 10 Hz)
- [ ] Explain panel updates immediately after each instruction execution
- [ ] Voltage overlay updates to reflect new output values after execution
- [ ] Control panel hides when no EDU-8 component on breadboard
- [ ] Example circuit "EDU-8 Blink Program" demonstrates clock-driven LED toggling
- [ ] Documentation explains clock control usage and educational purpose

### Educational Impact

**Enables observational learning:**

- Students can **step through programs instruction-by-instruction**, observing how PC increments, accumulator changes, and outputs update
- Students can **see the fetch-decode-execute cycle** in slow motion (1 Hz clock makes each step visible)
- Students can **experiment with different clock frequencies** to understand timing relationships
- Students can **debug programs** by stepping through and inspecting state at each instruction

**Demonstrates computational electronics:**

- Clock-driven circuits become accessible (currently require programmatic API usage)
- Sequential logic concepts (state machines, counters) become experimentally verifiable
- Connection between software (instructions) and hardware (I/O pins) becomes tangible
- Real-time state visualization in Explain panel makes abstract CPU state concrete

**Unlocks preset programs:**
The four preset programs (Blink, Counter, Echo, Pattern) become **usable** rather than just testable:

- **Blink**: Toggle LED on/off each instruction → shows output control
- **Counter**: Count 0-15 on output pins → shows arithmetic and display
- **Echo**: Copy input switches to output LEDs → shows I/O interaction
- **Pattern**: Display bit patterns → shows program sequencing

### Alignment with Vision

This task directly implements deferred features identified in the EDU-8 implementation (PR #173):

From `planning/state/system_capabilities.md` lines 144-150:

> "**Deferred Features** (require UI or additional architectural work):
>
> - ❌ Clock control UI (step button, run/pause, reset) ← **THIS TASK**"

The task also fulfills acceptance criteria from `planning/vision/goal.md` lines 391-394:

> "Acceptance criteria:
>
> - [ ] A canonical program toggles outputs deterministically under a clock ← **Enabled by this UI**
> - [ ] Reset produces a defined initial state ← **Reset button**
> - [ ] Explain panel shows PC/opcode/output ← **Already implemented, made interactive by clock control**"

### Priority Justification

This is the most important next task because:

1. **Unlocks existing investment**: EDU-8 microprocessor and digital simulation represent significant development effort (PR #173: 200+ lines, PR #191: 2500+ lines, 101 tests) but are currently unusable for students

2. **Educational completeness**: The microprocessor's educational value is fully realized only when students can interact with it—step through programs, observe state changes, and experiment with timing

3. **Foundational for sequential logic**: Clock control is prerequisite for any clock-driven circuits (counters, shift registers, state machines) which are core to computational electronics education

4. **Explicitly required by goal**: The acceptance criteria state "a canonical program toggles outputs deterministically under a clock"—this requires manual clock control to demonstrate

5. **High impact, low risk**:
   - Digital simulation API is complete and tested (101 tests, 100% coverage)
   - UI integration is well-understood (similar to existing audio controls)
   - No new core algorithms required—only UI layer
   - Clear success criteria and low technical risk

6. **Enables other features**: Once clock control exists, future enhancements become possible:
   - Waveform visualization (capture signal history over clock cycles)
   - Breakpoints (pause execution at specific PC values)
   - Program editor UI (edit ROM while paused)

7. **Completes the EDU-8 feature**: Without this UI, EDU-8 is "implemented but not integrated"—the feature exists in code but not in user experience

### Non-Goals

This task specifically does **NOT** include:

- Property editor UI for ROM programming (use preset programs initially)
- Waveform/timing diagram visualization (separate feature)
- Breakpoint support or advanced debugging UI
- Multi-clock domain support (single global clock is sufficient)
- Automatic clock generation from circuit (manual control only)
- Full 16-pin DIP IC visual rendering (simplified placement is acceptable)
- Example circuits beyond one demonstration circuit

These can be added incrementally after the foundational clock control exists.

## Implementation Plan

### Step 1: ClockController Class

Create `src/core/clock-controller.ts`:

```typescript
export class ClockController {
  private clockState: boolean = false; // false = low, true = high
  private isRunning: boolean = false;
  private frequency: number = 1; // Hz
  private intervalId: number | null = null;

  step(): void {
    // Execute one full clock pulse: low→high→low
    this.clockState = true;
    this.onClockChange?.(true);
    setTimeout(() => {
      this.clockState = false;
      this.onClockChange?.(false);
    }, 50); // 50ms high pulse
  }

  run(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const period = 1000 / this.frequency;
    this.intervalId = setInterval(() => this.step(), period);
  }

  pause(): void {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(): void {
    this.pause();
    this.clockState = false;
    this.onReset?.();
  }

  setFrequency(hz: number): void {
    this.frequency = hz;
    if (this.isRunning) {
      this.pause();
      this.run();
    }
  }

  getState(): { clockState: boolean; isRunning: boolean; frequency: number } {
    return { clockState: this.clockState, isRunning: this.isRunning, frequency: this.frequency };
  }

  onClockChange?: (state: boolean) => void;
  onReset?: () => void;
}
```

### Step 2: UI Components

Add to `src/ui/breadboard-app.ts`:

```typescript
private renderClockControls(): void {
  const hasMicroprocessor = this.state.components.some(c => c.type === 'MICROPROCESSOR');
  const controlPanel = document.getElementById('clock-controls');

  if (!hasMicroprocessor) {
    controlPanel.style.display = 'none';
    return;
  }

  controlPanel.style.display = 'block';
  // Render step, run/pause, reset buttons
  // Render frequency selector
  // Render clock state indicator
  // Attach event listeners
}
```

Add to `index.html` and `style.css`:

```html
<div id="clock-controls" class="clock-panel">
  <h3>Clock Control</h3>
  <div class="clock-buttons">
    <button id="step-btn" title="Step (execute one instruction)">⏯ Step</button>
    <button id="run-btn" title="Run continuously">▶️ Run</button>
    <button id="pause-btn" title="Pause execution">⏸ Pause</button>
    <button id="reset-btn" title="Reset microprocessor">🔄 Reset</button>
  </div>
  <div class="clock-frequency">
    <label>Frequency: <span id="freq-value">1 Hz</span></label>
    <input type="range" id="freq-slider" min="0.5" max="10" step="0.5" value="1" />
  </div>
  <div class="clock-state">
    <span class="clock-indicator" id="clock-led"></span>
    <span id="clock-status">Paused</span>
  </div>
</div>
```

### Step 3: Integration with Digital Simulation

Modify `BreadboardApp.handleClockPulse()`:

```typescript
private handleClockPulse(clockHigh: boolean): void {
  // Find power supply controlling clock node
  const clockEdge = this.circuit.edges.find(e => e.id === 'clock');
  if (clockEdge && clockEdge.component.type === 'POWER_SUPPLY') {
    clockEdge.component.voltage = clockHigh ? 5.0 : 0.0;
  }

  // Re-extract and re-simulate
  this.extractAndSimulate();

  // Update overlays and explain panel
  this.render();
}
```

### Step 4: Example Circuit

Create `src/examples/edu8-blink.json`:

```json
{
  "components": [
    {
      "id": "cpu1",
      "type": "MICROPROCESSOR",
      "position1": { "row": 10, "column": 5 },
      "position2": { "row": 10, "column": 6 },
      "metadata": {
        "program": "blink",
        "description": "EDU-8 running Blink program (toggles OUT0)"
      }
    },
    {
      "id": "led1",
      "type": "LED",
      "position1": { "row": 8, "column": 7 },
      "position2": { "row": 10, "column": 7 },
      "metadata": { "forwardVoltage": 2.0 }
    },
    {
      "id": "r1",
      "type": "RESISTOR",
      "position1": { "row": 8, "column": 8 },
      "position2": { "row": 10, "column": 8 },
      "metadata": { "resistance": 220 }
    }
  ]
}
```

Register in `src/examples/index.ts` and add to UI examples list.

## Estimated Effort

3-4 days of focused development:

- **Day 1**: Implement `ClockController` class with step/run/pause/reset logic; write unit tests
- **Day 2**: Create clock control UI panel with buttons, frequency selector, state indicator; integrate with BreadboardApp
- **Day 3**: Connect ClockController to digital simulation; update circuit on clock pulses; visual feedback (highlight, status text)
- **Day 4**: Create EDU-8 Blink example circuit; documentation (usage guide, educational notes); polish and testing

## Dependencies

All required infrastructure already exists:

- ✅ EDU-8 microprocessor with instruction execution (`src/core/edu8-simulator.ts`)
- ✅ Digital simulation with clock edge detection (`src/core/digital-simulator.ts`, `src/core/mixed-signal-simulator.ts`)
- ✅ Explain panel showing CPU state (`src/ui/explain-panel.ts`)
- ✅ UI panels and controls pattern (audio controls provide reference implementation)
- ✅ Component detection logic (check for MICROPROCESSOR type in state)
- ✅ Preset programs (Blink, Counter, Echo, Pattern already implemented)

## Risks and Mitigations

**Risk**: Clock pulsing interferes with other UI interactions (component placement, dragging)

- _Mitigation_: Disable clock controls during active drag operations; pause clock when modal dialogs open

**Risk**: High-frequency clock (10 Hz) causes performance issues with re-rendering

- _Mitigation_: Optimize render pipeline; batch updates; use requestAnimationFrame; provide performance warning for high frequencies

**Risk**: Students don't understand clock control metaphor (step/run/pause)

- _Mitigation_: Add tooltips with clear explanations; include usage instructions in example circuit; provide educational documentation

**Risk**: Clock state indicator is not noticeable enough

- _Mitigation_: Use bright green color when high; add animation/glow effect; position prominently in control panel

**Risk**: Reset button behavior is unclear (what state does it produce?)

- _Mitigation_: Document reset behavior clearly; show confirmation message or undo option; reset to well-defined initial state (PC=0, A=0, Z=false)

## References

- `planning/vision/goal.md` - Lines 367-394: "Simple microprocessor component — required"
- `planning/state/system_capabilities.md` - Lines 86-159: EDU-8 microprocessor implementation and deferred features
- `planning/state/system_capabilities.md` - Lines 727-990: Digital simulation infrastructure (PR #191)
- PR #173: EDU-8 microprocessor initial implementation
- PR #191: Event-driven digital simulation with clock edge detection
- `docs/EDU8_INSTRUCTION_SET.md`: Complete instruction set reference
- `DIGITAL_SIMULATION_GUIDE.md`: Digital simulation API usage guide

## Success Metrics

After implementation:

1. ✅ Students can place EDU-8 on breadboard and see clock control panel appear
2. ✅ Clicking "Step" executes one instruction and updates CPU state visibly
3. ✅ Clicking "Run" starts automatic execution with configurable frequency
4. ✅ Clicking "Pause" stops execution without losing CPU state
5. ✅ Clicking "Reset" reinitializes CPU to known state
6. ✅ Clock state indicator shows real-time clock level (high/low)
7. ✅ Explain panel updates after each instruction with PC, opcode, accumulator, flags, I/O
8. ✅ Example circuit demonstrates Blink program toggling LED output
9. ✅ Documentation explains clock control usage and educational purpose
10. ✅ Unit tests validate ClockController logic (step, run, pause, reset, frequency)

This task transforms the EDU-8 microprocessor from a "backend feature" into an "interactive educational tool," unlocking its full pedagogical potential and completing the computational electronics learning experience.
