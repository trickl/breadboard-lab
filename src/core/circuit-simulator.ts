import type { Circuit, SimulationResult, CircuitEdge } from './types';
import { ComponentType } from './types';

/**
 * Circuit simulator using Modified Nodal Analysis (MNA).
 * Handles parallel circuits, voltage dividers, and multiple current paths.
 */
export class CircuitSimulator {
  private static readonly WIRE_CONDUCTANCE = 100; // Very high conductance (low resistance)
  private static readonly MIN_CONDUCTANCE = 1e-12; // Minimum conductance to avoid singularities
  private static readonly SINGULAR_THRESHOLD = 1e-10; // Threshold for detecting singular matrices

  /**
   * Simulate the circuit and calculate voltages and currents using MNA
   */
  simulate(circuit: Circuit): SimulationResult {
    try {
      // Identify ground nodes and voltage sources
      const { groundNodes, voltageSources } = this.analyzeCircuit(circuit);

      if (groundNodes.size === 0) {
        return {
          success: false,
          error: 'No ground node found. Circuit must have at least one ground connection.',
          nodeVoltages: new Map(),
          edgeCurrents: new Map(),
        };
      }

      // Build node index mapping (excluding ground nodes which are 0V)
      const nodeIndexMap = this.buildNodeIndexMap(circuit, groundNodes);
      const numNodes = nodeIndexMap.size;
      const numVoltageSources = voltageSources.length;
      const matrixSize = numNodes + numVoltageSources;

      if (matrixSize === 0) {
        // Only ground nodes, all voltages are 0
        const nodeVoltages = new Map<string, number>();
        for (const nodeId of circuit.nodes.keys()) {
          nodeVoltages.set(nodeId, 0);
        }
        return {
          success: true,
          nodeVoltages,
          edgeCurrents: new Map(),
        };
      }

      // Build MNA matrices: G*v = i
      const { G, i } = this.buildMNAMatrices(circuit, nodeIndexMap, groundNodes, voltageSources);

      // Solve the linear system
      const solution = this.solveLinearSystem(G, i);

      if (!solution) {
        return {
          success: false,
          error: 'Circuit simulation failed. Possible short circuit or singular configuration.',
          nodeVoltages: new Map(),
          edgeCurrents: new Map(),
        };
      }

      // Extract node voltages from solution
      const nodeVoltages = this.extractNodeVoltages(solution, nodeIndexMap, groundNodes, circuit);

      // Calculate edge currents from voltage differences and MNA solution
      const edgeCurrents = this.calculateEdgeCurrents(circuit, nodeVoltages, solution, numNodes, voltageSources);

      return {
        success: true,
        nodeVoltages,
        edgeCurrents,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown simulation error',
        nodeVoltages: new Map(),
        edgeCurrents: new Map(),
      };
    }
  }

