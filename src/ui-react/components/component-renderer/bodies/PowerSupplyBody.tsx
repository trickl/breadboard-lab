import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import powerSupplyPlaceholderUrl from '@/images/power-supply-placeholder.svg';
import { computeTwoPointMatrixFromViewBoxAnchors } from '@/ui-react/components/component-renderer/svg/alignTwoPointImage';

/**
 * PowerSupplyBody - Renders power supply/battery symbol
 */
export const PowerSupplyBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.POWER_SUPPLY || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]); // Positive
  const end = positionToPixels(component.positions[1]); // Negative
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;

  const iconLayout = {
    width: 160,
    height: 64,
    viewBox: { minX: 0, minY: 0, width: 160, height: 64 },
    preserveAspectRatio: 'xMidYMid meet' as const,
  };

  const legAnchors = {
    a0: { x: 0, y: 32 },
    a1: { x: 160, y: 32 },
  };

  const transform = computeTwoPointMatrixFromViewBoxAnchors(start, end, iconLayout, legAnchors);

  return (
    <>
      {/* Full-legged power supply icon */}
      <g transform={transform} style={{ pointerEvents: 'none' }}>
        <image
          href={powerSupplyPlaceholderUrl}
          x={0}
          y={0}
          width={iconLayout.width}
          height={iconLayout.height}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>

      {/* Voltage label */}
      <text
        x={centerX}
        y={centerY + 24}
        textAnchor="middle"
        fill="#fff"
        fontSize="10"
        fontWeight="bold"
      >
        {component.voltage}V
      </text>
    </>
  );
};
