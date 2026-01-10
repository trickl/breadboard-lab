/**
 * ComponentRenderer - Renders a single component as SVG
 * Handles different component types with appropriate visual representations
 */

import React from 'react';
import type { AnyComponent, Position } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '../geometry/breadboard-layout';
import { resistanceToColorBands, COLOR_TO_RGB } from '@/core/resistor-color-code';

export interface ComponentRendererProps {
  component: AnyComponent;
  isSelected: boolean;
  isHovered?: boolean;
  onPointerDown?: (e: React.PointerEvent, componentId: string) => void;
}

/**
 * ComponentRenderer - Pure component for rendering individual components
 */
export const ComponentRenderer: React.FC<ComponentRendererProps> = React.memo(
  ({ component, isSelected, onPointerDown }) => {
    const handlePointerDown = (e: React.PointerEvent) => {
      // Check if clicking on rotation handle - if so, don't trigger component selection
      const target = e.target as Element;
      if (target.closest('[data-rotation-handle="true"]')) {
        e.stopPropagation();
        return;
      }
      onPointerDown?.(e, component.id);
    };

    return (
      <g
        data-component-id={component.id}
        onPointerDown={handlePointerDown}
        style={{
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: 'opacity 0.2s',
          filter: isSelected
            ? 'drop-shadow(0 0 8px rgba(68, 136, 255, 0.8)) drop-shadow(0 0 4px rgba(68, 136, 255, 1))'
            : undefined,
        }}
      >
        <ComponentBody component={component} />
        {isSelected && <SelectionOutline component={component} />}
        {isSelected && <RotationHandle component={component} />}
      </g>
    );
  }
);

ComponentRenderer.displayName = 'ComponentRenderer';

/**
 * ComponentBody - Renders the actual component shape
 */
const ComponentBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  const positions = component.positions;
  if (positions.length === 0) return null;

  // Calculate center for rotation
  const centerPos = getComponentCenter(positions);
  const centerPixels = positionToPixels(centerPos);

  return (
    <g
      transform={
        component.rotation !== 0
          ? `rotate(${component.rotation} ${centerPixels.x} ${centerPixels.y})`
          : undefined
      }
    >
      {component.type === ComponentType.RESISTOR && <ResistorBody component={component} />}
      {component.type === ComponentType.LED && <LEDBody component={component} />}
      {component.type === ComponentType.POWER_SUPPLY && <PowerSupplyBody component={component} />}
      {component.type === ComponentType.GROUND && <GroundBody component={component} />}
      {component.type === ComponentType.WIRE && <WireBody component={component} />}
      {component.type === ComponentType.SWITCH && <SwitchBody component={component} />}
      {component.type === ComponentType.MICROPROCESSOR && (
        <MicroprocessorBody component={component} />
      )}
    </g>
  );
};

/**
 * ResistorBody - Renders resistor with color bands
 */
const ResistorBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
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

/**
 * LEDBody - Renders LED with polarity indicator
 */
const LEDBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.LED || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]); // Anode (+)
  const end = positionToPixels(component.positions[1]); // Cathode (-)
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const radius = 15;

  return (
    <>
      {/* LED body */}
      <circle cx={centerX} cy={centerY} r={radius} fill="#ff4444" stroke="#cc0000" strokeWidth="2" />

      {/* Polarity indicator (flat side on cathode) */}
      <line
        x1={end.x - 8}
        y1={end.y - 8}
        x2={end.x - 8}
        y2={end.y + 8}
        stroke="#000"
        strokeWidth="3"
      />

      {/* Leads */}
      <line x1={start.x} y1={start.y} x2={centerX} y2={centerY} stroke="#888" strokeWidth="2" />
      <line x1={centerX} y1={centerY} x2={end.x} y2={end.y} stroke="#888" strokeWidth="2" />

      {/* + symbol on anode */}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="bold"
      >
        +
      </text>

      {/* Pins */}
      <circle cx={start.x} cy={start.y} r="4" fill="#888" />
      <circle cx={end.x} cy={end.y} r="4" fill="#888" />
    </>
  );
};

/**
 * PowerSupplyBody - Renders power supply/battery symbol
 */
const PowerSupplyBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
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

/**
 * GroundBody - Renders ground symbol
 */
const GroundBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.GROUND || component.positions.length < 1) return null;

  const pos = positionToPixels(component.positions[0]);

  return (
    <>
      {/* Ground symbol - three decreasing horizontal lines */}
      <line x1={pos.x - 15} y1={pos.y} x2={pos.x + 15} y2={pos.y} stroke="#000" strokeWidth="3" />
      <line x1={pos.x - 10} y1={pos.y + 6} x2={pos.x + 10} y2={pos.y + 6} stroke="#000" strokeWidth="3" />
      <line x1={pos.x - 5} y1={pos.y + 12} x2={pos.x + 5} y2={pos.y + 12} stroke="#000" strokeWidth="3" />

      {/* Pin */}
      <circle cx={pos.x} cy={pos.y} r="4" fill="#888" />
    </>
  );
};

