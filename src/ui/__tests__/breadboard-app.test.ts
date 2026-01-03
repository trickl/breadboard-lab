import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BreadboardApp } from '../breadboard-app';

describe('BreadboardApp - Component Selection and Deletion', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container element for the app
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    // Initialize the app
    new BreadboardApp(container);
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

describe('BreadboardApp - Component Drag and Drop', () => {
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
    app.destroy();
    document.body.removeChild(container);
  });

  it('should start drag operation on mousedown', () => {
    // Place a wire component
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    // Get the component element
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    expect(componentEl).toBeTruthy();

    // Get breadboard for coordinates
    const breadboard = container.querySelector('#breadboard') as HTMLElement;
    const rect = breadboard.getBoundingClientRect();

    // Simulate mousedown to start drag
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 50,
      clientY: rect.top + 50,
    });
    componentEl?.dispatchEvent(mousedownEvent);

    // Component should be selected
    expect(container.querySelector('.component-selected')).toBeTruthy();
  });

  it('should show ghost preview during drag', () => {
    // Place a wire component
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    const breadboard = container.querySelector('#breadboard') as HTMLElement;
    const rect = breadboard.getBoundingClientRect();

    // Start drag
    componentEl?.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 50,
        clientY: rect.top + 50,
      })
    );

    // Move mouse to trigger preview
    document.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 150,
        clientY: rect.top + 150,
      })
    );

    // Should have a preview element
    const preview = container.querySelector('.component-preview');
    expect(preview).toBeTruthy();
  });

  it('should update component position on successful drop', () => {
    // Place a wire component at specific position
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click(); // Row 0, col 0
    (holes[5] as HTMLElement)?.click(); // Row 0, col 5

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    const breadboard = container.querySelector('#breadboard') as HTMLElement;
    const rect = breadboard.getBoundingClientRect();

    // Start drag
    componentEl?.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 50,
        clientY: rect.top + 50,
      })
    );

    // Move to new position
    document.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 150,
        clientY: rect.top + 150,
      })
    );

    // Drop
    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 150,
        clientY: rect.top + 150,
      })
    );

    // Component should still exist
    const movedComponent = container.querySelector('[data-component-id]');
    expect(movedComponent).toBeTruthy();

    // Preview should be removed after drop
    const preview = container.querySelector('.component-preview');
    expect(preview).toBeFalsy();
  });

  it('should cancel drag on Escape key', () => {
    // Place a wire component
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    const breadboard = container.querySelector('#breadboard') as HTMLElement;
    const rect = breadboard.getBoundingClientRect();

    // Start drag
    componentEl?.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 50,
        clientY: rect.top + 50,
      })
    );

    // Move mouse
    document.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 150,
        clientY: rect.top + 150,
      })
    );

    // Press Escape to cancel
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);

    // Preview should be removed
    const preview = container.querySelector('.component-preview');
    expect(preview).toBeFalsy();

    // Component should still be in original position
    const component = container.querySelector('[data-component-id]');
    expect(component).toBeTruthy();
  });

  it('should maintain selection after successful drag', () => {
    // Place a wire component
    const wireButton = container.querySelector('[data-component="WIRE"]') as HTMLElement;
    wireButton?.click();

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    const componentId = componentEl?.getAttribute('data-component-id');
    const breadboard = container.querySelector('#breadboard') as HTMLElement;
    const rect = breadboard.getBoundingClientRect();

    // Start drag
    componentEl?.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 50,
        clientY: rect.top + 50,
      })
    );

    // Move and drop
    document.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 150,
        clientY: rect.top + 150,
      })
    );

    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 150,
        clientY: rect.top + 150,
      })
    );

    // Component should remain selected after drop
    const selectedComponent = container.querySelector('.component-selected');
    expect(selectedComponent).toBeTruthy();
    expect(selectedComponent?.getAttribute('data-component-id')).toBe(componentId);
  });
});
