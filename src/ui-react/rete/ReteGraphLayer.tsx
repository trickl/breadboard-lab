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
import { NodeEditor, ClassicPreset, getUID } from 'rete';
import { AreaPlugin, type Area2D } from 'rete-area-plugin';
import { ConnectionPlugin, ClassicFlow, type SocketData } from 'rete-connection-plugin';
import { ReactPlugin, Presets as ReactPresets, type ClassicScheme, type ReactArea2D } from 'rete-react-plugin';
import { getDOMSocketPosition } from 'rete-render-utils';
import { ReroutePlugin, type RerouteExtra } from 'rete-connection-reroute-plugin';
import { ConnectionPathPlugin } from 'rete-connection-path-plugin';
import { curveBundle, curveLinear } from 'd3-shape';
import { SmoothZoom } from './SmoothZoom';
import type { BreadboardController } from '@/ui-controller';
import type { AppState, ConnectionAppearance, ConnectionEndpointOrientation } from '@/ui-controller/types';
import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { getAllHolePositions } from '../geometry/breadboard-layout';
import { BreadboardLayout } from '@/core/breadboard-layout';
import { getBreadboardWorld, positionToWorld, type BoardRotation } from '@/ui-react/world/breadboard-world';
import { BreadboardSvg } from '@/ui-react/BreadboardSvg';
import { LABEL_PADDING_X, LABEL_PADDING_Y } from '@/ui-react/geometry/breadboard-layout';

/**
 * Socket for component legs
 */
const legSocket = new ClassicPreset.Socket('component-leg');

/**
 * Socket for breadboard holes/ports
 */
const holeSocket = new ClassicPreset.Socket('breadboard-hole');

/**
 * Rete node representing a component on the breadboard
 */
class ComponentNode extends ClassicPreset.Node {
  width = 100;
  height = 60;

  constructor(
    public componentId: string,
    public componentType: ComponentType,
    public legs: number
  ) {
    super(componentType);

    // Create output sockets for each component leg
    for (let i = 0; i < legs; i++) {
      this.addOutput(`leg${i}`, new ClassicPreset.Output(legSocket, `Leg ${i}`));
    }
  }
}

/**
 * Rete node representing a breadboard rail (one electrical net with many possible connection points).
 *
 * Note: For iteration 1 we keep classic preset layout (sockets stacked) to validate interactions.
 * Later we'll switch to a custom node renderer that positions sockets exactly over the breadboard holes.
 */
class RailNode extends ClassicPreset.Node {
  // Keep this tiny; we render sockets at absolute positions and don't want a big invisible hitbox.
  width = 1;
  height = 1;

  constructor(
    public railId: string,
    public railLabel: string,
    public holePositions: Array<{ row: number; col: number }>
  ) {
    super(railLabel);

    // Each hole gets its own input so each physical hole can have at most one wire.
    // We also add a matching output for each hole so the user can *start* a connection
    // from a rail hole (rail-to-rail wiring). The connection flow will map “drop on rail output”
    // into “connect to the corresponding rail input”, so the connection endpoints remain
    // well-defined (output→input) for Rete's connection model.
    for (let i = 0; i < holePositions.length; i++) {
      this.addInput(
        `h${i}`,
        new ClassicPreset.Input(holeSocket, '')
      );

      // Important: output ports default to multiple connections. For breadboard holes we want
      // at most one wire per physical hole.
      this.addOutput(
        `h${i}`,
        new ClassicPreset.Output(holeSocket, '', false)
      );
    }
  }
}

/**
 * Rete node representing the breadboard itself (skin/background).
 * Rendered as an SVG inside the Rete canvas so it pans/zooms with the viewport.
 */
class BreadboardNode extends ClassicPreset.Node {
  width = 0;
  height = 0;

  constructor(public labelText: string) {
    super(labelText);
    // Size the node to the full world extents (including padding)
    const world = getBreadboardWorld(0);
    this.width = world.total.width;
    this.height = world.total.height;
  }
}

