import { describe, it, expect } from 'vitest';
import { CircuitExtractor } from '../circuit-extractor';
import { ComponentType } from '../types';
import type { BreadboardState } from '../types';

describe('CircuitExtractor', () => {
  const extractor = new CircuitExtractor();

  it('should extract empty circuit from empty breadboard', () => {
    const state: BreadboardState = {
      components: [],
    };

    const circuit = extractor.extract(state);

    expect(circuit.nodes.size).toBeGreaterThan(0); // Should have nodes for all positions
    expect(circuit.edges.length).toBe(0); // No components = no edges
  });

  it('should create edge for wire connecting two nodes', () => {
    const state: BreadboardState = {
      components: [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 5, col: 0 }, // Left terminal strip
            { row: 5, col: 5 }, // Right terminal strip
          ],
          resistance: 0.01,
        },
      ],
    };

    const circuit = extractor.extract(state);

    expect(circuit.edges.length).toBe(1);
    expect(circuit.edges[0].component.id).toBe('wire1');
  });

  it('should not create edge for component within same node', () => {
    const state: BreadboardState = {
      components: [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 5, col: 0 }, // Same terminal strip
            { row: 5, col: 1 }, // Same terminal strip (internally connected)
          ],
          resistance: 0.01,
        },
      ],
    };

    const circuit = extractor.extract(state);

    // Since both positions are in the same terminal strip row, they're already connected
    // So no edge should be created
    expect(circuit.edges.length).toBe(0);
  });

  it('should handle multiple components', () => {
    const state: BreadboardState = {
      components: [
        {
          id: 'resistor1',
          type: ComponentType.RESISTOR,
          positions: [
            { row: 5, col: 0 },
            { row: 10, col: 0 },
          ],
          resistance: 1000,
        },
        {
          id: 'led1',
          type: ComponentType.LED,
          positions: [
            { row: 10, col: 5 },
            { row: 15, col: 5 },
          ],
          forwardVoltage: 2.0,
          maxCurrent: 0.02,
        },
      ],
    };

    const circuit = extractor.extract(state);
    
    expect(circuit.edges.length).toBe(2);
  });
});
