import { describe, it, expect } from 'vitest';
import {
  serializeCircuit,
  deserializeCircuit,
  type CircuitData,
} from '../circuit-serializer';
import type { BreadboardState, Resistor, LED, PowerSupply, Ground, Wire } from '../types';
import { ComponentType } from '../types';

describe('circuit-serializer', () => {
  describe('serializeCircuit', () => {
    it('should serialize an empty circuit', () => {
      const state: BreadboardState = {
        components: [],
        selectedComponentId: null,
      };

      const json = serializeCircuit(state, { name: 'Empty Circuit' });
      const data = JSON.parse(json) as CircuitData;

      expect(data.version).toBe('1.0');
      expect(data.metadata.name).toBe('Empty Circuit');
      expect(data.components).toEqual([]);
      expect(data.metadata.created).toBeDefined();
    });

    it('should serialize a circuit with a resistor', () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 0 },
          { row: 10, col: 0 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      const json = serializeCircuit(state, { name: 'Resistor Circuit' });
      const data = JSON.parse(json) as CircuitData;

      expect(data.components.length).toBe(1);
      expect(data.components[0].id).toBe('r1');
      expect(data.components[0].type).toBe('RESISTOR');
      expect(data.components[0].positions).toEqual([
        { row: 5, col: 0 },
        { row: 10, col: 0 },
      ]);
      expect(data.components[0].metadata?.resistance).toBe(1000);
    });

    it('should serialize a circuit with multiple component types', () => {
      const powerSupply: PowerSupply = {
        id: 'ps1',
        type: ComponentType.POWER_SUPPLY,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        voltage: 5.0,
      };

      const led: LED = {
        id: 'led1',
        type: ComponentType.LED,
        positions: [
          { row: 5, col: 0 },
          { row: 10, col: 0 },
        ],
        rotation: 90,
        forwardVoltage: 2.0,
        maxCurrent: 0.02,
      };

      const ground: Ground = {
        id: 'gnd1',
        type: ComponentType.GROUND,
        positions: [{ row: 15, col: 0 }],
        rotation: 0,
      };

      const state: BreadboardState = {
        components: [powerSupply, led, ground],
        selectedComponentId: null,
      };

      const json = serializeCircuit(state, {
        name: 'LED Circuit',
        description: 'A simple LED circuit',
      });
      const data = JSON.parse(json) as CircuitData;

      expect(data.components.length).toBe(3);
      expect(data.metadata.name).toBe('LED Circuit');
      expect(data.metadata.description).toBe('A simple LED circuit');

      // Check power supply
      expect(data.components[0].type).toBe('POWER_SUPPLY');
      expect(data.components[0].metadata?.voltage).toBe(5.0);

      // Check LED
      expect(data.components[1].type).toBe('LED');
      expect(data.components[1].rotation).toBe(90);
      expect(data.components[1].metadata?.forwardVoltage).toBe(2.0);
      expect(data.components[1].metadata?.maxCurrent).toBe(0.02);

      // Check ground
      expect(data.components[2].type).toBe('GROUND');
      expect(data.components[2].metadata).toBeUndefined();
    });

    it('should serialize a wire component', () => {
      const wire: Wire = {
        id: 'w1',
        type: ComponentType.WIRE,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 0.01,
      };

      const state: BreadboardState = {
        components: [wire],
        selectedComponentId: null,
      };

      const json = serializeCircuit(state);
      const data = JSON.parse(json) as CircuitData;

      expect(data.components[0].type).toBe('WIRE');
      expect(data.components[0].metadata?.resistance).toBe(0.01);
    });
  });

  describe('deserializeCircuit', () => {
    it('should deserialize an empty circuit', () => {
      const json = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'Empty Circuit',
          created: '2026-01-01T00:00:00.000Z',
        },
        components: [],
      });

      const { state, metadata } = deserializeCircuit(json);

      expect(state.components.length).toBe(0);
      expect(state.selectedComponentId).toBeNull();
      expect(metadata.name).toBe('Empty Circuit');
    });

    it('should deserialize a circuit with a resistor', () => {
      const json = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'Resistor Circuit',
          created: '2026-01-01T00:00:00.000Z',
        },
        components: [
          {
            id: 'r1',
            type: 'RESISTOR',
            positions: [
              { row: 5, col: 0 },
              { row: 10, col: 0 },
            ],
            rotation: 0,
            metadata: { resistance: 1000 },
          },
        ],
      });

      const { state } = deserializeCircuit(json);

      expect(state.components.length).toBe(1);
      const resistor = state.components[0];
      expect(resistor.id).toBe('r1');
      expect(resistor.type).toBe(ComponentType.RESISTOR);
      expect((resistor as Resistor).resistance).toBe(1000);
    });

    it('should deserialize all component types correctly', () => {
      const json = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'Full Circuit',
          created: '2026-01-01T00:00:00.000Z',
        },
        components: [
          {
            id: 'ps1',
            type: 'POWER_SUPPLY',
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 5 },
            ],
            rotation: 0,
            metadata: { voltage: 5.0 },
          },
          {
            id: 'r1',
            type: 'RESISTOR',
            positions: [
              { row: 5, col: 0 },
              { row: 10, col: 0 },
            ],
            rotation: 0,
            metadata: { resistance: 220 },
          },
          {
            id: 'led1',
            type: 'LED',
            positions: [
              { row: 12, col: 0 },
              { row: 14, col: 0 },
            ],
            rotation: 0,
            metadata: { forwardVoltage: 2.0, maxCurrent: 0.02 },
          },
          {
            id: 'w1',
            type: 'WIRE',
            positions: [
              { row: 0, col: 5 },
              { row: 20, col: 5 },
            ],
            rotation: 0,
            metadata: { resistance: 0.01 },
          },
          {
            id: 'gnd1',
            type: 'GROUND',
            positions: [{ row: 20, col: 0 }],
            rotation: 0,
          },
        ],
      });

      const { state } = deserializeCircuit(json);

      expect(state.components.length).toBe(5);

      const powerSupply = state.components[0] as PowerSupply;
      expect(powerSupply.type).toBe(ComponentType.POWER_SUPPLY);
      expect(powerSupply.voltage).toBe(5.0);

      const resistor = state.components[1] as Resistor;
      expect(resistor.type).toBe(ComponentType.RESISTOR);
      expect(resistor.resistance).toBe(220);

      const led = state.components[2] as LED;
      expect(led.type).toBe(ComponentType.LED);
      expect(led.forwardVoltage).toBe(2.0);
      expect(led.maxCurrent).toBe(0.02);

      const wire = state.components[3] as Wire;
      expect(wire.type).toBe(ComponentType.WIRE);
      expect(wire.resistance).toBe(0.01);

      const ground = state.components[4] as Ground;
      expect(ground.type).toBe(ComponentType.GROUND);
    });

    it('should use default values for missing component properties', () => {
      const json = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'Circuit with defaults',
          created: '2026-01-01T00:00:00.000Z',
        },
        components: [
          {
            id: 'r1',
            type: 'RESISTOR',
            positions: [
              { row: 5, col: 0 },
              { row: 10, col: 0 },
            ],
            rotation: 0,
            // No metadata - should use defaults
          },
        ],
      });

      const { state } = deserializeCircuit(json);

      const resistor = state.components[0] as Resistor;
      expect(resistor.resistance).toBe(1000); // Default value
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = 'not valid json {';

      expect(() => deserializeCircuit(invalidJson)).toThrow('Invalid JSON format');
    });

    it('should throw error for missing version', () => {
      const json = JSON.stringify({
        metadata: {
          name: 'Test',
          created: '2026-01-01T00:00:00.000Z',
        },
        components: [],
      });

      expect(() => deserializeCircuit(json)).toThrow('Invalid circuit data');
    });

    it('should throw error for missing metadata', () => {
      const json = JSON.stringify({
        version: '1.0',
        components: [],
      });

      expect(() => deserializeCircuit(json)).toThrow('Invalid circuit data');
    });

    it('should throw error for invalid component type', () => {
      const json = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'Test',
          created: '2026-01-01T00:00:00.000Z',
        },
        components: [
          {
            id: 'unknown1',
            type: 'UNKNOWN_TYPE',
            positions: [{ row: 0, col: 0 }],
            rotation: 0,
          },
        ],
      });

      expect(() => deserializeCircuit(json)).toThrow('Unknown component type');
    });

    it('should throw error for invalid rotation value', () => {
      const json = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'Test',
          created: '2026-01-01T00:00:00.000Z',
        },
        components: [
          {
            id: 'r1',
            type: 'RESISTOR',
            positions: [{ row: 0, col: 0 }],
            rotation: 45, // Invalid rotation
            metadata: { resistance: 1000 },
          },
        ],
      });

      expect(() => deserializeCircuit(json)).toThrow('Invalid rotation value');
    });
  });

  describe('roundtrip serialization', () => {
    it('should preserve all component data through serialize/deserialize', () => {
      const original: BreadboardState = {
        components: [
          {
            id: 'ps1',
            type: ComponentType.POWER_SUPPLY,
            positions: [
              { row: 0, col: 0 },
              { row: 0, col: 5 },
            ],
            rotation: 0,
            voltage: 9.0,
          },
          {
            id: 'r1',
            type: ComponentType.RESISTOR,
            positions: [
              { row: 5, col: 0 },
              { row: 10, col: 0 },
            ],
            rotation: 90,
            resistance: 470,
          },
          {
            id: 'led1',
            type: ComponentType.LED,
            positions: [
              { row: 12, col: 0 },
              { row: 14, col: 0 },
            ],
            rotation: 180,
            forwardVoltage: 2.2,
            maxCurrent: 0.02,
          },
          {
            id: 'gnd1',
            type: ComponentType.GROUND,
            positions: [{ row: 20, col: 0 }],
            rotation: 270,
          },
        ],
        selectedComponentId: null,
      };

      // Serialize
      const json = serializeCircuit(original, {
        name: 'Roundtrip Test',
        description: 'Testing serialization',
      });

      // Deserialize
      const { state: restored, metadata } = deserializeCircuit(json);

      // Verify metadata
      expect(metadata.name).toBe('Roundtrip Test');
      expect(metadata.description).toBe('Testing serialization');

      // Verify all components are restored correctly
      expect(restored.components.length).toBe(original.components.length);

      for (let i = 0; i < original.components.length; i++) {
        const originalComp = original.components[i];
        const restoredComp = restored.components[i];

        expect(restoredComp.id).toBe(originalComp.id);
        expect(restoredComp.type).toBe(originalComp.type);
        expect(restoredComp.positions).toEqual(originalComp.positions);
        expect(restoredComp.rotation).toBe(originalComp.rotation);

        // Check component-specific properties
        if (originalComp.type === ComponentType.RESISTOR) {
          expect((restoredComp as Resistor).resistance).toBe(
            (originalComp as Resistor).resistance
          );
        } else if (originalComp.type === ComponentType.LED) {
          expect((restoredComp as LED).forwardVoltage).toBe((originalComp as LED).forwardVoltage);
          expect((restoredComp as LED).maxCurrent).toBe((originalComp as LED).maxCurrent);
        } else if (originalComp.type === ComponentType.POWER_SUPPLY) {
          expect((restoredComp as PowerSupply).voltage).toBe((originalComp as PowerSupply).voltage);
        }
      }
    });
  });
});
