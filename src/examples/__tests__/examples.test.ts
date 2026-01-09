import { describe, it, expect } from 'vitest';
import { getDefaultExample, getExampleById } from '../index';

describe('Example Circuits - Default Circuit', () => {
  it('getDefaultExample returns a valid circuit object', () => {
    const defaultCircuit = getDefaultExample();

    expect(defaultCircuit).toBeDefined();
    expect(defaultCircuit.id).toBe('edu8-blink');
    expect(defaultCircuit.name).toBeDefined();
    expect(defaultCircuit.description).toBeDefined();
    expect(defaultCircuit.json).toBeDefined();
  });

  it('default circuit has expected structure', () => {
    const defaultCircuit = getDefaultExample();
    const circuitData = JSON.parse(defaultCircuit.json);

    expect(circuitData).toBeDefined();
    expect(circuitData.components).toBeInstanceOf(Array);
    expect(circuitData.components.length).toBeGreaterThan(0);
    expect(circuitData.metadata).toBeDefined();
  });

  it('default circuit is edu8-blink with microprocessor', () => {
    const defaultCircuit = getDefaultExample();
    const circuitData = JSON.parse(defaultCircuit.json);

    const hasMicroprocessor = circuitData.components.some((c: any) => c.type === 'MICROPROCESSOR');
    expect(hasMicroprocessor).toBe(true);
  });

  it('default circuit includes essential components', () => {
    const defaultCircuit = getDefaultExample();
    const circuitData = JSON.parse(defaultCircuit.json);

    const componentTypes = circuitData.components.map((c: any) => c.type);

    // Essential components for EDU-8 Blink circuit
    expect(componentTypes).toContain('MICROPROCESSOR');
    expect(componentTypes).toContain('LED');
    expect(componentTypes).toContain('RESISTOR');
    expect(componentTypes).toContain('POWER_SUPPLY');
    expect(componentTypes).toContain('GROUND');
  });

  it('default circuit is categorized as microprocessor', () => {
    const defaultCircuit = getDefaultExample();
    expect(defaultCircuit.category).toBe('microprocessor');
  });

  it('default circuit has learning objectives', () => {
    const defaultCircuit = getDefaultExample();
    expect(defaultCircuit.learningObjectives).toBeInstanceOf(Array);
    expect(defaultCircuit.learningObjectives.length).toBeGreaterThan(0);
  });

  it('throws error if default circuit is missing', () => {
    // This test ensures the default circuit exists in EXAMPLE_CIRCUITS
    expect(() => getDefaultExample()).not.toThrow();
  });

  it('default circuit matches edu8-blink from getExampleById', () => {
    const defaultCircuit = getDefaultExample();
    const edu8Circuit = getExampleById('edu8-blink');

    expect(edu8Circuit).toBeDefined();
    expect(defaultCircuit.id).toBe(edu8Circuit!.id);
    expect(defaultCircuit.json).toBe(edu8Circuit!.json);
  });
});
