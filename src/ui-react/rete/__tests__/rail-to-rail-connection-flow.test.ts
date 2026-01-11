import { describe, expect, it } from 'vitest';
import { NodeEditor } from 'rete';
import type { SocketData } from 'rete-connection-plugin';

import { RailNode, resolveSourceTarget, removeConflictingConnections } from '../ReteGraphLayer';

function makeSocketData(
  params: Omit<SocketData, 'type' | 'element'> & { element?: HTMLElement }
): SocketData {
  return {
    type: 'socket',
    element: params.element ?? document.createElement('div'),
    nodeId: params.nodeId,
    side: params.side,
    key: params.key,
  };
}

describe('rail-to-rail connection flow', () => {
  it('resolves same-index rail output→rail output to output→input (hN→in-hN) and can add the connection', async () => {
    const editor = new NodeEditor<any>();

    const holePositions = Array.from({ length: 25 }, (_, i) => ({ row: i, col: 0 }));

    const railR = new RailNode('rail-right-positive', 'Rail R +', holePositions);
    const railL = new RailNode('rail-left-positive', 'Rail L +', holePositions);

    await editor.addNode(railR);
    await editor.addNode(railL);

    const idx = 7;
    const initial = makeSocketData({ nodeId: railR.id, side: 'output', key: `h${idx}` });
    const socket = makeSocketData({ nodeId: railL.id, side: 'output', key: `h${idx}` });

    const resolved = resolveSourceTarget(initial, socket, editor as any);
    expect(resolved).not.toBeNull();
    expect(resolved!.source.nodeId).toBe(railR.id);
    expect(resolved!.source.side).toBe('output');
    expect(resolved!.source.key).toBe(`h${idx}`);
    expect(resolved!.target.nodeId).toBe(railL.id);
    expect(resolved!.target.side).toBe('input');
    expect(resolved!.target.key).toBe(`in-h${idx}`);

    // Mirror the runtime makeConnection logic (single-wire-per-hole enforcement + addConnection).
    removeConflictingConnections(resolved!.source, editor as any);
    removeConflictingConnections(resolved!.target, editor as any);

    const ok = await editor.addConnection({
      id: 'test-conn-1',
      source: resolved!.source.nodeId,
      sourceOutput: resolved!.source.key,
      target: resolved!.target.nodeId,
      targetInput: resolved!.target.key,
    } as any);

    expect(ok).toBe(true);

    const conns = editor.getConnections();
    expect(conns).toHaveLength(1);
    expect((conns[0] as any).source).toBe(railR.id);
    expect((conns[0] as any).sourceOutput).toBe(`h${idx}`);
    expect((conns[0] as any).target).toBe(railL.id);
    expect((conns[0] as any).targetInput).toBe(`in-h${idx}`);
  });

  it('allows same-index rail output→component input only via classic semantics (sanity)', async () => {
    const editor = new NodeEditor<any>();

    const holePositions = Array.from({ length: 25 }, (_, i) => ({ row: i, col: 0 }));
    const railR = new RailNode('rail-right-positive', 'Rail R +', holePositions);
    await editor.addNode(railR);

    // Minimal fake “component node” with an input named leg0.
    // We don't care about sockets here, just keys in editor.getNode().inputs.
    const component: any = {
      id: 'comp-1',
      inputs: { leg0: { multipleConnections: false } },
      outputs: {},
    };
    (editor as any).nodes.push(component);

    const initial = makeSocketData({ nodeId: railR.id, side: 'output', key: 'h3' });
    const socket = makeSocketData({ nodeId: component.id, side: 'input', key: 'leg0' });

    const resolved = resolveSourceTarget(initial, socket, editor as any);
    expect(resolved).not.toBeNull();
    expect(resolved!.source.nodeId).toBe(railR.id);
    expect(resolved!.target.nodeId).toBe(component.id);
  });
});
