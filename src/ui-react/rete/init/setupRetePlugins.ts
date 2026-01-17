import type React from 'react';
import { createRoot } from 'react-dom/client';
import type { NodeEditor } from 'rete';
import { getUID } from 'rete';
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
  getComponentLegPositionsInNode,
  getComponentLegAnchorInNode,
} from '@/ui-react/rete/layout/componentNodeLayout';
import { pickBestLocalSnapDelta } from '@/ui-react/rete/graph/smartSnap';

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
      getConnections: () => Array<{
        id: string;
        source?: string;
        sourceOutput?: string;
        target?: string;
        targetInput?: string;
      }>;
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

  const buildRailHoleIndexByPosition = (): Map<string, { railNodeId: string; holeIndex: number }> => {
    const map = new Map<string, { railNodeId: string; holeIndex: number }>();
    for (const n of editor.getNodes()) {
      if (!isRailNodePayload(n)) continue;
      const rail = n as unknown as { id: string; holePositions?: Array<{ row: number; col: number }> };
      const holes = rail.holePositions ?? [];
      for (let i = 0; i < holes.length; i++) {
        const p = holes[i];
        map.set(`${p.row},${p.col}`, { railNodeId: rail.id, holeIndex: i });
      }
    }
    return map;
  };

  const isRailHoleOccupied = (railNodeId: string, holeIndex: number): boolean => {
    const outKey = `h${holeIndex}`;
    const inKey = `in-h${holeIndex}`;
    return editor.getConnections().some((c) => {
      const srcOut = String((c as unknown as { sourceOutput?: unknown }).sourceOutput ?? '');
      const tgtIn = String((c as unknown as { targetInput?: unknown }).targetInput ?? '');
      return (
        (c.source === railNodeId && (srcOut === outKey || srcOut === inKey)) ||
        (c.target === railNodeId && (tgtIn === inKey || tgtIn === outKey))
      );
    });
  };

  const isComponentLegAlreadyConnected = (componentNodeId: string, legIndex: number): boolean => {
    const legKey = `leg${legIndex}`;
    return editor.getConnections().some((c) => {
      const srcOut = String((c as unknown as { sourceOutput?: unknown }).sourceOutput ?? '');
      const tgtIn = String((c as unknown as { targetInput?: unknown }).targetInput ?? '');
      return (
        (c.source === componentNodeId && srcOut === legKey) ||
        (c.target === componentNodeId && tgtIn === legKey)
      );
    });
  };

  const getConnectedLegIndexes = (nodeId: string): Set<number> => {
    const out = new Set<number>();
    for (const c of editor.getConnections()) {
      if (c.source === nodeId) {
        const key = String((c as unknown as { sourceOutput?: unknown }).sourceOutput ?? '');
        const m = /^leg(\d+)$/.exec(key);
        if (m) out.add(Number(m[1]));
      }
      if (c.target === nodeId) {
        const key = String((c as unknown as { targetInput?: unknown }).targetInput ?? '');
        const m = /^leg(\d+)$/.exec(key);
        if (m) out.add(Number(m[1]));
      }
    }
    return out;
  };

  const SMART_SNAP_MAX_MOVE_PX = (() => {
    const raw = Number(import.meta.env.VITE_SMART_SNAP_MAX_MOVE_PX);
    if (Number.isFinite(raw) && raw > 0) return raw;
    // Default: allow a modest nudge (well under one pitch) to “magnetize” to holes.
    return HOLE_SPACING * 0.75;
  })();

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

  const commitComponentToPositions = (componentId: string, positions: Position[]) => {
    controller.dispatch({
      type: 'COMPONENT_MOVED',
      componentId,
      positions,
    });

    // This component is now explicitly on-hole, so it is no longer free-floating.
    controller.dispatch({
      type: 'COMPONENT_FREEFORM_POSITION_SET',
      componentId,
      topLeft: null,
    });
  };

  const computePinsByCentroidDelta = (
    componentId: string,
    nodeWorldTopLeft: { x: number; y: number }
  ): Position[] | null => {
    const state = controller.getState();
    const component = state.breadboard.components.find((c) => c.id === componentId);
    if (!component || component.positions.length === 0) return null;

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
        return null; // Invalid move.
      }
      nextPositions.push(pos);
    }

    // Defensive: never allow multiple pins to collapse to the same hole.
    const uniq = new Set(nextPositions.map((p) => `${p.row},${p.col}`));
    if (uniq.size !== nextPositions.length) return null;

    return nextPositions;
  };

  const snapPinsByCentroidDelta = (
    componentId: string,
    nodeWorldTopLeft: { x: number; y: number }
  ): boolean => {
    const next = computePinsByCentroidDelta(componentId, nodeWorldTopLeft);
    if (!next) return false;
    commitComponentToPositions(componentId, next);
    return true;
  };

  const computePinsBySocketProjection = (options: {
    componentId: string;
    nodeId: string;
    nodeWorldTopLeft: { x: number; y: number };
    requireUnoccupiedLegIndexes?: Set<number>;
  }): Position[] | null => {
    const { componentId, nodeWorldTopLeft, requireUnoccupiedLegIndexes } = options;
    const state = controller.getState();
    const component = state.breadboard.components.find((c) => c.id === componentId);
    if (!component) return null;

    const legs = component.positions.length;
    if (legs <= 0) return null;

    const size = getDefaultComponentNodeSize({ type: component.type, legs });
    const legPositionsInNode = getComponentLegPositionsInNode({
      type: component.type,
      legs,
      width: size.width,
      height: size.height,
    });

    const nextPositions: Position[] = [];
    const railIndexByPos = requireUnoccupiedLegIndexes?.size
      ? buildRailHoleIndexByPosition()
      : null;
    for (let i = 0; i < legs; i++) {
      const socket = legPositionsInNode[i];
      if (!socket) return null;

      // Socket world position → local board position → nearest hole.
      const socketWorld = {
        x: nodeWorldTopLeft.x + socket.x,
        y: nodeWorldTopLeft.y + socket.y,
      };
      const socketLocal = worldPointToLocal(socketWorld);
      const pos = pixelsToPosition(socketLocal.x, socketLocal.y);
      if (!isValidPosition(pos)) return null;

      // For smart-snap auto-wiring we must never claim an already-occupied rail hole.
      if (requireUnoccupiedLegIndexes?.has(i)) {
        const railRef = railIndexByPos?.get(`${pos.row},${pos.col}`) ?? null;
        if (!railRef) return null;
        if (isRailHoleOccupied(railRef.railNodeId, railRef.holeIndex)) return null;
      }
      nextPositions.push(pos);
    }

    const uniq = new Set(nextPositions.map((p) => `${p.row},${p.col}`));
    if (uniq.size !== nextPositions.length) return null;

    return nextPositions;
  };

  const snapPinsBySocketProjection = (options: {
    componentId: string;
    nodeId: string;
    nodeWorldTopLeft: { x: number; y: number };
    requireUnoccupiedLegIndexes?: Set<number>;
  }): Position[] | null => {
    const next = computePinsBySocketProjection({
      componentId: options.componentId,
      nodeId: options.nodeId,
      nodeWorldTopLeft: options.nodeWorldTopLeft,
      requireUnoccupiedLegIndexes: options.requireUnoccupiedLegIndexes,
    });
    if (!next) return null;
    commitComponentToPositions(options.componentId, next);
    return next;
  };

  const autoConnectUnwiredLegsToSnappedHoles = (options: {
    componentNodeId: string;
    connectedLegIndexes: Set<number>;
    snappedPositions: Position[];
  }) => {
    const { componentNodeId, connectedLegIndexes, snappedPositions } = options;
    const railIndexByPos = buildRailHoleIndexByPosition();

    const compNode = editor.getNode(componentNodeId) as unknown as { outputs?: Record<string, unknown> } | null;
    if (!compNode) return;

    for (let i = 0; i < snappedPositions.length; i++) {
      if (connectedLegIndexes.has(i)) continue;

      // Leg must still be free.
      if (isComponentLegAlreadyConnected(componentNodeId, i)) continue;

      const pos = snappedPositions[i];
      const railRef = railIndexByPos.get(`${pos.row},${pos.col}`);
      if (!railRef) continue;
      if (isRailHoleOccupied(railRef.railNodeId, railRef.holeIndex)) continue;

      // Defensive: ensure this leg output exists on the node.
      const legKey = `leg${i}`;
      if (!compNode.outputs?.[legKey]) continue;

      const railNode = editor.getNode(railRef.railNodeId) as unknown as { inputs?: Record<string, unknown> } | null;
      if (!railNode) continue;

      const preferredIn = `in-h${railRef.holeIndex}`;
      const legacyIn = `h${railRef.holeIndex}`;
      const targetInput = railNode.inputs?.[preferredIn] ? preferredIn : legacyIn;

      // IMPORTANT: do not remove conflicting connections here. Smart-snap must not replace wires.
      // If something changed between compute and now, addConnection may fail; that's OK.
      const id = getUID();
      void editor.addConnection({
        id,
        source: componentNodeId,
        sourceOutput: legKey,
        target: railRef.railNodeId,
        targetInput,
      } as any);
    }
  };

  const maybeNudgeWorldTopLeftForUnconnectedSockets = (options: {
    componentId: string;
    nodeId: string;
    nodeWorldTopLeft: { x: number; y: number };
    maxMovePx: number;
  }): { x: number; y: number } => {
    const { componentId, nodeId, nodeWorldTopLeft, maxMovePx } = options;

    const st = controller.getState();
    const component = st.breadboard.components.find((c) => c.id === componentId);
    if (!component) return nodeWorldTopLeft;

    const legs = component.positions.length;
    if (legs <= 0) return nodeWorldTopLeft;

    const connected = getConnectedLegIndexes(nodeId);
    const unconnected = Array.from({ length: legs }, (_, i) => i).filter((i) => !connected.has(i));
    if (unconnected.length === 0) return nodeWorldTopLeft;

    const size = getDefaultComponentNodeSize({ type: component.type, legs });
    const legPositionsInNode = getComponentLegPositionsInNode({
      type: component.type,
      legs,
      width: size.width,
      height: size.height,
    });

    const socketLocals = unconnected
      .map((i) => {
        const socket = legPositionsInNode[i];
        if (!socket) return null;
        const socketWorld = {
          x: nodeWorldTopLeft.x + socket.x,
          y: nodeWorldTopLeft.y + socket.y,
        };
        return worldPointToLocal(socketWorld);
      })
      .filter((x): x is { x: number; y: number } => Boolean(x));

    if (!socketLocals.length) return nodeWorldTopLeft;

    // Exclude holes already occupied by an existing wire/connection.
    const railIndexByPos = buildRailHoleIndexByPosition();

    const deltaLocal = pickBestLocalSnapDelta({
      socketLocals,
      maxMovePx,
      nearestHoleCenterLocal: (p) => {
        const nearest = pixelsToPosition(p.x, p.y);
        if (!isValidPosition(nearest)) return null;

        const railRef = railIndexByPos.get(`${nearest.row},${nearest.col}`);
        if (!railRef) return null;
        if (isRailHoleOccupied(railRef.railNodeId, railRef.holeIndex)) return null;

        return positionToPixels(nearest);
      },
    });

    // Convert a local translation to a world translation (affine transform difference).
    const w0 = localPointToWorld({ x: 0, y: 0 });
    const w1 = localPointToWorld(deltaLocal);
    const deltaWorld = { x: w1.x - w0.x, y: w1.y - w0.y };

    return { x: nodeWorldTopLeft.x + deltaWorld.x, y: nodeWorldTopLeft.y + deltaWorld.y };
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
          // If the component no longer has any free connectors (all legs are wired), do not
          // auto-snap it. (Snapping is only meant to help align *unconnected* legs.)
          const legs = st.breadboard.components.find((c) => c.id === compNode.componentId)?.positions
            .length;
          if (typeof legs === 'number' && legs > 0) {
            const connected = getConnectedLegIndexes(compNode.id);
            if (connected.size >= legs) return context;
          }

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
        // If there are unconnected sockets, help-align them to holes with a bounded nudge.
        // Fully-wired components keep the drop location (no extra magnetism).
        const st2 = controller.getState();
        const component2 = st2.breadboard.components.find((c) => c.id === commit.componentId);
        const legs2 = component2?.positions.length ?? 0;
        const connected = getConnectedLegIndexes(commit.nodeId);
        const hasUnconnected = legs2 > 0 && connected.size < legs2;

        if (hasUnconnected) {
          const nudged = maybeNudgeWorldTopLeftForUnconnectedSockets({
            componentId: commit.componentId,
            nodeId: commit.nodeId,
            nodeWorldTopLeft: commit.nodeWorldTopLeft,
            maxMovePx: SMART_SNAP_MAX_MOVE_PX,
          });

          const requireFree = new Set<number>();
          for (let i = 0; i < legs2; i++) if (!connected.has(i)) requireFree.add(i);

          const snappedPositions = snapPinsBySocketProjection({
            componentId: commit.componentId,
            nodeId: commit.nodeId,
            nodeWorldTopLeft: nudged,
            requireUnoccupiedLegIndexes: requireFree,
          });

          if (!snappedPositions) {
            // Fall back to existing behavior.
            void snapPinsByCentroidDelta(commit.componentId, commit.nodeWorldTopLeft);
          } else {
            autoConnectUnwiredLegsToSnappedHoles({
              componentNodeId: commit.nodeId,
              connectedLegIndexes: connected,
              snappedPositions,
            });
          }
          return context;
        }

        // Fully wired: do not auto-snap. Persist the node's freeform placement so it doesn't
        // "jump" back to its old on-hole anchor when other state changes (e.g. adding a component)
        // triggers a re-sync.
        if (wired) {
          setFreeformTopLeftFromWorld(commit.componentId, commit.nodeWorldTopLeft);
          return context;
        }

        // If free-floating is disabled, we still need to force unwired components onto holes.
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
        // Unwired drop near board: try to align sockets to holes (with nudge) so the user can wire quickly.
        const nudged = maybeNudgeWorldTopLeftForUnconnectedSockets({
          componentId: commit.componentId,
          nodeId: commit.nodeId,
          nodeWorldTopLeft: commit.nodeWorldTopLeft,
          maxMovePx: SMART_SNAP_MAX_MOVE_PX,
        });

        const legs = component?.positions.length ?? 0;
        const connected = getConnectedLegIndexes(commit.nodeId);
        const requireFree = new Set<number>();
        for (let i = 0; i < legs; i++) if (!connected.has(i)) requireFree.add(i);

        const snappedPositions = snapPinsBySocketProjection({
          componentId: commit.componentId,
          nodeId: commit.nodeId,
          nodeWorldTopLeft: nudged,
          requireUnoccupiedLegIndexes: requireFree,
        });

        if (!snappedPositions) {
          // Invalid hole placement (e.g. rail gaps). Keep it free-floating.
          setFreeformTopLeftFromWorld(commit.componentId, commit.nodeWorldTopLeft);
        } else {
          autoConnectUnwiredLegsToSnappedHoles({
            componentNodeId: commit.nodeId,
            connectedLegIndexes: connected,
            snappedPositions,
          });
        }
      } else {
        setFreeformTopLeftFromWorld(commit.componentId, commit.nodeWorldTopLeft);
      }
    }

    return context;
  });
}
