import { describe, it, expect } from 'vitest';
import { CircuitSimulator } from '../circuit-simulator';
import { ComponentType } from '../types';
import type { Circuit, CircuitNode } from '../types';

describe('CircuitSimulator - MNA Implementation', () => {
  const simulator = new CircuitSimulator();

  /**
   * Helper to create a simple circuit for testing
   */
  function createTestCircuit(edges: Circuit['edges']): Circuit {
    // Build nodes from edges
    const nodeSet = new Set<string>();
    for (const edge of edges) {
      nodeSet.add(edge.nodeA);
      nodeSet.add(edge.nodeB);
    }

    const nodes = new Map<string, CircuitNode>();
    for (const nodeId of nodeSet) {
      nodes.set(nodeId, {
        id: nodeId,
        positions: [], // Not relevant for simulation
      });
    }

    return { nodes, edges };
  }

  describe('Basic circuits', () => {
    it('should handle circuit with only ground (all nodes at 0V)', () => {
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'node1',
          nodeB: 'node2',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('node1')).toBe(0);
      expect(result.nodeVoltages.get('node2')).toBe(0);
    });

    it('should handle simple series circuit: Power -> Resistor -> Ground', () => {
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);
      
      // Current through resistor should be I = V/R = 5V/1000Ω = 5mA
      const current = result.edgeCurrents.get('resistor1');
      expect(current).toBeDefined();
      expect(Math.abs(current!)).toBeCloseTo(0.005, 5);
    });

    it('should handle voltage divider: Power -> R1 -> R2 -> Ground', () => {
      // Properly formed circuit:
      // Ground connects to gnd
      // Power supply: gnd (negative) to vcc (positive), provides +5V
      // R1: vcc to middle
      // R2: middle to gnd
      // This creates a voltage divider with vcc at +5V, gnd at 0V
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',    // Positive terminal at +5V
          nodeB: 'gnd',    // Negative terminal at ground (0V)
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'middle',
        },
        {
          id: 'resistor2',
          component: { id: 'resistor2', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'middle',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);
      // With equal resistors, middle voltage should be half of supply (2.5V)
      expect(result.nodeVoltages.get('middle')).toBeCloseTo(2.5, 1);
    });
  });

  describe('Parallel circuits', () => {
    it('should handle two parallel resistors: Power -> (R1 || R2) -> Ground', () => {
      // Circuit: 5V power supply, two 1kΩ resistors in parallel from vcc to ground
      // Expected: vcc at 5V, current splits between resistors, each carries I = 5V/1kΩ = 5mA
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor2',
          component: { id: 'resistor2', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);

      // Each resistor should carry current: I = V/R = 5V / 1000Ω = 5mA
      const current1 = Math.abs(result.edgeCurrents.get('resistor1') || 0);
      const current2 = Math.abs(result.edgeCurrents.get('resistor2') || 0);
      expect(current1).toBeCloseTo(0.005, 5); // 5mA
      expect(current2).toBeCloseTo(0.005, 5); // 5mA
    });

    it('should handle voltage divider with parallel load', () => {
      // Circuit topology:
      // Power(5V) from vcc to gnd
      // R1(1kΩ) from vcc to middle
      // R2(1kΩ) from middle to gnd (parallel with R3)
      // R3(1kΩ) from middle to gnd
      // Expected: R2 || R3 = 500Ω, voltage divider with 1kΩ and 500Ω
      // Vmiddle = 5V * (500 / (1000 + 500)) = 5V * (1/3) = 1.67V

      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'middle',
        },
        {
          id: 'resistor2',
          component: { id: 'resistor2', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'middle',
          nodeB: 'gnd',
        },
        {
          id: 'resistor3',
          component: { id: 'resistor3', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'middle',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);
      // Middle node should be at 5V * (500 / 1500) = 1.67V
      expect(result.nodeVoltages.get('middle')).toBeCloseTo(1.67, 1);

      // Current through R1 should be I = (5V - 1.67V) / 1000Ω = 3.33mA
      const current1 = result.edgeCurrents.get('resistor1');
      expect(current1).toBeDefined();
      expect(Math.abs(current1!)).toBeCloseTo(0.00333, 4); // 3.33mA in amperes
    });

    it('should handle complex parallel network', () => {
      // Circuit: 
      // Power(5V) from vcc to gnd
      // R1(1kΩ) from vcc to middle1
      // R2(2kΩ) from middle1 to middle2 (parallel with R3)
      // R3(2kΩ) from middle1 to middle2
      // Ground at middle2
      // R2 || R3 = 1kΩ
      // Total equivalent: 1kΩ (R1) + 1kΩ (R2||R3) = 2kΩ
      // Current: I = 5V / 2kΩ = 2.5mA
      // Voltage at middle2: 2.5mA * 1kΩ = 2.5V
      // Voltage at middle1: 5V - (2.5mA * 1kΩ) = 2.5V (same as middle2, small drop across parallel)

      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'middle1',
        },
        {
          id: 'resistor2',
          component: { id: 'resistor2', type: ComponentType.RESISTOR, resistance: 2000, positions: [] },
          nodeA: 'middle1',
          nodeB: 'gnd',
        },
        {
          id: 'resistor3',
          component: { id: 'resistor3', type: ComponentType.RESISTOR, resistance: 2000, positions: [] },
          nodeA: 'middle1',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);
      // With R1=1k and (R2||R3)=1k, middle1 should be at 2.5V
      expect(result.nodeVoltages.get('middle1')).toBeCloseTo(2.5, 1);
    });
  });

  describe('Wire handling', () => {
    it('should handle wires as very low resistance', () => {
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'wire1',
          component: { id: 'wire1', type: ComponentType.WIRE, resistance: 0.01, positions: [] },
          nodeA: 'vcc',
          nodeB: 'node2',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'node2',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      // Wire should have negligible voltage drop
      const voltageVcc = result.nodeVoltages.get('vcc') || 0;
      const voltageNode2 = result.nodeVoltages.get('node2') || 0;
      expect(Math.abs(voltageVcc - voltageNode2)).toBeLessThan(0.1);
    });
  });

  describe('LED handling', () => {
    it('should handle LED in series with resistor', () => {
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'middle',
        },
        {
          id: 'led1',
          component: {
            id: 'led1',
            type: ComponentType.LED,
            forwardVoltage: 2.0,
            maxCurrent: 0.02,
            positions: [],
          },
          nodeA: 'middle',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);
      // LED is simplified as 100Ω resistor in current implementation
      // So we have voltage divider: 1000Ω and 100Ω
      // Vmiddle = 5V * (100 / 1100) = 0.45V approximately
      const middle = result.nodeVoltages.get('middle') || 0;
      expect(middle).toBeGreaterThan(0);
      expect(middle).toBeLessThan(1);
    });
  });

  describe('Error cases', () => {
    it('should fail gracefully when no ground is present', () => {
      const circuit = createTestCircuit([
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'node1',
          nodeB: 'node2',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ground');
    });

    it('should detect short circuit (singular matrix)', () => {
      // Circuit with direct wire from power to ground (very low resistance)
      // This should work but produce very high current
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'wire1',
          component: { id: 'wire1', type: ComponentType.WIRE, resistance: 0.01, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      // Should succeed with high current through the wire
      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);
      
      // Current through wire should be very high: I = V/R = 5V/0.01Ω = 500A (unrealistic but mathematically correct)
      const wireCurrent = Math.abs(result.edgeCurrents.get('wire1') || 0);
      expect(wireCurrent).toBeGreaterThan(100); // Very high current
    });
  });

  describe('Multiple voltage sources', () => {
    it('should handle multiple voltage sources', () => {
      // Two power supplies: one 5V from vcc to gnd, another 3V from node2 to gnd
      // Resistor from vcc to node2
      // With 5V at vcc and 3V at node2, voltage across resistor is 2V
      // Current through resistor: I = 2V / 1kΩ = 2mA
      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 5.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'power2',
          component: { id: 'power2', type: ComponentType.POWER_SUPPLY, voltage: 3.0, positions: [] },
          nodeA: 'node2',
          nodeB: 'gnd',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'node2',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(5.0, 2);
      expect(result.nodeVoltages.get('node2')).toBeCloseTo(3.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);
      
      // Current through resistor should be (5V - 3V) / 1kΩ = 2mA
      const current = Math.abs(result.edgeCurrents.get('resistor1') || 0);
      expect(current).toBeCloseTo(0.002, 5);
    });
  });

  describe('Current calculations', () => {
    it('should calculate correct currents through parallel branches', () => {
      // Power -> (R1 || R2) -> Ground
      // R1 = 1kΩ, R2 = 2kΩ, V = 6V
      // I1 = 6V / 1kΩ = 6mA
      // I2 = 6V / 2kΩ = 3mA
      // Total current = 9mA

      const circuit = createTestCircuit([
        {
          id: 'ground1',
          component: { id: 'ground1', type: ComponentType.GROUND, positions: [] },
          nodeA: 'gnd',
          nodeB: 'gnd',
        },
        {
          id: 'power1',
          component: { id: 'power1', type: ComponentType.POWER_SUPPLY, voltage: 6.0, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor1',
          component: { id: 'resistor1', type: ComponentType.RESISTOR, resistance: 1000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
        {
          id: 'resistor2',
          component: { id: 'resistor2', type: ComponentType.RESISTOR, resistance: 2000, positions: [] },
          nodeA: 'vcc',
          nodeB: 'gnd',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.nodeVoltages.get('vcc')).toBeCloseTo(6.0, 2);
      expect(result.nodeVoltages.get('gnd')).toBe(0);

      const current1 = Math.abs(result.edgeCurrents.get('resistor1') || 0);
      const current2 = Math.abs(result.edgeCurrents.get('resistor2') || 0);

      expect(current1).toBeDefined();
      expect(current2).toBeDefined();

      // I1 = 6V / 1kΩ = 6mA
      expect(current1).toBeCloseTo(0.006, 5);
      // I2 = 6V / 2kΩ = 3mA
      expect(current2).toBeCloseTo(0.003, 5);

      // Current ratio should match resistance ratio (inverse)
      // I1 / I2 = R2 / R1 = 2000 / 1000 = 2
      const ratio = current1 / current2;
      expect(ratio).toBeCloseTo(2.0, 1);
    });
  });
});
