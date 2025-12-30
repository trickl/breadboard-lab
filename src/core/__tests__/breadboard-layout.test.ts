import { describe, it, expect } from 'vitest';
import { BreadboardLayout } from '../breadboard-layout';

describe('BreadboardLayout', () => {
  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(BreadboardLayout.isValidPosition({ row: 0, col: 0 })).toBe(true);
      expect(BreadboardLayout.isValidPosition({ row: 15, col: 5 })).toBe(true);
      expect(BreadboardLayout.isValidPosition({ row: 29, col: 9 })).toBe(true);
    });

    it('should return false for invalid positions', () => {
      expect(BreadboardLayout.isValidPosition({ row: -1, col: 0 })).toBe(false);
      expect(BreadboardLayout.isValidPosition({ row: 0, col: -1 })).toBe(false);
      expect(BreadboardLayout.isValidPosition({ row: 30, col: 0 })).toBe(false);
      expect(BreadboardLayout.isValidPosition({ row: 0, col: 10 })).toBe(false);
    });
  });

  describe('areInternallyConnected', () => {
    it('should connect same position', () => {
      const pos = { row: 5, col: 5 };
      expect(BreadboardLayout.areInternallyConnected(pos, pos)).toBe(true);
    });

    it('should connect positions in same terminal strip row (left side)', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 0 }, { row: 5, col: 4 })
      ).toBe(true);
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 1 }, { row: 5, col: 2 })
      ).toBe(true);
    });

    it('should connect positions in same terminal strip row (right side)', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 5 }, { row: 5, col: 9 })
      ).toBe(true);
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 6 }, { row: 5, col: 7 })
      ).toBe(true);
    });

    it('should NOT connect left and right terminal strips', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 4 }, { row: 5, col: 5 })
      ).toBe(false);
    });

    it('should NOT connect different rows in terminal strips', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 1 }, { row: 6, col: 1 })
      ).toBe(false);
    });
  });

  describe('getConnectedPositions', () => {
    it('should return all positions in terminal strip row (left side)', () => {
      const connected = BreadboardLayout.getConnectedPositions({ row: 5, col: 1 });
      expect(connected.length).toBe(5);
      // Should include all positions in that row's left terminal strip
      expect(connected.some((p) => p.row === 5 && p.col === 0)).toBe(true);
      expect(connected.some((p) => p.row === 5 && p.col === 4)).toBe(true);
    });

    it('should return all positions in terminal strip row (right side)', () => {
      const connected = BreadboardLayout.getConnectedPositions({ row: 5, col: 6 });
      expect(connected.length).toBe(5);
      // Should include all positions in that row's right terminal strip
      expect(connected.some((p) => p.row === 5 && p.col === 5)).toBe(true);
      expect(connected.some((p) => p.row === 5 && p.col === 9)).toBe(true);
    });
  });
});
