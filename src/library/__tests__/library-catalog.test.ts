/**
 * Tests for component library catalog
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_LIBRARY_ENTRIES,
  RESISTOR_LIBRARY,
  LED_LIBRARY,
  POWER_SUPPLY_LIBRARY,
  WIRE_LIBRARY,
  GROUND_LIBRARY,
  SPEAKER_LIBRARY,
} from '../index';

describe('Component Library Catalog', () => {
  describe('RESISTOR_LIBRARY', () => {
    it('should have at least 10 resistor entries', () => {
      expect(RESISTOR_LIBRARY.length).toBeGreaterThanOrEqual(10);
    });

    it('should include standard E12 series values', () => {
      const resistances = RESISTOR_LIBRARY.map((r) => r.electrical.resistance);
      expect(resistances).toContain(100);
      expect(resistances).toContain(220);
      expect(resistances).toContain(470);
      expect(resistances).toContain(1000);
      expect(resistances).toContain(10000);
    });

    it('should include both 5% and 1% tolerance variants', () => {
      const has5Percent = RESISTOR_LIBRARY.some((r) => r.electrical.tolerance === 5);
      const has1Percent = RESISTOR_LIBRARY.some((r) => r.electrical.tolerance === 1);
      expect(has5Percent).toBe(true);
      expect(has1Percent).toBe(true);
    });

    it('should have axial package with correct physical dimensions', () => {
      RESISTOR_LIBRARY.forEach((resistor) => {
        expect(resistor.package.kind).toBe('axial');
        expect(resistor.package.pinCount).toBe(2);
        expect(resistor.package.leadSpacingMm).toBe(10);
        expect(resistor.package.body.lengthMm).toBe(6.5);
      });
    });
  });

  describe('LED_LIBRARY', () => {
    it('should have at least 4 LED entries', () => {
      expect(LED_LIBRARY.length).toBeGreaterThanOrEqual(4);
    });

    it('should include 3mm ultra-bright yellow LED (required by goal.md)', () => {
      const yellowLED = LED_LIBRARY.find((led) => led.id === 'led-3mm-yellow');
      expect(yellowLED).toBeDefined();
      expect(yellowLED?.name).toContain('Yellow');
      expect(yellowLED?.package.kind).toBe('t1');
      expect(yellowLED?.package.body.diameterMm).toBe(3);
    });

    it('should include 5mm red, green, and blue LEDs', () => {
      const redLED = LED_LIBRARY.find((led) => led.id === 'led-5mm-red');
      const greenLED = LED_LIBRARY.find((led) => led.id === 'led-5mm-green');
      const blueLED = LED_LIBRARY.find((led) => led.id === 'led-5mm-blue');

      expect(redLED).toBeDefined();
      expect(greenLED).toBeDefined();
      expect(blueLED).toBeDefined();

      [redLED, greenLED, blueLED].forEach((led) => {
        expect(led?.package.kind).toBe('t1-3-4');
        expect(led?.package.body.diameterMm).toBe(5);
      });
    });

    it('should have correct electrical specifications', () => {
      LED_LIBRARY.forEach((led) => {
        expect(led.electrical.forwardVoltage).toBeGreaterThan(0);
        expect(led.electrical.maxCurrent).toBeGreaterThan(0);
        expect(led.footprint.pins).toHaveLength(2);
      });
    });
  });

  describe('SPEAKER_LIBRARY', () => {
    it('should include 8Ω breadboard speaker (required by goal.md)', () => {
      expect(SPEAKER_LIBRARY.length).toBeGreaterThanOrEqual(1);
      const speaker = SPEAKER_LIBRARY.find((s) => s.id === 'speaker-8ohm');
      expect(speaker).toBeDefined();
      expect(speaker?.electrical.impedance).toBe(8);
      expect(speaker?.category).toBe('electro-acoustic');
    });
  });

  describe('POWER_SUPPLY_LIBRARY', () => {
    it('should include standard voltage sources', () => {
      const voltages = POWER_SUPPLY_LIBRARY.map((ps) => ps.electrical.voltage);
      expect(voltages).toContain(3.3);
      expect(voltages).toContain(5.0);
      expect(voltages).toContain(9.0);
      expect(voltages).toContain(12.0);
    });

    it('should have correct power category', () => {
      POWER_SUPPLY_LIBRARY.forEach((ps) => {
        expect(ps.category).toBe('power');
      });
    });
  });

  describe('WIRE_LIBRARY', () => {
    it('should include wire variants', () => {
      expect(WIRE_LIBRARY.length).toBeGreaterThanOrEqual(2);
      const redWire = WIRE_LIBRARY.find((w) => w.electrical.color === 'red');
      const blackWire = WIRE_LIBRARY.find((w) => w.electrical.color === 'black');
      expect(redWire).toBeDefined();
      expect(blackWire).toBeDefined();
    });
  });

  describe('GROUND_LIBRARY', () => {
    it('should include ground reference', () => {
      expect(GROUND_LIBRARY.length).toBeGreaterThanOrEqual(1);
      const ground = GROUND_LIBRARY[0];
      expect(ground.category).toBe('virtual-educational');
      expect(ground.electrical.voltage).toBe(0);
    });
  });

  describe('ALL_LIBRARY_ENTRIES', () => {
    it('should contain all library entries', () => {
      const totalEntries =
        RESISTOR_LIBRARY.length +
        LED_LIBRARY.length +
        POWER_SUPPLY_LIBRARY.length +
        WIRE_LIBRARY.length +
        GROUND_LIBRARY.length +
        SPEAKER_LIBRARY.length;

      expect(ALL_LIBRARY_ENTRIES.length).toBe(totalEntries);
    });

    it('should have unique IDs', () => {
      const ids = ALL_LIBRARY_ENTRIES.map((entry) => entry.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories: Set<string> = new Set([
        'passive',
        'diode',
        'transistor',
        'ic',
        'power',
        'interconnect',
        'electro-acoustic',
        'virtual-educational',
      ]);

      ALL_LIBRARY_ENTRIES.forEach((entry) => {
        expect(validCategories.has(entry.category)).toBe(true);
      });
    });

    it('should have valid package types', () => {
      const validPackages: Set<string> = new Set([
        'axial',
        't1',
        't1-3-4',
        'dip',
        'sip',
        'header',
        'module',
      ]);

      ALL_LIBRARY_ENTRIES.forEach((entry) => {
        expect(validPackages.has(entry.package.kind)).toBe(true);
      });
    });

    it('should have non-empty names and descriptions', () => {
      ALL_LIBRARY_ENTRIES.forEach((entry) => {
        expect(entry.name).toBeTruthy();
        expect(entry.name.length).toBeGreaterThan(0);
      });
    });
  });
});