type Schemes = ClassicScheme;

// Rete plugin typing note:
// Some plugins (e.g. reroute/path) are typed against a parent scope that includes Area2D signals.
// The official docs recommend including Area2D + renderer extras + plugin extras in one union.
type AreaExtra = Area2D<Schemes> | ReactArea2D<Schemes> | RerouteExtra;

function isRailNode(editor: NodeEditor<Schemes>, nodeId: string): boolean {
  const node = editor.getNode(nodeId);
  return Boolean(node && node instanceof RailNode);
}

function findConnectionsForSocket(socket: SocketData, editor: NodeEditor<Schemes>) {
  const { nodeId, side, key } = socket;
  return editor.getConnections().filter((connection) => {
    if (side === 'input') {
      return connection.target === nodeId && connection.targetInput === key;
    }
    return connection.source === nodeId && connection.sourceOutput === key;
  });
}

function portAllowsMultiple(socket: SocketData, editor: NodeEditor<Schemes>): boolean {
  const node = editor.getNode(socket.nodeId) as any;
  if (!node) return true;

  const port = socket.side === 'input' ? node.inputs?.[socket.key] : node.outputs?.[socket.key];
  // Undefined means “use preset default”; for our purposes, treat it as allowing multiple.
  return Boolean(port?.multipleConnections);
}

function removeConflictingConnections(socket: SocketData, editor: NodeEditor<Schemes>) {
  if (portAllowsMultiple(socket, editor)) return;

  const existing = findConnectionsForSocket(socket, editor);
  for (const c of existing) {
    void editor.removeConnection(c.id);
  }
}

function resolveSourceTarget(
  initial: SocketData,
  socket: SocketData,
  editor: NodeEditor<Schemes>
): { source: SocketData; target: SocketData } | null {
  // Disallow self-connection to the same exact port.
  if (initial.nodeId === socket.nodeId && initial.side === socket.side && initial.key === socket.key) {
    return null;
  }

  const initialIsRail = isRailNode(editor, initial.nodeId);
  const socketIsRail = isRailNode(editor, socket.nodeId);

  // Standard output→input or input→output (Rete classic semantics).
  if (initial.side === 'output' && socket.side === 'input') {
    return { source: initial, target: socket };
  }
  if (initial.side === 'input' && socket.side === 'output') {
    return { source: socket, target: initial };
  }

  // Special case: user drops on a *rail output socket* (we render rails as outputs so they are
  // interactive). We translate the rail output to its paired rail input for the actual connection.
  if (initial.side === 'output' && socket.side === 'output') {
    // Only allow output→output if at least one side is a rail. Otherwise it's component→component,
    // which doesn't make sense in this model.
    if (!initialIsRail && !socketIsRail) return null;

    // Prefer the non-rail socket as the source when exactly one side is a rail.
    const source = initialIsRail && !socketIsRail ? socket : initial;
    const rawTarget = initialIsRail && !socketIsRail ? initial : socket;

    // If the chosen target is a rail output, map it to the rail input of the same key.
    if (isRailNode(editor, rawTarget.nodeId)) {
      const target: SocketData = { ...rawTarget, side: 'input' };
      return { source, target };
    }
    return null;
  }

  return null;
}

function getDefaultConnectionAppearance(): ConnectionAppearance {
  return {
    style: 'curved',
    color: '#3b82f6',
    curved: {
      startOrientation: 'auto',
      endOrientation: 'auto',
    },
  };
}

function signOrOne(v: number) {
  if (v === 0) return 1;
  return v > 0 ? 1 : -1;
}

function pickOrientation(
  preference: ConnectionEndpointOrientation,
  dx: number,
  dy: number
): Exclude<ConnectionEndpointOrientation, 'auto'> {
  if (preference !== 'auto') return preference;
  return Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
}

