/**
 * Breadboard geometry helpers for SVG rendering
 * Pure functions for coordinate mapping and hit detection
 */

import { BreadboardLayout } from '@/core/breadboard-layout';
import type { Position } from '@/core/types';

import { BreadboardSkin, isHoleVisible } from '../skins/breadboard-skin';

/**
 * Geometry constants matching the original renderer specifications
 */
export const HOLE_SIZE = 20;
export const HOLE_MARGIN = 3;
export const HOLE_SPACING = HOLE_SIZE + HOLE_MARGIN * 2; // 26px

/**
 * Label/padding sizes.
 *
 * The reference photo has printed labels in a header/footer band and
 * enough gutter between rails and strips so row numbers do not overlap holes.
 */
export const HEADER_HEIGHT = 28;
export const FOOTER_HEIGHT = 28;
export const RAIL_STRIP_GUTTER = 20;
export const OUTER_PADDING_X = 10;

export const LABEL_PADDING_X = 20;
export const LABEL_PADDING_Y = 25;

const GRID_OFFSET_X = OUTER_PADDING_X;
const GRID_OFFSET_Y = HEADER_HEIGHT;

function getGridHeightPx(): number {
  return BreadboardLayout.ROWS * HOLE_SPACING;
}

function railRowToCenterY(railRow: number): number {
  const railRows = BreadboardSkin.geometry.railHoleRows;
  const clusterSize = BreadboardSkin.geometry.railClusterSize;
  const clusterCount = Math.ceil(railRows / clusterSize);
  const clusterGapPx = Math.round(HOLE_SPACING * BreadboardSkin.geometry.railClusterGapRatio);

  const totalRailHeight = railRows * HOLE_SPACING + (clusterCount - 1) * clusterGapPx;
  const topMargin = Math.max(0, (getGridHeightPx() - totalRailHeight) / 2);

  const clusterIndex = Math.floor(railRow / clusterSize);
  const yWithin = railRow * HOLE_SPACING + clusterIndex * clusterGapPx;

  return GRID_OFFSET_Y + topMargin + yWithin + HOLE_SPACING / 2;
}

function getRailRowCentersY(): number[] {
  const centers: number[] = [];
  for (let r = 0; r < BreadboardSkin.geometry.railHoleRows; r++) {
    centers.push(railRowToCenterY(r));
  }
  return centers;
}

function colExtraOffset(col: number): number {
  // Add a gutter between left rails (cols 0–1) and terminal strips (col 2+)
  // and between terminal strips (col 2–11) and right rails (col 12–13).
  const rightRailStartCol = Math.min(
    BreadboardLayout.RAIL_RIGHT_POSITIVE,
    BreadboardLayout.RAIL_RIGHT_NEGATIVE
  );
  let extra = 0;
  if (col >= BreadboardLayout.STRIP_LEFT_START) {
    extra += RAIL_STRIP_GUTTER;
  }
  if (col >= rightRailStartCol) {
    extra += RAIL_STRIP_GUTTER;
  }
  return extra;
}

function colToCenterX(col: number): number {
  return GRID_OFFSET_X + col * HOLE_SPACING + colExtraOffset(col) + HOLE_SPACING / 2;
}

function colToLeftX(col: number): number {
  return colToCenterX(col) - HOLE_SPACING / 2;
}

function getColumnCenters(): number[] {
  const centers: number[] = [];
  for (let col = 0; col < BreadboardLayout.TOTAL_COLS; col++) {
    centers.push(colToCenterX(col));
  }
  return centers;
}

/**
 * Convert grid position to world coordinates (pixel position)
 */
export function positionToPixels(pos: Position): { x: number; y: number } {
  if (BreadboardLayout.isPositionInRail(pos)) {
    return {
      x: colToCenterX(pos.col),
      y: railRowToCenterY(pos.row),
    };
  }

  return {
    x: colToCenterX(pos.col),
    y: GRID_OFFSET_Y + pos.row * HOLE_SPACING + HOLE_SPACING / 2,
  };
}

/**
 * Convert world coordinates (pixels) to nearest grid position
 */
