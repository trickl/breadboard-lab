import React from 'react';

import type { AnyComponent } from '@/core/types';
import { getComponentBoundsPixels } from '@/ui-react/components/component-renderer/geometry';

export const HoverOrSelectionOutline: React.FC<{
  component: AnyComponent;
  isHovered: boolean;
  isSelected: boolean;
}> = ({ component, isHovered, isSelected }) => {
  const bounds = getComponentBoundsPixels(component.positions);
  if (!bounds) return null;

  if (!isHovered && !isSelected) return null;

  const stroke = '#3399ff';
  const strokeWidth = isSelected ? 2.5 : 2;
  const dashArray = isSelected ? undefined : '5,5';
  const opacity = isSelected ? 0.95 : 0.6;

  return (
    <circle
      cx={bounds.cx}
      cy={bounds.cy}
      r={bounds.r}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      opacity={opacity}
      pointerEvents="none"
    />
  );
};
