import React from 'react';

import type { AnyComponent } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';

/**
 * RotationHandle - Renders rotation handle for selected component
 */
export const RotationHandle: React.FC<{ component: AnyComponent }> = ({ component }) => {
  const positions = component.positions;
  if (positions.length === 0) return null;

  const pixels = positions.map(positionToPixels);
  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);

  const centerX = (minX + maxX) / 2;
  const topY = minY - 30;

  return (
    <g data-rotation-handle="true" data-component-control="true" style={{ cursor: 'pointer' }}>
      {/* Handle circle */}
      <circle cx={centerX} cy={topY} r="12" fill="#3399ff" stroke="#fff" strokeWidth="2" />

      {/* Rotation icon (circular arrow) */}
      <path
        d={`M ${centerX} ${topY - 6}
            A 6 6 0 1 1 ${centerX - 6} ${topY}
            L ${centerX - 3} ${topY + 3}
            L ${centerX - 6} ${topY}
            L ${centerX - 3} ${topY - 3}`}
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};
