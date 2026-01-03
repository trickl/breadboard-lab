import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRenderer } from '../component-renderer';
import { ComponentType } from '@/core/types';
import type { Wire, Resistor, LED, PowerSupply, Ground } from '@/core/types';

describe('ComponentRenderer', () => {
  let renderer: ComponentRenderer;

  beforeEach(() => {
    renderer = new ComponentRenderer();
  });

  describe('renderComponents', () => {
    it('should create an SVG element', () => {
      const components: Wire[] = [];
      const svg = renderer.renderComponents(components);
      
      expect(svg.tagName).toBe('svg');
      expect(svg.classList.contains('component-overlay')).toBe(true);
    });

    it('should render a wire component', () => {
      const wire: Wire = {
        id: 'wire-1',
        type: ComponentType.WIRE,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        resistance: 0.01,
        rotation: 0,
      };

      const svg = renderer.renderComponents([wire]);
      const wireGroup = svg.querySelector('.component-wire');
      
      expect(wireGroup).not.toBeNull();
      expect(wireGroup?.getAttribute('data-component-id')).toBe('wire-1');
    });

    it('should render a resistor component', () => {
      const resistor: Resistor = {
        id: 'resistor-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 2 },
          { row: 10, col: 2 },
        ],
        resistance: 1000,
        rotation: 0,
      };

      const svg = renderer.renderComponents([resistor]);
      const resistorGroup = svg.querySelector('.component-resistor');
      
      expect(resistorGroup).not.toBeNull();
      expect(resistorGroup?.getAttribute('data-component-id')).toBe('resistor-1');
      
      // Check for color bands instead of text label
      // 1kΩ 5% should have 4 bands: brown-black-red-gold
      const bands = resistorGroup?.querySelectorAll('rect[fill]');
      // Should have body rect + 4 color band rects = 5 rects total
      expect(bands?.length).toBeGreaterThanOrEqual(5);
    });

    it('should render an LED component', () => {
      const led: LED = {
        id: 'led-1',
        type: ComponentType.LED,
        positions: [
          { row: 15, col: 2 },
          { row: 18, col: 2 },
        ],
        forwardVoltage: 2.0,
        maxCurrent: 0.02,
        rotation: 0,
      };

      const svg = renderer.renderComponents([led]);
      const ledGroup = svg.querySelector('.component-led');
      
      expect(ledGroup).not.toBeNull();
      expect(ledGroup?.getAttribute('data-component-id')).toBe('led-1');
      
      // Check for LED circle
      const circle = ledGroup?.querySelector('circle');
      expect(circle).not.toBeNull();
    });

    it('should render a power supply component', () => {
      const powerSupply: PowerSupply = {
        id: 'power-1',
        type: ComponentType.POWER_SUPPLY,
        positions: [
          { row: 10, col: 2 },
          { row: 10, col: 7 },
        ],
        voltage: 5.0,
        rotation: 0,
      };

      const svg = renderer.renderComponents([powerSupply]);
      const powerGroup = svg.querySelector('.component-power_supply');
      
      expect(powerGroup).not.toBeNull();
      expect(powerGroup?.getAttribute('data-component-id')).toBe('power-1');
      
      // Check for voltage label
      const texts = powerGroup?.querySelectorAll('text');
      const voltageLabel = Array.from(texts || []).find(t => t.textContent === '5V');
      expect(voltageLabel).not.toBeNull();
    });

    it('should render a ground component', () => {
      const ground: Ground = {
        id: 'ground-1',
        type: ComponentType.GROUND,
        positions: [
          { row: 20, col: 7 },
          { row: 20, col: 8 },
        ],
        rotation: 0,
      };

      const svg = renderer.renderComponents([ground]);
      const groundGroup = svg.querySelector('.component-ground');
      
      expect(groundGroup).not.toBeNull();
      expect(groundGroup?.getAttribute('data-component-id')).toBe('ground-1');
    });

    it('should render multiple components', () => {
      const wire: Wire = {
        id: 'wire-1',
        type: ComponentType.WIRE,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        resistance: 0.01,
        rotation: 0,
      };

      const resistor: Resistor = {
        id: 'resistor-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 2 },
          { row: 10, col: 2 },
        ],
        resistance: 1000,
        rotation: 0,
      };

      const svg = renderer.renderComponents([wire, resistor]);
      
      expect(svg.querySelector('.component-wire')).not.toBeNull();
      expect(svg.querySelector('.component-resistor')).not.toBeNull();
    });

    it('should render wires before other components', () => {
      const resistor: Resistor = {
        id: 'resistor-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 2 },
          { row: 10, col: 2 },
        ],
        resistance: 1000,
        rotation: 0,
      };

      const wire: Wire = {
        id: 'wire-1',
        type: ComponentType.WIRE,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        resistance: 0.01,
        rotation: 0,
      };

      // Add resistor first, then wire
      const svg = renderer.renderComponents([resistor, wire]);
      const children = Array.from(svg.children);
      
      // Wire should be rendered first (index 0)
      expect(children[0].classList.contains('component-wire')).toBe(true);
      // Resistor should be rendered after (index 1)
      expect(children[1].classList.contains('component-resistor')).toBe(true);
    });
  });

  describe('wire color cycling', () => {
    it('should reset wire colors on each render', () => {
      const wire1: Wire = {
        id: 'wire-1',
        type: ComponentType.WIRE,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        resistance: 0.01,
        rotation: 0,
      };

      const wire2: Wire = {
        id: 'wire-2',
        type: ComponentType.WIRE,
        positions: [
          { row: 5, col: 0 },
          { row: 5, col: 5 },
        ],
        resistance: 0.01,
        rotation: 0,
      };

      // First render
      const svg1 = renderer.renderComponents([wire1, wire2]);
      const firstWireColor1 = svg1.querySelector('.component-wire path')?.getAttribute('stroke');
      
      // Second render (should reset colors)
      const svg2 = renderer.renderComponents([wire1, wire2]);
      const firstWireColor2 = svg2.querySelector('.component-wire path')?.getAttribute('stroke');
      
      // Colors should be the same because we reset on each render
      expect(firstWireColor1).toBe(firstWireColor2);
    });
  });
});