  /**
   * Analyze circuit to find ground nodes and voltage sources
   */
  private analyzeCircuit(circuit: Circuit): {
    groundNodes: Set<string>;
    voltageSources: Array<{ edge: CircuitEdge; voltage: number; positiveNode: string; negativeNode: string }>;
  } {
    const groundNodes = new Set<string>();
    const voltageSources: Array<{
      edge: CircuitEdge;
      voltage: number;
      positiveNode: string;
      negativeNode: string;
    }> = [];

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
          positiveNode: edge.nodeA,  // Higher voltage terminal
          negativeNode: edge.nodeB,  // Lower voltage terminal
        });
      }
    }

    return { groundNodes, voltageSources };
  }

  /**
   * Build mapping from node IDs to matrix indices (excluding ground)
   */
  private buildNodeIndexMap(circuit: Circuit, groundNodes: Set<string>): Map<string, number> {
    const nodeIndexMap = new Map<string, number>();
    let index = 0;

    for (const nodeId of circuit.nodes.keys()) {
      if (!groundNodes.has(nodeId)) {
        nodeIndexMap.set(nodeId, index++);
      }
    }

    return nodeIndexMap;
  }

  /**
   * Build MNA conductance matrix G and current vector i
   */
  private buildMNAMatrices(
    circuit: Circuit,
    nodeIndexMap: Map<string, number>,
    groundNodes: Set<string>,
    voltageSources: Array<{ edge: CircuitEdge; voltage: number; positiveNode: string; negativeNode: string }>
  ): { G: number[][]; i: number[] } {
    const numNodes = nodeIndexMap.size;
    const numVoltageSources = voltageSources.length;
    const matrixSize = numNodes + numVoltageSources;

    // Initialize matrices
    const G: number[][] = Array(matrixSize)
      .fill(0)
      .map(() => Array(matrixSize).fill(0));
    const i: number[] = Array(matrixSize).fill(0);

    // Process resistive components (resistors, wires, LEDs as resistors)
    for (const edge of circuit.edges) {
      const component = edge.component;
      let conductance = 0;

      if (component.type === ComponentType.RESISTOR) {
        conductance = 1 / component.resistance;
      } else if (component.type === ComponentType.WIRE) {
        conductance = CircuitSimulator.WIRE_CONDUCTANCE; // Very high conductance
      } else if (component.type === ComponentType.LED) {
        // Model LED as series resistor (simplified)
        // More accurate would be resistor + voltage source
        conductance = 1 / 100; // 100 ohm equivalent resistance
      } else if (component.type === ComponentType.GROUND || component.type === ComponentType.POWER_SUPPLY) {
        // Handled separately
        continue;
      }

      if (conductance < CircuitSimulator.MIN_CONDUCTANCE) {
        conductance = CircuitSimulator.MIN_CONDUCTANCE;
      }

      const nodeA = edge.nodeA;
      const nodeB = edge.nodeB;
      const isAGround = groundNodes.has(nodeA);
      const isBGround = groundNodes.has(nodeB);

      // Add conductance to matrix using stamp method
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

  /**
   * Solve linear system G*x = b using Gaussian elimination with partial pivoting
   */
  private solveLinearSystem(G: number[][], b: number[]): number[] | null {
    const n = G.length;
    if (n === 0) return [];

    // Create augmented matrix [G | b]
    const A: number[][] = G.map((row, i) => [...row, b[i]]);

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) {
          maxRow = row;
        }
      }

      // Check for singular matrix
      if (Math.abs(A[maxRow][col]) < CircuitSimulator.SINGULAR_THRESHOLD) {
        return null; // Singular matrix - circuit cannot be solved
      }

      // Swap rows
      if (maxRow !== col) {
        [A[col], A[maxRow]] = [A[maxRow], A[col]];
      }

      // Eliminate column below pivot
      for (let row = col + 1; row < n; row++) {
        const factor = A[row][col] / A[col][col];
        for (let k = col; k <= n; k++) {
          A[row][k] -= factor * A[col][k];
        }
      }
    }

    // Back substitution
    const x: number[] = Array(n).fill(0);
    for (let row = n - 1; row >= 0; row--) {
      let sum = A[row][n];
      for (let col = row + 1; col < n; col++) {
        sum -= A[row][col] * x[col];
      }
      x[row] = sum / A[row][row];
    }

    return x;
  }

  /**
   * Extract node voltages from solution vector
   */
  private extractNodeVoltages(
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
   * Calculate edge currents from node voltages using Ohm's law
   */
  private calculateEdgeCurrents(
    circuit: Circuit,
    nodeVoltages: Map<string, number>,
    solution: number[],
    numNodes: number,
    voltageSources: Array<{ edge: CircuitEdge; voltage: number; positiveNode: string; negativeNode: string }>
  ): Map<string, number> {
    const edgeCurrents = new Map<string, number>();

    // Build map from voltage source edge ID to current from MNA solution
    const voltageSourceCurrents = new Map<string, number>();
    for (let i = 0; i < voltageSources.length; i++) {
      const current = solution[numNodes + i]; // Current variables start after node voltages
      voltageSourceCurrents.set(voltageSources[i].edge.id, current);
    }

    for (const edge of circuit.edges) {
      const voltageA = nodeVoltages.get(edge.nodeA) || 0;
      const voltageB = nodeVoltages.get(edge.nodeB) || 0;
      const voltageDiff = voltageA - voltageB;

      let current = 0;
      const component = edge.component;

      if (component.type === ComponentType.RESISTOR) {
        current = voltageDiff / component.resistance;
      } else if (component.type === ComponentType.WIRE) {
        current = voltageDiff * CircuitSimulator.WIRE_CONDUCTANCE;
      } else if (component.type === ComponentType.LED) {
        // Simplified: treat as 100 ohm resistor
        // More accurate model would include forward voltage drop (Vf) as a voltage source in series
        current = voltageDiff / 100;
      } else if (component.type === ComponentType.POWER_SUPPLY) {
        // Extract current from MNA solution vector
        current = voltageSourceCurrents.get(edge.id) || 0;
      } else if (component.type === ComponentType.GROUND) {
        current = 0;
      }

      edgeCurrents.set(edge.id, current);
    }

    return edgeCurrents;
  }
}
