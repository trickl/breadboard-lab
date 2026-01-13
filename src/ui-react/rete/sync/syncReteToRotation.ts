import type React from 'react';
import type { NodeEditor } from 'rete';
import type { AreaPlugin } from 'rete-area-plugin';

import { getBreadboardWorld, type BoardRotation } from '@/ui-react/world/breadboard-world';
import { BreadboardNode } from '@/ui-react/rete/nodes/BreadboardNode';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';

export type SyncReteToRotationOptions = {
  rotationRef: React.MutableRefObject<BoardRotation>;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  editorRef: React.MutableRefObject<NodeEditor<Schemes> | null>;
  areaRef: React.MutableRefObject<AreaPlugin<Schemes, AreaExtra> | null>;
  breadboardNodeIdRef: React.MutableRefObject<string | null>;
};

/**
 * Rotation changes are *not* a native Rete state change, so the React renderer won't re-render
 * our custom RailNode socket-clouds unless we explicitly request updates.
 *
 * This helper:
 * - recenters the rotated board in the viewport
 * - clamps zoom so rotation doesn't unexpectedly zoom in
 * - updates the breadboard node's width/height to match rotated world bounds
 * - requests node + connection updates so socket clouds and paths recompute
 */
export function syncReteToRotation({
  rotationRef,
  containerRef,
  editorRef,
  areaRef,
  breadboardNodeIdRef,
}: SyncReteToRotationOptions) {
  const editor = editorRef.current;
  const area = areaRef.current;
  if (!editor || !area) return;

  // Keep the rotated board centered in the visible viewport.
  // This makes rotation feel like it happens around the screen center.
  const container = containerRef.current;
  if (container) {
    const bounds = container.getBoundingClientRect();
    const w = bounds.width || 1;
    const h = bounds.height || 1;
    const world = getBreadboardWorld(rotationRef.current);

    // Don't unexpectedly zoom *in* on rotate; only clamp down if we're currently zoomed in beyond fit.
    const kw = w / (world.total.width || 1);
    const kh = h / (world.total.height || 1);
    const fitK = Math.min(kw, kh) * 0.95;
    if (Number.isFinite(fitK) && fitK > 0) {
      const currentK = area.area.transform.k;
      area.area.transform.k = Math.min(currentK, fitK);
    }

    area.area.transform.x = (w - world.total.width * area.area.transform.k) / 2;
    area.area.transform.y = (h - world.total.height * area.area.transform.k) / 2;
    (area.area as unknown as { update: () => void }).update();
  }

  // Keep the breadboard node's size in sync with the rotated world bounds.
  // (This is what makes the node's bounding box match the rotated graphic.)
  const bbId = breadboardNodeIdRef.current;
  if (bbId) {
    const bbNode = editor.getNode(bbId);
    if (bbNode && bbNode instanceof BreadboardNode) {
      const world = getBreadboardWorld(rotationRef.current);
      bbNode.width = world.total.width;
      bbNode.height = world.total.height;
    }
  }

  // Update all nodes (rail sockets + component nodes) and all connections so paths recompute.
  for (const node of editor.getNodes()) {
    void area.update('node', node.id);
  }
  for (const connection of editor.getConnections()) {
    void area.update('connection', connection.id);
  }
}
