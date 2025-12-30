import type { BreadboardState, Circuit, CircuitNode, CircuitEdge, Position } from './types';
import { BreadboardLayout } from './breadboard-layout';

/**
 * Extracts an electrical circuit graph from the breadboard state.
 * Uses union-find to identify connected nodes.
 */
export class CircuitExtractor {
  /**
   * Extract circuit from breadboard state
   */
  extract(state: BreadboardState): Circuit {
    // Build a union-find structure to identify connected positions
    // This ONLY includes the breadboard's internal connections, not components yet
    const uf = new UnionFind();

    // Connect positions that are internally connected by breadboard
    // Terminal strips: each row is internally connected on each side
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      // Left terminal strip (cols 0-4)
      for (let col = 0; col < BreadboardLayout.COLS_PER_SIDE; col++) {
        if (col > 0) {
          uf.union(this.positionToKey({ row, col: 0 }), this.positionToKey({ row, col }));
        }
      }
      // Right terminal strip (cols 5-9)
      for (let col = BreadboardLayout.COLS_PER_SIDE; col < BreadboardLayout.COLS_PER_SIDE * 2; col++) {
        if (col > BreadboardLayout.COLS_PER_SIDE) {
          uf.union(
            this.positionToKey({ row, col: BreadboardLayout.COLS_PER_SIDE }),
            this.positionToKey({ row, col })
          );
        }
      }
    }

    // Group positions by their root (node) - this gives us the nodes
    const nodeGroups = new Map<string, Position[]>();
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      for (let col = 0; col < BreadboardLayout.COLS_PER_SIDE * 2; col++) {
        const pos = { row, col };
        if (BreadboardLayout.isValidPosition(pos)) {
          const key = this.positionToKey(pos);
          const root = uf.find(key);
          if (!nodeGroups.has(root)) {
            nodeGroups.set(root, []);
          }
          nodeGroups.get(root)!.push(pos);
        }
      }
    }

    // Create circuit nodes
    const nodes = new Map<string, CircuitNode>();
    for (const [rootKey, positions] of nodeGroups) {
      nodes.set(rootKey, {
        id: rootKey,
        positions,
      });
    }

    // Create circuit edges from components
    // Components connect their start and end positions (which may be in different nodes)
    const edges: CircuitEdge[] = [];
    for (const component of state.components) {
      if (component.positions.length >= 2) {
        // Find which nodes the component's endpoints belong to
        const nodeA = uf.find(this.positionToKey(component.positions[0]));
        const nodeB = uf.find(this.positionToKey(component.positions[component.positions.length - 1]));
        
        // Only create edge if component connects different nodes
        if (nodeA !== nodeB) {
          edges.push({
            id: component.id,
            component,
            nodeA,
            nodeB,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Convert position to string key
   */
  private positionToKey(pos: Position): string {
    return `${pos.row},${pos.col}`;
  }
}

/**
 * Union-Find data structure for tracking connected components
 */
class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  /**
   * Find the root of the set containing x
   */
  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }

    // Path compression
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }

    return this.parent.get(x)!;
  }

  /**
   * Union two sets
   */
  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) {
      return;
    }

    // Union by rank
    const rankX = this.rank.get(rootX) || 0;
    const rankY = this.rank.get(rootY) || 0;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }
}
