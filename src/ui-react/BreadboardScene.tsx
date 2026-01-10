/**
 * Breadboard scene with viewport controls (pan/zoom)
 * Wraps BreadboardSvg and manages coordinate transformation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import { BreadboardSvg } from './BreadboardSvg';
import { getBreadboardDimensions, LABEL_PADDING_X, LABEL_PADDING_Y } from './geometry/breadboard-layout';
import { ComponentsLayer } from './components/ComponentsLayer';
import { ConnectionsLayer } from './components/ConnectionsLayer';
import { ReteGraphLayer } from './rete/ReteGraphLayer';
import { VoltageOverlay } from './overlays/VoltageOverlay';
import { CurrentAnimation } from './overlays/CurrentAnimation';
import { ErrorOverlay } from './overlays/ErrorOverlay';

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

  // Default zoom level.
  // Scale factor ≈ (CSS pixels per world unit). A value of 3 means the board
  // appears ~3× larger than a 1:1 world-to-screen mapping.
  const DEFAULT_VIEW_SCALE = 1.5;

  // Initialize/maintain a reasonable viewBox that keeps the board centered.
  // (Wheel zoom is disabled; pan is still supported.)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const fit = () => {
      const viewportWidth = svg.clientWidth || 1;
      const viewportHeight = svg.clientHeight || 1;

      // Choose a smaller viewBox to zoom in.
      // Clamp so we never zoom in past the board's bounds too aggressively.
      const minWidth = totalWidth / 6;
      const minHeight = totalHeight / 6;

      const width = Math.max(minWidth, viewportWidth / DEFAULT_VIEW_SCALE);
      const height = Math.max(minHeight, viewportHeight / DEFAULT_VIEW_SCALE);

      setViewBox((prev) => {
        // Keep current pan if the user already moved around, but still ensure no upscaling.
        // If the previous viewBox was already larger than the board, preserve its center.
        const centerX = prev.x + prev.width / 2;
        const centerY = prev.y + prev.height / 2;

        // If we haven't panned/zoomed (still at origin), center on the board.
        const isDefault = prev.x === 0 && prev.y === 0 && prev.width === totalWidth && prev.height === totalHeight;
        const targetCenterX = isDefault ? totalWidth / 2 : centerX;
        const targetCenterY = isDefault ? totalHeight / 2 : centerY;

        const next = {
          x: targetCenterX - width / 2,
          y: targetCenterY - height / 2,
          width,
          height,
        };

        if (
          Math.abs(next.x - prev.x) < 0.01 &&
          Math.abs(next.y - prev.y) < 0.01 &&
          Math.abs(next.width - prev.width) < 0.01 &&
          Math.abs(next.height - prev.height) < 0.01
        ) {
          return prev;
        }

        return next;
      });
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [totalWidth, totalHeight]);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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

      // Toggle voltage overlay (V key)
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        controller.dispatch({
          type: 'VOLTAGE_OVERLAY_TOGGLED',
        });
      }

      // Toggle current animation (C key)
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        controller.dispatch({
          type: 'CURRENT_ANIMATION_TOGGLED',
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

  const rotation = state.ui.breadboardOrientation;
  const rotationCx = dimensions.width / 2;
  const rotationCy = dimensions.height / 2;
  const substrateTransform =
    rotation === 0
      ? `translate(${LABEL_PADDING_X}, ${LABEL_PADDING_Y})`
      : `translate(${LABEL_PADDING_X}, ${LABEL_PADDING_Y}) rotate(${rotation} ${rotationCx} ${rotationCy})`;

  return (
    <div
      className="breadboard-container"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
      >
        {/* Offset group for label padding */}
        <g transform={substrateTransform}>
          <BreadboardSvg
            orientation={state.ui.breadboardOrientation}
          />
          {/* Voltage overlay (above substrate, below connections) */}
          <VoltageOverlay controller={controller} />
          {/* Connections layer */}
          <ConnectionsLayer controller={controller} />
          {/* Current animation (above connections, below components) */}
          <CurrentAnimation controller={controller} />
          {/* Components layer */}
          <ComponentsLayer controller={controller} svgRef={svgRef} />
          {/* Error overlay (top layer) */}
          <ErrorOverlay controller={controller} />
        </g>
      </svg>
      {/* Rete graph layer overlaid on top */}
      <ReteGraphLayer 
        controller={controller} 
        svgRef={svgRef}
        onTransformChange={handleReteTransformChange}
        rotation={rotation}
      />
    </div>
  );
};
