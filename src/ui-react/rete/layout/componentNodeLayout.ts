import { ComponentType } from '@/core/types';

export const DEFAULT_COMPONENT_NODE_SIZE = {
  width: 100,
  height: 60,
} as const;

export function getComponentLegPositionsInNode(options: {
  type: ComponentType;
  legs: number;
  width: number;
  height: number;
}): Array<{ x: number; y: number }> {
  const { type, legs, width, height } = options;

  // Some reasonable defaults (pixels within the node box).
  const inset = 10;

  switch (type) {
    case ComponentType.LED:
      // Two pins at the bottom.
      return [
        { x: width * 0.35, y: height - inset },
        { x: width * 0.65, y: height - inset },
      ].slice(0, legs);

    case ComponentType.RESISTOR:
      // Two pins on the long sides.
      return [
        { x: inset, y: height * 0.5 },
        { x: width - inset, y: height * 0.5 },
      ].slice(0, legs);

    case ComponentType.POWER_SUPPLY:
      // Two pins on one side (left): + and GND.
      return [
        { x: inset, y: height * 0.4 },
        { x: inset, y: height * 0.6 },
      ].slice(0, legs);

    case ComponentType.SWITCH:
      if (legs <= 2) {
        // Legacy SPST (2 terminals).
        return [
          { x: inset, y: height * 0.5 },
          { x: width - inset, y: height * 0.5 },
        ].slice(0, legs);
      }

      // 4-pin tactile style: two on top, two on bottom.
      return [
        { x: width * 0.35, y: inset },
        { x: width * 0.65, y: inset },
        { x: width * 0.35, y: height - inset },
        { x: width * 0.65, y: height - inset },
      ].slice(0, legs);

    case ComponentType.GROUND:
      return [{ x: width * 0.5, y: height - inset }].slice(0, legs);

    case ComponentType.MICROPROCESSOR: {
      // DIP-ish: 8 pins on left + 8 on right.
      const leftCount = Math.min(8, legs);
      const rightCount = Math.max(0, Math.min(8, legs - leftCount));

      const spacingL = leftCount > 1 ? (height - 2 * inset) / (leftCount - 1) : 0;
      const spacingR = rightCount > 1 ? (height - 2 * inset) / (rightCount - 1) : 0;

      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < leftCount; i++) {
        pts.push({ x: inset, y: inset + i * spacingL });
      }
      for (let i = 0; i < rightCount; i++) {
        pts.push({ x: width - inset, y: inset + i * spacingR });
      }
      return pts;
    }

    default: {
      // Generic: stack down the right edge.
      const count = Math.max(1, legs);
      const spacing = count > 1 ? (height - 2 * inset) / (count - 1) : 0;
      return Array.from({ length: count }, (_, i) => ({
        x: width - inset,
        y: inset + i * spacing,
      }));
    }
  }
}

/**
 * Returns the centroid of the pin socket positions within the node.
 *
 * IMPORTANT: This must match the socket layout used by `ComponentNodeRenderer`.
 * We use it as the node's anchor when syncing position and when snapping pins after a drag.
 */
export function getComponentLegAnchorInNode(options: {
  type: ComponentType;
  legs: number;
  width: number;
  height: number;
}): { x: number; y: number } {
  const pts = getComponentLegPositionsInNode(options);
  if (!pts.length) return { x: options.width / 2, y: options.height / 2 };

  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}
