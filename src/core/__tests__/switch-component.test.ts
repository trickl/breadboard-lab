import { describe, it, expect } from 'vitest';
import { CircuitSimulator } from '../circuit-simulator';
import { ComponentType } from '../types';
import type { Circuit, CircuitNode } from '../types';

describe('Switch Component', () => {
  const simulator = new CircuitSimulator();

  /**
   * Helper to create a test circuit
   */
  function createTestCircuit(edges: Circuit['edges']): Circuit {
    const nodeSet = new Set<string>();
    for (const edge of edges) {
      nodeSet.add(edge.nodeA);
      nodeSet.add(edge.nodeB);
    }

    const nodes = new Map<string, CircuitNode>();
    for (const nodeId of nodeSet) {
      nodes.set(nodeId, {
        id: nodeId,
        positions: [],
      });
    }

    return { nodes, edges };
  }

  describe('Switch electrical behavior', () => {
    it('should block current when switch is open', () => {
      // Circuit: 5V Power -> Switch (open) -> 100Ω Resistor -> Ground
      const circuit = createTestCircuit([
        {
          id: 'power',
          component: {
            id: 'power',
            type: ComponentType.POWER_SUPPLY,
            positions: [],
            rotation: 0,
            voltage: 5,
          },
          nodeA: 'node1',
          nodeB: 'ground',
        },
        {
          id: 'switch',
          component: {
            id: 'switch',
            type: ComponentType.SWITCH,
            positions: [],
            rotation: 0,
            switchState: 'open',
          },
          nodeA: 'node1',
          nodeB: 'node2',
        },
        {
          id: 'resistor',
          component: {
            id: 'resistor',
            type: ComponentType.RESISTOR,
            positions: [],
            rotation: 0,
            resistance: 100,
          },
          nodeA: 'node2',
          nodeB: 'ground',
        },
        {
          id: 'ground',
          component: {
            id: 'ground',
            type: ComponentType.GROUND,
            positions: [],
            rotation: 0,
          },
          nodeA: 'ground',
          nodeB: 'ground',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);

      // When switch is open, very little current should flow
      const switchCurrent = Math.abs(result.edgeCurrents.get('switch') ?? 0);
      expect(switchCurrent).toBeLessThan(1e-6); // Less than 1 microamp
    });

    it('should conduct current when switch is closed', () => {
      // Circuit: 5V Power -> Switch (closed) -> 100Ω Resistor -> Ground
      const circuit = createTestCircuit([
        {
          id: 'power',
          component: {
            id: 'power',
            type: ComponentType.POWER_SUPPLY,
            positions: [],
            rotation: 0,
            voltage: 5,
          },
          nodeA: 'node1',
          nodeB: 'ground',
        },
        {
          id: 'switch',
          component: {
            id: 'switch',
            type: ComponentType.SWITCH,
            positions: [],
            rotation: 0,
            switchState: 'closed',
          },
          nodeA: 'node1',
          nodeB: 'node2',
        },
        {
          id: 'resistor',
          component: {
            id: 'resistor',
            type: ComponentType.RESISTOR,
            positions: [],
            rotation: 0,
            resistance: 100,
          },
          nodeA: 'node2',
          nodeB: 'ground',
        },
        {
          id: 'ground',
          component: {
            id: 'ground',
            type: ComponentType.GROUND,
            positions: [],
            rotation: 0,
          },
          nodeA: 'ground',
          nodeB: 'ground',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);

      // When switch is closed, current should flow through circuit
      // Expected: I = V / R = 5V / 100.01Ω ≈ 0.05A (switch adds 0.01Ω)
      const switchCurrent = Math.abs(result.edgeCurrents.get('switch') ?? 0);
      expect(switchCurrent).toBeGreaterThan(0.04); // More than 40mA
      expect(switchCurrent).toBeLessThan(0.06); // Less than 60mA

      // Voltage at node2 should be close to 5V (tiny drop across closed switch)
      const node2Voltage = result.nodeVoltages.get('node2') ?? 0;
      expect(node2Voltage).toBeGreaterThan(4.99); // More than 4.99V (less than 10mV drop)
    });

    it('should default to open state when switchState is undefined', () => {
      // Circuit: 5V Power -> Switch (undefined state) -> 100Ω Resistor -> Ground
      const circuit = createTestCircuit([
        {
          id: 'power',
          component: {
            id: 'power',
            type: ComponentType.POWER_SUPPLY,
            positions: [],
            rotation: 0,
            voltage: 5,
          },
          nodeA: 'node1',
          nodeB: 'ground',
        },
        {
          id: 'switch',
          component: {
            id: 'switch',
            type: ComponentType.SWITCH,
            positions: [],
            rotation: 0,
            // switchState is undefined
          },
          nodeA: 'node1',
          nodeB: 'node2',
        },
        {
          id: 'resistor',
          component: {
            id: 'resistor',
            type: ComponentType.RESISTOR,
            positions: [],
            rotation: 0,
            resistance: 100,
          },
          nodeA: 'node2',
          nodeB: 'ground',
        },
        {
          id: 'ground',
          component: {
            id: 'ground',
            type: ComponentType.GROUND,
            positions: [],
            rotation: 0,
          },
          nodeA: 'ground',
          nodeB: 'ground',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);

      // Should behave like open switch (default)
      const switchCurrent = Math.abs(result.edgeCurrents.get('switch') ?? 0);
      expect(switchCurrent).toBeLessThan(1e-6);
    });
  });

  describe('Switch in series with LED', () => {
    it('should turn LED off when switch is open', () => {
      // Circuit: 5V Power -> Switch (open) -> LED -> 220Ω Resistor -> Ground
      const circuit = createTestCircuit([
        {
          id: 'power',
          component: {
            id: 'power',
            type: ComponentType.POWER_SUPPLY,
            positions: [],
            rotation: 0,
            voltage: 5,
          },
          nodeA: 'node1',
          nodeB: 'ground',
        },
        {
          id: 'switch',
          component: {
            id: 'switch',
            type: ComponentType.SWITCH,
            positions: [],
            rotation: 0,
            switchState: 'open',
          },
          nodeA: 'node1',
          nodeB: 'node2',
        },
        {
          id: 'led',
          component: {
            id: 'led',
            type: ComponentType.LED,
            positions: [],
            rotation: 0,
            forwardVoltage: 2.0,
            maxCurrent: 0.02,
          },
          nodeA: 'node2',
          nodeB: 'node3',
        },
        {
          id: 'resistor',
          component: {
            id: 'resistor',
            type: ComponentType.RESISTOR,
            positions: [],
            rotation: 0,
            resistance: 220,
          },
          nodeA: 'node3',
          nodeB: 'ground',
        },
        {
          id: 'ground',
          component: {
            id: 'ground',
            type: ComponentType.GROUND,
            positions: [],
            rotation: 0,
          },
          nodeA: 'ground',
          nodeB: 'ground',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);

      // LED should have virtually no current (off)
      const ledCurrent = Math.abs(result.edgeCurrents.get('led') ?? 0);
      expect(ledCurrent).toBeLessThan(1e-6);
    });

    it('should turn LED on when switch is closed', () => {
      // Circuit: 5V Power -> Switch (closed) -> LED -> 220Ω Resistor -> Ground
      const circuit = createTestCircuit([
        {
          id: 'power',
          component: {
            id: 'power',
            type: ComponentType.POWER_SUPPLY,
            positions: [],
            rotation: 0,
            voltage: 5,
          },
          nodeA: 'node1',
          nodeB: 'ground',
        },
        {
          id: 'switch',
          component: {
            id: 'switch',
            type: ComponentType.SWITCH,
            positions: [],
            rotation: 0,
            switchState: 'closed',
          },
          nodeA: 'node1',
          nodeB: 'node2',
        },
        {
          id: 'led',
          component: {
            id: 'led',
            type: ComponentType.LED,
            positions: [],
            rotation: 0,
            forwardVoltage: 2.0,
            maxCurrent: 0.02,
          },
          nodeA: 'node2',
          nodeB: 'node3',
        },
        {
          id: 'resistor',
          component: {
            id: 'resistor',
            type: ComponentType.RESISTOR,
            positions: [],
            rotation: 0,
            resistance: 220,
          },
          nodeA: 'node3',
          nodeB: 'ground',
        },
        {
          id: 'ground',
          component: {
            id: 'ground',
            type: ComponentType.GROUND,
            positions: [],
            rotation: 0,
          },
          nodeA: 'ground',
          nodeB: 'ground',
        },
      ]);

      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);

      // LED should have current flowing (on)
      const ledCurrent = Math.abs(result.edgeCurrents.get('led') ?? 0);
      expect(ledCurrent).toBeGreaterThan(0.01); // More than 10mA
    });
  });
});
