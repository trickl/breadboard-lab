import type { ConnectionDragState } from '@/ui-controller/types';
import { positionToPixels } from '../geometry/breadboard-layout';

export interface ConnectionDragPreviewProps {
  dragState: ConnectionDragState;
}

/**
 * Ghost preview rendered while the user is dragging a new connection from a component leg.
 * This is the legacy (non-Rete) wiring UI preview; it is intentionally lightweight.
 */
export function ConnectionDragPreview({ dragState }: ConnectionDragPreviewProps) {
  const source = positionToPixels(dragState.sourcePosition);
  const target = dragState.currentPointerPosition;
  const stroke = dragState.isValidTarget ? '#00cc66' : '#ff3355';

  const hovered = dragState.hoveredHolePosition
    ? positionToPixels(dragState.hoveredHolePosition)
    : null;

  return (
    <g className="connection-drag-preview" style={{ pointerEvents: 'none' }}>
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.8}
        strokeDasharray="6 4"
      />

      {/* Cursor endpoint */}
      <circle cx={target.x} cy={target.y} r={6} fill={stroke} opacity={0.35} />

      {/* Snapped/hovered hole indicator */}
      {hovered && (
        <circle
          cx={hovered.x}
          cy={hovered.y}
          r={10}
          fill="transparent"
          stroke={stroke}
          strokeWidth={2}
          opacity={0.9}
        />
      )}
    </g>
  );
}
