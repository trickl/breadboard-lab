import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';

/**
 * GroundBody - Renders ground symbol
 */
export const GroundBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.GROUND || component.positions.length < 1) return null;

  const pos = positionToPixels(component.positions[0]);

  return (
    <>
      {/* Ground symbol - three decreasing horizontal lines */}
      <line
        x1={pos.x - 15}
        y1={pos.y}
        x2={pos.x + 15}
        y2={pos.y}
        stroke="#000"
        strokeWidth="3"
      />
      <line
        x1={pos.x - 10}
        y1={pos.y + 6}
        x2={pos.x + 10}
        y2={pos.y + 6}
        stroke="#000"
        strokeWidth="3"
      />
      <line
        x1={pos.x - 5}
        y1={pos.y + 12}
        x2={pos.x + 5}
        y2={pos.y + 12}
        stroke="#000"
        strokeWidth="3"
      />

      {/* Pin */}
      <circle cx={pos.x} cy={pos.y} r="4" fill="#888" />
    </>
  );
};
