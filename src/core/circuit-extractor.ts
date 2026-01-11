import type { BreadboardState, Circuit, CircuitNode, CircuitEdge, Position } from './types';
import { BreadboardLayout } from './breadboard-layout';
import type { ReteManager } from './rete-manager';

/**
 * Extracts an electrical circuit graph from the breadboard state.
 * Uses union-find to identify connected nodes.
 *
 * Phase 2: Can extract from either position-based state OR Rete graph
 */
export class CircuitExtractor {
  /**
   * Extract circuit from breadboard state (position-based)
   */
  extract(state: BreadboardState): Circuit {
    const uf = new UnionFind();
    this.addBreadboardInternalConnectivity(uf);

    const nodeGroups = this.groupPositionsByRoot(uf, this.allValidBreadboardPositions());
    const nodes = this.createNodes(nodeGroups);
    const edges = this.createEdgesFromComponents(uf, state.components);

    return { nodes, edges };
  }

  /**
   * Extract circuit from Rete graph (Phase 2)
   *
   * This method reads the Rete graph connections to determine component-to-hole
   * connectivity, then applies breadboard internal connectivity rules to build
   * the complete electrical circuit.
   *
   * @param reteManager - The ReteManager containing the Rete graph
   * @param state - The current BreadboardState (for component properties)
   * @returns Circuit graph with nodes and edges
   */
  extractFromReteGraph(reteManager: ReteManager, state: BreadboardState): Circuit {
    const uf = new UnionFind();
    this.addBreadboardInternalConnectivity(uf);

    const occupiedPositions = this.getOccupiedPositionsFromRete(reteManager);
    const nodeGroups = this.groupPositionsByRoot(uf, occupiedPositions);
    const nodes = this.createNodes(nodeGroups);
    const edges = this.createEdgesFromComponents(uf, state.components);

    return { nodes, edges };
  }

  private addBreadboardInternalConnectivity(uf: UnionFind): void {
    // Terminal strips: each row is internally connected on each side
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      this.connectTerminalStripRow(
        uf,
        row,
        BreadboardLayout.STRIP_LEFT_START,
        BreadboardLayout.STRIP_LEFT_END
      );
      this.connectTerminalStripRow(
        uf,
        row,
        BreadboardLayout.STRIP_RIGHT_START,
        BreadboardLayout.STRIP_RIGHT_END
      );
    }

    // Power rails: all holes in each rail are vertically connected
    for (const col of this.getRailColumns()) {
      for (let row = 1; row < BreadboardLayout.ROWS; row++) {
        uf.union(this.positionToKey({ row: 0, col }), this.positionToKey({ row, col }));
      }
    }
  }

  private connectTerminalStripRow(
    uf: UnionFind,
    row: number,
    startCol: number,
    endCol: number
  ): void {
    for (let col = startCol + 1; col <= endCol; col++) {
      uf.union(this.positionToKey({ row, col: startCol }), this.positionToKey({ row, col }));
    }
  }

  private getRailColumns(): number[] {
    return [
      BreadboardLayout.RAIL_LEFT_NEGATIVE,
      BreadboardLayout.RAIL_LEFT_POSITIVE,
      BreadboardLayout.RAIL_RIGHT_POSITIVE,
      BreadboardLayout.RAIL_RIGHT_NEGATIVE,
    ];
  }

  private *allValidBreadboardPositions(): Generator<Position> {
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      for (let col = 0; col < BreadboardLayout.TOTAL_COLS; col++) {
        const pos = { row, col };
        if (BreadboardLayout.isValidPosition(pos)) {
          yield pos;
        }
      }
    }
  }

  private getOccupiedPositionsFromRete(reteManager: ReteManager): Position[] {
    const positionsByKey = new Map<string, Position>();
    for (const holeNode of reteManager.getAllHoleNodes()) {
      positionsByKey.set(this.positionToKey(holeNode.position), holeNode.position);
    }
    return Array.from(positionsByKey.values());
  }

  private groupPositionsByRoot(
    uf: UnionFind,
    positions: Iterable<Position>
  ): Map<string, Position[]> {
    const nodeGroups = new Map<string, Position[]>();
    for (const pos of positions) {
      const root = uf.find(this.positionToKey(pos));
      if (!nodeGroups.has(root)) {
        nodeGroups.set(root, []);
      }
      nodeGroups.get(root)!.push(pos);
    }
    return nodeGroups;
  }

  private createNodes(nodeGroups: Map<string, Position[]>): Map<string, CircuitNode> {
    const nodes = new Map<string, CircuitNode>();
    for (const [rootKey, positions] of nodeGroups) {
      nodes.set(rootKey, { id: rootKey, positions });
    }
    return nodes;
  }

  private createEdgesFromComponents(
    uf: UnionFind,
    components: BreadboardState['components']
  ): CircuitEdge[] {
    const edges: CircuitEdge[] = [];

    for (const component of components) {
      if (component.positions.length < 2) {
        continue;
      }

      const nodeA = uf.find(this.positionToKey(component.positions[0]));
      const nodeB = uf.find(
        this.positionToKey(component.positions[component.positions.length - 1])
      );

      if (nodeA === nodeB) {
        continue;
      }

      edges.push({
        id: component.id,
        component,
        nodeA,
        nodeB,
      });
    }

    return edges;
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
  private readonly parent = new Map<string, string>();
  private readonly rank = new Map<string, number>();

  /**
   * Find the root of the set containing x
   */
  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }

    const parent = this.parent.get(x);
    if (parent === undefined) {
      // Should be unreachable due to the has() check above.
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }

    // Path compression
    if (parent !== x) {
      this.parent.set(x, this.find(parent));
    }

    return this.parent.get(x) ?? x;
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
    const rankX = this.rank.get(rootX) ?? 0;
    const rankY = this.rank.get(rootY) ?? 0;

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
