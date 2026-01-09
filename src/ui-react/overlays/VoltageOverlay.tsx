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
  getComponents,
  getConnections,
} from '@/ui-controller/selectors';
import { positionToPixels } from '../geometry/breadboard-layout';
import { BreadboardLayout } from '@/core/breadboard-layout';

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
 * Get all positions that are part of a net with voltage
 */
function getNetPositions(state: AppState): Map<string, number> {
  const simulationResult = getSimulationResult(state);
  if (!simulationResult || !simulationResult.success) {
    return new Map();
  }

  const positionVoltages = new Map<string, number>();
  const components = getComponents(state);
  const connections = getConnections(state);

  // Map each component pin position to its voltage
  for (const component of components) {
    for (let i = 0; i < component.positions.length; i++) {
      const pos = component.positions[i];
      
      // Find the net this position belongs to
      const connectedPositions = BreadboardLayout.getConnectedPositions(pos);
      
      // Check simulation result for voltage at this net
      // The simulation stores voltages by node ID, which corresponds to connected positions
      for (const [_nodeId, voltage] of simulationResult.nodeVoltages.entries()) {
        // Simple heuristic: if the nodeId contains this position, use it
        // In practice, we'd need the circuit extractor's position-to-node mapping
        // For now, we'll just store voltages for all connected holes
        for (const connectedPos of connectedPositions) {
          const connectedKey = `${connectedPos.row},${connectedPos.col}`;
          if (!positionVoltages.has(connectedKey)) {
            positionVoltages.set(connectedKey, voltage);
          }
        }
      }
    }
  }

  // Also include connection target positions
  for (const connection of connections) {
    
    // Find voltage for these positions from simulation
    for (const [_nodeId, voltage] of simulationResult.nodeVoltages.entries()) {
      const connectedSource = BreadboardLayout.getConnectedPositions(connection.sourcePosition);
      const connectedTarget = BreadboardLayout.getConnectedPositions(connection.targetPosition);
      
      for (const pos of connectedSource) {
        const key = `${pos.row},${pos.col}`;
        if (!positionVoltages.has(key)) {
          positionVoltages.set(key, voltage);
        }
      }
      
      for (const pos of connectedTarget) {
        const key = `${pos.row},${pos.col}`;
        if (!positionVoltages.has(key)) {
          positionVoltages.set(key, voltage);
        }
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
    return getNetPositions(state);
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
