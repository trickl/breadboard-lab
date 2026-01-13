import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';

/**
 * SwitchBody - Renders switch component
 */
export const SwitchBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.SWITCH || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]);
  const end = positionToPixels(component.positions[1]);
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;

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

      {/* Leads */}
      <line
        x1={start.x}
        y1={start.y}
        x2={centerX - 15}
        y2={centerY}
        stroke="#888"
        strokeWidth="2"
      />
      <line
        x1={centerX + 15}
        y1={centerY}
        x2={end.x}
        y2={end.y}
        stroke="#888"
        strokeWidth="2"
      />

      {/* Pins */}
      <circle cx={start.x} cy={start.y} r="4" fill="#888" />
      <circle cx={end.x} cy={end.y} r="4" fill="#888" />
    </>
  );
};
