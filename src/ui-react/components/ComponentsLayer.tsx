/**
 * ComponentsLayer - Container for rendering all breadboard components
 * Manages component interaction (selection, drag, rotate)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { Position } from '@/core/types';
import { ComponentRenderer } from './ComponentRenderer';
import { ConnectionDragPreview } from './ConnectionDragPreview';
import { pixelsToPosition, positionToPixels, isValidPosition } from '../geometry/breadboard-layout';
import { isHoleOccupied } from '@/ui-controller/selectors';

export interface ComponentsLayerProps {
  controller: BreadboardController;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

/**
 * ComponentsLayer - Renders all components and manages interactions
 */
export const ComponentsLayer: React.FC<ComponentsLayerProps> = ({ controller, svgRef }) => {
  const [state, setState] = useState<AppState>(controller.getState());
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isConnectionDraggingRef = useRef(false);

  // Subscribe to controller state
  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return unsubscribe;
  }, [controller]);

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;

      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;

      const ctm = svg.getScreenCTM();
      if (!ctm) return null;

      const transformed = point.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    },
    [svgRef]
  );

  // Handle component pointer down (start drag or select)
  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string) => {
      e.stopPropagation();

      const target = e.target as SVGElement;

      // Check if clicking rotation handle
      if (target.closest('.rotation-handle')) {
        handleRotateClick(componentId);
        return;
      }

      const component = state.breadboard.components.find((c) => c.id === componentId);
      if (!component) return;

      const svgCoords = screenToSVG(e.clientX, e.clientY);
      if (!svgCoords) return;

      // Select the component
      controller.dispatch({
        type: 'COMPONENT_SELECTED',
        componentId,
      });

      // Start drag tracking
      isDraggingRef.current = false;
      dragStartPosRef.current = svgCoords;

      // Calculate offset from first pin
      const firstPinPixels = positionToPixels(component.positions[0]);
      const offsetFromFirstPin = {
        x: svgCoords.x - firstPinPixels.x,
        y: svgCoords.y - firstPinPixels.y,
      };

      // Dispatch drag started
      controller.dispatch({
        type: 'DRAG_STARTED',
        componentId,
        mousePos: svgCoords,
        originalPositions: component.positions,
        offsetFromFirstPin,
      });
    },
    [state.breadboard.components, controller, screenToSVG]
  );

  // Handle rotation click
  const handleRotateClick = useCallback(
    (componentId: string) => {
      const component = state.breadboard.components.find((c) => c.id === componentId);
      if (!component) return;

      // Calculate new rotation (90 degree increments)
      const newRotation = ((component.rotation + 90) % 360) as 0 | 90 | 180 | 270;

      // For rotation, we keep the positions the same (rotate in place)
      controller.dispatch({
        type: 'COMPONENT_ROTATED',
        componentId,
        rotation: newRotation,
        positions: component.positions,
      });
    },
    [state.breadboard.components, controller]
  );

  // Handle leg pointer down (start connection drag)
  const handleLegPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string, legIndex: number) => {
      e.stopPropagation();

      const component = state.breadboard.components.find((c) => c.id === componentId);
      if (!component || legIndex >= component.positions.length) return;

      const legPosition = component.positions[legIndex];

      // Start connection drag
      controller.dispatch({
        type: 'CONNECTION_DRAG_STARTED',
        componentId,
        legIndex,
        position: legPosition,
      });

      isConnectionDraggingRef.current = true;
    },
    [state.breadboard.components, controller]
  );

  // Handle pointer move (drag component or connection)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      // Handle connection drag
      if (state.connectionDrag.dragState) {
        const svgCoords = screenToSVG(e.clientX, e.clientY);
        if (!svgCoords) return;

        // Convert to grid position
        const gridPosition = pixelsToPosition(svgCoords.x, svgCoords.y);

        // Check if valid hole and not occupied
        const isValid = isValidPosition(gridPosition) && !isHoleOccupied(state, gridPosition);

        controller.dispatch({
          type: 'CONNECTION_DRAG_MOVED',
          pointerPosition: svgCoords,
          hoveredHole: isValidPosition(gridPosition) ? gridPosition : null,
          isValid,
        });
        return;
      }

      // Handle component drag
      const dragState = state.componentDrag.dragState;
      if (!dragState) return;

      const svgCoords = screenToSVG(e.clientX, e.clientY);
      if (!svgCoords) return;

      isDraggingRef.current = true;

      // Calculate new position for first pin
      const newFirstPinX = svgCoords.x - dragState.offsetFromFirstPin.x;
      const newFirstPinY = svgCoords.y - dragState.offsetFromFirstPin.y;

      // Convert to grid position
      const newFirstPinGridPos = pixelsToPosition(newFirstPinX, newFirstPinY);

      // Calculate all new positions based on offset from first pin
      const component = state.breadboard.components.find((c) => c.id === dragState.componentId);
      if (!component) return;

      const previewPositions: Position[] = component.positions.map((origPos, index) => {
        if (index === 0) {
          return newFirstPinGridPos;
        }
        const offset = {
          row: origPos.row - dragState.originalPositions[0].row,
          col: origPos.col - dragState.originalPositions[0].col,
        };
        return {
          row: newFirstPinGridPos.row + offset.row,
          col: newFirstPinGridPos.col + offset.col,
        };
      });

      // Validate all positions
      const allValid = previewPositions.every(isValidPosition);

      controller.dispatch({
        type: 'DRAG_MOVED',
        mousePos: svgCoords,
        previewPositions: allValid ? previewPositions : null,
      });
    };

    const handlePointerUp = () => {
      // Handle connection drag completion
      if (state.connectionDrag.dragState) {
        const dragState = state.connectionDrag.dragState;
        if (dragState.isValidTarget && dragState.hoveredHolePosition) {
          controller.dispatch({
            type: 'CONNECTION_DRAG_COMPLETED',
            targetPosition: dragState.hoveredHolePosition,
          });
        } else {
          controller.dispatch({
            type: 'CONNECTION_DRAG_CANCELLED',
          });
        }
        isConnectionDraggingRef.current = false;
        return;
      }

      // Handle component drag completion
      const dragState = state.componentDrag.dragState;
      if (!dragState) return;

      if (isDraggingRef.current && dragState.previewPositions) {
        // Complete the drag - move component to new position
        controller.dispatch({
          type: 'COMPONENT_MOVED',
          componentId: dragState.componentId,
          positions: dragState.previewPositions,
        });
      }

      // End drag
      controller.dispatch({
        type: 'DRAG_COMPLETED',
      });

      isDraggingRef.current = false;
      dragStartPosRef.current = null;
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [state.componentDrag.dragState, state.connectionDrag.dragState, state.breadboard.components, controller, screenToSVG, state]);

  // Render components
  const components = state.breadboard.components;
  const selectedId = state.breadboard.selectedComponentId;
  const dragState = state.componentDrag.dragState;
  const connectionDragState = state.connectionDrag.dragState;

  return (
    <g className="components-layer">
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
            onPointerDown={handleComponentPointerDown}
          />
        ))}

      {/* Render ghost preview if dragging */}
      {dragState && dragState.previewPositions && (
        <g className="drag-preview" style={{ opacity: 0.7, pointerEvents: 'none' }}>
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
                onPointerDown={handleComponentPointerDown}
              />
              {/* Interactive leg circles for connection drag */}
              {component.positions.map((pos, legIndex) => {
                const pixels = positionToPixels(pos);
                return (
                  <circle
                    key={`${component.id}-leg-${legIndex}`}
                    cx={pixels.x}
                    cy={pixels.y}
                    r={8}
                    fill="transparent"
                    stroke="transparent"
                    strokeWidth={2}
                    className="component-leg"
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
