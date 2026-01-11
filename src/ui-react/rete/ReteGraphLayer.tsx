/**
 * ReteGraphLayer - Integrates Rete.js editor into React UI
 *
 * This component:
 * - Creates and manages Rete editor instance
 * - Synchronizes component nodes with controller state
 * - Renders connections between component legs and breadboard holes
 * - Aligns Rete coordinate space with breadboard world space
 * - Manages pan/zoom synchronization (Rete as source of truth per DR-3)
 *
 * Architecture Decision (DR-3): One shared coordinate system
 * - Rete's AreaPlugin manages viewport transform (pan/zoom)
 * - Rete transform is synchronized to parent SVG viewBox
 * - Eliminates coordinate drift between layers
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Box } from 'theme-ui';
import { createRoot } from 'react-dom/client';
import { NodeEditor } from 'rete';
import { AreaPlugin, type Area2D } from 'rete-area-plugin';
import { ConnectionPlugin } from 'rete-connection-plugin';
import {
  ReactPlugin,
  Presets as ReactPresets,
  type ClassicScheme,
  type ReactArea2D,
} from 'rete-react-plugin';
import { getDOMSocketPosition } from 'rete-render-utils';
import { ReroutePlugin, type RerouteExtra } from 'rete-connection-reroute-plugin';
import { ConnectionPathPlugin } from 'rete-connection-path-plugin';
import { curveBundle, curveLinear } from 'd3-shape';
import { SmoothZoom } from './SmoothZoom';
import { makeEndpointCurvedTransformer } from '@/ui-react/rete/graph/endpointCurves';
import { type Pointer } from '@/ui-react/rete/graph/pointerDrag';
import { createReroutePinsPreset } from '@/ui-react/rete/presets/reroutePinsPreset';
import { createConnectionFlowPreset } from '@/ui-react/rete/presets/connectionFlowPreset';
import type { BreadboardController } from '@/ui-controller';
import type {
  ConnectionAppearance,
} from '@/ui-controller/types';
import { ComponentType } from '@/core/types';
import {
  getBreadboardWorld,
  type BoardRotation,
} from '@/ui-react/world/breadboard-world';
import {
  DEBUG_RENDER_CONNECTIONS,
} from '@/ui-react/rete/graph/envFlags';
import {
  isBreadboardNodePayload,
  isRailNodePayload,
} from '@/ui-react/rete/graph/payloadGuards';
import {
  removeConflictingConnections,
  resolveSourceTarget,
} from '@/ui-react/rete/graph/connectionRules';
import { getDefaultConnectionAppearance } from '@/ui-react/rete/graph/defaultConnectionAppearance';
import { createBreadboardNodeRenderer } from '@/ui-react/rete/renderers/BreadboardNodeRenderer';
import { createRailNodeRenderer } from '@/ui-react/rete/renderers/RailNodeRenderer';
import { createSelectableConnectionRenderer } from '@/ui-react/rete/renderers/SelectableConnection';
import { BreadboardNode } from '@/ui-react/rete/nodes/BreadboardNode';
import { RailNode } from '@/ui-react/rete/nodes/RailNode';
import { createSyncNodes } from '@/ui-react/rete/sync/createSyncNodes';
import { subscribeReteToController } from '@/ui-react/rete/sync/subscribeReteToController';

// Back-compat: these helpers were historically exported from this module.
export { removeConflictingConnections, resolveSourceTarget };
// Back-compat: RailNode is part of the public API (tests import it from this module).
export { RailNode };

type Schemes = ClassicScheme;

// Rete plugin typing note:
// Some plugins (e.g. reroute/path) are typed against a parent scope that includes Area2D signals.
// The official docs recommend including Area2D + renderer extras + plugin extras in one union.
type AreaExtra = Area2D<Schemes> | ReactArea2D<Schemes> | RerouteExtra;

export interface ReteGraphLayerProps {
  controller: BreadboardController;
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * Get number of legs/pins for a component type
 */
function getComponentLegCount(type: ComponentType): number {
  switch (type) {
    case ComponentType.RESISTOR:
      return 2;
    case ComponentType.LED:
      return 2;
    case ComponentType.WIRE:
      return 2;
    case ComponentType.POWER_SUPPLY:
      return 1;
    case ComponentType.GROUND:
      return 1;
    case ComponentType.MICROPROCESSOR:
      return 16;
    case ComponentType.SWITCH:
      return 2;
    default:
      return 2;
  }
}

