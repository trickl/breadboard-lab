import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import { resistanceToColorBands, COLOR_TO_RGB } from '@/core/resistor-color-code';

/**
 * ResistorBody - Renders resistor with color bands
 */
export const ResistorBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.RESISTOR || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]);
  const end = positionToPixels(component.positions[1]);
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

  const bodyWidth = 60;
  const bodyHeight = 20;

  // Get color bands
  let bands: ReturnType<typeof resistanceToColorBands> = [];
  try {
    bands = resistanceToColorBands(component.resistance, 5);
  } catch {
    bands = [];
  }

  return (
    <>
      {/* Leads */}
      <line
        x1={start.x}
        y1={start.y}
        x2={centerX - bodyWidth / 2}
        y2={centerY}
        stroke="#888"
        strokeWidth="2"
        transform={`rotate(${angle} ${centerX} ${centerY})`}
      />
      <line
        x1={centerX + bodyWidth / 2}
        y1={centerY}
        x2={end.x}
        y2={end.y}
        stroke="#888"
        strokeWidth="2"
        transform={`rotate(${angle} ${centerX} ${centerY})`}
      />

      {/* Body */}
      <rect
        x={centerX - bodyWidth / 2}
        y={centerY - bodyHeight / 2}
        width={bodyWidth}
        height={bodyHeight}
        fill="#d4a574"
        stroke="#8b6f47"
        strokeWidth="2"
        rx="4"
        transform={`rotate(${angle} ${centerX} ${centerY})`}
      />

      {/* Color bands */}
      {bands.map((band, index) => {
        const bandX = centerX - bodyWidth / 2 + 12 + index * 12;
        return (
          <rect
            key={index}
            x={bandX}
            y={centerY - bodyHeight / 2}
            width={8}
            height={bodyHeight}
            fill={COLOR_TO_RGB[band.color]}
            stroke="none"
            transform={`rotate(${angle} ${centerX} ${centerY})`}
          />
        );
      })}

      {/* Pins */}
      <circle cx={start.x} cy={start.y} r="4" fill="#888" />
      <circle cx={end.x} cy={end.y} r="4" fill="#888" />
    </>
  );
};
