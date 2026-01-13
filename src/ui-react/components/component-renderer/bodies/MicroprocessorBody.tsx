import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';

/**
 * MicroprocessorBody - Renders microprocessor chip
 */
export const MicroprocessorBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.MICROPROCESSOR || component.positions.length === 0)
    return null;

  const positions = component.positions;
  const pixels = positions.map(positionToPixels);

  // Calculate bounding box
  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX + 40;
  const height = maxY - minY + 40;

  return (
    <>
      {/* Chip body */}
      <rect
        x={centerX - width / 2}
        y={centerY - height / 2}
        width={width}
        height={height}
        fill="#333"
        stroke="#000"
        strokeWidth="2"
        rx="5"
      />

      {/* Notch indicator (top-left) */}
      <circle
        cx={centerX - width / 2 + 10}
        cy={centerY - height / 2 + 10}
        r="5"
        fill="#666"
      />

      {/* Label */}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="10"
        fontWeight="bold"
      >
        EDU-8
      </text>

      {/* Pins */}
      {pixels.map((pixel, index) => (
        <circle key={index} cx={pixel.x} cy={pixel.y} r="4" fill="#888" />
      ))}
    </>
  );
};
