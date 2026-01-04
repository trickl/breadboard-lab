import { describe, it, expect } from 'vitest';
import {
  analogToDigital,
  digitalToAnalog,
  isDefinedDigital,
  nibbleToDigital,
  digitalToNibble,
  TTL_THRESHOLDS,
} from '../digital-signals';

describe('Digital Signals', () => {
  describe('analogToDigital', () => {
    it('should convert low voltage to logic 0', () => {
      expect(analogToDigital(0.0)).toBe(0);
      expect(analogToDigital(0.5)).toBe(0);
      expect(analogToDigital(0.79)).toBe(0);
    });

    it('should convert high voltage to logic 1', () => {
      expect(analogToDigital(2.1)).toBe(1);
      expect(analogToDigital(3.3)).toBe(1);
      expect(analogToDigital(5.0)).toBe(1);
    });

    it('should convert threshold voltage to X (undefined)', () => {
      expect(analogToDigital(TTL_THRESHOLDS.V_IL)).toBe('X');
      expect(analogToDigital(1.0)).toBe('X');
      expect(analogToDigital(1.5)).toBe('X');
      expect(analogToDigital(TTL_THRESHOLDS.V_IH)).toBe('X');
    });

    it('should handle negative voltages as logic 0', () => {
      expect(analogToDigital(-0.5)).toBe(0);
    });
  });

  describe('digitalToAnalog', () => {
    it('should convert logic 0 to low voltage', () => {
      expect(digitalToAnalog(0)).toBe(TTL_THRESHOLDS.V_OL);
      expect(digitalToAnalog(0)).toBe(0.2);
    });

    it('should convert logic 1 to high voltage', () => {
      expect(digitalToAnalog(1)).toBe(TTL_THRESHOLDS.V_OH);
      expect(digitalToAnalog(1)).toBe(4.5);
    });

    it('should convert high-impedance to null', () => {
      expect(digitalToAnalog('Z')).toBe(null);
    });

    it('should convert unknown to null', () => {
      expect(digitalToAnalog('X')).toBe(null);
    });
  });

  describe('isDefinedDigital', () => {
    it('should return true for defined values', () => {
      expect(isDefinedDigital(0)).toBe(true);
      expect(isDefinedDigital(1)).toBe(true);
    });

    it('should return false for undefined values', () => {
      expect(isDefinedDigital('Z')).toBe(false);
      expect(isDefinedDigital('X')).toBe(false);
    });
  });

  describe('nibbleToDigital', () => {
    it('should convert 0 to all zeros', () => {
      expect(nibbleToDigital(0)).toEqual([0, 0, 0, 0]);
    });

    it('should convert 15 to all ones', () => {
      expect(nibbleToDigital(15)).toEqual([1, 1, 1, 1]);
    });

    it('should convert 5 (0b0101) correctly', () => {
      expect(nibbleToDigital(5)).toEqual([0, 1, 0, 1]);
    });

    it('should convert 10 (0b1010) correctly', () => {
      expect(nibbleToDigital(10)).toEqual([1, 0, 1, 0]);
    });

    it('should convert 1 (0b0001) correctly', () => {
      expect(nibbleToDigital(1)).toEqual([0, 0, 0, 1]);
    });

    it('should convert 8 (0b1000) correctly', () => {
      expect(nibbleToDigital(8)).toEqual([1, 0, 0, 0]);
    });
  });

  describe('digitalToNibble', () => {
    it('should convert all zeros to 0', () => {
      expect(digitalToNibble([0, 0, 0, 0])).toBe(0);
    });

    it('should convert all ones to 15', () => {
      expect(digitalToNibble([1, 1, 1, 1])).toBe(15);
    });

    it('should convert [0, 1, 0, 1] to 5', () => {
      expect(digitalToNibble([0, 1, 0, 1])).toBe(5);
    });

    it('should convert [1, 0, 1, 0] to 10', () => {
      expect(digitalToNibble([1, 0, 1, 0])).toBe(10);
    });

    it('should return undefined if any bit is X', () => {
      expect(digitalToNibble([0, 'X', 0, 1])).toBe(undefined);
      expect(digitalToNibble(['X', 0, 0, 0])).toBe(undefined);
    });

    it('should return undefined if any bit is Z', () => {
      expect(digitalToNibble([0, 'Z', 0, 1])).toBe(undefined);
      expect(digitalToNibble(['Z', 1, 1, 1])).toBe(undefined);
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve digital value through analog round-trip', () => {
      const voltage0 = digitalToAnalog(0)!;
      expect(analogToDigital(voltage0)).toBe(0);

      const voltage1 = digitalToAnalog(1)!;
      expect(analogToDigital(voltage1)).toBe(1);
    });

    it('should preserve nibble through digital round-trip', () => {
      for (let i = 0; i < 16; i++) {
        const bits = nibbleToDigital(i);
        expect(digitalToNibble(bits)).toBe(i);
      }
    });
  });
});