function makeEndpointCurvedTransformer(options: {
  start: ConnectionEndpointOrientation;
  end: ConnectionEndpointOrientation;
  curvature: number;
}) {
  const { start, end, curvature } = options;

  return (points: Array<{ x: number; y: number }>) => {
    if (points.length !== 2) throw new Error('number of points should be equal to 2');
    const [p0, p1] = points;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const sx = signOrOne(dx);
    const sy = signOrOne(dy);

    const startOri = pickOrientation(start, dx, dy);
    const endOri = pickOrientation(end, dx, dy);

    const xDistance = Math.abs(dx);
    const yDistance = Math.abs(dy);

    // Match the classic transformer scaling, but per-endpoint.
    const startCross = startOri === 'vertical' ? xDistance : yDistance;
    const startAlong = startOri === 'vertical' ? yDistance : xDistance;
    const endCross = endOri === 'vertical' ? xDistance : yDistance;
    const endAlong = endOri === 'vertical' ? yDistance : xDistance;

    const startOffset = Math.max(startCross / 2, startAlong) * curvature;
    const endOffset = Math.max(endCross / 2, endAlong) * curvature;

    const p0a =
      startOri === 'vertical'
        ? { x: p0.x, y: p0.y + sy * startOffset }
        : { x: p0.x + sx * startOffset, y: p0.y };
    const p1a =
      endOri === 'vertical'
        ? { x: p1.x, y: p1.y - sy * endOffset }
        : { x: p1.x - sx * endOffset, y: p1.y };

    return [p0, p0a, p1a, p1];
  };
}

type Pointer = { x: number; y: number };

