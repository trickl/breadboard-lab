import { describe, it, expect, beforeEach } from 'vitest';
import { MixedSignalSimulator } from '../mixed-signal-simulator';
import { createInitialEDU8State, loadProgram, PRESET_PROGRAMS } from '../edu8-simulator';
import { ComponentType } from '../types';
import type { Microprocessor, Circuit, CircuitNode, CircuitEdge } from '../types';

/**
 * Helper to create a simple test circuit with ground and optional clock
 */
function createTestCircuit(includeClockNode = false, clockVoltage = 0): Circuit {
  const groundNode: CircuitNode = { id: 'gnd', positions: [] };
  const nodes = new Map<string, CircuitNode>([['gnd', groundNode]]);

  const edges: CircuitEdge[] = [
    {
      id: 'ground1',
      component: { id: 'ground1', type: ComponentType.GROUND, positions: [], rotation: 0 },
      nodeA: 'gnd',
      nodeB: 'gnd',
    },
  ];

  if (includeClockNode) {
    const clockNode: CircuitNode = { id: 'clk', positions: [] };
    nodes.set('clk', clockNode);

    // Add power supply to drive clock
    edges.push({
      id: 'clkpwr',
      component: {
        id: 'clkpwr',
        type: ComponentType.POWER_SUPPLY,
        voltage: clockVoltage,
        positions: [],
        rotation: 0,
      },
      nodeA: 'clk',
      nodeB: 'gnd',
    });
  }

  return { nodes, edges };
}

