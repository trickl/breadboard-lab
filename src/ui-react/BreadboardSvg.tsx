/**
 * SVG-based breadboard substrate renderer
 * Renders breadboard substrate with efficient hole rendering and interaction
 */

import React, { useMemo, useState } from 'react';
import { BreadboardLayout } from '@/core/breadboard-layout';
import type { Position } from '@/core/types';
import {
  positionToPixels,
  pixelsToPosition,
  isValidPosition,
  getAllHolePositions,
  getConnectedRegionBounds,
  getBreadboardDimensions,
  getColumnLabel,
  getRowLabel,
  HOLE_VISUAL_RADIUS,
  HOLE_SPACING,
} from './geometry/breadboard-layout';

export interface BreadboardSvgProps {
  orientation?: 0 | 90 | 180 | 270;
  onHoleClick?: (position: Position) => void;
  onHoleHover?: (position: Position) => void;
  onHoleLeave?: () => void;
}

/**
 * BreadboardSvg - SVG-based breadboard substrate with interactive holes
 *
 * Performance strategy:
 * - Uses SVG <symbol> and <use> for hole reuse (1 definition, 420 instances)
 * - Single transparent overlay rect for event handling (not per-hole listeners)
 * - Math-based hit detection to find nearest hole
 * - Memoized hole positions to avoid recalculation
 */
