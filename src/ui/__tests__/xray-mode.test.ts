import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BreadboardApp } from '../breadboard-app';
import { ComponentType } from '@/core/types';

describe('BreadboardApp - X-Ray Mode', () => {
  let container: HTMLElement;
  let app: BreadboardApp;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    app = new BreadboardApp(container);
  });

  afterEach(() => {
    if (app) {
      app.destroy();
    }
    document.body.removeChild(container);
  });

  it('should initialize with X-Ray Mode disabled', () => {
    expect(app.getXrayModeEnabled()).toBe(false);
  });

  it('should toggle X-Ray Mode on button click', () => {
    const toggleBtn = document.getElementById('toggle-xray-btn');
    expect(toggleBtn).toBeTruthy();
    
    // Initial state: off
    expect(app.getXrayModeEnabled()).toBe(false);
    expect(toggleBtn?.textContent?.trim()).toBe('🔬 X-Ray Mode');
    
    // Click to enable
    toggleBtn?.click();
    expect(app.getXrayModeEnabled()).toBe(true);
    expect(toggleBtn?.textContent?.trim()).toBe('🔬 X-Ray: ON');
    expect(toggleBtn?.classList.contains('active')).toBe(true);
    
    // Click to disable
    toggleBtn?.click();
    expect(app.getXrayModeEnabled()).toBe(false);
    expect(toggleBtn?.textContent?.trim()).toBe('🔬 X-Ray Mode');
    expect(toggleBtn?.classList.contains('active')).toBe(false);
  });

  it('should toggle X-Ray Mode on X key press', () => {
    // Initial state: off
    expect(app.getXrayModeEnabled()).toBe(false);
    
    // Press X key to enable
    const xKeyEvent = new KeyboardEvent('keydown', { key: 'x' });
    document.dispatchEvent(xKeyEvent);
    expect(app.getXrayModeEnabled()).toBe(true);
    
    // Press X key again to disable
    const xKeyEvent2 = new KeyboardEvent('keydown', { key: 'x' });
    document.dispatchEvent(xKeyEvent2);
    expect(app.getXrayModeEnabled()).toBe(false);
  });

  it('should toggle X-Ray Mode on uppercase X key press', () => {
    // Initial state: off
    expect(app.getXrayModeEnabled()).toBe(false);
    
    // Press Shift+X to enable
    const XKeyEvent = new KeyboardEvent('keydown', { key: 'X' });
    document.dispatchEvent(XKeyEvent);
    expect(app.getXrayModeEnabled()).toBe(true);
  });

  it('should maintain X-Ray Mode state when placing components', async () => {
    // Enable X-Ray Mode
    const toggleBtn = document.getElementById('toggle-xray-btn');
    toggleBtn?.click();
    expect(app.getXrayModeEnabled()).toBe(true);
    
    // Place a component
    await app.placeComponentInteractive(ComponentType.RESISTOR, [
      { row: 5, col: 4 },
      { row: 5, col: 8 }
    ]);
    
    // X-Ray Mode should still be enabled
    expect(app.getXrayModeEnabled()).toBe(true);
    expect(app.getComponents().length).toBe(1);
  });

  it('should maintain X-Ray Mode state when deleting components', async () => {
    // Place a component
    await app.placeComponentInteractive(ComponentType.RESISTOR, [
      { row: 5, col: 4 },
      { row: 5, col: 8 }
    ]);
    
    // Enable X-Ray Mode
    const toggleBtn = document.getElementById('toggle-xray-btn');
    toggleBtn?.click();
    expect(app.getXrayModeEnabled()).toBe(true);
    
    // Select and delete the component
    const components = app.getComponents();
    const componentId = components[0].id;
    app.clickComponent(componentId);
    
    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
    document.dispatchEvent(deleteEvent);
    
    // X-Ray Mode should still be enabled after deletion
    expect(app.getXrayModeEnabled()).toBe(true);
    expect(app.getComponents().length).toBe(0);
  });

  it('should work independently of component selection', async () => {
    // Place a component
    await app.placeComponentInteractive(ComponentType.WIRE, [
      { row: 0, col: 2 },
      { row: 0, col: 6 }
    ]);
    
    const components = app.getComponents();
    const componentId = components[0].id;
    
    // Select component
    app.clickComponent(componentId);
    expect(app.getSelectedComponentId()).toBe(componentId);
    
    // Enable X-Ray Mode
    const toggleBtn = document.getElementById('toggle-xray-btn');
    toggleBtn?.click();
    expect(app.getXrayModeEnabled()).toBe(true);
    
    // Component should still be selected
    expect(app.getSelectedComponentId()).toBe(componentId);
    
    // Disable X-Ray Mode
    toggleBtn?.click();
    expect(app.getXrayModeEnabled()).toBe(false);
    
    // Component should still be selected
    expect(app.getSelectedComponentId()).toBe(componentId);
  });
});
