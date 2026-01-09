/**
 * CurrentAnimation - Renders animated current flow on connections
 * 
 * Displays animated dash patterns on connections with non-zero current.
 * Animation direction reflects current flow direction.
 * Animation speed is proportional to current magnitude.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import { 
  isCurrentAnimationEnabled, 
  getSimulationResult,
  getConnections,
} from '@/ui-controller/selectors';
import { positionToPixels } from '../geometry/breadboard-layout';

export interface CurrentAnimationProps {
  controller: BreadboardController;
}

const CURRENT_THRESHOLD = 0.001; // Minimum current to animate (1mA)

/**
 * Get animation parameters for a connection based on current
 */
function getAnimationParams(current: number): {
  dashArray: string;
  dashOffset: number;
  duration: number;
  direction: 1 | -1;
} {
  const magnitude = Math.abs(current);
  const direction = current >= 0 ? 1 : -1;
  
  // Animation speed: faster for higher currents
  // Base duration of 2s for 0.1A, scales inversely with current
  const baseDuration = 2;
  const duration = baseDuration / Math.max(magnitude / 0.1, 0.5);
  
  return {
    dashArray: '8 4', // 8px dash, 4px gap
    dashOffset: 0, // Will be animated
    duration: Math.max(duration, 0.5), // Min 0.5s, max depends on current
    direction,
  };
}

export const CurrentAnimation: React.FC<CurrentAnimationProps> = ({ controller }) => {
  const [state, setState] = useState<AppState>(controller.getState());

  useEffect(() => {
    return controller.subscribe(setState);
  }, [controller]);

  const isEnabled = isCurrentAnimationEnabled(state);
  const simulationResult = getSimulationResult(state);
  const connections = getConnections(state);

  // Filter connections with measurable current
  const animatedConnections = useMemo(() => {
    if (!isEnabled || !simulationResult || !simulationResult.success) {
      return [];
    }

    return connections
      .map(conn => {
        // Try to find edge current for this connection
        // The edge ID in the simulation corresponds to the source component ID
        // because connections are created from component legs
        // First try the source component ID (most common case)
        let current = simulationResult.edgeCurrents.get(conn.sourceComponentId);
        
        // Fallback: try the connection ID itself (for special cases)
        if (current === undefined) {
          current = simulationResult.edgeCurrents.get(conn.id);
        }
        
        // Default to 0 if no current found
        if (current === undefined) {
          current = 0;
        }

        return { connection: conn, current };
      })
      .filter(item => Math.abs(item.current) > CURRENT_THRESHOLD);
  }, [isEnabled, simulationResult, connections]);

  if (!isEnabled || animatedConnections.length === 0) {
    return null;
  }

  return (
    <g className="current-animation" style={{ pointerEvents: 'none' }}>
      {animatedConnections.map(({ connection, current }) => {
        const sourcePixels = positionToPixels(connection.sourcePosition);
        const targetPixels = positionToPixels(connection.targetPosition);
        const animParams = getAnimationParams(current);

        return (
          <g key={connection.id}>
            <line
              x1={sourcePixels.x}
              y1={sourcePixels.y}
              x2={targetPixels.x}
              y2={targetPixels.y}
              stroke="#ffff00" // Yellow for current animation
              strokeWidth={3}
              strokeDasharray={animParams.dashArray}
              opacity={0.7}
              className="current-indicator"
            >
              <animate
                attributeName="stroke-dashoffset"
                from={animParams.direction > 0 ? 0 : 12}
                to={animParams.direction > 0 ? 12 : 0}
                dur={`${animParams.duration}s`}
                repeatCount="indefinite"
              />
            </line>
          </g>
        );
      })}
    </g>
  );
};
