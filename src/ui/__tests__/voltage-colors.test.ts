import { describe, it, expect } from 'vitest';
import { voltageToColor, voltageToClass } from '../voltage-colors';

describe('voltageToColor', () => {
  it('should map 0V to dark blue', () => {
    const color = voltageToColor(0);
    expect(color.rgb).toBe('rgb(0, 0, 139)');
    expect(color.description).toContain('0.00V');
  });

  it('should map 1.25V to cyan', () => {
    const color = voltageToColor(1.25);
    expect(color.rgb).toBe('rgb(0, 255, 255)');
    expect(color.description).toContain('1.25V');
  });

  it('should map 2.5V to yellow', () => {
    const color = voltageToColor(2.5);
    expect(color.rgb).toBe('rgb(255, 255, 0)');
    expect(color.description).toContain('2.50V');
  });

  it('should map 3.75V to orange', () => {
    const color = voltageToColor(3.75);
    expect(color.rgb).toBe('rgb(255, 165, 0)');
    expect(color.description).toContain('3.75V');
  });

  it('should map 5V to red', () => {
    const color = voltageToColor(5);
    expect(color.rgb).toBe('rgb(255, 0, 0)');
    expect(color.description).toContain('5.00V');
  });

  it('should interpolate between color stops', () => {
    const color = voltageToColor(0.625); // Halfway between 0V and 1.25V
    // Should be halfway between dark blue (0, 0, 139) and cyan (0, 255, 255)
    // r component should be 0, g around 128, b around 197
    expect(color.rgb).toMatch(/rgb\(0, 12[78], 197\)/);
  });

  it('should clamp negative voltages to 0V', () => {
    const color = voltageToColor(-1);
    expect(color.rgb).toBe('rgb(0, 0, 139)');
  });

  it('should clamp voltages above 5V', () => {
    const color = voltageToColor(10);
    expect(color.rgb).toBe('rgb(255, 0, 0)');
  });
});

describe('voltageToClass', () => {
  it('should map 0V to voltage-0', () => {
    expect(voltageToClass(0)).toBe('voltage-0');
  });

  it('should map 1.0V to voltage-1', () => {
    expect(voltageToClass(1.0)).toBe('voltage-1');
  });

  it('should map 2.5V to voltage-3', () => {
    expect(voltageToClass(2.5)).toBe('voltage-3');
  });

  it('should map 5.0V to voltage-5', () => {
    expect(voltageToClass(5.0)).toBe('voltage-5');
  });

  it('should handle edge cases', () => {
    expect(voltageToClass(-1)).toBe('voltage-0');
    expect(voltageToClass(10)).toBe('voltage-5');
  });
});
