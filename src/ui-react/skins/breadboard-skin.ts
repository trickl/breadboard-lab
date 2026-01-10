import { BreadboardLayout } from '@/core/breadboard-layout';
import type { Position } from '@/core/types';

/**
 * Breadboard skin configuration for the SVG substrate.
 *
 * Goal: approximate the provided photo reference (off-white plastic, beveled rounded-rect holes,
 * rail stripes, and rail gaps) while staying renderer-friendly.
 */

export const BreadboardSkin = {
  /**
   * Plastic + print palette (tunable).
   * Avoid pure black/white so it reads like ink and plastic.
   */
  colors: {
    plasticBase: '#f2f3f5',
    plasticHighlight: '#ffffff',
    plasticShadow: '#d9dde2',

    panelSlightDark: '#e7eaee',
    panelSlightLight: '#f7f8fa',

    // Center trench should be visible but subtle (reference photo has a mild recess, not a dark stripe).
    trenchBase: '#e8edf2',
    trenchShadow: '#d6dde5',

    holeBevelLight: '#f7f7f7',
    holeBevelMid: '#c7ccd2',
    holeCavity: '#2a2f35',
    holeCavityEdge: '#1f2328',

    printDark: '#2f343a',
    printMid: '#555c64',

    railRed: '#d23b3b',
    railBlue: '#1f5fbf',

    hoverFill: '#3399ff',
  },

  geometry: {
    bodyCornerRadius: 14,
    bodyInset: 2,

    // Keep printed stripes near the outer edges so they don't crowd the rail holes.
    railStripeInset: 3,
    railStripeWidth: 2,

    trenchWidthPx: 10,

    // Hole visual size is defined relative to HOLE_SPACING in the renderer.
    // These are ratios, not pixels.
    holeOuterSizeRatio: 0.42,
    holeInnerSizeRatio: 0.28,
    holeOuterRadiusRatio: 0.18,
    holeInnerRadiusRatio: 0.22,

    // Rim/outline strengths
    holeOuterStrokeWidth: 0.75,
    holeInnerStrokeWidth: 0.5,

    // Labels
    labelFontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },

  /**
   * Rail gap rows (0-based, inclusive).
   * These rows are visually missing holes in the reference photo.
   *
   * Defaults are chosen to create:
   * - a small mid split,
   * - a larger lower interruption.
   */
  railGapRanges: [
    { startRow: 12, endRow: 13 }, // rows 13–14 in 1-based labeling
    { startRow: 22, endRow: 25 }, // rows 23–26 in 1-based labeling
  ],
} as const;

export function isRailGapRow(row: number): boolean {
  return BreadboardSkin.railGapRanges.some((r) => row >= r.startRow && row <= r.endRow);
}

/**
 * Whether a hole should be drawn and considered interactive in the photo-like skin.
 *
 * NOTE: This is a UI-level constraint only; it does not (yet) change the electrical model.
 */
export function isHoleVisible(pos: Position): boolean {
  if (!BreadboardLayout.isValidPosition(pos)) {
    return false;
  }

  if (BreadboardLayout.isPositionInRail(pos)) {
    return !isRailGapRow(pos.row);
  }

  return true;
}
