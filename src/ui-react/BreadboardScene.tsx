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
      >
        {/* Offset group for label padding */}
        <g transform={`translate(${LABEL_PADDING_X}, ${LABEL_PADDING_Y})`}>
          <BreadboardSvg
            orientation={state.ui.breadboardOrientation}
            onHoleClick={handleHoleClick}
            onHoleHover={handleHoleHover}
            onHoleLeave={handleHoleLeave}
          />
        </g>
      </svg>
    </div>
  );
};