function startPointerDrag(options: {
  pointer: () => Pointer;
  onMove: (dx: number, dy: number) => void;
}) {
  let previous = { ...options.pointer() };

  function move() {
    const current = { ...options.pointer() };
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    previous = current;
    options.onMove(dx, dy);
  }

  function up() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

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
export const ReteGraphLayer: React.FC<ReteGraphLayerProps> = ({ 
  controller,
  rotation = 0,
}) => {
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
      (area.area as any).update();
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

    // --- Plugins: reroute + path ---
    // Reroute: lets users add draggable points on a connection (click to add, right-click to remove).
    // Path: draws straight (polyline) connection segments and supports multi-point paths.
    const reroutePlugin = new ReroutePlugin<Schemes>();
    const pathPlugin = new ConnectionPathPlugin<Schemes, AreaExtra>({
      // For a plain connection (2 endpoints), add auxiliary control points to create a pleasing curve.
      // For rerouted connections (N>2 points), keep points as-is and let the curve interpolate.
      transformer: (conn) => (points) => {
        const appearance = connectionUiRef.current.appearanceById[(conn as any).id] ??
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
        const appearance = connectionUiRef.current.appearanceById[(conn as any).id] ??
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
            if (payload instanceof BreadboardNode) {
              const BreadboardNodeRenderer = ({ data }: any) => {
                const rot = rotationRef.current;
                const world = getBreadboardWorld(rot);

                // Render the skin inside the node; pointer events disabled so panning/connecting works.
                return (
                  <div
                    data-testid="node"
                    style={{
                      position: 'relative',
                      width: world.total.width,
                      height: world.total.height,
                      overflow: 'visible',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      pointerEvents: 'none',
                    }}
                  >
                    {debugUiRef.current.showDebugOverlays && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 8,
                          top: 8,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(0,0,0,0.55)',
                          color: 'white',
                          fontSize: 12,
                          fontFamily:
                            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
                        }}
                      >
                        {data.label}
                      </div>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        left: LABEL_PADDING_X,
                        top: LABEL_PADDING_Y,
                        width: world.dimensions.width,
                        height: world.dimensions.height,
                        overflow: 'visible',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: world.nativeDimensions.width,
                          height: world.nativeDimensions.height,
                          transformOrigin: `${world.pivotLocal.x}px ${world.pivotLocal.y}px`,
                          transform: world.substrateTransform,
                        }}
                      >
                        <BreadboardSvg />
                      </div>
                    </div>
                  </div>
                );
              };

              return BreadboardNodeRenderer;
            }
            if (payload instanceof RailNode) {
              const RailNodeRenderer = ({ data, emit }: any) => {
                const rail = data as unknown as RailNode;
                const rot = rotationRef.current;
                const socketOuterSize =
                  ReactPresets.classic.vars.$socketsize + 2 * ReactPresets.classic.vars.$socketmargin;
                const socketOuterHalf = socketOuterSize / 2;

                // Label placement: use the first visible hole as anchor.
                const anchor = rail.holePositions[0]
                  ? positionToWorld(rail.holePositions[0], rot)
                  : { x: 0, y: 0 };

                return (
                  <div
                    data-testid="node"
                    style={{
                      position: 'relative',
                      width: 1,
                      height: 1,
                      overflow: 'visible',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      // Allow sockets to receive pointer events; the node body itself stays inert.
                      pointerEvents: 'none',
                    }}
                  >
                    {debugUiRef.current.showDebugOverlays && (
                      <div
                        style={{
                          position: 'absolute',
                          left: anchor.x,
                          top: Math.max(0, anchor.y - 18),
                          transform: 'translate(-50%, -50%)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(0,0,0,0.55)',
                          color: 'white',
                          fontSize: 12,
                          fontFamily:
                            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {data.label}
                      </div>
                    )}
                    {Object.entries(rail.outputs).map(([key, output]) => {
                      if (!output) return null;
                      const match = /^h(\d+)$/.exec(key);
                      const idx = match ? Number(match[1]) : -1;
                      const pos = idx >= 0 ? rail.holePositions[idx] : null;
                      if (!pos) return null;

                      const rotated = positionToWorld(pos, rot);
                      const input = rail.inputs[key];
                      if (!input) return null;

                      // We render BOTH:
                      // - a hidden input socket (so connections can terminate visually on the correct endpoint)
                      // - a visible output socket (so the user can start wires from rails and drop onto rails)
                      // The connection flow maps “drop on rail output” → “connect to rail input”.
                      return (
                        <div
                          key={key}
                          style={{
                            position: 'absolute',
                            // Important: do NOT use CSS transforms for centering.
                            // Socket position calculation (DOMSocketPosition) relies on offsetLeft/offsetTop,
                            // which ignores transforms. If we center with translate(-50%,-50%), the computed
                            // socket center will be shifted down-right.
                            left: rotated.x - socketOuterHalf,
                            top: rotated.y - socketOuterHalf,
                            pointerEvents: 'auto',
                            // Prevent inline baseline metrics from shifting the socket anchor.
                            lineHeight: 0,
                            fontSize: 0,
                          }}
                        >
                          {/* Hidden input endpoint */}
                          <div style={{ opacity: 0, pointerEvents: 'none' }}>
                            <ReactPresets.classic.RefSocket
                              name="input-socket"
                              side="input"
                              socketKey={key}
                              nodeId={rail.id}
                              emit={emit}
                              payload={input.socket}
                              data-testid="input-socket"
                            />
                          </div>

                          {/* Visible/interactive rail socket */}
                          <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'auto' }}>
                            <ReactPresets.classic.RefSocket
                              name="output-socket"
                              side="output"
                              socketKey={key}
                              nodeId={rail.id}
                              emit={emit}
                              payload={output.socket}
                              data-testid="output-socket"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              };

              return RailNodeRenderer;
            }

            // Default classic renderer for other nodes
            return ReactPresets.classic.Node;
          },

          connection: () => {
            // Render a selectable connection path.
            // Gesture separation:
            // - Click selects the wire (and highlights it)
            // - Shift-click is reserved for the reroute plugin (add point)
            const SelectableConnection = ({ data }: any) => {
              const ctx = ReactPresets.classic.useConnection();
              const path = ctx.path;
              if (!path) return null;

              const id = String(data.id);
              const appearance = connectionUiRef.current.appearanceById[id] ?? getDefaultConnectionAppearance();
              const isSelected = connectionUiRef.current.selectedConnectionId === id;

              const stroke = appearance.color || '#3b82f6';
              const strokeWidth = isSelected ? 8 : 5;
              const hitWidth = isSelected ? 14 : 10;

              const onPointerDown = (e: React.PointerEvent<SVGPathElement>) => {
                // Shift-click: select the wire AND allow reroute plugin to add a point.
                // We intentionally do not stop propagation in this case.
                if (e.shiftKey && e.button === 0) {
                  controller.dispatch({ type: 'CONNECTION_SELECTED', connectionId: id });
                  return;
                }
                if (e.button !== 0) return;
                e.stopPropagation();
                controller.dispatch({
                  type: 'CONNECTION_SELECTED',
                  connectionId: isSelected ? null : id,
                });
              };

              return (
                <svg
                  data-testid="connection"
                  style={{
                    overflow: 'visible',
                    position: 'absolute',
                    pointerEvents: 'none',
                    width: 9999,
                    height: 9999,
                  }}
                >
                  {/* Wide invisible hit target */}
                  <path
                    d={path}
                    onPointerDown={onPointerDown}
                    style={{
                      fill: 'none',
                      stroke: 'transparent',
                      strokeWidth: hitWidth,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                    }}
                  />

                  {/* Visible wire stroke */}
                  <path
                    d={path}
                    style={{
                      fill: 'none',
                      stroke,
                      strokeWidth,
                      pointerEvents: 'none',
                      opacity: isSelected ? 1 : 0.9,
                      filter: isSelected
                        ? 'drop-shadow(0px 0px 2px rgba(255,255,255,0.55))'
                        : undefined,
                    }}
                  />
                </svg>
              );
            };

            return SelectableConnection;
          },
        },
      })
    );

    // Render reroute pins on top of connections.
    // We only show pins when the corresponding wire is selected.
    render.addPreset({
      render: (context: any) => {
        const data = context.data;
        if (data.type !== 'reroute-pins') return;

        const pinData = data.data as {
          id: string;
          pins: Array<{ id: string; position: Pointer; selected?: boolean }>;
        };

        const connectionId = String(pinData.id);
        // Important: returning null here would cause the React renderer to NOT update this
        // container (leaving previously rendered pins visible). Instead, render an empty
        // fragment to actively clear the pin container for unselected connections.
        if (connectionUiRef.current.selectedConnectionId !== connectionId) return <></>;

        const pointer = () => area.area.pointer as unknown as Pointer;

        return (
          <>
            {pinData.pins.map((pin) => (
              <div
                key={pin.id}
                data-testid="pin"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  startPointerDrag({
                    pointer,
                    onMove: (dx, dy) => {
                      void reroutePlugin.translate(pin.id, dx, dy);
                    },
                  });
                  void reroutePlugin.select(pin.id);
                }}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  void reroutePlugin.remove(pin.id);
                }}
                style={{
                  position: 'absolute',
                  top: `${pin.position.y - 10}px`,
                  left: `${pin.position.x - 10}px`,
                  width: 20,
                  height: 20,
                  boxSizing: 'border-box',
                  background: pin.selected ? '#ffd92c' : 'steelblue',
                  border: '2px solid white',
                  borderRadius: 20,
                  cursor: 'grab',
                  zIndex: 50,
                  boxShadow: pin.selected ? '0 0 0 2px rgba(0,0,0,0.25)' : undefined,
                }}
              />
            ))}
          </>
        );
      },
    });

    // Configure connection renderer with classic preset
    // Custom connection flow:
    // - Rails are rendered as *output* sockets (so the user can start a wire from a rail hole).
    // - When the user drops onto a rail output socket, we map it to the corresponding rail *input*
    //   so that the editor still creates a classic output→input connection.
    // - We also enforce “one wire per hole” by removing conflicting connections on the actual
    //   source/target ports involved.
    connection.addPreset(() => {
      return new ClassicFlow({
        canMakeConnection: (initial: SocketData, socket: SocketData) => {
          return Boolean(resolveSourceTarget(initial, socket, editor));
        },
        makeConnection: (initial: SocketData, socket: SocketData, context: { editor: NodeEditor<Schemes> }) => {
          const resolved = resolveSourceTarget(initial, socket, context.editor);
          if (!resolved) return false;

          const { source, target } = resolved;

          // Ensure the corresponding ports exist.
          const sourceNode = context.editor.getNode(source.nodeId) as any;
          const targetNode = context.editor.getNode(target.nodeId) as any;
          if (!sourceNode?.outputs?.[source.key]) return false;
          if (!targetNode?.inputs?.[target.key]) return false;

          // Enforce per-hole single-connection constraints on the *actual* ports used.
          removeConflictingConnections(source, context.editor);
          removeConflictingConnections(target, context.editor);

          void context.editor.addConnection({
            id: getUID(),
            source: source.nodeId,
            sourceOutput: source.key,
            target: target.nodeId,
            targetInput: target.key,
          });
          return true;
        },
      });
    });

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
    (area.area as any).update();

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
  const syncNodes = useCallback(async (state: AppState) => {
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
    // We model each rail column as one node with one socket per visible rail hole.
    // This matches the electrical reality (one net) while preserving per-hole attachment constraints.
    const railNodeMap = railNodeMapRef.current;
    if (railNodeMap.size === 0) {
      const allHoles = getAllHolePositions();
      // World mapping is handled by the custom rail renderer (socket clouds).

      const railDefs: Array<{ id: string; label: string; col: number; anchorRow: number }> = [
        {
          id: 'rail-left-positive',
          label: 'Rail L +',
          col: BreadboardLayout.RAIL_LEFT_POSITIVE,
          anchorRow: 0,
        },
        {
          id: 'rail-left-negative',
          label: 'Rail L −',
          col: BreadboardLayout.RAIL_LEFT_NEGATIVE,
          anchorRow: 0,
        },
        {
          id: 'rail-right-positive',
          label: 'Rail R +',
          col: BreadboardLayout.RAIL_RIGHT_POSITIVE,
          anchorRow: 0,
        },
        {
          id: 'rail-right-negative',
          label: 'Rail R −',
          col: BreadboardLayout.RAIL_RIGHT_NEGATIVE,
          anchorRow: 0,
        },
      ];

      for (const def of railDefs) {
        const holePositions = allHoles
          .filter((p) => p.col === def.col)
          .sort((a, b) => {
            // For stable ordering, compare by world Y at the current rotation.
            const ay = positionToWorld(a, rotation).y;
            const by = positionToWorld(b, rotation).y;
            return ay - by;
          })
          .map((p) => ({ row: p.row, col: p.col }));

        const railNode = new RailNode(def.id, def.label, holePositions);
        await editor.addNode(railNode);
        railNodeMap.set(def.id, railNode.id);

        // Keep the rail node anchored at (0,0). The custom renderer positions sockets in world space.
        await area.translate(railNode.id, { x: 0, y: 0 });
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
          node = await createComponentNode(editor, component);
          componentNodeMap.set(component.id, node.id);
        }
      } else {
        // Create new node
        node = await createComponentNode(editor, component);
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
  }, [rotation]);

  // Helper to create a component node
  const createComponentNode = async (
    editor: NodeEditor<Schemes>,
    component: AnyComponent
  ): Promise<ComponentNode> => {
    const legCount = getComponentLegCount(component.type);
    const node = new ComponentNode(component.id, component.type, legCount);
    await editor.addNode(node);
    return node;
  };

  // Subscribe to controller state changes
  useEffect(() => {
    let previousSelectedId = connectionUiRef.current.selectedConnectionId;
    let previousAppearanceById = connectionUiRef.current.appearanceById;
    let previousShowDebugOverlays = debugUiRef.current.showDebugOverlays;

    const unsubscribe = controller.subscribe((state) => {
      void syncNodes(state);

      const nextShowDebugOverlays = Boolean(state.ui.showDebugOverlays);
      debugUiRef.current.showDebugOverlays = nextShowDebugOverlays;

      // Apply socket visibility without requiring React re-render.
      if (layerRef.current) {
        layerRef.current.setAttribute('data-debug-overlays', nextShowDebugOverlays ? 'on' : 'off');
        layerRef.current.style.setProperty('--debug-socket-opacity', nextShowDebugOverlays ? '0.25' : '0');
      }

      const nextSelectedId = state.connections.selectedConnectionId;
      const nextAppearanceById = state.connections.appearanceById;

      connectionUiRef.current.selectedConnectionId = nextSelectedId;
      connectionUiRef.current.appearanceById = nextAppearanceById;

      const editor = editorRef.current;
      const area = areaRef.current;
      if (!editor || !area) return;

      // Debug overlay visibility affects custom node renderers (Breadboard/Rails), so we need to
      // explicitly request node updates when the flag changes.
      if (nextShowDebugOverlays !== previousShowDebugOverlays) {
        const bbId = breadboardNodeIdRef.current;
        if (bbId) void area.update('node', bbId);
        for (const nodeId of railNodeMapRef.current.values()) {
          void area.update('node', nodeId);
        }
        previousShowDebugOverlays = nextShowDebugOverlays;
      }

      // Process one-shot Rete commands (e.g. delete connection).
      const cmd = state.connections.reteCommand;
      if (cmd && cmd.nonce !== connectionUiRef.current.lastProcessedReteCommandNonce) {
        connectionUiRef.current.lastProcessedReteCommandNonce = cmd.nonce;
        if (cmd.type === 'delete-connection') {
          const existing = editor.getConnections().find((c) => c.id === cmd.connectionId);
          if (existing) {
            void editor.removeConnection(cmd.connectionId);
          }
        }
      }

      // Re-render the affected connections when selection/appearance changes.
      if (nextSelectedId !== previousSelectedId) {
        if (previousSelectedId) void area.update('connection', previousSelectedId);
        if (nextSelectedId) void area.update('connection', nextSelectedId);

        // Reroute pins are rendered via a separate render signal ('reroute-pins'),
        // so we also need to update that layer when selection changes.
        if (previousSelectedId) void area.update('reroute-pins', previousSelectedId);
        if (nextSelectedId) void area.update('reroute-pins', nextSelectedId);

        previousSelectedId = nextSelectedId;
      }

      if (nextAppearanceById !== previousAppearanceById) {
        // Appearance changes can affect both stroke and computed path.
        for (const c of editor.getConnections()) {
          void area.update('connection', c.id);
        }
        previousAppearanceById = nextAppearanceById;
      }
    });

    // Initial sync
    void syncNodes(controller.getState());

    // Initial UI cache
    const state = controller.getState();
    connectionUiRef.current.selectedConnectionId = state.connections.selectedConnectionId;
    connectionUiRef.current.appearanceById = state.connections.appearanceById;
    connectionUiRef.current.lastProcessedReteCommandNonce = state.connections.reteCommandNonce;

    debugUiRef.current.showDebugOverlays = Boolean(state.ui.showDebugOverlays);

    // Initialize debug overlay DOM attributes.
    if (layerRef.current) {
      layerRef.current.setAttribute(
        'data-debug-overlays',
        debugUiRef.current.showDebugOverlays ? 'on' : 'off'
      );
      layerRef.current.style.setProperty(
        '--debug-socket-opacity',
        debugUiRef.current.showDebugOverlays ? '0.25' : '0'
      );
    }

    return unsubscribe;
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
