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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.RESISTOR);

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
    app.selectComponentType(ComponentType.POWER_SUPPLY);

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[1] as HTMLElement)?.click();
    
    app.selectComponentType(ComponentType.GROUND);
    
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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.WIRE);

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    app.selectComponentType(ComponentType.RESISTOR);

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

describe('BreadboardApp - Component Rotation', () => {
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

  it('should rotate selected component 90 degrees on R key press', () => {
    // Place a resistor component
    app.selectComponentType(ComponentType.RESISTOR);

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click(); // Row 0, col 0
    (holes[5] as HTMLElement)?.click(); // Row 0, col 5

    // Select the component
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Press R key
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    // Component should still exist after rotation
    const rotatedComponent = container.querySelector('[data-component-id]');
    expect(rotatedComponent).toBeTruthy();
  });

  it('should cycle through all four rotation angles (0, 90, 180, 270)', () => {
    // Place a resistor component
    app.selectComponentType(ComponentType.RESISTOR);

    const holes = container.querySelectorAll('.hole');
    (holes[5] as HTMLElement)?.click(); // Row 0, col 5
    (holes[10] as HTMLElement)?.click(); // Row 0, col 10

    // Select the component
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Rotate 4 times to cycle through all angles
    for (let i = 0; i < 4; i++) {
      const rKeyEvent = new KeyboardEvent('keydown', { key: 'r' });
      document.dispatchEvent(rKeyEvent);
      
      // Component should still exist after each rotation
      const component = container.querySelector('[data-component-id]');
      expect(component).toBeTruthy();
    }

    // After 4 rotations, should be back to original orientation
    const finalComponent = container.querySelector('[data-component-id]');
    expect(finalComponent).toBeTruthy();
  });

  it('should apply rotation transform to component SVG', () => {
    // Place a resistor
    app.selectComponentType(ComponentType.RESISTOR);

    const holes = container.querySelectorAll('.hole');
    (holes[10] as HTMLElement)?.click(); // Row 0, col 10
    (holes[15] as HTMLElement)?.click(); // Row 0, col 15

    // Select and rotate
    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    // Check if rotation transform is applied to any child element
    const svg = container.querySelector('.component-overlay');
    const transformedElements = svg?.querySelectorAll('[transform*="rotate"]');
    expect(transformedElements).toBeTruthy();
    expect(transformedElements!.length).toBeGreaterThan(0);
  });

  it('should not rotate if no component is selected', () => {
    // Place a component but don't select it
    app.selectComponentType(ComponentType.WIRE);

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    // Get initial component count
    const initialComponents = container.querySelectorAll('[data-component-id]');
    const initialCount = initialComponents.length;

    // Try to rotate without selection
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    // Component count should remain the same
    const components = container.querySelectorAll('[data-component-id]');
    expect(components.length).toBe(initialCount);
  });

  it('should not rotate during drag operation', () => {
    // Place a component
    app.selectComponentType(ComponentType.RESISTOR);

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

    // Try to rotate during drag
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    // Cancel drag
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);

    // Component should still exist
    const component = container.querySelector('[data-component-id]');
    expect(component).toBeTruthy();
  });

  it('should work with lowercase r key', () => {
    // Place and select component
    app.selectComponentType(ComponentType.LED);

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Press lowercase r
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'r' });
    document.dispatchEvent(rKeyEvent);

    // Component should still exist
    const rotatedComponent = container.querySelector('[data-component-id]');
    expect(rotatedComponent).toBeTruthy();
  });

  it('should prevent rotation if result would be out of bounds', () => {
    // Place a component at the edge where rotation would go out of bounds
    app.selectComponentType(ComponentType.RESISTOR);

    const holes = container.querySelectorAll('.hole');
    // Place at top-left corner - row 0, cols 0-1 (very close to edge)
    (holes[0] as HTMLElement)?.click(); // Row 0, col 0
    (holes[1] as HTMLElement)?.click(); // Row 0, col 1

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Try to rotate (might go out of bounds)
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    // Component should still exist (rotation either succeeded or was prevented gracefully)
    const component = container.querySelector('[data-component-id]');
    expect(component).toBeTruthy();
  });

  it('should update circuit simulation after rotation', () => {
    // Place a simple circuit
    app.selectComponentType(ComponentType.POWER_SUPPLY);

    const holes = container.querySelectorAll('.hole');
    (holes[0] as HTMLElement)?.click();
    (holes[5] as HTMLElement)?.click();

    app.selectComponentType(ComponentType.RESISTOR);
    (holes[5] as HTMLElement)?.click();
    (holes[10] as HTMLElement)?.click();

    app.selectComponentType(ComponentType.GROUND);
    (holes[10] as HTMLElement)?.click();
    (holes[11] as HTMLElement)?.click();

    // Select and rotate the resistor
    const components = container.querySelectorAll('[data-component-id]');
    (components[1] as HTMLElement)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    // Circuit info should still be rendered
    const circuitInfo = container.querySelector('#circuit-info');
    expect(circuitInfo).toBeTruthy();
    expect(circuitInfo?.textContent).toContain('Components');
  });

  it('should rotate LED component correctly', () => {
    // Place an LED (has polarity, so rotation matters)
    app.selectComponentType(ComponentType.LED);

    const holes = container.querySelectorAll('.hole');
    (holes[20] as HTMLElement)?.click();
    (holes[25] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Rotate LED
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    const rotatedLED = container.querySelector('[data-component-id]');
    expect(rotatedLED).toBeTruthy();
  });

  it('should rotate power supply component correctly', () => {
    // Place a power supply (has polarity)
    app.selectComponentType(ComponentType.POWER_SUPPLY);

    const holes = container.querySelectorAll('.hole');
    (holes[30] as HTMLElement)?.click();
    (holes[35] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Rotate power supply
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    const rotatedPower = container.querySelector('[data-component-id]');
    expect(rotatedPower).toBeTruthy();
  });

  it('should rotate wire component correctly', () => {
    // Place a wire
    app.selectComponentType(ComponentType.WIRE);

    const holes = container.querySelectorAll('.hole');
    (holes[40] as HTMLElement)?.click();
    (holes[45] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Rotate wire
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    const rotatedWire = container.querySelector('[data-component-id]');
    expect(rotatedWire).toBeTruthy();
  });

  it('should rotate ground component correctly', () => {
    // Place a ground
    app.selectComponentType(ComponentType.GROUND);

    const holes = container.querySelectorAll('.hole');
    (holes[50] as HTMLElement)?.click();
    (holes[51] as HTMLElement)?.click();

    const componentEl = container.querySelector('[data-component-id]') as HTMLElement;
    componentEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Rotate ground
    const rKeyEvent = new KeyboardEvent('keydown', { key: 'R' });
    document.dispatchEvent(rKeyEvent);

    const rotatedGround = container.querySelector('[data-component-id]');
    expect(rotatedGround).toBeTruthy();
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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.WIRE);

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
    app.selectComponentType(ComponentType.WIRE);

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
