import { describe, it, expect } from 'vitest';
import {
  createEdgeDetector,
  detectEdge,
  detectRisingEdge,
  detectFallingEdge,
  resetEdgeDetector,
} from '../edge-detector';

describe('Edge Detector', () => {
  describe('createEdgeDetector', () => {
    it('should create detector with default initial value of 0', () => {
      const detector = createEdgeDetector();
      expect(detector.previousValue).toBe(0);
    });

    it('should create detector with custom initial value', () => {
      const detector = createEdgeDetector(1);
      expect(detector.previousValue).toBe(1);
    });
  });

  describe('detectEdge', () => {
    it('should detect rising edge (0 -> 1)', () => {
      const detector = createEdgeDetector(0);
      const result = detectEdge(detector, 1);

      expect(result.edge).toBe('rising');
      expect(result.previousValue).toBe(0);
      expect(result.currentValue).toBe(1);
      expect(detector.previousValue).toBe(1); // State updated
    });

    it('should detect falling edge (1 -> 0)', () => {
      const detector = createEdgeDetector(1);
      const result = detectEdge(detector, 0);

      expect(result.edge).toBe('falling');
      expect(result.previousValue).toBe(1);
      expect(result.currentValue).toBe(0);
      expect(detector.previousValue).toBe(0); // State updated
    });

    it('should detect no edge when value stays 0', () => {
      const detector = createEdgeDetector(0);
      const result = detectEdge(detector, 0);

      expect(result.edge).toBe('none');
      expect(result.previousValue).toBe(0);
      expect(result.currentValue).toBe(0);
    });

    it('should detect no edge when value stays 1', () => {
      const detector = createEdgeDetector(1);
      const result = detectEdge(detector, 1);

      expect(result.edge).toBe('none');
      expect(result.previousValue).toBe(1);
      expect(result.currentValue).toBe(1);
    });

    it('should not detect edge from undefined value', () => {
      const detector = createEdgeDetector('X' as any);
      const result = detectEdge(detector, 1);

      expect(result.edge).toBe('none');
      expect(detector.previousValue).toBe(1); // State still updated
    });

    it('should not detect edge to undefined value', () => {
      const detector = createEdgeDetector(0);
      const result = detectEdge(detector, 'X');

      expect(result.edge).toBe('none');
      expect(detector.previousValue).toBe('X'); // State still updated
    });

    it('should not detect edge from high-impedance', () => {
      const detector = createEdgeDetector('Z' as any);
      const result = detectEdge(detector, 1);

      expect(result.edge).toBe('none');
    });

    it('should update state even when no edge detected', () => {
      const detector = createEdgeDetector(0);
      detectEdge(detector, 'X');
      expect(detector.previousValue).toBe('X');

      detectEdge(detector, 'Z');
      expect(detector.previousValue).toBe('Z');
    });
  });

  describe('detectRisingEdge', () => {
    it('should return true for rising edge', () => {
      const detector = createEdgeDetector(0);
      expect(detectRisingEdge(detector, 1)).toBe(true);
    });

    it('should return false for falling edge', () => {
      const detector = createEdgeDetector(1);
      expect(detectRisingEdge(detector, 0)).toBe(false);
    });

    it('should return false for no edge', () => {
      const detector = createEdgeDetector(0);
      expect(detectRisingEdge(detector, 0)).toBe(false);
    });
  });

  describe('detectFallingEdge', () => {
    it('should return true for falling edge', () => {
      const detector = createEdgeDetector(1);
      expect(detectFallingEdge(detector, 0)).toBe(true);
    });

    it('should return false for rising edge', () => {
      const detector = createEdgeDetector(0);
      expect(detectFallingEdge(detector, 1)).toBe(false);
    });

    it('should return false for no edge', () => {
      const detector = createEdgeDetector(1);
      expect(detectFallingEdge(detector, 1)).toBe(false);
    });
  });

  describe('resetEdgeDetector', () => {
    it('should reset to default value of 0', () => {
      const detector = createEdgeDetector(1);
      resetEdgeDetector(detector);
      expect(detector.previousValue).toBe(0);
    });

    it('should reset to custom value', () => {
      const detector = createEdgeDetector(0);
      resetEdgeDetector(detector, 1);
      expect(detector.previousValue).toBe(1);
    });

    it('should allow resetting to undefined value', () => {
      const detector = createEdgeDetector(1);
      resetEdgeDetector(detector, 'X');
      expect(detector.previousValue).toBe('X');
    });
  });

  describe('Sequential edge detection', () => {
    it('should detect multiple edges in sequence', () => {
      const detector = createEdgeDetector(0);

      // No edge: 0 -> 0
      expect(detectEdge(detector, 0).edge).toBe('none');

      // Rising edge: 0 -> 1
      expect(detectEdge(detector, 1).edge).toBe('rising');

      // No edge: 1 -> 1
      expect(detectEdge(detector, 1).edge).toBe('none');

      // Falling edge: 1 -> 0
      expect(detectEdge(detector, 0).edge).toBe('falling');

      // Rising edge: 0 -> 1
      expect(detectEdge(detector, 1).edge).toBe('rising');
    });

    it('should handle clock pulse sequence', () => {
      const detector = createEdgeDetector(0);

      // Clock pulse 1
      expect(detectRisingEdge(detector, 1)).toBe(true); // 0 -> 1
      expect(detectRisingEdge(detector, 1)).toBe(false); // 1 -> 1
      expect(detectRisingEdge(detector, 0)).toBe(false); // 1 -> 0

      // Clock pulse 2
      expect(detectRisingEdge(detector, 1)).toBe(true); // 0 -> 1
      expect(detectRisingEdge(detector, 0)).toBe(false); // 1 -> 0

      // Clock pulse 3
      expect(detectRisingEdge(detector, 1)).toBe(true); // 0 -> 1
    });
  });
});
