/**
 * Schematic layout generator
 * Converts electrical circuit into positioned schematic diagram using force-directed layout
 */

import type { Circuit } from './types';
import type { LayoutConfig, SchematicDiagram } from './schematic-types';
import { DEFAULT_LAYOUT_CONFIG } from './schematic-types';
import { applyForceDirectedLayout } from './schematic/force-directed-layout';
import { createLayoutNodes } from './schematic/layout-nodes';
import { calculateBounds, createConnections, createSchematicSymbols } from './schematic/diagram';

/**
 * Generates schematic diagrams from electrical circuits
 */
export class SchematicLayoutGenerator {
  private readonly config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  }

  /**
   * Generate schematic diagram from circuit
   */
  generate(circuit: Circuit): SchematicDiagram {
    // Convert circuit edges to layout nodes
    const nodes = createLayoutNodes(circuit);

    // Apply force-directed layout algorithm
    applyForceDirectedLayout(nodes, this.config);

    // Convert layout nodes to schematic symbols
    const symbols = createSchematicSymbols(nodes);

    // Generate connections between symbols
    const connections = createConnections(circuit, symbols);

    // Calculate bounds
    const bounds = calculateBounds(symbols);

    return {
      symbols,
      connections,
      bounds,
    };
  }
}