/**
 * WireBody - Renders wire connection
 */
const WireBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.WIRE || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]);
  const end = positionToPixels(component.positions[1]);

  // Simple Manhattan routing
  const pathData = `
    M ${start.x} ${start.y}
    L ${start.x} ${(start.y + end.y) / 2}
    L ${end.x} ${(start.y + end.y) / 2}
    L ${end.x} ${end.y}
  `;

  return (
    <>
      <path
        d={pathData.trim()}
        stroke="#ff0000"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Connection dots */}
      <circle cx={start.x} cy={start.y} r="4" fill="#ff0000" />
      <circle cx={end.x} cy={end.y} r="4" fill="#ff0000" />
    </>
  );
};

/**
 * SwitchBody - Renders switch component
 */
const SwitchBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
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
      <line x1={start.x} y1={start.y} x2={centerX - 15} y2={centerY} stroke="#888" strokeWidth="2" />
      <line x1={centerX + 15} y1={centerY} x2={end.x} y2={end.y} stroke="#888" strokeWidth="2" />

      {/* Pins */}
      <circle cx={start.x} cy={start.y} r="4" fill="#888" />
      <circle cx={end.x} cy={end.y} r="4" fill="#888" />
    </>
  );
};

/**
 * MicroprocessorBody - Renders microprocessor chip
 */
const MicroprocessorBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.MICROPROCESSOR || component.positions.length === 0)
    return null;

  const positions = component.positions;
  const pixels = positions.map(positionToPixels);

  // Calculate bounding box
  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX + 40;
  const height = maxY - minY + 40;

  return (
    <>
      {/* Chip body */}
      <rect
        x={centerX - width / 2}
        y={centerY - height / 2}
        width={width}
        height={height}
        fill="#333"
        stroke="#000"
        strokeWidth="2"
        rx="5"
      />

      {/* Notch indicator (top-left) */}
      <circle cx={centerX - width / 2 + 10} cy={centerY - height / 2 + 10} r="5" fill="#666" />

      {/* Label */}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="10"
        fontWeight="bold"
      >
        EDU-8
      </text>

      {/* Pins */}
      {pixels.map((pixel, index) => (
        <circle key={index} cx={pixel.x} cy={pixel.y} r="4" fill="#888" />
      ))}
    </>
  );
};

/**
 * SelectionOutline - Renders selection outline around component
 */
const SelectionOutline: React.FC<{ component: AnyComponent }> = ({ component }) => {
  const positions = component.positions;
  if (positions.length === 0) return null;

  const pixels = positions.map(positionToPixels);
  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const padding = 10;

  return (
    <rect
      x={minX - padding}
      y={minY - padding}
      width={maxX - minX + padding * 2}
      height={maxY - minY + padding * 2}
      fill="none"
      stroke="#3399ff"
      strokeWidth="2"
      strokeDasharray="5,5"
      rx="5"
      pointerEvents="none"
    />
  );
};

/**
 * RotationHandle - Renders rotation handle for selected component
 */
const RotationHandle: React.FC<{ component: AnyComponent }> = ({ component }) => {
  const positions = component.positions;
  if (positions.length === 0) return null;

  const pixels = positions.map(positionToPixels);
  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);

  const centerX = (minX + maxX) / 2;
  const topY = minY - 30;

  return (
    <g data-rotation-handle="true" style={{ cursor: 'pointer' }}>
      {/* Handle circle */}
      <circle cx={centerX} cy={topY} r="12" fill="#3399ff" stroke="#fff" strokeWidth="2" />

      {/* Rotation icon (circular arrow) */}
      <path
        d={`M ${centerX} ${topY - 6}
            A 6 6 0 1 1 ${centerX - 6} ${topY}
            L ${centerX - 3} ${topY + 3}
            L ${centerX - 6} ${topY}
            L ${centerX - 3} ${topY - 3}`}
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

/**
 * Helper function to get component center
 */
function getComponentCenter(positions: Position[]): Position {
  if (positions.length === 0) {
    return { row: 0, col: 0 };
  }
  if (positions.length === 1) {
    return positions[0];
  }

  const avgRow = positions.reduce((sum, p) => sum + p.row, 0) / positions.length;
  const avgCol = positions.reduce((sum, p) => sum + p.col, 0) / positions.length;

  return { row: avgRow, col: avgCol };
}
