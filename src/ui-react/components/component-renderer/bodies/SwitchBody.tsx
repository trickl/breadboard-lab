import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import { getComponentBoundsPixels } from '@/ui-react/components/component-renderer/geometry';

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

  const isOpen = component.switchState === 'open';

  return (
    <>
      {/* Switch body */}
      <circle cx={centerX} cy={centerY} r="20" fill="#888" stroke="#000" strokeWidth="2" />

      {/* Switch lever */}
      <line
        x1={centerX}
        y1={centerY}
        x2={centerX + (isOpen ? 15 : 0)}
        y2={centerY - (isOpen ? 15 : 20)}
        stroke="#000"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Leads + pins */}
      {pins.map((p, idx) => {
        // Shorten the lead so it doesn't draw over the body.
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const inset = 18;
        const x2 = centerX - (dx / len) * inset;
        const y2 = centerY - (dy / len) * inset;

        return (
          <g key={idx}>
            <line x1={p.x} y1={p.y} x2={x2} y2={y2} stroke="#888" strokeWidth="2" />
            <circle cx={p.x} cy={p.y} r="4" fill="#888" />
          </g>
        );
      })}
    </>
  );
};
