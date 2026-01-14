import React from 'react';
import type { ClassicPreset } from 'rete';
import type { ClassicScheme, RenderEmit } from 'rete-react-plugin';
import { Presets as ReactPresets } from 'rete-react-plugin';

import type { ComponentNode } from '@/ui-react/rete/nodes/ComponentNode';
import {
  getComponentLegPositionsInNode,
  getDefaultComponentNodeSize,
} from '@/ui-react/rete/layout/componentNodeLayout';

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

export function createComponentNodeRenderer(options: {
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>;
}) {
  const { debugUiRef } = options;

  const ComponentNodeRenderer = ({ data, emit }: NodeRendererProps) => {
    const node = data as unknown as ComponentNode;

    const fallbackSize = getDefaultComponentNodeSize({
      type: node.componentType,
      legs: node.legs,
    });

    const width = typeof node.width === 'number' ? node.width : fallbackSize.width;
    const height = typeof node.height === 'number' ? node.height : fallbackSize.height;

    const socketOuterHalf = getSocketOuterHalf();

    const legPositions = getComponentLegPositionsInNode({
      type: node.componentType,
      legs: node.legs,
      width,
      height,
    });

    // "Prefer drag" UX:
    // Rete sockets can have a larger-than-expected hit area (depending on styling), which can make
    // it annoyingly easy to start a connection when you intended to drag the component.
    // We provide a central drag hotspot that sits above sockets, but leaves the corners usable for
    // wiring. This keeps wiring easy while eliminating pixel-hunting to grab the node.
    const dragHotspotPaddingX = Math.max(14, Math.round(width * 0.18));
    const dragHotspotPaddingY = Math.max(10, Math.round(height * 0.18));

    return (
      <div
        data-testid="node"
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
        {debugUiRef.current.showDebugOverlays && (
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
        )}

        {/* Sockets */}
        <div style={{ position: 'absolute', left: 0, top: 0, width, height }}>
          {Object.entries(node.outputs).map(([key, output], idx) => {
            if (!output) return null;
            const pos = legPositions[idx] ?? { x: width - 10, y: height / 2 };

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
          style={{
            position: 'absolute',
            left: dragHotspotPaddingX,
            top: dragHotspotPaddingY,
            right: dragHotspotPaddingX,
            bottom: dragHotspotPaddingY,
            zIndex: 3,
            pointerEvents: 'auto',
            background: debugUiRef.current.showDebugOverlays
              ? 'rgba(255, 0, 0, 0.25)'
              : 'transparent',
            cursor: 'grab',
            borderRadius: 8,
          }}
        />
      </div>
    );
  };

  return ComponentNodeRenderer;
}
