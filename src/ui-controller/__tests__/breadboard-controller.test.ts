import { describe, it, expect } from 'vitest';
import { BreadboardController } from '../breadboard-controller';
import { createInitialState } from '../index';
import type { AppState } from '../types';
import { ComponentType } from '@/core/types';
import type { Resistor } from '@/core/types';

describe('BreadboardController', () => {
  function createTestState(): AppState {
    return createInitialState();
  }

  describe('initialization', () => {
    it('should initialize with provided state', () => {
      const initialState = createTestState();
      const controller = new BreadboardController(initialState);
      expect(controller.getState()).toEqual(initialState);
    });

    it('should create state with empty components array', () => {
      const controller = new BreadboardController(createTestState());
      const state = controller.getState();
      expect(state.breadboard.components).toEqual([]);
    });

    it('should initialize with no selected component', () => {
      const controller = new BreadboardController(createTestState());
      const state = controller.getState();
      expect(state.breadboard.selectedComponentId).toBeNull();
    });
  });

  describe('COMPONENT_ADDED action', () => {
    it('should add component when COMPONENT_ADDED action is dispatched', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });

      const state = controller.getState();
      expect(state.breadboard.components).toHaveLength(1);
      expect(state.breadboard.components[0]).toEqual(component);
    });

    it('should mark circuit as changed when component is added', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });

      const state = controller.getState();
      expect(state.circuit.hasUnsavedChanges).toBe(true);
    });
  });

  describe('COMPONENT_MOVED action', () => {
    it('should move component to new positions', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });

      const newPositions = [
        { row: 1, col: 1 },
        { row: 1, col: 6 },
      ];
      controller.dispatch({
        type: 'COMPONENT_MOVED',
        componentId: 'comp-1',
        positions: newPositions,
      });

      const state = controller.getState();
      expect(state.breadboard.components[0].positions).toEqual(newPositions);
    });
  });

  describe('COMPONENT_ROTATED action', () => {
    it('should rotate component', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });

      const newPositions = [
        { row: 0, col: 0 },
        { row: 5, col: 0 },
      ];
      controller.dispatch({
        type: 'COMPONENT_ROTATED',
        componentId: 'comp-1',
        rotation: 90,
        positions: newPositions,
      });

      const state = controller.getState();
      expect(state.breadboard.components[0].rotation).toBe(90);
      expect(state.breadboard.components[0].positions).toEqual(newPositions);
    });
  });

  describe('COMPONENT_DELETED action', () => {
    it('should delete component', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });
      controller.dispatch({ type: 'COMPONENT_DELETED', componentId: 'comp-1' });

      const state = controller.getState();
      expect(state.breadboard.components).toHaveLength(0);
    });

    it('should deselect deleted component', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });
      controller.dispatch({ type: 'COMPONENT_SELECTED', componentId: 'comp-1' });
      controller.dispatch({ type: 'COMPONENT_DELETED', componentId: 'comp-1' });

      const state = controller.getState();
      expect(state.breadboard.selectedComponentId).toBeNull();
    });
  });

  describe('COMPONENT_SELECTED action', () => {
    it('should select component', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });
      controller.dispatch({ type: 'COMPONENT_SELECTED', componentId: 'comp-1' });

      const state = controller.getState();
      expect(state.breadboard.selectedComponentId).toBe('comp-1');
    });

    it('should deselect connection when selecting component', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({ type: 'CONNECTION_SELECTED', connectionId: 'conn-1' });
      controller.dispatch({ type: 'COMPONENT_SELECTED', componentId: 'comp-1' });

      const state = controller.getState();
      expect(state.connections.selectedConnectionId).toBeNull();
    });
  });

  describe('XRAY_MODE_TOGGLED action', () => {
    it('should toggle xray mode on', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({ type: 'XRAY_MODE_TOGGLED' });

      const state = controller.getState();
      expect(state.ui.xrayModeEnabled).toBe(true);
    });

    it('should toggle xray mode off', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({ type: 'XRAY_MODE_TOGGLED' });
      controller.dispatch({ type: 'XRAY_MODE_TOGGLED' });

      const state = controller.getState();
      expect(state.ui.xrayModeEnabled).toBe(false);
    });
  });

  describe('BREADBOARD_ROTATED action', () => {
    it('should rotate breadboard through all orientations', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({ type: 'BREADBOARD_ROTATED' });
      expect(controller.getState().ui.breadboardOrientation).toBe(90);

      controller.dispatch({ type: 'BREADBOARD_ROTATED' });
      expect(controller.getState().ui.breadboardOrientation).toBe(180);

      controller.dispatch({ type: 'BREADBOARD_ROTATED' });
      expect(controller.getState().ui.breadboardOrientation).toBe(270);

      controller.dispatch({ type: 'BREADBOARD_ROTATED' });
      expect(controller.getState().ui.breadboardOrientation).toBe(0);
    });
  });

  describe('THEME_TOGGLED action', () => {
    it('should toggle theme from dark to light', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({ type: 'THEME_TOGGLED' });

      const state = controller.getState();
      expect(state.ui.currentTheme).toBe('light');
    });

    it('should toggle theme from light to dark', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({ type: 'THEME_TOGGLED' });
      controller.dispatch({ type: 'THEME_TOGGLED' });

      const state = controller.getState();
      expect(state.ui.currentTheme).toBe('dark');
    });
  });

  describe('CIRCUIT_CLEARED action', () => {
    it('should clear all components', () => {
      const controller = new BreadboardController(createTestState());

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });
      controller.dispatch({ type: 'CIRCUIT_CLEARED' });

      const state = controller.getState();
      expect(state.breadboard.components).toHaveLength(0);
      expect(state.circuit.hasUnsavedChanges).toBe(false);
    });
  });

  describe('state immutability', () => {
    it('should not mutate original state', () => {
      const controller = new BreadboardController(createTestState());
      const originalState = controller.getState();

      const component: Resistor = {
        id: 'comp-1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 5 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      controller.dispatch({ type: 'COMPONENT_ADDED', component });

      expect(originalState.breadboard.components).toHaveLength(0);
    });
  });

  describe('listeners', () => {
    it('should notify listeners when state changes', () => {
      const controller = new BreadboardController(createTestState());
      let notificationCount = 0;
      let receivedState: AppState | null = null;

      controller.subscribe((state) => {
        notificationCount++;
        receivedState = state;
      });

      controller.dispatch({ type: 'XRAY_MODE_TOGGLED' });

      expect(notificationCount).toBe(1);
      expect(receivedState?.ui.xrayModeEnabled).toBe(true);
    });

    it('should not notify listeners when state does not change', () => {
      const controller = new BreadboardController(createTestState());
      let notificationCount = 0;
      let lastState = controller.getState();

      controller.subscribe((state) => {
        notificationCount++;
        lastState = state;
      });

      controller.dispatch({ type: 'COMPONENT_DELETED', componentId: 'non-existent' });

      expect(notificationCount).toBe(0);
      expect(lastState).toBe(controller.getState());
    });

    it('should allow unsubscribing', () => {
      const controller = new BreadboardController(createTestState());
      let notificationCount = 0;

      const unsubscribe = controller.subscribe(() => {
        notificationCount++;
      });

      controller.dispatch({ type: 'XRAY_MODE_TOGGLED' });
      expect(notificationCount).toBe(1);

      unsubscribe();

      controller.dispatch({ type: 'XRAY_MODE_TOGGLED' });
      expect(notificationCount).toBe(1);
    });
  });

  describe('DRAG actions', () => {
    it('should start drag', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({
        type: 'DRAG_STARTED',
        componentId: 'comp-1',
        mousePos: { x: 100, y: 100 },
        originalPositions: [{ row: 0, col: 0 }],
        offsetFromFirstPin: { x: 5, y: 5 },
      });

      const state = controller.getState();
      expect(state.componentDrag.dragState).not.toBeNull();
      expect(state.componentDrag.dragState?.componentId).toBe('comp-1');
    });

    it('should cancel drag', () => {
      const controller = new BreadboardController(createTestState());

      controller.dispatch({
        type: 'DRAG_STARTED',
        componentId: 'comp-1',
        mousePos: { x: 100, y: 100 },
        originalPositions: [{ row: 0, col: 0 }],
        offsetFromFirstPin: { x: 5, y: 5 },
      });

      controller.dispatch({ type: 'DRAG_CANCELLED' });

      const state = controller.getState();
      expect(state.componentDrag.dragState).toBeNull();
    });
  });

  describe('SIMULATION actions', () => {
    it('should store simulation results', () => {
      const controller = new BreadboardController(createTestState());

      const circuit = {
        nodes: new Map(),
        edges: [],
      };

      const result = {
        success: true,
        nodeVoltages: new Map(),
        edgeCurrents: new Map(),
        errors: [],
      };

      controller.dispatch({
        type: 'SIMULATION_COMPLETED',
        circuit,
        result,
      });

      const state = controller.getState();
      expect(state.simulation.cachedCircuit).toBe(circuit);
      expect(state.simulation.cachedSimulation).toBe(result);
    });

    it('should clear simulation results', () => {
      const controller = new BreadboardController(createTestState());

      const circuit = {
        nodes: new Map(),
        edges: [],
      };

      const result = {
        success: true,
        nodeVoltages: new Map(),
        edgeCurrents: new Map(),
        errors: [],
      };

      controller.dispatch({
        type: 'SIMULATION_COMPLETED',
        circuit,
        result,
      });

      controller.dispatch({ type: 'SIMULATION_CLEARED' });

      const state = controller.getState();
      expect(state.simulation.cachedCircuit).toBeNull();
      expect(state.simulation.cachedSimulation).toBeNull();
    });
  });
});
