import { useCallback, useEffect, useRef, useState } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { Position } from '@/core/types';
import { pixelsToPosition, positionToPixels, isValidPosition } from '@/ui-react/geometry/breadboard-layout';
import { isHoleOccupied } from '@/ui-controller/selectors';

export interface ComponentsLayerModel {
  state: AppState;
  hoveredComponentId: string | null;
  setHoveredComponentId: React.Dispatch<React.SetStateAction<string | null>>;
  handleComponentPointerDown: (e: React.PointerEvent, componentId: string) => void;
  handleLegPointerDown: (e: React.PointerEvent, componentId: string, legIndex: number) => void;
}

export interface UseComponentsLayerModelParams {
  controller: BreadboardController;
  svgRef: React.RefObject<SVGSVGElement | null>;
  substrateRef: React.RefObject<SVGGElement | null>;
}

export function useComponentsLayerModel({
  controller,
  svgRef,
  substrateRef,
}: UseComponentsLayerModelParams): ComponentsLayerModel {
  const [state, setState] = useState<AppState>(controller.getState());
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isConnectionDraggingRef = useRef(false);

  // Subscribe to controller state
  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return unsubscribe;
  }, [controller]);

  // Convert screen coordinates into breadboard-local pixel coordinates.
  // We use the substrate <g> element's CTM directly so the mapping remains correct
  // under viewBox pan/zoom and under breadboard orientation rotation.
  const screenToBoard = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      const substrate = substrateRef.current;
      if (!svg || !substrate) return null;

      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;

      const ctm = substrate.getScreenCTM();
      if (!ctm) return null;

      const transformed = point.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    },
    [svgRef, substrateRef]
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

  // Handle component pointer down (start drag or select)
  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as SVGElement;

      // Check if clicking rotation handle
      if (target.closest('[data-rotation-handle="true"]')) {
        handleRotateClick(componentId);
        return;
      }

      const component = state.breadboard.components.find((c) => c.id === componentId);
      if (!component) return;

      const boardCoords = screenToBoard(e.clientX, e.clientY);
      if (!boardCoords) return;

      // Select the component
      controller.dispatch({
        type: 'COMPONENT_SELECTED',
        componentId,
      });

      // Start drag tracking
      isDraggingRef.current = false;
      dragStartPosRef.current = boardCoords;

      // Calculate offset from first pin
      const firstPinPixels = positionToPixels(component.positions[0]);
      const offsetFromFirstPin = {
        x: boardCoords.x - firstPinPixels.x,
        y: boardCoords.y - firstPinPixels.y,
      };

      // Dispatch drag started
      controller.dispatch({
        type: 'DRAG_STARTED',
        componentId,
        mousePos: boardCoords,
        originalPositions: component.positions,
        offsetFromFirstPin,
      });
    },
    [state.breadboard.components, controller, screenToBoard, handleRotateClick]
  );

  // Handle leg pointer down (start connection drag)
  const handleLegPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string, legIndex: number) => {
      e.preventDefault();
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
        const boardCoords = screenToBoard(e.clientX, e.clientY);
        if (!boardCoords) return;

        // Convert to grid position
        const gridPosition = pixelsToPosition(boardCoords.x, boardCoords.y);

        // Check if valid hole and not occupied
        const isValid = isValidPosition(gridPosition) && !isHoleOccupied(state, gridPosition);

        controller.dispatch({
          type: 'CONNECTION_DRAG_MOVED',
          pointerPosition: boardCoords,
          hoveredHole: isValidPosition(gridPosition) ? gridPosition : null,
          isValid,
        });
        return;
      }

      // Handle component drag
      const dragState = state.componentDrag.dragState;
      if (!dragState) return;

      const boardCoords = screenToBoard(e.clientX, e.clientY);
      if (!boardCoords) return;

      isDraggingRef.current = true;

      // Calculate new position for first pin
      const newFirstPinX = boardCoords.x - dragState.offsetFromFirstPin.x;
      const newFirstPinY = boardCoords.y - dragState.offsetFromFirstPin.y;

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
        mousePos: boardCoords,
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
  }, [
    state.componentDrag.dragState,
    state.connectionDrag.dragState,
    state.breadboard.components,
    controller,
    screenToBoard,
    state,
  ]);

  return {
    state,
    hoveredComponentId,
    setHoveredComponentId,
    handleComponentPointerDown,
    handleLegPointerDown,
  };
}
