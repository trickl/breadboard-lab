import type React from 'react';
import { getUID, type NodeEditor } from 'rete';
import { ClassicFlow, type SocketData } from 'rete-connection-plugin';
import type { ClassicScheme } from 'rete-react-plugin';

import { ALLOW_MULTI_CONNECTIONS_PER_PORT } from '@/ui-react/rete/graph/envFlags';
import {
  removeConflictingConnections,
  resolveSourceTarget,
} from '@/ui-react/rete/graph/connectionRules';
import type { NodeWithPorts } from '@/ui-react/rete/graph/nodePorts';

type Schemes = ClassicScheme;

export function createConnectionFlowPreset(options: {
  editor: NodeEditor<Schemes>;
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>;
  layerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const { editor, debugUiRef, layerRef } = options;

  // Configure connection renderer with classic preset
  // Custom connection flow:
  // - Rails are rendered as *output* sockets (so the user can start a wire from a rail hole).
  // - When the user drops onto a rail output socket, we map it to the corresponding rail *input*
  //   so that the editor still creates a classic output→input connection.
  // - We also enforce “one wire per hole” by removing conflicting connections on the actual
  //   source/target ports involved.
  return () => {
    return new ClassicFlow({
      canMakeConnection: (initial: SocketData, socket: SocketData) => {
        const logEnabled =
          Boolean(debugUiRef.current.showDebugOverlays) ||
          String(import.meta.env.VITE_CONNECTION_LOGS ?? '').toLowerCase() === 'true' ||
          String(import.meta.env.VITE_CONNECTION_LOGS ?? '') === '1';

        const resolved = resolveSourceTarget(initial, socket, editor);
        if (logEnabled) {
          console.log('[ReteGraphLayer] canMakeConnection', {
            initial: { nodeId: initial.nodeId, side: initial.side, key: initial.key },
            socket: { nodeId: socket.nodeId, side: socket.side, key: socket.key },
            resolved: resolved
              ? {
                  source: {
                    nodeId: resolved.source.nodeId,
                    side: resolved.source.side,
                    key: resolved.source.key,
                  },
                  target: {
                    nodeId: resolved.target.nodeId,
                    side: resolved.target.side,
                    key: resolved.target.key,
                  },
                }
              : null,
          });
        }

        return Boolean(resolved);
      },
      makeConnection: (
        initial: SocketData,
        socket: SocketData,
        context: { editor: NodeEditor<Schemes> }
      ) => {
        const logEnabled =
          Boolean(debugUiRef.current.showDebugOverlays) ||
          String(import.meta.env.VITE_CONNECTION_LOGS ?? '').toLowerCase() === 'true' ||
          String(import.meta.env.VITE_CONNECTION_LOGS ?? '') === '1';
        if (logEnabled) {
          console.log('[ReteGraphLayer] makeConnection attempt', {
            initial: { nodeId: initial.nodeId, side: initial.side, key: initial.key },
            socket: { nodeId: socket.nodeId, side: socket.side, key: socket.key },
          });
        }

        const resolved = resolveSourceTarget(initial, socket, context.editor);
        if (!resolved) {
          if (logEnabled) {
            console.log('[ReteGraphLayer] makeConnection rejected: resolveSourceTarget returned null');
          }
          return false;
        }

        const { source, target } = resolved;

        if (logEnabled) {
          console.log('[ReteGraphLayer] makeConnection resolved', {
            source: { nodeId: source.nodeId, side: source.side, key: source.key },
            target: { nodeId: target.nodeId, side: target.side, key: target.key },
          });
        }

        // Ensure the corresponding ports exist.
        const sourceNode = context.editor.getNode(source.nodeId) as unknown as NodeWithPorts | undefined;
        const targetNode = context.editor.getNode(target.nodeId) as unknown as NodeWithPorts | undefined;
        if (!sourceNode?.outputs?.[source.key]) {
          if (logEnabled) {
            console.log('[ReteGraphLayer] makeConnection rejected: missing source output', {
              sourceNodeId: source.nodeId,
              sourceKey: source.key,
              outputKeys: Object.keys(sourceNode?.outputs ?? {}),
            });
          }
          return false;
        }
        if (!targetNode?.inputs?.[target.key]) {
          if (logEnabled) {
            console.log('[ReteGraphLayer] makeConnection rejected: missing target input', {
              targetNodeId: target.nodeId,
              targetKey: target.key,
              inputKeys: Object.keys(targetNode?.inputs ?? {}),
            });
          }
          return false;
        }

        // Enforce per-hole single-connection constraints on the *actual* ports used.
        removeConflictingConnections(source, context.editor);
        removeConflictingConnections(target, context.editor);

        const connectionId = getUID();
        const addPromise = context.editor.addConnection({
          id: connectionId,
          source: source.nodeId,
          sourceOutput: source.key,
          target: target.nodeId,
          targetInput: target.key,
        });

        if (logEnabled) {
          console.log('[ReteGraphLayer] makeConnection addConnection called', { connectionId });

          void addPromise
            .then((ok) => {
              console.log('[ReteGraphLayer] addConnection result', { connectionId, ok });
            })
            .catch((err) => {
              console.log('[ReteGraphLayer] addConnection error', { connectionId, err });
            });

          // Sample state on next tick to detect any immediate removal and/or rendering issues.
          setTimeout(() => {
            const conns = context.editor.getConnections().map((c) => ({
              id: c.id,
              source: c.source,
              sourceOutput: c.sourceOutput,
              target: c.target,
              targetInput: c.targetInput,
            }));
            const renderedCount = layerRef.current
              ? layerRef.current.querySelectorAll('[data-testid="connection"]').length
              : null;

            // Try to locate the rendered DOM element for this connection and report its bounds.
            const connectionEl = layerRef.current
              ? (layerRef.current.querySelector(
                  `[data-testid="connection"][data-connection-id="${connectionId}"]`
                ) as SVGSVGElement | null)
              : null;

            let domRect: { x: number; y: number; width: number; height: number } | null = null;
            let pathBox: { x: number; y: number; width: number; height: number } | null = null;
            let computed: { display: string; opacity: string; visibility: string } | null = null;

            try {
              if (connectionEl) {
                const r = connectionEl.getBoundingClientRect();
                domRect = { x: r.x, y: r.y, width: r.width, height: r.height };
                const s = window.getComputedStyle(connectionEl);
                computed = { display: s.display, opacity: s.opacity, visibility: s.visibility };

                const paths = connectionEl.querySelectorAll('path');
                const visiblePath = paths.length >= 2 ? (paths[1] as SVGPathElement) : null;
                if (visiblePath) {
                  const b = visiblePath.getBBox();
                  pathBox = { x: b.x, y: b.y, width: b.width, height: b.height };
                }
              }
            } catch {
              // ignore (e.g. SVG not fully measurable yet)
            }

            console.log('[ReteGraphLayer] connections after create (next tick)', {
              model: conns,
              renderedCount,
              domRect,
              pathBox,
              computed,
              env: {
                allowMultiConnectionsPerPort: ALLOW_MULTI_CONNECTIONS_PER_PORT,
                connectionLogs:
                  String(import.meta.env.VITE_CONNECTION_LOGS ?? '').toLowerCase() === 'true' ||
                  String(import.meta.env.VITE_CONNECTION_LOGS ?? '') === '1',
              },
            });
          }, 0);
        }
        return true;
      },
    });
  };
}
