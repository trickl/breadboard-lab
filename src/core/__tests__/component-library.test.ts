/**
 * Tests for component library registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { componentLibrary } from '../component-library';
import type { ComponentLibraryEntry } from '../types';

describe('ComponentLibrary', () => {
  beforeEach(() => {
    componentLibrary.clear();
  });

  describe('register', () => {
    it('should register a component', () => {
      const entry: ComponentLibraryEntry = {
        id: 'resistor-220-5',
        name: '220Ω 1/4W 5% Resistor',
        category: 'passive',
        package: {
          kind: 'axial',
          pinCount: 2,
          leadSpacingMm: 10,
          body: { lengthMm: 6.5, widthMm: 2.5 },
        },
        footprint: {
          pins: [
            { pinId: 'pin1', role: 'terminal' },
            { pinId: 'pin2', role: 'terminal' },
          ],
        },
        electrical: {
          resistance: 220,
          tolerance: 5,
          powerRating: 0.25,
        },
        visuals: {
          renderer: 'procedural',
        },
      };

      componentLibrary.register(entry);
      expect(componentLibrary.get('resistor-220-5')).toEqual(entry);
    });

    it('should throw error for duplicate IDs', () => {
      const entry: ComponentLibraryEntry = {
        id: 'test-component',
        name: 'Test Component',
        category: 'passive',
        package: {
          kind: 'axial',
          pinCount: 2,
          body: {},
        },
        footprint: {
          pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }],
        },
        electrical: {},
        visuals: {
          renderer: 'procedural',
        },
      };

      componentLibrary.register(entry);
      expect(() => componentLibrary.register(entry)).toThrow(
        'Component with ID "test-component" already registered'
      );
    });
  });

  describe('get', () => {
    it('should return component by ID', () => {
      const entry: ComponentLibraryEntry = {
        id: 'led-5mm-red',
        name: '5mm Red LED',
        category: 'diode',
        package: {
          kind: 't1-3-4',
          pinCount: 2,
          body: { diameterMm: 5 },
        },
        footprint: {
          pins: [
            { pinId: 'anode', role: 'anode' },
            { pinId: 'cathode', role: 'cathode' },
          ],
        },
        electrical: {
          forwardVoltage: 2.0,
          maxCurrent: 0.02,
        },
        visuals: {
          renderer: 'procedural',
        },
      };

      componentLibrary.register(entry);
      expect(componentLibrary.get('led-5mm-red')).toEqual(entry);
    });

    it('should return undefined for unknown ID', () => {
      expect(componentLibrary.get('unknown-id')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all components', () => {
      const entry1: ComponentLibraryEntry = {
        id: 'component-1',
        name: 'Component 1',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      const entry2: ComponentLibraryEntry = {
        id: 'component-2',
        name: 'Component 2',
        category: 'diode',
        package: { kind: 't1', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      componentLibrary.register(entry1);
      componentLibrary.register(entry2);

      const all = componentLibrary.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(entry1);
      expect(all).toContain(entry2);
    });

    it('should return empty array when no components registered', () => {
      expect(componentLibrary.getAll()).toEqual([]);
    });
  });

  describe('getByCategory', () => {
    it('should return components filtered by category', () => {
      const resistor: ComponentLibraryEntry = {
        id: 'resistor-1',
        name: 'Resistor',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      const led: ComponentLibraryEntry = {
        id: 'led-1',
        name: 'LED',
        category: 'diode',
        package: { kind: 't1', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      componentLibrary.register(resistor);
      componentLibrary.register(led);

      const passives = componentLibrary.getByCategory('passive');
      expect(passives).toHaveLength(1);
      expect(passives[0]).toEqual(resistor);

      const diodes = componentLibrary.getByCategory('diode');
      expect(diodes).toHaveLength(1);
      expect(diodes[0]).toEqual(led);
    });

    it('should return empty array for category with no components', () => {
      expect(componentLibrary.getByCategory('transistor')).toEqual([]);
    });
  });

  describe('search', () => {
    it('should search by name', () => {
      const entry: ComponentLibraryEntry = {
        id: 'resistor-220',
        name: '220Ω Resistor',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      componentLibrary.register(entry);

      const results = componentLibrary.search('220');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(entry);
    });

    it('should search by description', () => {
      const entry: ComponentLibraryEntry = {
        id: 'led-1',
        name: 'LED',
        category: 'diode',
        description: 'Ultra-bright yellow LED',
        package: { kind: 't1', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      componentLibrary.register(entry);

      const results = componentLibrary.search('ultra-bright');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(entry);
    });

    it('should search by part number', () => {
      const entry: ComponentLibraryEntry = {
        id: 'resistor-1',
        name: 'Resistor',
        category: 'passive',
        manufacturerPartNumber: 'CFR-25JB-52-220R',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      componentLibrary.register(entry);

      const results = componentLibrary.search('CFR-25JB');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(entry);
    });

    it('should be case insensitive', () => {
      const entry: ComponentLibraryEntry = {
        id: 'led-1',
        name: 'RED LED',
        category: 'diode',
        package: { kind: 't1', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      };

      componentLibrary.register(entry);

      expect(componentLibrary.search('red')).toHaveLength(1);
      expect(componentLibrary.search('RED')).toHaveLength(1);
      expect(componentLibrary.search('Red')).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      expect(componentLibrary.search('nonexistent')).toEqual([]);
    });
  });
});
