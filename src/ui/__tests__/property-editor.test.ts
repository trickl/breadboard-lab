import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BreadboardApp } from '../breadboard-app';

describe('BreadboardApp - Property Editor', () => {
  let container: HTMLElement;
  let app: BreadboardApp;

  beforeEach(() => {
    // Create a container element for the app
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    // Initialize the app
    app = new BreadboardApp(container);
  });

  afterEach(() => {
    // Clean up
    if (app) {
      app.destroy();
    }
    document.body.removeChild(container);
  });

  it('should not show property editor when no component is selected', () => {
    const propertyEditor = container.querySelector('.property-editor');
    expect(propertyEditor).toBeFalsy();
  });

  it('should show property editor when a resistor is selected', () => {
    // Place a resistor
    const resistorButton = container.querySelector('[data-component="RESISTOR"]') as HTMLElement;
    resistorButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[30] as HTMLElement)?.click();

    // Select the resistor
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Property editor should be visible
    const propertyEditor = container.querySelector('.property-editor');
    expect(propertyEditor).toBeTruthy();

    // Should have resistance input
    const resistanceInput = container.querySelector('#prop-resistance') as HTMLInputElement;
    expect(resistanceInput).toBeTruthy();
    expect(resistanceInput?.value).toBe('1000');
  });

  it('should show property editor when a power supply is selected', () => {
    // Place a power supply
    const powerButton = container.querySelector('[data-component="POWER_SUPPLY"]') as HTMLElement;
    powerButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();

    // Select the power supply
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Property editor should be visible
    const propertyEditor = container.querySelector('.property-editor');
    expect(propertyEditor).toBeTruthy();

    // Should have voltage input
    const voltageInput = container.querySelector('#prop-voltage') as HTMLInputElement;
    expect(voltageInput).toBeTruthy();
    expect(voltageInput?.value).toBe('5');
  });

  it('should show property editor when an LED is selected', () => {
    // Place an LED
    const ledButton = container.querySelector('[data-component="LED"]') as HTMLElement;
    ledButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();

    // Select the LED
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Property editor should be visible
    const propertyEditor = container.querySelector('.property-editor');
    expect(propertyEditor).toBeTruthy();

    // Should have forward voltage input
    const forwardVoltageInput = container.querySelector('#prop-forwardVoltage') as HTMLInputElement;
    expect(forwardVoltageInput).toBeTruthy();
    expect(forwardVoltageInput?.value).toBe('2');
  });

  it('should update resistor value when input changes', async () => {
    // Place a resistor
    const resistorButton = container.querySelector('[data-component="RESISTOR"]') as HTMLElement;
    resistorButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[30] as HTMLElement)?.click();

    // Select the resistor
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Change resistance value
    const resistanceInput = container.querySelector('#prop-resistance') as HTMLInputElement;
    resistanceInput.value = '10000';
    resistanceInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounce (300ms)
    await new Promise(resolve => setTimeout(resolve, 350));

    // Check that component list shows updated value
    const componentItem = container.querySelector('.component-item');
    expect(componentItem?.textContent).toContain('10kΩ');
  });

  it('should update power supply voltage when input changes', async () => {
    // Place a power supply
    const powerButton = container.querySelector('[data-component="POWER_SUPPLY"]') as HTMLElement;
    powerButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();

    // Select the power supply
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Change voltage value
    const voltageInput = container.querySelector('#prop-voltage') as HTMLInputElement;
    voltageInput.value = '12';
    voltageInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounce (300ms)
    await new Promise(resolve => setTimeout(resolve, 350));

    // Check that component list shows updated value
    const componentItem = container.querySelector('.component-item');
    expect(componentItem?.textContent).toContain('12V');
  });

  it('should update LED forward voltage when input changes', async () => {
    // Place an LED
    const ledButton = container.querySelector('[data-component="LED"]') as HTMLElement;
    ledButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();

    // Select the LED
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Change forward voltage value
    const forwardVoltageInput = container.querySelector('#prop-forwardVoltage') as HTMLInputElement;
    forwardVoltageInput.value = '3.0';
    forwardVoltageInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounce (300ms)
    await new Promise(resolve => setTimeout(resolve, 350));

    // Check that component list shows updated value
    const componentItem = container.querySelector('.component-item');
    expect(componentItem?.textContent).toContain('3V');
  });

  it('should apply preset values when preset button is clicked', async () => {
    // Place a resistor
    const resistorButton = container.querySelector('[data-component="RESISTOR"]') as HTMLElement;
    resistorButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[30] as HTMLElement)?.click();

    // Select the resistor
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Click 10kΩ preset button
    const presetButtons = container.querySelectorAll('.preset-button');
    const tenKOhmButton = Array.from(presetButtons).find(
      btn => (btn as HTMLElement).dataset.preset === '10000'
    ) as HTMLElement;
    tenKOhmButton?.click();

    // Wait for debounce (300ms)
    await new Promise(resolve => setTimeout(resolve, 350));

    // Check that value was updated
    const resistanceInput = container.querySelector('#prop-resistance') as HTMLInputElement;
    expect(resistanceInput?.value).toBe('10000');

    // Check that component list shows updated value
    const componentItem = container.querySelector('.component-item');
    expect(componentItem?.textContent).toContain('10kΩ');
  });

  it('should hide property editor when component is deselected', () => {
    // Place a resistor
    const resistorButton = container.querySelector('[data-component="RESISTOR"]') as HTMLElement;
    resistorButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[30] as HTMLElement)?.click();

    // Select the resistor
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Property editor should be visible
    expect(container.querySelector('.property-editor')).toBeTruthy();

    // Deselect by clicking breadboard
    const breadboard = container.querySelector('#breadboard') as HTMLElement;
    breadboard?.click();

    // Property editor should be hidden
    expect(container.querySelector('.property-editor')).toBeFalsy();
  });

  it('should not show property editor for wire components', () => {
    // Place a wire
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    // Select the wire
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Property editor should not be visible (wires have no editable properties)
    const propertyEditor = container.querySelector('.property-editor');
    expect(propertyEditor).toBeFalsy();
  });

  it('should not show property editor for ground components', () => {
    // Place a ground
    const groundButton = container.querySelector('[data-component="GROUND"]') as HTMLElement;
    groundButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();

    // Select the ground
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Property editor should not be visible (grounds have no editable properties)
    const propertyEditor = container.querySelector('.property-editor');
    expect(propertyEditor).toBeFalsy();
  });

  it('should show preset buttons for different component types', () => {
    // Test resistor presets
    const resistorButton = container.querySelector('[data-component="RESISTOR"]') as HTMLElement;
    resistorButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[30] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Should have 4 preset buttons for resistor
    let presetButtons = container.querySelectorAll('.preset-button');
    expect(presetButtons.length).toBe(4);

    // Delete component and test power supply presets
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));

    const powerButton = container.querySelector('[data-component="POWER_SUPPLY"]') as HTMLElement;
    powerButton?.click();

    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();

    const powerComponentEl = container.querySelector('[data-component-id]') as HTMLElement;
    powerComponentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Should have 4 preset buttons for power supply
    presetButtons = container.querySelectorAll('.preset-button');
    expect(presetButtons.length).toBe(4);
  });
});
