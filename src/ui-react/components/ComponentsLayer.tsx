/**
 * ComponentsLayer - Container for rendering all breadboard components
 * Manages component interaction (selection, drag, rotate)
 */

import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { ComponentRenderer } from './ComponentRenderer';
import { ConnectionDragPreview } from './ConnectionDragPreview';
import { positionToPixels } from '../geometry/breadboard-layout';
import { useComponentsLayerModel } from '@/ui-react/components/components-layer/useComponentsLayerModel';

export interface ComponentsLayerProps {
  controller: BreadboardController;
  svgRef: React.RefObject<SVGSVGElement | null>;
  substrateRef: React.RefObject<SVGGElement | null>;
}

/**
 * ComponentsLayer - Renders all components and manages interactions
 */
export const ComponentsLayer: React.FC<ComponentsLayerProps> = ({
  controller,
  svgRef,
  substrateRef,
}) => {
  const { state, hoveredComponentId, setHoveredComponentId, handleComponentPointerDown, handleLegPointerDown } =
    useComponentsLayerModel({ controller, svgRef, substrateRef });

  // Render components
  const components = state.breadboard.components;
  const selectedId = state.breadboard.selectedComponentId;
  const dragState = state.componentDrag.dragState;
  const connectionDragState = state.connectionDrag.dragState;

  return (
    <g>
      {/* Render connection drag preview */}
      {connectionDragState && <ConnectionDragPreview dragState={connectionDragState} />}

      {/* Render wires first (behind other components) */}
      {components
        .filter((c) => c.type === 'WIRE')
        .map((component) => (
          <ComponentRenderer
            key={component.id}
            component={component}
            isSelected={component.id === selectedId}
            isHovered={component.id === hoveredComponentId}
            onPointerDown={handleComponentPointerDown}
            onPointerEnter={setHoveredComponentId}
            onPointerLeave={(id) => setHoveredComponentId((prev) => (prev === id ? null : prev))}
          />
        ))}

      {/* Render ghost preview if dragging */}
      {dragState && dragState.previewPositions && (
        <g style={{ opacity: 0.7, pointerEvents: 'none' }}>
          {(() => {
            const component = components.find((c) => c.id === dragState.componentId);
            if (!component) return null;
            const previewComponent = { ...component, positions: dragState.previewPositions };
            return <ComponentRenderer component={previewComponent} isSelected={false} />;
          })()}
        </g>
      )}

      {/* Render other components */}
      {components
        .filter((c) => c.type !== 'WIRE')
        .map((component) => {
          const isDragging = dragState?.componentId === component.id;
          return (
            <g
              key={component.id}
              style={{
                opacity: isDragging ? 0.3 : 1,
              }}
            >
              <ComponentRenderer
                component={component}
                isSelected={component.id === selectedId && !isDragging}
                isHovered={component.id === hoveredComponentId}
                onPointerDown={handleComponentPointerDown}
                onPointerEnter={setHoveredComponentId}
                onPointerLeave={(id) =>
                  setHoveredComponentId((prev) => (prev === id ? null : prev))
                }
              />
              {/* Interactive leg circles for connection drag */}
              {component.id === selectedId &&
                !isDragging &&
                component.positions.map((pos, legIndex) => {
                  const pixels = positionToPixels(pos);
                  return (
                    <circle
                      key={`${component.id}-leg-${legIndex}`}
                      data-component-control="true"
                      cx={pixels.x}
                      cy={pixels.y}
                      r={10}
                      fill="transparent"
                      stroke="#3399ff"
                      strokeWidth={2}
                      opacity={0.35}
                      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                      onPointerDown={(e) => handleLegPointerDown(e, component.id, legIndex)}
                    />
                  );
                })}
            </g>
          );
        })}
    </g>
  );
};
