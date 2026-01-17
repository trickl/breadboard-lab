/**
 * SVG-based breadboard substrate renderer
 * Renders breadboard substrate with efficient hole rendering and interaction
 */

import React, { useMemo, useState } from 'react';
import { BreadboardLayout } from '@/core/breadboard-layout';
import type { Position } from '@/core/types';
import type { BoardRotation } from '@/ui-react/world/breadboard-world';
import { rotatePoint } from '@/ui-react/world/breadboard-world';
import {
  positionToPixels,
  pixelsToPosition,
  isValidPosition,
  getAllHolePositions,
  getConnectedRegionBounds,
  getBreadboardDimensions,
  getColumnLabel,
  getRowLabel,
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  HOLE_SPACING,
} from './geometry/breadboard-layout';

import { BreadboardSkin } from './skins/breadboard-skin';

export interface BreadboardSvgProps {
  /**
   * Rotation applied to the substrate in world space (typically intrinsic + user rotation).
   * Used so printed rail artwork can be oriented consistently (e.g. red/+ on the top rail).
   */
  orientation?: BoardRotation;
  /**
   * Whether to render printed board labels (row/column/rail markers).
   * Defaults to true.
   */
  showLabels?: boolean;
  /**
   * Whether breadboard holes/ports should respond to hover/click.
   * Default is false: only components are interactive.
   */
  interactive?: boolean;
  onHoleClick?: (position: Position) => void;
  onHoleHover?: (position: Position) => void;
  onHoleLeave?: () => void;
}

/**
 * BreadboardSvg - SVG-based breadboard substrate with interactive holes
 *
 * Performance strategy:
 * - Uses SVG <defs> + <use> for hole reuse (1 definition, many instances)
 * - Single transparent overlay rect for event handling (not per-hole listeners)
 * - Math-based hit detection to find nearest hole
 * - Memoized hole positions to avoid recalculation
 */