/**
 * ReteGraphLayer - Renders Rete editor aligned with breadboard coordinate system
 */
export const ReteGraphLayer: React.FC<ReteGraphLayerProps> = ({ controller, rotation = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<NodeEditor<Schemes> | null>(null);
  const areaRef = useRef<AreaPlugin<Schemes, AreaExtra> | null>(null);
  const componentNodeMapRef = useRef<Map<string, string>>(new Map());
  const railNodeMapRef = useRef<Map<string, string>>(new Map());
  const breadboardNodeIdRef = useRef<string | null>(null);

  const layerRef = useRef<HTMLDivElement | null>(null);

  const debugUiRef = useRef<{ showDebugOverlays: boolean }>({
    showDebugOverlays: Boolean(controller.getState().ui.showDebugOverlays),
  });

  // Selection + appearance are owned by the UI controller, but wire rendering happens inside Rete.
  // We keep them in a ref so Rete-rendered React components can consult the current values.
  const connectionUiRef = useRef<{
    selectedConnectionId: string | null;
    appearanceById: Record<string, ConnectionAppearance>;
    lastProcessedReteCommandNonce: number;
  }>({
    selectedConnectionId: null,
    appearanceById: {},
    lastProcessedReteCommandNonce: 0,
  });

  // The ReactPlugin preset customization is registered once; use refs to access live props.
  const rotationRef = useRef<BoardRotation>(rotation);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const dimsRef = useRef(getBreadboardWorld(rotation));
  useEffect(() => {
    dimsRef.current = getBreadboardWorld(rotation);
  }, [rotation]);

  // Rotation changes are *not* a native Rete state change, so the React renderer won't re-render
  // our custom RailNode socket-clouds unless we explicitly request an update.
  useEffect(() => {
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
  }, [rotation]);

  // Initialize Rete editor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
  }, []);

  // Synchronize component nodes with controller state
  const syncNodes = useCallback(
    createSyncNodes({
      editorRef,
      areaRef,
      componentNodeMapRef,
      railNodeMapRef,
      breadboardNodeIdRef,
      rotation,
      getComponentLegCount,
    }),
    [rotation]
  );

  // Subscribe to controller state changes
  useEffect(() => {
    return subscribeReteToController({
      controller,
      syncNodes,
      editorRef,
      areaRef,
      layerRef,
      breadboardNodeIdRef,
      railNodeMapRef,
      connectionUiRef,
      debugUiRef,
    });
  }, [controller, syncNodes]);

  // Keyboard shortcut: Ctrl+Shift+D toggles debug overlays (labels + socket markers).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      if (e.key.toLowerCase() !== 'd') return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);
      if (isTypingTarget) return;

      e.preventDefault();
      controller.dispatch({ type: 'DEBUG_OVERLAYS_TOGGLED' });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller]);

  return (
    <Box
      ref={layerRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        // Enable pointer events so Rete sockets can be interacted with.
        // (This also prevents the underlying SVG from starting a pan when the user is trying to connect.)
        pointerEvents: 'auto',
        zIndex: 10,
        // Make classic node UI much less intrusive.
        // These attributes exist in the classic preset implementation.
        '[data-testid="node"]': {
          background: 'rgba(78, 88, 191, 0.08) !important',
          border: '1px solid rgba(78, 88, 191, 0.25) !important',
          boxShadow: 'none !important',
        },
        '[data-testid="input-title"], [data-testid="output-title"]': {
          display: 'none',
        },
        // Keep sockets visually prominent and easy to hit.
        '.input-socket, .output-socket': {
          display: 'block',
          transform: 'scale(1.05)',
          pointerEvents: 'auto',
          opacity: 'var(--debug-socket-opacity, 0.25)',
        },

        // Rail hover educational highlights (production mode): driven by DOM attributes set
        // on the rail hole wrappers.
        '[data-rail-hole="1"][data-rail-hovered="1"]::after': {
          content: '""',
          position: 'absolute',
          left: '25%',
          top: '25%',
          width: '50%',
          height: '50%',
          borderRadius: 999,
          background: 'rgba(148, 163, 184, 0.22)',
          boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.55)',
          pointerEvents: 'none',
          zIndex: 1,
        },
        '[data-rail-hole="1"][data-rail-hovered-primary="1"]::after': {
          background: 'rgba(148, 163, 184, 0.5)',
          boxShadow: '0 0 0 2px rgba(148, 163, 184, 1), 0 2px 6px rgba(0,0,0,0.35)',
        },
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
        }}
      />
    </Box>
  );
};
