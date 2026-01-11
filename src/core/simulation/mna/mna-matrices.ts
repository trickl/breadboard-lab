import type { Circuit, CircuitEdge } from '../../types';
import { ComponentType } from '../../types';
import { MIN_CONDUCTANCE, WIRE_CONDUCTANCE } from '../constants';
import type { VoltageSource } from './analyze';

/**
 * Build MNA conductance matrix G and current vector i.
 *
 * Extracted from `CircuitSimulator`.
 */
export function buildMNAMatrices(
  circuit: Circuit,
  nodeIndexMap: Map<string, number>,
  groundNodes: Set<string>,
  voltageSources: VoltageSource[]
): { G: number[][]; i: number[] } {
  const numNodes = nodeIndexMap.size;
  const numVoltageSources = voltageSources.length;
  const matrixSize = numNodes + numVoltageSources;

  // Initialize matrices
  const G: number[][] = Array(matrixSize)
    .fill(0)
    .map(() => Array(matrixSize).fill(0));
  const i: number[] = Array(matrixSize).fill(0);

  // Process resistive components (resistors, wires, LEDs as resistors, switches)
  for (const edge of circuit.edges) {
    const conductance = getEdgeConductance(edge);
    if (conductance === null) {
      continue;
    }

    stampConductance(G, nodeIndexMap, groundNodes, edge.nodeA, edge.nodeB, conductance);
  }

  // Add voltage sources
  for (let vsIdx = 0; vsIdx < voltageSources.length; vsIdx++) {
    const vs = voltageSources[vsIdx];
    const currentVarIdx = numNodes + vsIdx;

    const isPosGround = groundNodes.has(vs.positiveNode);
    const isNegGround = groundNodes.has(vs.negativeNode);

    // Voltage source stamp:
    // G[node+, currentVar] = 1
    // G[node-, currentVar] = -1
    // G[currentVar, node+] = 1
    // G[currentVar, node-] = -1
    // i[currentVar] = voltage

    if (!isPosGround) {
      const posIdx = nodeIndexMap.get(vs.positiveNode)!;
      G[posIdx][currentVarIdx] += 1;
      G[currentVarIdx][posIdx] += 1;
    }

    if (!isNegGround) {
      const negIdx = nodeIndexMap.get(vs.negativeNode)!;
      G[negIdx][currentVarIdx] -= 1;
      G[currentVarIdx][negIdx] -= 1;
    }

    i[currentVarIdx] = vs.voltage;
  }

  return { G, i };
}

function getEdgeConductance(edge: CircuitEdge): number | null {
  const component = edge.component;
  let conductance: number | null = null;

  if (component.type === ComponentType.RESISTOR) {
    conductance = 1 / component.resistance;
  } else if (component.type === ComponentType.WIRE) {
    conductance = WIRE_CONDUCTANCE;
  } else if (component.type === ComponentType.LED) {
    // Simplified: model LED as 100Ω resistor.
    conductance = 1 / 100;
  } else if (component.type === ComponentType.SWITCH) {
    const switchState = component.switchState ?? 'open';
    const resistance = switchState === 'closed' ? 0.01 : 1e9;
    conductance = 1 / resistance;
  } else if (
    component.type === ComponentType.GROUND ||
    component.type === ComponentType.POWER_SUPPLY
  ) {
    return null;
  }

  if (conductance === null) {
    return null;
  }

  return Math.max(conductance, MIN_CONDUCTANCE);
}

function stampConductance(
  G: number[][],
  nodeIndexMap: Map<string, number>,
  groundNodes: Set<string>,
  nodeA: string,
  nodeB: string,
  conductance: number
): void {
  const isAGround = groundNodes.has(nodeA);
  const isBGround = groundNodes.has(nodeB);

  if (!isAGround) {
    const idxA = nodeIndexMap.get(nodeA)!;
    G[idxA][idxA] += conductance;
    if (!isBGround) {
      const idxB = nodeIndexMap.get(nodeB)!;
      G[idxA][idxB] -= conductance;
    }
  }

  if (!isBGround) {
    const idxB = nodeIndexMap.get(nodeB)!;
    G[idxB][idxB] += conductance;
    if (!isAGround) {
      const idxA = nodeIndexMap.get(nodeA)!;
      G[idxB][idxA] -= conductance;
    }
  }
}
