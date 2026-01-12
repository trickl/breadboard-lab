import type React from 'react';
import { createRoot } from 'react-dom/client';
import { NodeEditor } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';
import { ConnectionPlugin } from 'rete-connection-plugin';
import { getDOMSocketPosition } from 'rete-render-utils';
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin';
import { ReroutePlugin } from 'rete-connection-reroute-plugin';
import { ConnectionPathPlugin } from 'rete-connection-path-plugin';
import { curveBundle, curveLinear } from 'd3-shape';

import type { BreadboardController } from '@/ui-controller';
import type { ConnectionAppearance } from '@/ui-controller/types';
import { SmoothZoom } from '@/ui-react/rete/SmoothZoom';
import { makeEndpointCurvedTransformer } from '@/ui-react/rete/graph/endpointCurves';
import { type Pointer } from '@/ui-react/rete/graph/pointerDrag';
import {
  DEBUG_RENDER_CONNECTIONS,
} from '@/ui-react/rete/graph/envFlags';
import {
  isBreadboardNodePayload,
  isRailNodePayload,
} from '@/ui-react/rete/graph/payloadGuards';
import { getDefaultConnectionAppearance } from '@/ui-react/rete/graph/defaultConnectionAppearance';
import { createBreadboardNodeRenderer } from '@/ui-react/rete/renderers/BreadboardNodeRenderer';
import { createRailNodeRenderer } from '@/ui-react/rete/renderers/RailNodeRenderer';
import { createSelectableConnectionRenderer } from '@/ui-react/rete/renderers/SelectableConnection';
import { createReroutePinsPreset } from '@/ui-react/rete/presets/reroutePinsPreset';
import { createConnectionFlowPreset } from '@/ui-react/rete/presets/connectionFlowPreset';
import { getBreadboardWorld, type BoardRotation } from '@/ui-react/world/breadboard-world';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';

export type InitializeReteEditorOptions = {
  container: HTMLDivElement;
  controller: BreadboardController;

  editorRef: React.MutableRefObject<NodeEditor<Schemes> | null>;
  areaRef: React.MutableRefObject<AreaPlugin<Schemes, AreaExtra> | null>;

  rotationRef: React.MutableRefObject<BoardRotation>;
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>;
  layerRef: React.MutableRefObject<HTMLDivElement | null>;

  connectionUiRef: React.MutableRefObject<{
    selectedConnectionId: string | null;
    appearanceById: Record<string, ConnectionAppearance>;
  }>;
};

export function initializeReteEditor({
  container,
  controller,
  editorRef,
  areaRef,
  rotationRef,
  debugUiRef,
  layerRef,
  connectionUiRef,
}: InitializeReteEditorOptions) {
  // React StrictMode intentionally mounts/unmounts components twice in development.
  // If a previous AreaPlugin instance didn't fully remove its DOM, we can end up
  // with "ghost" content underneath. Clearing the container makes initialization
  // idempotent and prevents duplicate breadboards.
  container.innerHTML = '';

  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);

  // Diagnostics: log connection lifecycle events (created/removed) so we can tell whether
  // a connection is created and then immediately removed by some other pipe/plugin.
  // Enabled when debug overlays are on, or when VITE_CONNECTION_LOGS=1/true.
  editor.addPipe((context) => {
    const logEnabled =
      Boolean(debugUiRef.current.showDebugOverlays) ||
      String(import.meta.env.VITE_CONNECTION_LOGS ?? '').toLowerCase() === 'true' ||
      String(import.meta.env.VITE_CONNECTION_LOGS ?? '') === '1';
    if (!logEnabled) return context;

    const asConnLike = (
      data: unknown
    ): {
      id?: unknown;
      source?: unknown;
      sourceOutput?: unknown;
      target?: unknown;
      targetInput?: unknown;
    } | null => {
      if (!data || typeof data !== 'object') return null;
      return data as {
        id?: unknown;
        source?: unknown;
        sourceOutput?: unknown;
        target?: unknown;
        targetInput?: unknown;
      };
    };

    if (context && typeof context === 'object' && 'type' in context) {
      const t = (context as { type?: string }).type;
      if (t === 'connectioncreated' || t === 'connectionremoved') {
        const c = asConnLike((context as { data?: unknown }).data);
        console.log(`[ReteGraphLayer] ${t}`, {
          id: c?.id,
          source: c?.source,
          sourceOutput: c?.sourceOutput,
          target: c?.target,
          targetInput: c?.targetInput,
          total: editor.getConnections().length,
        });
      }
    }
    return context;
  });

  // Replace rete-area-plugin's default quantized wheel zoom with a smooth, animated zoom.
  // This keeps trackpads continuous and makes mouse-wheel zoom feel much less "steppy".
  area.area.setZoomHandler(
    new SmoothZoom(0.1, {
      wheelZoomSpeed: 0.001,
      smoothTimeMs: 120,
      perGestureFactorClamp: { min: 0.25, max: 4 },
    })
  );

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
  area.addPipe((context) => {
    if (context.type === 'pointerdown') {
      const evt = context.data.event;
      const target = evt.target as HTMLElement | null;
      if (target) {
        const isInteractive =
          Boolean(target.closest('[data-testid="connection"]')) ||
          Boolean(target.closest('[data-testid="pin"]')) ||
          Boolean(target.closest('.input-socket')) ||
          Boolean(target.closest('.output-socket'));

        if (!isInteractive) {
          controller.dispatch({ type: 'CONNECTION_SELECTED', connectionId: null });
        }
      }
    }
    return context;
  });

  // Store references
  editorRef.current = editor;
  areaRef.current = area;

  // Initialize viewport to fit the breadboard world.
  // Rete is the only viewport in this mode.
  const bounds = container.getBoundingClientRect();
  const w = bounds.width || 1;
  const h = bounds.height || 1;
  const world = getBreadboardWorld(rotationRef.current);
  const kw = w / (world.total.width || 1);
  const kh = h / (world.total.height || 1);
  const k = Math.min(kw, kh) * 0.95;
  area.area.transform.k = Number.isFinite(k) && k > 0 ? k : 1;
  // Center the world.
  area.area.transform.x = (w - world.total.width * area.area.transform.k) / 2;
  area.area.transform.y = (h - world.total.height * area.area.transform.k) / 2;
  // rete-area-plugin's internal Area.update() is typed as private.
  // At runtime this is the correct way to apply the transform.
  (area.area as unknown as { update: () => void }).update();

  // Cleanup on unmount
  return () => {
    if (area) {
      area.destroy();
    }

    // Ensure no leftover DOM from Rete/AreaPlugin remains.
    container.innerHTML = '';
  };
}
