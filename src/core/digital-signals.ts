/**
 * Digital Signal Abstraction
 * 
 * Provides conversion between analog voltages and digital logic levels.
 * Uses TTL-compatible thresholds for educational purposes.
 */

/**
 * Digital logic value
 * - 0: Logic low
 * - 1: Logic high
 * - Z: High impedance (tri-state)
 * - X: Unknown/undefined
 */
export type DigitalValue = 0 | 1 | 'Z' | 'X';

/**
 * TTL voltage thresholds (in Volts)
 * - V_IL (Input Low): 0.8V - voltages below this are logic 0
 * - V_IH (Input High): 2.0V - voltages above this are logic 1
 * - V_OL (Output Low): 0.2V - typical output voltage for logic 0
 * - V_OH (Output High): 4.5V - typical output voltage for logic 1 (with 5V supply)
 */
export const TTL_THRESHOLDS = {
  V_IL: 0.8,  // Input low threshold
  V_IH: 2.0,  // Input high threshold
  V_OL: 0.2,  // Output low voltage
  V_OH: 4.5,  // Output high voltage
} as const;

/**
 * Convert analog voltage to digital logic level
 * 
 * Uses TTL thresholds with hysteresis to determine digital state:
 * - voltage < 0.8V → 0 (low)
 * - voltage > 2.0V → 1 (high)
 * - 0.8V ≤ voltage ≤ 2.0V → X (undefined/transitional)
 * 
 * @param voltage Analog voltage in Volts
 * @returns Digital logic value
 */
export function analogToDigital(voltage: number): DigitalValue {
  if (voltage < TTL_THRESHOLDS.V_IL) {
    return 0;
  } else if (voltage > TTL_THRESHOLDS.V_IH) {
    return 1;
  } else {
    // In the undefined region between thresholds
    return 'X';
  }
}

/**
 * Convert digital logic level to analog voltage
 * 
 * Uses typical TTL output voltages:
 * - 0 → 0.2V
 * - 1 → 4.5V
 * - Z → null (high impedance, no voltage source)
 * - X → null (undefined state)
 * 
 * @param value Digital logic value
 * @returns Analog voltage in Volts, or null for high-Z/unknown
 */
export function digitalToAnalog(value: DigitalValue): number | null {
  switch (value) {
    case 0:
      return TTL_THRESHOLDS.V_OL;
    case 1:
      return TTL_THRESHOLDS.V_OH;
    case 'Z':
    case 'X':
      return null; // No defined voltage
  }
}

/**
 * Check if a digital value is defined (not X or Z)
 */
export function isDefinedDigital(value: DigitalValue): value is 0 | 1 {
  return value === 0 || value === 1;
}

/**
 * Convert 4-bit digital value to output voltages
 * Helper for microprocessor output pins
 * 
 * @param nibble 4-bit value (0-15)
 * @returns Array of 4 digital values [bit3, bit2, bit1, bit0]
 */
export function nibbleToDigital(nibble: number): [DigitalValue, DigitalValue, DigitalValue, DigitalValue] {
  return [
    ((nibble >> 3) & 1) as DigitalValue,
    ((nibble >> 2) & 1) as DigitalValue,
    ((nibble >> 1) & 1) as DigitalValue,
    (nibble & 1) as DigitalValue,
  ];
}

/**
 * Convert 4 digital values to 4-bit number
 * Helper for microprocessor input pins
 * 
 * @param bits Array of 4 digital values [bit3, bit2, bit1, bit0]
 * @returns 4-bit value (0-15), or undefined if any bit is X or Z
 */
export function digitalToNibble(bits: [DigitalValue, DigitalValue, DigitalValue, DigitalValue]): number | undefined {
  // Check if all bits are defined
  if (!bits.every(isDefinedDigital)) {
    return undefined;
  }
  
  return (
    ((bits[0] as number) << 3) |
    ((bits[1] as number) << 2) |
    ((bits[2] as number) << 1) |
    (bits[3] as number)
  );
}
