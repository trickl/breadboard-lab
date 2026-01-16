import type React from 'react';
import { createRoot } from 'react-dom/client';
import type { NodeEditor } from 'rete';
import type { AreaPlugin } from 'rete-area-plugin';
import { ConnectionPlugin } from 'rete-connection-plugin';
import { getDOMSocketPosition } from 'rete-render-utils';
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin';
import { ReroutePlugin } from 'rete-connection-reroute-plugin';
import { ConnectionPathPlugin } from 'rete-connection-path-plugin';
import { curveBundle, curveLinear } from 'd3-shape';

import type { BreadboardController } from '@/ui-controller';
import type { ConnectionAppearance } from '@/ui-controller/types';
import { makeEndpointCurvedTransformer } from '@/ui-react/rete/graph/endpointCurves';
import { type Pointer } from '@/ui-react/rete/graph/pointerDrag';
import { DEBUG_RENDER_CONNECTIONS } from '@/ui-react/rete/graph/envFlags';
import {
  isBreadboardNodePayload,
  isComponentNodePayload,
  isRailNodePayload,
} from '@/ui-react/rete/graph/payloadGuards';
import { getDefaultConnectionAppearance } from '@/ui-react/rete/graph/defaultConnectionAppearance';
import { createBreadboardNodeRenderer } from '@/ui-react/rete/renderers/BreadboardNodeRenderer';
import { createComponentNodeRenderer } from '@/ui-react/rete/renderers/ComponentNodeRenderer';
import { createRailNodeRenderer } from '@/ui-react/rete/renderers/RailNodeRenderer';
import { createSelectableConnectionRenderer } from '@/ui-react/rete/renderers/SelectableConnection';
import { createReroutePinsPreset } from '@/ui-react/rete/presets/reroutePinsPreset';
import { createConnectionFlowPreset } from '@/ui-react/rete/presets/connectionFlowPreset';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';
import type { BoardRotation } from '@/ui-react/world/breadboard-world';
import { getBreadboardWorld, rotatePoint } from '@/ui-react/world/breadboard-world';
import {
  positionToPixels,
  pixelsToPosition,
  isValidPosition,
  LABEL_PADDING_X,
  LABEL_PADDING_Y,
  HOLE_SPACING,
} from '@/ui-react/geometry/breadboard-layout';
import type { Position } from '@/core/types';
import { ComponentNode } from '@/ui-react/rete/nodes/ComponentNode';
import {
  DEFAULT_COMPONENT_NODE_SIZE,
  getDefaultComponentNodeSize,
  getComponentLegAnchorInNode,
} from '@/ui-react/rete/layout/componentNodeLayout';

