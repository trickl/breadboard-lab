import type { Circuit } from '../types';
import { ComponentType } from '../types';
import { WIRE_CONDUCTANCE } from './constants';
import type { VoltageSource } from './mna/analyze';

/**
 * Extract node voltages from solution vector.
 *
 * Extracted from `CircuitSimulator`.
 */
export function extractNodeVoltages(
  solution: number[],
  nodeIndexMap: Map<string, number>,
  groundNodes: Set<string>,
  _circuit: Circuit
): Map<string, number> {
  const nodeVoltages = new Map<string, number>();

  // Set ground nodes to 0V
  for (const nodeId of groundNodes) {
    nodeVoltages.set(nodeId, 0);
  }

  // Set other node voltages from solution
  for (const [nodeId, index] of nodeIndexMap) {
    nodeVoltages.set(nodeId, solution[index]);
  }

  return nodeVoltages;
}

/**
 * Calculate edge currents from node voltages using Ohm's law.
 *
 * Extracted from `CircuitSimulator`.
 */
export function calculateEdgeCurrents(
  circuit: Circuit,
  nodeVoltages: Map<string, number>,
  solution: number[],
  numNodes: number,
  voltageSources: VoltageSource[]
): Map<string, number> {
  const edgeCurrents = new Map<string, number>();

  // Build map from voltage source edge ID to current from MNA solution
  const voltageSourceCurrents = new Map<string, number>();
  for (let i = 0; i < voltageSources.length; i++) {
    const current = solution[numNodes + i]; // Current variables start after node voltages
    voltageSourceCurrents.set(voltageSources[i].edge.id, current);
  }

  for (const edge of circuit.edges) {
    const voltageA = nodeVoltages.get(edge.nodeA) ?? 0;
    const voltageB = nodeVoltages.get(edge.nodeB) ?? 0;
    const voltageDiff = voltageA - voltageB;

    let current = 0;
    const component = edge.component;

    if (component.type === ComponentType.RESISTOR) {
      current = voltageDiff / component.resistance;
    } else if (component.type === ComponentType.WIRE) {
      current = voltageDiff * WIRE_CONDUCTANCE;
    } else if (component.type === ComponentType.LED) {
      // Simplified: treat as 100 ohm resistor
      // More accurate model would include forward voltage drop (Vf) as a voltage source in series
      current = voltageDiff / 100;
    } else if (component.type === ComponentType.SWITCH) {
      // Calculate current based on switch state
      const switchState = component.switchState ?? 'open';
      const resistance = switchState === 'closed' ? 0.01 : 1e9;
      current = voltageDiff / resistance;
    } else if (component.type === ComponentType.POWER_SUPPLY) {
      // Extract current from MNA solution vector
      current = voltageSourceCurrents.get(edge.id) ?? 0;
    }

    edgeCurrents.set(edge.id, current);
  }

  return edgeCurrents;
}
