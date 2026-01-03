import { describe, it, expect } from 'vitest';
import {
  resistanceToColorBands,
  colorBandsToResistance,
  ResistorColor,
  type ColorBand,
} from '../resistor-color-code';

describe('resistanceToColorBands', () => {
  describe('4-band resistors (5% tolerance)', () => {
    it('should convert 1kΩ to brown-black-red-gold', () => {
      const bands = resistanceToColorBands(1000, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[0].meaning).toBe('digit1');
      expect(bands[1].color).toBe(ResistorColor.BLACK);
      expect(bands[1].meaning).toBe('digit2');
      expect(bands[2].color).toBe(ResistorColor.RED);
      expect(bands[2].meaning).toBe('multiplier');
      expect(bands[3].color).toBe(ResistorColor.GOLD);
      expect(bands[3].meaning).toBe('tolerance');
    });

    it('should convert 220Ω to red-red-brown-gold', () => {
      const bands = resistanceToColorBands(220, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.RED);
      expect(bands[1].color).toBe(ResistorColor.RED);
      expect(bands[2].color).toBe(ResistorColor.BROWN);
      expect(bands[3].color).toBe(ResistorColor.GOLD);
    });

    it('should convert 10Ω to brown-black-black-gold', () => {
      const bands = resistanceToColorBands(10, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[1].color).toBe(ResistorColor.BLACK);
      expect(bands[2].color).toBe(ResistorColor.BLACK);
      expect(bands[3].color).toBe(ResistorColor.GOLD);
    });

    it('should convert 100kΩ to brown-black-yellow-gold', () => {
      const bands = resistanceToColorBands(100000, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[1].color).toBe(ResistorColor.BLACK);
      expect(bands[2].color).toBe(ResistorColor.YELLOW);
      expect(bands[3].color).toBe(ResistorColor.GOLD);
    });

    it('should convert 470Ω to yellow-violet-brown-gold', () => {
      const bands = resistanceToColorBands(470, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.YELLOW);
      expect(bands[1].color).toBe(ResistorColor.VIOLET);
      expect(bands[2].color).toBe(ResistorColor.BROWN);
      expect(bands[3].color).toBe(ResistorColor.GOLD);
    });

    it('should convert 10MΩ to brown-black-blue-gold', () => {
      const bands = resistanceToColorBands(10000000, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[1].color).toBe(ResistorColor.BLACK);
      expect(bands[2].color).toBe(ResistorColor.BLUE);
      expect(bands[3].color).toBe(ResistorColor.GOLD);
    });

    it('should use 10% tolerance with silver band', () => {
      const bands = resistanceToColorBands(1000, 10);

      expect(bands).toHaveLength(4);
      expect(bands[3].color).toBe(ResistorColor.SILVER);
      expect(bands[3].meaning).toBe('tolerance');
    });
  });

  describe('5-band resistors (1% tolerance)', () => {
    it('should convert 10kΩ 1% to brown-black-black-red-brown', () => {
      const bands = resistanceToColorBands(10000, 1);

      expect(bands).toHaveLength(5);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[0].meaning).toBe('digit1');
      expect(bands[1].color).toBe(ResistorColor.BLACK);
      expect(bands[1].meaning).toBe('digit2');
      expect(bands[2].color).toBe(ResistorColor.BLACK);
      expect(bands[2].meaning).toBe('digit3');
      expect(bands[3].color).toBe(ResistorColor.RED);
      expect(bands[3].meaning).toBe('multiplier');
      expect(bands[4].color).toBe(ResistorColor.BROWN);
      expect(bands[4].meaning).toBe('tolerance');
    });

    it('should convert 1.5kΩ 1% to brown-green-black-brown-brown', () => {
      const bands = resistanceToColorBands(1500, 1);

      expect(bands).toHaveLength(5);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[1].color).toBe(ResistorColor.GREEN);
      expect(bands[2].color).toBe(ResistorColor.BLACK);
      expect(bands[3].color).toBe(ResistorColor.BROWN);
      expect(bands[4].color).toBe(ResistorColor.BROWN);
    });

    it('should convert 330Ω 1% to orange-orange-black-black-brown', () => {
      const bands = resistanceToColorBands(330, 1);

      expect(bands).toHaveLength(5);
      expect(bands[0].color).toBe(ResistorColor.ORANGE);
      expect(bands[1].color).toBe(ResistorColor.ORANGE);
      expect(bands[2].color).toBe(ResistorColor.BLACK);
      expect(bands[3].color).toBe(ResistorColor.BLACK);
      expect(bands[4].color).toBe(ResistorColor.BROWN);
    });

    it('should use 2% tolerance with red band', () => {
      const bands = resistanceToColorBands(1000, 2);

      expect(bands).toHaveLength(5);
      expect(bands[4].color).toBe(ResistorColor.RED);
      expect(bands[4].meaning).toBe('tolerance');
    });
  });

  describe('edge cases', () => {
    it('should handle 1Ω resistance', () => {
      const bands = resistanceToColorBands(1, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[1].color).toBe(ResistorColor.BLACK);
      expect(bands[2].color).toBe(ResistorColor.GOLD); // 0.1 multiplier
    });

    it('should handle very large resistance (1GΩ)', () => {
      const bands = resistanceToColorBands(1000000000, 5);

      expect(bands).toHaveLength(4);
      expect(bands[0].color).toBe(ResistorColor.BROWN);
      expect(bands[1].color).toBe(ResistorColor.BLACK);
      expect(bands[2].color).toBe(ResistorColor.GRAY); // 10^8 multiplier (10 * 10^8 = 1GΩ)
    });

    it('should throw error for zero resistance', () => {
      expect(() => resistanceToColorBands(0, 5)).toThrow('Resistance must be a positive finite number');
    });

    it('should throw error for negative resistance', () => {
      expect(() => resistanceToColorBands(-100, 5)).toThrow('Resistance must be a positive finite number');
    });

    it('should throw error for infinite resistance', () => {
      expect(() => resistanceToColorBands(Infinity, 5)).toThrow('Resistance must be a positive finite number');
    });
  });

  describe('E12 series standard values', () => {
    const e12Values = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

    e12Values.forEach((value) => {
      it(`should correctly encode ${value}Ω`, () => {
        const bands = resistanceToColorBands(value, 5);
        expect(bands).toHaveLength(4);

        // Verify we can decode it back
        const decoded = colorBandsToResistance(bands);
        expect(decoded.resistance).toBeCloseTo(value, 0);
      });

      it(`should correctly encode ${value}kΩ`, () => {
        const bands = resistanceToColorBands(value * 1000, 5);
        expect(bands).toHaveLength(4);

        // Verify we can decode it back
        const decoded = colorBandsToResistance(bands);
        expect(decoded.resistance).toBeCloseTo(value * 1000, 0);
      });
    });
  });
});

