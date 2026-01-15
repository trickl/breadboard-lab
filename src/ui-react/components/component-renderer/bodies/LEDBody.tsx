import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import ledLampRedOffUrl from '@/images/led-lamp-red-off-cropped.svg';
import { computeTwoPointMatrixFromViewBoxAnchors } from '@/ui-react/components/component-renderer/svg/alignTwoPointImage';

/**
 * LEDBody - Renders LED with polarity indicator
 */
export const LEDBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.LED || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]); // Anode (+)
  const end = positionToPixels(component.positions[1]); // Cathode (-)

  // The LED SVG has its own internal coordinate system (viewBox). We define two anchor points
  // in that viewBox corresponding to the approximate *tips* of the two legs, and then compute
  // a similarity transform so those tips land on the two socket points.
  //
  // NOTE: This is scaffolding. When we replace the SVG with a photorealistic icon, we should
  // tighten the viewBox and update these anchors precisely.
  const iconLayout = {
    // Use a tall icon rectangle so preserveAspectRatio "meet" is constrained by width,
    // preventing the LED from becoming comically huge when aligned.
    width: 64,
    height: 160,
    // Must match the SVG file's viewBox.
    viewBox: { minX: 310, minY: 40, width: 210, height: 520 },
    preserveAspectRatio: 'xMidYMid meet' as const,
  };

  const legAnchors = {
    // Approx leg tips from the original art (in the original coordinate space).
    a0: { x: 395.128, y: 543.794 },
    a1: { x: 458.761, y: 543.794 },
  };

  const transform = computeTwoPointMatrixFromViewBoxAnchors(start, end, iconLayout, legAnchors);
  return (
    <>
      {/* LED SVG aligned so its leg tips land on the component sockets. */}
      <image
        href={ledLampRedOffUrl}
        x={0}
        y={0}
        width={iconLayout.width}
        height={iconLayout.height}
        preserveAspectRatio="xMidYMid meet"
        transform={transform}
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
};
