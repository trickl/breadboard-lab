import React from 'react';
import type { ClassicPreset } from 'rete';
import type { ClassicScheme, RenderEmit } from 'rete-react-plugin';

import { getBreadboardWorld, type BoardRotation } from '@/ui-react/world/breadboard-world';
import { BreadboardSvg } from '@/ui-react/BreadboardSvg';
import { LABEL_PADDING_X, LABEL_PADDING_Y } from '@/ui-react/geometry/breadboard-layout';

type Schemes = ClassicScheme;

type NodeRendererProps = {
  data: ClassicPreset.Node;
  emit: RenderEmit<Schemes>;
};

export function createBreadboardNodeRenderer(options: {
  rotationRef: React.MutableRefObject<BoardRotation>;
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>;
}) {
  const { rotationRef, debugUiRef } = options;

  const BreadboardNodeRenderer = ({ data }: NodeRendererProps) => {
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
            <BreadboardSvg showLabels={debugUiRef.current.showDebugOverlays} />
          </div>
        </div>
      </div>
    );
  };

  return BreadboardNodeRenderer;
}
