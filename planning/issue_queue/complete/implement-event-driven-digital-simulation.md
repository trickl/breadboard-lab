Implement event-driven digital simulation for clock-based circuits

## Context

Breadboard Lab currently includes an EDU-8 microprocessor component (PR #173) with full instruction execution capabilities, but it cannot execute instructions in response to clock signals. The system only supports DC steady-state analysis, which cannot detect rising edges or model time-domain digital behavior. This fundamentally limits the educational value of the microprocessor and prevents any sequential logic circuits.

## Gap Analysis

**Long-term goal**: The system must support "Digital/event simulation" with event-driven/clocked logic simulation using values {0,1,Z,X}, with explicit analog/digital bridges (planning/vision/goal.md, lines 347-352). The EDU-8 microprocessor should execute one instruction per rising clock edge, with observable state changes that demonstrate fetch-decode-execute cycles (planning/vision/goal.md, lines 369-394).

**Current state**: 
- DC-only circuit simulation using Modified Nodal Analysis (MNA)
- EDU-8 microprocessor component exists with full instruction set and state machine
- No clock edge detection capability
- No event-driven simulation infrastructure
- No digital signal abstraction (cannot distinguish between analog voltage levels and digital logic states)
- Microprocessor cannot respond to clock signals (planning/state/system_capabilities.md, lines 143-147)

**Gap**: The most critical missing capability is an event-driven digital simulation layer that can:
1. Detect digital transitions (rising/falling edges) from analog voltage levels
2. Schedule and execute digital component updates in response to events
3. Integrate with the existing DC solver for mixed-signal circuits
4. Enable clock-driven execution for the EDU-8 microprocessor

## Proposed Development Task

**Implement event-driven digital simulation engine with clock edge detection**

### Scope

Create a digital simulation layer that:
1. Abstracts digital signals from analog voltages using threshold detection (TTL-compatible: 0.8V low, 2.0V high)
2. Detects rising and falling edges on designated clock pins
3. Maintains a digital event queue with timestamped events
4. Executes digital component logic (starting with EDU-8) in response to clock edges
5. Bridges digital outputs back to analog domain for DC solver integration
6. Runs in cooperation with (not replacement of) the existing DC MNA solver

### Technical Approach

**Architecture** (new layer between extraction and rendering):
```
Breadboard → Circuit Extraction → DC Solver
                                    ↓
                                Analog Voltages
                                    ↓
                            Digital Signal Abstraction
                                    ↓
                            Event Detection (edges)
                                    ↓
                            Digital Event Queue
                                    ↓
                        Digital Component Updates (EDU-8, etc.)
                                    ↓
                        Digital → Analog Conversion
                                    ↓
                            Re-run DC Solver
```

**Key components to implement**:

1. **Digital Signal Abstraction** (`src/core/digital-signals.ts`):
   - `DigitalValue` type: `0 | 1 | Z | X` (low, high, high-impedance, unknown)
   - `analogToDigital(voltage: number): DigitalValue` - TTL threshold detection
   - `digitalToAnalog(value: DigitalValue): number` - conversion back to voltage

2. **Edge Detector** (`src/core/edge-detector.ts`):
   - Track previous digital state for each monitored pin
   - Detect transitions: `'rising' | 'falling' | 'none'`
   - Filter out glitches and noise (optional: debouncing)

3. **Digital Event Queue** (`src/core/digital-event-queue.ts`):
   - Priority queue of timestamped events
   - Event types: `ClockEdge`, `DigitalStateChange`
   - Process events in chronological order

4. **Digital Simulation Engine** (`src/core/digital-simulator.ts`):
   - Orchestrates digital simulation loop
   - Calls DC solver to get analog voltages
   - Abstracts voltages to digital signals
   - Detects edges and enqueues events
   - Dispatches events to digital components (EDU-8)
   - Collects digital outputs and converts to analog
   - Triggers DC solver re-run with updated analog constraints

5. **EDU-8 Clock Integration** (extend `src/core/edu8-simulator.ts`):
   - Add `handleClockEdge(state: EDU8State, inputs: DigitalInputs): EDU8State` method
   - Execute one instruction on rising clock edge
   - Return updated state with new output values
   - Integrate with existing instruction execution logic (already implemented)

6. **Mixed-Signal Circuit Model**:
   - Extend component model to mark digital pins (CLK, RST, IN, OUT on EDU-8)
   - DC solver treats digital outputs as voltage sources with computed values
   - Iterative convergence: analog → digital → analog until stable

### Success Criteria

- [ ] Digital signal abstraction correctly maps voltages to {0,1,Z,X} using TTL thresholds
- [ ] Clock edge detector identifies rising edges on designated pins
- [ ] EDU-8 executes exactly one instruction per rising clock edge when enabled
- [ ] EDU-8 program counter increments visibly in Explain panel after each clock pulse
- [ ] Output pins (OUT0-3) reflect digital values as analog voltages (0.2V low, 4.5V high)
- [ ] Test circuit: EDU-8 + clock source (square wave) + LEDs on outputs demonstrates visible sequential behavior
- [ ] Simulation remains stable (no infinite loops or oscillations)
- [ ] Performance: Digital event processing adds <10ms overhead per clock cycle
- [ ] Backward compatibility: Existing DC-only circuits continue to work unchanged

### Testing Strategy

1. **Unit tests** for digital signal abstraction (threshold detection, hysteresis if implemented)
2. **Unit tests** for edge detector (rising/falling detection, state tracking)
3. **Integration tests** for EDU-8 clock-driven execution:
   - Load "Blink" program (toggles OUT0 on each instruction)
   - Simulate 8 clock pulses
   - Verify OUT0 state changes 4 times (toggles on alternate instructions)
   - Verify PC advances from 0 to 7 (with wrapping if program < 8 instructions)
4. **Integration tests** for mixed-signal circuits:
   - EDU-8 output driving LED through resistor
   - Verify LED current reflects digital output state
5. **Visual tests**: Screenshot comparison of EDU-8 circuit before/after clock pulses shows output changes

### Educational Impact

This feature unlocks the full educational potential of the EDU-8 microprocessor:
- **Visible computation**: Students see program execution step-by-step with each clock pulse
- **Sequential logic**: Enables teaching of state machines, counters, timers
- **Real-world correspondence**: Matches how actual digital ICs respond to clock signals
- **Debugging aid**: Clock-by-clock stepping helps students understand program flow
- **Foundation for expansion**: Opens path to more digital components (flip-flops, counters, shift registers)

### Constraints and Simplifications (for MVP)

**Simplifications to keep scope manageable**:
- **Synchronous only**: All digital logic updates on same clock edge (no component propagation delays)
- **Single clock domain**: All digital components share one global clock (no independent clocks)
- **No AC waveform generation**: Clock source is abstracted (not a circuit component); user triggers clock pulses via UI button
- **No transient analysis**: Digital simulation is discrete-event, not continuous-time
- **EDU-8 only initially**: Other digital components deferred to future work
- **No asynchronous inputs**: Digital inputs (IN0-3) are sampled synchronously (not edge-triggered)

**Out of scope for this task**:
- General-purpose SPICE transient analysis (remains deferred)
- Complex digital component library (focus on EDU-8 only)
- Analog-to-digital converters or PWM
- Multi-clock domain support
- Setup/hold time validation
- Propagation delay modeling

### Implementation Phases

**Phase 1**: Core infrastructure (digital signals, edge detection, event queue)  
**Phase 2**: Digital simulator integration with DC solver  
**Phase 3**: EDU-8 clock-driven execution  
**Phase 4**: UI controls (clock step button, run/pause, reset)  
**Phase 5**: Testing and documentation  

### Alignment with Roadmap

This task addresses a **required capability** in the target state specification:
- 🎯 "Digital/event simulation" (planning/vision/goal.md, lines 347-352)
- 🎯 "Simple microprocessor component" with clock input and instruction execution (planning/vision/goal.md, lines 366-394)
- 🎯 Acceptance criterion: "A canonical program toggles outputs deterministically under a clock" (planning/vision/goal.md, line 391)

This is a **prerequisite** for making the EDU-8 microprocessor fully functional and educational. Without event-driven simulation, the microprocessor is effectively a static display, not an interactive learning tool.

### Risk Assessment

**Technical risks**:
- **Convergence**: Mixed analog/digital simulation may not converge if digital outputs create feedback loops
  - *Mitigation*: Limit iteration count; detect oscillations; warn user
- **Performance**: Event processing may add noticeable latency
  - *Mitigation*: Profile and optimize; consider WebWorker for simulation
- **Complexity**: Digital/analog bridge adds significant architectural complexity
  - *Mitigation*: Start simple (synchronous, single clock); iterate

**Scope risks**:
- **Scope creep**: Digital simulation is a large domain; easy to over-engineer
  - *Mitigation*: Strict focus on EDU-8 only; defer general digital library
- **UI complexity**: Clock control UI adds new interaction patterns
  - *Mitigation*: Start with simple "Step Clock" button; defer continuous run

### Dependencies

**No external dependencies** required (pure TypeScript implementation).

**Internal dependencies**:
- Requires access to existing DC solver results (already available)
- Requires EDU-8 simulator (already implemented in PR #173)
- Requires extension to component model to mark digital pins (minor change)

### Success Metrics

After implementation, the system should demonstrate:
1. **Functional EDU-8**: "Blink" program visibly toggles output LED with each clock step
2. **Educational value**: Users can step through instructions and observe state changes
3. **Test coverage**: >90% coverage for new digital simulation code
4. **Performance**: <100ms per clock step on typical hardware
5. **Documentation**: Digital simulation architecture documented in ARCHITECTURE.md

---

**Priority**: HIGH  
**Estimated effort**: 3-5 development sessions  
**Blocking**: This unblocks full EDU-8 functionality and any future sequential logic circuits