export const BreadboardSvg: React.FC<BreadboardSvgProps> = React.memo(
  ({ onHoleClick, onHoleHover, onHoleLeave }) => {
    const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);

    const dimensions = useMemo(() => getBreadboardDimensions(), []);
    const holePositions = useMemo(() => getAllHolePositions(), []);

    // Handle pointer events on the overlay
    const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;

      // Transform to SVG coordinate space
      const ctm = event.currentTarget.getScreenCTM();
      if (!ctm) return;

      const transformedPoint = point.matrixTransform(ctm.inverse());

      // Find nearest hole
      const position = pixelsToPosition(transformedPoint.x, transformedPoint.y);

      if (isValidPosition(position)) {
        setHoveredPosition(position);
        onHoleHover?.(position);
      } else {
        setHoveredPosition(null);
        onHoleLeave?.();
      }
    };

    const handlePointerLeave = () => {
      setHoveredPosition(null);
      onHoleLeave?.();
    };

    const handleClick = (event: React.MouseEvent<SVGRectElement>) => {
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;

      const ctm = event.currentTarget.getScreenCTM();
      if (!ctm) return;

      const transformedPoint = point.matrixTransform(ctm.inverse());
      const position = pixelsToPosition(transformedPoint.x, transformedPoint.y);

      if (isValidPosition(position)) {
        onHoleClick?.(position);
      }
    };

    // Calculate highlight bounds for hovered position
    const highlightBounds = useMemo(() => {
      if (!hoveredPosition) return null;
      return getConnectedRegionBounds(hoveredPosition);
    }, [hoveredPosition]);

    // Render row labels
    const rowLabels = useMemo(() => {
      const labels = [];
      for (let row = 0; row < BreadboardLayout.ROWS; row++) {
        if (row % 5 === 0 || row === BreadboardLayout.ROWS - 1) {
          const pos = positionToPixels({ row, col: 0 });
          labels.push(
            <text
              key={`row-left-${row}`}
              x={-8}
              y={pos.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#888"
              fontSize="11"
              fontWeight="bold"
            >
              {getRowLabel(row)}
            </text>
          );
          labels.push(
            <text
              key={`row-right-${row}`}
              x={dimensions.width + 8}
              y={pos.y}
              textAnchor="start"
              dominantBaseline="middle"
              fill="#888"
              fontSize="11"
              fontWeight="bold"
            >
              {getRowLabel(row)}
            </text>
          );
        }
      }
      return labels;
    }, [dimensions.width]);

    // Render column labels
    const columnLabels = useMemo(() => {
      const labels = [];
      for (let col = BreadboardLayout.STRIP_LEFT_START; col <= BreadboardLayout.STRIP_RIGHT_END; col++) {
        const label = getColumnLabel(col);
        if (label) {
          const pos = positionToPixels({ row: 0, col });
          labels.push(
            <text
              key={`col-top-${col}`}
              x={pos.x}
              y={-8}
              textAnchor="middle"
              dominantBaseline="auto"
              fill="#888"
              fontSize="11"
              fontWeight="bold"
            >
              {label}
            </text>
          );
          labels.push(
            <text
              key={`col-bottom-${col}`}
              x={pos.x}
              y={dimensions.height + 8}
              textAnchor="middle"
              dominantBaseline="hanging"
              fill="#888"
              fontSize="11"
              fontWeight="bold"
            >
              {label}
            </text>
          );
        }
      }
      return labels;
    }, [dimensions.height]);

    // Render rail labels
    const railLabels = useMemo(() => {
      const posLeft = positionToPixels({ row: 0, col: BreadboardLayout.RAIL_LEFT_POSITIVE });
      const negLeft = positionToPixels({ row: 0, col: BreadboardLayout.RAIL_LEFT_NEGATIVE });
      const posRight = positionToPixels({ row: 0, col: BreadboardLayout.RAIL_RIGHT_POSITIVE });
      const negRight = positionToPixels({ row: 0, col: BreadboardLayout.RAIL_RIGHT_NEGATIVE });

      return (
        <>
          <text
            x={posLeft.x}
            y={-8}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#c0c0c0"
            fontSize="12"
            fontWeight="bold"
          >
            +
          </text>
          <text
            x={negLeft.x}
            y={-8}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#c0c0c0"
            fontSize="12"
            fontWeight="bold"
          >
            -
          </text>
          <text
            x={posRight.x}
            y={-8}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#c0c0c0"
            fontSize="12"
            fontWeight="bold"
          >
            +
          </text>
          <text
            x={negRight.x}
            y={-8}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#c0c0c0"
            fontSize="12"
            fontWeight="bold"
          >
            -
          </text>
        </>
      );
    }, []);

    // Render center divider
    const centerDivider = useMemo(() => {
      const centerCol =
        (BreadboardLayout.STRIP_LEFT_END + BreadboardLayout.STRIP_RIGHT_START + 1) / 2;
      const centerX = centerCol * HOLE_SPACING;
      return (
        <rect
          x={centerX - 3}
          y={0}
          width={6}
          height={dimensions.height}
          fill="#1a1a1a"
          opacity={0.8}
        />
      );
    }, [dimensions.height]);

    return (
      <svg
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block' }}
      >
        <defs>
          {/* Define hole symbol for reuse */}
          <circle
            id="breadboard-hole"
            r={HOLE_VISUAL_RADIUS}
            fill="#222"
            stroke="#111"
            strokeWidth="0.5"
          />
        </defs>

        {/* Background */}
        <rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#1a1a1a" />

        {/* Plastic surface with subtle variations */}
        <rect
          x={0}
          y={0}
          width={BreadboardLayout.RAIL_LEFT_POSITIVE * HOLE_SPACING}
          height={dimensions.height}
          fill="#2a2a2a"
        />
        <rect
          x={BreadboardLayout.RAIL_LEFT_POSITIVE * HOLE_SPACING}
          y={0}
          width={HOLE_SPACING}
          height={dimensions.height}
          fill="#2d2a2a"
        />
        <rect
          x={BreadboardLayout.STRIP_LEFT_START * HOLE_SPACING}
          y={0}
          width={(BreadboardLayout.STRIP_RIGHT_END - BreadboardLayout.STRIP_LEFT_START + 1) * HOLE_SPACING}
          height={dimensions.height}
          fill="#2c2c2c"
        />
        <rect
          x={BreadboardLayout.RAIL_RIGHT_POSITIVE * HOLE_SPACING}
          y={0}
          width={2 * HOLE_SPACING}
          height={dimensions.height}
          fill="#2a2a2a"
        />

        {/* Center divider */}
        {centerDivider}

        {/* Highlight overlay (rendered before holes) */}
        {highlightBounds && (
          <rect
            x={highlightBounds.x}
            y={highlightBounds.y}
            width={highlightBounds.width}
            height={highlightBounds.height}
            fill="#3399ff"
            opacity={0.2}
            stroke="#3399ff"
            strokeWidth={2}
            rx={4}
          />
        )}

        {/* Holes (using symbol reuse) */}
        {holePositions.map((pos) => {
          const { x, y } = positionToPixels(pos);
          return <use key={`hole-${pos.row}-${pos.col}`} href="#breadboard-hole" x={x} y={y} />;
        })}

        {/* Labels */}
        {rowLabels}
        {columnLabels}
        {railLabels}

        {/* Single transparent overlay for event handling */}
        <rect
          x={0}
          y={0}
          width={dimensions.width}
          height={dimensions.height}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
        />
      </svg>
    );
  }
);

BreadboardSvg.displayName = 'BreadboardSvg';
