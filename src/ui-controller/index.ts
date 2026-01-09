import type { AppState } from './types';

export function createInitialState(): AppState {
  return {
    breadboard: {
      components: [],
      selectedComponentId: null,
      selectedPinIndex: null,
    },
    placement: {
      selectedComponentType: null,
      selectedLibraryId: null,
      placementStart: null,
    },
    floatingComponent: {
      component: null,
      dragState: null,
    },
    connections: {
      selectedConnectionId: null,
      rerouteDragState: null,
    },
    componentDrag: {
      dragState: null,
      pinDragState: null,
    },
    simulation: {
      cachedCircuit: null,
      cachedSimulation: null,
    },
    ui: {
      xrayModeEnabled: false,
      breadboardOrientation: 0,
      currentTheme: 'dark',
      currentView: 'breadboard',
    },
    circuit: {
      metadata: null,
      hasUnsavedChanges: false,
    },
    counters: {
      componentIdCounter: 0,
    },
  };
}

export * from './types';
export * from './breadboard-controller';
export * from './simulation-runner';
export * from './selectors';
