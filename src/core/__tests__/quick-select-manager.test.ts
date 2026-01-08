/**
 * Tests for QuickSelectManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuickSelectManager } from '../quick-select-manager';
import { componentLibrary } from '../component-library';
import type { ComponentLibraryEntry } from '../types';

describe('QuickSelectManager', () => {
  let manager: QuickSelectManager;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = global.localStorage;
    
    // Mock localStorage
    const storage: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
      key: (index: number) => Object.keys(storage)[index] || null,
      length: Object.keys(storage).length,
    } as Storage;

    // Clear component library and register test components
    componentLibrary.clear();
    
    // Register default components
    const defaultComponents: ComponentLibraryEntry[] = [
      {
        id: 'led-3mm-yellow',
        name: '3mm Yellow LED',
        category: 'diode',
        package: { kind: 't1', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'anode' }, { pinId: 'cathode' }] },
        electrical: { forwardVoltage: 2.1 },
        visuals: { renderer: 'procedural' },
      },
      {
        id: 'wire-22awg-red',
        name: '22 AWG Red Wire',
        category: 'interconnect',
        package: { kind: 'header', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'end1' }, { pinId: 'end2' }] },
        electrical: { resistance: 0.01 },
        visuals: { renderer: 'procedural' },
      },
      {
        id: 'resistor-220-5pct',
        name: '220Ω Resistor',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: { resistance: 220 },
        visuals: { renderer: 'procedural' },
      },
      {
        id: 'switch-spst',
        name: 'SPST Switch',
        category: 'interconnect',
        package: { kind: 'header', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'terminal1' }, { pinId: 'terminal2' }] },
        electrical: { contactResistance: 0.01 },
        visuals: { renderer: 'procedural' },
      },
      {
        id: 'power-5v',
        name: '5V Power Supply',
        category: 'power',
        package: { kind: 'module', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'positive' }, { pinId: 'negative' }] },
        electrical: { voltage: 5.0 },
        visuals: { renderer: 'procedural' },
      },
      {
        id: 'resistor-1k-5pct',
        name: '1kΩ Resistor',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'pin1' }, { pinId: 'pin2' }] },
        electrical: { resistance: 1000 },
        visuals: { renderer: 'procedural' },
      },
    ];

    defaultComponents.forEach(entry => componentLibrary.register(entry));

    // Clear localStorage
    localStorage.clear();
    
    // Create new manager instance
    manager = new QuickSelectManager();
  });

  afterEach(() => {
    // Restore original localStorage
    global.localStorage = originalLocalStorage;
  });

  describe('initialization', () => {
    it('should initialize with default 5 components when localStorage is empty', () => {
      const components = manager.getComponents();
      expect(components).toHaveLength(5);
      expect(components[0].libraryId).toBe('led-3mm-yellow');
      expect(components[1].libraryId).toBe('wire-22awg-red');
      expect(components[2].libraryId).toBe('resistor-220-5pct');
      expect(components[3].libraryId).toBe('switch-spst');
      expect(components[4].libraryId).toBe('power-5v');
    });

    it('should mark default components as default', () => {
      const components = manager.getComponents();
      components.forEach(c => {
        expect(c.isDefault).toBe(true);
      });
    });

    it('should assign correct order to default components', () => {
      const components = manager.getComponents();
      components.forEach((c, index) => {
        expect(c.order).toBe(index);
      });
    });
  });

  describe('load and save', () => {
    it('should load persisted state from localStorage', () => {
      // Add a custom component
      manager.addComponent('resistor-1k-5pct');
      
      // Create new manager instance (should load from localStorage)
      const newManager = new QuickSelectManager();
      const components = newManager.getComponents();
      
      expect(components).toHaveLength(6);
      expect(components[5].libraryId).toBe('resistor-1k-5pct');
    });

    it('should save state to localStorage after adding component', () => {
      manager.addComponent('resistor-1k-5pct');
      
      const stored = localStorage.getItem('quickSelectComponents');
      expect(stored).not.toBeNull();
      
      const state = JSON.parse(stored!);
      expect(state.components).toHaveLength(6);
    });

    it('should save state to localStorage after removing component', () => {
      manager.addComponent('resistor-1k-5pct');
      manager.removeComponent('resistor-1k-5pct');
      
      const stored = localStorage.getItem('quickSelectComponents');
      expect(stored).not.toBeNull();
      
      const state = JSON.parse(stored!);
      expect(state.components).toHaveLength(5);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorage.setItem('quickSelectComponents', 'invalid json');
      
      const newManager = new QuickSelectManager();
      const components = newManager.getComponents();
      
      expect(components).toHaveLength(5); // Falls back to defaults
    });
  });

  describe('addComponent', () => {
    it('should add a valid component successfully', () => {
      const result = manager.addComponent('resistor-1k-5pct');
      
      expect(result).toBe(true);
      expect(manager.hasComponent('resistor-1k-5pct')).toBe(true);
      expect(manager.getComponents()).toHaveLength(6);
    });

    it('should reject adding when at capacity (8 components max)', () => {
      // Add 3 more components to reach max (5 defaults + 3 = 8)
      manager.addComponent('resistor-1k-5pct');
      componentLibrary.register({
        id: 'test-component-1',
        name: 'Test 1',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'p1' }, { pinId: 'p2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      });
      componentLibrary.register({
        id: 'test-component-2',
        name: 'Test 2',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'p1' }, { pinId: 'p2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      });
      manager.addComponent('test-component-1');
      manager.addComponent('test-component-2');
      
      expect(manager.getComponents()).toHaveLength(8);
      expect(manager.isAtCapacity()).toBe(true);
      
      // Try to add 9th component
      componentLibrary.register({
        id: 'test-component-3',
        name: 'Test 3',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'p1' }, { pinId: 'p2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      });
      const result = manager.addComponent('test-component-3');
      
      expect(result).toBe(false);
      expect(manager.getComponents()).toHaveLength(8);
    });

    it('should reject adding component that already exists', () => {
      manager.addComponent('resistor-1k-5pct');
      const result = manager.addComponent('resistor-1k-5pct');
      
      expect(result).toBe(false);
      expect(manager.getComponents()).toHaveLength(6);
    });

    it('should reject adding component with invalid library ID', () => {
      const result = manager.addComponent('non-existent-component');
      
      expect(result).toBe(false);
      expect(manager.getComponents()).toHaveLength(5);
    });

    it('should mark added components as non-default', () => {
      manager.addComponent('resistor-1k-5pct');
      const components = manager.getComponents();
      const addedComponent = components.find(c => c.libraryId === 'resistor-1k-5pct');
      
      expect(addedComponent?.isDefault).toBe(false);
    });

    it('should assign correct order to added components', () => {
      manager.addComponent('resistor-1k-5pct');
      const components = manager.getComponents();
      const addedComponent = components.find(c => c.libraryId === 'resistor-1k-5pct');
      
      expect(addedComponent?.order).toBe(5);
    });
  });

  describe('removeComponent', () => {
    it('should remove custom component successfully', () => {
      manager.addComponent('resistor-1k-5pct');
      const result = manager.removeComponent('resistor-1k-5pct');
      
      expect(result).toBe(true);
      expect(manager.hasComponent('resistor-1k-5pct')).toBe(false);
      expect(manager.getComponents()).toHaveLength(5);
    });

    it('should reject removing default components', () => {
      const result = manager.removeComponent('led-3mm-yellow');
      
      expect(result).toBe(false);
      expect(manager.hasComponent('led-3mm-yellow')).toBe(true);
      expect(manager.getComponents()).toHaveLength(5);
    });

    it('should reorder components after removal', () => {
      manager.addComponent('resistor-1k-5pct');
      componentLibrary.register({
        id: 'test-component',
        name: 'Test',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'p1' }, { pinId: 'p2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      });
      manager.addComponent('test-component');
      
      manager.removeComponent('resistor-1k-5pct');
      
      const components = manager.getComponents();
      components.forEach((c, index) => {
        expect(c.order).toBe(index);
      });
    });
  });

  describe('hasComponent', () => {
    it('should return true for default components', () => {
      expect(manager.hasComponent('led-3mm-yellow')).toBe(true);
      expect(manager.hasComponent('wire-22awg-red')).toBe(true);
    });

    it('should return false for non-existent components', () => {
      expect(manager.hasComponent('resistor-1k-5pct')).toBe(false);
    });

    it('should return true for added custom components', () => {
      manager.addComponent('resistor-1k-5pct');
      expect(manager.hasComponent('resistor-1k-5pct')).toBe(true);
    });
  });

  describe('isAtCapacity', () => {
    it('should return false when below capacity', () => {
      expect(manager.isAtCapacity()).toBe(false);
    });

    it('should return true when at capacity (8 components)', () => {
      // Add 3 more components
      manager.addComponent('resistor-1k-5pct');
      componentLibrary.register({
        id: 'test-1',
        name: 'Test 1',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'p1' }, { pinId: 'p2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      });
      componentLibrary.register({
        id: 'test-2',
        name: 'Test 2',
        category: 'passive',
        package: { kind: 'axial', pinCount: 2, body: {} },
        footprint: { pins: [{ pinId: 'p1' }, { pinId: 'p2' }] },
        electrical: {},
        visuals: { renderer: 'procedural' },
      });
      manager.addComponent('test-1');
      manager.addComponent('test-2');
      
      expect(manager.isAtCapacity()).toBe(true);
    });
  });

  describe('validateAndRepair', () => {
    it('should restore missing default components', () => {
      // Simulate corrupted state missing a default
      localStorage.setItem('quickSelectComponents', JSON.stringify({
        components: [
          { libraryId: 'wire-22awg-red', isDefault: true, order: 0 },
          { libraryId: 'resistor-220-5pct', isDefault: true, order: 1 },
        ]
      }));
      
      const newManager = new QuickSelectManager();
      const components = newManager.getComponents();
      
      expect(components.length).toBeGreaterThanOrEqual(5); // All defaults restored
    });

    it('should remove components with invalid library IDs', () => {
      localStorage.setItem('quickSelectComponents', JSON.stringify({
        components: [
          { libraryId: 'led-3mm-yellow', isDefault: true, order: 0 },
          { libraryId: 'invalid-component', isDefault: false, order: 1 },
          { libraryId: 'wire-22awg-red', isDefault: true, order: 2 },
        ]
      }));
      
      const newManager = new QuickSelectManager();
      const components = newManager.getComponents();
      
      expect(components.some(c => c.libraryId === 'invalid-component')).toBe(false);
    });

    it('should enforce max capacity constraint', () => {
      // Create state with too many components
      const tooManyComponents = Array.from({ length: 10 }, (_, i) => ({
        libraryId: i < 5 ? ['led-3mm-yellow', 'wire-22awg-red', 'resistor-220-5pct', 'switch-spst', 'power-5v'][i] : 'resistor-1k-5pct',
        isDefault: i < 5,
        order: i,
      }));
      
      localStorage.setItem('quickSelectComponents', JSON.stringify({
        components: tooManyComponents
      }));
      
      const newManager = new QuickSelectManager();
      const components = newManager.getComponents();
      
      expect(components.length).toBeLessThanOrEqual(8);
    });
  });
});
