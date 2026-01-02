/**
 * Utility functions for mapping voltage values to colors for visualization.
 * Implements a color-blind friendly color scheme per planning document.
 */

export interface VoltageColor {
  rgb: string;
  description: string;
}

/**
 * Map voltage to a color using a color-blind friendly gradient.
 * Color scheme: 0V (dark blue) → 2.5V (yellow) → 5V (red)
 * 
 * Specific stops (from planning/vision/goal.md lines 774-779):
 * - 0V: Dark blue
 * - 1.25V: Cyan
 * - 2.5V: Yellow
 * - 3.75V: Orange
 * - 5V: Red
 * 
 * @param voltage Voltage in volts (will be clamped to 0-5V range)
 * @returns RGB color string in format "rgb(r, g, b)"
 */
export function voltageToColor(voltage: number): VoltageColor {
  // Clamp voltage to 0-5V range
  const v = Math.max(0, Math.min(5, voltage));
  
  let r: number, g: number, b: number;
  let description: string;
  
  if (v <= 1.25) {
    // 0V (dark blue: rgb(0, 0, 139)) → 1.25V (cyan: rgb(0, 255, 255))
    const t = v / 1.25;
    r = Math.round(0 * (1 - t) + 0 * t);
    g = Math.round(0 * (1 - t) + 255 * t);
    b = Math.round(139 * (1 - t) + 255 * t);
    description = `${v.toFixed(2)}V (low)`;
  } else if (v <= 2.5) {
    // 1.25V (cyan: rgb(0, 255, 255)) → 2.5V (yellow: rgb(255, 255, 0))
    const t = (v - 1.25) / 1.25;
    r = Math.round(0 * (1 - t) + 255 * t);
    g = Math.round(255 * (1 - t) + 255 * t);
    b = Math.round(255 * (1 - t) + 0 * t);
    description = `${v.toFixed(2)}V (mid)`;
  } else if (v <= 3.75) {
    // 2.5V (yellow: rgb(255, 255, 0)) → 3.75V (orange: rgb(255, 165, 0))
    const t = (v - 2.5) / 1.25;
    r = Math.round(255 * (1 - t) + 255 * t);
    g = Math.round(255 * (1 - t) + 165 * t);
    b = Math.round(0 * (1 - t) + 0 * t);
    description = `${v.toFixed(2)}V (high)`;
  } else {
    // 3.75V (orange: rgb(255, 165, 0)) → 5V (red: rgb(255, 0, 0))
    const t = (v - 3.75) / 1.25;
    r = Math.round(255 * (1 - t) + 255 * t);
    g = Math.round(165 * (1 - t) + 0 * t);
    b = Math.round(0 * (1 - t) + 0 * t);
    description = `${v.toFixed(2)}V (very high)`;
  }
  
  return {
    rgb: `rgb(${r}, ${g}, ${b})`,
    description,
  };
}

/**
 * Get CSS class name for voltage level (for pattern-based alternatives)
 * @param voltage Voltage in volts
 * @returns CSS class name
 */
export function voltageToClass(voltage: number): string {
  const v = Math.max(0, Math.min(5, voltage));
  
  if (v < 0.5) return 'voltage-0';
  if (v < 1.5) return 'voltage-1';
  if (v < 2.0) return 'voltage-2';
  if (v < 3.0) return 'voltage-3';
  if (v < 4.0) return 'voltage-4';
  return 'voltage-5';
}
