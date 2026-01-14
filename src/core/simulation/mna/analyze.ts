import type { Circuit, CircuitEdge } from '../../types';
import { ComponentType } from '../../types';

export type VoltageSource = {
  edge: CircuitEdge;
  voltage: number;
  positiveNode: string;
  negativeNode: string;
};

/**
 * Analyze circuit to find ground nodes and voltage sources.
 *
 * Extracted from `CircuitSimulator`.
 */
export function analyzeCircuit(circuit: Circuit): {
  groundNodes: Set<string>;
  voltageSources: VoltageSource[];
} {
  const groundNodes = new Set<string>();
  const voltageSources: VoltageSource[] = [];

  for (const edge of circuit.edges) {
    if (edge.component.type === ComponentType.GROUND) {
      groundNodes.add(edge.nodeA);
      groundNodes.add(edge.nodeB);
    } else if (edge.component.type === ComponentType.POWER_SUPPLY) {
      // Power supply: enforces V(nodeB) - V(nodeA) = voltage
      // nodeA is typically the positive terminal (higher voltage)
      // nodeB is the negative terminal (connected toward ground/load)
      // To match convention where power supplies provide positive voltage,
      // we want V(nodeA) - V(nodeB) = voltage, so swap the order
      voltageSources.push({
        edge,
        voltage: edge.component.voltage,
        positiveNode: edge.nodeA, // Higher voltage terminal
        negativeNode: edge.nodeB, // Lower voltage terminal
      });
    }
  }

  // Beginner-friendly default: if the circuit has no explicit ground symbol but does have
  // at least one power supply, treat the negative terminal of the first supply as 0V.
  // This matches typical breadboard practice where the battery negative is the reference.
  if (groundNodes.size === 0 && voltageSources.length > 0) {
    groundNodes.add(voltageSources[0].negativeNode);
  }

  return { groundNodes, voltageSources };
}

/**
 * Build mapping from node IDs to matrix indices (excluding ground).
 *
 * Extracted from `CircuitSimulator`.
 */
export function buildNodeIndexMap(circuit: Circuit, groundNodes: Set<string>): Map<string, number> {
  const nodeIndexMap = new Map<string, number>();
  let index = 0;

  for (const nodeId of circuit.nodes.keys()) {
    if (!groundNodes.has(nodeId)) {
      nodeIndexMap.set(nodeId, index++);
    }
  }

  return nodeIndexMap;
}
