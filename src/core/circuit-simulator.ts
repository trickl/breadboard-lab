import type { Circuit, SimulationResult, CircuitEdge } from './types';
import { ComponentType } from './types';

/**
 * Simple circuit simulator using nodal analysis.
 * For the initial version, we'll use a simplified approach suitable for basic circuits.
 */
export class CircuitSimulator {
  /**
   * Simulate the circuit and calculate voltages and currents
   */
  simulate(circuit: Circuit): SimulationResult {
    try {
      // Initialize result
      const nodeVoltages = new Map<string, number>();
      const edgeCurrents = new Map<string, number>();

      // Find ground and power supply nodes
      const groundNodes = new Set<string>();
      const powerNodes = new Map<string, number>(); // node -> voltage

      for (const edge of circuit.edges) {
        if (edge.component.type === ComponentType.GROUND) {
          groundNodes.add(edge.nodeA);
          groundNodes.add(edge.nodeB);
        } else if (edge.component.type === ComponentType.POWER_SUPPLY) {
          const supply = edge.component;
          powerNodes.set(edge.nodeA, supply.voltage);
          powerNodes.set(edge.nodeB, supply.voltage);
        }
      }

      // Set ground nodes to 0V
      for (const nodeId of groundNodes) {
        nodeVoltages.set(nodeId, 0);
      }

      // Set power supply nodes
      for (const [nodeId, voltage] of powerNodes) {
        nodeVoltages.set(nodeId, voltage);
      }

      // For this simple implementation, we'll do basic voltage division for resistive circuits
      // This is a simplified approach - a full simulator would use matrix methods (nodal/mesh analysis)
      
      // Find series paths from power to ground
      const paths = this.findSeriesPaths(circuit, powerNodes, groundNodes);
      
      for (const path of paths) {
        this.simulatePath(path, nodeVoltages, edgeCurrents);
      }

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
   * Find simple series paths from power to ground
   */
  private findSeriesPaths(
    circuit: Circuit,
    powerNodes: Map<string, number>,
    groundNodes: Set<string>
  ): CircuitEdge[][] {
    const paths: CircuitEdge[][] = [];
    
    // Simple path finding: traverse from power nodes to ground nodes
    for (const [powerNode, voltage] of powerNodes) {
      const visited = new Set<string>();
      const currentPath: CircuitEdge[] = [];
      
      this.dfsPath(
        circuit,
        powerNode,
        groundNodes,
        visited,
        currentPath,
        paths,
        voltage
      );
    }
    
    return paths;
  }

  /**
   * DFS to find paths from start to ground
   */
  private dfsPath(
    circuit: Circuit,
    currentNode: string,
    groundNodes: Set<string>,
    visited: Set<string>,
    currentPath: CircuitEdge[],
    paths: CircuitEdge[][],
    _sourceVoltage: number
  ): void {
    if (groundNodes.has(currentNode)) {
      // Found a complete path
      if (currentPath.length > 0) {
        paths.push([...currentPath]);
      }
      return;
    }

    visited.add(currentNode);

    // Find all edges connected to current node
    for (const edge of circuit.edges) {
      let nextNode: string | null = null;

      if (edge.nodeA === currentNode && !visited.has(edge.nodeB)) {
        nextNode = edge.nodeB;
      } else if (edge.nodeB === currentNode && !visited.has(edge.nodeA)) {
        nextNode = edge.nodeA;
      }

      if (nextNode) {
        currentPath.push(edge);
        this.dfsPath(circuit, nextNode, groundNodes, visited, currentPath, paths, _sourceVoltage);
        currentPath.pop();
      }
    }

    visited.delete(currentNode);
  }

  /**
   * Simulate a series path using voltage division
   */
  private simulatePath(
    path: CircuitEdge[],
    nodeVoltages: Map<string, number>,
    edgeCurrents: Map<string, number>
  ): void {
    if (path.length === 0) return;

    // Calculate total resistance
    let totalResistance = 0;
    for (const edge of path) {
      const component = edge.component;
      if (component.type === ComponentType.RESISTOR) {
        totalResistance += component.resistance;
      } else if (component.type === ComponentType.WIRE) {
        totalResistance += component.resistance;
      } else if (component.type === ComponentType.LED) {
        // Simplified LED model: treat as small resistance with forward voltage
        totalResistance += 100; // Approximate as 100 ohm resistance
      }
    }

    // Get source voltage (from first node)
    const startVoltage = nodeVoltages.get(path[0].nodeA) || nodeVoltages.get(path[0].nodeB) || 0;
    
    // Calculate current (Ohm's law)
    const current = totalResistance > 0 ? startVoltage / totalResistance : 0;

    // Calculate voltage drops and set node voltages
    let currentVoltage = startVoltage;
    for (const edge of path) {
      edgeCurrents.set(edge.id, current);

      const component = edge.component;
      let voltageDrop = 0;

      if (component.type === ComponentType.RESISTOR) {
        voltageDrop = current * component.resistance;
      } else if (component.type === ComponentType.WIRE) {
        voltageDrop = current * component.resistance;
      } else if (component.type === ComponentType.LED) {
        voltageDrop = component.forwardVoltage;
      }

      currentVoltage -= voltageDrop;

      // Set voltage at the "to" node
      const toNode = edge.nodeB;
      if (!nodeVoltages.has(toNode)) {
        nodeVoltages.set(toNode, currentVoltage);
      }
    }
  }
}
