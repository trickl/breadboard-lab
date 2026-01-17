import type { ClassicPreset } from 'rete';
import type { ClassicScheme, RenderEmit } from 'rete-react-plugin';
import { Presets as ReactPresets } from 'rete-react-plugin';

import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';
import type { ComponentNode } from '@/ui-react/rete/nodes/ComponentNode';
import type { Resistor } from '@/core/types';
import { ComponentType } from '@/core/types';
import {
  getComponentLegPositionsInNode,
  getDefaultComponentNodeSize,
} from '@/ui-react/rete/layout/componentNodeLayout';
import ledRedUrl from '@/images/led-red.svg';
import resistorPlaceholderUrl from '@/images/resistor-placeholder.svg';
import powerSupplyPlaceholderUrl from '@/images/power-supply-placeholder.svg';
import switchPlaceholderUrl from '@/images/switch-placeholder.svg';
import { componentLibrary } from '@/core/component-library';
import { COLOR_TO_RGB, resistanceToColorBands } from '@/core/resistor-color-code';
import { computeResistorBandRects } from '@/ui-react/components/component-renderer/bodies/resistorBandLayout';
import {
  computeBestFitSimilarityMatrixFromViewBoxAnchors,
  computeTwoPointMatrixFromViewBoxAnchors,
} from '@/ui-react/components/component-renderer/svg/alignTwoPointImage';

type Schemes = ClassicScheme;

type NodeRendererProps = {
  data: ClassicPreset.Node;
  emit: RenderEmit<Schemes>;
};

function getSocketOuterHalf(): number {
  const outerSize =
    ReactPresets.classic.vars.$socketsize + 2 * ReactPresets.classic.vars.$socketmargin;
  return outerSize / 2;
}

