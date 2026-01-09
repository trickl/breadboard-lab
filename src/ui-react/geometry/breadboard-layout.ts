/**
 * Breadboard geometry helpers for SVG rendering
 * Pure functions for coordinate mapping and hit detection
 */

import { BreadboardLayout } from '@/core/breadboard-layout';
import type { Position } from '@/core/types';

/**
 * Geometry constants matching the original renderer specifications
 */
export const HOLE_SIZE = 20;
export const HOLE_MARGIN = 3;
export const HOLE_SPACING = HOLE_SIZE + HOLE_MARGIN * 2; // 26px
export const HOLE_VISUAL_RADIUS = 7; // Visual appearance
export const LABEL_PADDING_X = 20;
export const LABEL_PADDING_Y = 25;

/**
 * Convert grid position to world coordinates (pixel position)
 */
export function positionToPixels(pos: Position): { x: number; y: number } {
  return {
    x: pos.col * HOLE_SPACING + HOLE_SPACING / 2,
    y: pos.row * HOLE_SPACING + HOLE_SPACING / 2,
  };
}

/**
 * Convert world coordinates (pixels) to nearest grid position
 */
export function pixelsToPosition(x: number, y: number): Position {
  return {
    col: Math.round((x - HOLE_SPACING / 2) / HOLE_SPACING),
    row: Math.round((y - HOLE_SPACING / 2) / HOLE_SPACING),
  };
}

/**
 * Check if a position is valid on the breadboard
 */
export function isValidPosition(pos: Position): boolean {
  return BreadboardLayout.isValidPosition(pos);
}

/**
 * Get all hole positions on the breadboard
 */
export function getAllHolePositions(): Position[] {
  const holes: Position[] = [];
  for (let row = 0; row < BreadboardLayout.ROWS; row++) {
    for (let col = 0; col < BreadboardLayout.TOTAL_COLS; col++) {
      holes.push({ row, col });
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
    minRow = Math.min(minRow, p.row);
    maxRow = Math.max(maxRow, p.row);
    minCol = Math.min(minCol, p.col);
    maxCol = Math.max(maxCol, p.col);
  }

  // Convert to pixel bounds with padding
  const padding = 4;
  const x = minCol * HOLE_SPACING - padding;
  const y = minRow * HOLE_SPACING - padding;
  const width = (maxCol - minCol + 1) * HOLE_SPACING + padding * 2;
  const height = (maxRow - minRow + 1) * HOLE_SPACING + padding * 2;

  return { x, y, width, height };
}

/**
 * Get breadboard dimensions in pixels
 */
export function getBreadboardDimensions(): { width: number; height: number } {
  return {
    width: BreadboardLayout.TOTAL_COLS * HOLE_SPACING,
    height: BreadboardLayout.ROWS * HOLE_SPACING,
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
