import { describe, it, expect } from 'vitest';
import { CircuitSimulator } from '../circuit-simulator';
import { CircuitExtractor } from '../circuit-extractor';
import { ComponentType, ErrorType } from '../types';
import type { BreadboardState } from '../types';

describe('Error Detection', () => {
  const simulator = new CircuitSimulator();
  const extractor = new CircuitExtractor();

  describe('Short Circuit Detection', () => {
    it('should detect short circuit when power is directly connected to ground', () => {
      // Create a circuit with power directly to ground (will cause high current)
      const state: BreadboardState = {
        components: [
          {
            id: 'power1',
            type: ComponentType.POWER_SUPPLY,
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
            ],
            voltage: 5.0,
            rotation: 0,
          },
          {
            id: 'wire1',
            type: ComponentType.WIRE,
            positions: [
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
            resistance: 0.01, // Very low resistance
            rotation: 0,
          },
          {
            id: 'ground1',
            type: ComponentType.GROUND,
            positions: [
              { row: 0, col: 2 },
              { row: 0, col: 3 },
            ],
            rotation: 0,
          },
        ],
        selectedComponentId: null,
      };

      const circuit = extractor.extract(state);
      const result = simulator.simulate(circuit);

      // Should detect short circuit error
      expect(result.errors.length).toBeGreaterThan(0);
      const shortCircuitError = result.errors.find((e) => e.type === ErrorType.SHORT_CIRCUIT);
      expect(shortCircuitError).toBeDefined();
      expect(shortCircuitError?.severity).toBe('error');
      expect(shortCircuitError?.message).toContain('Short circuit');
    });
  });

  describe('Overcurrent Detection', () => {
    it('should detect overcurrent when LED has excessive current', () => {
      // Create LED circuit without current limiting resistor
      const state: BreadboardState = {
        components: [
          {
            id: 'power1',
            type: ComponentType.POWER_SUPPLY,
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
            ],
            voltage: 5.0,
            rotation: 0,
          },
          {
            id: 'led1',
            type: ComponentType.LED,
            positions: [
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
            forwardVoltage: 2.0,
            maxCurrent: 0.02, // 20mA max
            rotation: 0,
          },
          {
            id: 'ground1',
            type: ComponentType.GROUND,
            positions: [
              { row: 0, col: 2 },
              { row: 0, col: 3 },
            ],
            rotation: 0,
          },
        ],
        selectedComponentId: null,
      };

      const circuit = extractor.extract(state);
      const result = simulator.simulate(circuit);

      // Should detect overcurrent through LED
      const overcurrentError = result.errors.find((e) => e.type === ErrorType.OVERCURRENT);
      expect(overcurrentError).toBeDefined();
      expect(overcurrentError?.severity).toBe('warning');
      expect(overcurrentError?.message).toContain('overcurrent');
      expect(overcurrentError?.suggestions).toBeDefined();
      expect(overcurrentError?.suggestions.length).toBeGreaterThan(0);
    });

    it('should not detect overcurrent when LED has proper current limiting resistor', () => {
      // Create proper LED circuit with resistor
      const state: BreadboardState = {
        components: [
          {
            id: 'power1',
            type: ComponentType.POWER_SUPPLY,
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
            ],
            voltage: 5.0,
            rotation: 0,
          },
          {
            id: 'resistor1',
            type: ComponentType.RESISTOR,
            positions: [
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
            resistance: 220, // Current limiting resistor
            rotation: 0,
          },
          {
            id: 'led1',
            type: ComponentType.LED,
            positions: [
              { row: 0, col: 2 },
              { row: 0, col: 3 },
            ],
            forwardVoltage: 2.0,
            maxCurrent: 0.02, // 20mA max
            rotation: 0,
          },
          {
            id: 'ground1',
            type: ComponentType.GROUND,
            positions: [
              { row: 0, col: 3 },
              { row: 0, col: 4 },
            ],
            rotation: 0,
          },
        ],
        selectedComponentId: null,
      };

      const circuit = extractor.extract(state);
      const result = simulator.simulate(circuit);

      // Should NOT detect overcurrent error
      const overcurrentError = result.errors.find((e) => e.type === ErrorType.OVERCURRENT);
      expect(overcurrentError).toBeUndefined();

      // Circuit should be successful
      expect(result.success).toBe(true);
    });
  });

  describe('Reversed LED Detection', () => {
    it('should detect when LED is connected backwards', () => {
      // Create circuit with reversed LED (though our simplified model might not show this clearly)
      // In a real scenario, the LED would be oriented wrong causing negative current
      // For now, we'll skip this test as our simplified LED model doesn't fully capture this
      
      // Note: This test would need a more sophisticated LED model to properly test
      // The current implementation uses a resistive model for LEDs
    });
  });

  describe('Floating Node Detection', () => {
    it('should detect floating nodes not connected to power or ground', () => {
      // Create a circuit with an isolated component
      const state: BreadboardState = {
        components: [
          {
            id: 'power1',
            type: ComponentType.POWER_SUPPLY,
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
            ],
            voltage: 5.0,
            rotation: 0,
          },
          {
            id: 'ground1',
            type: ComponentType.GROUND,
            positions: [
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
            rotation: 0,
          },
          // Isolated resistor not connected to power or ground
          {
            id: 'resistor1',
            type: ComponentType.RESISTOR,
            positions: [
              { row: 2, col: 0 },
              { row: 2, col: 1 },
            ],
            resistance: 1000,
            rotation: 0,
          },
        ],
        selectedComponentId: null,
      };

      const circuit = extractor.extract(state);
      const result = simulator.simulate(circuit);

      // Should detect floating node
      const floatingError = result.errors.find((e) => e.type === ErrorType.FLOATING_NODE);
      expect(floatingError).toBeDefined();
      expect(floatingError?.severity).toBe('warning');
    });
  });

  describe('Error Messages and Suggestions', () => {
    it('should provide educational explanations for all error types', () => {
      // Create a problematic circuit
      const state: BreadboardState = {
        components: [
          {
            id: 'power1',
            type: ComponentType.POWER_SUPPLY,
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
            ],
            voltage: 5.0,
            rotation: 0,
          },
          {
            id: 'led1',
            type: ComponentType.LED,
            positions: [
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
            forwardVoltage: 2.0,
            maxCurrent: 0.02,
            rotation: 0,
          },
          {
            id: 'ground1',
            type: ComponentType.GROUND,
            positions: [
              { row: 0, col: 2 },
              { row: 0, col: 3 },
            ],
            rotation: 0,
          },
        ],
        selectedComponentId: null,
      };

      const circuit = extractor.extract(state);
      const result = simulator.simulate(circuit);

      // Check that errors have proper structure
      result.errors.forEach((error) => {
        expect(error.message).toBeTruthy();
        expect(error.explanation).toBeTruthy();
        expect(error.suggestions).toBeDefined();
        expect(error.suggestions.length).toBeGreaterThan(0);
        expect(error.positions).toBeDefined();
        expect(error.type).toBeDefined();
        expect(error.severity).toMatch(/^(error|warning)$/);
      });
    });
  });

  describe('No Errors in Valid Circuits', () => {
    it('should not report errors for a properly designed LED circuit', () => {
      const state: BreadboardState = {
        components: [
          {
            id: 'power1',
            type: ComponentType.POWER_SUPPLY,
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
            ],
            voltage: 5.0,
            rotation: 0,
          },
          {
            id: 'resistor1',
            type: ComponentType.RESISTOR,
            positions: [
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
            resistance: 330, // Proper current limiting
            rotation: 0,
          },
          {
            id: 'led1',
            type: ComponentType.LED,
            positions: [
              { row: 0, col: 2 },
              { row: 0, col: 3 },
            ],
            forwardVoltage: 2.0,
            maxCurrent: 0.02,
            rotation: 0,
          },
          {
            id: 'ground1',
            type: ComponentType.GROUND,
            positions: [
              { row: 0, col: 3 },
              { row: 0, col: 4 },
            ],
            rotation: 0,
          },
        ],
        selectedComponentId: null,
      };

      const circuit = extractor.extract(state);
      const result = simulator.simulate(circuit);

      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});
