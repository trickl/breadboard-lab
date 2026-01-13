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
  isRailNodePayload,
} from '@/ui-react/rete/graph/payloadGuards';
import { getDefaultConnectionAppearance } from '@/ui-react/rete/graph/defaultConnectionAppearance';
import { createBreadboardNodeRenderer } from '@/ui-react/rete/renderers/BreadboardNodeRenderer';
import { createRailNodeRenderer } from '@/ui-react/rete/renderers/RailNodeRenderer';
import { createSelectableConnectionRenderer } from '@/ui-react/rete/renderers/SelectableConnection';
import { createReroutePinsPreset } from '@/ui-react/rete/presets/reroutePinsPreset';
import { createConnectionFlowPreset } from '@/ui-react/rete/presets/connectionFlowPreset';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';
import type { BoardRotation } from '@/ui-react/world/breadboard-world';

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
}
