/**
 * ConnectionDragPreview - Renders preview line during connection drag
 */

import React from 'react';
import type { ConnectionDragState } from '@/ui-controller/types';
import { positionToPixels } from '../geometry/breadboard-layout';

export interface ConnectionDragPreviewProps {
  dragState: ConnectionDragState;
}

export const ConnectionDragPreview: React.FC<ConnectionDragPreviewProps> = ({ dragState }) => {
  const sourcePixels = positionToPixels(dragState.sourcePosition);
  const targetPixels = dragState.currentPointerPosition;

  const strokeColor = dragState.isValidTarget ? '#00ff00' : '#ff0000';

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Preview line from source to pointer */}
      <line
        x1={sourcePixels.x}
        y1={sourcePixels.y}
        x2={targetPixels.x}
        y2={targetPixels.y}
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray="4 4"
        opacity={0.7}
      />

      {/* Highlight circle on hovered hole */}
      {dragState.hoveredHolePosition && (
        <circle
          cx={positionToPixels(dragState.hoveredHolePosition).x}
          cy={positionToPixels(dragState.hoveredHolePosition).y}
          r={10}
          fill={strokeColor}
          opacity={0.3}
        />
      )}
    </g>
  );
};
