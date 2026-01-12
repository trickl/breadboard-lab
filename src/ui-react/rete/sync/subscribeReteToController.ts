import type { MutableRefObject } from 'react';
import type { NodeEditor } from 'rete';
import type { AreaPlugin } from 'rete-area-plugin';

import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';

export type SubscribeReteToControllerOptions = {
  controller: BreadboardController;
  syncNodes: (state: AppState) => void | Promise<void>;

  editorRef: MutableRefObject<NodeEditor<Schemes> | null>;
  areaRef: MutableRefObject<AreaPlugin<Schemes, AreaExtra> | null>;

  layerRef: MutableRefObject<HTMLDivElement | null>;
  breadboardNodeIdRef: MutableRefObject<string | null>;
  railNodeMapRef: MutableRefObject<Map<string, string>>;

  connectionUiRef: MutableRefObject<{
    selectedConnectionId: string | null;
    appearanceById: Record<string, unknown>;
    lastProcessedReteCommandNonce: number;
  }>;

  debugUiRef: MutableRefObject<{ showDebugOverlays: boolean }>;
};

export function subscribeReteToController({
  controller,
  syncNodes,
  editorRef,
  areaRef,
  layerRef,
  breadboardNodeIdRef,
  railNodeMapRef,
  connectionUiRef,
  debugUiRef,
}: SubscribeReteToControllerOptions) {
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
      layerRef.current.style.setProperty(
        '--debug-socket-opacity',
        nextShowDebugOverlays ? '0.25' : '0'
      );
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
    layerRef.current.setAttribute('data-debug-overlays', debugUiRef.current.showDebugOverlays ? 'on' : 'off');
    layerRef.current.style.setProperty(
      '--debug-socket-opacity',
      debugUiRef.current.showDebugOverlays ? '0.25' : '0'
    );
  }

  return unsubscribe;
}
