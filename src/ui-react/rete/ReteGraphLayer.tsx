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
import type { NodeEditor } from 'rete';
import type { AreaPlugin } from 'rete-area-plugin';
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
  removeConflictingConnections,
  resolveSourceTarget,
} from '@/ui-react/rete/graph/connectionRules';
import { RailNode } from '@/ui-react/rete/nodes/RailNode';
import { createSyncNodes } from '@/ui-react/rete/sync/createSyncNodes';
import { subscribeReteToController } from '@/ui-react/rete/sync/subscribeReteToController';
import { initializeReteEditor } from '@/ui-react/rete/init/initializeReteEditor';
import { syncReteToRotation } from '@/ui-react/rete/sync/syncReteToRotation';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';

// Back-compat: these helpers were historically exported from this module.
export { removeConflictingConnections, resolveSourceTarget };
// Back-compat: RailNode is part of the public API (tests import it from this module).
export { RailNode };

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
      return 2;
    case ComponentType.GROUND:
      return 1;
    case ComponentType.MICROPROCESSOR:
      return 16;
    case ComponentType.SWITCH:
      return 4;
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
    syncReteToRotation({
      rotationRef,
      containerRef,
      editorRef,
      areaRef,
      breadboardNodeIdRef,
    });
  }, [rotation]);

  // Initialize Rete editor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    return initializeReteEditor({
      container,
      controller,
      editorRef,
      areaRef,
      rotationRef,
      debugUiRef,
      layerRef,
      connectionUiRef,
    });
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
          // Rete classic preset uses styled-components for node layout; ensure we have a stable
          // positioning context for absolutely-positioned labels.
          position: 'relative',
          overflow: 'visible',
          // Default (debug overlays OFF): no component outline box.
          background: 'transparent !important',
          border: 'none !important',
          boxShadow: 'none !important',
        },
        // Debug overlays ON: show the component outline box.
        '&[data-debug-overlays="on"] [data-testid="node"]': {
          background: 'rgba(78, 88, 191, 0.08) !important',
          border: '1px solid rgba(78, 88, 191, 0.25) !important',
          boxShadow: 'none !important',
        },
        // Component node labels (classic preset title). Match the breadboard/rail debug label style.
        // Note: breadboard/rail nodes are custom renderers and are not affected by this selector.
        // IMPORTANT: rete-react-plugin ships `.title { font-size: 18px; padding: 8px; }`.
        // Use a more specific selector than `.title` so we win even if its CSS is injected later.
        '&[data-debug-overlays] [data-testid="node"] .title, &[data-debug-overlays] [data-testid="node"] [data-testid="title"]': {
          position: 'absolute',
          left: '8px',
          top: '8px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'rgba(0,0,0,0.55)',
          color: 'white',
          fontSize: '12px',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          lineHeight: '16px',
          pointerEvents: 'none',
          margin: 0,
          width: 'auto',
          whiteSpace: 'nowrap',
        },
        // Debug overlays toggle should also hide *all* component labels.
        '&[data-debug-overlays="off"] [data-testid="title"]': {
          display: 'none',
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
