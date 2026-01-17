/**
 * Resistor color code calculations per IEC 60062 standard
 * Converts resistance values to color bands and vice versa
 */

/**
 * Standard resistor color codes
 */
export enum ResistorColor {
  BLACK = 'BLACK',
  BROWN = 'BROWN',
  RED = 'RED',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  VIOLET = 'VIOLET',
  GRAY = 'GRAY',
  WHITE = 'WHITE',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
}

/**
 * Map colors to digit values (0-9)
 */
const COLOR_TO_DIGIT: Record<ResistorColor, number> = {
  [ResistorColor.BLACK]: 0,
  [ResistorColor.BROWN]: 1,
  [ResistorColor.RED]: 2,
  [ResistorColor.ORANGE]: 3,
  [ResistorColor.YELLOW]: 4,
  [ResistorColor.GREEN]: 5,
  [ResistorColor.BLUE]: 6,
  [ResistorColor.VIOLET]: 7,
  [ResistorColor.GRAY]: 8,
  [ResistorColor.WHITE]: 9,
  [ResistorColor.GOLD]: -1, // Not used for digits
  [ResistorColor.SILVER]: -1, // Not used for digits
};

/**
 * Map colors to multiplier values
 */
const COLOR_TO_MULTIPLIER: Record<ResistorColor, number> = {
  [ResistorColor.BLACK]: 1,
  [ResistorColor.BROWN]: 10,
  [ResistorColor.RED]: 100,
  [ResistorColor.ORANGE]: 1000,
  [ResistorColor.YELLOW]: 10000,
  [ResistorColor.GREEN]: 100000,
  [ResistorColor.BLUE]: 1000000,
  [ResistorColor.VIOLET]: 10000000,
  [ResistorColor.GRAY]: 100000000,
  [ResistorColor.WHITE]: 1000000000,
  [ResistorColor.GOLD]: 0.1,
  [ResistorColor.SILVER]: 0.01,
};

/**
 * Map colors to tolerance percentages
 */
const COLOR_TO_TOLERANCE: Record<ResistorColor, number> = {
  [ResistorColor.BROWN]: 1,
  [ResistorColor.RED]: 2,
  [ResistorColor.GREEN]: 0.5,
  [ResistorColor.BLUE]: 0.25,
  [ResistorColor.VIOLET]: 0.1,
  [ResistorColor.GRAY]: 0.05,
  [ResistorColor.GOLD]: 5,
  [ResistorColor.SILVER]: 10,
  [ResistorColor.BLACK]: -1, // Not used for tolerance
  [ResistorColor.ORANGE]: -1,
  [ResistorColor.YELLOW]: -1,
  [ResistorColor.WHITE]: -1,
};

/**
 * RGB color values for visual rendering
 */
export const COLOR_TO_RGB: Record<ResistorColor, string> = {
  // Tuned to be closer to common IEC 60062 chart renderings (not neon/primary).
  // These are used for UI rendering only; the code computation uses ResistorColor enums.
  [ResistorColor.BLACK]: '#141414',
  [ResistorColor.BROWN]: '#5C3317',
  [ResistorColor.RED]: '#B01919',
  [ResistorColor.ORANGE]: '#DC7814',
  [ResistorColor.YELLOW]: '#E6C814',
  [ResistorColor.GREEN]: '#1E7837',
  [ResistorColor.BLUE]: '#2D4BAA',
  [ResistorColor.VIOLET]: '#783C8C',
  [ResistorColor.GRAY]: '#828282',
  [ResistorColor.WHITE]: '#EBEBEB',
  [ResistorColor.GOLD]: '#C9A43B',
  [ResistorColor.SILVER]: '#BFC3C7',
};

/**
 * Represents a single color band on a resistor
 */
export interface ColorBand {
  color: ResistorColor;
  meaning: 'digit1' | 'digit2' | 'digit3' | 'multiplier' | 'tolerance';
  value: number; // The numeric value this band represents
}

/**
 * Convert resistance and tolerance to color bands
 * @param resistance Resistance in Ohms
 * @param tolerance Tolerance percentage (1, 2, 5, 10, etc.)
 * @returns Array of color bands (4 bands for 5%/10%, 5 bands for 1%/2%)
 */
export function resistanceToColorBands(resistance: number, tolerance: number = 5): ColorBand[] {
  if (resistance <= 0 || !isFinite(resistance)) {
    throw new Error('Resistance must be a positive finite number');
  }

  // Determine if we need 4-band or 5-band based on tolerance
  const use5Band = tolerance <= 2;

  // Find the tolerance color
  const toleranceColor = findToleranceColor(tolerance);

  // Calculate significant figures and multiplier
  const { significantFigures, multiplier } = calculateBandValues(resistance, use5Band ? 3 : 2);

  const bands: ColorBand[] = [];

  if (use5Band) {
    // 5-band resistor: 3 significant digits + multiplier + tolerance
    const digit1 = Math.floor(significantFigures / 100);
    const digit2 = Math.floor((significantFigures % 100) / 10);
    const digit3 = significantFigures % 10;

    bands.push({
      color: digitToColor(digit1),
      meaning: 'digit1',
      value: digit1,
    });
    bands.push({
      color: digitToColor(digit2),
      meaning: 'digit2',
      value: digit2,
    });
    bands.push({
      color: digitToColor(digit3),
      meaning: 'digit3',
      value: digit3,
    });
    bands.push({
      color: multiplierToColor(multiplier),
      meaning: 'multiplier',
      value: multiplier,
    });
    bands.push({
      color: toleranceColor,
      meaning: 'tolerance',
      value: tolerance,
    });
  } else {
    // 4-band resistor: 2 significant digits + multiplier + tolerance
    const digit1 = Math.floor(significantFigures / 10);
    const digit2 = significantFigures % 10;

    bands.push({
      color: digitToColor(digit1),
      meaning: 'digit1',
      value: digit1,
    });
    bands.push({
      color: digitToColor(digit2),
      meaning: 'digit2',
      value: digit2,
    });
    bands.push({
      color: multiplierToColor(multiplier),
      meaning: 'multiplier',
      value: multiplier,
    });
    bands.push({
      color: toleranceColor,
      meaning: 'tolerance',
      value: tolerance,
    });
  }

  return bands;
}

