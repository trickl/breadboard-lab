import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';

/**
 * WireBody - Renders wire connection
 */
export const WireBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.WIRE || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]);
  const end = positionToPixels(component.positions[1]);

  // Simple Manhattan routing
  const pathData = `
    M ${start.x} ${start.y}
    L ${start.x} ${(start.y + end.y) / 2}
    L ${end.x} ${(start.y + end.y) / 2}
    L ${end.x} ${end.y}
  `;

  return (
    <>
      <path
        d={pathData.trim()}
        stroke="#ff0000"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Connection dots */}
      <circle cx={start.x} cy={start.y} r="4" fill="#ff0000" />
      <circle cx={end.x} cy={end.y} r="4" fill="#ff0000" />
    </>
  );
};
