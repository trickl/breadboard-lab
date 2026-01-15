import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import { resistanceToColorBands, COLOR_TO_RGB } from '@/core/resistor-color-code';
import resistorPlaceholderUrl from '@/images/resistor-placeholder.svg';
import { computeTwoPointMatrixFromViewBoxAnchors } from '@/ui-react/components/component-renderer/svg/alignTwoPointImage';

/**
 * ResistorBody - Renders resistor with color bands
 */
export const ResistorBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.RESISTOR || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]);
  const end = positionToPixels(component.positions[1]);
  // The resistor SVG placeholder includes full legs. We align the leg tips to the two
  // socket points using a similarity transform.
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

  // Band overlay coordinates in the icon's local coordinate space.
  const bandY = 19;
  const bandH = 24;
  const bandXs = [66, 78, 90, 102, 112];

  // Get color bands
  let bands: ReturnType<typeof resistanceToColorBands> = [];
  try {
    bands = resistanceToColorBands(component.resistance, 5);
  } catch {
    bands = [];
  }

  return (
    <>
      <g transform={transform} style={{ pointerEvents: 'none' }}>
        {/* Full-legged resistor icon */}
        <image
          href={resistorPlaceholderUrl}
          x={0}
          y={0}
          width={iconLayout.width}
          height={iconLayout.height}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Dynamic color bands (temporary overlay until photorealistic icons encode them) */}
        {bands.slice(0, bandXs.length).map((band, index) => (
          <rect
            key={index}
            x={bandXs[index]}
            y={bandY}
            width={6}
            height={bandH}
            rx={1}
            fill={COLOR_TO_RGB[band.color]}
            opacity={0.95}
          />
        ))}
      </g>
    </>
  );
};