export function setupRetePlugins({
  editor,
  area,
  controller,
  editorRef,
  rotationRef,
  debugUiRef,
  layerRef,
  connectionUiRef,
}: {
  editor: NodeEditor<Schemes>;
  area: AreaPlugin<Schemes, AreaExtra>;
  controller: BreadboardController;
  editorRef: React.MutableRefObject<NodeEditor<Schemes> | null>;
  rotationRef: React.MutableRefObject<BoardRotation>;
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>;
  layerRef: React.MutableRefObject<HTMLDivElement | null>;
  connectionUiRef: React.MutableRefObject<{
    selectedConnectionId: string | null;
    appearanceById: Record<string, ConnectionAppearance>;
  }>;
}) {
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

  const BreadboardNodeRenderer = createBreadboardNodeRenderer({
    rotationRef,
    debugUiRef,
  });
  const RailNodeRenderer = createRailNodeRenderer({
    rotationRef,
    debugUiRef,
    layerRef,
  });
  const ComponentNodeRenderer = createComponentNodeRenderer();
  const SelectableConnection = createSelectableConnectionRenderer({
    controller,
    editorRef: editorRef as unknown as React.MutableRefObject<{
      getConnections: () => Array<{ id: string }>;
    } | null>,
    connectionUiRef: connectionUiRef as unknown as React.MutableRefObject<{
      selectedConnectionId: string | null;
      appearanceById: Record<string, ConnectionAppearance>;
    }>,
    getDefaultConnectionAppearance,
    debugRenderConnections: DEBUG_RENDER_CONNECTIONS,
  });

  // --- Plugins: reroute + path ---
  // Reroute: lets users add draggable points on a connection (click to add, right-click to remove).
  // Path: draws straight (polyline) connection segments and supports multi-point paths.
  const reroutePlugin = new ReroutePlugin<Schemes>();
  const pathPlugin = new ConnectionPathPlugin<Schemes, AreaExtra>({
    // For a plain connection (2 endpoints), add auxiliary control points to create a pleasing curve.
    // For rerouted connections (N>2 points), keep points as-is and let the curve interpolate.
    transformer: (conn) => (points) => {
      const appearance =
        connectionUiRef.current.appearanceById[(conn as unknown as { id: string }).id] ??
        getDefaultConnectionAppearance();

      if (appearance.style === 'straight') return points;
      if (points.length !== 2) return points;

      // Curved: allow independent start/end orientation.
      return makeEndpointCurvedTransformer({
        start: appearance.curved.startOrientation,
        end: appearance.curved.endOrientation,
        curvature: 0.3,
      })(points);
    },
    // Smooth, realistic-looking wire curves (or straight polyline, depending on style).
    curve: (conn) => {
      const appearance =
        connectionUiRef.current.appearanceById[(conn as unknown as { id: string }).id] ??
        getDefaultConnectionAppearance();
      return appearance.style === 'straight' ? curveLinear : curveBundle.beta(0.9);
    },
    // Breadboard wires are undirected.
    arrow: () => false,
  });

  render.use(reroutePlugin);
  render.use(pathPlugin);

  // Configure React renderer with classic preset.
  // We customize RailNode rendering so sockets can be placed exactly over breadboard holes.
  render.addPreset(
    ReactPresets.classic.setup({
      // By default, classic connections start on the *right edge* of output sockets and end on the
      // *left edge* of input sockets. For breadboard wiring we want endpoints to be visually
      // centered on the socket (matching the hole/connector circle center).
      socketPositionWatcher: getDOMSocketPosition({
        offset({ x, y }) {
          return { x, y };
        },
      }),
      customize: {
        node: (data) => {
          const payload = data.payload;
          if (isBreadboardNodePayload(payload)) {
            return BreadboardNodeRenderer;
          }
          if (isRailNodePayload(payload)) {
            return RailNodeRenderer;
          }
          if (isComponentNodePayload(payload)) {
            return ComponentNodeRenderer;
          }

          // Default classic renderer for other nodes
          return ReactPresets.classic.Node;
        },

        connection: () => {
          return SelectableConnection;
        },
      },
    })
  );

  // Render reroute pins on top of connections.
  // We only show pins when the corresponding wire is selected.
  render.addPreset(
    createReroutePinsPreset({
      connectionUiRef,
      reroutePlugin,
      pointer: () => area.area.pointer as unknown as Pointer,
    })
  );

  connection.addPreset(
    createConnectionFlowPreset({
      editor,
      debugUiRef,
      layerRef,
    })
  );

  // Register plugins in correct order
  editor.use(area);
  area.use(connection);
  area.use(render);

  // Deselect wire when clicking on empty space.
  // (We avoid clearing when the click starts an interaction on sockets/wires/pins.)
  // Also commit node drag (component reposition) back into controller state.
  let pendingComponentMove:
    | null
    | {
        componentId: string;
        nodeWorldTopLeft: { x: number; y: number };
        nodeId: string;
      } = null;

  // NOTE: NodeView installs a drag handler and may stop propagation, which can prevent
  // per-node listeners from firing. Use a window-level *capture* handler so we see the event
  // before any stopImmediatePropagation.
  type HotspotSelectionCaptureGlobal = {
    installed: boolean;
    dispatchSelection: ((componentId: string) => void) | null;
  };

  const getHotspotSelectionCaptureGlobal = (): HotspotSelectionCaptureGlobal => {
    const key = Symbol.for('breadboard-lab.rete.hotspotSelectionCapture');
    const w = window as unknown as Record<symbol, HotspotSelectionCaptureGlobal | undefined>;
    if (!w[key]) {
      w[key] = { installed: false, dispatchSelection: null };
    }
    return w[key] as HotspotSelectionCaptureGlobal;
  };

  // Keep the callback fresh (supports dev/HMR without duplicating handlers).
  getHotspotSelectionCaptureGlobal().dispatchSelection = (componentId: string) => {
    controller.dispatch({ type: 'COMPONENT_SELECTED', componentId });
  };

  {
    const g = getHotspotSelectionCaptureGlobal();
    if (!g.installed) {
      g.installed = true;
      const handler = (evt: MouseEvent | PointerEvent) => {
        // Only primary click/tap.
        if ('button' in evt && typeof evt.button === 'number' && evt.button !== 0) return;

        const target = evt.target as HTMLElement | null;
        if (!target) return;

        // Ignore wiring/connection interactions.
        const isInteractive =
          Boolean(target.closest('[data-testid="connection"]')) ||
          Boolean(target.closest('[data-testid="pin"]')) ||
          Boolean(target.closest('.input-socket')) ||
          Boolean(target.closest('.output-socket'));
        if (isInteractive) return;

        const hotspot = target.closest('[data-testid="drag-hotspot"]') as HTMLElement | null;
        const componentId = hotspot?.dataset?.componentId;
        if (!componentId) return;

        g.dispatchSelection?.(componentId);
      };

      window.addEventListener('pointerdown', handler, { capture: true });
      window.addEventListener('mousedown', handler, { capture: true });
    }
  }

  const worldPointToLocal = (pWorld: { x: number; y: number }) => {
    const world = getBreadboardWorld(rotationRef.current);

    // Undo label padding and rotated-offset translation.
    const pRot = {
      x: pWorld.x - LABEL_PADDING_X - world.rotatedOffset.x,
      y: pWorld.y - LABEL_PADDING_Y - world.rotatedOffset.y,
    };

    // Undo the substrate rotation.
    const inv = (((360 - world.combinedRotation) % 360) as unknown) as 0 | 90 | 180 | 270;
    return rotatePoint(pRot, inv, world.pivotLocal);
  };

  const localPointToWorld = (pLocal: { x: number; y: number }) => {
    const world = getBreadboardWorld(rotationRef.current);
    const rotated = rotatePoint(pLocal, world.combinedRotation, world.pivotLocal);
    return {
      x: LABEL_PADDING_X + rotated.x + world.rotatedOffset.x,
      y: LABEL_PADDING_Y + rotated.y + world.rotatedOffset.y,
    };
  };

  const isNodeWired = (nodeId: string) =>
    editor.getConnections().some((c) => c.source === nodeId || c.target === nodeId);

  // If an unwired component is dropped "near the breadboard", we snap it to holes.
  // If dropped far away, we persist it as free-floating.
  const snapZoneLocal = (() => {
    const left = positionToPixels({ row: 0, col: 0 }).x - HOLE_SPACING / 2;
    const right = positionToPixels({ row: 0, col: 13 }).x + HOLE_SPACING / 2;

    const yTerminalTop = positionToPixels({ row: 0, col: 2 }).y - HOLE_SPACING / 2;
    const yTerminalBottom = positionToPixels({ row: 29, col: 2 }).y + HOLE_SPACING / 2;
    const yRailTop = positionToPixels({ row: 0, col: 0 }).y - HOLE_SPACING / 2;
    const yRailBottom = positionToPixels({ row: 24, col: 0 }).y + HOLE_SPACING / 2;

    const top = Math.min(yTerminalTop, yRailTop);
    const bottom = Math.max(yTerminalBottom, yRailBottom);

    // Allow a generous padding so dropping slightly outside still snaps.
    const pad = HOLE_SPACING * 1.25;
    return { left: left - pad, right: right + pad, top: top - pad, bottom: bottom + pad };
  })();

  const snapPinsByCentroidDelta = (
    componentId: string,
    nodeWorldTopLeft: { x: number; y: number }
  ): boolean => {
    const state = controller.getState();
    const component = state.breadboard.components.find((c) => c.id === componentId);
    if (!component || component.positions.length === 0) return false;

    // This must match `createSyncNodes` anchoring.
    const size = getDefaultComponentNodeSize({
      type: component.type,
      legs: component.positions.length,
    });
    const anchorInNode = getComponentLegAnchorInNode({
      type: component.type,
      legs: component.positions.length,
      width: size.width,
      height: size.height,
    });

    // IMPORTANT: node width/height are in Rete world axes. Under board rotation, you cannot
    // add (nodeW/2,nodeH/2) in *local* space and expect it to match the user's drag.
    // Instead, compute the centroid point in world space, then map that point to local.
    const nodeWorldAnchor = {
      x: nodeWorldTopLeft.x + anchorInNode.x,
      y: nodeWorldTopLeft.y + anchorInNode.y,
    };
    const newCentroidLocal = worldPointToLocal(nodeWorldAnchor);

    const oldPinPixels = component.positions.map(positionToPixels);
    const oldCentroid = oldPinPixels.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    const oldCentroidLocal = {
      x: oldCentroid.x / oldPinPixels.length,
      y: oldCentroid.y / oldPinPixels.length,
    };

    const delta = {
      x: newCentroidLocal.x - oldCentroidLocal.x,
      y: newCentroidLocal.y - oldCentroidLocal.y,
    };

    const nextPositions: Position[] = [];
    for (const p of oldPinPixels) {
      const nextLocal = { x: p.x + delta.x, y: p.y + delta.y };
      const pos = pixelsToPosition(nextLocal.x, nextLocal.y);
      if (!isValidPosition(pos)) {
        return false; // Invalid move; do not commit.
      }
      nextPositions.push(pos);
    }

    controller.dispatch({
      type: 'COMPONENT_MOVED',
      componentId,
      positions: nextPositions,
    });

    // This component is now explicitly on-hole, so it is no longer free-floating.
    controller.dispatch({
      type: 'COMPONENT_FREEFORM_POSITION_SET',
      componentId,
      topLeft: null,
    });

    return true;
  };

  const setFreeformTopLeftFromWorld = (componentId: string, worldTopLeft: { x: number; y: number }) => {
    const topLeftLocal = worldPointToLocal(worldTopLeft);
    controller.dispatch({
      type: 'COMPONENT_FREEFORM_POSITION_SET',
      componentId,
      topLeft: topLeftLocal,
    });
  };

  // If a user wires a free-floating component, immediately snap it onto the board.
  editor.addPipe((context) => {
    if (context.type === 'connectioncreated') {
      const data = context.data as unknown as { source?: string; target?: string };
      const src = typeof data?.source === 'string' ? data.source : null;
      const tgt = typeof data?.target === 'string' ? data.target : null;
      if (!src || !tgt) return context;

      const srcNode = editor.getNode(src);
      const tgtNode = editor.getNode(tgt);
      const compNode = isComponentNodePayload(srcNode)
        ? (srcNode as ComponentNode)
        : isComponentNodePayload(tgtNode)
          ? (tgtNode as ComponentNode)
          : null;

      if (compNode) {
        const st = controller.getState();
        const stored = st.ui.freeformComponentTopLeftById[compNode.componentId];
        if (stored) {
          // Convert stored local top-left back into world and snap pins accordingly.
          const worldTopLeft = localPointToWorld(stored);
          void snapPinsByCentroidDelta(compNode.componentId, worldTopLeft);
        }
      }
    }
    return context;
  });

  area.addPipe((context) => {
    if (context.type === 'pointerdown') {
      const evt = context.data.event;
      const target = evt.target as HTMLElement | null;
      if (target) {
        const isInteractive =
          Boolean(target.closest('[data-testid="connection"]')) ||
          Boolean(target.closest('[data-testid="pin"]')) ||
          Boolean(target.closest('.input-socket')) ||
          Boolean(target.closest('.output-socket')) ||
          // Component nodes (and their drag hotspots) should not be treated as empty space.
          // Otherwise a click meant to select can be immediately cleared by this handler.
          Boolean(target.closest('[data-component-node="1"]'));

        // Empty space click: clear selections.
        if (!isInteractive) {
          controller.dispatch({ type: 'CONNECTION_SELECTED', connectionId: null });
          controller.dispatch({ type: 'COMPONENT_SELECTED', componentId: null });
        }
      }
    }

    // Track the last user-driven translation of a component node.
    if (context.type === 'nodetranslated') {
      const movedNodeId = (context.data as unknown as { id?: string }).id;
      const pos = (context.data as unknown as { position?: { x: number; y: number } }).position;
      if (movedNodeId && pos) {
        const node = editor.getNode(movedNodeId);
        if (node && isComponentNodePayload(node)) {
          pendingComponentMove = {
            componentId: (node as ComponentNode).componentId,
            nodeWorldTopLeft: { x: pos.x, y: pos.y },
            nodeId: movedNodeId,
          };
        }
      }
    }

    // Commit on pointerup so we don't fight the drag interaction.
    if (context.type === 'pointerup' && pendingComponentMove) {
      const commit = pendingComponentMove;
      pendingComponentMove = null;

      const st = controller.getState();
      const allowFreeFloat = Boolean(st.ui.allowUnwiredComponentsToFreeFloat);
      const wired = isNodeWired(commit.nodeId);

      if (wired || !allowFreeFloat) {
        void snapPinsByCentroidDelta(commit.componentId, commit.nodeWorldTopLeft);
        return context;
      }

      // Unwired + free-float enabled: decide whether to snap (near board) or persist freeform.
      const component = st.breadboard.components.find((c) => c.id === commit.componentId);
      const anchorInNode = (() => {
        if (!component) {
          return {
            x: DEFAULT_COMPONENT_NODE_SIZE.width / 2,
            y: DEFAULT_COMPONENT_NODE_SIZE.height / 2,
          };
        }

        const size = getDefaultComponentNodeSize({
          type: component.type,
          legs: component.positions.length,
        });

        return getComponentLegAnchorInNode({
          type: component.type,
          legs: component.positions.length,
          width: size.width,
          height: size.height,
        });
      })();

      const nodeWorldAnchor = {
        x: commit.nodeWorldTopLeft.x + anchorInNode.x,
        y: commit.nodeWorldTopLeft.y + anchorInNode.y,
      };
      const centroidLocal = worldPointToLocal(nodeWorldAnchor);
      const inSnapZone =
        centroidLocal.x >= snapZoneLocal.left &&
        centroidLocal.x <= snapZoneLocal.right &&
        centroidLocal.y >= snapZoneLocal.top &&
        centroidLocal.y <= snapZoneLocal.bottom;

      if (inSnapZone) {
        const snapped = snapPinsByCentroidDelta(commit.componentId, commit.nodeWorldTopLeft);
        if (!snapped) {
          // Invalid hole placement (e.g. rail gaps). Keep it free-floating.
          setFreeformTopLeftFromWorld(commit.componentId, commit.nodeWorldTopLeft);
        }
      } else {
        setFreeformTopLeftFromWorld(commit.componentId, commit.nodeWorldTopLeft);
      }
    }

    return context;
  });
}
