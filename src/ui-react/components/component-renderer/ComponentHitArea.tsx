import React from 'react';

import type { AnyComponent } from '@/core/types';
import { getComponentBoundsPixels } from '@/ui-react/components/component-renderer/geometry';

/**
 * SelectionOutline - Renders selection outline around component
 */
export const ComponentHitArea: React.FC<{ component: AnyComponent }> = ({ component }) => {
  const bounds = getComponentBoundsPixels(component.positions);
  if (!bounds) return null;

  return (
    <circle
      cx={bounds.cx}
      cy={bounds.cy}
      r={bounds.r + 6}
      fill="rgba(0,0,0,0)"
      pointerEvents="all"
    />
  );
};
