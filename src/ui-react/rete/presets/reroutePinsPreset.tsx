import React from 'react';

import { startPointerDrag, type Pointer } from '@/ui-react/rete/graph/pointerDrag';

export function createReroutePinsPreset(options: {
  connectionUiRef: React.MutableRefObject<{ selectedConnectionId: string | null }>;
  reroutePlugin: {
    translate: (pinId: string, dx: number, dy: number) => Promise<unknown>;
    select: (pinId: string) => Promise<unknown>;
    remove: (pinId: string) => Promise<unknown>;
  };
  pointer: () => Pointer;
}) {
  const { connectionUiRef, reroutePlugin, pointer } = options;

  // Render reroute pins on top of connections.
  // We only show pins when the corresponding wire is selected.
  return {
    render: (context: { data: { type: string; data: unknown } }) => {
      const data = context.data;
      if (data.type !== 'reroute-pins') return;

      const pinData = data.data as {
        id: string;
        pins: Array<{ id: string; position: Pointer; selected?: boolean }>;
      };

      const connectionId = String(pinData.id);
      // Important: returning null here would cause the React renderer to NOT update this
      // container (leaving previously rendered pins visible). Instead, render an empty
      // fragment to actively clear the pin container for unselected connections.
      if (connectionUiRef.current.selectedConnectionId !== connectionId) return <></>;

      return (
        <>
          {pinData.pins.map((pin) => (
            <div
              key={pin.id}
              data-testid="pin"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                startPointerDrag({
                  pointer,
                  onMove: (dx, dy) => {
                    void reroutePlugin.translate(pin.id, dx, dy);
                  },
                });
                void reroutePlugin.select(pin.id);
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                e.preventDefault();
                void reroutePlugin.remove(pin.id);
              }}
              style={{
                position: 'absolute',
                top: `${pin.position.y - 10}px`,
                left: `${pin.position.x - 10}px`,
                width: 20,
                height: 20,
                boxSizing: 'border-box',
                background: pin.selected ? '#ffd92c' : 'steelblue',
                border: '2px solid white',
                borderRadius: 20,
                cursor: 'grab',
                zIndex: 50,
                boxShadow: pin.selected ? '0 0 0 2px rgba(0,0,0,0.25)' : undefined,
              }}
            />
          ))}
        </>
      );
    },
  };
}
