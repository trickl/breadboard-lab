import type { SchematicPosition, SchematicSymbol } from '../schematic-types';
import { ComponentType } from '../types';

type SymbolTerminal = SchematicSymbol['terminals'][number];

/**
 * Internal node for layout algorithm.
 */
export interface LayoutNode {
  id: string;
  componentId: string;
  componentType: ComponentType;
  position: SchematicPosition;
  velocity: SchematicPosition;
  force: SchematicPosition;
  properties: Record<string, number | string>;
  terminals: Array<{ id: string; offset: SchematicPosition; netId: string }>;
}

export type { SymbolTerminal };