/**
 * Convert color bands back to resistance and tolerance
 * @param bands Array of color bands
 * @returns Object with resistance (Ohms) and tolerance (percentage)
 */
export function colorBandsToResistance(bands: ColorBand[]): {
  resistance: number;
  tolerance: number;
} {
  if (bands.length !== 4 && bands.length !== 5) {
    throw new Error('Color bands must be 4 or 5 bands');
  }

  let resistance: number;

  if (bands.length === 5) {
    // 5-band: digit1-digit2-digit3-multiplier-tolerance
    const digit1 = COLOR_TO_DIGIT[bands[0].color];
    const digit2 = COLOR_TO_DIGIT[bands[1].color];
    const digit3 = COLOR_TO_DIGIT[bands[2].color];
    const multiplier = COLOR_TO_MULTIPLIER[bands[3].color];

    if (digit1 === -1 || digit2 === -1 || digit3 === -1) {
      throw new Error('Invalid color for digit band');
    }

    resistance = (digit1 * 100 + digit2 * 10 + digit3) * multiplier;
  } else {
    // 4-band: digit1-digit2-multiplier-tolerance
    const digit1 = COLOR_TO_DIGIT[bands[0].color];
    const digit2 = COLOR_TO_DIGIT[bands[1].color];
    const multiplier = COLOR_TO_MULTIPLIER[bands[2].color];

    if (digit1 === -1 || digit2 === -1) {
      throw new Error('Invalid color for digit band');
    }

    resistance = (digit1 * 10 + digit2) * multiplier;
  }

  const toleranceBand = bands[bands.length - 1];
  const tolerance = COLOR_TO_TOLERANCE[toleranceBand.color];

  if (tolerance === -1) {
    throw new Error('Invalid color for tolerance band');
  }

  return { resistance, tolerance };
}

/**
 * Calculate significant figures and multiplier from resistance value
 */
function calculateBandValues(
  resistance: number,
  significantDigits: number
): { significantFigures: number; multiplier: number } {
  // IEC 60062 encoding approach:
  // e = floor(log10(R))
  // scaled = round(R / 10^(e-(n-1)))  -> n-digit integer
  // normalize overflow if scaled == 10^n
  // multiplier exponent m = e - (n-1)
  if (resistance <= 0 || !isFinite(resistance)) {
    throw new Error('Resistance must be a positive finite number');
  }

  const n = significantDigits;
  const pow10 = (k: number) => Math.pow(10, k);

  let e = Math.floor(Math.log10(resistance));
  let scaled = Math.round(resistance / pow10(e - (n - 1)));

  const overflow = pow10(n);
  if (scaled === overflow) {
    scaled = pow10(n - 1);
    e += 1;
  }

  const multiplierExp = e - (n - 1);
  const multiplier = pow10(multiplierExp);

  return { significantFigures: scaled, multiplier };
}

/**
 * Find the appropriate color for a digit (0-9)
 */
function digitToColor(digit: number): ResistorColor {
  const colors = [
    ResistorColor.BLACK,
    ResistorColor.BROWN,
    ResistorColor.RED,
    ResistorColor.ORANGE,
    ResistorColor.YELLOW,
    ResistorColor.GREEN,
    ResistorColor.BLUE,
    ResistorColor.VIOLET,
    ResistorColor.GRAY,
    ResistorColor.WHITE,
  ];

  if (digit < 0 || digit > 9) {
    throw new Error(`Invalid digit: ${digit}`);
  }

  return colors[digit];
}

/**
 * Find the appropriate color for a multiplier
 */
function multiplierToColor(multiplier: number): ResistorColor {
  // Find the color that matches this multiplier
  for (const [color, mult] of Object.entries(COLOR_TO_MULTIPLIER)) {
    if (Math.abs(mult - multiplier) < 0.001) {
      return color as ResistorColor;
    }
  }

  throw new Error(`No color found for multiplier: ${multiplier}`);
}

/**
 * Find the appropriate color for a tolerance percentage
 */
function findToleranceColor(tolerance: number): ResistorColor {
  // Find the closest matching tolerance
  let bestColor = ResistorColor.GOLD; // Default to 5%
  let bestDiff = Infinity;

  for (const [color, tol] of Object.entries(COLOR_TO_TOLERANCE)) {
    if (tol === -1) continue;
    const diff = Math.abs(tol - tolerance);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestColor = color as ResistorColor;
    }
  }

  return bestColor;
}
