/**
 * Types for schematic view representation
 * Derived from the electrical circuit netlist
 */

import type { ComponentType } from './types';

/**
 * Position in schematic coordinate space
 */
export interface SchematicPosition {
  x: number;
  y: number;
}

/**
 * Schematic symbol for a component
 */
export interface SchematicSymbol {
  id: string;
  componentId: string;
  componentType: ComponentType;
  position: SchematicPosition;
  terminals: SchematicTerminal[];
  properties: Record<string, number | string>;
  label?: string;
}

/**
 * Terminal point on a schematic symbol
 */
export interface SchematicTerminal {
  id: string;
  position: SchematicPosition; // Relative to symbol position
  netId: string;
}

/**
 * Connection line between terminals in the schematic
 */
export interface SchematicConnection {
  id: string;
  netId: string;
  path: SchematicPosition[];
  current?: number; // For visualization
}

/**
 * Complete schematic diagram
 */
export interface SchematicDiagram {
  symbols: SchematicSymbol[];
  connections: SchematicConnection[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Layout configuration for schematic generation
 */
export interface LayoutConfig {
  symbolSpacing: number; // Minimum spacing between symbols
  terminalLength: number; // Length of terminal connections
  attractionStrength: number; // Force-directed layout attraction
  repulsionStrength: number; // Force-directed layout repulsion
  iterations: number; // Number of layout iterations
}

/**
 * Default layout configuration
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  symbolSpacing: 100,
  terminalLength: 20,
  attractionStrength: 0.1,
  repulsionStrength: 1000,
  iterations: 100,
};
