/**
 * VoltageOverlay - Renders voltage heatmap overlay on breadboard holes
 * 
 * Displays semi-transparent colored circles at hole positions based on simulation voltage.
 * Color mapping: 0V = Blue, Positive voltage = Red, Negative voltage = Darker blue
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { Position } from '@/core/types';
import { 
  isVoltageOverlayEnabled, 
  getSimulationResult, 
  getCircuit,
} from '@/ui-controller/selectors';
import { positionToPixels } from '../geometry/breadboard-layout';

export interface VoltageOverlayProps {
  controller: BreadboardController;
}

/**
 * Convert voltage to RGB color using a heatmap
 * 0V = Blue (#0000ff)
 * Positive voltage = Red (#ff0000)
 * Negative voltage = Darker blue
 */
function voltageToColor(voltage: number, maxVoltage: number = 12): string {
  const absVoltage = Math.abs(voltage);
  
  if (voltage >= 0) {
    // Positive voltage: interpolate from blue (0V) to red (maxVoltage)
    const ratio = Math.min(absVoltage / maxVoltage, 1);
    const r = Math.round(ratio * 255);
    const b = Math.round((1 - ratio) * 255);
    return `rgb(${r}, 0, ${b})`;
  } else {
    // Negative voltage: darker shades of blue
    const ratio = Math.min(absVoltage / maxVoltage, 1);
    const b = Math.round((1 - ratio * 0.5) * 200); // Darker blue
    return `rgb(0, 0, ${b})`;
  }
}

/**
 * Get all positions with their voltages from the circuit
 */
function getPositionVoltages(state: AppState): Map<string, number> {
  const circuit = getCircuit(state);
  const simulationResult = getSimulationResult(state);
  
  if (!circuit || !simulationResult || !simulationResult.success) {
    return new Map();
  }

  const positionVoltages = new Map<string, number>();

  // Iterate through circuit nodes and map their positions to voltages
  for (const [nodeId, node] of circuit.nodes.entries()) {
    const voltage = simulationResult.nodeVoltages.get(nodeId);
    if (voltage !== undefined) {
      // All positions in this node have the same voltage
      for (const pos of node.positions) {
        const posKey = `${pos.row},${pos.col}`;
        positionVoltages.set(posKey, voltage);
      }
    }
  }

  return positionVoltages;
}

export const VoltageOverlay: React.FC<VoltageOverlayProps> = ({ controller }) => {
  const [state, setState] = useState<AppState>(controller.getState());

  useEffect(() => {
    return controller.subscribe(setState);
  }, [controller]);

  const isEnabled = isVoltageOverlayEnabled(state);
  const simulationResult = getSimulationResult(state);

  // Calculate voltage positions
  const voltagePositions = useMemo(() => {
    if (!isEnabled || !simulationResult || !simulationResult.success) {
      return new Map<string, number>();
    }
    return getPositionVoltages(state);
  }, [isEnabled, simulationResult, state]);

  if (!isEnabled || voltagePositions.size === 0) {
    return null;
  }

  // Determine max voltage for color scaling
  const maxVoltage = Math.max(
    12, // Default max
    ...Array.from(simulationResult?.nodeVoltages.values() || []).map(Math.abs)
  );

  return (
    <g className="voltage-overlay" style={{ pointerEvents: 'none' }}>
      {Array.from(voltagePositions.entries()).map(([posKey, voltage]) => {
        const [row, col] = posKey.split(',').map(Number);
        const pos: Position = { row, col };
        const pixels = positionToPixels(pos);
        const color = voltageToColor(voltage, maxVoltage);

        return (
          <circle
            key={posKey}
            cx={pixels.x}
            cy={pixels.y}
            r={11}
            fill={color}
            opacity={0.45}
            className="voltage-indicator"
          />
        );
      })}
    </g>
  );
};
