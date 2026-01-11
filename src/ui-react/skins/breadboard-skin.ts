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
    plasticBase: 'var(--theme-ui-colors-bb-plasticBase)',
    plasticHighlight: 'var(--theme-ui-colors-bb-plasticHighlight)',
    plasticShadow: 'var(--theme-ui-colors-bb-plasticShadow)',

    panelSlightDark: 'var(--theme-ui-colors-bb-panelSlightDark)',
    panelSlightLight: 'var(--theme-ui-colors-bb-panelSlightLight)',

    // Center trench should be visible but subtle (reference photo has a mild recess, not a dark stripe).
    trenchBase: 'var(--theme-ui-colors-bb-trenchBase)',
    trenchShadow: 'var(--theme-ui-colors-bb-trenchShadow)',

    holeBevelLight: 'var(--theme-ui-colors-bb-holeBevelLight)',
    holeBevelMid: 'var(--theme-ui-colors-bb-holeBevelMid)',
    holeCavity: 'var(--theme-ui-colors-bb-holeCavity)',
    holeCavityEdge: 'var(--theme-ui-colors-bb-holeCavityEdge)',

    printDark: 'var(--theme-ui-colors-bb-printDark)',
    printMid: 'var(--theme-ui-colors-bb-printMid)',

    railRed: 'var(--theme-ui-colors-bb-railRed)',
    railBlue: 'var(--theme-ui-colors-bb-railBlue)',

    hoverFill: 'var(--theme-ui-colors-bb-hoverFill)',

    // Used for subtle outer outline shadow stroke (depth hint)
    outlineShadow: 'var(--theme-ui-colors-bb-outlineShadow)',
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

    /**
     * Rail hole layout (photo-style):
     * - rails do NOT align to the 30-row terminal grid
     * - rails have 25 holes arranged as 5 clusters of 5, with extra spacing between clusters
     */
    railHoleRows: 25,
    railClusterSize: 5,
    railClusterGapRatio: 0.9,
  },

  /**
   * Rail gap rows (0-based, inclusive).
   * These rows are visually missing holes in the reference photo.
   *
   * Defaults are chosen to create:
   * - a small mid split,
   * - a larger lower interruption.
   */
  // Optional: additional "missing hole" ranges for rail columns (using rail row indices).
  // Leave empty for the clustered 25-hole rail layout.
  railGapRanges: [] as Array<{ startRow: number; endRow: number }>,
} as const;

export function isRailGapRow(row: number): boolean {
  return BreadboardSkin.railGapRanges.some((r) => row >= r.startRow && row <= r.endRow);
}

/**
 * Whether a hole should be drawn and considered interactive in the photo-like skin.
 *
 * Note: This is a UI-level constraint only; it does not (yet) change the electrical model.
 */
export function isHoleVisible(pos: Position): boolean {
  if (!BreadboardLayout.isValidPosition(pos)) {
    return false;
  }

  if (BreadboardLayout.isPositionInRail(pos)) {
    if (pos.row < 0 || pos.row >= BreadboardSkin.geometry.railHoleRows) {
      return false;
    }
    return !isRailGapRow(pos.row);
  }

  return true;
}
