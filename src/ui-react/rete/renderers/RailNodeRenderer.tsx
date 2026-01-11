import React from 'react';
import type { ClassicPreset } from 'rete';
import type { ClassicScheme, RenderEmit } from 'rete-react-plugin';
import { Presets as ReactPresets } from 'rete-react-plugin';

import type { BoardRotation } from '@/ui-react/world/breadboard-world';
import { positionToWorld } from '@/ui-react/world/breadboard-world';
import type { RailNode } from '@/ui-react/rete/ReteGraphLayer';

type Schemes = ClassicScheme;

type NodeRendererProps = {
  data: ClassicPreset.Node;
  emit: RenderEmit<Schemes>;
};

export function createRailNodeRenderer(options: {
  rotationRef: React.MutableRefObject<BoardRotation>;
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>;
  layerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const { rotationRef, debugUiRef, layerRef } = options;

  const RailNodeRenderer = ({ data, emit }: NodeRendererProps) => {
    const rail = data as unknown as RailNode;
    const rot = rotationRef.current;
    const socketOuterSize =
      ReactPresets.classic.vars.$socketsize + 2 * ReactPresets.classic.vars.$socketmargin;
    const socketOuterHalf = socketOuterSize / 2;

    // Label placement: use the first visible hole as anchor.
    const anchor = rail.holePositions[0] ? positionToWorld(rail.holePositions[0], rot) : { x: 0, y: 0 };

    // Compute an educational "net line" along the rail when hovered.
    const firstPos = rail.holePositions[0] ? positionToWorld(rail.holePositions[0], rot) : null;
    const lastPos = rail.holePositions[rail.holePositions.length - 1]
      ? positionToWorld(rail.holePositions[rail.holePositions.length - 1], rot)
      : null;

    // Hover feedback uses DOM attributes rather than React state.
    // Rationale: Rete may remount custom node renderers, which would reset React state
    // and cause a "flash". DOM markers are stable across those remounts.
    const setRailHover = (opts: { railId: string; primaryEl: HTMLElement | null; enabled: boolean }) => {
      const root = layerRef.current;
      if (!root) return;

      // Clear previous hover markers.
      for (const el of root.querySelectorAll('[data-rail-hovered="1"]')) {
        (el as HTMLElement).removeAttribute('data-rail-hovered');
      }
      for (const el of root.querySelectorAll('[data-rail-hovered-primary="1"]')) {
        (el as HTMLElement).removeAttribute('data-rail-hovered-primary');
      }
      for (const el of root.querySelectorAll('[data-rail-net-line="1"]')) {
        (el as HTMLElement).style.opacity = '0';
      }

      if (!opts.enabled) return;

      for (const el of root.querySelectorAll(
        `[data-rail-hole="1"][data-rail-id="${opts.railId}"]`
      )) {
        (el as HTMLElement).setAttribute('data-rail-hovered', '1');
      }

      if (opts.primaryEl) {
        opts.primaryEl.setAttribute('data-rail-hovered-primary', '1');
      }

      const line = root.querySelector(
        `[data-rail-net-line="1"][data-rail-id="${opts.railId}"]`
      ) as HTMLElement | null;
      if (line) line.style.opacity = '1';
    };

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
        {/*
          Hover "net" line (always present; shown by DOM marker when debug overlays are off).
          This helps teach that all rail holes are connected.
        */}
        {firstPos && lastPos ? (
          <svg
            aria-hidden="true"
            data-rail-net-line="1"
            data-rail-id={rail.railId}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 9999,
              height: 9999,
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 50,
              opacity: 0,
              transition: 'opacity 80ms ease-out',
            }}
          >
            <line
              x1={firstPos.x}
              y1={firstPos.y}
              x2={lastPos.x}
              y2={lastPos.y}
              stroke={'rgba(148, 163, 184, 0.28)'}
              strokeWidth={6}
              strokeLinecap="round"
            />
          </svg>
        ) : null}

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
          const preferredInputKey = `in-h${idx}`;
          const inputKey = rail.inputs[preferredInputKey] ? preferredInputKey : key;
          const input = rail.inputs[inputKey];
          if (!input) return null;

          // We render BOTH:
          // - a hidden input socket (so connections can terminate visually on the correct endpoint)
          // - a visible output socket (so the user can start wires from rails and drop onto rails)
          // The connection flow maps “drop on rail output” → “connect to rail input”.
          return (
            <div
              key={key}
              data-rail-hole="1"
              data-rail-id={rail.railId}
              data-rail-label={rail.railLabel}
              data-hole-index={idx}
              data-hole-row={pos.row}
              data-hole-col={pos.col}
              onPointerEnter={() => {
                if (debugUiRef.current.showDebugOverlays) return;
                setRailHover({ railId: rail.railId, primaryEl: null, enabled: true });
              }}
              onPointerOver={(e) => {
                if (debugUiRef.current.showDebugOverlays) return;
                setRailHover({
                  railId: rail.railId,
                  primaryEl: e.currentTarget as unknown as HTMLElement,
                  enabled: true,
                });
              }}
              onPointerLeave={(e) => {
                if (debugUiRef.current.showDebugOverlays) return;
                const next = e.relatedTarget as HTMLElement | null;
                const nextRail = next?.closest?.('[data-rail-hole="1"][data-rail-id]') as
                  | HTMLElement
                  | null;
                // If moving between holes on the same rail, keep the highlight.
                if (nextRail && nextRail.getAttribute('data-rail-id') === rail.railId) return;
                setRailHover({ railId: rail.railId, primaryEl: null, enabled: false });
              }}
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
                  socketKey={inputKey}
                  nodeId={rail.id}
                  emit={emit}
                  payload={input.socket}
                  data-testid="input-socket"
                />
              </div>

              {/* Visible/interactive rail socket */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  pointerEvents: 'auto',
                  zIndex: 2,
                }}
              >
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
