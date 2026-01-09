/**
 * Breadboard scene with viewport controls (pan/zoom)
 * Wraps BreadboardSvg and manages coordinate transformation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { Position } from '@/core/types';
import { BreadboardSvg } from './BreadboardSvg';
import { getBreadboardDimensions, LABEL_PADDING_X, LABEL_PADDING_Y } from './geometry/breadboard-layout';
import { ComponentsLayer } from './components/ComponentsLayer';
import { ConnectionsLayer } from './components/ConnectionsLayer';
import { ReteGraphLayer } from './rete/ReteGraphLayer';

export interface BreadboardSceneProps {
  controller: BreadboardController;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * BreadboardScene - Viewport container with pan/zoom for breadboard
 *
 * Manages:
 * - Pan via mouse drag
 * - Zoom via mouse wheel
 * - Subscription to controller state
 * - Event forwarding to controller
 */
export const BreadboardScene: React.FC<BreadboardSceneProps> = ({ controller }) => {
  const [state, setState] = useState<AppState>(controller.getState());
  const svgRef = useRef<SVGSVGElement>(null);

  // Subscribe to controller state
  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return unsubscribe;
  }, [controller]);

  // Viewport state
  const dimensions = getBreadboardDimensions();
  const totalWidth = dimensions.width + LABEL_PADDING_X * 2;
  const totalHeight = dimensions.height + LABEL_PADDING_Y * 2;

  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    width: totalWidth,
    height: totalHeight,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();

      const svg = svgRef.current;
      if (!svg) return;

      // Get mouse position in SVG coordinates
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPoint = point.matrixTransform(ctm.inverse());

      // Calculate zoom factor
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;

      // Calculate new viewBox
      const newWidth = viewBox.width * zoomFactor;
      const newHeight = viewBox.height * zoomFactor;

      // Clamp zoom
      const minZoom = 0.1;
      const maxZoom = 5;
      const currentZoom = totalWidth / viewBox.width;
      const newZoom = currentZoom / zoomFactor;

      if (newZoom < minZoom || newZoom > maxZoom) {
        return;
      }

      // Calculate new top-left to keep mouse position fixed
      const newX = svgPoint.x - (svgPoint.x - viewBox.x) * zoomFactor;
      const newY = svgPoint.y - (svgPoint.y - viewBox.y) * zoomFactor;

      setViewBox({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    },
    [viewBox, totalWidth, totalHeight]
  );

  // Handle pan start
  const handleMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button === 0) {
      // Left button
      setIsPanning(true);
      setPanStart({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  }, []);

  // Handle pan move
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!isPanning) return;

      const dx = event.clientX - panStart.x;
      const dy = event.clientY - panStart.y;

      // Convert screen space delta to viewBox space
      const scaleX = viewBox.width / (svgRef.current?.clientWidth || 1);
      const scaleY = viewBox.height / (svgRef.current?.clientHeight || 1);

      setViewBox({
        ...viewBox,
        x: viewBox.x - dx * scaleX,
        y: viewBox.y - dy * scaleY,
      });

      setPanStart({ x: event.clientX, y: event.clientY });
    },
    [isPanning, panStart, viewBox]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Hole interaction handlers
  const handleHoleClick = useCallback(
    (position: Position) => {
      console.log(`Hole clicked: row ${position.row}, col ${position.col}`);
      // Future: dispatch appropriate controller action based on interaction mode
    },
    []
  );

  const handleHoleHover = useCallback((_position: Position) => {
    // Future: update hover state for UI feedback
  }, []);

  const handleHoleLeave = useCallback(() => {
    // Future: clear hover state
  }, []);

  // Keyboard event handlers for component operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedId = state.breadboard.selectedComponentId;

      // Rotate selected component (R key)
      if ((e.key === 'r' || e.key === 'R') && selectedId) {
        e.preventDefault();
        const component = state.breadboard.components.find((c) => c.id === selectedId);
        if (!component) return;

        const newRotation = ((component.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        controller.dispatch({
          type: 'COMPONENT_ROTATED',
          componentId: selectedId,
          rotation: newRotation,
          positions: component.positions,
        });
      }

      // Delete selected component (Delete or Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !e.repeat) {
        e.preventDefault();
        controller.dispatch({
          type: 'COMPONENT_DELETED',
          componentId: selectedId,
        });
      }

      // Cancel connection drag on Escape
      if (e.key === 'Escape' && state.connectionDrag.dragState) {
        e.preventDefault();
        controller.dispatch({
          type: 'CONNECTION_DRAG_CANCELLED',
        });
      }

      // Cancel component drag on Escape
      if (e.key === 'Escape' && state.componentDrag.dragState) {
        e.preventDefault();
        controller.dispatch({
          type: 'DRAG_CANCELLED',
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.breadboard.selectedComponentId, state.breadboard.components, state.componentDrag.dragState, state.connectionDrag.dragState, controller]);

  // Handle background click to deselect
  const handleBackgroundClick = useCallback(() => {
    if (state.breadboard.selectedComponentId) {
      controller.dispatch({
        type: 'COMPONENT_SELECTED',
        componentId: null,
      });
    }
  }, [state.breadboard.selectedComponentId, controller]);

  // Handle Rete transform changes (DR-3: Rete is source of truth for pan/zoom)
  // Currently disabled to maintain existing SVG pan/zoom functionality
  // TODO: Enable after validating Rete coordinate alignment
  const handleReteTransformChange = useCallback(
    (_x: number, _y: number, _zoom: number) => {
      // Future: sync SVG viewBox from Rete transform
      // setViewBox({
      //   x: x,
      //   y: y,
      //   width: totalWidth / zoom,
      //   height: totalHeight / zoom,
      // });
    },
    []
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        style={{
          width: '100%',
          height: '100%',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
      >
        {/* Offset group for label padding */}
        <g transform={`translate(${LABEL_PADDING_X}, ${LABEL_PADDING_Y})`}>
          <BreadboardSvg
            orientation={state.ui.breadboardOrientation}
            onHoleClick={handleHoleClick}
            onHoleHover={handleHoleHover}
            onHoleLeave={handleHoleLeave}
          />
          <ConnectionsLayer controller={controller} />
          <ComponentsLayer controller={controller} svgRef={svgRef} />
        </g>
      </svg>
      {/* Rete graph layer overlaid on top */}
      <ReteGraphLayer 
        controller={controller} 
        svgRef={svgRef}
        onTransformChange={handleReteTransformChange}
      />
    </div>
  );
};
