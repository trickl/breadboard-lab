import React from 'react';
import { Presets as ReactPresets } from 'rete-react-plugin';

import type { ConnectionAppearance } from '@/ui-controller/types';
import { mixWithBlack, mixWithWhite } from '@/ui-react/rete/graph/color';
import { parsePathEndpoints } from '@/ui-react/rete/graph/pathGeometry';

type ConnectionSelectedAction = {
  type: 'CONNECTION_SELECTED';
  connectionId: string | null;
  connectionKind?: 'jumper' | 'component-leg' | null;
};

const BARE_WIRE_COLOR = '#6b7280'; // Tailwind gray-500-ish (neutral metal)

export function createSelectableConnectionRenderer(options: {
  controller: { dispatch: (action: ConnectionSelectedAction) => void };
  editorRef: React.MutableRefObject<{
    getConnections: () => Array<{
      id: string;
      source?: string;
      sourceOutput?: string;
      target?: string;
      targetInput?: string;
    }>;
  } | null>;
  connectionUiRef: React.MutableRefObject<{
    selectedConnectionId: string | null;
    appearanceById: Record<string, ConnectionAppearance>;
  }>;
  getDefaultConnectionAppearance: () => ConnectionAppearance;
  debugRenderConnections: boolean;
}) {
  const {
    controller,
    editorRef,
    connectionUiRef,
    getDefaultConnectionAppearance,
    debugRenderConnections,
  } = options;

  const SelectableConnection = ({ data }: { data: { id: string } }) => {
    const ctx = ReactPresets.classic.useConnection();
    const path = ctx.path;
    if (!path) return null;

    const id = String(data.id);

    const modelConn = editorRef.current?.getConnections().find((c) => String(c.id) === id) ?? null;
    const isInModel = Boolean(modelConn);

    const appearance = connectionUiRef.current.appearanceById[id] ?? getDefaultConnectionAppearance();
    const isSelected = connectionUiRef.current.selectedConnectionId === id;

    // Connections that touch a component leg are conceptually an extension of the bare metal lead,
    // so we always render them as bare wire.
    const srcKey = String(modelConn?.sourceOutput ?? '');
    const tgtKey = String(modelConn?.targetInput ?? '');
    const isLegWire = /^leg\d+$/.test(srcKey) || /^leg\d+$/.test(tgtKey);
    const connectionKind: 'jumper' | 'component-leg' = isLegWire ? 'component-leg' : 'jumper';

    const insulation = (appearance as unknown as { insulation?: unknown }).insulation;
    const normalizedInsulation = insulation === 'bare' || insulation === 'shielded' ? insulation : 'shielded';
    const effectiveInsulation: 'bare' | 'shielded' = isLegWire ? 'bare' : normalizedInsulation;

    const endpoints = debugRenderConnections ? parsePathEndpoints(path) : null;

    const stroke = debugRenderConnections
      ? '#ff00ff'
      : effectiveInsulation === 'bare'
        ? BARE_WIRE_COLOR
        : appearance.color || '#3b82f6';

    const strokeWidth = debugRenderConnections
      ? 14
      : effectiveInsulation === 'bare'
        ? isSelected
          ? 5
          : 3.2
        : isSelected
          ? 8
          : 5;

    const hitWidth = debugRenderConnections
      ? 18
      : effectiveInsulation === 'bare'
        ? isSelected
          ? 12
          : 9
        : isSelected
          ? 14
          : 10;

    const jacket = debugRenderConnections ? stroke : mixWithBlack(stroke, 0.1);
    const highlight = debugRenderConnections ? stroke : mixWithWhite(stroke, 0.35);
    const highlight2 = debugRenderConnections ? stroke : mixWithWhite(stroke, 0.55);
    const highlightWidth = Math.max(1.8, strokeWidth * 0.45);
    const highlight2Width = Math.max(1.2, strokeWidth * 0.22);

    const shadow = isSelected
      ? 'drop-shadow(0px 1px 2px rgba(0,0,0,0.35)) drop-shadow(0px 0px 2px rgba(255,255,255,0.55))'
      : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.28))';

    const debugShadow = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.65))';

    const onPointerDown = (e: React.PointerEvent<SVGPathElement>) => {
      if (e.shiftKey && e.button === 0) {
        controller.dispatch({ type: 'CONNECTION_SELECTED', connectionId: id, connectionKind });
        return;
      }
      if (e.button !== 0) return;
      e.stopPropagation();
      controller.dispatch({
        type: 'CONNECTION_SELECTED',
        connectionId: isSelected ? null : id,
        connectionKind: isSelected ? null : connectionKind,
      });
    };

    return (
      <svg
        data-testid="connection"
        data-connection-id={id}
        style={{
          overflow: 'visible',
          position: 'absolute',
          zIndex: debugRenderConnections ? 9999 : undefined,
          pointerEvents: 'none',
          width: 9999,
          height: 9999,
        }}
      >
        <path
          d={path}
          onPointerDown={onPointerDown}
          style={{
            fill: 'none',
            stroke: 'transparent',
            strokeWidth: hitWidth,
            pointerEvents: isInModel ? 'auto' : 'none',
            cursor: isInModel ? 'pointer' : 'default',
          }}
        />

        <path
          d={path}
          style={{
            fill: 'none',
            stroke: jacket,
            strokeWidth,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            pointerEvents: 'none',
            opacity: isSelected ? 1 : 0.95,
            filter: debugRenderConnections ? debugShadow : shadow,
          }}
        />

        {!debugRenderConnections ? (
          <>
            <path
              d={path}
              style={{
                fill: 'none',
                stroke: highlight,
                strokeWidth: highlightWidth,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                pointerEvents: 'none',
                opacity: 0.55,
              }}
            />
            <path
              d={path}
              style={{
                fill: 'none',
                stroke: highlight2,
                strokeWidth: highlight2Width,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                pointerEvents: 'none',
                opacity: 0.22,
              }}
            />
          </>
        ) : null}

        {debugRenderConnections && endpoints ? (
          <>
            <circle cx={endpoints.start.x} cy={endpoints.start.y} r={8} fill="#00ff00" />
            <circle cx={endpoints.end.x} cy={endpoints.end.y} r={8} fill="#ff0000" />
          </>
        ) : null}
      </svg>
    );
  };

  return SelectableConnection;
}
