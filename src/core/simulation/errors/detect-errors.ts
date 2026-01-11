import type { Circuit, CircuitError } from '../../types';
import { ComponentType, ErrorType } from '../../types';
import type { VoltageSource } from '../mna/analyze';

/**
 * Detect circuit errors based on simulation results.
 *
 * Extracted from `CircuitSimulator`.
 */
export function detectErrors(
  circuit: Circuit,
  nodeVoltages: Map<string, number>,
  edgeCurrents: Map<string, number>,
  groundNodes: Set<string>,
  voltageSources: VoltageSource[]
): CircuitError[] {
  return [
    ...detectShortCircuits(circuit, edgeCurrents, voltageSources),
    ...detectFloatingNodes(circuit, nodeVoltages, edgeCurrents, groundNodes),
    ...detectReversedLeds(circuit, edgeCurrents),
    ...detectOpenCircuits(circuit, nodeVoltages, edgeCurrents),
    ...detectLedOvercurrent(circuit, edgeCurrents),
  ];
}

function detectShortCircuits(
  circuit: Circuit,
  edgeCurrents: Map<string, number>,
  voltageSources: VoltageSource[]
): CircuitError[] {
  const errors: CircuitError[] = [];
  for (const vs of voltageSources) {
    const current = Math.abs(edgeCurrents.get(vs.edge.id) ?? 0);
    if (current <= 10) {
      continue;
    }

    const node = circuit.nodes.get(vs.positiveNode);
    errors.push({
      type: ErrorType.SHORT_CIRCUIT,
      severity: 'error',
      componentId: vs.edge.component.id,
      nodeId: vs.positiveNode,
      positions: node?.positions ?? [],
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
  return errors;
}

function detectFloatingNodes(
  circuit: Circuit,
  nodeVoltages: Map<string, number>,
  edgeCurrents: Map<string, number>,
  groundNodes: Set<string>
): CircuitError[] {
  const errors: CircuitError[] = [];

  for (const [nodeId, node] of circuit.nodes) {
    if (groundNodes.has(nodeId)) {
      continue;
    }

    const voltage = nodeVoltages.get(nodeId) ?? 0;
    const connectedEdges = circuit.edges.filter(
      (edge) => edge.nodeA === nodeId || edge.nodeB === nodeId
    );
    if (connectedEdges.length === 0) {
      continue;
    }

    const hasActiveCurrent = connectedEdges.some(
      (edge) => Math.abs(edgeCurrents.get(edge.id) ?? 0) > 1e-6
    );
    if (Math.abs(voltage) >= 0.1 || hasActiveCurrent) {
      continue;
    }

    const hasGroundConnection = connectedEdges.some(
      (edge) => edge.component.type === ComponentType.GROUND
    );
    const hasPowerConnection = connectedEdges.some(
      (edge) => edge.component.type === ComponentType.POWER_SUPPLY
    );
    if (hasGroundConnection || hasPowerConnection) {
      continue;
    }

    errors.push({
      type: ErrorType.FLOATING_NODE,
      severity: 'warning',
      nodeId,
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

  return errors;
}

function detectReversedLeds(circuit: Circuit, edgeCurrents: Map<string, number>): CircuitError[] {
  const errors: CircuitError[] = [];
  for (const edge of circuit.edges) {
    if (edge.component.type !== ComponentType.LED) {
      continue;
    }

    const current = edgeCurrents.get(edge.id) ?? 0;
    if (current >= -1e-6) {
      continue;
    }

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
  return errors;
}

function detectOpenCircuits(
  circuit: Circuit,
  nodeVoltages: Map<string, number>,
  edgeCurrents: Map<string, number>
): CircuitError[] {
  const errors: CircuitError[] = [];
  for (const edge of circuit.edges) {
    if (edge.component.type !== ComponentType.LED) {
      continue;
    }

    const current = Math.abs(edgeCurrents.get(edge.id) ?? 0);
    const voltageA = nodeVoltages.get(edge.nodeA) ?? 0;
    const voltageB = nodeVoltages.get(edge.nodeB) ?? 0;
    const voltageDiff = Math.abs(voltageA - voltageB);

    if (voltageDiff <= 1.0 || current >= 1e-6) {
      continue;
    }

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
  return errors;
}

function detectLedOvercurrent(circuit: Circuit, edgeCurrents: Map<string, number>): CircuitError[] {
  const errors: CircuitError[] = [];
  for (const edge of circuit.edges) {
    if (edge.component.type !== ComponentType.LED) {
      continue;
    }

    const current = Math.abs(edgeCurrents.get(edge.id) ?? 0);
    const maxCurrent = edge.component.maxCurrent;
    if (current <= maxCurrent * 1.5) {
      continue;
    }

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
  return errors;
}
