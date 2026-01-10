import type { Position } from '@/core/types';
import { getBreadboardDimensions, positionToPixels, LABEL_PADDING_X, LABEL_PADDING_Y } from '@/ui-react/geometry/breadboard-layout';

export type BoardRotation = 0 | 90 | 180 | 270;

// Intrinsic rotation applied to the breadboard substrate so the default (userRotation=0)
// appears as a horizontal (landscape) rectangle.
//
// Our underlying geometry is defined in a portrait coordinate system (height > width).
// Rotating it by 90° (CW) produces the expected landscape board.
const INTRINSIC_ROTATION: BoardRotation = 90;

export interface BreadboardWorld {
  /** User-requested rotation (e.g. UI orientation), not including intrinsic substrate rotation. */
  rotation: BoardRotation;
  /** Rotation actually applied to the substrate in world space (intrinsic + user). */
  combinedRotation: BoardRotation;
  /** Native (unrotated) substrate dimensions (what BreadboardSvg renders at). */
  nativeDimensions: { width: number; height: number };
  /** Axis-aligned bounding box of the rotated substrate (no label padding). */
  dimensions: { width: number; height: number };
  /** Total world extents including label padding. */
  total: { width: number; height: number };
  /** Native substrate pivot (center) in local coordinates. */
  pivotLocal: { x: number; y: number };
  /** Offset applied after rotation to keep the rotated bounding box in positive coordinates. */
  rotatedOffset: { x: number; y: number };
  /** CSS transform used to render the native substrate into the rotated bounding box. */
  substrateTransform: string;
}

function normalizeRotation(deg: number): BoardRotation {
  const d = ((deg % 360) + 360) % 360;
  switch (d) {
    case 0:
    case 90:
    case 180:
    case 270:
      return d;
    default:
      // Should never happen with our BoardRotation inputs.
      return 0;
  }
}

function getRotatedRectBounds(
  width: number,
  height: number,
  rotation: BoardRotation
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (rotation === 0) {
    return { minX: 0, minY: 0, maxX: width, maxY: height, width, height };
  }

  const pivot = { x: width / 2, y: height / 2 };
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ].map((p) => rotatePoint(p, rotation, pivot));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of corners) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function rotatePoint(
  point: { x: number; y: number },
  rotation: BoardRotation,
  pivot: { x: number; y: number }
): { x: number; y: number } {
  if (rotation === 0) return point;

  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;

  switch (rotation) {
    case 90:
      // 90° CW: (x,y) -> (y,-x)
      return { x: pivot.x + dy, y: pivot.y - dx };
    case 180:
      return { x: pivot.x - dx, y: pivot.y - dy };
    case 270:
      // 270° CW: (x,y) -> (-y, x)
      return { x: pivot.x - dy, y: pivot.y + dx };
    default:
      return point;
  }
}

export function getBreadboardWorld(rotation: BoardRotation): BreadboardWorld {
  const nativeDimensions = getBreadboardDimensions();
  const combinedRotation = normalizeRotation(INTRINSIC_ROTATION + rotation);

  const pivotLocal = {
    x: nativeDimensions.width / 2,
    y: nativeDimensions.height / 2,
  };

  const rotatedBounds = getRotatedRectBounds(
    nativeDimensions.width,
    nativeDimensions.height,
    combinedRotation
  );

  // After rotating around the native center, translate so the rotated AABB's top-left is (0,0).
  const rotatedOffset = {
    x: -rotatedBounds.minX,
    y: -rotatedBounds.minY,
  };

  const dimensions = {
    width: rotatedBounds.width,
    height: rotatedBounds.height,
  };

  const total = {
    width: dimensions.width + LABEL_PADDING_X * 2,
    height: dimensions.height + LABEL_PADDING_Y * 2,
  };

  // CSS transform list applies right-to-left, so this performs rotate() first, then translate().
  // This matches our point mapping: p' = translate( rotate(p) ).
  const substrateTransform =
    combinedRotation === 0
      ? `translate(${rotatedOffset.x}px, ${rotatedOffset.y}px)`
      : `translate(${rotatedOffset.x}px, ${rotatedOffset.y}px) rotate(${combinedRotation}deg)`;

  return {
    rotation,
    combinedRotation,
    nativeDimensions,
    dimensions,
    total,
    pivotLocal,
    rotatedOffset,
    substrateTransform,
  };
}

/**
 * Map a breadboard grid position to world coordinates used by the unified viewport.
 * Includes label padding and optional board rotation.
 */
export function positionToWorld(pos: Position, rotation: BoardRotation): { x: number; y: number } {
  const world = getBreadboardWorld(rotation);
  const local = positionToPixels(pos);
  const rotated = rotatePoint(local, world.combinedRotation, world.pivotLocal);

  return {
    x: LABEL_PADDING_X + rotated.x + world.rotatedOffset.x,
    y: LABEL_PADDING_Y + rotated.y + world.rotatedOffset.y,
  };
}
