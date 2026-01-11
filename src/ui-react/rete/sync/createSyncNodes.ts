import type { MutableRefObject } from 'react';
import type { NodeEditor } from 'rete';
import type { Area2D } from 'rete-area-plugin';
import type { AreaPlugin } from 'rete-area-plugin';
import type { RerouteExtra } from 'rete-connection-reroute-plugin';
import type { ClassicScheme, ReactArea2D } from 'rete-react-plugin';

import type { AppState } from '@/ui-controller/types';
import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { getAllHolePositions } from '@/ui-react/geometry/breadboard-layout';
import { BreadboardLayout } from '@/core/breadboard-layout';
import { positionToWorld, type BoardRotation } from '@/ui-react/world/breadboard-world';
import {
  isRailNodePayload,
  type RailNodePayload,
} from '@/ui-react/rete/graph/payloadGuards';
import { BreadboardNode } from '@/ui-react/rete/nodes/BreadboardNode';
import { ComponentNode } from '@/ui-react/rete/nodes/ComponentNode';
import { RailNode } from '@/ui-react/rete/nodes/RailNode';

type Schemes = ClassicScheme;

// Rete plugin typing note:
// Some plugins (e.g. reroute/path) are typed against a parent scope that includes Area2D signals.
// The official docs recommend including Area2D + renderer extras + plugin extras in one union.
type AreaExtra = Area2D<Schemes> | ReactArea2D<Schemes> | RerouteExtra;

export type CreateSyncNodesOptions = {
  editorRef: MutableRefObject<NodeEditor<Schemes> | null>;
  areaRef: MutableRefObject<AreaPlugin<Schemes, AreaExtra> | null>;
  componentNodeMapRef: MutableRefObject<Map<string, string>>;
  railNodeMapRef: MutableRefObject<Map<string, string>>;
  breadboardNodeIdRef: MutableRefObject<string | null>;
  rotation: BoardRotation;
  getComponentLegCount: (type: ComponentType) => number;
};

// Helper to create a component node
async function createComponentNode(
  editor: NodeEditor<Schemes>,
  component: AnyComponent,
  getLegCount: (type: ComponentType) => number
): Promise<ComponentNode> {
  const legCount = getLegCount(component.type);
  const node = new ComponentNode(component.id, component.type, legCount);
  await editor.addNode(node);
  return node;
}