export function pixelsToPosition(x: number, y: number): Position {
  // Columns have non-uniform spacing due to gutters; find nearest center.
  const centers = getColumnCenters();
  let bestCol = 0;
  let bestDist = Infinity;
  for (let col = 0; col < centers.length; col++) {
    const d = Math.abs(x - centers[col]);
    if (d < bestDist) {
      bestDist = d;
      bestCol = col;
    }
  }

  // Rows differ for rails (25 clustered holes) vs terminal grid (30 uniform rows).
  if (
    bestCol === BreadboardLayout.RAIL_LEFT_NEGATIVE ||
    bestCol === BreadboardLayout.RAIL_LEFT_POSITIVE ||
    bestCol === BreadboardLayout.RAIL_RIGHT_POSITIVE ||
    bestCol === BreadboardLayout.RAIL_RIGHT_NEGATIVE
  ) {
    const railCentersY = getRailRowCentersY();
    let bestRow = 0;
    let bestY = Infinity;
    for (let r = 0; r < railCentersY.length; r++) {
      const d = Math.abs(y - railCentersY[r]);
      if (d < bestY) {
        bestY = d;
        bestRow = r;
      }
    }
    return { col: bestCol, row: bestRow };
  }

  const row = Math.round((y - GRID_OFFSET_Y - HOLE_SPACING / 2) / HOLE_SPACING);
  return { col: bestCol, row };
}

/**
 * Check if a position is valid on the breadboard
 */
export function isValidPosition(pos: Position): boolean {
  return isHoleVisible(pos);
}

/**
 * Get all hole positions on the breadboard
 */
export function getAllHolePositions(): Position[] {
  const holes: Position[] = [];
  for (let row = 0; row < BreadboardLayout.ROWS; row++) {
    for (let col = 0; col < BreadboardLayout.TOTAL_COLS; col++) {
      const pos = { row, col };
      if (isHoleVisible(pos)) {
        holes.push(pos);
      }
    }
  }
  return holes;
}

/**
 * Get the bounds of a connected region for highlighting
 * Returns pixel coordinates for the bounding rectangle
 */
export function getConnectedRegionBounds(
  pos: Position
): { x: number; y: number; width: number; height: number } | null {
  if (!isValidPosition(pos)) {
    return null;
  }

  // Rails: highlight only the contiguous visible segment (rails are split by physical gaps).
  if (BreadboardLayout.isPositionInRail(pos)) {
    const padding = 4;

    // Default: highlight the full visible rail column (25 holes), even though they are clustered.
    const minRow = 0;
    const maxRow = BreadboardSkin.geometry.railHoleRows - 1;

    const top = railRowToCenterY(minRow) - HOLE_SPACING / 2;
    const bottom = railRowToCenterY(maxRow) + HOLE_SPACING / 2;

    const x = colToLeftX(pos.col) - padding;
    const y = top - padding;
    const width = HOLE_SPACING + padding * 2;
    const height = bottom - top + padding * 2;

    return { x, y, width, height };
  }

  const connectedPositions = BreadboardLayout.getConnectedPositions(pos);
  if (connectedPositions.length === 0) {
    return null;
  }

  // Find bounds
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  for (const p of connectedPositions) {
    // Defensive: core layout can include positions that are not visually present (e.g. rail gaps).
    if (!isHoleVisible(p)) {
      continue;
    }
    minRow = Math.min(minRow, p.row);
    maxRow = Math.max(maxRow, p.row);
    minCol = Math.min(minCol, p.col);
    maxCol = Math.max(maxCol, p.col);
  }

  if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) {
    return null;
  }

  // Convert to pixel bounds with padding
  const padding = 4;
  const x = colToLeftX(minCol) - padding;
  const y = GRID_OFFSET_Y + minRow * HOLE_SPACING - padding;

  // Width must account for non-uniform column spacing.
  const rightEdge = colToLeftX(maxCol) + HOLE_SPACING;
  const width = rightEdge - colToLeftX(minCol) + padding * 2;
  const height = (maxRow - minRow + 1) * HOLE_SPACING + padding * 2;

  return { x, y, width, height };
}

/**
 * Get breadboard dimensions in pixels
 */
export function getBreadboardDimensions(): { width: number; height: number } {
  const width =
    GRID_OFFSET_X +
    BreadboardLayout.TOTAL_COLS * HOLE_SPACING +
    // two gutters: left rails→strip, strip→right rails
    RAIL_STRIP_GUTTER * 2 +
    // symmetric outer padding
    OUTER_PADDING_X;
  const height = GRID_OFFSET_Y + BreadboardLayout.ROWS * HOLE_SPACING + FOOTER_HEIGHT;

  return {
    width,
    height,
  };
}

/**
 * Get column label for terminal strip column
 */
export function getColumnLabel(col: number): string | null {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const stripIndex = col - BreadboardLayout.STRIP_LEFT_START;
  if (stripIndex >= 0 && stripIndex < labels.length) {
    return labels[stripIndex];
  }
  return null;
}

/**
 * Get row label (1-indexed)
 */
export function getRowLabel(row: number): string {
  return String(row + 1);
}