export function createComponentNodeRenderer(options: { controller: BreadboardController }) {
  const { controller } = options;

  function getIconSpec(type: ComponentType) {
    switch (type) {
      case ComponentType.LED:
        return {
          url: ledRedUrl,
          layout: {
            width: 64,
            height: 128,
            viewBox: { minX: 0, minY: 0, width: 64, height: 128 },
            preserveAspectRatio: 'xMidYMid meet' as const,
          },
          anchors2: {
            // Leg tip centers in `src/images/led-red.svg` viewBox coordinates.
            a0: { x: 24, y: 124 },
            a1: { x: 40, y: 124 },
          },
        };

      case ComponentType.RESISTOR:
        return {
          url: resistorPlaceholderUrl,
          layout: {
            width: 160,
            height: 64,
            viewBox: { minX: 0, minY: 0, width: 160, height: 64 },
            preserveAspectRatio: 'xMidYMid meet' as const,
          },
          anchors2: {
            // Leg tip centers in `src/images/resistor-placeholder.svg` viewBox coordinates.
            a0: { x: 0, y: 32 },
            a1: { x: 160, y: 32 },
          },
        };

      case ComponentType.POWER_SUPPLY:
        return {
          url: powerSupplyPlaceholderUrl,
          layout: {
            width: 160,
            height: 64,
            viewBox: { minX: 0, minY: 0, width: 160, height: 64 },
            preserveAspectRatio: 'xMidYMid meet' as const,
          },
          anchors2: {
            a0: { x: 0, y: 32 },
            a1: { x: 160, y: 32 },
          },
        };

      case ComponentType.SWITCH:
        return {
          url: switchPlaceholderUrl,
          layout: {
            width: 160,
            height: 160,
            viewBox: { minX: 0, minY: 0, width: 160, height: 160 },
            preserveAspectRatio: 'xMidYMid meet' as const,
          },
          anchorsN: {
            anchors: [
              { x: 40, y: 40 },
              { x: 120, y: 40 },
              { x: 40, y: 120 },
              { x: 120, y: 120 },
            ],
          },
        };

      default:
        return null;
    }
  }

  const ComponentNodeRenderer = ({ data, emit }: NodeRendererProps) => {
    const node = data as unknown as ComponentNode;

    // Important: the Rete React renderer won't automatically re-render node contents when
    // component properties change (e.g. resistance). Subscribe directly so the icon/bands
    // stay in sync with the properties panel.
    const appState = useControllerState(controller);

    const resistorComponent: Resistor | null = (() => {
      if (node.componentType !== ComponentType.RESISTOR) return null;
      const c = appState.breadboard.components.find((x) => x.id === node.componentId);
      return c && c.type === ComponentType.RESISTOR ? (c as Resistor) : null;
    })();

    const fallbackSize = getDefaultComponentNodeSize({
      type: node.componentType,
      legs: node.legs,
    });

    // In normal operation, `createSyncNodes` enforces a stable width/height on the node.
    // However, during dev/HMR or in edge-cases (e.g. free-float nodes that skip a sizing pass),
    // nodes can remain at the ClassicPreset default 100×60 which makes tall components (LED)
    // appear to have a tiny outline/hotspot.
    const hasDefaultSize = node.width === 100 && node.height === 60;

    const width =
      typeof node.width === 'number' && !(hasDefaultSize && fallbackSize.width !== 100)
        ? node.width
        : fallbackSize.width;

    const height =
      typeof node.height === 'number' && !(hasDefaultSize && fallbackSize.height !== 60)
        ? node.height
        : fallbackSize.height;

    const socketOuterHalf = getSocketOuterHalf();

    const legPositions = getComponentLegPositionsInNode({
      type: node.componentType,
      legs: node.legs,
      width,
      height,
    });

    const outputsEntries = Object.entries(node.outputs);
    const socketEntries = outputsEntries
      .map(([key, output], idx) => {
        if (!output) return null;
        const pos = legPositions[idx] ?? { x: width - 10, y: height / 2 };
        return { key, output, pos, idx };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // Icon transform: align leg-tip anchors to socket points.
    const iconSpec = getIconSpec(node.componentType);
    let iconTransform: string | null = null;
    if (iconSpec) {
      if (iconSpec.anchors2 && socketEntries.length >= 2) {
        iconTransform = computeTwoPointMatrixFromViewBoxAnchors(
          socketEntries[0].pos,
          socketEntries[1].pos,
          iconSpec.layout,
          iconSpec.anchors2
        );
      } else if (iconSpec.anchorsN && socketEntries.length >= iconSpec.anchorsN.anchors.length) {
        const n = iconSpec.anchorsN.anchors.length;
        iconTransform = computeBestFitSimilarityMatrixFromViewBoxAnchors(
          socketEntries.slice(0, n).map((s) => s.pos),
          iconSpec.layout,
          iconSpec.anchorsN
        );
      }
    }

    // "Prefer drag" UX:
    // Rete sockets can have a larger-than-expected hit area (depending on styling), which can make
    // it annoyingly easy to start a connection when you intended to drag the component.
    // We provide a central drag hotspot that sits above sockets, but leaves the corners usable for
    // wiring. This keeps wiring easy while eliminating pixel-hunting to grab the node.
    const basePadX = Math.max(14, Math.round(width * 0.18));
    const basePadY = Math.max(10, Math.round(height * 0.18));

    const dragHotspotPadLeft = basePadX;
    const dragHotspotPadRight = basePadX;
    let dragHotspotPadTop = basePadY;
    let dragHotspotPadBottom = basePadY;

    // LED: people pick it up by the bulb, not the legs.
    // Move the hotspot upward so it sits on the bulb area, while leaving the lower area for
    // wiring/leg sockets.
    if (node.componentType === ComponentType.LED) {
      // Target: roughly the upper half of the node.
      // - Keep a small top inset so the hotspot covers the bulb highlight area.
      // - Keep a large bottom inset so sockets/legs remain easy to wire.
      dragHotspotPadTop = Math.max(8, Math.round(height * 0.06));
      dragHotspotPadBottom = Math.max(72, Math.round(height * 0.42));
    }

    // Switch: slightly taller hotspot feels nicer without blocking corner sockets.
    if (node.componentType === ComponentType.SWITCH) {
      const y = Math.max(8, Math.round(height * 0.14));
      dragHotspotPadTop = y;
      dragHotspotPadBottom = y;
    }

    return (
      <div
        data-testid="node"
        data-component-node="1"
        data-component-id={node.componentId}
        style={{
          position: 'relative',
          width,
          height,
          overflow: 'visible',
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {/* Always render; layer CSS hides it when debug overlays are off. */}
        <div
          data-testid="title"
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
            pointerEvents: 'none',
          }}
        >
          {data.label}
        </div>

        {/* Icon (behind sockets): this is what users expect to see when adding components. */}
        {iconSpec && iconTransform && (
          <div
            data-testid="component-icon"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width,
              height,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: iconSpec.layout.width,
                height: iconSpec.layout.height,
                transformOrigin: '0 0',
                transform: iconTransform,
              }}
            >
              {node.componentType === ComponentType.RESISTOR && resistorComponent ? (
                (() => {
                  // Mirror the breadboard renderer: prefer component-configured tolerance,
                  // otherwise fall back to library metadata and then 5%.
                  const tol = (() => {
                    const explicit = (resistorComponent as unknown as { tolerance?: unknown })
                      .tolerance;
                    if (typeof explicit === 'number' && isFinite(explicit) && explicit > 0) {
                      return explicit;
                    }

                    if (resistorComponent.libraryId) {
                      const entry = componentLibrary.get(resistorComponent.libraryId);
                      const t = (entry?.electrical as unknown as { tolerance?: unknown })
                        ?.tolerance;
                      if (typeof t === 'number' && isFinite(t) && t > 0) return t;
                    }

                    return 5;
                  })();

                  let bands: ReturnType<typeof resistanceToColorBands> = [];
                  try {
                    bands = resistanceToColorBands(resistorComponent.resistance, tol);
                  } catch {
                    bands = [];
                  }

                  // These match `src/images/resistor-placeholder.svg` body bounds in viewBox coords.
                  const BODY_LEFT_X = 37;
                  const BODY_RIGHT_X = 123;
                  const BODY_TOP_Y = 16.5;
                  const BODY_BOTTOM_Y = 47.5;

                  const bandRects = computeResistorBandRects({
                    bands,
                    bodyLeftX: BODY_LEFT_X,
                    bodyRightX: BODY_RIGHT_X,
                    bodyTopY: BODY_TOP_Y,
                    bodyBottomY: BODY_BOTTOM_Y,
                    bodyLengthMm: 6.3,
                    jitter: true,
                    seed:
                      (Math.floor(resistorComponent.resistance * 1000) ^
                        (Math.floor(tol * 100) << 1)) >>>
                      0,
                  });

                  const safeId = String(node.componentId).replace(/[^a-zA-Z0-9_-]/g, '_');
                  const glossId = `rete-resistor-band-gloss-${safeId}`;
                  const blurId = `rete-resistor-band-soft-${safeId}`;

                  return (
                    <svg
                      width={iconSpec.layout.width}
                      height={iconSpec.layout.height}
                      viewBox={`${iconSpec.layout.viewBox.minX} ${iconSpec.layout.viewBox.minY} ${iconSpec.layout.viewBox.width} ${iconSpec.layout.viewBox.height}`}
                      preserveAspectRatio={iconSpec.layout.preserveAspectRatio}
                      style={{ display: 'block' }}
                    >
                      <defs>
                        <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#ffffff" stopOpacity="0.40" />
                          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.10" />
                          <stop offset="1" stopColor="#000000" stopOpacity="0.00" />
                        </linearGradient>

                        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" />
                        </filter>
                      </defs>

                      <image
                        href={iconSpec.url}
                        x={0}
                        y={0}
                        width={iconSpec.layout.width}
                        height={iconSpec.layout.height}
                        preserveAspectRatio={iconSpec.layout.preserveAspectRatio}
                      />

                      {bandRects.map((b, index) => {
                        const fill = COLOR_TO_RGB[b.band.color];
                        return (
                          <g key={index}>
                            <rect
                              x={b.x}
                              y={b.y}
                              width={b.width}
                              height={b.height}
                              rx={1.2}
                              fill={fill}
                              opacity={0.28}
                              filter={`url(#${blurId})`}
                            />
                            <rect
                              x={b.x}
                              y={b.y}
                              width={b.width}
                              height={b.height}
                              rx={1.2}
                              fill={fill}
                              opacity={0.96}
                            />
                            <rect
                              x={b.x}
                              y={b.y}
                              width={b.width}
                              height={b.height}
                              rx={1.2}
                              fill={`url(#${glossId})`}
                              opacity={0.55}
                            />
                            <rect
                              x={b.x + 0.2}
                              y={b.y + 0.2}
                              width={Math.max(0, b.width - 0.4)}
                              height={Math.max(0, b.height - 0.4)}
                              rx={1.1}
                              fill="none"
                              stroke="#000"
                              strokeOpacity={0.18}
                              strokeWidth={0.6}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()
              ) : (
                <img
                  src={iconSpec.url}
                  width={iconSpec.layout.width}
                  height={iconSpec.layout.height}
                  draggable={false}
                  style={{ display: 'block' }}
                  alt=""
                />
              )}
            </div>
          </div>
        )}

        {/* Sockets */}
        <div style={{ position: 'absolute', left: 0, top: 0, width, height }}>
          {socketEntries.map(({ key, output, pos }) => {

            // IMPORTANT: DOMSocketPosition relies on offsetLeft/offsetTop.
            // Avoid centering via CSS transforms; center by explicit subtraction.
            const left = pos.x - socketOuterHalf;
            const top = pos.y - socketOuterHalf;

            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  pointerEvents: 'auto',
                  lineHeight: 0,
                  fontSize: 0,
                  zIndex: 2,
                }}
              >
                <ReactPresets.classic.RefSocket
                  name="output-socket"
                  side="output"
                  socketKey={key}
                  nodeId={node.id}
                  emit={emit}
                  payload={output.socket}
                  data-testid="output-socket"
                />
              </div>
            );
          })}
        </div>

        {/* Drag hotspot (center area) */}
        <div
          data-testid="drag-hotspot"
          data-component-id={node.componentId}
          style={{
            position: 'absolute',
            left: dragHotspotPadLeft,
            top: dragHotspotPadTop,
            right: dragHotspotPadRight,
            bottom: dragHotspotPadBottom,
            zIndex: 3,
            pointerEvents: 'auto',
            // Driven by a CSS variable on the Rete layer so toggling debug overlays
            // does not require a React re-render for component nodes.
            background: 'var(--debug-drag-hotspot-bg, transparent)',
            border: 'var(--debug-drag-hotspot-border, none)',
            cursor: 'grab',
            borderRadius: 8,
          }}
        />
      </div>
    );
  };

  return ComponentNodeRenderer;
}
