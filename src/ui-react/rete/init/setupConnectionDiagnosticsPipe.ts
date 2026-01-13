import type React from 'react';
import type { NodeEditor } from 'rete';

import type { Schemes } from '@/ui-react/rete/reteTypes';

export function setupConnectionDiagnosticsPipe(
  editor: NodeEditor<Schemes>,
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>
) {
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
}
