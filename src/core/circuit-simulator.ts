import type { Circuit, SimulationResult } from './types';
import { solveLinearSystem } from './simulation/mna/linear-solver';
import { analyzeCircuit, buildNodeIndexMap } from './simulation/mna/analyze';
import { buildMNAMatrices } from './simulation/mna/mna-matrices';
import { calculateEdgeCurrents, extractNodeVoltages } from './simulation/results';
import { detectErrors } from './simulation/errors/detect-errors';

/**
 * Circuit simulator using Modified Nodal Analysis (MNA).
 * Handles parallel circuits, voltage dividers, and multiple current paths.
 */
export class CircuitSimulator {
  /**
   * Simulate the circuit and calculate voltages and currents using MNA
   */
  simulate(circuit: Circuit): SimulationResult {
    try {
      // Identify ground nodes and voltage sources
      const { groundNodes, voltageSources } = analyzeCircuit(circuit);

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
      const nodeIndexMap = buildNodeIndexMap(circuit, groundNodes);
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
      const { G, i } = buildMNAMatrices(circuit, nodeIndexMap, groundNodes, voltageSources);

      // Solve the linear system
      const solution = solveLinearSystem(G, i);

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
      const nodeVoltages = extractNodeVoltages(solution, nodeIndexMap, groundNodes, circuit);

      // Calculate edge currents from voltage differences and MNA solution
      const edgeCurrents = calculateEdgeCurrents(
        circuit,
        nodeVoltages,
        solution,
        numNodes,
        voltageSources
      );

      // Detect circuit errors
      const errors = detectErrors(circuit, nodeVoltages, edgeCurrents, groundNodes, voltageSources);

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
}