export function createSyncNodes({
  editorRef,
  areaRef,
  componentNodeMapRef,
  railNodeMapRef,
  breadboardNodeIdRef,
  rotation,
  getComponentLegCount,
}: CreateSyncNodesOptions) {
  // Synchronize component nodes with controller state
  return async (state: AppState) => {
    const editor = editorRef.current;
    const area = areaRef.current;
    if (!editor || !area) {
      console.warn('[ReteGraphLayer] Editor or area not initialized, skipping sync');
      return;
    }

    // --- Breadboard root node (single node) ---
    if (!breadboardNodeIdRef.current) {
      const bb = new BreadboardNode('Breadboard');
      // Give the breadboard node a stable id so we can reliably apply per-node DOM tweaks.
      // (Also makes debugging easier.)
      bb.id = 'breadboard';
      await editor.addNode(bb);
      breadboardNodeIdRef.current = bb.id;
      await area.translate(bb.id, { x: 0, y: 0 });

      // The breadboard background should never be draggable as a node.
      // If it is draggable, it can drift away from the rail socket clouds.
      // By disabling pointer events on the NodeView element, pointer input falls through
      // to the area and results in panning (moving everything together).
      const disableBreadboardNodeInteraction = () => {
        const view = area.nodeViews.get(bb.id);
        if (!view) return;
        view.element.style.pointerEvents = 'none';
      };

      disableBreadboardNodeInteraction();
      // Defensive: in case the view is attached after this tick.
      setTimeout(disableBreadboardNodeInteraction, 0);
    }

    // --- Breadboard rails (static nodes) ---
    // We model each connected breadboard "net cloud" as one node with one socket per physical hole.
    // - Outer power rails: 4 nodes (vertical columns)
    // - Inner terminal-strip rails: 60 nodes (30 rows × 2 sides), each with 5 holes
    // This matches the electrical reality (one net) while preserving per-hole attachment constraints.
    const railNodeMap = railNodeMapRef.current;
    const allHoles = getAllHolePositions();

    const ensureRailNode = async (def: {
      id: string;
      label: string;
      holePositions: Array<{ row: number; col: number }>;
    }) => {
      // Fast path: already tracked.
      const existingId = railNodeMap.get(def.id);
      if (existingId && editor.getNode(existingId)) return;

      // Defensive: across HMR/dev remounts we may have nodes in the editor but an empty map.
      const byPayload = editor
        .getNodes()
        .find((n) => isRailNodePayload(n) && (n as RailNodePayload).railId === def.id);
      if (byPayload) {
        railNodeMap.set(def.id, byPayload.id);
        // Keep anchored.
        await area.translate(byPayload.id, { x: 0, y: 0 });
        return;
      }

      const railNode = new RailNode(def.id, def.label, def.holePositions);
      await editor.addNode(railNode);
      railNodeMap.set(def.id, railNode.id);
      // Keep anchored at (0,0). The custom renderer positions sockets in world space.
      await area.translate(railNode.id, { x: 0, y: 0 });
    };

    // Outer power rails (columns).
    const outerRailDefs: Array<{ id: string; label: string; col: number }> = [
      {
        id: 'rail-left-positive',
        label: 'Rail L +',
        col: BreadboardLayout.RAIL_LEFT_POSITIVE,
      },
      {
        id: 'rail-left-negative',
        label: 'Rail L −',
        col: BreadboardLayout.RAIL_LEFT_NEGATIVE,
      },
      {
        id: 'rail-right-positive',
        label: 'Rail R +',
        col: BreadboardLayout.RAIL_RIGHT_POSITIVE,
      },
      {
        id: 'rail-right-negative',
        label: 'Rail R −',
        col: BreadboardLayout.RAIL_RIGHT_NEGATIVE,
      },
    ];

    for (const def of outerRailDefs) {
      const holePositions = allHoles
        .filter((p) => p.col === def.col)
        // Stable ordering: rails are conceptually indexed by row.
        .sort((a, b) => a.row - b.row)
        .map((p) => ({ row: p.row, col: p.col }));

      await ensureRailNode({ id: def.id, label: def.label, holePositions });
    }

    // Inner rails (terminal strips): 30 rows × 2 sides = 60 rails.
    // Each rail is a row-connected group of 5 holes.
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      const left = allHoles
        .filter(
          (p) =>
            p.row === row &&
            p.col >= BreadboardLayout.STRIP_LEFT_START &&
            p.col <= BreadboardLayout.STRIP_LEFT_END
        )
        .sort((a, b) => a.col - b.col)
        .map((p) => ({ row: p.row, col: p.col }));

      const right = allHoles
        .filter(
          (p) =>
            p.row === row &&
            p.col >= BreadboardLayout.STRIP_RIGHT_START &&
            p.col <= BreadboardLayout.STRIP_RIGHT_END
        )
        .sort((a, b) => a.col - b.col)
        .map((p) => ({ row: p.row, col: p.col }));

      // Only create the rail if holes are present in the skin.
      if (left.length > 0) {
        await ensureRailNode({
          id: `inner-rail-left-${row}`,
          label: `Inner L ${row + 1}`,
          holePositions: left,
        });
      }

      if (right.length > 0) {
        await ensureRailNode({
          id: `inner-rail-right-${row}`,
          label: `Inner R ${row + 1}`,
          holePositions: right,
        });
      }
    }

    const components = state.breadboard.components;
    const componentNodeMap = componentNodeMapRef.current;

    // Track which components should exist
    const currentComponentIds = new Set(components.map((c) => c.id));

    // Remove nodes for deleted components
    for (const [componentId, nodeId] of componentNodeMap.entries()) {
      if (!currentComponentIds.has(componentId)) {
        const node = editor.getNode(nodeId);
        if (node) {
          await editor.removeNode(nodeId);
        }
        componentNodeMap.delete(componentId);
      }
    }

    // Add or update nodes for current components
    for (const component of components) {
      const nodeId = componentNodeMap.get(component.id);
      let node: ComponentNode;

      if (nodeId) {
        // Node exists, get it
        const existingNode = editor.getNode(nodeId);
        if (existingNode && existingNode instanceof ComponentNode) {
          node = existingNode;
        } else {
          // Node missing, recreate
          node = await createComponentNode(editor, component, getComponentLegCount);
          componentNodeMap.set(component.id, node.id);
        }
      } else {
        // Create new node
        node = await createComponentNode(editor, component, getComponentLegCount);
        componentNodeMap.set(component.id, node.id);
      }

      // Update node position based on component's first position (world space)
      if (component.positions.length > 0) {
        const firstPos = component.positions[0];
        const rotatedAnchor = positionToWorld(firstPos, rotation);

        // Position the node at the component's location (centered)
        await area.translate(node.id, {
          x: rotatedAnchor.x - node.width / 2,
          y: rotatedAnchor.y - node.height / 2,
        });
      }
    }
  };
}
