import { ComponentType } from '@/core/types';
import { HOLE_SPACING } from '@/ui-react/geometry/breadboard-layout';

export const DEFAULT_COMPONENT_NODE_SIZE = {
  width: 100,
  height: 60,
} as const;

const MIN_NODE_W = DEFAULT_COMPONENT_NODE_SIZE.width;
const MIN_NODE_H = DEFAULT_COMPONENT_NODE_SIZE.height;

// Keep sockets comfortably inside the node box so the anchor math remains stable.
// (Sockets themselves can still overflow visually because the renderer uses `overflow: visible`.)
const SOCKET_INSET_PX = 16;

/**
 * Returns the default node size used for rendering + anchoring + snapping.
 *
 * IMPORTANT: Any place that computes a leg anchor must use the SAME width/height.
 */
export function getDefaultComponentNodeSize(options: {
  type: ComponentType;
  legs: number;
}): { width: number; height: number } {
  const { type } = options;

  switch (type) {
    case ComponentType.LED: {
      // LEDs are visually tall (bulb above the board, legs down into the board).
      // Our SVG LED icon is scaled by leg spacing (0.1" pitch), so it can easily overflow a
      // short default node. Give it a taller box so the bulb is inside the node outline and the
      // drag hotspot can live on the bulb rather than the legs.
      //
      // Use pitch-based sizing so it stays consistent with other geometry changes.
      return {
        // The LED icon in `src/images/led-red.svg` is 64×128 in its own viewBox, and we scale it
        // so its 16px anchor spacing maps to one breadboard pitch (HOLE_SPACING = 26px).
        // That yields an on-board visual size of ~104×208, so match the node box to that.
        width: 4 * HOLE_SPACING,
        height: 8 * HOLE_SPACING,
      };
    }

    case ComponentType.RESISTOR: {
      // Default: 5-hole span (5 × 0.1" pitch).
      const spanPx = 5 * HOLE_SPACING;
      return {
        width: Math.max(MIN_NODE_W, spanPx + SOCKET_INSET_PX * 2),
        height: MIN_NODE_H,
      };
    }

    default:
      return { width: MIN_NODE_W, height: MIN_NODE_H };
  }
}

export function getComponentLegPositionsInNode(options: {
  type: ComponentType;
  legs: number;
  width: number;
  height: number;
}): Array<{ x: number; y: number }> {
  const { type, legs, width, height } = options;

  const inset = SOCKET_INSET_PX;
  const cx = width / 2;
  const cy = height / 2;
  const pitch = HOLE_SPACING;

  switch (type) {
    case ComponentType.LED:
      // Through-hole LED legs are typically 0.1" (2.54mm) apart.
      // Render legs 1 breadboard pitch apart.
      return [
        { x: cx - pitch / 2, y: height - inset },
        { x: cx + pitch / 2, y: height - inset },
      ].slice(0, legs);

    case ComponentType.RESISTOR:
      // Default: 5 holes apart (5 × 0.1" pitch). Keep centered.
      return [
        { x: cx - (5 * pitch) / 2, y: cy },
        { x: cx + (5 * pitch) / 2, y: cy },
      ].slice(0, legs);

    case ComponentType.POWER_SUPPLY:
      // Two pins on one side (left): + and GND.
      // Render 1 breadboard pitch apart.
      return [
        { x: inset, y: cy - pitch / 2 },
        { x: inset, y: cy + pitch / 2 },
      ].slice(0, legs);

    case ComponentType.SWITCH:
      if (legs <= 2) {
        // Legacy SPST (2 terminals).
        return [
          { x: inset, y: cy },
          { x: width - inset, y: cy },
        ].slice(0, legs);
      }

      // Default tactile: 3x3 grid corners (2 pitches apart in X and Y).
      // (Often described as a 3×3 pattern with legs in each corner.)
      return [
        { x: cx - pitch, y: cy - pitch },
        { x: cx + pitch, y: cy - pitch },
        { x: cx - pitch, y: cy + pitch },
        { x: cx + pitch, y: cy + pitch },
      ].slice(0, legs);

    case ComponentType.GROUND:
      return [{ x: cx, y: height - inset }].slice(0, legs);

    case ComponentType.MICROPROCESSOR: {
      // DIP-ish: 8 pins on left + 8 on right.
      const leftCount = Math.min(8, legs);
      const rightCount = Math.max(0, Math.min(8, legs - leftCount));

      // Prefer 0.1" pitch for pin spacing where possible.
      const spacingL = leftCount > 1 ? pitch : 0;
      const spacingR = rightCount > 1 ? pitch : 0;

      // If the node height is too small to fit all pins at pitch, fall back to evenly spaced.
      const available = height - 2 * inset;
      const requiredL = (leftCount - 1) * pitch;
      const requiredR = (rightCount - 1) * pitch;
      const useEvenL = leftCount > 1 && requiredL > available;
      const useEvenR = rightCount > 1 && requiredR > available;

      const finalSpacingL = useEvenL && leftCount > 1 ? available / (leftCount - 1) : spacingL;
      const finalSpacingR = useEvenR && rightCount > 1 ? available / (rightCount - 1) : spacingR;

      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < leftCount; i++) {
        pts.push({ x: inset, y: inset + i * finalSpacingL });
      }
      for (let i = 0; i < rightCount; i++) {
        pts.push({ x: width - inset, y: inset + i * finalSpacingR });
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
