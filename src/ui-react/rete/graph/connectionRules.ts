import type { NodeEditor } from 'rete';
import type { ClassicScheme } from 'rete-react-plugin';
import type { SocketData } from 'rete-connection-plugin';
import { ALLOW_MULTI_CONNECTIONS_PER_PORT } from '@/ui-react/rete/graph/envFlags';
import { isRailNode } from '@/ui-react/rete/graph/payloadGuards';
import type { NodeWithPorts } from '@/ui-react/rete/graph/nodePorts';

type Schemes = ClassicScheme;

function findConnectionsForSocket(socket: SocketData, editor: NodeEditor<Schemes>) {
  const { nodeId, side, key } = socket;
  return editor.getConnections().filter((connection) => {
    if (side === 'input') {
      return connection.target === nodeId && connection.targetInput === key;
    }
    return connection.source === nodeId && connection.sourceOutput === key;
  });
}

export function portAllowsMultiple(socket: SocketData, editor: NodeEditor<Schemes>): boolean {
  if (ALLOW_MULTI_CONNECTIONS_PER_PORT) return true;

  const node = editor.getNode(socket.nodeId) as unknown as NodeWithPorts | undefined;
  if (!node) return true;

  const port = socket.side === 'input' ? node.inputs?.[socket.key] : node.outputs?.[socket.key];
  // ClassicPreset defaults:
  // - Input: single connection (multipleConnections defaults to false)
  // - Output: multiple connections (multipleConnections defaults to true)
  const mc = port?.multipleConnections as boolean | undefined;
  if (typeof mc === 'boolean') return mc;
  return socket.side === 'output';
}

export function removeConflictingConnections(socket: SocketData, editor: NodeEditor<Schemes>) {
  if (ALLOW_MULTI_CONNECTIONS_PER_PORT) return;
  if (portAllowsMultiple(socket, editor)) return;

  const existing = findConnectionsForSocket(socket, editor);
  for (const c of existing) {
    void editor.removeConnection(c.id);
  }
}

export function resolveSourceTarget(
  initial: SocketData,
  socket: SocketData,
  editor: NodeEditor<Schemes>
): { source: SocketData; target: SocketData } | null {
  // Disallow self-connection to the same exact port.
  if (
    initial.nodeId === socket.nodeId &&
    initial.side === socket.side &&
    initial.key === socket.key
  ) {
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

    // If the chosen target is a rail output, map it to the paired rail input key.
    if (isRailNode(editor, rawTarget.nodeId)) {
      const match = /^h(\d+)$/.exec(rawTarget.key);
      if (!match) return null;

      // Back-compat: older sessions (or hot-reload) may have rails whose inputs are still keyed as `hN`.
      // Prefer the new `in-hN` key when present; otherwise fall back to `hN`.
      const railNode = editor.getNode(rawTarget.nodeId) as unknown as NodeWithPorts | undefined;
      const preferredKey = `in-h${match[1]}`;
      const legacyKey = `h${match[1]}`;
      const resolvedKey = railNode?.inputs?.[preferredKey] ? preferredKey : legacyKey;

      const target: SocketData = {
        ...rawTarget,
        side: 'input',
        key: resolvedKey,
      };
      return { source, target };
    }
    return null;
  }

  return null;
}