describe('colorBandsToResistance', () => {
  describe('4-band resistors', () => {
    it('should convert brown-black-red-gold to 1kΩ 5%', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.BROWN, meaning: 'digit1', value: 1 },
        { color: ResistorColor.BLACK, meaning: 'digit2', value: 0 },
        { color: ResistorColor.RED, meaning: 'multiplier', value: 100 },
        { color: ResistorColor.GOLD, meaning: 'tolerance', value: 5 },
      ];

      const result = colorBandsToResistance(bands);

      expect(result.resistance).toBe(1000);
      expect(result.tolerance).toBe(5);
    });

    it('should convert red-red-brown-gold to 220Ω 5%', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.RED, meaning: 'digit1', value: 2 },
        { color: ResistorColor.RED, meaning: 'digit2', value: 2 },
        { color: ResistorColor.BROWN, meaning: 'multiplier', value: 10 },
        { color: ResistorColor.GOLD, meaning: 'tolerance', value: 5 },
      ];

      const result = colorBandsToResistance(bands);

      expect(result.resistance).toBe(220);
      expect(result.tolerance).toBe(5);
    });

    it('should convert yellow-violet-orange-silver to 47kΩ 10%', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.YELLOW, meaning: 'digit1', value: 4 },
        { color: ResistorColor.VIOLET, meaning: 'digit2', value: 7 },
        { color: ResistorColor.ORANGE, meaning: 'multiplier', value: 1000 },
        { color: ResistorColor.SILVER, meaning: 'tolerance', value: 10 },
      ];

      const result = colorBandsToResistance(bands);

      expect(result.resistance).toBe(47000);
      expect(result.tolerance).toBe(10);
    });
  });

  describe('5-band resistors', () => {
    it('should convert brown-black-black-red-brown to 10kΩ 1%', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.BROWN, meaning: 'digit1', value: 1 },
        { color: ResistorColor.BLACK, meaning: 'digit2', value: 0 },
        { color: ResistorColor.BLACK, meaning: 'digit3', value: 0 },
        { color: ResistorColor.RED, meaning: 'multiplier', value: 100 },
        { color: ResistorColor.BROWN, meaning: 'tolerance', value: 1 },
      ];

      const result = colorBandsToResistance(bands);

      expect(result.resistance).toBe(10000);
      expect(result.tolerance).toBe(1);
    });

    it('should convert brown-green-black-brown-brown to 1.5kΩ 1%', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.BROWN, meaning: 'digit1', value: 1 },
        { color: ResistorColor.GREEN, meaning: 'digit2', value: 5 },
        { color: ResistorColor.BLACK, meaning: 'digit3', value: 0 },
        { color: ResistorColor.BROWN, meaning: 'multiplier', value: 10 },
        { color: ResistorColor.BROWN, meaning: 'tolerance', value: 1 },
      ];

      const result = colorBandsToResistance(bands);

      expect(result.resistance).toBe(1500);
      expect(result.tolerance).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should throw error for wrong number of bands', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.BROWN, meaning: 'digit1', value: 1 },
        { color: ResistorColor.BLACK, meaning: 'digit2', value: 0 },
        { color: ResistorColor.RED, meaning: 'multiplier', value: 100 },
      ];

      expect(() => colorBandsToResistance(bands)).toThrow('Color bands must be 4 or 5 bands');
    });

    it('should throw error for invalid digit color', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.GOLD, meaning: 'digit1', value: 1 }, // Gold is not valid for digit
        { color: ResistorColor.BLACK, meaning: 'digit2', value: 0 },
        { color: ResistorColor.RED, meaning: 'multiplier', value: 100 },
        { color: ResistorColor.GOLD, meaning: 'tolerance', value: 5 },
      ];

      expect(() => colorBandsToResistance(bands)).toThrow('Invalid color for digit band');
    });

    it('should throw error for invalid tolerance color', () => {
      const bands: ColorBand[] = [
        { color: ResistorColor.BROWN, meaning: 'digit1', value: 1 },
        { color: ResistorColor.BLACK, meaning: 'digit2', value: 0 },
        { color: ResistorColor.RED, meaning: 'multiplier', value: 100 },
        { color: ResistorColor.BLACK, meaning: 'tolerance', value: 5 }, // Black is not valid for tolerance
      ];

      expect(() => colorBandsToResistance(bands)).toThrow('Invalid color for tolerance band');
    });
  });
});

describe('round-trip conversion', () => {
  it('should preserve resistance through encode-decode cycle', () => {
    const testValues = [10, 100, 220, 330, 470, 1000, 4700, 10000, 47000, 100000, 1000000];

    testValues.forEach((resistance) => {
      const bands = resistanceToColorBands(resistance, 5);
      const decoded = colorBandsToResistance(bands);

      expect(decoded.resistance).toBeCloseTo(resistance, 0);
      expect(decoded.tolerance).toBe(5);
    });
  });

  it('should preserve 1% tolerance resistors through encode-decode cycle', () => {
    const testValues = [330, 1500, 10000, 47000];

    testValues.forEach((resistance) => {
      const bands = resistanceToColorBands(resistance, 1);
      const decoded = colorBandsToResistance(bands);

      expect(decoded.resistance).toBeCloseTo(resistance, 0);
      expect(decoded.tolerance).toBe(1);
    });
  });
});
