import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';

/**
 * PowerSupplyBody - Renders power supply/battery symbol
 */
export const PowerSupplyBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.POWER_SUPPLY || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]); // Positive
  const end = positionToPixels(component.positions[1]); // Negative
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;

  const batteryWidth = 50;
  const batteryHeight = 30;

  return (
    <>
      {/* Main body */}
      <rect
        x={centerX - batteryWidth / 2}
        y={centerY - batteryHeight / 2}
        width={batteryWidth}
        height={batteryHeight}
        fill="#4488ff"
        stroke="#2266cc"
        strokeWidth="2"
        rx="5"
      />

      {/* Leads */}
      <line
        x1={start.x}
        y1={start.y}
        x2={centerX - batteryWidth / 2}
        y2={centerY}
        stroke="#888"
        strokeWidth="2"
      />
      <line
        x1={centerX + batteryWidth / 2}
        y1={centerY}
        x2={end.x}
        y2={end.y}
        stroke="#888"
        strokeWidth="2"
      />

      {/* Positive terminal marker (+) */}
      <line
        x1={centerX - 15}
        y1={centerY}
        x2={centerX - 5}
        y2={centerY}
        stroke="#fff"
        strokeWidth="2"
      />
      <line
        x1={centerX - 10}
        y1={centerY - 5}
        x2={centerX - 10}
        y2={centerY + 5}
        stroke="#fff"
        strokeWidth="2"
      />

      {/* Negative terminal marker (-) */}
      <line
        x1={centerX + 5}
        y1={centerY}
        x2={centerX + 15}
        y2={centerY}
        stroke="#fff"
        strokeWidth="2"
      />

      {/* Voltage label */}
      <text
        x={centerX}
        y={centerY + 20}
        textAnchor="middle"
        fill="#fff"
        fontSize="10"
        fontWeight="bold"
      >
        {component.voltage}V
      </text>

      {/* Pins */}
      <circle cx={start.x} cy={start.y} r="4" fill="#888" />
      <circle cx={end.x} cy={end.y} r="4" fill="#888" />
    </>
  );
};
