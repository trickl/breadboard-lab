/**
 * Tests for component library utility functions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { componentLibrary } from '../component-library';
import { ALL_LIBRARY_ENTRIES } from '../../library';
import {
  findClosestResistor,
  findClosestLED,
  findPowerSupply,
  findDefaultWire,
  findGround,
  getDefaultLibraryId,
  getComponentPropertiesFromLibrary,
} from '../component-library-utils';
import { ComponentType } from '../types';
import type { Resistor, LED, PowerSupply, Wire, Ground } from '../types';

// Initialize library before tests
beforeAll(() => {
  ALL_LIBRARY_ENTRIES.forEach((entry) => {
    componentLibrary.register(entry);
  });
});

describe('Component Library Utils', () => {
  describe('findClosestResistor', () => {
    it('should find exact match for standard values', () => {
      const id = findClosestResistor(220, 5);
      expect(id).toBeDefined();
      const entry = componentLibrary.get(id!);
      expect(entry?.electrical.resistance).toBe(220);
      expect(entry?.electrical.tolerance).toBe(5);
    });

    it('should find closest match for non-standard values', () => {
      const id = findClosestResistor(250, 5); // Between 220 and 270
      expect(id).toBeDefined();
      const entry = componentLibrary.get(id!);
      // Should be either 220 or 270
      expect([220, 270]).toContain(entry?.electrical.resistance);
    });

    it('should respect tolerance parameter', () => {
      const id5pct = findClosestResistor(1000, 5);
      const id1pct = findClosestResistor(1000, 1);
      expect(id5pct).toBeDefined();
      expect(id1pct).toBeDefined();
      expect(id5pct).not.toBe(id1pct);
    });
  });

  describe('findClosestLED', () => {
    it('should find LED with closest forward voltage', () => {
      const id = findClosestLED(2.0);
      expect(id).toBeDefined();
      const entry = componentLibrary.get(id!);
      expect(entry?.category).toBe('diode');
      // Should be close to 2.0V (red or yellow or green LED)
      expect(Math.abs((entry?.electrical.forwardVoltage as number) - 2.0)).toBeLessThan(0.5);
    });

    it('should find blue LED for high forward voltage', () => {
      const id = findClosestLED(3.1);
      expect(id).toBeDefined();
      const entry = componentLibrary.get(id!);
      expect(entry?.electrical.forwardVoltage).toBe(3.1);
    });
  });

  describe('findPowerSupply', () => {
    it('should find exact voltage match', () => {
      const id = findPowerSupply(5.0);
      expect(id).toBeDefined();
      const entry = componentLibrary.get(id!);
      expect(entry?.electrical.voltage).toBe(5.0);
    });

    it('should return undefined for unsupported voltage', () => {
      const id = findPowerSupply(7.5);
      expect(id).toBeUndefined();
    });
  });

  describe('findDefaultWire', () => {
    it('should return a wire library entry', () => {
      const id = findDefaultWire();
      expect(id).toBeDefined();
      const entry = componentLibrary.get(id!);
      expect(entry?.category).toBe('interconnect');
    });
  });

  describe('findGround', () => {
    it('should return ground library entry', () => {
      const id = findGround();
      expect(id).toBeDefined();
      const entry = componentLibrary.get(id!);
      expect(entry?.category).toBe('virtual-educational');
    });
  });

  describe('getDefaultLibraryId', () => {
    it('should return existing library ID if present', () => {
      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [],
        rotation: 0,
        resistance: 220,
        libraryId: 'resistor-220-5pct',
      };

      const libId = getDefaultLibraryId(component);
      expect(libId).toBe('resistor-220-5pct');
    });

    it('should find library ID for resistor without library ID', () => {
      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [],
        rotation: 0,
        resistance: 1000,
      };

      const libId = getDefaultLibraryId(component);
      expect(libId).toBeDefined();
      const entry = componentLibrary.get(libId!);
      expect(entry?.electrical.resistance).toBe(1000);
    });

    it('should find library ID for LED without library ID', () => {
      const component: LED = {
        id: 'comp-1',
        type: ComponentType.LED,
        positions: [],
        rotation: 0,
        forwardVoltage: 2.0,
        maxCurrent: 0.02,
      };

      const libId = getDefaultLibraryId(component);
      expect(libId).toBeDefined();
      const entry = componentLibrary.get(libId!);
      expect(entry?.category).toBe('diode');
    });

    it('should find library ID for power supply', () => {
      const component: PowerSupply = {
        id: 'comp-1',
        type: ComponentType.POWER_SUPPLY,
        positions: [],
        rotation: 0,
        voltage: 5.0,
      };

      const libId = getDefaultLibraryId(component);
      expect(libId).toBeDefined();
      const entry = componentLibrary.get(libId!);
      expect(entry?.electrical.voltage).toBe(5.0);
    });

    it('should find library ID for wire', () => {
      const component: Wire = {
        id: 'comp-1',
        type: ComponentType.WIRE,
        positions: [],
        rotation: 0,
        resistance: 0.01,
      };

      const libId = getDefaultLibraryId(component);
      expect(libId).toBeDefined();
      const entry = componentLibrary.get(libId!);
      expect(entry?.category).toBe('interconnect');
    });

    it('should find library ID for ground', () => {
      const component: Ground = {
        id: 'comp-1',
        type: ComponentType.GROUND,
        positions: [],
        rotation: 0,
      };

      const libId = getDefaultLibraryId(component);
      expect(libId).toBeDefined();
      const entry = componentLibrary.get(libId!);
      expect(entry?.category).toBe('virtual-educational');
    });
  });

  describe('getComponentPropertiesFromLibrary', () => {
    it('should return library properties for resistor with library ID', () => {
      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [],
        rotation: 0,
        resistance: 999, // Wrong value
        libraryId: 'resistor-220-5pct',
      };

      const props = getComponentPropertiesFromLibrary(component) as Partial<Resistor>;
      expect(props.resistance).toBe(220); // Should use library value
    });

    it('should return library properties for LED with library ID', () => {
      const component: LED = {
        id: 'comp-1',
        type: ComponentType.LED,
        positions: [],
        rotation: 0,
        forwardVoltage: 1.0, // Wrong value
        maxCurrent: 0.01,
        libraryId: 'led-5mm-red',
      };

      const props = getComponentPropertiesFromLibrary(component) as Partial<LED>;
      expect(props.forwardVoltage).toBe(1.9); // Should use library value
      expect(props.maxCurrent).toBe(0.02); // Should use library value
    });

    it('should use component properties if no library ID', () => {
      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [],
        rotation: 0,
        resistance: 12345, // Custom value
      };

      const props = getComponentPropertiesFromLibrary(component) as Partial<Resistor>;
      // Should find closest resistor in library and use its value
      expect(props.resistance).toBeDefined();
    });

    it('should handle missing library entry gracefully', () => {
      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [],
        rotation: 0,
        resistance: 220,
        libraryId: 'nonexistent-id',
      };

      const props = getComponentPropertiesFromLibrary(component);
      // Should fall back to component properties
      expect(props).toEqual(component);
    });
  });
});