describe('Mixed-Signal Simulator', () => {
  let simulator: MixedSignalSimulator;

  beforeEach(() => {
    simulator = new MixedSignalSimulator();
  });

  describe('DC-only simulation', () => {
    it('should run DC analysis when digital simulation disabled', () => {
      const circuit = createTestCircuit();
      const components = [];

      const { result } = simulator.simulate(circuit, components, {
        enableDigitalSimulation: false,
      });

      expect(result.success).toBe(true);
      expect(result.digitalState).toBe(undefined);
      expect(result.iterations).toBe(0);
    });

    it('should work with empty circuit', () => {
      const circuit: Circuit = {
        nodes: new Map(),
        edges: [],
      };

      const { result } = simulator.simulate(circuit, [], {
        enableDigitalSimulation: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ground');
    });
  });

  describe('Digital simulation without clock node', () => {
    it('should return error if clock node not specified', () => {
      const circuit = createTestCircuit();

      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: createInitialEDU8State(),
      };

      const { result } = simulator.simulate(circuit, [cpu], {
        enableDigitalSimulation: true,
        // clockNodeId missing
      });

      expect(result.error).toContain('Clock node');
    });
  });

  describe('Mixed-signal simulation', () => {
    it('should simulate circuit with microprocessor and clock', () => {
      const circuit = createTestCircuit(true, 0); // Start with clock low

      let cpuState = createInitialEDU8State();
      cpuState = loadProgram(cpuState, [0x01]); // LDA #1

      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpuState,
      };

      // First simulation: clock low
      const { result: result1, updatedComponents: components1 } = simulator.simulate(
        circuit,
        [cpu],
        {
          enableDigitalSimulation: true,
          clockNodeId: 'clk',
        }
      );

      expect(result1.success).toBe(true);
      expect(result1.digitalState).toBeDefined();
      expect(components1[0].state.programCounter).toBe(0);

      // Update clock power supply to go high
      const clkPwr = circuit.edges.find((e) => e.id === 'clkpwr')!;
      (clkPwr.component as any).voltage = 5.0;

      // Second simulation: clock goes high (rising edge)
      const { result: result2, updatedComponents: components2 } = simulator.simulate(
        circuit,
        components1,
        {
          enableDigitalSimulation: true,
          clockNodeId: 'clk',
        }
      );

      expect(result2.success).toBe(true);
      expect(components2[0].state.programCounter).toBe(1);
      expect(components2[0].state.accumulator).toBe(1);
    });

    it('should execute blink program with clock pulses', () => {
      const circuit = createTestCircuit(true, 0);
      const clkPwr = circuit.edges.find((e) => e.id === 'clkpwr')!;

      let cpuState = createInitialEDU8State();
      cpuState = loadProgram(cpuState, PRESET_PROGRAMS.blink);

      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpuState,
      };

      let components = [cpu];

      // Helper to pulse clock
      const pulseClock = () => {
        // Rising edge
        (clkPwr.component as any).voltage = 5.0;
        const r1 = simulator.simulate(circuit, components, {
          enableDigitalSimulation: true,
          clockNodeId: 'clk',
        });
        components = r1.updatedComponents;

        // Falling edge
        (clkPwr.component as any).voltage = 0.0;
        const r2 = simulator.simulate(circuit, components, {
          enableDigitalSimulation: true,
          clockNodeId: 'clk',
        });
        components = r2.updatedComponents;
      };

      // Verify initial state
      expect(components[0].state.outputs).toBe(0);

      // Execute blink program
      pulseClock(); // LDA #1
      expect(components[0].state.programCounter).toBe(1);

      pulseClock(); // OUT
      expect(components[0].state.programCounter).toBe(2);
      expect(components[0].state.outputs).toBe(1); // Output is now 1

      pulseClock(); // LDA #0
      expect(components[0].state.programCounter).toBe(3);

      pulseClock(); // OUT
      expect(components[0].state.programCounter).toBe(4);
      expect(components[0].state.outputs).toBe(0); // Output back to 0

      pulseClock(); // JMP 0
      expect(components[0].state.programCounter).toBe(0); // Looped back
    });

    it('should handle multiple microprocessors independently', () => {
      const circuit = createTestCircuit(true, 0);
      const clkPwr = circuit.edges.find((e) => e.id === 'clkpwr')!;

      // CPU 1: LDA #1
      let cpu1State = createInitialEDU8State();
      cpu1State = loadProgram(cpu1State, [0x01]);

      const cpu1: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpu1State,
      };

      // CPU 2: LDA #2
      let cpu2State = createInitialEDU8State();
      cpu2State = loadProgram(cpu2State, [0x02]);

      const cpu2: Microprocessor = {
        id: 'cpu2',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpu2State,
      };

      let components = [cpu1, cpu2];

      // Clock pulse
      (clkPwr.component as any).voltage = 5.0;
      const { updatedComponents } = simulator.simulate(circuit, components, {
        enableDigitalSimulation: true,
        clockNodeId: 'clk',
      });

      // Both CPUs should have executed independently
      expect(updatedComponents[0].state.accumulator).toBe(1);
      expect(updatedComponents[1].state.accumulator).toBe(2);
    });
  });

  describe('State management', () => {
    it('should reset digital state', () => {
      const state1 = simulator.getDigitalState();
      state1.currentTime = 100;

      simulator.resetDigitalState();

      const state2 = simulator.getDigitalState();
      expect(state2.currentTime).toBe(0);
      expect(state2).not.toBe(state1); // New object
    });

    it('should persist digital state across simulations', () => {
      const circuit = createTestCircuit(true, 0);
      const clkPwr = circuit.edges.find((e) => e.id === 'clkpwr')!;

      let cpuState = createInitialEDU8State();
      cpuState = loadProgram(cpuState, [0x01, 0x12]); // LDA #1, ADD #2

      const cpu: Microprocessor = {
        id: 'cpu1',
        type: ComponentType.MICROPROCESSOR,
        positions: [],
        rotation: 0,
        state: cpuState,
      };

      // First pulse
      (clkPwr.component as any).voltage = 5.0;
      const { updatedComponents: c1 } = simulator.simulate(circuit, [cpu], {
        enableDigitalSimulation: true,
        clockNodeId: 'clk',
      });

      // State should persist in digital state
      const state1 = simulator.getDigitalState();
      expect(state1.edgeDetectors.size).toBeGreaterThan(0);

      // Clock low
      (clkPwr.component as any).voltage = 0.0;
      const { updatedComponents: c1b } = simulator.simulate(circuit, c1, {
        enableDigitalSimulation: true,
        clockNodeId: 'clk',
      });

      // Second pulse - should use persisted edge detector state
      (clkPwr.component as any).voltage = 5.0;
      const { updatedComponents: c2 } = simulator.simulate(circuit, c1b, {
        enableDigitalSimulation: true,
        clockNodeId: 'clk',
      });

      expect(c2[0].state.programCounter).toBe(2); // Executed second instruction
    });
  });
});