export const BreadboardSvg: React.FC<BreadboardSvgProps> = React.memo(
  ({
    orientation = 0,
    showLabels = true,
    interactive = false,
    onHoleClick,
    onHoleHover,
    onHoleLeave,
  }) => {
    const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);

    const COLUMN_LABEL_FONT_SIZE = 13.2; // 11 * 1.2
    const RAIL_SYMBOL_FONT_SIZE = 16.8; // 14 * 1.2

    const dimensions = useMemo(() => getBreadboardDimensions(), []);
    const holePositions = useMemo(() => getAllHolePositions(), []);

    // Handle pointer events on the overlay
    const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
      if (!interactive) return;
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
      if (!interactive) return;
      setHoveredPosition(null);
      onHoleLeave?.();
    };

    const handleClick = (event: React.MouseEvent<SVGRectElement>) => {
      if (!interactive) return;
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
      if (!interactive || !hoveredPosition) return null;
      return getConnectedRegionBounds(hoveredPosition);
    }, [hoveredPosition, interactive]);

    // Render row labels
    const rowLabels = useMemo(() => {
      const labels = [];

      const stripStartX =
        positionToPixels({ row: 0, col: BreadboardLayout.STRIP_LEFT_START }).x - HOLE_SPACING / 2;
      const stripEndX =
        positionToPixels({ row: 0, col: BreadboardLayout.STRIP_RIGHT_END }).x + HOLE_SPACING / 2;

      // Nudge row labels toward the terminal strip area (reference photo places them closer to the
      // central 10 holes than to the outer rails).
      const rowLabelInset = 2;

      for (let row = 0; row < BreadboardLayout.ROWS; row++) {
        // Use a terminal-strip column so Y aligns to the 30-row terminal grid (rails use a different Y grid).
        const pos = positionToPixels({ row, col: BreadboardLayout.STRIP_LEFT_START });

        // Match reference: numbers printed adjacent to the terminal strip area,
        // not at the extreme outer edges.
        const leftX = stripStartX - rowLabelInset;
        const rightX = stripEndX + rowLabelInset;

        labels.push(
          <text
            key={`row-left-${row}`}
            x={leftX}
            y={pos.y}
            textAnchor="end"
            dominantBaseline="middle"
            fill={BreadboardSkin.colors.printMid}
            fontFamily={BreadboardSkin.geometry.labelFontFamily}
            fontSize="11"
            fontWeight="600"
          >
            {getRowLabel(row)}
          </text>
        );
        labels.push(
          <text
            key={`row-right-${row}`}
            x={rightX}
            y={pos.y}
            textAnchor="start"
            dominantBaseline="middle"
            fill={BreadboardSkin.colors.printMid}
            fontFamily={BreadboardSkin.geometry.labelFontFamily}
            fontSize="11"
            fontWeight="600"
          >
            {getRowLabel(row)}
          </text>
        );
      }
      return labels;
    }, []);

    // Render column labels
    const columnLabels = useMemo(() => {
      const headerLabelY = HEADER_HEIGHT - 10;
      const footerLabelY = dimensions.height - FOOTER_HEIGHT + 16;

      const labels = [];
      for (
        let col = BreadboardLayout.STRIP_LEFT_START;
        col <= BreadboardLayout.STRIP_RIGHT_END;
        col++
      ) {
        const label = getColumnLabel(col);
        if (label) {
          const pos = positionToPixels({ row: 0, col });
          labels.push(
            <text
              key={`col-top-${col}`}
              x={pos.x}
              y={headerLabelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={BreadboardSkin.colors.printDark}
              fontFamily={BreadboardSkin.geometry.labelFontFamily}
              fontSize={COLUMN_LABEL_FONT_SIZE}
              fontWeight="600"
            >
              {label.toLowerCase()}
            </text>
          );
          labels.push(
            <text
              key={`col-bottom-${col}`}
              x={pos.x}
              y={footerLabelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={BreadboardSkin.colors.printDark}
              fontFamily={BreadboardSkin.geometry.labelFontFamily}
              fontSize={COLUMN_LABEL_FONT_SIZE}
              fontWeight="600"
            >
              {label.toLowerCase()}
            </text>
          );
        }
      }
      return labels;
    }, [dimensions.height, COLUMN_LABEL_FONT_SIZE]);

    const railCols = useMemo(() => {
      const pivot = { x: dimensions.width / 2, y: dimensions.height / 2 };

      const pickTopCol = (colA: number, colB: number): { top: number; bottom: number } => {
        // Compare the rotated positions of the two rail columns. Smaller rotated Y is closer to
        // the top of the screen.
        const aLocal = positionToPixels({ row: 0, col: colA });
        const bLocal = positionToPixels({ row: 0, col: colB });

        const a = rotatePoint(aLocal, orientation, pivot);
        const b = rotatePoint(bLocal, orientation, pivot);

        if (a.y === b.y) {
          // Tie-breaker: keep a stable ordering.
          return a.x <= b.x ? { top: colA, bottom: colB } : { top: colB, bottom: colA };
        }

        return a.y < b.y ? { top: colA, bottom: colB } : { top: colB, bottom: colA };
      };

      return {
        left: pickTopCol(BreadboardLayout.RAIL_LEFT_POSITIVE, BreadboardLayout.RAIL_LEFT_NEGATIVE),
        right: pickTopCol(
          BreadboardLayout.RAIL_RIGHT_POSITIVE,
          BreadboardLayout.RAIL_RIGHT_NEGATIVE
        ),
      };
    }, [dimensions.width, dimensions.height, orientation]);

    // Render rail labels
    const railLabels = useMemo(() => {
      // Place symbols between the stripes (aligned to the rail hole columns), not on top of stripes.
      const topLeft = positionToPixels({ row: 0, col: railCols.left.top });
      const bottomLeft = positionToPixels({ row: 0, col: railCols.left.bottom });
      const topRight = positionToPixels({ row: 0, col: railCols.right.top });
      const bottomRight = positionToPixels({ row: 0, col: railCols.right.bottom });

      const topY = HEADER_HEIGHT - 10;
      const bottomY = dimensions.height - FOOTER_HEIGHT + 16;

      const commonProps = {
        textAnchor: 'middle' as const,
        dominantBaseline: 'middle' as const,
        fontSize: RAIL_SYMBOL_FONT_SIZE,
        fontWeight: 700,
        fontFamily: BreadboardSkin.geometry.labelFontFamily,
      };

      return (
        <>
          {/* Left rail block */}
          <text x={topLeft.x} y={topY} fill={BreadboardSkin.colors.railRed} {...commonProps}>
            +
          </text>
          <text x={bottomLeft.x} y={topY} fill={BreadboardSkin.colors.railBlue} {...commonProps}>
            −
          </text>
          <text x={topLeft.x} y={bottomY} fill={BreadboardSkin.colors.railRed} {...commonProps}>
            +
          </text>
          <text x={bottomLeft.x} y={bottomY} fill={BreadboardSkin.colors.railBlue} {...commonProps}>
            −
          </text>

          {/* Right rail block */}
          <text x={topRight.x} y={topY} fill={BreadboardSkin.colors.railRed} {...commonProps}>
            +
          </text>
          <text x={bottomRight.x} y={topY} fill={BreadboardSkin.colors.railBlue} {...commonProps}>
            −
          </text>
          <text x={topRight.x} y={bottomY} fill={BreadboardSkin.colors.railRed} {...commonProps}>
            +
          </text>
          <text x={bottomRight.x} y={bottomY} fill={BreadboardSkin.colors.railBlue} {...commonProps}>
            −
          </text>
        </>
      );
    }, [dimensions.height, RAIL_SYMBOL_FONT_SIZE, railCols]);

    // Render center trench (recessed channel)
    const centerDivider = useMemo(() => {
      // Compute trench center from the boundary between E (col 6) and F (col 7).
      // Using the centers keeps this correct even when gutters are applied.
      const leftEdge =
        positionToPixels({ row: 0, col: BreadboardLayout.STRIP_LEFT_END }).x + HOLE_SPACING / 2;
      const rightEdge =
        positionToPixels({ row: 0, col: BreadboardLayout.STRIP_RIGHT_START }).x - HOLE_SPACING / 2;
      const centerX = (leftEdge + rightEdge) / 2;
      return (
        <g>
          <rect
            x={centerX - BreadboardSkin.geometry.trenchWidthPx / 2}
            y={0}
            width={BreadboardSkin.geometry.trenchWidthPx}
            height={dimensions.height}
            fill={BreadboardSkin.colors.trenchBase}
          />
          {/* inner shadows to suggest depth */}
          <rect
            x={centerX - BreadboardSkin.geometry.trenchWidthPx / 2}
            y={0}
            width={2}
            height={dimensions.height}
            fill={BreadboardSkin.colors.trenchShadow}
            opacity={0.28}
          />
          <rect
            x={centerX + BreadboardSkin.geometry.trenchWidthPx / 2 - 2}
            y={0}
            width={2}
            height={dimensions.height}
            fill={BreadboardSkin.colors.trenchShadow}
            opacity={0.18}
          />
        </g>
      );
    }, [dimensions.height]);

    return (
      <svg
        className="breadboard-svg"
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block' }}
      >
        <defs>
          {/* Plastic base gradient */}
          <linearGradient id="bb-plastic" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BreadboardSkin.colors.plasticHighlight} />
            <stop offset="45%" stopColor={BreadboardSkin.colors.plasticBase} />
            <stop offset="100%" stopColor={BreadboardSkin.colors.plasticShadow} />
          </linearGradient>

          {/* Hole bevel gradient (light from upper-left) */}
          <linearGradient id="bb-hole-bevel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BreadboardSkin.colors.holeBevelLight} />
            <stop offset="55%" stopColor={BreadboardSkin.colors.holeBevelMid} />
            <stop offset="100%" stopColor={BreadboardSkin.colors.holeCavityEdge} />
          </linearGradient>

          {/* Clip interior artwork to the rounded body so stripes/panels don't protrude into corners */}
          <clipPath id="bb-body-clip">
            <rect
              x={BreadboardSkin.geometry.bodyInset}
              y={BreadboardSkin.geometry.bodyInset}
              width={dimensions.width - BreadboardSkin.geometry.bodyInset * 2}
              height={dimensions.height - BreadboardSkin.geometry.bodyInset * 2}
              rx={BreadboardSkin.geometry.bodyCornerRadius}
            />
          </clipPath>

          {/* Define hole symbol for reuse (centered at 0,0; <use x/y> places at hole center) */}
          <g id="breadboard-hole">
            {(() => {
              const outer = HOLE_SPACING * BreadboardSkin.geometry.holeOuterSizeRatio;
              const inner = HOLE_SPACING * BreadboardSkin.geometry.holeInnerSizeRatio;
              const outerR = outer * BreadboardSkin.geometry.holeOuterRadiusRatio;
              const innerR = inner * BreadboardSkin.geometry.holeInnerRadiusRatio;

              return (
                <>
                  {/* subtle ambient shadow */}
                  <rect
                    x={-outer / 2 + 0.6}
                    y={-outer / 2 + 0.9}
                    width={outer}
                    height={outer}
                    rx={outerR}
                    fill="#000"
                    opacity={0.12}
                  />

                  {/* bevel ring */}
                  <rect
                    x={-outer / 2}
                    y={-outer / 2}
                    width={outer}
                    height={outer}
                    rx={outerR}
                    fill="url(#bb-hole-bevel)"
                    stroke={BreadboardSkin.colors.plasticShadow}
                    strokeWidth={BreadboardSkin.geometry.holeOuterStrokeWidth}
                  />

                  {/* cavity */}
                  <rect
                    x={-inner / 2}
                    y={-inner / 2}
                    width={inner}
                    height={inner}
                    rx={innerR}
                    fill={BreadboardSkin.colors.holeCavity}
                    stroke={BreadboardSkin.colors.holeCavityEdge}
                    strokeWidth={BreadboardSkin.geometry.holeInnerStrokeWidth}
                  />

                  {/* tiny highlight at upper-left rim */}
                  <rect
                    x={-outer / 2 + 1.2}
                    y={-outer / 2 + 1.2}
                    width={outer * 0.35}
                    height={outer * 0.12}
                    rx={outerR}
                    fill={BreadboardSkin.colors.plasticHighlight}
                    opacity={0.45}
                  />
                </>
              );
            })()}
          </g>
        </defs>

        {/* Subtle body border / depth hint */}
        <rect
          x={BreadboardSkin.geometry.bodyInset + 0.8}
          y={BreadboardSkin.geometry.bodyInset + 1.0}
          width={dimensions.width - BreadboardSkin.geometry.bodyInset * 2}
          height={dimensions.height - BreadboardSkin.geometry.bodyInset * 2}
          rx={BreadboardSkin.geometry.bodyCornerRadius}
          fill="none"
          stroke={BreadboardSkin.colors.outlineShadow}
          strokeWidth={2}
          opacity={0.07}
        />

        {/* Plastic body */}
        <rect
          x={BreadboardSkin.geometry.bodyInset}
          y={BreadboardSkin.geometry.bodyInset}
          width={dimensions.width - BreadboardSkin.geometry.bodyInset * 2}
          height={dimensions.height - BreadboardSkin.geometry.bodyInset * 2}
          rx={BreadboardSkin.geometry.bodyCornerRadius}
          fill="url(#bb-plastic)"
          stroke={BreadboardSkin.colors.plasticShadow}
          strokeWidth={1}
          opacity={0.98}
        />

        {/* faint inner highlight to imply bevel */}
        <rect
          x={BreadboardSkin.geometry.bodyInset + 0.8}
          y={BreadboardSkin.geometry.bodyInset + 0.8}
          width={dimensions.width - BreadboardSkin.geometry.bodyInset * 2 - 1.6}
          height={dimensions.height - BreadboardSkin.geometry.bodyInset * 2 - 1.6}
          rx={Math.max(0, BreadboardSkin.geometry.bodyCornerRadius - 1)}
          fill="none"
          stroke={BreadboardSkin.colors.plasticHighlight}
          strokeWidth={1}
          opacity={0.18}
        />

        <g clipPath="url(#bb-body-clip)">
          {/* Sub-panels: rail blocks and terminal region (very subtle) */}
          {(() => {
            const rightRailStartCol = Math.min(
              BreadboardLayout.RAIL_RIGHT_POSITIVE,
              BreadboardLayout.RAIL_RIGHT_NEGATIVE
            );
            const leftRailX =
              positionToPixels({ row: 0, col: BreadboardLayout.RAIL_LEFT_NEGATIVE }).x -
              HOLE_SPACING / 2;
            const stripX =
              positionToPixels({ row: 0, col: BreadboardLayout.STRIP_LEFT_START }).x -
              HOLE_SPACING / 2;
            const rightRailX =
              positionToPixels({ row: 0, col: rightRailStartCol }).x -
              HOLE_SPACING / 2;

            return (
              <>
                <rect
                  x={leftRailX}
                  y={0}
                  width={2 * HOLE_SPACING}
                  height={dimensions.height}
                  fill={BreadboardSkin.colors.panelSlightDark}
                  opacity={0.6}
                />
                <rect
                  x={stripX}
                  y={0}
                  width={10 * HOLE_SPACING}
                  height={dimensions.height}
                  fill={BreadboardSkin.colors.panelSlightLight}
                  opacity={0.55}
                />
                <rect
                  x={rightRailX}
                  y={0}
                  width={2 * HOLE_SPACING}
                  height={dimensions.height}
                  fill={BreadboardSkin.colors.panelSlightDark}
                  opacity={0.6}
                />
              </>
            );
          })()}

          {/* Rail stripes (printed) */}
          {(() => {
            const leftRailStartCol = Math.min(
              BreadboardLayout.RAIL_LEFT_POSITIVE,
              BreadboardLayout.RAIL_LEFT_NEGATIVE
            );
            const leftRailEndCol = Math.max(
              BreadboardLayout.RAIL_LEFT_POSITIVE,
              BreadboardLayout.RAIL_LEFT_NEGATIVE
            );

            const rightRailStartCol = Math.min(
              BreadboardLayout.RAIL_RIGHT_POSITIVE,
              BreadboardLayout.RAIL_RIGHT_NEGATIVE
            );
            const rightRailEndCol = Math.max(
              BreadboardLayout.RAIL_RIGHT_POSITIVE,
              BreadboardLayout.RAIL_RIGHT_NEGATIVE
            );

            const railBlockWidth = 2 * HOLE_SPACING;
            const leftX = positionToPixels({ row: 0, col: leftRailStartCol }).x - HOLE_SPACING / 2;
            const rightX =
              positionToPixels({ row: 0, col: rightRailStartCol }).x -
              HOLE_SPACING / 2;

            const stripeW = BreadboardSkin.geometry.railStripeWidth;
            const inset = BreadboardSkin.geometry.railStripeInset;

            const stripeXForCol = (
              blockX: number,
              startCol: number,
              endCol: number,
              col: number
            ): number => {
              // Stripes are inset from the rail block edges. Choose left-vs-right stripe based on
              // whether this column is the start or end of the 2-column rail block.
              const isStart = col === startCol;
              const isEnd = col === endCol;
              const offsetFromBlock = isEnd && !isStart ? railBlockWidth - inset : inset;
              return blockX + offsetFromBlock - stripeW / 2;
            };

            return (
              <>
                {/* Left rail block stripes */}
                <rect
                  x={stripeXForCol(
                    leftX,
                    leftRailStartCol,
                    leftRailEndCol,
                    railCols.left.top
                  )}
                  y={0}
                  width={stripeW}
                  height={dimensions.height}
                  fill={BreadboardSkin.colors.railRed}
                />
                <rect
                  x={stripeXForCol(
                    leftX,
                    leftRailStartCol,
                    leftRailEndCol,
                    railCols.left.bottom
                  )}
                  y={0}
                  width={stripeW}
                  height={dimensions.height}
                  fill={BreadboardSkin.colors.railBlue}
                />

                {/* Right rail block stripes */}
                <rect
                  x={stripeXForCol(
                    rightX,
                    rightRailStartCol,
                    rightRailEndCol,
                    railCols.right.top
                  )}
                  y={0}
                  width={stripeW}
                  height={dimensions.height}
                  fill={BreadboardSkin.colors.railRed}
                />
                <rect
                  x={stripeXForCol(
                    rightX,
                    rightRailStartCol,
                    rightRailEndCol,
                    railCols.right.bottom
                  )}
                  y={0}
                  width={stripeW}
                  height={dimensions.height}
                  fill={BreadboardSkin.colors.railBlue}
                />
              </>
            );
          })()}

          {/* Center trench */}
          {centerDivider}

          {/* Highlight overlay (rendered before holes) */}
          {interactive && highlightBounds && (
            <rect
              x={highlightBounds.x}
              y={highlightBounds.y}
              width={highlightBounds.width}
              height={highlightBounds.height}
              fill={BreadboardSkin.colors.hoverFill}
              opacity={0.2}
              stroke={BreadboardSkin.colors.hoverFill}
              strokeWidth={2}
              rx={4}
            />
          )}

          {/* Holes (using symbol reuse) */}
          {holePositions.map((pos) => {
            const { x, y } = positionToPixels(pos);
            return <use key={`hole-${pos.row}-${pos.col}`} href="#breadboard-hole" x={x} y={y} />;
          })}

          {/* Labels (row/column/rail). Kept in a dedicated group so tests can hide/mask them to
            avoid cross-environment font rendering diffs in screenshots. */}
          <g data-testid="breadboard-labels">
            {showLabels ? rowLabels : null}
            {showLabels ? columnLabels : null}
            {showLabels ? railLabels : null}
          </g>
        </g>

        {/* Single transparent overlay for event handling (only when interactive) */}
        {interactive && (
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
        )}
      </svg>
    );
  }
);

BreadboardSvg.displayName = 'BreadboardSvg';
