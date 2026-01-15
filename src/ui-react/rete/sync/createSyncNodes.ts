import type { MutableRefObject } from 'react';
import type { NodeEditor } from 'rete';
import type { AreaPlugin } from 'rete-area-plugin';

import type { AppState } from '@/ui-controller/types';
import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { getAllHolePositions } from '@/ui-react/geometry/breadboard-layout';
import { positionToPixels, LABEL_PADDING_X, LABEL_PADDING_Y } from '@/ui-react/geometry/breadboard-layout';
import { BreadboardLayout } from '@/core/breadboard-layout';
import {
  getBreadboardWorld,
  rotatePoint,
  type BoardRotation,
} from '@/ui-react/world/breadboard-world';
import {
  isRailNodePayload,
  type RailNodePayload,
} from '@/ui-react/rete/graph/payloadGuards';
import { BreadboardNode } from '@/ui-react/rete/nodes/BreadboardNode';
import { ComponentNode } from '@/ui-react/rete/nodes/ComponentNode';
import { RailNode } from '@/ui-react/rete/nodes/RailNode';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';
import {
  getDefaultComponentNodeSize,
  getComponentLegAnchorInNode,
} from '@/ui-react/rete/layout/componentNodeLayout';

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
  const legCount = component.positions.length > 0 ? component.positions.length : getLegCount(component.type);
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

    // Helper: map a local SVG point (BreadboardSvg coordinate space) into the unified world.
    // This matches how the breadboard substrate itself is transformed.
    const world = getBreadboardWorld(rotation);
    const localPointToWorld = (p: { x: number; y: number }) => {
      const rotated = rotatePoint(p, world.combinedRotation, world.pivotLocal);
      return {
        x: LABEL_PADDING_X + rotated.x + world.rotatedOffset.x,
        y: LABEL_PADDING_Y + rotated.y + world.rotatedOffset.y,
      };
    };

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
        const freeform = state.ui.freeformComponentTopLeftById[component.id];
        const allowFreeFloat = Boolean(state.ui.allowUnwiredComponentsToFreeFloat);

        // Keep node sizing stable.
        // IMPORTANT: do this *before* the free-float early return, otherwise nodes can remain at
        // the ClassicPreset default (100×60) which collapses the drag hotspot for tall components
        // like LEDs.
        const legs = component.positions.length;
        const size = getDefaultComponentNodeSize({ type: component.type, legs });
        const nodeW = size.width;
        const nodeH = size.height;
        node.width = nodeW;
        node.height = nodeH;

        // If the component is unwired and has a stored freeform placement, use it.
        // "Wired" here means the Rete graph contains at least one connection involving this node.
        const isWired = editor
          .getConnections()
          .some((c) => c.source === node.id || c.target === node.id);

        if (!isWired && allowFreeFloat && freeform) {
          const worldTopLeft = localPointToWorld(freeform);
          await area.translate(node.id, {
            x: worldTopLeft.x,
            y: worldTopLeft.y,
          });
          continue;
        }

        // Use the centroid of the component's pin positions as the *world anchor*.
        // Then position the node such that the centroid of its rendered leg sockets aligns to
        // that anchor.
        //
        // IMPORTANT: compute anchor in *local* board coordinates first, then transform to world.
        // This makes the node move/rotate around the exact same pivot/axis as the breadboard and
        // rail socket clouds.

        const pinPoints = component.positions.map(positionToPixels);
        const centroid = pinPoints.reduce(
          (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
          { x: 0, y: 0 }
        );

        const cx = centroid.x / pinPoints.length;
        const cy = centroid.y / pinPoints.length;

        // Keep node sizing stable.
        // The classic preset can effectively change the rendered node size as DOM content changes
        // (e.g. when new nodes are added and styles/layout settle). If we anchor based on a
        // measured node width/height, existing components can "jump" when another component is
        // created. We intentionally anchor using a fixed model size (but *per component type*).

        // `nodeW/nodeH` are enforced above.

        const anchorInNode = getComponentLegAnchorInNode({
          type: component.type,
          legs,
          width: nodeW,
          height: nodeH,
        });

        // Convert the *pin centroid* to world, then offset by the socket-anchor within the node.
        // (The node itself is axis-aligned in Rete world space; do not treat its width/height
        // as local vectors under rotation.)
        const worldCentroid = localPointToWorld({ x: cx, y: cy });
        await area.translate(node.id, {
          x: worldCentroid.x - anchorInNode.x,
          y: worldCentroid.y - anchorInNode.y,
        });
      }
    }
  };
}
