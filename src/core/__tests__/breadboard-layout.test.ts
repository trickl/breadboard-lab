import { describe, it, expect } from 'vitest';
import { BreadboardLayout } from '../breadboard-layout';

describe('BreadboardLayout', () => {
  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(BreadboardLayout.isValidPosition({ row: 0, col: 0 })).toBe(true);
      expect(BreadboardLayout.isValidPosition({ row: 15, col: 7 })).toBe(true);
      expect(BreadboardLayout.isValidPosition({ row: 29, col: 13 })).toBe(true);
    });

    it('should return false for invalid positions', () => {
      expect(BreadboardLayout.isValidPosition({ row: -1, col: 0 })).toBe(false);
      expect(BreadboardLayout.isValidPosition({ row: 0, col: -1 })).toBe(false);
      expect(BreadboardLayout.isValidPosition({ row: 30, col: 0 })).toBe(false);
      expect(BreadboardLayout.isValidPosition({ row: 0, col: 14 })).toBe(false);
    });
  });

  describe('areInternallyConnected', () => {
    it('should connect same position', () => {
      const pos = { row: 5, col: 7 };
      expect(BreadboardLayout.areInternallyConnected(pos, pos)).toBe(true);
    });

    it('should connect positions in same terminal strip row (left side)', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 2 }, { row: 5, col: 6 })
      ).toBe(true);
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 3 }, { row: 5, col: 4 })
      ).toBe(true);
    });

    it('should connect positions in same terminal strip row (right side)', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 7 }, { row: 5, col: 11 })
      ).toBe(true);
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 8 }, { row: 5, col: 9 })
      ).toBe(true);
    });

    it('should NOT connect left and right terminal strips', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 6 }, { row: 5, col: 7 })
      ).toBe(false);
    });

    it('should NOT connect different rows in terminal strips', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 3 }, { row: 6, col: 3 })
      ).toBe(false);
    });

    it('should connect positions in same rail vertically', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 0, col: 0 }, { row: 29, col: 0 })
      ).toBe(true);
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 1 }, { row: 10, col: 1 })
      ).toBe(true);
    });

    it('should NOT connect different rails', () => {
      expect(
        BreadboardLayout.areInternallyConnected({ row: 5, col: 0 }, { row: 5, col: 1 })
      ).toBe(false);
    });
  });

  describe('getConnectedPositions', () => {
    it('should return all positions in terminal strip row (left side)', () => {
      const connected = BreadboardLayout.getConnectedPositions({ row: 5, col: 3 });
      expect(connected.length).toBe(5);
      // Should include all positions in that row's left terminal strip
      expect(connected.some((p) => p.row === 5 && p.col === 2)).toBe(true);
      expect(connected.some((p) => p.row === 5 && p.col === 6)).toBe(true);
    });

    it('should return all positions in terminal strip row (right side)', () => {
      const connected = BreadboardLayout.getConnectedPositions({ row: 5, col: 8 });
      expect(connected.length).toBe(5);
      // Should include all positions in that row's right terminal strip
      expect(connected.some((p) => p.row === 5 && p.col === 7)).toBe(true);
      expect(connected.some((p) => p.row === 5 && p.col === 11)).toBe(true);
    });

    it('should return all positions in a rail vertically', () => {
      const connected = BreadboardLayout.getConnectedPositions({ row: 5, col: 0 });
      expect(connected.length).toBe(30);
      // Should include all row positions in that rail
      expect(connected.some((p) => p.row === 0 && p.col === 0)).toBe(true);
      expect(connected.some((p) => p.row === 29 && p.col === 0)).toBe(true);
    });
  });

  describe('rail methods', () => {
    it('should identify rail positions', () => {
      expect(BreadboardLayout.isPositionInRail({ row: 5, col: 0 })).toBe(true);
      expect(BreadboardLayout.isPositionInRail({ row: 5, col: 1 })).toBe(true);
      expect(BreadboardLayout.isPositionInRail({ row: 5, col: 12 })).toBe(true);
      expect(BreadboardLayout.isPositionInRail({ row: 5, col: 13 })).toBe(true);
      expect(BreadboardLayout.isPositionInRail({ row: 5, col: 2 })).toBe(false);
      expect(BreadboardLayout.isPositionInRail({ row: 5, col: 7 })).toBe(false);
    });

    it('should get rail information for rail positions', () => {
      const leftNegRail = BreadboardLayout.getRailForPosition({ row: 5, col: 0 });
      expect(leftNegRail).not.toBeNull();
      expect(leftNegRail?.type).toBe('negative');
      expect(leftNegRail?.side).toBe('left');
      expect(leftNegRail?.holes.length).toBe(30);

      const rightPosRail = BreadboardLayout.getRailForPosition({ row: 5, col: 12 });
      expect(rightPosRail).not.toBeNull();
      expect(rightPosRail?.type).toBe('positive');
      expect(rightPosRail?.side).toBe('right');
    });

    it('should return null for non-rail positions', () => {
      expect(BreadboardLayout.getRailForPosition({ row: 5, col: 2 })).toBeNull();
      expect(BreadboardLayout.getRailForPosition({ row: 5, col: 7 })).toBeNull();
    });
  });
});
