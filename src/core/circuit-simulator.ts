import type { Circuit, SimulationResult, CircuitEdge, CircuitError } from './types';
import { ComponentType, ErrorType } from './types';

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
          errors: [],
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
          errors: [],
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
          errors: [],
        };
      }

      // Extract node voltages from solution
      const nodeVoltages = this.extractNodeVoltages(solution, nodeIndexMap, groundNodes, circuit);

      // Calculate edge currents from voltage differences and MNA solution
      const edgeCurrents = this.calculateEdgeCurrents(
        circuit,
        nodeVoltages,
        solution,
        numNodes,
        voltageSources
      );

      // Detect circuit errors
      const errors = this.detectErrors(
        circuit,
        nodeVoltages,
        edgeCurrents,
        groundNodes,
        voltageSources
      );

      return {
        success: true,
        nodeVoltages,
        edgeCurrents,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown simulation error',
        nodeVoltages: new Map(),
        edgeCurrents: new Map(),
        errors: [],
      };
    }
  }

  /**
   * Analyze circuit to find ground nodes and voltage sources
   */
  private analyzeCircuit(circuit: Circuit): {
    groundNodes: Set<string>;
    voltageSources: Array<{
      edge: CircuitEdge;
      voltage: number;
      positiveNode: string;
      negativeNode: string;
    }>;
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
          positiveNode: edge.nodeA, // Higher voltage terminal
          negativeNode: edge.nodeB, // Lower voltage terminal
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
    voltageSources: Array<{
      edge: CircuitEdge;
      voltage: number;
      positiveNode: string;
      negativeNode: string;
    }>
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
      } else if (component.type === ComponentType.SWITCH) {
        // Switch as variable resistor based on state
        const switchState = component.switchState ?? 'open';
        const resistance =
          switchState === 'closed'
            ? 0.01 // Wire-like resistance when closed
            : 1e9; // Near-infinite resistance when open (1 GΩ)
        conductance = 1 / resistance;
      } else if (
        component.type === ComponentType.GROUND ||
        component.type === ComponentType.POWER_SUPPLY
      ) {
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
    voltageSources: Array<{
      edge: CircuitEdge;
      voltage: number;
      positiveNode: string;
      negativeNode: string;
    }>
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
      } else if (component.type === ComponentType.SWITCH) {
        // Calculate current based on switch state
        const switchState = component.switchState ?? 'open';
        const resistance = switchState === 'closed' ? 0.01 : 1e9;
        current = voltageDiff / resistance;
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

  /**
   * Detect circuit errors based on simulation results
   */
  private detectErrors(
    circuit: Circuit,
    nodeVoltages: Map<string, number>,
    edgeCurrents: Map<string, number>,
    groundNodes: Set<string>,
    voltageSources: Array<{
      edge: CircuitEdge;
      voltage: number;
      positiveNode: string;
      negativeNode: string;
    }>
  ): CircuitError[] {
    const errors: CircuitError[] = [];

    // 1. Detect short circuits (power supply with very high current)
    for (const vs of voltageSources) {
      const current = Math.abs(edgeCurrents.get(vs.edge.id) || 0);
      if (current > 10) {
        // More than 10A indicates potential short circuit
        const node = circuit.nodes.get(vs.positiveNode);
        errors.push({
          type: ErrorType.SHORT_CIRCUIT,
          severity: 'error',
          componentId: vs.edge.component.id,
          nodeId: vs.positiveNode,
          positions: node?.positions || [],
          message: 'Short circuit detected',
          explanation:
            'The power supply is delivering excessive current (>10A), which indicates a direct or near-direct connection to ground with very little resistance. This would damage a real power supply.',
          suggestions: [
            'Add resistors to limit current flow',
            'Check for unintended wire connections between power and ground',
            'Verify component placement and connections',
          ],
        });
      }
    }

    // 2. Detect floating nodes (nodes with very low voltage that should be powered)
    for (const [nodeId, node] of circuit.nodes) {
      if (groundNodes.has(nodeId)) continue;

      const voltage = nodeVoltages.get(nodeId) || 0;

      // Check if node is connected to any components
      const connectedEdges = circuit.edges.filter(
        (edge) => edge.nodeA === nodeId || edge.nodeB === nodeId
      );

      // Skip if node has no components (shouldn't happen but be safe)
      if (connectedEdges.length === 0) continue;

      // Check if any edge has non-zero current (indicating node is in active circuit)
      const hasActiveCurrent = connectedEdges.some(
        (edge) => Math.abs(edgeCurrents.get(edge.id) || 0) > 1e-6
      );

      // If node has components but very low voltage and no current, it might be floating
      if (Math.abs(voltage) < 0.1 && !hasActiveCurrent && connectedEdges.length > 0) {
        // Check if it's connected to a power source or ground (not floating)
        const hasGroundConnection = connectedEdges.some(
          (edge) => edge.component.type === ComponentType.GROUND
        );
        const hasPowerConnection = connectedEdges.some(
          (edge) => edge.component.type === ComponentType.POWER_SUPPLY
        );

        if (!hasGroundConnection && !hasPowerConnection) {
          errors.push({
            type: ErrorType.FLOATING_NODE,
            severity: 'warning',
            nodeId: nodeId,
            positions: node.positions,
            message: 'Floating node detected',
            explanation:
              'This node is not connected to either power or ground, so it has no defined voltage. Components connected to floating nodes will not function.',
            suggestions: [
              'Connect this node to a power supply or ground',
              'Add a wire to complete the circuit path',
              'Verify all component connections are complete',
            ],
          });
        }
      }
    }

    // 3. Detect reversed LEDs (negative current through LED)
    for (const edge of circuit.edges) {
      if (edge.component.type === ComponentType.LED) {
        const current = edgeCurrents.get(edge.id) || 0;

        if (current < -1e-6) {
          // Current is flowing backwards through LED
          errors.push({
            type: ErrorType.REVERSED_LED,
            severity: 'error',
            componentId: edge.component.id,
            positions: edge.component.positions,
            message: 'LED connected backwards',
            explanation:
              'LEDs only conduct current in one direction (from anode to cathode). When connected backwards, they block current flow and will not light up. The longer leg (anode) should connect toward the positive voltage.',
            suggestions: [
              'Rotate the LED 180 degrees to reverse polarity',
              'Verify the LED anode (longer leg) is connected to higher voltage',
              'Check that current flows from positive to negative through the LED',
            ],
          });
        }
      }
    }

    // 4. Detect open circuits (LEDs with zero current when they should conduct)
    for (const edge of circuit.edges) {
      if (edge.component.type === ComponentType.LED) {
        const current = Math.abs(edgeCurrents.get(edge.id) || 0);
        const voltageA = nodeVoltages.get(edge.nodeA) || 0;
        const voltageB = nodeVoltages.get(edge.nodeB) || 0;
        const voltageDiff = Math.abs(voltageA - voltageB);

        // If there's voltage across the LED but no current, it might be an open circuit
        if (voltageDiff > 1.0 && current < 1e-6) {
          errors.push({
            type: ErrorType.OPEN_CIRCUIT,
            severity: 'warning',
            componentId: edge.component.id,
            positions: edge.component.positions,
            message: 'Possible open circuit',
            explanation:
              'There is voltage across this LED but no current flowing. This could indicate a broken connection, a component not properly inserted, or the LED is connected backwards.',
            suggestions: [
              'Check all wire and component connections',
              'Verify the LED is oriented correctly (not backwards)',
              'Ensure all components are fully inserted into breadboard holes',
            ],
          });
        }
      }
    }

    // 5. Detect overcurrent through LEDs
    for (const edge of circuit.edges) {
      if (edge.component.type === ComponentType.LED) {
        const current = Math.abs(edgeCurrents.get(edge.id) || 0);
        const maxCurrent = edge.component.maxCurrent;

        if (current > maxCurrent * 1.5) {
          // Current is significantly above max rating
          errors.push({
            type: ErrorType.OVERCURRENT,
            severity: 'warning',
            componentId: edge.component.id,
            positions: edge.component.positions,
            message: 'LED overcurrent detected',
            explanation: `The LED is conducting ${(current * 1000).toFixed(1)}mA, which exceeds its maximum rating of ${(maxCurrent * 1000).toFixed(1)}mA. This will damage the LED over time. LEDs need a current-limiting resistor in series.`,
            suggestions: [
              'Add a series resistor to limit current',
              `For a 5V supply and ${(maxCurrent * 1000).toFixed(1)}mA max current, use a ${Math.round((5 - 2) / maxCurrent / 100) * 100}Ω or larger resistor`,
              "Use Ohm's Law: R = (Vsupply - VLED) / Idesired",
            ],
          });
        }
      }
    }

    return errors;
  }
}
