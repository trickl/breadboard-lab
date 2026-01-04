import { describe, it, expect } from 'vitest';
import {
  createDigitalSimulationState,
  stepDigitalSimulation,
  getMicroprocessorOutputVoltages,
  analogVoltagesToInputs,
  resetDigitalSimulation,
} from '../digital-simulator';
import { createInitialEDU8State, loadProgram, PRESET_PROGRAMS } from '../edu8-simulator';
import { ComponentType } from '../types';
import type { Microprocessor, Circuit, CircuitNode } from '../types';
import { TTL_THRESHOLDS } from '../digital-signals';

describe('Digital Simulator', () => {
  describe('createDigitalSimulationState', () => {
    it('should create initial state', () => {
      const state = createDigitalSimulationState();
      expect(state.currentTime).toBe(0);
      expect(state.eventQueue.isEmpty()).toBe(true);
      expect(state.edgeDetectors.size).toBe(0);
      expect(state.digitalOutputs.size).toBe(0);
    });
  });

  describe('getMicroprocessorOutputVoltages', () => {
    it('should convert output 0b0000 to low voltages', () => {
      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: { ...createInitialEDU8State(), outputs: 0b0000 },
      };

      const voltages = getMicroprocessorOutputVoltages(cpu);
      expect(voltages).toEqual([
        TTL_THRESHOLDS.V_OL,
        TTL_THRESHOLDS.V_OL,
        TTL_THRESHOLDS.V_OL,
        TTL_THRESHOLDS.V_OL,
      ]);
    });

    it('should convert output 0b1111 to high voltages', () => {
      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: { ...createInitialEDU8State(), outputs: 0b1111 },
      };

      const voltages = getMicroprocessorOutputVoltages(cpu);
      expect(voltages).toEqual([
        TTL_THRESHOLDS.V_OH,
        TTL_THRESHOLDS.V_OH,
        TTL_THRESHOLDS.V_OH,
        TTL_THRESHOLDS.V_OH,
      ]);
    });

    it('should convert output 0b0101 correctly', () => {
      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: { ...createInitialEDU8State(), outputs: 0b0101 },
      };

      const voltages = getMicroprocessorOutputVoltages(cpu);
      expect(voltages).toEqual([
        TTL_THRESHOLDS.V_OH, // OUT0 = 1
        TTL_THRESHOLDS.V_OL, // OUT1 = 0
        TTL_THRESHOLDS.V_OH, // OUT2 = 1
        TTL_THRESHOLDS.V_OL, // OUT3 = 0
      ]);
    });
  });

  describe('analogVoltagesToInputs', () => {
    it('should convert low voltages to 0', () => {
      const voltages: [number, number, number, number] = [0.2, 0.2, 0.2, 0.2];
      expect(analogVoltagesToInputs(voltages)).toBe(0b0000);
    });

    it('should convert high voltages to 15', () => {
      const voltages: [number, number, number, number] = [4.5, 4.5, 4.5, 4.5];
      expect(analogVoltagesToInputs(voltages)).toBe(0b1111);
    });

    it('should convert mixed voltages correctly', () => {
      const voltages: [number, number, number, number] = [
        4.5, // IN0 = 1
        0.2, // IN1 = 0
        4.5, // IN2 = 1
        0.2, // IN3 = 0
      ];
      expect(analogVoltagesToInputs(voltages)).toBe(0b0101);
    });

    it('should return 0 if any input is undefined', () => {
      const voltages: [number, number, number, number] = [
        4.5, // IN0 = 1
        1.5, // IN1 = X (undefined)
        4.5, // IN2 = 1
        0.2, // IN3 = 0
      ];
      expect(analogVoltagesToInputs(voltages)).toBe(0);
    });
  });

  describe('stepDigitalSimulation', () => {
    it('should not change components when no microprocessors', () => {
      const components = [
        {
          id: 'r1',
          type: ComponentType.RESISTOR,
          resistance: 1000,
          positions: [],
          rotation: 0,
        },
      ];

      const circuit: Circuit = {
        nodes: new Map(),
        edges: [],
      };

      const digitalState = createDigitalSimulationState();
      const updated = stepDigitalSimulation(circuit, components, digitalState, 'clk');

      expect(updated).toEqual(components);
    });

    it('should execute instruction on rising clock edge', () => {
      let cpuState = createInitialEDU8State();
      cpuState = loadProgram(cpuState, [0x01]); // LDA #1

      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpuState,
      };

      const clockNode: CircuitNode = {
        id: 'clk',
        positions: [],
        voltage: 0.0, // Start low
      };

      const circuit: Circuit = {
        nodes: new Map([['clk', clockNode]]),
        edges: [],
      };

      const digitalState = createDigitalSimulationState();

      // Step 1: Clock is low - no execution
      let updated = stepDigitalSimulation(circuit, [cpu], digitalState, 'clk');
      expect(updated[0].state.programCounter).toBe(0);
      expect(updated[0].state.accumulator).toBe(0);

      // Step 2: Clock goes high - rising edge - execute instruction
      clockNode.voltage = 5.0;
      updated = stepDigitalSimulation(circuit, updated, digitalState, 'clk');
      expect(updated[0].state.programCounter).toBe(1);
      expect(updated[0].state.accumulator).toBe(1);

      // Step 3: Clock stays high - no execution
      updated = stepDigitalSimulation(circuit, updated, digitalState, 'clk');
      expect(updated[0].state.programCounter).toBe(1); // No change
    });

    it('should execute blink program with clock pulses', () => {
      let cpuState = createInitialEDU8State();
      cpuState = loadProgram(cpuState, PRESET_PROGRAMS.blink);

      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpuState,
      };

      const clockNode: CircuitNode = {
        id: 'clk',
        positions: [],
        voltage: 0.0,
      };

      const circuit: Circuit = {
        nodes: new Map([['clk', clockNode]]),
        edges: [],
      };

      const digitalState = createDigitalSimulationState();
      let components = [cpu];

      // Helper to pulse clock
      const pulseClock = () => {
        // Rising edge
        clockNode.voltage = 5.0;
        components = stepDigitalSimulation(circuit, components, digitalState, 'clk');
        // Falling edge
        clockNode.voltage = 0.0;
        components = stepDigitalSimulation(circuit, components, digitalState, 'clk');
      };

      // Pulse 1: LDA #1
      pulseClock();
      expect(components[0].state.programCounter).toBe(1);
      expect(components[0].state.accumulator).toBe(1);

      // Pulse 2: OUT
      pulseClock();
      expect(components[0].state.programCounter).toBe(2);
      expect(components[0].state.outputs).toBe(1);

      // Pulse 3: LDA #0
      pulseClock();
      expect(components[0].state.programCounter).toBe(3);
      expect(components[0].state.accumulator).toBe(0);

      // Pulse 4: OUT
      pulseClock();
      expect(components[0].state.programCounter).toBe(4);
      expect(components[0].state.outputs).toBe(0);

      // Pulse 5: JMP 0
      pulseClock();
      expect(components[0].state.programCounter).toBe(0); // Jumped back

      // Pulse 6: LDA #1 (loop repeats)
      pulseClock();
      expect(components[0].state.programCounter).toBe(1);
      expect(components[0].state.outputs).toBe(0); // Previous output still 0
    });

    it('should toggle output visible with getMicroprocessorOutputVoltages', () => {
      let cpuState = createInitialEDU8State();
      cpuState = loadProgram(cpuState, PRESET_PROGRAMS.blink);

      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpuState,
      };

      const clockNode: CircuitNode = {
        id: 'clk',
        positions: [],
        voltage: 0.0,
      };

      const circuit: Circuit = {
        nodes: new Map([['clk', clockNode]]),
        edges: [],
      };

      const digitalState = createDigitalSimulationState();
      let components = [cpu];

      // Helper to pulse clock
      const pulseClock = () => {
        clockNode.voltage = 5.0;
        components = stepDigitalSimulation(circuit, components, digitalState, 'clk');
        clockNode.voltage = 0.0;
        components = stepDigitalSimulation(circuit, components, digitalState, 'clk');
      };

      // Initial state: outputs = 0
      let voltages = getMicroprocessorOutputVoltages(components[0] as Microprocessor);
      expect(voltages[0]).toBe(TTL_THRESHOLDS.V_OL); // OUT0 low

      // Execute until first OUT instruction
      pulseClock(); // LDA #1
      pulseClock(); // OUT
      voltages = getMicroprocessorOutputVoltages(components[0] as Microprocessor);
      expect(voltages[0]).toBe(TTL_THRESHOLDS.V_OH); // OUT0 high

      // Execute until second OUT instruction
      pulseClock(); // LDA #0
      pulseClock(); // OUT
      voltages = getMicroprocessorOutputVoltages(components[0] as Microprocessor);
      expect(voltages[0]).toBe(TTL_THRESHOLDS.V_OL); // OUT0 low again
    });
  });

  describe('resetDigitalSimulation', () => {
    it('should reset all state', () => {
      const state = createDigitalSimulationState();
      state.currentTime = 100;
      state.edgeDetectors.set('test', { previousValue: 1 });
      state.digitalOutputs.set('test', 1);

      resetDigitalSimulation(state);

      expect(state.currentTime).toBe(0);
      expect(state.edgeDetectors.size).toBe(0);
      expect(state.digitalOutputs.size).toBe(0);
      expect(state.eventQueue.isEmpty()).toBe(true);
    });
  });
});
