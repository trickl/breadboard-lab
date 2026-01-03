import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BreadboardApp } from '../breadboard-app';
import { ComponentType } from '@/core/types';

describe('BreadboardApp - Component Selection and Deletion', () => {
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
    document.body.removeChild(container);
  });

  it('should initialize with no selected component', () => {
    // Access the state through the rendered component overlay
    const svg = container.querySelector('.component-overlay');
    const selectedComponents = svg?.querySelectorAll('.component-selected');
    
    expect(selectedComponents?.length).toBe(0);
  });

  it('should select a component when clicked', () => {
    // Manually add a component to the state by simulating placement
    // First, select a component type
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    // Place a wire by clicking two holes
    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click(); // First click
    (holes[5] as HTMLElement)?.click(); // Second click

    // Now find the rendered component and click it
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    expect(componentEl).toBeTruthy();

    // Simulate clicking the component (dispatch event for SVG element)
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Check if component is now selected
    const selectedComponent = container.querySelector('.component-selected');
    expect(selectedComponent).toBeTruthy();
    expect(selectedComponent?.getAttribute('data-component-id')).toBe(componentEl?.getAttribute('data-component-id'));
  });

  it('should deselect component when clicking breadboard background', () => {
    // Place and select a component
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Verify it's selected
    expect(container.querySelector('.component-selected')).toBeTruthy();

    // Click breadboard background
    const breadboard = container.querySelector('#breadboard') as HTMLElement;
    breadboard?.click();

    // Should be deselected
    expect(container.querySelector('.component-selected')).toBeFalsy();
  });

  it('should delete selected component on Delete key press', () => {
    // Place a component
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    // Select the component
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    const componentId = componentEl?.getAttribute('data-component-id');
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Verify component exists
    expect(container.querySelector(`[data-component-id="${componentId}"]`)).toBeTruthy();

    // Press Delete key
    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
    document.dispatchEvent(deleteEvent);

    // Component should be deleted
    expect(container.querySelector(`[data-component-id="${componentId}"]`)).toBeFalsy();
  });

  it('should delete selected component on Backspace key press', () => {
    // Place a component
    const resistorButton = container.querySelector('[data-component="RESISTOR"]') as HTMLElement;
    resistorButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[30] as HTMLElement)?.click();

    // Select the component
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    const componentId = componentEl?.getAttribute('data-component-id');
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Verify component exists
    expect(container.querySelector(`[data-component-id="${componentId}"]`)).toBeTruthy();

    // Press Backspace key
    const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
    document.dispatchEvent(backspaceEvent);

    // Component should be deleted
    expect(container.querySelector(`[data-component-id="${componentId}"]`)).toBeFalsy();
  });

  it('should update circuit simulation after component deletion', () => {
    // Place multiple components to create a circuit with voltage overlays
    const powerButton = container.querySelector('[data-component="POWER_SUPPLY"]') as HTMLElement;
    powerButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();
    
    const groundButton = container.querySelector('[data-component="GROUND"]') as HTMLElement;
    groundButton?.click();
    
    (holes[30] as HTMLElement)?.click();
    (holes[31] as HTMLElement)?.click();

    // Verify we have components
    const initialComponents = container.querySelectorAll('[data-component-id]');
    expect(initialComponents.length).toBe(2);

    // Select and delete the power supply
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    
    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
    document.dispatchEvent(deleteEvent);

    // Should have one less component
    const updatedComponents = container.querySelectorAll('[data-component-id]');
    expect(updatedComponents.length).toBe(1);
  });

  it('should not delete anything if no component is selected', () => {
    // Place a component
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    // Get component count
    const initialComponents = container.querySelectorAll('[data-component-id]');
    const initialCount = initialComponents.length;

    // Press Delete without selecting anything
    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
    document.dispatchEvent(deleteEvent);

    // Component count should remain the same
    const updatedComponents = container.querySelectorAll('[data-component-id]');
    expect(updatedComponents.length).toBe(initialCount);
  });

  it('should handle multiple component selection correctly', () => {
    // Place two components
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    const resistorButton = container.querySelector('[data-component="RESISTOR"]') as HTMLElement;
    resistorButton?.click();

    (holes[10] as HTMLElement)?.click();
    (holes[40] as HTMLElement)?.click();

    // Get both components
    let components = container.querySelectorAll('[data-component-id]');
    expect(components.length).toBe(2);

    // Select first component
    (components[0] as HTMLElement)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    
    // Re-query after selection to get updated DOM
    components = container.querySelectorAll('[data-component-id]');
    expect(container.querySelectorAll('.component-selected').length).toBe(1);
    
    const firstId = (components[0] as HTMLElement).getAttribute('data-component-id');
    const selectedEl = container.querySelector('.component-selected');
    expect(selectedEl?.getAttribute('data-component-id')).toBe(firstId);

    // Select second component (should deselect first)
    (components[1] as HTMLElement)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    
    // Re-query after second selection
    components = container.querySelectorAll('[data-component-id]');
    expect(container.querySelectorAll('.component-selected').length).toBe(1);
    
    const secondId = (components[1] as HTMLElement).getAttribute('data-component-id');
    const newSelectedEl = container.querySelector('.component-selected');
    expect(newSelectedEl?.getAttribute('data-component-id')).toBe(secondId);
    expect(newSelectedEl?.getAttribute('data-component-id')).not.toBe(firstId);
  });
});
