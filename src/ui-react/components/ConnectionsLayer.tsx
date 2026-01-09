/**
 * ConnectionsLayer - Renders all connections between components and holes
 */

import React, { useState, useEffect } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { Connection } from '@/ui-controller/types';
import { positionToPixels } from '../geometry/breadboard-layout';

export interface ConnectionsLayerProps {
  controller: BreadboardController;
}

export const ConnectionsLayer: React.FC<ConnectionsLayerProps> = ({ controller }) => {
  const [state, setState] = useState<AppState>(controller.getState());

  useEffect(() => {
    return controller.subscribe(setState);
  }, [controller]);

  return (
    <g className="connections-layer">
      {state.connections.list.map((connection) => (
        <ConnectionLine
          key={connection.id}
          connection={connection}
          isSelected={connection.id === state.connections.selectedConnectionId}
        />
      ))}
    </g>
  );
};

interface ConnectionLineProps {
  connection: Connection;
  isSelected: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ connection, isSelected }) => {
  const sourcePixels = positionToPixels(connection.sourcePosition);
  const targetPixels = positionToPixels(connection.targetPosition);

  return (
    <line
      x1={sourcePixels.x}
      y1={sourcePixels.y}
      x2={targetPixels.x}
      y2={targetPixels.y}
      stroke={isSelected ? '#3399ff' : '#888'}
      strokeWidth={isSelected ? 3 : 2}
      opacity={0.8}
      className="connection-line"
      style={{ pointerEvents: 'stroke' }}
    />
  );
};
