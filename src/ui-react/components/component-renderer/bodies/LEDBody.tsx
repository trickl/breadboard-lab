import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import ledLampRedOffUrl from '@/images/led-lamp-red-off.svg';

/**
 * LEDBody - Renders LED with polarity indicator
 */
export const LEDBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.LED || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]); // Anode (+)
  const end = positionToPixels(component.positions[1]); // Cathode (-)
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  return (
    <>
      {/* LED SVG (scales nicely and looks more like a real component) */}
      <image
        href={ledLampRedOffUrl}
        x={centerX - 32}
        y={centerY - 32}
        width={64}
        height={64}
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
};
