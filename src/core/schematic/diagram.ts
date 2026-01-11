import type { Circuit } from '../types';
import type { SchematicConnection, SchematicSymbol } from '../schematic-types';
import type { LayoutNode, SymbolTerminal } from './layout-types';

/**
 * Convert layout nodes to schematic symbols.
 *
 * Extracted from `SchematicLayoutGenerator`.
 */
export function createSchematicSymbols(nodes: Map<string, LayoutNode>): SchematicSymbol[] {
  const symbols: SchematicSymbol[] = [];

  for (const node of nodes.values()) {
    symbols.push({
      id: node.id,
      componentId: node.componentId,
      componentType: node.componentType,
      position: node.position,
      terminals: node.terminals.map((term) => ({
        id: term.id,
        position: term.offset,
        netId: term.netId,
      })),
      properties: node.properties,
    });
  }

  return symbols;
}

/**
 * Create connections between symbols based on nets.
 */
export function createConnections(
  _circuit: Circuit,
  symbols: SchematicSymbol[]
): SchematicConnection[] {
  const connections: SchematicConnection[] = [];
  const netToTerminals = new Map<
    string,
    Array<{ symbol: SchematicSymbol; terminal: SymbolTerminal }>
  >();

  // Group terminals by net
  for (const symbol of symbols) {
    for (const terminal of symbol.terminals) {
      if (!netToTerminals.has(terminal.netId)) {
        netToTerminals.set(terminal.netId, []);
      }
      netToTerminals.get(terminal.netId)!.push({ symbol, terminal });
    }
  }

  // Create connections for each net
  let connectionId = 0;
  for (const terminals of netToTerminals.values()) {
    if (terminals.length > 1) {
      // Calculate center point of all terminals for this net
      const centerX =
        terminals.reduce((sum, t) => sum + t.symbol.position.x + t.terminal.position.x, 0) /
        terminals.length;
      const centerY =
        terminals.reduce((sum, t) => sum + t.symbol.position.y + t.terminal.position.y, 0) /
        terminals.length;

      // Create star topology: each terminal connects to center
      for (const { symbol, terminal } of terminals) {
        const terminalPos = {
          x: symbol.position.x + terminal.position.x,
          y: symbol.position.y + terminal.position.y,
        };

        connections.push({
          id: `conn-${connectionId++}`,
          netId: terminal.netId,
          path: [terminalPos, { x: centerX, y: centerY }],
        });
      }
    }
  }

  return connections;
}

/**
 * Calculate bounding box of all symbols.
 */
export function calculateBounds(symbols: SchematicSymbol[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  if (symbols.length === 0) {
    return { minX: 0, maxX: 400, minY: 0, maxY: 400 };
  }

  const padding = 50;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const symbol of symbols) {
    minX = Math.min(minX, symbol.position.x - 50);
    maxX = Math.max(maxX, symbol.position.x + 50);
    minY = Math.min(minY, symbol.position.y - 50);
    maxY = Math.max(maxY, symbol.position.y + 50);
  }

  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
  };
}
