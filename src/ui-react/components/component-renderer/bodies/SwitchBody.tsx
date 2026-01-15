import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import { getComponentBoundsPixels } from '@/ui-react/components/component-renderer/geometry';
import switchPlaceholderUrl from '@/images/switch-placeholder.svg';
import { computeBestFitSimilarityMatrixFromViewBoxAnchors } from '@/ui-react/components/component-renderer/svg/alignTwoPointImage';

/**
 * SwitchBody - Renders switch component
 */
export const SwitchBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.SWITCH || component.positions.length < 2) return null;

  // IMPORTANT:
  // Our switch can be either legacy 2-pin or the newer 4-pin tactile footprint.
  // Using only the first two pins to compute the visual center places the body on the top row
  // for a 4-pin switch, which makes it hard to grab because leg hit targets can cover it.
  // Compute the center from the full footprint in pixel space.
  const bounds = getComponentBoundsPixels(component.positions);
  if (!bounds) return null;
  const centerX = bounds.cx;
  const centerY = bounds.cy;

  const pins = component.positions.map(positionToPixels);

  // If this is a 4-pin tactile footprint, align the icon to all 4 sockets.
  // For legacy 2-pin switches we can fall back to the old behavior later, but
  // today most uses are the 4-pin switch.
  const isFourPin = pins.length >= 4;

  const iconLayout = {
    width: 160,
    height: 160,
    viewBox: { minX: 0, minY: 0, width: 160, height: 160 },
    preserveAspectRatio: 'xMidYMid meet' as const,
  };

  const anchors = {
    // MUST match the switch-placeholder.svg documented anchor points.
    anchors: [
      { x: 40, y: 40 },
      { x: 120, y: 40 },
      { x: 40, y: 120 },
      { x: 120, y: 120 },
    ],
  };

  const transform = isFourPin
    ? computeBestFitSimilarityMatrixFromViewBoxAnchors(pins.slice(0, 4), iconLayout, anchors)
    : undefined;

  const isOpen = component.switchState === 'open';

  return (
    <>
      {transform ? (
        <g transform={transform} style={{ pointerEvents: 'none' }}>
          {/* Full-legged switch icon */}
          <image
            href={switchPlaceholderUrl}
            x={0}
            y={0}
            width={iconLayout.width}
            height={iconLayout.height}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Simple state indicator overlay (temporary; photorealistic art can encode this later) */}
          <line
            x1={80}
            y1={80}
            x2={80 + (isOpen ? 18 : 0)}
            y2={80 - (isOpen ? 18 : 26)}
            stroke="#111"
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.9}
          />
        </g>
      ) : (
        // Legacy fallback (2-pin): keep the old center-based rendering so it still shows up.
        <image
          href={switchPlaceholderUrl}
          x={centerX - 32}
          y={centerY - 32}
          width={64}
          height={64}
          preserveAspectRatio="xMidYMid meet"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </>
  );
};
