import type { Position } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';

/**
 * Helper function to get component center
 */
export function getComponentCenter(positions: Position[]): Position {
  if (positions.length === 0) {
    return { row: 0, col: 0 };
  }
  if (positions.length === 1) {
    return positions[0];
  }

  const avgRow = positions.reduce((sum, p) => sum + p.row, 0) / positions.length;
  const avgCol = positions.reduce((sum, p) => sum + p.col, 0) / positions.length;

  return { row: avgRow, col: avgCol };
}

export function getComponentBoundsPixels(
  positions: Position[]
): { cx: number; cy: number; r: number } | null {
  if (!positions.length) return null;

  const pixels = positions.map(positionToPixels);
  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const halfW = (maxX - minX) / 2;
  const halfH = (maxY - minY) / 2;

  // A little generous so you can grab the part without pixel-hunting.
  const padding = 18;
  const unclamped = Math.max(halfW, halfH) + padding;
  const r = Math.max(22, Math.min(60, unclamped));

  return { cx, cy, r };
}
